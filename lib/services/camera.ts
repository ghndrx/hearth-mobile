/**
 * Camera Service - MS-002
 * Centralized service for camera operations matching PRD specifications
 * Provides photo/video capture, library access, and permission management
 */

import * as ImagePicker from 'expo-image-picker';
import { mediaService, type MediaAsset } from './media';
import { imageProcessingService, type CompressionOptions } from './imageProcessing';

export interface CameraOptions {
  quality?: number;
  allowsEditing?: boolean;
  aspect?: [number, number];
  compression?: CompressionOptions;
  flash?: 'off' | 'on' | 'auto';
  timer?: 0 | 3 | 10;
}

export interface VideoOptions {
  quality?: number;
  maxDuration?: number;
  allowsEditing?: boolean;
  compression?: boolean;
}

export interface LibraryOptions {
  allowsMultiple?: boolean;
  mediaType?: 'images' | 'videos' | 'all';
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  selectionLimit?: number;
}

export interface CameraPermissions {
  camera: boolean;
  mediaLibrary: boolean;
  canAskAgain: boolean;
}

export interface CaptureResult extends MediaAsset {
  compressed?: boolean;
  originalSize?: number;
  compressionRatio?: number;
}

/**
 * Camera Service for MS-002 Implementation
 * Provides high-level camera operations and integrates with existing services
 */
export class CameraService {
  /**
   * Request all necessary camera permissions
   */
  async requestPermissions(): Promise<CameraPermissions> {
    try {
      const [cameraStatus, libraryStatus] = await Promise.all([
        ImagePicker.requestCameraPermissionsAsync(),
        ImagePicker.requestMediaLibraryPermissionsAsync(),
      ]);

      return {
        camera: cameraStatus.status === 'granted',
        mediaLibrary: libraryStatus.status === 'granted',
        canAskAgain: cameraStatus.canAskAgain && libraryStatus.canAskAgain,
      };
    } catch (error) {
      console.error('Failed to request camera permissions:', error);
      return {
        camera: false,
        mediaLibrary: false,
        canAskAgain: false,
      };
    }
  }

  /**
   * Check current camera permissions status
   */
  async getPermissions(): Promise<CameraPermissions> {
    try {
      const [cameraStatus, libraryStatus] = await Promise.all([
        ImagePicker.getCameraPermissionsAsync(),
        ImagePicker.getMediaLibraryPermissionsAsync(),
      ]);

      return {
        camera: cameraStatus.status === 'granted',
        mediaLibrary: libraryStatus.status === 'granted',
        canAskAgain: cameraStatus.canAskAgain && libraryStatus.canAskAgain,
      };
    } catch (error) {
      console.error('Failed to get camera permissions:', error);
      return {
        camera: false,
        mediaLibrary: false,
        canAskAgain: false,
      };
    }
  }

  /**
   * Take a picture with the camera
   */
  async takePicture(options: CameraOptions = {}): Promise<CaptureResult> {
    // Check camera permission
    const permissions = await this.getPermissions();
    if (!permissions.camera) {
      const requested = await this.requestPermissions();
      if (!requested.camera) {
        throw new Error('Camera permission not granted');
      }
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options.allowsEditing ?? false,
        aspect: options.aspect,
        quality: options.quality ?? 0.9,
        base64: false,
      });

      if (result.canceled || result.assets.length === 0) {
        throw new Error('Photo capture was cancelled');
      }

      const asset = result.assets[0];
      const mediaAsset = await this.processImageAsset(asset);

      // Apply compression if requested
      let finalAsset = mediaAsset;
      let compressed = false;
      let compressionRatio = 1;

      if (options.compression) {
        const compressionResult = await imageProcessingService.compressImage(
          asset.uri,
          options.compression
        );

        finalAsset = {
          ...mediaAsset,
          uri: compressionResult.uri,
          fileSize: compressionResult.fileSize,
          width: compressionResult.width,
          height: compressionResult.height,
        };

        compressed = true;
        compressionRatio = compressionResult.compressionRatio;
      }

