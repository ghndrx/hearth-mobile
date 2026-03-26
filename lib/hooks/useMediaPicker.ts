/**
 * useMediaPicker Hook
 * Manages media selection, compression, and upload state
 */

import { useState, useCallback } from 'react';
import {
  mediaService,
  type MediaAsset,
  type MediaPickerOptions,
  type CompressionOptions,
  type DocumentPickerOptions,
  type UploadProgress,
  type UploadResult,
  type UploadTask,
  type UploadState,
} from '../services/media';

export interface UseMediaPickerOptions {
  maxSelections?: number;
  autoCompress?: boolean;
  compressionOptions?: CompressionOptions;
  channelId?: string;
}

export interface UseMediaPickerReturn {
  /** Currently selected assets */
  assets: MediaAsset[];
  /** Active upload tasks with progress */
  uploads: UploadTask[];
  /** Whether any operation is in progress */
  isLoading: boolean;
  /** Last error message */
  error: string | null;
  /** Pick images from gallery */
  pickImages: (options?: MediaPickerOptions) => Promise<void>;
  /** Pick videos from gallery */
  pickVideos: () => Promise<void>;
  /** Pick any media from gallery */
  pickMedia: (options?: MediaPickerOptions) => Promise<void>;
  /** Pick documents */
  pickDocuments: (options?: DocumentPickerOptions) => Promise<void>;
  /** Capture photo from camera */
  capturePhoto: () => Promise<void>;
  /** Capture video from camera */
  captureVideo: () => Promise<void>;
  /** Remove a selected asset */
  removeAsset: (uri: string) => void;
  /** Clear all selections */
  clearAssets: () => void;
  /** Upload all selected assets */
  uploadAll: (channelId?: string) => Promise<UploadResult[]>;
  /** Upload a single asset */
  uploadAsset: (asset: MediaAsset, channelId?: string) => Promise<UploadResult>;
  /** Cancel all and reset */
  reset: () => void;
}

export function useMediaPicker(
  options: UseMediaPickerOptions = {}
): UseMediaPickerReturn {
  const {
    maxSelections = 10,
    autoCompress = true,
    compressionOptions,
    channelId: defaultChannelId,
  } = options;

  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [uploads, setUploads] = useState<UploadTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addAssets = useCallback(
    (newAssets: MediaAsset[]) => {
      setAssets(prev => {
        const remaining = maxSelections - prev.length;
        return [...prev, ...newAssets.slice(0, remaining)];
      });
      setError(null);
    },
    [maxSelections]
  );

  const compressIfNeeded = useCallback(
    async (asset: MediaAsset): Promise<MediaAsset> => {
      if (!autoCompress || asset.type !== 'image') return asset;

      try {
        const compressed = await mediaService.compressImage(
          asset.uri,
          compressionOptions
        );
        return {
          ...asset,
          uri: compressed.uri,
          width: compressed.width,
          height: compressed.height,
        };
      } catch {
        // Return original if compression fails
        return asset;
      }
    },
    [autoCompress, compressionOptions]
  );

  const pickImages = useCallback(
    async (pickerOptions?: MediaPickerOptions) => {
      setIsLoading(true);
      setError(null);
      try {
        const picked = await mediaService.pickMedia({
          mediaType: 'images',
          allowsMultiple: true,
          ...pickerOptions,
        });
        const compressed = await Promise.all(picked.map(compressIfNeeded));
        addAssets(compressed);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to pick images');
      } finally {
        setIsLoading(false);
      }
    },
    [addAssets, compressIfNeeded]
  );

  const pickVideos = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const picked = await mediaService.pickMedia({
        mediaType: 'videos',
        allowsMultiple: true,
      });
      addAssets(picked);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to pick videos');
    } finally {
      setIsLoading(false);
    }
  }, [addAssets]);

  const pickMedia = useCallback(
    async (pickerOptions?: MediaPickerOptions) => {
      setIsLoading(true);
      setError(null);
      try {
        const picked = await mediaService.pickMedia({
          mediaType: 'all',
          allowsMultiple: true,
          ...pickerOptions,
        });
        const processed = await Promise.all(picked.map(compressIfNeeded));
        addAssets(processed);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to pick media');
      } finally {
        setIsLoading(false);
      }
    },
    [addAssets, compressIfNeeded]
  );

  const pickDocuments = useCallback(
    async (docOptions?: DocumentPickerOptions) => {
      setIsLoading(true);
      setError(null);
      try {
        const picked = await mediaService.pickDocuments({
          allowsMultiple: true,
          ...docOptions,
        });
        addAssets(picked);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to pick documents');
      } finally {
        setIsLoading(false);
      }
    },
    [addAssets]
  );

  const capturePhoto = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const captured = await mediaService.captureMedia('photo');
      if (captured) {
        const compressed = await compressIfNeeded(captured);
        addAssets([compressed]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to capture photo');
    } finally {
      setIsLoading(false);
    }
  }, [addAssets, compressIfNeeded]);

  const captureVideo = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const captured = await mediaService.captureMedia('video');
      if (captured) {
        addAssets([captured]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to capture video');
    } finally {
      setIsLoading(false);
    }
  }, [addAssets]);

  const removeAsset = useCallback((uri: string) => {
    setAssets(prev => prev.filter(a => a.uri !== uri));
  }, []);

  const clearAssets = useCallback(() => {
    setAssets([]);
  }, []);

  const updateUploadTask = useCallback(
    (id: string, update: Partial<UploadTask>) => {
      setUploads(prev =>
        prev.map(t => (t.id === id ? { ...t, ...update } : t))
      );
    },
    []
  );

  const uploadAsset = useCallback(
    async (asset: MediaAsset, channelId?: string): Promise<UploadResult> => {
      const targetChannel = channelId ?? defaultChannelId;
      if (!targetChannel) {
        throw new Error('Channel ID is required for upload');
      }

      const taskId = `upload_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const task: UploadTask = {
        id: taskId,
        asset,
        state: 'uploading',
        progress: { loaded: 0, total: 0, percentage: 0 },
      };

      setUploads(prev => [...prev, task]);

      try {
        const result = await mediaService.upload(
          asset,
          targetChannel,
          (progress: UploadProgress) => {
            updateUploadTask(taskId, { progress });
          }
        );

        updateUploadTask(taskId, {
          state: 'done',
          result,
          progress: { loaded: 1, total: 1, percentage: 100 },
        });

        return result;
      } catch (e) {
        const errorMsg =
          e instanceof Error ? e.message : 'Upload failed';
        updateUploadTask(taskId, { state: 'error', error: errorMsg });
        throw e;
      }
    },
    [defaultChannelId, updateUploadTask]
  );

  const uploadAll = useCallback(
    async (channelId?: string): Promise<UploadResult[]> => {
      const results: UploadResult[] = [];
      for (const asset of assets) {
        try {
          const result = await uploadAsset(asset, channelId);
          results.push(result);
        } catch {
          // Continue uploading remaining assets
        }
      }
      return results;
    },
    [assets, uploadAsset]
  );

  const reset = useCallback(() => {
    setAssets([]);
    setUploads([]);
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    assets,
    uploads,
    isLoading,
    error,
    pickImages,
    pickVideos,
    pickMedia,
    pickDocuments,
    capturePhoto,
    captureVideo,
    removeAsset,
    clearAssets,
    uploadAll,
    uploadAsset,
    reset,
  };
}
