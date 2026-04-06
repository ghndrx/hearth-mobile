import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  useColorScheme,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { CameraCaptureUploadService } from '../../lib/services/camera';
import { LocalFile, UploadProgressEvent, UploadResponse } from '../../lib/types';

interface CameraCaptureProps {
  onPhotoCapture: (photo: LocalFile, uploadId?: string) => void;
  onClose: () => void;
  onVideoStart?: () => void;
  onVideoStop?: (video: LocalFile, uploadId?: string) => void;
  enableVideo?: boolean;
  enableUpload?: boolean;
  onUploadProgress?: (event: UploadProgressEvent) => void;
  onUploadComplete?: (uploadId: string, response: UploadResponse) => void;
  onUploadError?: (uploadId: string, error: string) => void;
}

export default function CameraCapture({
  onPhotoCapture,
  onClose,
  onVideoStart,
  onVideoStop,
  enableVideo = false,
  enableUpload = true,
  onUploadProgress,
  onUploadComplete,
  onUploadError,
}: CameraCaptureProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [flashMode, setFlashMode] = useState<'on' | 'off' | 'auto'>('auto');
  const [isRecording, setIsRecording] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const cameraRef = useRef<CameraView>(null);
  const cameraService = CameraCaptureUploadService.getInstance();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    requestPermissions();

    // Setup upload listeners
    const removeListener = cameraService.addListener({
      onUploadProgress: (event: UploadProgressEvent) => {
        setUploadProgress(event.progress);
        onUploadProgress?.(event);
      },
      onUploadComplete: (uploadId: string, response: UploadResponse) => {
        setIsUploading(false);
        setUploadProgress(0);
        onUploadComplete?.(uploadId, response);
      },
      onUploadError: (uploadId: string, error: string) => {
        setIsUploading(false);
        setUploadProgress(0);
        onUploadError?.(uploadId, error);
      },
    });

    return removeListener;
  }, [onUploadProgress, onUploadComplete, onUploadError]);

  const requestPermissions = async () => {
    try {
      const permissionsGranted = await cameraService.requestPermissions();
      setHasPermission(permissionsGranted);
    } catch (error) {
      console.error('Permission error:', error);
      Alert.alert('Permission Error', 'Failed to get camera permissions');
      setHasPermission(false);
    }
  };

  const capturePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      if (enableUpload) {
        setIsUploading(true);
      }

      const result = await cameraService.capturePhotoAndUpload(cameraRef, {
        quality: 0.8,
        base64: false,
        exif: false,
        uploadImmediately: enableUpload,
      });

      if (result.localFile) {
        onPhotoCapture(result.localFile, result.uploadId);
      }
    } catch (error) {
      console.error('Photo capture error:', error);
      Alert.alert('Capture Error', 'Failed to capture photo');
      setIsUploading(false);
    } finally {
      setIsCapturing(false);
    }
  };

  const startVideoRecording = async () => {
    if (!cameraRef.current || isRecording) return;

    try {
      setIsRecording(true);
      onVideoStart?.();
      await cameraService.startVideoRecording(cameraRef, {
        quality: 0.8,
      });
    } catch (error) {
      console.error('Video start error:', error);
      Alert.alert('Recording Error', 'Failed to start video recording');
      setIsRecording(false);
    }
  };

  const stopVideoRecording = async () => {
    if (!cameraRef.current || !isRecording) return;

    try {
      if (enableUpload) {
        setIsUploading(true);
      }

      const result = await cameraService.stopVideoRecordingAndUpload(cameraRef, {
        quality: 0.8,
        uploadImmediately: enableUpload,
      });

      setIsRecording(false);

      if (result.localFile && onVideoStop) {
        onVideoStop(result.localFile, result.uploadId);
      }
    } catch (error) {
      console.error('Video stop error:', error);
      Alert.alert('Recording Error', 'Failed to stop video recording');
      setIsRecording(false);
      setIsUploading(false);
    }
  };

  const toggleCameraType = () => {
    setCameraType((current: CameraType) =>
      current === 'back' ? 'front' : 'back'
    );
  };

  const toggleFlashMode = () => {
    setFlashMode(current => {
      switch (current) {
        case 'off': return 'auto';
        case 'auto': return 'on';
        case 'on': return 'off';
        default: return 'auto';
      }
    });
  };

  if (hasPermission === null) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: isDark ? '#1e1f22' : '#ffffff' }]}>
        <Text style={[styles.message, { color: isDark ? '#ffffff' : '#000000' }]}>
          Requesting camera permissions...
        </Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: isDark ? '#1e1f22' : '#ffffff' }]}>
        <Ionicons
          name="camera-outline"
          size={64}
          color={isDark ? '#949ba4' : '#6b7280'}
        />
        <Text style={[styles.message, { color: isDark ? '#ffffff' : '#000000' }]}>
          Camera permission not granted
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#5865f2' }]}
          onPress={requestPermissions}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={cameraType}
        flash={flashMode}
      >
        {/* Header Controls */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={onClose}>
            <Ionicons name="close" size={32} color="white" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerButton} onPress={toggleFlashMode}>
            <Ionicons
              name={
                flashMode === 'on' ? 'flash' :
                flashMode === 'auto' ? 'flash-outline' :
                'flash-off'
              }
              size={32}
              color="white"
            />
          </TouchableOpacity>
        </View>

        {/* Footer Controls */}
        <View style={styles.footer}>
          <View style={styles.controls}>
            {/* Gallery Button (placeholder) */}
            <TouchableOpacity style={styles.sideButton}>
              <Ionicons name="images-outline" size={32} color="white" />
            </TouchableOpacity>

            {/* Capture Button */}
            <TouchableOpacity
              style={[
                styles.captureButton,
                isRecording && styles.recordingButton,
                isCapturing && styles.capturingButton,
              ]}
              onPress={enableVideo && isRecording ? stopVideoRecording : capturePhoto}
              onLongPress={enableVideo ? startVideoRecording : undefined}
              disabled={isCapturing}
            >
              {isRecording ? (
                <Ionicons name="stop" size={32} color="white" />
              ) : (
                <View style={styles.captureInner} />
              )}
            </TouchableOpacity>

            {/* Camera Flip Button */}
            <TouchableOpacity style={styles.sideButton} onPress={toggleCameraType}>
              <Ionicons name="camera-reverse-outline" size={32} color="white" />
            </TouchableOpacity>
          </View>

          {enableVideo && !isUploading && (
            <Text style={styles.hint}>
              {isRecording ? 'Tap to stop recording' : 'Tap for photo, hold for video'}
            </Text>
          )}

          {/* Upload Progress Indicator */}
          {isUploading && (
            <View style={styles.uploadProgress}>
              <Text style={styles.uploadText}>
                Uploading... {Math.round(uploadProgress)}%
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${uploadProgress}%` }
                  ]}
                />
              </View>
            </View>
          )}
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  camera: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sideButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  recordingButton: {
    backgroundColor: '#ff4757',
    borderColor: '#ff4757',
  },
  capturingButton: {
    opacity: 0.7,
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'white',
  },
  hint: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
    opacity: 0.8,
  },
  message: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadProgress: {
    alignItems: 'center',
    marginTop: 8,
  },
  uploadText: {
    color: 'white',
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.9,
  },
  progressBar: {
    width: '60%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#5865f2',
    borderRadius: 2,
  },
});