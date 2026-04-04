import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { FileAttachment, FileAttachmentService } from '../../services/files';

interface FilePreviewProps {
  file: FileAttachment;
  showSize?: boolean;
  showMetadata?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: object;
  compact?: boolean;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  showSize = true,
  showMetadata = false,
  onPress,
  onLongPress,
  style,
  compact = false,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const fileService = FileAttachmentService.getInstance();

  const renderImagePreview = () => (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      className={`rounded-xl overflow-hidden ${compact ? 'w-20 h-20' : 'w-48 h-32'}`}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: file.uri }}
        className="w-full h-full"
        resizeMode="cover"
      />
      {file.uploadStatus === 'uploading' && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center">
          <ActivityIndicator size="small" color="white" />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderVideoPreview = () => (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      className={`rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 items-center justify-center ${
        compact ? 'w-20 h-20' : 'w-48 h-32'
      }`}
      activeOpacity={0.8}
    >
      {file.thumbnail ? (
        <Image
          source={{ uri: file.thumbnail }}
          className="w-full h-full"
          resizeMode="cover"
        />
      ) : (
        <View className="w-full h-full items-center justify-center">
          <Ionicons
            name="videocam"
            size={compact ? 24 : 32}
            color={isDark ? '#9ca3af' : '#6b7280'}
          />
        </View>
      )}
      <View className="absolute inset-0 items-center justify-center">
        <View className="w-10 h-10 rounded-full bg-black/60 items-center justify-center">
          <Ionicons name="play" size={20} color="white" />
        </View>
      </View>
      {file.metadata?.duration && (
        <View className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 rounded">
          <Text className="text-white text-xs font-medium">
            {formatDuration(file.metadata.duration)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderDocumentPreview = () => {
    const iconColor = fileService.getFileColor(file);
    const iconName = fileService.getFileIcon(file) as keyof typeof Ionicons.glyphMap;

    return (
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        className={`${compact ? 'flex-row items-center p-2' : 'p-4'} ${
          isDark ? 'bg-gray-800' : 'bg-gray-50'
        } rounded-xl border ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}
        activeOpacity={0.7}
      >
        <View
          className={`${compact ? 'w-8 h-8' : 'w-12 h-12'} rounded-lg items-center justify-center`}
          style={{ backgroundColor: iconColor + '20' }}
        >
          <Ionicons
            name={iconName}
            size={compact ? 16 : 24}
            color={iconColor}
          />
        </View>

        <View className={`${compact ? 'flex-1 ml-2' : 'mt-3'}`}>
          <Text
            className={`font-medium ${compact ? 'text-sm' : 'text-base'} ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
            numberOfLines={compact ? 1 : 2}
          >
            {file.name}
          </Text>

          {showSize && (
            <Text
              className={`text-xs ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              } ${compact ? 'mt-0.5' : 'mt-1'}`}
            >
              {fileService.formatFileSize(file.size)}
              {file.metadata?.pages && ` • ${file.metadata.pages} pages`}
            </Text>
          )}

          {showMetadata && file.metadata && (
            <View className="mt-1">
              {file.metadata.author && (
                <Text
                  className={`text-xs ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  Author: {file.metadata.author}
                </Text>
              )}
              {file.metadata.createdAt && (
                <Text
                  className={`text-xs ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  Created: {new Date(file.metadata.createdAt).toLocaleDateString()}
                </Text>
              )}
            </View>
          )}
        </View>

        {file.uploadStatus === 'uploading' && (
          <View className="absolute top-2 right-2">
            <ActivityIndicator size="small" color={iconColor} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderAudioPreview = () => (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      className={`p-3 ${
        isDark ? 'bg-gray-800' : 'bg-gray-50'
      } rounded-xl border ${
        isDark ? 'border-gray-700' : 'border-gray-200'
      } flex-row items-center`}
      activeOpacity={0.7}
    >
      <View className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 items-center justify-center">
        <Ionicons name="musical-notes" size={20} color="#f59e0b" />
      </View>

      <View className="flex-1 ml-3">
        <Text
          className={`font-medium text-sm ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}
          numberOfLines={1}
        >
          {file.name}
        </Text>
        <Text
          className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
        >
          {fileService.formatFileSize(file.size)}
          {file.metadata?.duration && ` • ${formatDuration(file.metadata.duration)}`}
        </Text>
      </View>

      <TouchableOpacity className="w-8 h-8 rounded-full bg-amber-500 items-center justify-center ml-2">
        <Ionicons name="play" size={16} color="white" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderUploadStatus = () => {
    if (file.uploadStatus !== 'uploading' && file.uploadStatus !== 'failed') return null;

    return (
      <Animated.View
        entering={FadeIn}
        className={`absolute top-1 right-1 px-2 py-1 rounded-full ${
          file.uploadStatus === 'failed' ? 'bg-red-500' : 'bg-blue-500'
        }`}
      >
        <Text className="text-white text-xs font-medium">
          {file.uploadStatus === 'failed' ? 'Failed' : `${file.uploadProgress || 0}%`}
        </Text>
      </Animated.View>
    );
  };

  return (
    <Animated.View entering={ZoomIn.delay(100)} style={style}>
      <View className="relative">
        {file.type === 'image' && renderImagePreview()}
        {file.type === 'video' && renderVideoPreview()}
        {file.type === 'document' && renderDocumentPreview()}
        {file.type === 'audio' && renderAudioPreview()}
        {renderUploadStatus()}
      </View>
    </Animated.View>
  );
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};