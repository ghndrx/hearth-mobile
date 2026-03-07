/**
 * Platform-Specific Optimizations
 * 
 * Utilities for optimizing performance on iOS and Android including
 * image caching, memory management, and platform-specific best practices.
 */

import { Platform, Dimensions, PixelRatio } from "react-native";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/**
 * Image optimization utilities
 */
export const ImageOptimization = {
  /**
   * Calculate optimal image dimensions for the device
   */
  getOptimalImageSize(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number = SCREEN_WIDTH,
    maxHeight: number = SCREEN_WIDTH
  ): { width: number; height: number } {
    const pixelRatio = PixelRatio.get();
    const scaledMaxWidth = maxWidth * pixelRatio;
    const scaledMaxHeight = maxHeight * pixelRatio;

    let width = originalWidth;
    let height = originalHeight;

    if (width > scaledMaxWidth) {
      height = (height * scaledMaxWidth) / width;
      width = scaledMaxWidth;
    }

    if (height > scaledMaxHeight) {
      width = (width * scaledMaxHeight) / height;
      height = scaledMaxHeight;
    }

    return {
      width: Math.round(width),
      height: Math.round(height),
    };
  },

  /**
   * Compress image for upload or storage
   */
  async compressImage(
    uri: string,
    quality: number = 0.8,
    maxWidth?: number,
    maxHeight?: number
  ): Promise<string> {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      maxWidth || maxHeight
        ? [
            {
              resize: {
                width: maxWidth,
                height: maxHeight,
              },
            },
          ]
        : [],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return manipResult.uri;
  },

  /**
   * Get image cache key for consistent caching
   */
  getCacheKey(url: string, size?: { width: number; height: number }): string {
    const sizeKey = size ? `_${size.width}x${size.height}` : "";
    return `${url.replace(/[^a-z0-9]/gi, "_")}${sizeKey}`;
  },

  /**
   * Clear image cache
   */
  async clearCache(): Promise<void> {
    const cacheDir = `${FileSystem.cacheDirectory}images/`;
    try {
      const info = await FileSystem.getInfoAsync(cacheDir);
      if (info.exists) {
        await FileSystem.deleteAsync(cacheDir, { idempotent: true });
      }
    } catch (error) {
      console.error("Failed to clear image cache:", error);
    }
  },

  /**
   * Get cache size in bytes
   */
  async getCacheSize(): Promise<number> {
    const cacheDir = `${FileSystem.cacheDirectory}images/`;
    try {
      const info = await FileSystem.getInfoAsync(cacheDir);
      if (info.exists && "size" in info) {
        return info.size || 0;
      }
    } catch (error) {
      console.error("Failed to get cache size:", error);
    }
    return 0;
  },
};

/**
 * Memory management utilities
 */
export const MemoryOptimization = {
  /**
   * Check if device is low on memory (heuristic)
   */
  isLowMemoryDevice(): boolean {
    // iOS devices with < 2GB RAM tend to be older devices
    // Android devices vary widely, but we can use screen size as a proxy
    if (Platform.OS === "ios") {
      // Older iOS devices typically have smaller screens
      return SCREEN_WIDTH < 375; // iPhone 6/7/8 size
    } else {
      // Android: Use screen width as a rough proxy
      return SCREEN_WIDTH < 360;
    }
  },

  /**
   * Get recommended list page size based on device capabilities
   */
  getRecommendedPageSize(): number {
    return this.isLowMemoryDevice() ? 20 : 50;
  },

  /**
   * Get recommended image quality based on device
   */
  getRecommendedImageQuality(): number {
    return this.isLowMemoryDevice() ? 0.7 : 0.85;
  },

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles(): Promise<void> {
    try {
      const tempDir = FileSystem.cacheDirectory;
      if (!tempDir) return;

      const files = await FileSystem.readDirectoryAsync(tempDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const file of files) {
        const filePath = `${tempDir}${file}`;
        const info = await FileSystem.getInfoAsync(filePath);

        if (
          info.exists &&
          "modificationTime" in info &&
          info.modificationTime &&
          now - info.modificationTime * 1000 > maxAge
        ) {
          await FileSystem.deleteAsync(filePath, { idempotent: true });
        }
      }
    } catch (error) {
      console.error("Failed to cleanup temp files:", error);
    }
  },
};

/**
 * Network optimization utilities
 */
