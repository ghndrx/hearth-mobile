import { Camera } from 'expo-camera';
import type { CameraType, CameraCapturedPicture, FlashMode } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { PermissionStatus } from 'expo-modules-core';

// Create enum-like constants for camera types and flash modes
export const CameraTypeEnum = {
  front: 'front' as CameraType,
  back: 'back' as CameraType,
};

export const FlashModeEnum = {
  off: 'off' as FlashMode,
  on: 'on' as FlashMode,
  auto: 'auto' as FlashMode,
};

export interface CameraPermissionState {
  cameraGranted: boolean;
  microphoneGranted: boolean;
  mediaLibraryGranted: boolean;
  canAskAgain: boolean;
}

export interface CapturedMedia {
  uri: string;
  type: 'photo' | 'video';
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
  duration?: number; // For videos
}

export interface VideoRecordingOptions {
  quality?: string;
  maxDuration?: number; // in seconds
  mute?: boolean;
}

/**
 * Camera service for handling camera operations, permissions, and media capture
 */
export class CameraService {
  private static instance: CameraService | null = null;
  private _flashMode: FlashMode = FlashModeEnum.off;
  private _cameraType: CameraType = CameraTypeEnum.back;

  private constructor() {}

  static getInstance(): CameraService {
    if (!CameraService.instance) {
      CameraService.instance = new CameraService();
    }
    return CameraService.instance;
  }

  get flashMode(): FlashMode {
    return this._flashMode;
  }

  get cameraType(): CameraType {
    return this._cameraType;
  }

  /**
   * Request all necessary camera permissions
   */
  async requestAllPermissions(): Promise<CameraPermissionState> {
    const [cameraPermission, microphonePermission, mediaLibraryPermission] = await Promise.all([
      Camera.requestCameraPermissionsAsync(),
      Camera.requestMicrophonePermissionsAsync(),
      MediaLibrary.requestPermissionsAsync(),
    ]);

    return {
      cameraGranted: cameraPermission.status === PermissionStatus.GRANTED,
      microphoneGranted: microphonePermission.status === PermissionStatus.GRANTED,
      mediaLibraryGranted: mediaLibraryPermission.status === PermissionStatus.GRANTED,
      canAskAgain:
        cameraPermission.canAskAgain ||
        microphonePermission.canAskAgain ||
        mediaLibraryPermission.canAskAgain,
    };
  }

  /**
   * Check current permission status
   */
  async getPermissionStatus(): Promise<CameraPermissionState> {
    const [cameraPermission, microphonePermission, mediaLibraryPermission] = await Promise.all([
      Camera.getCameraPermissionsAsync(),
      Camera.getMicrophonePermissionsAsync(),
      MediaLibrary.getPermissionsAsync(),
    ]);

    return {
      cameraGranted: cameraPermission.status === PermissionStatus.GRANTED,
      microphoneGranted: microphonePermission.status === PermissionStatus.GRANTED,
      mediaLibraryGranted: mediaLibraryPermission.status === PermissionStatus.GRANTED,
      canAskAgain:
        cameraPermission.canAskAgain ||
        microphonePermission.canAskAgain ||
        mediaLibraryPermission.canAskAgain,
    };
  }

  /**
   * Toggle flash mode between off, on, and auto
   */
  toggleFlashMode(): FlashMode {
    const modes = [FlashModeEnum.off, FlashModeEnum.on, FlashModeEnum.auto];
    const currentIndex = modes.indexOf(this._flashMode);
    this._flashMode = modes[(currentIndex + 1) % modes.length];
    return this._flashMode;
  }

  /**
   * Set flash mode
   */
  setFlashMode(mode: FlashMode): void {
    this._flashMode = mode;
  }

  /**
   * Toggle between front and back camera
   */
  toggleCameraType(): CameraType {
    this._cameraType =
      this._cameraType === CameraTypeEnum.back ? CameraTypeEnum.front : CameraTypeEnum.back;
    return this._cameraType;
  }

