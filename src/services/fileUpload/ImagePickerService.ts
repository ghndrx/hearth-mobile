/**
 * Image Picker Service
 * Handles image selection from gallery and camera with compression
 */

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { nanoid } from 'nanoid';
import { LocalFile, FileType, getFileTypeFromMimeType, formatFileSize } from './types';
import { imageProcessingService, COMPRESSION_PRESETS } from '../../../lib/services/imageProcessing';

export interface ImagePickerOptions {
  /** Allow selecting multiple files */
  allowsMultiple?: boolean;
  /** Media type to select */
  mediaType?: 'images' | 'videos' | 'all';
  /** Image compression quality (0-1) */
  quality?: number;
  /** Maximum image width */
  maxWidth?: number;
  /** Maximum image height */
  maxHeight?: number;
  /** Whether to allow editing/cropping */
  allowsEditing?: boolean;
  /** Video maximum duration in seconds */
  videoMaxDuration?: number;
}

export interface CameraCaptureOptions {
  /** Type of media to capture */
  type: 'photo' | 'video';
  /** Video maximum duration in seconds */
  videoMaxDuration?: number;
  /** Image compression quality (0-1) */
  quality?: number;
  /** Whether to allow editing/cropping */
  allowsEditing?: boolean;
}

/** Permission status for media library */
export interface MediaPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: 'granted' | 'denied' | 'limited' | 'unavailable';
}

/** Permission status for camera */
export interface CameraPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: 'granted' | 'denied';
}