export const NetworkOptimization = {
  /**
   * Debounce function for reducing API calls
   */
  debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return (...args: Parameters<T>) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  /**
   * Throttle function for limiting execution frequency
   */
  throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean = false;

    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  /**
   * Batch multiple requests together
   */
  batchRequests<T>(
    requests: Array<() => Promise<T>>,
    batchSize: number = 5
  ): Promise<T[]> {
    const batches: Array<Array<() => Promise<T>>> = [];

    for (let i = 0; i < requests.length; i += batchSize) {
      batches.push(requests.slice(i, i + batchSize));
    }

    return batches.reduce(
      async (acc, batch) => {
        const results = await acc;
        const batchResults = await Promise.all(batch.map((req) => req()));
        return [...results, ...batchResults];
      },
      Promise.resolve([] as T[])
    );
  },
};

/**
 * Rendering optimization utilities
 */
export const RenderOptimization = {
  /**
   * Calculate optimal window size for virtualized lists
   */
  getVirtualizedListConfig() {
    const isLowMemory = MemoryOptimization.isLowMemoryDevice();

    return {
      initialNumToRender: isLowMemory ? 10 : 15,
      maxToRenderPerBatch: isLowMemory ? 5 : 10,
      windowSize: isLowMemory ? 5 : 10,
      updateCellsBatchingPeriod: 50,
      removeClippedSubviews: Platform.OS === "android",
    };
  },

  /**
   * Get recommended animation config
   */
  getAnimationConfig() {
    const isLowMemory = MemoryOptimization.isLowMemoryDevice();

    return {
      useNativeDriver: true,
      duration: isLowMemory ? 200 : 300,
      enableAnimations: !isLowMemory,
    };
  },
};

/**
 * Platform-specific configurations
 */
export const PlatformConfig = {
  /**
   * Get platform-specific text input config
   */
  getTextInputConfig() {
    return {
      // iOS-specific optimizations
      ...(Platform.OS === "ios" && {
        enablesReturnKeyAutomatically: true,
        clearButtonMode: "while-editing",
        autoCorrect: true,
        spellCheck: true,
      }),
      // Android-specific optimizations
      ...(Platform.OS === "android" && {
        underlineColorAndroid: "transparent",
        textAlignVertical: "top",
      }),
    };
  },

  /**
   * Get platform-specific keyboard config
   */
  getKeyboardAvoidingConfig() {
    return {
      behavior: Platform.OS === "ios" ? "padding" : "height",
      keyboardVerticalOffset: Platform.OS === "ios" ? 90 : 0,
    };
  },

  /**
   * Check if haptic feedback is available
   */
  hasHapticFeedback(): boolean {
    return Platform.OS === "ios" || Platform.Version >= 23; // Android API 23+
  },

  /**
   * Get safe bounce behavior for ScrollView
   */
  getScrollViewConfig() {
    return {
      bounces: Platform.OS === "ios",
      overScrollMode: Platform.OS === "android" ? "never" : undefined,
      showsVerticalScrollIndicator: Platform.OS === "ios",
    };
  },
};

/**
 * Battery optimization utilities
 */
export const BatteryOptimization = {
  /**
   * Get recommended polling interval based on battery state
   * (In production, integrate with expo-battery)
   */
  getRecommendedPollingInterval(isLowBattery: boolean = false): number {
    return isLowBattery ? 60000 : 30000; // 60s vs 30s
  },

  /**
   * Should reduce background activity
   */
  shouldReduceBackgroundActivity(isLowBattery: boolean = false): boolean {
    return isLowBattery || MemoryOptimization.isLowMemoryDevice();
  },
};

/**
 * Storage optimization utilities
 */
export const StorageOptimization = {
  /**
   * Get available storage info
   */
  async getStorageInfo(): Promise<{
    totalSize: number;
    freeSize: number;
  } | null> {
    try {
      const freeDiskStorage = await FileSystem.getFreeDiskStorageAsync();
      const totalDiskCapacity = await FileSystem.getTotalDiskCapacityAsync();

      return {
        freeSize: freeDiskStorage,
        totalSize: totalDiskCapacity,
      };
    } catch (error) {
      console.error("Failed to get storage info:", error);
      return null;
    }
  },

  /**
   * Check if storage is low (< 500MB free)
   */
  async isStorageLow(): Promise<boolean> {
    const info = await this.getStorageInfo();
    if (!info) return false;

    const minFreeStorage = 500 * 1024 * 1024; // 500MB
    return info.freeSize < minFreeStorage;
  },

  /**
   * Clean up old cached data
   */
  async cleanupOldCache(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    await ImageOptimization.clearCache();
    await MemoryOptimization.cleanupTempFiles();
  },
};
