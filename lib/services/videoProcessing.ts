/**
 * Video Processing Service - MS-003
 * Handles video compression, thumbnail generation, and optimization for different use cases
 */

import * as FileSystem from 'expo-file-system';
// import * as VideoThumbnails from 'expo-video-thumbnails';
import { Video, ResizeMode } from 'expo-av';
import * as ImageManipulator from 'expo-image-manipulator';

export interface VideoCompressionOptions {
  /** Target quality preset */
  quality?: 'low' | 'medium' | 'high';
  /** Custom quality value (0.0-1.0) */
  customQuality?: number;
  /** Maximum resolution width */
  maxWidth?: number;
  /** Maximum resolution height */
  maxHeight?: number;
  /** Target bitrate in kbps */
  targetBitrate?: number;
  /** Target file size in bytes (will adjust quality to meet) */
  targetSizeBytes?: number;
  /** Minimum quality threshold when targeting file size */
  minQuality?: number;
  /** Frame rate (fps) */
  frameRate?: number;
}

export interface VideoCompressionResult {
  uri: string;
  width: number;
  height: number;
  fileSize: number;
  duration: number;
  bitrate: number;
  frameRate: number;
  quality: number;
  compressionRatio: number;
  thumbnailUri?: string;
}

export interface VideoMetadata {
  uri: string;
  width: number;
  height: number;
  fileSize: number;
  duration: number;
  bitrate: number;
  frameRate: number;
  mimeType: string;
  codec?: string;
}

export interface VideoCompressionPresets {
  chat: VideoCompressionOptions;
  story: VideoCompressionOptions;
  highQuality: VideoCompressionOptions;
  upload: VideoCompressionOptions;
}

export interface CompressionProgress {
  progress: number; // 0-1
  stage: 'analyzing' | 'compressing' | 'optimizing' | 'generating_thumbnail' | 'completed';
  estimatedTimeRemaining?: number; // seconds
}

/**
 * Predefined video compression presets for common use cases
 */
export const VIDEO_COMPRESSION_PRESETS: VideoCompressionPresets = {
  // Chat/messaging videos - balanced compression
  chat: {
    quality: 'medium',
    maxWidth: 720,
    maxHeight: 720,
    targetBitrate: 1000, // 1Mbps
    targetSizeBytes: 10 * 1024 * 1024, // 10MB
    frameRate: 30,
    minQuality: 0.3,
  },

  // Story/short videos - optimized for mobile viewing
  story: {
    quality: 'medium',
    maxWidth: 480,
    maxHeight: 854, // 9:16 aspect ratio
    targetBitrate: 800, // 800kbps
    targetSizeBytes: 5 * 1024 * 1024, // 5MB
    frameRate: 30,
    minQuality: 0.4,
  },

  // High quality videos for important content
  highQuality: {
    quality: 'high',
    maxWidth: 1280,
    maxHeight: 720,
    targetBitrate: 2000, // 2Mbps
    targetSizeBytes: 50 * 1024 * 1024, // 50MB
    frameRate: 60,
    minQuality: 0.6,
  },

  // Upload preset - smaller size for faster uploads
  upload: {
    quality: 'low',
    maxWidth: 640,
    maxHeight: 480,
    targetBitrate: 500, // 500kbps
    targetSizeBytes: 25 * 1024 * 1024, // 25MB
    frameRate: 24,
    minQuality: 0.2,
  },
};

class VideoProcessingService {
  /**
   * Get video file metadata
   */
  async getVideoMetadata(uri: string): Promise<VideoMetadata> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const fileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size || 0 : 0;

      // Note: In a full implementation, we'd use a video analysis library
      // For now, we'll extract basic info and use estimates
      const filename = uri.split('/').pop() || '';
      const mimeType = this.getMimeTypeFromFilename(filename);