class ImagePickerService {
  /**
   * Request permission to access media library
   */
  async requestMediaLibraryPermission(): Promise<MediaPermissionStatus> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return {
      granted: permission.status === 'granted',
      canAskAgain: permission.canAskAgain,
      status: permission.status as 'granted' | 'denied' | 'limited' | 'unavailable',
    };
  }

  /**
   * Request permission to access camera
   */
  async requestCameraPermission(): Promise<CameraPermissionStatus> {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    return {
      granted: permission.status === 'granted',
      canAskAgain: permission.canAskAgain,
      status: permission.status as 'granted' | 'denied',
    };
  }

  /**
   * Check if media library permission is granted
   */
  async hasMediaLibraryPermission(): Promise<boolean> {
    const permission = await ImagePicker.getMediaLibraryPermissionsAsync();
    return permission.status === 'granted';
  }

  /**
   * Check if camera permission is granted
   */
  async hasCameraPermission(): Promise<boolean> {
    const permission = await ImagePicker.getCameraPermissionsAsync();
    return permission.status === 'granted';
  }

  /**
   * Pick images/videos from the media library
   */
  async pickFromLibrary(options: ImagePickerOptions = {}): Promise<LocalFile[]> {
    const permission = await this.requestMediaLibraryPermission();
    if (!permission.granted) {
      throw new Error(
        permission.canAskAgain 
          ? 'Media library permission is required to select files'
          : 'Media library permission was denied. Please enable it in Settings.'
      );
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: this.getMediaTypes(options.mediaType),
      allowsMultipleSelection: options.allowsMultiple ?? false,
      allowsEditing: options.allowsEditing ?? false,
      quality: options.quality ?? 0.8,
      exif: false, // Don't include EXIF data for privacy
    });

    if (result.canceled || result.assets.length === 0) {
      return [];
    }

    return this.processAssets(result.assets, options);
  }

  /**
   * Capture a photo or video using the camera
   */
  async captureFromCamera(options: CameraCaptureOptions): Promise<LocalFile | null> {
    const permission = await this.requestCameraPermission();
    if (!permission.granted) {
      throw new Error(
        permission.canAskAgain 
          ? 'Camera permission is required to capture photos'
          : 'Camera permission was denied. Please enable it in Settings.'
      );
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: options.type === 'video' 
        ? ImagePicker.MediaTypeOptions.Videos 
        : ImagePicker.MediaTypeOptions.Images,
      allowsEditing: options.allowsEditing ?? false,
      quality: options.quality ?? 0.8,
      videoMaxDuration: options.videoMaxDuration,
      exif: false,
    });

    if (result.canceled || result.assets.length === 0) {
      return null;
    }

    const localFiles = await this.processAssets(result.assets, {
      quality: options.quality,
    });

    return localFiles[0] || null;
  }

  /**
   * Pick a single image from the library
   */
  async pickSingleImage(options: Omit<ImagePickerOptions, 'allowsMultiple'> = {}): Promise<LocalFile | null> {
    const files = await this.pickFromLibrary({
      ...options,
      allowsMultiple: false,
    });
    return files[0] || null;
  }

  /**
   * Capture a photo from the camera
   */
  async capturePhoto(
    options: Omit<CameraCaptureOptions, 'type'> = {}
  ): Promise<LocalFile | null> {
    return this.captureFromCamera({
      ...options,
      type: 'photo',
    });
  }

  /**
   * Capture a video from the camera
   */
  async captureVideo(
    options: Omit<CameraCaptureOptions, 'type'> = {}
  ): Promise<LocalFile | null> {
    return this.captureFromCamera({
      ...options,
      type: 'video',
      videoMaxDuration: options.videoMaxDuration ?? 60,
    });
  }

  /**
   * Process selected assets into LocalFile objects
   */
  private async processAssets(
    assets: ImagePicker.ImagePickerAsset[],
    options: ImagePickerOptions
  ): Promise<LocalFile[]> {
    const localFiles: LocalFile[] = [];

    for (const asset of assets) {
      try {
        const localFile = await this.processAsset(asset, options);
        if (localFile) {
          localFiles.push(localFile);
        }
      } catch (error) {
        console.warn('Failed to process asset:', asset.uri, error);
      }
    }

    return localFiles;
  }

  /**
   * Process a single asset into a LocalFile
   */
  private async processAsset(
    asset: ImagePicker.ImagePickerAsset,
    options: ImagePickerOptions
  ): Promise<LocalFile | null> {
    const isVideo = asset.type === 'video';
    const mimeType = asset.mimeType || this.getMimeTypeFromAsset(asset, isVideo);
    const filename = asset.fileName || this.generateFilename(mimeType);

    // Get file size
    let fileSize = 0;
    try {
      const info = await FileSystem.getInfoAsync(asset.uri, { size: true });
      if (info.exists && 'size' in info) {
        fileSize = info.size ?? 0;
      }
    } catch {
      // File size not available
    }

    const localFile: LocalFile = {
      localId: nanoid(),
      uri: asset.uri,
      filename,
      mimeType,
      size: fileSize,
      fileType: getFileTypeFromMimeType(mimeType),
      width: asset.width,
      height: asset.height,
      duration: asset.duration ?? undefined,
      compressed: false,
    };

    // Optionally compress images
    if (!isVideo && options.quality !== undefined && options.quality < 1) {
      try {
        const compressed = await this.compressLocalFile(localFile, options);
        return compressed;
      } catch (error) {
        console.warn('Failed to compress image, using original:', error);
      }
    }

    return localFile;
  }

  /**
   * Compress a LocalFile image
   */
  async compressLocalFile(
    localFile: LocalFile,
    options: {
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
    } = {}
  ): Promise<LocalFile> {
    if (!localFile.mimeType.startsWith('image/')) {
      return localFile;
    }

    const quality = options.quality ?? 0.8;
    const maxWidth = options.maxWidth ?? 1200;
    const maxHeight = options.maxHeight ?? 1200;

    const result = await imageProcessingService.compressToTargetSize(localFile.uri, {
      quality,
      maxWidth,
      maxHeight,
      targetSizeBytes: 500 * 1024, // 500KB target
      minQuality: 0.5,
    });

    return {
      ...localFile,
      uri: result.uri,
      size: result.fileSize,
      width: result.width,
      height: result.height,
      compressed: true,
      originalSize: localFile.size,
    };
  }

  /**
   * Generate a thumbnail for an image
   */
  async generateThumbnail(uri: string): Promise<string | null> {
    try {
      const result = await imageProcessingService.applyPreset(uri, 'thumbnail');
      return result.uri;
    } catch (error) {
      console.warn('Failed to generate thumbnail:', error);
      return null;
    }
  }

  /**
   * Copy a local file to app's cache directory
   */
  async copyToCache(uri: string, filename: string): Promise<string> {
    const cacheDir = FileSystem.cacheDirectory + 'uploads/';
    
    // Ensure directory exists
    const dirInfo = await FileSystem.getInfoAsync(cacheDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
    }

    const destPath = cacheDir + filename;
    await FileSystem.copyAsync({
      from: uri,
      to: destPath,
    });

    return destPath;
  }

  /**
   * Delete a local file
   */
  async deleteLocalFile(uri: string): Promise<void> {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) {
        await FileSystem.deleteAsync(uri);
      }
    } catch (error) {
      console.warn('Failed to delete local file:', error);
    }
  }

  /**
   * Get total size of multiple local files
   */
  async getTotalSize(files: LocalFile[]): Promise<number> {
    return files.reduce((total, file) => total + file.size, 0);
  }

  /**
   * Validate files against size limits
   */
  validateFiles(
    files: LocalFile[],
    limits: Record<FileType, number>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const file of files) {
      const limit = limits[file.fileType];
      if (file.size > limit) {
        errors.push(
          `${file.filename} (${formatFileSize(file.size)}) exceeds limit (${formatFileSize(limit)})`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get media types for ImagePicker
   */
  private getMediaTypes(
    mediaType?: 'images' | 'videos' | 'all'
  ): ImagePicker.MediaTypeOptions {
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
   * Get MIME type from asset
   */
  private getMimeTypeFromAsset(
    asset: ImagePicker.ImagePickerAsset,
    isVideo: boolean
  ): string {
    if (isVideo) {
      return 'video/mp4';
    }
    
    // Default to JPEG for images
    return 'image/jpeg';
  }

  /**
   * Generate a filename based on timestamp
   */
  private generateFilename(mimeType: string): string {
    const timestamp = Date.now();
    const ext = this.getExtensionFromMimeType(mimeType);
    return `media_${timestamp}.${ext}`;
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'video/webm': 'webm',
    };
    return map[mimeType] || 'bin';
  }
}

// Export singleton instance
export const imagePickerService = new ImagePickerService();
export default imagePickerService;
