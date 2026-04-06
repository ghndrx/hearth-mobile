import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { CameraCapture } from './CameraCapture';
import { CaptureUploadSession } from '../../services/CameraCaptureUploadService';
import { cameraService } from '../../services/CameraService';

interface MediaPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onMediaSelected: (session: CaptureUploadSession) => void;
  onError?: (error: string) => void;
  allowedTypes?: 'photos' | 'videos' | 'all';
  title?: string;
  showCamera?: boolean;
  showLibrary?: boolean;
}

type PickerMode = 'menu' | 'camera-photo' | 'camera-video';

export function MediaPickerModal({
  visible,
  onClose,
  onMediaSelected,
  onError,
  allowedTypes = 'all',
  title = 'Select Media',
  showCamera = true,
  showLibrary = true,
}: MediaPickerModalProps) {
  const [mode, setMode] = useState<PickerMode>('menu');

  const handleClose = () => {
    setMode('menu');
    onClose();
  };

  const handleError = (message: string) => {
    console.error('MediaPicker error:', message);
    onError?.(message);
    Alert.alert('Error', message);
  };

  const handleCameraPhoto = async () => {
    try {
      const permissions = await cameraService.getPermissionStatus();
      if (!permissions.cameraGranted) {
        const newPermissions = await cameraService.requestAllPermissions();
        if (!newPermissions.cameraGranted) {
          handleError('Camera permission is required to take photos');
          return;
        }
      }
      setMode('camera-photo');
    } catch (error) {
      handleError(`Failed to access camera: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCameraVideo = async () => {
    try {
      const permissions = await cameraService.getPermissionStatus();
      if (!permissions.cameraGranted || !permissions.microphoneGranted) {
        const newPermissions = await cameraService.requestAllPermissions();
        if (!newPermissions.cameraGranted || !newPermissions.microphoneGranted) {
          handleError('Camera and microphone permissions are required to record videos');
          return;
        }
      }
      setMode('camera-video');
    } catch (error) {
      handleError(`Failed to access camera: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handlePhotoLibrary = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.status !== 'granted') {
        handleError('Photo library permission is required to select images');
        return;
      }

      const mediaTypes = allowedTypes === 'photos'
        ? ImagePicker.MediaTypeOptions.Images
        : allowedTypes === 'videos'
        ? ImagePicker.MediaTypeOptions.Videos
        : ImagePicker.MediaTypeOptions.All;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        // Create a mock upload session for library selections
        const mockSession: CaptureUploadSession = {
          id: `library_${Date.now()}`,
          media: {
            uri: asset.uri,
            type: asset.type === 'video' ? 'video' : 'photo',
            width: asset.width || 0,
            height: asset.height || 0,
            fileSize: asset.fileSize || 0,
            mimeType: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
            duration: asset.duration || 0,
          },
          state: 'completed',
          progress: { loaded: 100, total: 100, percentage: 100 },
          startedAt: new Date(),
          completedAt: new Date(),
        };

        onMediaSelected(mockSession);
        handleClose();
      }
    } catch (error) {
      handleError(`Failed to access photo library: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleMediaCaptured = (session: CaptureUploadSession) => {
    onMediaSelected(session);
    handleClose();
  };

  const handleCameraClose = () => {
    setMode('menu');
  };

  const renderMenu = () => (
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.optionsContainer}>
          {showCamera && (
            <>
              {(allowedTypes === 'photos' || allowedTypes === 'all') && (
                <TouchableOpacity style={styles.option} onPress={handleCameraPhoto}>
                  <View style={styles.optionIcon}>
                    <Ionicons name="camera" size={32} color="#007AFF" />
                  </View>
                  <Text style={styles.optionText}>Take Photo</Text>
                  <Text style={styles.optionDescription}>Use your camera to take a new photo</Text>
                </TouchableOpacity>
              )}

              {(allowedTypes === 'videos' || allowedTypes === 'all') && (
                <TouchableOpacity style={styles.option} onPress={handleCameraVideo}>
                  <View style={styles.optionIcon}>
                    <Ionicons name="videocam" size={32} color="#007AFF" />
                  </View>
                  <Text style={styles.optionText}>Record Video</Text>
                  <Text style={styles.optionDescription}>Use your camera to record a new video</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {showLibrary && (
            <TouchableOpacity style={styles.option} onPress={handlePhotoLibrary}>
              <View style={styles.optionIcon}>
                <Ionicons name="images" size={32} color="#007AFF" />
              </View>
              <Text style={styles.optionText}>
                {allowedTypes === 'photos'
                  ? 'Photo Library'
                  : allowedTypes === 'videos'
                  ? 'Video Library'
                  : 'Photo & Video Library'
                }
              </Text>
              <Text style={styles.optionDescription}>
                Choose from your saved {allowedTypes === 'photos' ? 'photos' : allowedTypes === 'videos' ? 'videos' : 'media'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCamera = () => (
    <CameraCapture
      mode={mode === 'camera-video' ? 'video' : 'photo'}
      onClose={handleCameraClose}
      onMediaCaptured={handleMediaCaptured}
      onError={handleError}
    />
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        {mode === 'menu' ? renderMenu() : renderCamera()}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 34, // Safe area padding
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  optionsContainer: {
    paddingTop: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    flex: 2,
    marginTop: 2,
  },
  cancelButton: {
    marginTop: 20,
    marginHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
});