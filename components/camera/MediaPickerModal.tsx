import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  useColorScheme,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ImagePickerService } from '../../lib/services/fileUpload';
import { LocalFile } from '../../lib/types';
import CameraCapture from './CameraCapture';

interface MediaPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onMediaSelect: (files: LocalFile[]) => void;
  allowMultiple?: boolean;
  enableVideo?: boolean;
  title?: string;
}

type PickerMode = 'menu' | 'camera' | 'gallery';

export default function MediaPickerModal({
  visible,
  onClose,
  onMediaSelect,
  allowMultiple = false,
  enableVideo = false,
  title = 'Select Media',
}: MediaPickerModalProps) {
  const [mode, setMode] = useState<PickerMode>('menu');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const imagePickerService = ImagePickerService.getInstance();

  const colors = {
    background: isDark ? '#1e1f22' : '#ffffff',
    surface: isDark ? '#2b2d31' : '#f3f4f6',
    border: isDark ? '#404249' : '#e5e7eb',
    text: isDark ? '#ffffff' : '#000000',
    textSecondary: isDark ? '#949ba4' : '#6b7280',
    primary: '#5865f2',
  };

  const handleCameraCapture = (file: LocalFile) => {
    onMediaSelect([file]);
    handleClose();
  };

  const handleGalleryPick = async () => {
    try {
      const files = await imagePickerService.pickFromLibrary({
        mediaTypes: enableVideo ? 'all' : 'images',
        allowsMultipleSelection: allowMultiple,
        selectionLimit: allowMultiple ? 10 : 1,
        quality: 0.8,
      });

      if (files.length > 0) {
        onMediaSelect(files);
        handleClose();
      }
    } catch (error) {
      console.error('Gallery pick error:', error);
      Alert.alert('Error', 'Failed to pick media from gallery');
    }
  };

  const handleCameraLaunch = () => {
    setMode('camera');
  };

  const handleClose = () => {
    setMode('menu');
    onClose();
  };

  const handleBackToMenu = () => {
    setMode('menu');
  };

  const renderMenu = () => (
    <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Options */}
        <View style={styles.options}>
          <TouchableOpacity
            style={[styles.option, { borderColor: colors.border }]}
            onPress={handleCameraLaunch}
          >
            <View style={[styles.optionIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name="camera" size={32} color="white" />
            </View>
            <Text style={[styles.optionText, { color: colors.text }]}>Camera</Text>
            <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
              Take a {enableVideo ? 'photo or video' : 'photo'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, { borderColor: colors.border }]}
            onPress={handleGalleryPick}
          >
            <View style={[styles.optionIcon, { backgroundColor: '#10b981' }]}>
              <Ionicons name="images" size={32} color="white" />
            </View>
            <Text style={[styles.optionText, { color: colors.text }]}>Gallery</Text>
            <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
              Choose from {allowMultiple ? 'photos' : 'a photo'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderCamera = () => (
    <CameraCapture
      onPhotoCapture={handleCameraCapture}
      onClose={handleBackToMenu}
      enableVideo={enableVideo}
      onVideoStop={handleCameraCapture}
    />
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      {mode === 'menu' && renderMenu()}
      {mode === 'camera' && renderCamera()}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  options: {
    padding: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionText: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  optionDescription: {
    fontSize: 14,
    marginTop: 2,
  },
});