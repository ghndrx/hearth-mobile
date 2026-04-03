/**
 * Image Attachment Component
 * Handles image selection, preview, compression, and attachment to messages
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  Alert,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { LoadingSpinner } from './ui';
import { mediaService } from '../lib/services/media';
import { imageProcessingService } from '../lib/services/imageProcessing';
import type { LocalAttachment } from '../lib/types/offline';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_SIZE = Math.min(SCREEN_WIDTH * 0.2, 80);

interface ImageAttachmentProps {
  onAttachmentChange: (attachments: LocalAttachment[]) => void;
  attachments: LocalAttachment[];
  maxImages?: number;
  maxSizeBytes?: number;
  quality?: number;
}

interface ImageAttachmentItemProps {
  attachment: LocalAttachment;
  onRemove: () => void;
  onRetry?: () => void;
  isUploading?: boolean;
}

function ImageAttachmentItem({ attachment, onRemove, onRetry, isUploading }: ImageAttachmentItemProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="relative">
      <View
        className={`relative overflow-hidden rounded-xl border-2 ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}
        style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
      >
        <Image
          source={{ uri: attachment.uri }}
          style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
          className="object-cover"
          resizeMode="cover"
        />

        {/* Upload progress overlay */}
        {isUploading && (
          <View className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <LoadingSpinner size="small" />
            <Text className="text-xs text-white mt-1">
              {attachment.uploadProgress ? `${Math.round(attachment.uploadProgress)}%` : 'Uploading...'}
            </Text>
          </View>
        )}

        {/* Upload error overlay */}
        {attachment.uploadError && (
          <View className="absolute inset-0 bg-red-500/80 flex items-center justify-center">
            <Ionicons name="warning-outline" size={20} color="white" />
            <Text className="text-xs text-white mt-1 text-center px-1">
              Upload Failed
            </Text>
            {onRetry && (
              <Pressable
                onPress={onRetry}
                className="mt-1 px-2 py-1 bg-white/20 rounded"
              >
                <Text className="text-xs text-white font-medium">Retry</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Remove button */}
        <Pressable
          onPress={onRemove}
          className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.3,
            shadowRadius: 2,
          }}
        >
          <Ionicons name="close" size={14} color="white" />
        </Pressable>
      </View>

      {/* File info */}
      <Text
        className={`mt-1 text-xs text-center ${
          isDark ? 'text-gray-400' : 'text-gray-500'
        }`}
        numberOfLines={1}
        style={{ width: PREVIEW_SIZE }}
      >
        {attachment.filename}
      </Text>

      {attachment.uploadError && (
        <Text className="text-xs text-red-500 text-center mt-1">
          Upload failed
        </Text>
      )}
    </View>
  );
}

