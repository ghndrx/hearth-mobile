import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { type MediaAsset } from '../../lib/services/media';
import { mediaService } from '../../lib/services/media';
import { UploadProgressBar } from './UploadProgressBar';
import {
  useMediaPicker,
  type UseMediaPickerOptions,
} from '../../lib/hooks/useMediaPicker';

type MediaSource = 'gallery' | 'camera-photo' | 'camera-video' | 'document';

interface SourceOption {
  key: MediaSource;
  icon: string;
  label: string;
  color: string;
}

const SOURCE_OPTIONS: SourceOption[] = [
  { key: 'gallery', icon: 'images-outline', label: 'Gallery', color: '#5865F2' },
  { key: 'camera-photo', icon: 'camera-outline', label: 'Photo', color: '#57F287' },
  { key: 'camera-video', icon: 'videocam-outline', label: 'Video', color: '#FEE75C' },
  { key: 'document', icon: 'document-outline', label: 'File', color: '#EB459E' },
];

interface EnhancedMediaPickerProps {
  visible: boolean;
  onClose: () => void;
  onAssetsReady?: (assets: MediaAsset[]) => void;
  pickerOptions?: UseMediaPickerOptions;
}

export const EnhancedMediaPicker: React.FC<EnhancedMediaPickerProps> = ({
  visible,
  onClose,
  onAssetsReady,
  pickerOptions,
}) => {
  const {
    assets,
    uploads,
    isLoading,
    error,
    pickImages,
    capturePhoto,
    captureVideo,
    pickDocuments,
    removeAsset,
    clearAssets,
    reset,
  } = useMediaPicker(pickerOptions);

  const handleSource = useCallback(
    async (source: MediaSource) => {
      switch (source) {
        case 'gallery':
          await pickImages({ allowsMultiple: true });
          break;
        case 'camera-photo':
          await capturePhoto();
          break;
        case 'camera-video':
          await captureVideo();
          break;
        case 'document':
          await pickDocuments({ allowsMultiple: true });
          break;
      }
    },
    [pickImages, capturePhoto, captureVideo, pickDocuments]
  );

  const handleSend = useCallback(() => {
    if (assets.length > 0) {
      onAssetsReady?.(assets);
      reset();
      onClose();
    }
  }, [assets, onAssetsReady, reset, onClose]);

  const handleCancel = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={handleCancel} />

      <Animated.View
        entering={SlideInDown.springify().damping(20)}
        exiting={SlideOutDown.duration(200)}
        style={styles.sheet}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.handle} />
          <Text style={styles.title}>Add Attachment</Text>
          {assets.length > 0 && (
            <Text style={styles.count}>
              {assets.length} selected
            </Text>
          )}
        </View>

        {/* Source buttons */}
        <View style={styles.sourceRow}>
          {SOURCE_OPTIONS.map(opt => (
            <Pressable
              key={opt.key}
              style={({ pressed }) => [
                styles.sourceButton,
                pressed && styles.sourceButtonPressed,
              ]}
              onPress={() => handleSource(opt.key)}
              disabled={isLoading}
            >
              <View style={[styles.sourceIcon, { backgroundColor: opt.color + '20' }]}>
                {isLoading ? (
                  <ActivityIndicator size="small" color={opt.color} />
                ) : (
                  <Ionicons name={opt.icon as any} size={24} color={opt.color} />
                )}
              </View>
              <Text style={styles.sourceLabel}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Error display */}
        {error && (
          <Animated.View entering={FadeIn} style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={16} color="#ED4245" />
            <Text style={styles.errorText}>{error}</Text>
          </Animated.View>
        )}

        {/* Preview strip */}
        {assets.length > 0 && (
          <Animated.View entering={FadeIn.duration(200)}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.previewStrip}
            >
              {assets.map((asset, index) => (
                <AssetPreview
                  key={`${asset.uri}_${index}`}
                  asset={asset}
                  onRemove={() => removeAsset(asset.uri)}
                />
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Upload progress */}
        <UploadProgressBar uploads={uploads} />

        {/* Action buttons */}
        <View style={styles.actions}>
          <Pressable style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>

          {assets.length > 0 && (
            <Animated.View entering={FadeIn.duration(150)}>
              <Pressable
                style={({ pressed }) => [
                  styles.sendButton,
                  pressed && styles.sendButtonPressed,
                ]}
                onPress={handleSend}
              >
                <Ionicons name="send" size={16} color="#FFFFFF" />
                <Text style={styles.sendText}>
                  Attach ({assets.length})
                </Text>
              </Pressable>
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </View>
  );
};

interface AssetPreviewProps {
  asset: MediaAsset;
  onRemove: () => void;
}

const AssetPreview: React.FC<AssetPreviewProps> = ({ asset, onRemove }) => {
  const isImage = asset.type === 'image';
  const isVideo = asset.type === 'video';
  const previewUri = isVideo ? asset.thumbnailUri : isImage ? asset.uri : null;
  const sizeLabel = asset.fileSize
    ? mediaService.formatFileSize(asset.fileSize)
    : '';

  return (
    <View style={styles.previewItem}>
      {previewUri ? (
        <Image source={{ uri: previewUri }} style={styles.previewImage} />
      ) : (
        <View style={styles.previewFile}>
          <Ionicons
            name={mediaService.getFileIcon(asset.mimeType ?? '') as any}
            size={28}
            color="#B9BBBE"
          />
        </View>
      )}

      {/* Video duration overlay */}
      {isVideo && asset.duration != null && (
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>
            {formatDuration(asset.duration)}
          </Text>
        </View>
      )}

      {/* File size badge */}
      {sizeLabel ? (
        <View style={styles.sizeBadge}>
          <Text style={styles.sizeText}>{sizeLabel}</Text>
        </View>
      ) : null}

      {/* File name for documents */}
      {asset.type === 'file' && (
        <Text style={styles.previewFileName} numberOfLines={2}>
          {asset.fileName}
        </Text>
      )}

      {/* Remove button */}
      <Pressable
        style={styles.removeButton}
        onPress={onRemove}
        hitSlop={6}
      >
        <Ionicons name="close-circle" size={22} color="#ED4245" />
      </Pressable>
    </View>
  );
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    backgroundColor: '#2F3136',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    maxHeight: '70%',
  },
  header: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  count: {
    fontSize: 13,
    color: '#5865F2',
    marginTop: 2,
  },
  sourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sourceButton: {
    alignItems: 'center',
    gap: 6,
    minWidth: 64,
  },
  sourceButtonPressed: {
    opacity: 0.7,
  },
  sourceIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sourceLabel: {
    fontSize: 12,
    color: '#B9BBBE',
    fontWeight: '500',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(237, 66, 69, 0.1)',
    borderRadius: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#ED4245',
    flex: 1,
  },
  previewStrip: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  previewItem: {
    width: 88,
    height: 88,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#202225',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  previewFile: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewFileName: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    fontSize: 9,
    color: '#B9BBBE',
    textAlign: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  durationText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  sizeBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  sizeText: {
    fontSize: 9,
    color: '#B9BBBE',
  },
  removeButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#2F3136',
    borderRadius: 11,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelText: {
    fontSize: 15,
    color: '#ED4245',
    fontWeight: '500',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#5865F2',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  sendButtonPressed: {
    backgroundColor: '#4752C4',
  },
  sendText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
