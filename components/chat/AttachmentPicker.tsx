import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Platform,
  Image,
  ScrollView,
  Animated,
  useColorScheme,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import mediaService, { type MediaAsset, type CompressionOptions } from '@/lib/services/media';
import { useMediaUploadStore, type UploadItem } from '@/lib/stores/mediaUpload';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'document' | 'file' | 'audio';
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
  thumbnailUri?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export type MediaSource = 'gallery' | 'camera' | 'camera-video' | 'document' | 'file';

export type CompressionPreset = 'original' | 'high' | 'medium' | 'low';

const COMPRESSION_PRESETS: Record<CompressionPreset, CompressionOptions> = {
  original: { quality: 1.0 },
  high: { quality: 0.8, maxWidth: 2048, maxHeight: 2048 },
  medium: { quality: 0.6, maxWidth: 1440, maxHeight: 1440 },
  low: { quality: 0.4, maxWidth: 1024, maxHeight: 1024 },
};

interface AttachmentPickerProps {
  onAttachmentSelected?: (attachment: Attachment) => void;
  onAttachmentsSelected?: (attachments: Attachment[]) => void;
  visible: boolean;
  onClose: () => void;
  maxAttachments?: number;
  compressionPreset?: CompressionPreset;
  showCompressionOptions?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileIcon(mimeType?: string): string {
  if (!mimeType) return 'document-outline';
  if (mimeType.includes('pdf')) return 'document-text-outline';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'document-outline';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'grid-outline';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'easel-outline';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'archive-outline';
  if (mimeType.startsWith('text/')) return 'code-outline';
  return 'document-outline';
}

// ─── Attachment Picker ───────────────────────────────────────────────────────

export const AttachmentPicker: React.FC<AttachmentPickerProps> = ({
  onAttachmentSelected,
  onAttachmentsSelected,
  visible,
  onClose,
  maxAttachments = 10,
  compressionPreset = 'high',
  showCompressionOptions = false,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [activePreset, setActivePreset] = useState<CompressionPreset>(compressionPreset);
  const [isProcessing, setIsProcessing] = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      slideAnim.setValue(300);
    }
  }, [visible, slideAnim]);

  const emitAttachments = useCallback(
    (attachments: Attachment[]) => {
      const capped = attachments.slice(0, maxAttachments);
      if (onAttachmentsSelected) {
        onAttachmentsSelected(capped);
      } else if (onAttachmentSelected && capped[0]) {
        onAttachmentSelected(capped[0]);
      }
      onClose();
    },
    [onAttachmentSelected, onAttachmentsSelected, onClose, maxAttachments]
  );

  const processAndCompress = useCallback(
    async (assets: MediaAsset[]): Promise<Attachment[]> => {
      const preset = COMPRESSION_PRESETS[activePreset];
      const results: Attachment[] = [];

      for (const asset of assets) {
        const id = generateId();

        if (asset.type === 'image' && activePreset !== 'original') {
          try {
            const compressed = await mediaService.compressImage(asset.uri, preset);
            results.push({
              id,
              type: 'image',
              uri: compressed.uri,
              name: asset.fileName,
              size: compressed.fileSize,
              mimeType: asset.mimeType,
              width: compressed.width,
              height: compressed.height,
            });
            continue;
          } catch {
            // Fall through to uncompressed
          }
        }

        let thumbnailUri: string | undefined;
        if (asset.type === 'video') {
          const thumb = await mediaService.generateVideoThumbnail(asset.uri);
          if (thumb) thumbnailUri = thumb;
        }

        results.push({
          id,
          type: asset.type === 'video' ? 'video' : asset.type === 'file' ? 'document' : 'image',
          uri: asset.uri,
          name: asset.fileName,
          size: asset.fileSize,
          mimeType: asset.mimeType,
          thumbnailUri,
          width: asset.width,
          height: asset.height,
          duration: asset.duration,
        });
      }

      return results;
    },
    [activePreset]
  );

  const handleSource = useCallback(
    async (source: MediaSource) => {
      setIsProcessing(true);
      try {
        let assets: MediaAsset[] = [];

        switch (source) {
          case 'gallery':
            assets = await mediaService.pickMedia({
              allowsMultiple: !!onAttachmentsSelected,
              mediaType: 'all',
              quality: COMPRESSION_PRESETS[activePreset].quality,
            });
            break;

          case 'camera': {
            const photo = await mediaService.captureMedia('photo');
            if (photo) assets = [photo];
            break;
          }

          case 'camera-video': {
            const video = await mediaService.captureMedia('video');
            if (video) assets = [video];
            break;
          }

          case 'document':
            assets = await mediaService.pickDocuments({
              multiple: !!onAttachmentsSelected,
            });
            break;

          case 'file':
            assets = await mediaService.pickAnyFile(!!onAttachmentsSelected);
            break;
        }

        if (assets.length === 0) {
          setIsProcessing(false);
          return;
        }

        const attachments = await processAndCompress(assets);
        emitAttachments(attachments);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to pick media';
        if (!message.includes('permission') && !message.includes('cancel')) {
          Alert.alert('Error', message);
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [onAttachmentsSelected, activePreset, processAndCompress, emitAttachments]
  );

  if (!visible) return null;

  const bg = isDark ? '#2F3136' : '#FFFFFF';
  const textColor = isDark ? '#DCDDDE' : '#1F2937';
  const subtextColor = isDark ? '#80848E' : '#9CA3AF';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const activePill = isDark ? '#5865F2' : '#5865F2';

  const options: { source: MediaSource; icon: string; label: string; subtitle: string }[] = [
    { source: 'gallery', icon: 'images-outline', label: 'Photo & Video Library', subtitle: 'Choose from gallery' },
    { source: 'camera', icon: 'camera-outline', label: 'Take Photo', subtitle: 'Use camera' },
    { source: 'camera-video', icon: 'videocam-outline', label: 'Record Video', subtitle: 'Up to 60 seconds' },
    { source: 'document', icon: 'document-text-outline', label: 'Document', subtitle: 'PDF, Word, Excel, etc.' },
    { source: 'file', icon: 'folder-outline', label: 'Browse Files', subtitle: 'Any file type' },
  ];

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'flex-end',
      }}
    >
      <Pressable
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
        }}
        onPress={onClose}
      />
      <Animated.View
        style={{
          backgroundColor: bg,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingBottom: Platform.OS === 'ios' ? 34 : 16,
          transform: [{ translateY: slideAnim }],
        }}
      >
        {/* Handle bar */}
        <View style={{ alignItems: 'center', paddingVertical: 12 }}>
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: isDark ? '#4E5058' : '#D1D5DB',
            }}
          />
        </View>

        {/* Title */}
        <Text
          style={{
            fontSize: 18,
            fontWeight: '700',
            color: textColor,
            paddingHorizontal: 20,
            marginBottom: 4,
          }}
        >
          Add Attachment
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: subtextColor,
            paddingHorizontal: 20,
            marginBottom: 16,
          }}
        >
          Up to {maxAttachments} files
        </Text>

        {/* Compression presets */}
        {showCompressionOptions && (
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: subtextColor, marginBottom: 8 }}>
              IMAGE QUALITY
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['original', 'high', 'medium', 'low'] as CompressionPreset[]).map((preset) => (
                <Pressable
                  key={preset}
                  onPress={() => setActivePreset(preset)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 16,
                    backgroundColor: activePreset === preset ? activePill : isDark ? '#202225' : '#F3F4F6',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: activePreset === preset ? '#FFFFFF' : subtextColor,
                      textTransform: 'capitalize',
                    }}
                  >
                    {preset}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Source options */}
        {options.map(({ source, icon, label, subtitle }) => (
          <Pressable
            key={source}
            onPress={() => handleSource(source)}
            disabled={isProcessing}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 14,
              paddingHorizontal: 20,
              backgroundColor: pressed ? (isDark ? '#36393F' : '#F9FAFB') : 'transparent',
              opacity: isProcessing ? 0.5 : 1,
              borderBottomWidth: 1,
              borderBottomColor: borderColor,
            })}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: isDark ? '#202225' : '#F3F4F6',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 14,
              }}
            >
              <Ionicons
                name={icon as keyof typeof Ionicons.glyphMap}
                size={22}
                color={isDark ? '#B5BAC1' : '#6B7280'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500', color: textColor }}>{label}</Text>
              <Text style={{ fontSize: 13, color: subtextColor, marginTop: 2 }}>{subtitle}</Text>
            </View>
            {isProcessing ? (
              <ActivityIndicator size="small" color={subtextColor} />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={subtextColor} />
            )}
          </Pressable>
        ))}

        {/* Cancel */}
        <Pressable
          onPress={onClose}
          style={{ paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#ED4245' }}>Cancel</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
};

// ─── Attachment Preview Strip with Upload Progress ───────────────────────────

interface AttachmentPreviewStripProps {
  attachments: Attachment[];
  onRemove: (id: string) => void;
  uploadProgress?: Record<string, number>;
}

export const AttachmentPreviewStrip: React.FC<AttachmentPreviewStripProps> = ({
  attachments,
  onRemove,
  uploadProgress = {},
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (attachments.length === 0) return null;

  const bg = isDark ? '#2F3136' : '#F9FAFB';
  const cardBg = isDark ? '#202225' : '#FFFFFF';
  const textColor = isDark ? '#B9BBBE' : '#6B7280';
  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ maxHeight: 120, backgroundColor: bg }}
      contentContainerStyle={{ padding: 8, gap: 8 }}
    >
      {attachments.map((attachment) => {
        const progress = uploadProgress[attachment.id];
        const isUploading = progress !== undefined && progress < 100;

        return (
          <View
            key={attachment.id}
            style={{
              width: 96,
              height: 96,
              borderRadius: 12,
              overflow: 'hidden',
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor,
              position: 'relative',
            }}
          >
            {/* Thumbnail */}
            {attachment.type === 'image' ? (
              <Image source={{ uri: attachment.uri }} style={{ width: '100%', height: '100%' }} />
            ) : attachment.type === 'video' ? (
              <View style={{ width: '100%', height: '100%' }}>
                {attachment.thumbnailUri ? (
                  <Image source={{ uri: attachment.thumbnailUri }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <View
                    style={{
                      width: '100%',
                      height: '100%',
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: isDark ? '#36393F' : '#E5E7EB',
                    }}
                  >
                    <Ionicons name="videocam" size={28} color={textColor} />
                  </View>
                )}
                {/* Video overlay with play icon + duration */}
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 6,
                    paddingVertical: 3,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                  }}
                >
                  <Ionicons name="play" size={12} color="#FFFFFF" />
                  {attachment.duration !== undefined && (
                    <Text style={{ fontSize: 10, color: '#FFFFFF', fontWeight: '600' }}>
                      {formatDuration(attachment.duration)}
                    </Text>
                  )}
                </View>
              </View>
            ) : (
              <View
                style={{
                  width: '100%',
                  height: '100%',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: 6,
                }}
              >
                <Ionicons
                  name={getFileIcon(attachment.mimeType) as keyof typeof Ionicons.glyphMap}
                  size={28}
                  color={textColor}
                />
                <Text
                  style={{
                    fontSize: 9,
                    color: textColor,
                    marginTop: 4,
                    textAlign: 'center',
                  }}
                  numberOfLines={2}
                >
                  {attachment.name}
                </Text>
                {attachment.size !== undefined && attachment.size > 0 && (
                  <Text style={{ fontSize: 8, color: textColor, marginTop: 2 }}>
                    {formatFileSize(attachment.size)}
                  </Text>
                )}
              </View>
            )}

            {/* Upload progress overlay */}
            {isUploading && (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {/* Circular progress ring */}
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    borderWidth: 3,
                    borderColor: 'rgba(255,255,255,0.2)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    position: 'relative',
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>
                    {Math.round(progress)}%
                  </Text>
                </View>
                {/* Progress bar at bottom */}
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                  }}
                >
                  <View
                    style={{
                      height: '100%',
                      width: `${progress}%`,
                      backgroundColor: '#5865F2',
                      borderRadius: 2,
                    }}
                  />
                </View>
              </View>
            )}

            {/* Remove button */}
            {!isUploading && (
              <Pressable
                onPress={() => onRemove(attachment.id)}
                hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </Pressable>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
};

// ─── Drag & Drop Overlay ─────────────────────────────────────────────────────

interface DragDropOverlayProps {
  visible: boolean;
}

export const DragDropOverlay: React.FC<DragDropOverlayProps> = ({ visible }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, fadeAnim]);

  if (!visible) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(88, 101, 242, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: fadeAnim,
        zIndex: 999,
      }}
    >
      <View
        style={{
          backgroundColor: '#5865F2',
          paddingHorizontal: 32,
          paddingVertical: 24,
          borderRadius: 16,
          alignItems: 'center',
          borderWidth: 2,
          borderColor: '#FFFFFF',
          borderStyle: 'dashed',
        }}
      >
        <Ionicons name="cloud-upload-outline" size={48} color="#FFFFFF" />
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginTop: 12 }}>
          Drop files here
        </Text>
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
          Images, videos, or documents
        </Text>
      </View>
    </Animated.View>
  );
};

// ─── Upload Progress Bar (inline) ────────────────────────────────────────────

interface UploadProgressBarProps {
  uploads: UploadItem[];
}

export const UploadProgressBar: React.FC<UploadProgressBarProps> = ({ uploads }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const active = uploads.filter((u) => u.status === 'compressing' || u.status === 'uploading');
  if (active.length === 0) return null;

  const totalProgress =
    active.reduce((sum, u) => sum + u.progress, 0) / active.length;

  const statusText =
    active.some((u) => u.status === 'compressing')
      ? 'Compressing...'
      : `Uploading ${active.length} file${active.length > 1 ? 's' : ''}...`;

  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: isDark ? '#2F3136' : '#F9FAFB',
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 12, color: isDark ? '#B5BAC1' : '#6B7280' }}>{statusText}</Text>
        <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#B5BAC1' : '#6B7280' }}>
          {Math.round(totalProgress)}%
        </Text>
      </View>
      <View
        style={{
          height: 4,
          borderRadius: 2,
          backgroundColor: isDark ? '#202225' : '#E5E7EB',
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${totalProgress}%`,
            backgroundColor: '#5865F2',
            borderRadius: 2,
          }}
        />
      </View>
    </View>
  );
};