      return {
        ...finalAsset,
        compressed,
        originalSize: mediaAsset.fileSize,
        compressionRatio,
      };
    } catch (error) {
      console.error('Failed to take picture:', error);
      throw new Error(`Photo capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Record a video with the camera
   */
  async recordVideo(options: VideoOptions = {}): Promise<CaptureResult> {
    // Check camera permission
    const permissions = await this.getPermissions();
    if (!permissions.camera) {
      const requested = await this.requestPermissions();
      if (!requested.camera) {
        throw new Error('Camera permission not granted');
      }
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: options.allowsEditing ?? false,
        quality: options.quality ?? 0.8,
        videoMaxDuration: options.maxDuration ?? 60,
        base64: false,
      });

      if (result.canceled || result.assets.length === 0) {
        throw new Error('Video capture was cancelled');
      }

      const asset = result.assets[0];
      const mediaAsset = await this.processVideoAsset(asset);

      return {
        ...mediaAsset,
        compressed: false, // Video compression would be handled separately
        originalSize: mediaAsset.fileSize,
        compressionRatio: 1,
      };
    } catch (error) {
      console.error('Failed to record video:', error);
      throw new Error(`Video capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Pick media from the device library
   */
  async pickFromLibrary(options: LibraryOptions = {}): Promise<MediaAsset[]> {
    // Check media library permission
    const permissions = await this.getPermissions();
    if (!permissions.mediaLibrary) {
      const requested = await this.requestPermissions();
      if (!requested.mediaLibrary) {
        throw new Error('Media library permission not granted');
      }
    }

    try {
      const mediaTypes = this.getImagePickerMediaType(options.mediaType);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        allowsMultipleSelection: options.allowsMultiple ?? false,
        quality: options.quality ?? 0.9,
        selectionLimit: options.selectionLimit ?? 10,
        base64: false,
      });

      if (result.canceled) {
        return [];
      }

      // Process each selected asset
      const processedAssets: MediaAsset[] = [];
      for (const asset of result.assets) {
        if (asset.type === 'video') {
          processedAssets.push(await this.processVideoAsset(asset));
        } else {
          processedAssets.push(await this.processImageAsset(asset));
        }
      }

      return processedAssets;
    } catch (error) {
      console.error('Failed to pick from library:', error);
      throw new Error(`Library pick failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Launch camera for quick capture (used by QuickCaptureFab)
   */
  async quickCapture(type: 'photo' | 'video' = 'photo'): Promise<MediaAsset | null> {
    try {
      if (type === 'photo') {
        return await this.takePicture({ quality: 0.8 });
      } else {
        return await this.recordVideo({ maxDuration: 30 });
      }
    } catch (error) {
      console.warn('Quick capture failed:', error);
      return null;
    }
  }

  /**
   * Get camera capabilities and features
   */
  async getCameraFeatures(): Promise<{
    hasFlash: boolean;
    hasFrontCamera: boolean;
    hasBackCamera: boolean;
    supportedAspectRatios: Array<[number, number]>;
  }> {
    // Note: This would require deeper integration with expo-camera
    // For now, return common capabilities
    return {
      hasFlash: true, // Most devices have flash
      hasFrontCamera: true,
      hasBackCamera: true,
      supportedAspectRatios: [[1, 1], [4, 3], [16, 9], [3, 4], [9, 16]],
    };
  }

  /**
   * Cleanup temporary camera files
   */
  async cleanup(): Promise<void> {
    try {
      // Use media service cleanup functionality
      await mediaService.clearCache();
    } catch (error) {
      console.warn('Camera cleanup failed:', error);
    }
  }

  /**
   * Convert library options to ImagePicker media type
   */
  private getImagePickerMediaType(mediaType?: string): ImagePicker.MediaTypeOptions {
    switch (mediaType) {
      case 'images':
        return ImagePicker.MediaTypeOptions.Images;
      case 'videos':
        return ImagePicker.MediaTypeOptions.Videos;
      default:
        return ImagePicker.MediaTypeOptions.All;
    }
  }

  /**
   * Process image asset from ImagePicker result
   */
  private async processImageAsset(asset: ImagePicker.ImagePickerAsset): Promise<MediaAsset> {
    return {
      uri: asset.uri,
      type: 'image',
      fileName: asset.fileName || `photo_${Date.now()}.jpg`,
      fileSize: asset.fileSize ?? undefined,
      mimeType: asset.mimeType || 'image/jpeg',
      width: asset.width,
      height: asset.height,
    };
  }

  /**
   * Process video asset from ImagePicker result
   */
  private async processVideoAsset(asset: ImagePicker.ImagePickerAsset): Promise<MediaAsset> {
    return {
      uri: asset.uri,
      type: 'video',
      fileName: asset.fileName || `video_${Date.now()}.mp4`,
      fileSize: asset.fileSize ?? undefined,
      mimeType: asset.mimeType || 'video/mp4',
      width: asset.width,
      height: asset.height,
      duration: asset.duration ?? undefined,
    };
  }
}

// Export singleton instance
export const cameraService = new CameraService();
export default cameraService;