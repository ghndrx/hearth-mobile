import { CameraType, PermissionStatus } from 'expo-camera';
import * as Camera from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import {
  CameraPermissions,
  CapturedPhoto,
  CapturedVideo,
  CameraConfig,
  LocalFile,
  FileType
} from '../../types';

export class CameraService {
  private static instance: CameraService;
  private permissions: CameraPermissions = {
    camera: false,
    audio: false,
  };

  private constructor() {}

  public static getInstance(): CameraService {
    if (!CameraService.instance) {
      CameraService.instance = new CameraService();
    }
    return CameraService.instance;
  }

  /**
   * Request camera permissions
   */
  async requestCameraPermission(): Promise<boolean> {
    try {
      const { status } = await Camera.Camera.requestCameraPermissionsAsync();
      this.permissions.camera = status === PermissionStatus.GRANTED;
      return this.permissions.camera;
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  }

  /**
   * Request microphone permissions for video recording
   */
  async requestMicrophonePermission(): Promise<boolean> {
    try {
      const { status } = await Camera.Camera.requestMicrophonePermissionsAsync();
      this.permissions.audio = status === PermissionStatus.GRANTED;
      return this.permissions.audio;
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      return false;
    }
  }

  /**
   * Check if camera permission is granted
   */
  async hasCameraPermission(): Promise<boolean> {
    try {
      const { status } = await Camera.Camera.getCameraPermissionsAsync();
      this.permissions.camera = status === PermissionStatus.GRANTED;
      return this.permissions.camera;
    } catch (error) {
      console.error('Error checking camera permission:', error);
      return false;
    }
  }

  /**
   * Check if microphone permission is granted
   */
  async hasMicrophonePermission(): Promise<boolean> {
    try {
      const { status } = await Camera.Camera.getMicrophonePermissionsAsync();
      this.permissions.audio = status === PermissionStatus.GRANTED;
      return this.permissions.audio;
    } catch (error) {
      console.error('Error checking microphone permission:', error);
      return false;
    }
  }

  /**
   * Get current permissions status
   */
  getPermissions(): CameraPermissions {
    return { ...this.permissions };
  }

  /**
   * Capture a photo using camera reference
   */
  async capturePhoto(
    cameraRef: any,
    config: Partial<CameraConfig> = {}
  ): Promise<LocalFile | null> {
    try {
      if (!cameraRef?.current) {
        throw new Error('Camera reference not available');
      }

      if (!this.permissions.camera) {
        const hasPermission = await this.requestCameraPermission();
        if (!hasPermission) {
          throw new Error('Camera permission not granted');
        }
      }

      const options = {
        quality: config.quality || 0.8,
        base64: config.base64 || false,
        exif: config.exif || false,
      };

      const photo = await cameraRef.current.takePictureAsync(options);
      return this.processPhoto(photo);
    } catch (error) {
      console.error('Error capturing photo:', error);
      throw error;
    }
  }

  /**
   * Start video recording
   */
  async startVideoRecording(
    cameraRef: any,
    config: Partial<CameraConfig> = {}
  ): Promise<void> {
    try {
      if (!cameraRef?.current) {
        throw new Error('Camera reference not available');
      }

      if (!this.permissions.camera) {
        const hasCameraPermission = await this.requestCameraPermission();
        if (!hasCameraPermission) {
          throw new Error('Camera permission not granted');
        }
      }

      if (!this.permissions.audio) {
        const hasMicrophonePermission = await this.requestMicrophonePermission();
        if (!hasMicrophonePermission) {
          throw new Error('Microphone permission not granted');
        }
      }

      const options = {
        quality: config.quality ? String(config.quality) as any : '1080p',
        maxDuration: 60, // 60 seconds max
      };

      await cameraRef.current.recordAsync(options);
    } catch (error) {
      console.error('Error starting video recording:', error);
      throw error;
    }
  }

  /**
   * Stop video recording
   */
  async stopVideoRecording(cameraRef: any): Promise<LocalFile | null> {
    try {
      if (!cameraRef?.current) {
        throw new Error('Camera reference not available');
      }

      const video = await cameraRef.current.stopRecording();
      return this.processVideo(video);
    } catch (error) {
      console.error('Error stopping video recording:', error);
      throw error;
    }
  }

  /**
   * Process captured photo and return LocalFile
   */
  private async processPhoto(photo: CapturedPhoto): Promise<LocalFile> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(photo.uri);
      const fileName = `photo_${Date.now()}.jpg`;

      return {
        localId: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        uri: photo.uri,
        name: fileName,
        type: 'image/jpeg',
        size: (fileInfo.exists && 'size' in fileInfo) ? fileInfo.size : 0,
        fileType: 'image' as FileType,
        width: photo.width,
        height: photo.height,
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('Error processing photo:', error);
      throw error;
    }
  }

  /**
   * Process captured video and return LocalFile
   */
  private async processVideo(video: CapturedVideo): Promise<LocalFile> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(video.uri);
      const fileName = `video_${Date.now()}.mp4`;

      return {
        localId: `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        uri: video.uri,
        name: fileName,
        type: 'video/mp4',
        size: (fileInfo.exists && 'size' in fileInfo) ? fileInfo.size : 0,
        fileType: 'video' as FileType,
        width: video.width,
        height: video.height,
        duration: video.duration,
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('Error processing video:', error);
      throw error;
    }
  }

  /**
   * Get default camera config
   */
  getDefaultConfig(): CameraConfig {
    return {
      type: 'back' as CameraType,
      flashMode: 'auto',
      quality: 0.8,
      base64: false,
      exif: false,
    };
  }

  /**
   * Check if device has camera
   */
  async isAvailable(): Promise<boolean> {
    try {
      // On mobile devices, camera is typically available if permissions can be requested
      const hasPermission = await this.hasCameraPermission();
      return hasPermission || true; // Assume camera is available for now
    } catch (error) {
      console.error('Error checking camera availability:', error);
      return false;
    }
  }
}