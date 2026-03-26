/**
 * useMediaPicker Hook
 * Provides a unified interface for picking, compressing, and uploading media
 * with progress tracking via the media upload store.
 */

import { useCallback, useState } from 'react';
import mediaService, { type MediaAsset, type CompressionOptions } from '@/lib/services/media';
import { useMediaUploadStore, type UploadItem } from '@/lib/stores/mediaUpload';
import type { Attachment } from '@/components/chat/AttachmentPicker';

interface UseMediaPickerOptions {
  channelId?: string;
  autoUpload?: boolean;
  compressionOptions?: CompressionOptions;
  maxFiles?: number;
  onUploadComplete?: (attachment: Attachment, uploadId: string) => void;
  onUploadError?: (error: string, uploadId: string) => void;
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function useMediaPicker(options: UseMediaPickerOptions = {}) {
  const {
    channelId,
    autoUpload = false,
    compressionOptions = { quality: 0.8, maxWidth: 1920, maxHeight: 1920 },
    maxFiles = 10,
    onUploadComplete,
    onUploadError,
  } = options;

  const [isProcessing, setIsProcessing] = useState(false);
  const { addUpload, updateUpload, removeUpload, getAllUploads, clearAll } =
    useMediaUploadStore();

  const processAsset = useCallback(
    async (asset: MediaAsset): Promise<Attachment> => {
      const id = generateId();
      let uri = asset.uri;
      let size = asset.fileSize ?? 0;
      let width = asset.width;
      let height = asset.height;

      // Compress images
      if (asset.type === 'image' && compressionOptions.quality !== 1.0) {
        try {
          const compressed = await mediaService.compressImage(asset.uri, compressionOptions);
          uri = compressed.uri;
          size = compressed.fileSize;
          width = compressed.width;
          height = compressed.height;
        } catch {
          // Use original on compression failure
        }
      }

      // Generate video thumbnail
      let thumbnailUri: string | undefined;
      if (asset.type === 'video') {
        const thumb = await mediaService.generateVideoThumbnail(asset.uri);
        if (thumb) thumbnailUri = thumb;
      }

      return {
        id,
        type: asset.type === 'video' ? 'video' : asset.type === 'file' ? 'document' : 'image',
        uri,
        name: asset.fileName,
        size,
        mimeType: asset.mimeType,
        thumbnailUri,
        width,
        height,
        duration: asset.duration,
      };
    },
    [compressionOptions]
  );

  const uploadAttachment = useCallback(
    async (attachment: Attachment) => {
      if (!channelId) return;

      const uploadItem: UploadItem = {
        id: attachment.id,
        uri: attachment.uri,
        thumbnailUri: attachment.thumbnailUri,
        fileName: attachment.name,
        fileSize: attachment.size ?? 0,
        mimeType: attachment.mimeType ?? 'application/octet-stream',
        type: attachment.type === 'document' ? 'file' : attachment.type as 'image' | 'video' | 'file',
        status: 'uploading',
        progress: 0,
        width: attachment.width,
        height: attachment.height,
        duration: attachment.duration,
      };

      addUpload(uploadItem);

      try {
        await mediaService.upload(
          {
            uri: attachment.uri,
            type: uploadItem.type,
            fileName: attachment.name,
            fileSize: attachment.size,
            mimeType: attachment.mimeType,
            width: attachment.width,
            height: attachment.height,
            duration: attachment.duration,
          },
          channelId,
          (progress) => {
            updateUpload(attachment.id, {
              progress: progress.percentage,
            });
          }
        );
        updateUpload(attachment.id, { status: 'completed', progress: 100 });
        onUploadComplete?.(attachment, attachment.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        updateUpload(attachment.id, { status: 'failed', error: message });
        onUploadError?.(message, attachment.id);
      }
    },
    [channelId, addUpload, updateUpload, onUploadComplete, onUploadError]
  );

  const pickFromGallery = useCallback(
    async (mediaType: 'images' | 'videos' | 'all' = 'all'): Promise<Attachment[]> => {
      setIsProcessing(true);
      try {
        const assets = await mediaService.pickMedia({
          allowsMultiple: maxFiles > 1,
          mediaType,
          quality: compressionOptions.quality,
        });
        const attachments = await Promise.all(assets.slice(0, maxFiles).map(processAsset));
        if (autoUpload) {
          attachments.forEach(uploadAttachment);
        }
        return attachments;
      } finally {
        setIsProcessing(false);
      }
    },
    [maxFiles, compressionOptions, processAsset, autoUpload, uploadAttachment]
  );

  const capturePhoto = useCallback(async (): Promise<Attachment | null> => {
    setIsProcessing(true);
    try {
      const asset = await mediaService.captureMedia('photo');
      if (!asset) return null;
      const attachment = await processAsset(asset);
      if (autoUpload) uploadAttachment(attachment);
      return attachment;
    } finally {
      setIsProcessing(false);
    }
  }, [processAsset, autoUpload, uploadAttachment]);

  const captureVideo = useCallback(async (): Promise<Attachment | null> => {
    setIsProcessing(true);
    try {
      const asset = await mediaService.captureMedia('video');
      if (!asset) return null;
      const attachment = await processAsset(asset);
      if (autoUpload) uploadAttachment(attachment);
      return attachment;
    } finally {
      setIsProcessing(false);
    }
  }, [processAsset, autoUpload, uploadAttachment]);

  const pickDocuments = useCallback(async (): Promise<Attachment[]> => {
    setIsProcessing(true);
    try {
      const assets = await mediaService.pickDocuments({ multiple: maxFiles > 1 });
      const attachments = await Promise.all(assets.slice(0, maxFiles).map(processAsset));
      if (autoUpload) {
        attachments.forEach(uploadAttachment);
      }
      return attachments;
    } finally {
      setIsProcessing(false);
    }
  }, [maxFiles, processAsset, autoUpload, uploadAttachment]);

  const pickFiles = useCallback(async (): Promise<Attachment[]> => {
    setIsProcessing(true);
    try {
      const assets = await mediaService.pickAnyFile(maxFiles > 1);
      const attachments = await Promise.all(assets.slice(0, maxFiles).map(processAsset));
      if (autoUpload) {
        attachments.forEach(uploadAttachment);
      }
      return attachments;
    } finally {
      setIsProcessing(false);
    }
  }, [maxFiles, processAsset, autoUpload, uploadAttachment]);

  const retryUpload = useCallback(
    async (attachmentId: string) => {
      const uploads = getAllUploads();
      const upload = uploads.find((u) => u.id === attachmentId);
      if (!upload || !channelId) return;

      const attachment: Attachment = {
        id: upload.id,
        type: upload.type === 'file' ? 'document' : upload.type,
        uri: upload.uri,
        name: upload.fileName,
        size: upload.fileSize,
        mimeType: upload.mimeType,
        thumbnailUri: upload.thumbnailUri,
        width: upload.width,
        height: upload.height,
        duration: upload.duration,
      };

      await uploadAttachment(attachment);
    },
    [channelId, getAllUploads, uploadAttachment]
  );

  return {
    isProcessing,
    pickFromGallery,
    capturePhoto,
    captureVideo,
    pickDocuments,
    pickFiles,
    uploadAttachment,
    retryUpload,
    removeUpload,
    clearUploads: clearAll,
  };
}
