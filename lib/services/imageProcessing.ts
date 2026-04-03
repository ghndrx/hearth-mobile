/**
 * Image Processing Service
 * Handles image compression, resizing, and optimization for different use cases
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

export interface CompressionOptions {
  /** Target quality (0.0-1.0) */
  quality?: number;
  /** Maximum width in pixels */
  maxWidth?: number;
  /** Maximum height in pixels */
  maxHeight?: number;
  /** Output format */
  format?: ImageManipulator.SaveFormat;
  /** Target file size in bytes (will adjust quality to meet) */
  targetSizeBytes?: number;
  /** Minimum quality threshold when targeting file size */
  minQuality?: number;
}

export interface CompressionResult {
  uri: string;
  width: number;
  height: number;
  fileSize: number;
  quality: number;
  compressionRatio: number;
}

export interface OptimizationPresets {
  thumbnail: CompressionOptions;
  chat: CompressionOptions;
  highQuality: CompressionOptions;
}

/**
 * Predefined compression presets for common use cases
 */
export const COMPRESSION_PRESETS: OptimizationPresets = {
  // Small thumbnails for lists/previews
  thumbnail: {
    quality: 0.7,
    maxWidth: 200,
    maxHeight: 200,
    format: ImageManipulator.SaveFormat.JPEG,
    targetSizeBytes: 50 * 1024, // 50KB
    minQuality: 0.3,
  },

  // Chat/messaging images
  chat: {
    quality: 0.8,
    maxWidth: 1200,
    maxHeight: 1200,
    format: ImageManipulator.SaveFormat.JPEG,
    targetSizeBytes: 500 * 1024, // 500KB
    minQuality: 0.5,
  },

  // High quality for important images
  highQuality: {
    quality: 0.9,
    maxWidth: 1920,
    maxHeight: 1920,
    format: ImageManipulator.SaveFormat.JPEG,
    targetSizeBytes: 2 * 1024 * 1024, // 2MB
    minQuality: 0.7,
  },
};