export function ImageAttachment({
  onAttachmentChange,
  attachments = [],
  maxImages = 5,
  maxSizeBytes = 10 * 1024 * 1024, // 10MB default
  quality = 0.8,
}: ImageAttachmentProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isSelecting, setIsSelecting] = useState(false);

  const formatFileSize = useCallback((bytes: number): string => {
    return mediaService.formatFileSize(bytes);
  }, []);

  const handleError = useCallback((error: any, context: string): void => {
    console.error(`Image attachment error in ${context}:`, error);

    let message = 'An unexpected error occurred';

    if (error instanceof Error) {
      if (error.message.includes('permission')) {
        message = 'Permission denied. Please check your app permissions.';
      } else if (error.message.includes('network')) {
        message = 'Network error. Please check your connection and try again.';
      } else if (error.message.includes('storage')) {
        message = 'Storage error. Please free up some space and try again.';
      } else if (error.message.includes('format')) {
        message = 'Unsupported image format. Please try a different image.';
      } else {
        message = error.message;
      }
    }

    Alert.alert('Image Error', message);
  }, []);

  const validateImageFile = useCallback(
    async (asset: ImagePicker.ImagePickerAsset): Promise<boolean> => {
      // Check file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const mimeType = asset.mimeType || '';

      if (!allowedTypes.includes(mimeType.toLowerCase())) {
        Alert.alert(
          'Unsupported Format',
          'Please select a JPEG, PNG, or WebP image.'
        );
        return false;
      }

      // Check dimensions (very large images might cause memory issues)
      if (asset.width > 8000 || asset.height > 8000) {
        Alert.alert(
          'Image Too Large',
          'Images with dimensions larger than 8000x8000 pixels are not supported.'
        );
        return false;
      }

      return true;
    },
    []
  );

  const retryUpload = useCallback(
    (attachmentId: string) => {
      const attachment = attachments.find(a => a.id === attachmentId);
      if (!attachment) return;

      // Clear the error state - the upload will be retried by the message queue
      const updatedAttachments = attachments.map(a =>
        a.id === attachmentId
          ? { ...a, uploadError: undefined, uploadProgress: undefined }
          : a
      );
      onAttachmentChange(updatedAttachments);
    },
    [attachments, onAttachmentChange]
  );

  const processImage = useCallback(async (uri: string): Promise<{ uri: string; size: number }> => {
    try {
      // Use smart compression for optimal results
      const result = await imageProcessingService.smartCompress(uri, {
        quality,
        maxWidth: 1920,
        maxHeight: 1920,
        targetSizeBytes: maxSizeBytes * 0.8, // Target 80% of max to leave room for variance
      });

      return {
        uri: result.uri,
        size: result.fileSize,
      };
    } catch (error) {
      console.warn('Image processing failed, using original:', error);
      // Get original file size as fallback
      try {
        const originalSize = await imageProcessingService.getImageFileSize(uri);
        return { uri, size: originalSize };
      } catch {
        return { uri, size: 0 };
      }
    }
  }, [quality, maxSizeBytes]);

  const createAttachment = useCallback(
    async (asset: ImagePicker.ImagePickerAsset): Promise<LocalAttachment | null> => {
      try {
        // Validate the image file first
        const isValid = await validateImageFile(asset);
        if (!isValid) {
          return null;
        }

        let uri = asset.uri;
        let fileSize = asset.fileSize || 0;

        // Process image if it's large or if we need to optimize it
        const needsProcessing = await imageProcessingService.needsCompression(
          uri,
          maxSizeBytes,
          1920
        );

        if (needsProcessing || fileSize > 2 * 1024 * 1024) {
          try {
            const processed = await processImage(uri);
            uri = processed.uri;
            fileSize = processed.size;
          } catch (processError) {
            handleError(processError, 'image processing');
            return null;
          }
        }

        // Check final file size
        if (fileSize > maxSizeBytes) {
          Alert.alert(
            'File Too Large',
            `Image must be smaller than ${formatFileSize(maxSizeBytes)}. Current size: ${formatFileSize(fileSize)}`
          );
          return null;
        }

        const filename = asset.fileName || `image_${Date.now()}.jpg`;
        const mimeType = asset.mimeType || 'image/jpeg';

        return {
          id: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          uri,
          filename,
          contentType: mimeType,
          size: fileSize,
        };
      } catch (error) {
        handleError(error, 'attachment creation');
        return null;
      }
    },
    [maxSizeBytes, formatFileSize, processImage, validateImageFile, handleError]
  );

  const selectFromLibrary = useCallback(async () => {
    setIsSelecting(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const hasPermission = await mediaService.requestPermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library in Settings to attach images.'
        );
        return;
      }

      const remainingSlots = maxImages - attachments.length;
      if (remainingSlots <= 0) {
        Alert.alert(
          'Maximum Images Reached',
          `You can only attach up to ${maxImages} images.`
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        allowsEditing: false,
        quality,
        selectionLimit: remainingSlots,
      });

      if (!result.canceled && result.assets.length > 0) {
        const newAttachments: LocalAttachment[] = [];

        for (const asset of result.assets) {
          try {
            const attachment = await createAttachment(asset);
            if (attachment) {
              newAttachments.push(attachment);
            }
          } catch (attachmentError) {
            handleError(attachmentError, `processing ${asset.fileName || 'image'}`);
          }
        }

        if (newAttachments.length > 0) {
          onAttachmentChange([...attachments, ...newAttachments]);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (result.assets.length > 0) {
          // All images failed to process
          Alert.alert(
            'Processing Failed',
            'Could not process the selected images. Please try different images.'
          );
        }
      }
    } catch (error) {
      handleError(error, 'image library access');
    } finally {
      setIsSelecting(false);
    }
  }, [attachments, onAttachmentChange, maxImages, quality, createAttachment, handleError]);

  const takePhoto = useCallback(async () => {
    setIsSelecting(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const hasPermission = await mediaService.requestCameraPermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Please allow camera access in Settings to take photos.'
        );
        return;
      }

      if (attachments.length >= maxImages) {
        Alert.alert(
          'Maximum Images Reached',
          `You can only attach up to ${maxImages} images.`
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality,
      });

      if (!result.canceled && result.assets[0]) {
        try {
          const attachment = await createAttachment(result.assets[0]);
          if (attachment) {
            onAttachmentChange([...attachments, attachment]);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        } catch (attachmentError) {
          handleError(attachmentError, 'processing captured photo');
        }
      }
    } catch (error) {
      handleError(error, 'camera access');
    } finally {
      setIsSelecting(false);
    }
  }, [attachments, onAttachmentChange, maxImages, quality, createAttachment, handleError]);

  const showAttachmentOptions = useCallback(() => {
    Alert.alert(
      'Add Image',
      'Choose how you want to add an image',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Photo Library', onPress: selectFromLibrary },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [takePhoto, selectFromLibrary]);

  const removeAttachment = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const updated = attachments.filter(a => a.id !== id);
      onAttachmentChange(updated);
    },
    [attachments, onAttachmentChange]
  );

  const canAddMore = attachments.length < maxImages;

  return (
    <View className="py-2">
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <View className="flex-row flex-wrap gap-2 mb-3">
          {attachments.map(attachment => (
            <ImageAttachmentItem
              key={attachment.id}
              attachment={attachment}
              onRemove={() => removeAttachment(attachment.id)}
              onRetry={() => retryUpload(attachment.id)}
              isUploading={!!attachment.uploadProgress}
            />
          ))}
        </View>
      )}

      {/* Add button */}
      {canAddMore && (
        <Pressable
          onPress={showAttachmentOptions}
          disabled={isSelecting}
          className={`flex-row items-center justify-center p-3 rounded-xl border-2 border-dashed ${
            isDark
              ? 'border-gray-600 bg-gray-800/30'
              : 'border-gray-300 bg-gray-50'
          } ${isSelecting ? 'opacity-50' : ''}`}
        >
          {isSelecting ? (
            <LoadingSpinner size="small" />
          ) : (
            <Ionicons
              name="camera-outline"
              size={24}
              color={isDark ? '#9ca3af' : '#6b7280'}
            />
          )}
          <Text
            className={`ml-2 font-medium ${
              isDark ? 'text-gray-300' : 'text-gray-600'
            }`}
          >
            {isSelecting ? 'Selecting...' : 'Add Image'}
          </Text>
        </Pressable>
      )}

      {/* Info text */}
      {attachments.length > 0 && (
        <Text
          className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
        >
          {attachments.length} of {maxImages} images • Max {formatFileSize(maxSizeBytes)} each
        </Text>
      )}
    </View>
  );
}

export default ImageAttachment;