      // Placeholder values - in real implementation, we'd use FFmpeg or similar
      return {
        uri,
        width: 1280, // Would extract from video
        height: 720, // Would extract from video
        fileSize,
        duration: 30, // Would extract from video
        bitrate: Math.round(fileSize / 30 * 8 / 1000), // Estimate kbps
        frameRate: 30, // Would extract from video
        mimeType,
        codec: 'h264', // Would detect codec
      };
    } catch (error) {
      console.error('Failed to get video metadata:', error);
      throw new Error('Unable to read video metadata');
    }
  }

  /**
   * Get video file size
   */
  async getVideoFileSize(uri: string): Promise<number> {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      return info.exists && 'size' in info ? info.size || 0 : 0;
    } catch (error) {
      console.warn('Failed to get video file size:', error);
      return 0;
    }
  }

  /**
   * Calculate optimal video dimensions that fit within max constraints
   */
  calculateOptimalDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth?: number,
    maxHeight?: number
  ): { width: number; height: number } {
    if (!maxWidth && !maxHeight) {
      return { width: originalWidth, height: originalHeight };
    }

    const maxW = maxWidth || originalWidth;
    const maxH = maxHeight || originalHeight;

    const widthRatio = maxW / originalWidth;
    const heightRatio = maxH / originalHeight;
    const ratio = Math.min(widthRatio, heightRatio, 1); // Never scale up

    // Ensure dimensions are even numbers (required for most video codecs)
    const newWidth = Math.round(originalWidth * ratio);
    const newHeight = Math.round(originalHeight * ratio);

    return {
      width: newWidth % 2 === 0 ? newWidth : newWidth - 1,
      height: newHeight % 2 === 0 ? newHeight : newHeight - 1,
    };
  }

  /**
   * Generate thumbnail from video
   */
  async generateThumbnail(
    videoUri: string,
    timeStamp: number = 1000 // milliseconds
  ): Promise<string> {
    try {
      // TODO: Install expo-video-thumbnails and uncomment this code
      // const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
      //   time: timeStamp,
      //   quality: 0.8,
      // });
      // return uri;

      // For now, return a placeholder
      console.warn('Video thumbnail generation not available. Install expo-video-thumbnails to enable.');
      throw new Error('Video thumbnail generation not implemented');
    } catch (error) {
      console.error('Failed to generate video thumbnail:', error);
      throw new Error('Unable to generate video thumbnail');
    }
  }

  /**
   * Compress video with progress tracking (placeholder implementation)
   * Note: In a real implementation, this would use FFmpeg or similar native library
   */
  async compressVideo(
    uri: string,
    options: VideoCompressionOptions = {},
    onProgress?: (progress: CompressionProgress) => void
  ): Promise<VideoCompressionResult> {
    const {
      quality = 'medium',
      customQuality,
      maxWidth,
      maxHeight,
      targetBitrate,
      frameRate = 30,
    } = options;

    try {
      // Get original metadata
      onProgress?.({ progress: 0.1, stage: 'analyzing' });
      const originalMetadata = await this.getVideoMetadata(uri);

      // Calculate optimal dimensions
      const newDimensions = this.calculateOptimalDimensions(
        originalMetadata.width,
        originalMetadata.height,
        maxWidth,
        maxHeight
      );

      // Simulate compression progress
      onProgress?.({ progress: 0.3, stage: 'compressing', estimatedTimeRemaining: 30 });

      // In a real implementation, this would invoke native video compression
      // For now, we'll simulate the process and copy the file
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate compression time

      onProgress?.({ progress: 0.7, stage: 'optimizing', estimatedTimeRemaining: 10 });

      // Create compressed file path
      const timestamp = Date.now();
      const compressedUri = `${FileSystem.cacheDirectory}compressed_video_${timestamp}.mp4`;

      // For simulation, copy the original file (in real implementation, this would be compressed)
      await FileSystem.copyAsync({ from: uri, to: compressedUri });

      onProgress?.({ progress: 0.9, stage: 'generating_thumbnail' });

      // Generate thumbnail
      const thumbnailUri = await this.generateThumbnail(compressedUri);

      onProgress?.({ progress: 1.0, stage: 'completed' });

      // Calculate results (simulated - in real implementation, these would be actual values)
      const qualityMultiplier = this.getQualityMultiplier(quality, customQuality);
      const estimatedNewSize = Math.round(originalMetadata.fileSize * qualityMultiplier);
      const estimatedBitrate = targetBitrate || Math.round(originalMetadata.bitrate * qualityMultiplier);

      return {
        uri: compressedUri,
        width: newDimensions.width,
        height: newDimensions.height,
        fileSize: estimatedNewSize,
        duration: originalMetadata.duration,
        bitrate: estimatedBitrate,
        frameRate,
        quality: qualityMultiplier,
        compressionRatio: estimatedNewSize / originalMetadata.fileSize,
        thumbnailUri,
      };
    } catch (error) {
      console.error('Video compression failed:', error);
      throw new Error('Failed to compress video');
    }
  }

  /**
   * Compress video to target file size
   */
  async compressToTargetSize(
    uri: string,
    options: VideoCompressionOptions = {},
    onProgress?: (progress: CompressionProgress) => void
  ): Promise<VideoCompressionResult> {
    const {
      targetSizeBytes,
      minQuality = 0.2,
    } = options;

    if (!targetSizeBytes) {
      return this.compressVideo(uri, options, onProgress);
    }

    const originalMetadata = await this.getVideoMetadata(uri);

    // Calculate required quality to achieve target size
    const targetRatio = targetSizeBytes / originalMetadata.fileSize;
    const targetQuality = Math.max(minQuality, Math.min(1.0, targetRatio));

    const compressionOptions = {
      ...options,
      customQuality: targetQuality,
    };

    return this.compressVideo(uri, compressionOptions, onProgress);
  }

  /**
   * Apply a compression preset
   */
  async applyPreset(
    uri: string,
    preset: keyof VideoCompressionPresets,
    onProgress?: (progress: CompressionProgress) => void
  ): Promise<VideoCompressionResult> {
    const options = VIDEO_COMPRESSION_PRESETS[preset];

    if (options.targetSizeBytes) {
      return this.compressToTargetSize(uri, options, onProgress);
    }

    return this.compressVideo(uri, options, onProgress);
  }

  /**
   * Smart compression based on video characteristics
   */
  async smartCompress(
    uri: string,
    options: Partial<VideoCompressionOptions> = {},
    onProgress?: (progress: CompressionProgress) => void
  ): Promise<VideoCompressionResult> {
    try {
      const metadata = await this.getVideoMetadata(uri);

      // Choose compression strategy based on video characteristics
      let preset: keyof VideoCompressionPresets;

      if (metadata.fileSize > 100 * 1024 * 1024) { // > 100MB
        preset = 'upload'; // Aggressive compression
      } else if (metadata.fileSize > 50 * 1024 * 1024) { // > 50MB
        preset = 'chat'; // Moderate compression
      } else if (metadata.duration > 60) { // Long videos
        preset = 'story'; // Optimize for mobile
      } else {
        preset = 'highQuality'; // Short videos keep quality
      }

      const presetOptions = { ...VIDEO_COMPRESSION_PRESETS[preset], ...options };
      return this.compressToTargetSize(uri, presetOptions, onProgress);
    } catch (error) {
      console.error('Smart compression failed:', error);
      // Fallback to basic compression
      return this.compressVideo(uri, options, onProgress);
    }
  }

  /**
   * Check if video needs compression
   */
  async needsCompression(
    uri: string,
    maxSize: number = 25 * 1024 * 1024, // 25MB default
    maxDuration: number = 300 // 5 minutes
  ): Promise<boolean> {
    try {
      const metadata = await this.getVideoMetadata(uri);

      return (
        metadata.fileSize > maxSize ||
        metadata.duration > maxDuration ||
        Math.max(metadata.width, metadata.height) > 1280
      );
    } catch {
      return true; // Err on the side of compression
    }
  }

  /**
   * Get compression recommendations for a video
   */
  async getCompressionRecommendation(
    uri: string
  ): Promise<{
    shouldCompress: boolean;
    recommendedPreset: keyof VideoCompressionPresets;
    estimatedSavings: number;
    reason: string;
  }> {
    try {
      const metadata = await this.getVideoMetadata(uri);

      if (metadata.fileSize < 5 * 1024 * 1024) {
        // Small video
        return {
          shouldCompress: false,
          recommendedPreset: 'chat',
          estimatedSavings: 0,
          reason: 'Video is already small enough',
        };
      }

      if (metadata.fileSize > 100 * 1024 * 1024) {
        // Very large video
        return {
          shouldCompress: true,
          recommendedPreset: 'upload',
          estimatedSavings: 0.8,
          reason: 'Large video - aggressive compression recommended',
        };
      }

      if (metadata.fileSize > 50 * 1024 * 1024) {
        // Large video
        return {
          shouldCompress: true,
          recommendedPreset: 'chat',
          estimatedSavings: 0.6,
          reason: 'Large video - moderate compression recommended',
        };
      }

      // Medium video
      return {
        shouldCompress: true,
        recommendedPreset: 'story',
        estimatedSavings: 0.4,
        reason: 'Compression recommended for faster upload',
      };
    } catch (error) {
      return {
        shouldCompress: true,
        recommendedPreset: 'chat',
        estimatedSavings: 0.5,
        reason: 'Could not analyze video - compression recommended',
      };
    }
  }

  /**
   * Cleanup temporary video files
   */
  async cleanup(): Promise<void> {
    try {
      const cacheDir = FileSystem.cacheDirectory;
      if (!cacheDir) return;

      const files = await FileSystem.readDirectoryAsync(cacheDir);
      const videoFiles = files.filter(file =>
        file.startsWith('compressed_video_') || file.startsWith('thumbnail_')
      );

      await Promise.all(
        videoFiles.map(file =>
          FileSystem.deleteAsync(`${cacheDir}${file}`, { idempotent: true })
        )
      );
    } catch (error) {
      console.warn('Video cleanup failed:', error);
    }
  }

  /**
   * Get MIME type from filename
   */
  private getMimeTypeFromFilename(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'mp4': return 'video/mp4';
      case 'mov': return 'video/quicktime';
      case 'avi': return 'video/x-msvideo';
      case 'mkv': return 'video/x-matroska';
      default: return 'video/mp4';
    }
  }

  /**
   * Get quality multiplier from quality setting
   */
  private getQualityMultiplier(quality: string, customQuality?: number): number {
    if (customQuality !== undefined) {
      return customQuality;
    }

    switch (quality) {
      case 'low': return 0.3;
      case 'medium': return 0.6;
      case 'high': return 0.8;
      default: return 0.6;
    }
  }
}

export const videoProcessingService = new VideoProcessingService();
export default videoProcessingService;