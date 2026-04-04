import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Image,
  ScrollView,
  useColorScheme,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOutDown, SlideInUp } from 'react-native-reanimated';
import { FileAttachmentService, FileAttachment } from '../../src/services/files';

export interface Attachment {
  id: string;
  type: 'image' | 'document' | 'file' | 'audio';
  uri: string;
  name: string;
  size?: number;
}

interface AttachmentPickerProps {
  onAttachmentSelected?: (attachment: Attachment) => void;
  onAttachmentsSelected?: (attachments: Attachment[]) => void;
  visible: boolean;
  onClose: () => void;
  maxAttachments?: number;
}

export const AttachmentPicker: React.FC<AttachmentPickerProps> = ({
  onAttachmentSelected,
  onAttachmentsSelected,
  visible,
  onClose,
  maxAttachments = 10,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isLoading, setIsLoading] = useState(false);
  const fileService = FileAttachmentService.getInstance();

  const convertToLegacyAttachment = (file: FileAttachment): Attachment => ({
    id: file.id,
    type: file.type === 'document' || file.type === 'image' || file.type === 'audio'
      ? file.type
      : 'file' as const,
    uri: file.uri,
    name: file.name,
    size: file.size,
  });

  const handleFilesSelected = (files: FileAttachment[]) => {
    const attachments = files.map(convertToLegacyAttachment);

    if (onAttachmentsSelected) {
      onAttachmentsSelected(attachments);
    } else if (onAttachmentSelected && attachments[0]) {
      onAttachmentSelected(attachments[0]);
    }
    onClose();
  };

  const pickImages = async () => {
    try {
      setIsLoading(true);
      const files = await fileService.pickImages(!!onAttachmentsSelected);
      if (files.length > 0) {
        handleFilesSelected(files.slice(0, maxAttachments));
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const captureImage = async () => {
    try {
      setIsLoading(true);
      const file = await fileService.captureImage();
      if (file) {
        handleFilesSelected([file]);
      }
    } catch (error) {
      console.error('Error capturing image:', error);
      Alert.alert('Error', 'Failed to capture image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const pickFiles = async () => {
    try {
      setIsLoading(true);
      const files = await fileService.pickFiles({
        allowedTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'text/csv',
        ],
      });
      if (files.length > 0) {
        handleFilesSelected(files.slice(0, maxAttachments));
      }
    } catch (error) {
      console.error('Error picking files:', error);
      Alert.alert('Error', 'Failed to pick files. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const pickAnyFile = async () => {
    try {
      setIsLoading(true);
      const files = await fileService.pickFiles({});
      if (files.length > 0) {
        handleFilesSelected(files.slice(0, maxAttachments));
      }
    } catch (error) {
      console.error('Error picking files:', error);
      Alert.alert('Error', 'Failed to pick files. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!visible) return null;

  const options = [
    {
      icon: 'camera' as keyof typeof Ionicons.glyphMap,
      label: 'Camera',
      subtitle: 'Take a photo',
      onPress: captureImage,
      color: '#10b981',
    },
    {
      icon: 'images' as keyof typeof Ionicons.glyphMap,
      label: 'Photo Library',
      subtitle: 'Choose from photos',
      onPress: pickImages,
      color: '#8b5cf6',
    },
    {
      icon: 'document-text' as keyof typeof Ionicons.glyphMap,
      label: 'Documents',
      subtitle: 'PDFs, Word, Excel, etc.',
      onPress: pickFiles,
      color: '#3b82f6',
    },
    {
      icon: 'attach' as keyof typeof Ionicons.glyphMap,
      label: 'Browse Files',
      subtitle: 'All file types',
      onPress: pickAnyFile,
      color: '#f59e0b',
    },
  ];

  return (
    <View style={styles.container}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View
        entering={SlideInUp.duration(300)}
        exiting={FadeOutDown.duration(200)}
        style={[
          styles.menu,
          {
            backgroundColor: isDark ? '#2f3136' : '#ffffff',
            borderTopColor: isDark ? '#40444b' : '#e5e7eb',
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text
            style={[
              styles.headerText,
              { color: isDark ? '#dcddde' : '#374151' },
            ]}
          >
            Add Attachment
          </Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons
              name="close"
              size={20}
              color={isDark ? '#b9bbbe' : '#6b7280'}
            />
          </Pressable>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {options.map((option, index) => (
            <Animated.View
              key={option.label}
              entering={FadeInDown.delay(index * 50).duration(200)}
            >
              <Pressable
                style={[
                  styles.option,
                  {
                    backgroundColor: isDark ? '#36393f' : '#f9fafb',
                    borderBottomColor: isDark ? '#40444b' : '#e5e7eb',
                  },
                ]}
                onPress={option.onPress}
                disabled={isLoading}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: option.color + '20' },
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={20}
                    color={option.color}
                  />
                </View>
                <View style={styles.optionContent}>
                  <Text
                    style={[
                      styles.optionLabel,
                      { color: isDark ? '#dcddde' : '#374151' },
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      styles.optionSubtitle,
                      { color: isDark ? '#b9bbbe' : '#6b7280' },
                    ]}
                  >
                    {option.subtitle}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={isDark ? '#b9bbbe' : '#9ca3af'}
                />
              </Pressable>
            </Animated.View>
          ))}
        </View>

        {/* Cancel Button */}
        <Pressable
          style={[
            styles.cancelButton,
            {
              backgroundColor: isDark ? '#40444b' : '#f3f4f6',
              borderTopColor: isDark ? '#40444b' : '#e5e7eb',
            },
          ]}
          onPress={onClose}
        >
          <Text
            style={[
              styles.cancelText,
              { color: isDark ? '#dcddde' : '#374151' },
            ]}
          >
            Cancel
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  menu: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
    maxHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 8,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  optionsContainer: {
    paddingHorizontal: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 13,
  },
  cancelButton: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: 8,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

interface AttachmentPreviewStripProps {
  attachments: Attachment[];
  onRemove: (id: string) => void;
  onPress?: (attachment: Attachment) => void;
}

export const AttachmentPreviewStrip: React.FC<AttachmentPreviewStripProps> = ({
  attachments,
  onRemove,
  onPress,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (attachments.length === 0) return null;

  const convertToFileAttachment = (attachment: Attachment): FileAttachment => ({
    id: attachment.id,
    type: attachment.type === 'file' ? 'unknown' : attachment.type,
    category: attachment.type === 'image' ? 'media' : 'document',
    uri: attachment.uri,
    name: attachment.name,
    size: attachment.size || 0,
    mimeType: 'unknown',
    extension: '',
  });

  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      exiting={FadeOutDown.duration(150)}
      style={[
        previewStyles.container,
        {
          backgroundColor: isDark ? '#2f3136' : '#ffffff',
          borderTopColor: isDark ? '#40444b' : '#e5e7eb',
        },
      ]}
    >
      <View style={previewStyles.header}>
        <Text
          style={[
            previewStyles.headerText,
            { color: isDark ? '#dcddde' : '#374151' },
          ]}
        >
          {attachments.length} file{attachments.length !== 1 ? 's' : ''} attached
        </Text>
      </View>

      <ScrollView
        horizontal
        style={previewStyles.scrollView}
        contentContainerStyle={previewStyles.contentContainer}
        showsHorizontalScrollIndicator={false}
      >
        {attachments.map((attachment, index) => (
          <Animated.View
            key={attachment.id}
            entering={FadeInDown.delay(index * 50).duration(200)}
            style={previewStyles.previewWrapper}
          >
            <Pressable
              onPress={() => onPress?.(attachment)}
              style={previewStyles.preview}
            >
              {attachment.type === 'image' ? (
                <Image
                  source={{ uri: attachment.uri }}
                  style={previewStyles.image}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    previewStyles.file,
                    { backgroundColor: isDark ? '#36393f' : '#f9fafb' },
                  ]}
                >
                  <Ionicons
                    name="document-text"
                    size={24}
                    color={isDark ? '#b9bbbe' : '#6b7280'}
                  />
                  <Text
                    style={[
                      previewStyles.fileName,
                      { color: isDark ? '#dcddde' : '#374151' },
                    ]}
                    numberOfLines={1}
                  >
                    {attachment.name}
                  </Text>
                  {attachment.size && (
                    <Text
                      style={[
                        previewStyles.fileSize,
                        { color: isDark ? '#b9bbbe' : '#6b7280' },
                      ]}
                    >
                      {FileAttachmentService.getInstance().formatFileSize(attachment.size)}
                    </Text>
                  )}
                </View>
              )}
            </Pressable>
            <Pressable
              style={[
                previewStyles.removeButton,
                { backgroundColor: isDark ? '#2f3136' : '#ffffff' },
              ]}
              onPress={() => onRemove(attachment.id)}
            >
              <Ionicons name="close" size={16} color="#ef4444" />
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>
    </Animated.View>
  );
};

const previewStyles = StyleSheet.create({
  container: {
    maxHeight: 120,
    borderTopWidth: 1,
  },
  header: {
    padding: 12,
    paddingBottom: 8,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  previewWrapper: {
    position: 'relative',
  },
  preview: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  file: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  fileName: {
    fontSize: 9,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  fileSize: {
    fontSize: 8,
    marginTop: 1,
    textAlign: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});
