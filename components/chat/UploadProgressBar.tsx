import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeIn,
  FadeOut,
  SlideInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { type UploadTask } from '../../lib/services/media';
import { mediaService } from '../../lib/services/media';

interface UploadProgressBarProps {
  uploads: UploadTask[];
  onDismiss?: (id: string) => void;
}

export const UploadProgressBar: React.FC<UploadProgressBarProps> = ({
  uploads,
  onDismiss,
}) => {
  const activeUploads = uploads.filter(u => u.state !== 'idle');
  if (activeUploads.length === 0) return null;

  return (
    <Animated.View
      entering={SlideInDown.duration(200)}
      exiting={FadeOut.duration(150)}
      style={styles.container}
    >
      {activeUploads.map(upload => (
        <UploadProgressItem
          key={upload.id}
          upload={upload}
          onDismiss={onDismiss}
        />
      ))}
    </Animated.View>
  );
};

interface UploadProgressItemProps {
  upload: UploadTask;
  onDismiss?: (id: string) => void;
}

const UploadProgressItem: React.FC<UploadProgressItemProps> = ({
  upload,
  onDismiss,
}) => {
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    progressWidth.value = withTiming(upload.progress.percentage, {
      duration: 200,
    });
  }, [upload.progress.percentage, progressWidth]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const iconName =
    upload.state === 'done'
      ? 'checkmark-circle'
      : upload.state === 'error'
        ? 'alert-circle'
        : upload.state === 'compressing'
          ? 'resize-outline'
          : 'cloud-upload-outline';

  const iconColor =
    upload.state === 'done'
      ? '#57F287'
      : upload.state === 'error'
        ? '#ED4245'
        : '#5865F2';

  const statusText =
    upload.state === 'done'
      ? 'Uploaded'
      : upload.state === 'error'
        ? upload.error ?? 'Failed'
        : upload.state === 'compressing'
          ? 'Compressing...'
          : `${Math.round(upload.progress.percentage)}%`;

  const fileSize = upload.asset.fileSize
    ? mediaService.formatFileSize(upload.asset.fileSize)
    : '';

  const canDismiss = upload.state === 'done' || upload.state === 'error';

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={styles.item}
    >
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            progressStyle,
            upload.state === 'error' && styles.progressError,
            upload.state === 'done' && styles.progressDone,
          ]}
        />
      </View>

      <View style={styles.itemContent}>
        <Ionicons name={iconName as any} size={20} color={iconColor} />

        <View style={styles.itemInfo}>
          <Text style={styles.fileName} numberOfLines={1}>
            {upload.asset.fileName}
          </Text>
          <Text style={styles.statusText}>
            {statusText}
            {fileSize ? ` \u00B7 ${fileSize}` : ''}
          </Text>
        </View>

        {canDismiss && onDismiss && (
          <Pressable
            onPress={() => onDismiss(upload.id)}
            style={styles.dismissButton}
            hitSlop={8}
          >
            <Ionicons name="close" size={16} color="#B9BBBE" />
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2F3136',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 4,
  },
  item: {
    overflow: 'hidden',
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#5865F2',
    borderRadius: 1,
  },
  progressError: {
    backgroundColor: '#ED4245',
  },
  progressDone: {
    backgroundColor: '#57F287',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    fontSize: 13,
    color: '#DCDDDE',
    fontWeight: '500',
  },
  statusText: {
    fontSize: 11,
    color: '#72767D',
    marginTop: 1,
  },
  dismissButton: {
    padding: 4,
  },
});
