/**
 * ChatImage Component
 * Displays an uploaded image in a chat message with loading states and error handling
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Image,
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { formatFileSize } from '../../services/fileUpload/types';

export interface ChatImageProps {
  /** Image URL or local URI */
  uri: string;
  /** Optional thumbnail URL for faster loading */
  thumbnailUri?: string;
  /** Image width (optional, will be fetched if not provided) */
  width?: number;
  /** Image height (optional, will be fetched if not provided) */
  height?: number;
  /** Alt text / description for accessibility */
  alt?: string;
  /** Callback when image is pressed */
  onPress?: () => void;
  /** Callback when image long press (for context menu) */
  onLongPress?: () => void;
  /** Maximum width in chat */
  maxWidth?: number;
  /** Maximum height in chat */
  maxHeight?: number;
  /** Whether the image is being uploaded (shows progress) */
  isUploading?: boolean;
  /** Upload progress percentage (0-100) */
  uploadProgress?: number;
  /** Whether to show a border radius (for inline display) */
  rounded?: boolean;
  /** Optional CSS class name for styling */
  className?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function ChatImage({
  uri,
  thumbnailUri,
  width,
  height,
  alt = 'Image',
  onPress,
  onLongPress,
  maxWidth = SCREEN_WIDTH * 0.7,
  maxHeight = 300,
  isUploading = false,
  uploadProgress = 0,
  rounded = true,
  className,
}: ChatImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Calculate display dimensions maintaining aspect ratio
  const getDimensions = useCallback(() => {
    if (width && height) {
      const aspectRatio = width / height;
      let displayWidth = Math.min(width, maxWidth);
      let displayHeight = displayWidth / aspectRatio;
      
      if (displayHeight > maxHeight) {
        displayHeight = maxHeight;
        displayWidth = displayHeight * aspectRatio;
      }
      
      return { width: displayWidth, height: displayHeight };
    }
    
    // Default dimensions if unknown
    return { width: maxWidth, height: maxHeight };
  }, [width, height, maxWidth, maxHeight]);

  const dimensions = getDimensions();

  const handlePress = () => {
    if (hasError) return;
    
    if (onPress) {
      onPress();
    } else {
      // Default behavior: open full-screen modal
      setIsModalOpen(true);
    }
  };

  const handleLongPress = () => {
    if (onLongPress && !hasError) {
      onLongPress();
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = (error: any) => {
    setIsLoading(false);
    setHasError(true);
    setImageError(error?.message || 'Failed to load image');
  };

  // Determine which URI to show (thumbnail for loading, main for display)
  const displayUri = isLoading && thumbnailUri ? thumbnailUri : uri;

  const containerBase = {
    overflow: 'hidden' as const,
    backgroundColor: '#2a2a2a',
    width: dimensions.width,
    height: dimensions.height,
    ...(rounded && { borderRadius: 8 }),
  };

  const containerStyle = [containerBase, className as any];

  if (hasError && !isUploading) {
    return (
      <View style={[containerStyle, styles.errorContainer]}>
        <Text style={styles.errorIcon}>🖼️</Text>
        <Text style={styles.errorText}>Failed to load</Text>
      </View>
    );
  }

  return (
    <>
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        style={({ pressed }) => [containerStyle, pressed && styles.pressed]}
        accessibilityLabel={alt}
        accessibilityRole="image"
        accessibilityHint={hasError ? 'Image failed to load' : 'Tap to view full size'}
      >
        <ExpoImage
          source={{ uri: displayUri }}
          style={[styles.image, { width: '100%', height: '100%' }]}
          contentFit="cover"
          transition={200}
          onLoad={handleLoad}
          onError={handleError}
          blurRadius={isLoading ? 10 : 0}
        />

        {isLoading && !isUploading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#ffffff" />
          </View>
        )}

        {isUploading && (
          <View style={styles.uploadingOverlay}>
            <View style={styles.progressContainer}>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text style={styles.progressText}>
                {uploadProgress > 0 ? `${Math.round(uploadProgress)}%` : 'Uploading...'}
              </Text>
            </View>
            {uploadProgress > 0 && (
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${uploadProgress}%` }
                  ]} 
                />
              </View>
            )}
          </View>
        )}

        {hasError && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorIconSmall}>⚠️</Text>
          </View>
        )}
      </Pressable>

      {/* Full-screen image modal */}
      <Modal
        visible={isModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <Pressable 
          style={styles.modalBackdrop}
          onPress={() => setIsModalOpen(false)}
        >
          <View style={styles.modalContent}>
            <ExpoImage
              source={{ uri }}
              style={styles.modalImage}
              contentFit="contain"
              transition={200}
            />
            {alt && alt !== 'Image' && (
              <View style={styles.captionContainer}>
                <Text style={styles.captionText}>{alt}</Text>
              </View>
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#2a2a2a',
  },
  rounded: {
    borderRadius: 8,
  },
  pressed: {
    opacity: 0.9,
  },
  image: {
    backgroundColor: '#2a2a2a',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3a3a3a',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  errorIconSmall: {
    fontSize: 20,
  },
  errorText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: '80%',
  },
  captionContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
  },
  captionText: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default ChatImage;