class ImageProcessingService {
  /**
   * Get file size of an image
   */
  async getImageFileSize(uri: string): Promise<number> {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      return info.exists && 'size' in info ? info.size || 0 : 0;
    } catch (error) {
      console.warn('Failed to get image file size:', error);
      return 0;
    }
  }

  /**
   * Get image dimensions
   */
  async getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
    try {
      const result = await ImageManipulator.manipulateAsync(uri, [], {});
      return { width: result.width, height: result.height };
    } catch (error) {
      console.warn('Failed to get image dimensions:', error);
      return { width: 0, height: 0 };
    }
  }

  /**
   * Calculate optimal dimensions that fit within max constraints
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

    return {
      width: Math.round(originalWidth * ratio),
      height: Math.round(originalHeight * ratio),
    };
  }

  /**
   * Compress image with basic options
   */
  async compressImage(
    uri: string,
    options: CompressionOptions = {}
  ): Promise<CompressionResult> {
    const {
      quality = 0.8,
      maxWidth,
      maxHeight,
      format = ImageManipulator.SaveFormat.JPEG,
    } = options;

    try {
      const originalSize = await this.getImageFileSize(uri);
      const originalDimensions = await this.getImageDimensions(uri);

      const transforms = [];

      // Add resize transform if needed
      if (maxWidth || maxHeight) {
        const newDimensions = this.calculateOptimalDimensions(
          originalDimensions.width,
          originalDimensions.height,
          maxWidth,
          maxHeight
        );
        transforms.push({ resize: newDimensions });
      }

      // Process the image
      const result = await ImageManipulator.manipulateAsync(uri, transforms, {
        compress: quality,
        format,
      });

      const newSize = await this.getImageFileSize(result.uri);

      return {
        uri: result.uri,
        width: result.width,
        height: result.height,
        fileSize: newSize,
        quality,
        compressionRatio: originalSize > 0 ? newSize / originalSize : 1,
      };
    } catch (error) {
      console.error('Image compression failed:', error);
      throw new Error('Failed to compress image');
    }
  }

  /**
   * Compress image to target file size by adjusting quality
   */
  async compressToTargetSize(
    uri: string,
    options: CompressionOptions = {}
  ): Promise<CompressionResult> {
    const {
      targetSizeBytes,
      minQuality = 0.3,
      maxWidth,
      maxHeight,
      format = ImageManipulator.SaveFormat.JPEG,
    } = options;

    if (!targetSizeBytes) {
      return this.compressImage(uri, options);
    }

    let quality = 0.9;
    let result: CompressionResult | null = null;
    let attempts = 0;
    const maxAttempts = 8; // Prevent infinite loops

    // Binary search for optimal quality
    let minQ = minQuality;
    let maxQ = 1.0;

    while (attempts < maxAttempts && Math.abs(maxQ - minQ) > 0.05) {
      attempts++;
      quality = (minQ + maxQ) / 2;

      result = await this.compressImage(uri, {
        quality,
        maxWidth,
        maxHeight,
        format,
      });

      if (result.fileSize <= targetSizeBytes) {
        minQ = quality;
      } else {
        maxQ = quality;
      }
    }

    // If we couldn't reach target size, use the last result
    if (!result || result.fileSize > targetSizeBytes) {
      result = await this.compressImage(uri, {
        quality: minQ,
        maxWidth,
        maxHeight,
        format,
      });
    }

    return result;
  }

  /**
   * Apply a compression preset
   */
  async applyPreset(
    uri: string,
    preset: keyof OptimizationPresets
  ): Promise<CompressionResult> {
    const options = COMPRESSION_PRESETS[preset];

    if (options.targetSizeBytes) {
      return this.compressToTargetSize(uri, options);
    }

    return this.compressImage(uri, options);
  }

  /**
   * Smart compression based on image characteristics
   */
  async smartCompress(
    uri: string,
    options: Partial<CompressionOptions> = {}
  ): Promise<CompressionResult> {
    try {
      const originalSize = await this.getImageFileSize(uri);
      const dimensions = await this.getImageDimensions(uri);

      // Choose compression strategy based on image size and dimensions
      let preset: keyof OptimizationPresets;

      if (originalSize > 5 * 1024 * 1024 || Math.max(dimensions.width, dimensions.height) > 2000) {
        // Large image - aggressive compression
        preset = 'chat';
      } else if (originalSize > 1024 * 1024) {
        // Medium image - moderate compression
        preset = 'highQuality';
      } else {
        // Small image - light compression
        preset = 'chat';
      }

      const presetOptions = { ...COMPRESSION_PRESETS[preset], ...options };
      return this.compressToTargetSize(uri, presetOptions);
    } catch (error) {
      console.error('Smart compression failed:', error);
      // Fallback to basic compression
      return this.compressImage(uri, options);
    }
  }

  /**
   * Create a thumbnail from an image
   */
  async createThumbnail(uri: string): Promise<CompressionResult> {
    return this.applyPreset(uri, 'thumbnail');
  }

  /**
   * Check if image needs compression
   */
  async needsCompression(
    uri: string,
    maxSize: number = 1024 * 1024, // 1MB default
    maxDimension: number = 1920
  ): Promise<boolean> {
    try {
      const fileSize = await this.getImageFileSize(uri);
      const dimensions = await this.getImageDimensions(uri);

      return (
        fileSize > maxSize ||
        dimensions.width > maxDimension ||
        dimensions.height > maxDimension
      );
    } catch {
      return true; // Err on the side of compression
    }
  }

  /**
   * Get compression recommendations for an image
   */
  async getCompressionRecommendation(
    uri: string
  ): Promise<{
    shouldCompress: boolean;
    recommendedPreset: keyof OptimizationPresets;
    estimatedSavings: number;
    reason: string;
  }> {
    try {
      const fileSize = await this.getImageFileSize(uri);
      const dimensions = await this.getImageDimensions(uri);
      const maxDimension = Math.max(dimensions.width, dimensions.height);

      if (fileSize < 100 * 1024) {
        // Small file - probably doesn't need compression
        return {
          shouldCompress: false,
          recommendedPreset: 'chat',
          estimatedSavings: 0,
          reason: 'Image is already small',
        };
      }

      if (fileSize > 5 * 1024 * 1024 || maxDimension > 2000) {
        return {
          shouldCompress: true,
          recommendedPreset: 'chat',
          estimatedSavings: 0.7,
          reason: 'Large image - significant compression recommended',
        };
      }

      if (fileSize > 1 * 1024 * 1024) {
        return {
          shouldCompress: true,
          recommendedPreset: 'highQuality',
          estimatedSavings: 0.4,
          reason: 'Medium image - moderate compression recommended',
        };
      }

      return {
        shouldCompress: true,
        recommendedPreset: 'chat',
        estimatedSavings: 0.2,
        reason: 'Light compression for faster uploads',
      };
    } catch (error) {
      return {
        shouldCompress: true,
        recommendedPreset: 'chat',
        estimatedSavings: 0.5,
        reason: 'Could not analyze image - compression recommended',
      };
    }
  }
}

export const imageProcessingService = new ImageProcessingService();
export default imageProcessingService;