import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { CameraView } from 'expo-camera';
import type { CameraType, FlashMode } from 'expo-camera';

// Import the enums from the service
const FlashModeEnum = {
  off: 'off' as FlashMode,
  on: 'on' as FlashMode,
  auto: 'auto' as FlashMode,
};

const CameraTypeEnum = {
  front: 'front' as CameraType,
  back: 'back' as CameraType,
};
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { cameraService, CameraPermissionState, CapturedMedia } from '../../services/CameraService';
import { cameraCaptureUploadService, CaptureUploadSession } from '../../services/CameraCaptureUploadService';

interface CameraCaptureProps {
  onClose: () => void;
  onMediaCaptured: (session: CaptureUploadSession) => void;
  onError?: (error: string) => void;
  mode?: 'photo' | 'video';
  autoUpload?: boolean;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export function CameraCapture({
  onClose,
  onMediaCaptured,
  onError,
  mode = 'photo',
  autoUpload = true,
}: CameraCaptureProps) {
  const cameraRef = useRef<any>(null);
  const [permissions, setPermissions] = useState<CameraPermissionState | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flashMode, setFlashMode] = useState<FlashMode>(FlashModeEnum.off);
  const [cameraType, setCameraType] = useState<CameraType>(CameraTypeEnum.back);
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);

  // Request permissions on mount
  useEffect(() => {
    checkPermissions();
  }, []);

  // Handle recording timer
  useEffect(() => {
    if (isRecording) {
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }
      setRecordingDuration(0);
    }

    return () => {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    };
  }, [isRecording]);

  // Reset camera state when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      setIsRecording(false);
      setRecordingDuration(0);
      setIsCapturing(false);

      return () => {
        if (recordingTimer.current) {
          clearInterval(recordingTimer.current);
        }
      };
    }, [])
  );

  const checkPermissions = async () => {
    try {
      let currentPermissions = await cameraService.getPermissionStatus();

      if (!currentPermissions.cameraGranted) {
        currentPermissions = await cameraService.requestAllPermissions();
      }

      setPermissions(currentPermissions);

      if (!currentPermissions.cameraGranted) {
        handleError('Camera permission is required to capture media');
      }
    } catch (error) {
      handleError(`Failed to check permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleError = (message: string) => {
    console.error('Camera error:', message);
    onError?.(message);
    Alert.alert('Camera Error', message);
  };

  const handleCapturePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    try {
      if (autoUpload) {
        const session = await cameraCaptureUploadService.capturePhotoAndUpload(cameraRef.current);
        onMediaCaptured(session);
      } else {
        const media = await cameraService.capturePhoto(cameraRef.current);
        // Create a mock session for non-upload mode
        const mockSession: CaptureUploadSession = {
          id: `mock_${Date.now()}`,
          media,
          state: 'completed',
          progress: { loaded: 100, total: 100, percentage: 100 },
          startedAt: new Date(),
          completedAt: new Date(),
        };
        onMediaCaptured(mockSession);
      }
    } catch (error) {
      handleError(`Failed to capture photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleStartVideoRecording = async () => {
    if (!cameraRef.current || isRecording) return;

    try {
      setIsRecording(true);
      await cameraService.startVideoRecording(cameraRef.current, {
        maxDuration: 60, // 60 seconds max
        quality: 'high',
      });
    } catch (error) {
      setIsRecording(false);
      handleError(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleStopVideoRecording = async () => {
    if (!cameraRef.current || !isRecording) return;

    setIsRecording(false);
    try {
      if (autoUpload) {
        const media = await cameraService.stopVideoRecording(cameraRef.current);
        // Create upload session manually since recordVideoAndUpload is complex
        const session = (cameraCaptureUploadService as any)['createUploadSession'](media);
        // Enable video compression with medium quality preset
        await cameraCaptureUploadService.startUpload(session.id, {
          compressVideo: true,
          videoQuality: 'medium',
          maxVideoDuration: 60,
        });
        onMediaCaptured(session);
      } else {
        const media = await cameraService.stopVideoRecording(cameraRef.current);
        // Create a mock session for non-upload mode
        const mockSession: CaptureUploadSession = {
          id: `mock_${Date.now()}`,
          media,
          state: 'completed',
          progress: { loaded: 100, total: 100, percentage: 100 },
          startedAt: new Date(),
          completedAt: new Date(),
        };
        onMediaCaptured(mockSession);
      }
    } catch (error) {
      handleError(`Failed to stop recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const toggleFlash = () => {
    const newFlashMode = cameraService.toggleFlashMode();
    setFlashMode(newFlashMode);
  };

  const toggleCamera = () => {
    const newCameraType = cameraService.toggleCameraType();
    setCameraType(newCameraType);
  };

  const getFlashIcon = () => {
    switch (flashMode) {
      case FlashModeEnum.on:
        return 'flash';
      case FlashModeEnum.auto:
        return 'flash-off';
      default:
        return 'flash-off';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!permissions) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Checking permissions...</Text>
      </View>
    );
  }

  if (!permissions.cameraGranted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <View style={styles.permissionContent}>
          <Ionicons name="camera-outline" size={80} color="#666" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionDescription}>
            To capture photos and videos, please grant camera permission in your device settings.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={checkPermissions}>
            <Text style={styles.permissionButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={cameraType}
        flash={flashMode}
        mode={mode === 'photo' ? 'picture' : 'video'}
      />

      {/* Top controls */}
      <SafeAreaView style={styles.topControls}>
        <TouchableOpacity style={styles.controlButton} onPress={onClose}>
          <Ionicons name="close" size={30} color="white" />
        </TouchableOpacity>

        <View style={styles.topRightControls}>
          <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
            <Ionicons name={getFlashIcon()} size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={toggleCamera}>
            <Ionicons name="camera-reverse-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Recording indicator */}
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>REC {formatDuration(recordingDuration)}</Text>
        </View>
      )}

      {/* Bottom controls */}
      <View style={styles.bottomControls}>
        {mode === 'photo' ? (
          <TouchableOpacity
            style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
            onPress={handleCapturePhoto}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <View style={styles.captureButtonInner} />
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.captureButton,
              isRecording ? styles.recordingButton : styles.videoButton,
            ]}
            onPress={isRecording ? handleStopVideoRecording : handleStartVideoRecording}
          >
            <View
              style={[
                styles.captureButtonInner,
                isRecording ? styles.recordingButtonInner : styles.videoButtonInner,
              ]}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  loadingText: {
    color: 'white',
    marginTop: 16,
    fontSize: 16,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  permissionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  permissionDescription: {
    color: '#999',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  closeButtonText: {
    color: '#999',
    fontSize: 16,
  },
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    zIndex: 1,
  },
  topRightControls: {
    flexDirection: 'row',
    gap: 16,
  },
  controlButton: {
    padding: 8,
  },
  recordingIndicator: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 1,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    marginRight: 8,
  },
  recordingText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 40,
    paddingTop: 20,
    zIndex: 1,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  videoButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  videoButtonInner: {
    backgroundColor: 'red',
  },
  recordingButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
  },
  recordingButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'white',
  },
});