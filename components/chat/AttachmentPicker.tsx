import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Image, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';

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
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      allowsMultipleSelection: !!onAttachmentsSelected,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const attachments: Attachment[] = result.assets.slice(0, maxAttachments).map((asset, idx) => ({
        id: `${Date.now()}_${idx}`,
        type: 'image' as const,
        uri: asset.uri,
        name: asset.fileName || `image_${Date.now()}_${idx}.jpg`,
      }));
      
      if (onAttachmentsSelected) {
        onAttachmentsSelected(attachments);
      } else if (onAttachmentSelected && attachments[0]) {
        onAttachmentSelected(attachments[0]);
      }
      onClose();
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: !!onAttachmentsSelected,
    });

    if (!result.canceled && result.assets.length > 0) {
      const attachments: Attachment[] = result.assets.slice(0, maxAttachments).map((asset, idx) => ({
        id: `${Date.now()}_${idx}`,
        type: 'document' as const,
        uri: asset.uri,
        name: asset.name,
        size: asset.size,
      }));
      
      if (onAttachmentsSelected) {
        onAttachmentsSelected(attachments);
      } else if (onAttachmentSelected && attachments[0]) {
        onAttachmentSelected(attachments[0]);
      }
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.menu}>
        <Pressable style={styles.option} onPress={pickImage}>
          <Text style={styles.optionText}>📷 Photo</Text>
        </Pressable>
        <Pressable style={styles.option} onPress={pickDocument}>
          <Text style={styles.optionText}>📎 Document</Text>
        </Pressable>
        <Pressable style={[styles.option, styles.cancelOption]} onPress={onClose}>
          <Text style={[styles.optionText, styles.cancelText]}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menu: {
    backgroundColor: '#2F3136',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  option: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelOption: {
    borderBottomWidth: 0,
  },
  optionText: {
    fontSize: 16,
    color: '#DCDDDE',
    textAlign: 'center',
  },
  cancelText: {
    color: '#ED4245',
  },
});

interface AttachmentPreviewStripProps {
  attachments: Attachment[];
  onRemove: (id: string) => void;
}

export const AttachmentPreviewStrip: React.FC<AttachmentPreviewStripProps> = ({
  attachments,
  onRemove,
}) => {
  if (attachments.length === 0) return null;

  return (
    <ScrollView
      horizontal
      style={previewStyles.container}
      contentContainerStyle={previewStyles.contentContainer}
      showsHorizontalScrollIndicator={false}
    >
      {attachments.map((attachment) => (
        <View key={attachment.id} style={previewStyles.preview}>
          {attachment.type === 'image' ? (
            <Image source={{ uri: attachment.uri }} style={previewStyles.image} />
          ) : (
            <View style={previewStyles.file}>
              <Ionicons name="document-outline" size={32} color="#B9BBBE" />
              <Text style={previewStyles.fileName} numberOfLines={1}>
                {attachment.name}
              </Text>
            </View>
          )}
          <Pressable
            style={previewStyles.removeButton}
            onPress={() => onRemove(attachment.id)}
          >
            <Ionicons name="close-circle" size={24} color="#ED4245" />
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
};

const previewStyles = StyleSheet.create({
  container: {
    maxHeight: 100,
    backgroundColor: '#2F3136',
  },
  contentContainer: {
    padding: 8,
    gap: 8,
  },
  preview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#202225',
    position: 'relative',
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
    padding: 4,
  },
  fileName: {
    fontSize: 10,
    color: '#B9BBBE',
    marginTop: 4,
    textAlign: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#2F3136',
    borderRadius: 12,
  },
});
