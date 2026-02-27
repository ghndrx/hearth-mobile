/**
 * Media Service for Handling Attachments
 * Handles image picking, compression, upload, and download
 */

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { apiClient } from './api';

export interface MediaAsset {
  uri: string;
  type: 'image' | 'video' | 'file';
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  id: string;
  url: string;
  thumbnailUrl?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
}

export interface MediaPickerOptions {
  allowsMultiple?: boolean;
  mediaType?: 'images' | 'videos' | 'all';
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  allowsEditing?: boolean;
}

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  pdf: 'application/pdf',
};

class MediaService {
  /**
   * Request permission to access media library
   */
  async requestPermission(): Promise<boolean> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Request permission to access camera
   */
  async requestCameraPermission(): Promise<boolean> {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Pick images/videos from the media library
   */
  async pickMedia(options: MediaPickerOptions = {}): Promise<MediaAsset[]> {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      throw new Error('Media library permission not granted');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: this.getMediaTypes(options.mediaType),
      allowsMultipleSelection: options.allowsMultiple ?? false,
      allowsEditing: options.allowsEditing ?? false,
      quality: options.quality ?? 0.8,
    });

    if (result.canceled) {
      return [];
    }

    return Promise.all(result.assets.map(asset => this.processAsset(asset)));
  }

  /**
   * Take a photo or video with the camera
   */
  async captureMedia(
    type: 'photo' | 'video' = 'photo'
  ): Promise<MediaAsset | null> {
    const hasPermission = await this.requestCameraPermission();
    if (!hasPermission) {
      throw new Error('Camera permission not granted');
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: type === 'video' 
        ? ImagePicker.MediaTypeOptions.Videos 
        : ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      videoMaxDuration: 60,
    });

    if (result.canceled || result.assets.length === 0) {
      return null;
    }

    return this.processAsset(result.assets[0]);
  }

  /**
   * Upload a media file to the server
   */
  async upload(
    asset: MediaAsset,
    channelId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    const fileInfo = await FileSystem.getInfoAsync(asset.uri);
    if (!fileInfo.exists) {
      throw new Error('File does not exist');
    }

    const formData = new FormData();
    formData.append('file', {
      uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
      type: asset.mimeType || 'application/octet-stream',
      name: asset.fileName,
    } as unknown as Blob);
    formData.append('channelId', channelId);

    // Use apiClient.upload for progress tracking
    const response = await apiClient.upload<UploadResult>('/media/upload', formData, {
      onProgress: (event) => {
        if (onProgress && event.total) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: (event.loaded / event.total) * 100,
          });
        }
      },
    });

    if (response.error || !response.data) {
      throw new Error(response.error?.message || 'Upload failed');
    }

    return response.data;
  }

  /**
   * Download a media file
   */
  async download(
    url: string,
    fileName: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    const directory = FileSystem.documentDirectory + 'downloads/';
    
    // Ensure directory exists
    const dirInfo = await FileSystem.getInfoAsync(directory);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    }

    const localPath = directory + fileName;
    
    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      localPath,
      {},
      (downloadProgress) => {
        if (onProgress) {
          const percentage = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite * 100;
          onProgress({
            loaded: downloadProgress.totalBytesWritten,
            total: downloadProgress.totalBytesExpectedToWrite,
            percentage,
          });
        }
      }
    );

    const result = await downloadResumable.downloadAsync();
    if (!result?.uri) {
      throw new Error('Download failed');
    }

    return result.uri;
  }

  /**
   * Get file size in human-readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Get MIME type from file extension
   */
  getMimeType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return MIME_TYPES[ext] || 'application/octet-stream';
  }

  /**
   * Check if file is an image
   */
  isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * Check if file is a video
   */
  isVideo(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  /**
   * Delete a local cached file
   */
  async deleteLocal(uri: string): Promise<void> {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(uri);
    }
  }

  /**
   * Clear all downloaded files
   */
  async clearCache(): Promise<void> {
    const directory = FileSystem.documentDirectory + 'downloads/';
    const dirInfo = await FileSystem.getInfoAsync(directory);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(directory, { idempotent: true });
    }
  }

  /**
   * Get cache size
   */
  async getCacheSize(): Promise<number> {
    const directory = FileSystem.documentDirectory + 'downloads/';
    const dirInfo = await FileSystem.getInfoAsync(directory);
    if (!dirInfo.exists) {
      return 0;
    }

    const files = await FileSystem.readDirectoryAsync(directory);
    let totalSize = 0;

    for (const file of files) {
      const fileInfo = await FileSystem.getInfoAsync(directory + file);
      if (fileInfo.exists && 'size' in fileInfo) {
        totalSize += fileInfo.size ?? 0;
      }
    }

    return totalSize;
  }

  private getMediaTypes(mediaType?: string): ImagePicker.MediaTypeOptions {
    switch (mediaType) {
      case 'images':
        return ImagePicker.MediaTypeOptions.Images;
      case 'videos':
        return ImagePicker.MediaTypeOptions.Videos;
      default:
        return ImagePicker.MediaTypeOptions.All;
    }
  }

  private async processAsset(
    asset: ImagePicker.ImagePickerAsset
  ): Promise<MediaAsset> {
    const isVideo = asset.type === 'video';
    const fileName = asset.fileName || `${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;
    const mimeType = asset.mimeType || this.getMimeType(fileName);

    let fileSize = 0;
    try {
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);
      if (fileInfo.exists && 'size' in fileInfo) {
        fileSize = fileInfo.size ?? 0;
      }
    } catch {
      // File size not available
    }

    return {
      uri: asset.uri,
      type: isVideo ? 'video' : 'image',
      fileName,
      fileSize,
      mimeType,
      width: asset.width,
      height: asset.height,
      duration: asset.duration ?? undefined,
    };
  }
}

export const mediaService = new MediaService();
export default mediaService;