  /**
   * Set camera type
   */
  setCameraType(type: CameraType): void {
    this._cameraType = type;
  }

  /**
   * Capture a photo using the camera reference
   */
  async capturePhoto(cameraRef: any): Promise<CapturedMedia> {
    if (!cameraRef) {
      throw new Error('Camera reference is required for capturing photo');
    }

    try {
      const photo: CameraCapturedPicture = await cameraRef.takePictureAsync({
        quality: 0.8,
        base64: false,
        exif: false,
      });

      // Get file info to determine size and dimensions
      const fileInfo = await FileSystem.getInfoAsync(photo.uri);

      return {
        uri: photo.uri,
        type: 'photo',
        width: photo.width,
        height: photo.height,
        fileSize: (fileInfo as any).size || 0,
        mimeType: 'image/jpeg',
      };
    } catch (error) {
      console.error('Failed to capture photo:', error);
      throw new Error(`Failed to capture photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Start video recording
   */
  async startVideoRecording(
    cameraRef: any,
    options: VideoRecordingOptions = {}
  ): Promise<void> {
    if (!cameraRef) {
      throw new Error('Camera reference is required for video recording');
    }

    try {
      const recordingOptions = {
        quality: options.quality || 'high',
        maxDuration: options.maxDuration || 60, // Default 60 seconds
        mute: options.mute || false,
      };

      await cameraRef.recordAsync(recordingOptions);
    } catch (error) {
      console.error('Failed to start video recording:', error);
      throw new Error(`Failed to start video recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stop video recording
   */
  async stopVideoRecording(cameraRef: any): Promise<CapturedMedia> {
    if (!cameraRef) {
      throw new Error('Camera reference is required for stopping video recording');
    }

    try {
      const video = await cameraRef.stopRecording();

      // Get file info to determine size
      const fileInfo = await FileSystem.getInfoAsync(video.uri);

      return {
        uri: video.uri,
        type: 'video',
        width: 0, // Video dimensions aren't immediately available
        height: 0,
        fileSize: (fileInfo as any).size || 0,
        mimeType: 'video/mp4',
        duration: 0, // Duration isn't immediately available
      };
    } catch (error) {
      console.error('Failed to stop video recording:', error);
      throw new Error(`Failed to stop video recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save media to device's media library
   */
  async saveToMediaLibrary(uri: string, type: 'photo' | 'video'): Promise<string> {
    try {
      const permissions = await this.getPermissionStatus();

      if (!permissions.mediaLibraryGranted) {
        throw new Error('Media library permission not granted');
      }

      const asset = await MediaLibrary.createAssetAsync(uri);

      // Optionally create/add to a custom album
      const albumName = 'Hearth';
      const album = await MediaLibrary.getAlbumAsync(albumName);

      if (album) {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      } else {
        await MediaLibrary.createAlbumAsync(albumName, asset, false);
      }

      return asset.id;
    } catch (error) {
      console.error('Failed to save media to library:', error);
      throw new Error(`Failed to save media to library: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete temporary media file
   */
  async deleteTempFile(uri: string): Promise<void> {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch (error) {
      console.warn('Failed to delete temporary file:', error);
      // Don't throw error for cleanup failures
    }
  }

  /**
   * Get available camera types (front/back)
   */
  async getAvailableCameraTypes(): Promise<CameraType[]> {
    try {
      return [CameraTypeEnum.front, CameraTypeEnum.back];
    } catch (error) {
      console.error('Failed to get available camera types:', error);
      return [CameraTypeEnum.back]; // Fallback to back camera
    }
  }

  /**
   * Reset camera settings to defaults
   */
  reset(): void {
    this._flashMode = FlashModeEnum.off;
    this._cameraType = CameraTypeEnum.back;
  }
}

// Export singleton instance
export const cameraService = CameraService.getInstance();