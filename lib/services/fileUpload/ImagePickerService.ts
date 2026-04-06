import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  LocalFile,
  FileType,
  ImagePickerOptions,
  CameraOptions,
} from '../../types';

export class ImagePickerService {
  private static instance: ImagePickerService;

  private constructor() {}

  public static getInstance(): ImagePickerService {
    if (!ImagePickerService.instance) {
      ImagePickerService.instance = new ImagePickerService();
    }
    return ImagePickerService.instance;
  }

  /**
   * Request media library permission
   */
  async requestMediaLibraryPermission(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting media library permission:', error);
      return false;
    }
  }

  /**
   * Request camera permission
   */
  async requestCameraPermission(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  }

  /**
   * Check if media library permission is granted
   */
  async hasMediaLibraryPermission(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking media library permission:', error);
      return false;
    }
  }

  /**
   * Check if camera permission is granted
   */
  async hasCameraPermission(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.getCameraPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking camera permission:', error);
      return false;
    }
  }

  /**
   * Pick images from library
   */
  async pickFromLibrary(options: Partial<ImagePickerOptions> = {}): Promise<LocalFile[]> {
    try {
      // Check permissions
      const hasPermission = await this.hasMediaLibraryPermission();
      if (!hasPermission) {
        const granted = await this.requestMediaLibraryPermission();
        if (!granted) {
          throw new Error('Media library permission not granted');
        }
      }

      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: this.mapMediaTypes(options.mediaTypes || 'images'),
        allowsEditing: options.allowsEditing || false,
        aspect: [4, 3],
        quality: options.quality || 0.8,
        allowsMultipleSelection: options.allowsMultipleSelection || false,
        selectionLimit: options.selectionLimit || 10,
      };

      const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (result.canceled || !result.assets) {
        return [];
      }

      const localFiles: LocalFile[] = [];
      for (const asset of result.assets) {
        const localFile = await this.processPickerAsset(asset);
        localFiles.push(localFile);
      }

      return localFiles;
    } catch (error) {
      console.error('Error picking from library:', error);
      throw error;
    }
  }

  /**
   * Capture photo from camera
   */
  async captureFromCamera(options: Partial<CameraOptions> = {}): Promise<LocalFile | null> {
    try {
      // Check permissions
      const hasPermission = await this.hasCameraPermission();
      if (!hasPermission) {
        const granted = await this.requestCameraPermission();
        if (!granted) {
          throw new Error('Camera permission not granted');
        }
      }

      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options.allowsEditing || false,
        aspect: options.aspect || [4, 3],
        quality: options.quality || 0.8,
        base64: options.base64 || false,
      };

      const result = await ImagePicker.launchCameraAsync(pickerOptions);

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      return this.processPickerAsset(result.assets[0]);
    } catch (error) {
      console.error('Error capturing from camera:', error);
      throw error;
    }
  }

  /**
   * Pick a single image from library
   */
  async pickSingleImage(): Promise<LocalFile | null> {
    try {
      const files = await this.pickFromLibrary({
        mediaTypes: 'images',
        allowsMultipleSelection: false,
      });

      return files.length > 0 ? files[0] : null;
    } catch (error) {
      console.error('Error picking single image:', error);
      throw error;
    }
  }

  /**
   * Capture a photo
   */
  async capturePhoto(): Promise<LocalFile | null> {
    try {
      return await this.captureFromCamera({
        quality: 0.8,
        allowsEditing: true,
      });
    } catch (error) {
      console.error('Error capturing photo:', error);
      throw error;
    }
  }

  /**
   * Capture a video
   */
  async captureVideo(): Promise<LocalFile | null> {
    try {
      // Check permissions
      const hasPermission = await this.hasCameraPermission();
      if (!hasPermission) {
        const granted = await this.requestCameraPermission();
        if (!granted) {
          throw new Error('Camera permission not granted');
        }
      }

      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
        videoMaxDuration: 60, // 60 seconds
      };

      const result = await ImagePicker.launchCameraAsync(pickerOptions);

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      return this.processPickerAsset(result.assets[0]);
    } catch (error) {
      console.error('Error capturing video:', error);
      throw error;
    }
  }

  /**
   * Compress local file
   */
  async compressLocalFile(
    localFile: LocalFile,
    quality: number = 0.7
  ): Promise<LocalFile> {
    try {
      if (localFile.fileType !== 'image') {
        return localFile; // Only compress images
      }

      const result = await ImageManipulator.manipulateAsync(
        localFile.uri,
        [], // No transformations, just compression
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      const fileInfo = await FileSystem.getInfoAsync(result.uri);

      return {
        ...localFile,
        uri: result.uri,
        size: (fileInfo.exists && 'size' in fileInfo) ? fileInfo.size : 0,
        type: 'image/jpeg',
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      console.error('Error compressing file:', error);
      return localFile; // Return original on error
    }
  }

  /**
   * Generate thumbnail for image or video
   */
  async generateThumbnail(localFile: LocalFile): Promise<string | null> {
    try {
      if (localFile.fileType === 'image') {
        // For images, create a small compressed version
        const result = await ImageManipulator.manipulateAsync(
          localFile.uri,
          [{ resize: { width: 150, height: 150 } }],
          {
            compress: 0.5,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );
        return result.uri;
      }

      // For videos, we would need a video thumbnail library
      // For now, return null for non-images
      return null;
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      return null;
    }
  }

  /**
   * Process picker asset and convert to LocalFile
   */
  private async processPickerAsset(asset: ImagePicker.ImagePickerAsset): Promise<LocalFile> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);
      const fileName = this.generateFileName(asset.type, asset.fileName);
      const fileType = this.determineFileType(asset.type);

      const localFile: LocalFile = {
        localId: `picker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        uri: asset.uri,
        name: fileName,
        type: asset.type || 'image/jpeg',
        size: (fileInfo.exists && 'size' in fileInfo) ? fileInfo.size : (asset.fileSize ?? 0),
        fileType,
        width: asset.width,
        height: asset.height,
        duration: asset.duration ?? undefined,
        createdAt: new Date(),
      };

      // Generate thumbnail if image
      if (fileType === 'image') {
        const thumbnail = await this.generateThumbnail(localFile);
        localFile.thumbnailUri = thumbnail || undefined;
      }

      return localFile;
    } catch (error) {
      console.error('Error processing picker asset:', error);
      throw error;
    }
  }

  /**
   * Map ImagePickerOptions.mediaTypes to ImagePicker.MediaTypeOptions
   */
  private mapMediaTypes(mediaTypes: string): ImagePicker.MediaTypeOptions {
    switch (mediaTypes) {
      case 'images':
        return ImagePicker.MediaTypeOptions.Images;
      case 'videos':
        return ImagePicker.MediaTypeOptions.Videos;
      case 'all':
        return ImagePicker.MediaTypeOptions.All;
      default:
        return ImagePicker.MediaTypeOptions.Images;
    }
  }

  /**
   * Determine file type from MIME type
   */
  private determineFileType(mimeType?: string): FileType {
    if (!mimeType) return 'image';

    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf') || mimeType.includes('document')) return 'document';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'archive';

    return 'image'; // Default fallback
  }

  /**
   * Generate a filename for the asset
   */
  private generateFileName(mimeType?: string | null, originalName?: string | null): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);

    if (originalName) {
      return originalName;
    }

    if (mimeType?.startsWith('image/')) {
      const ext = mimeType.split('/')[1] || 'jpg';
      return `image_${timestamp}_${random}.${ext}`;
    }

    if (mimeType?.startsWith('video/')) {
      return `video_${timestamp}_${random}.mp4`;
    }

    return `file_${timestamp}_${random}`;
  }
}