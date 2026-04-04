/**
 * Notification Media Service - PN-005
 *
 * Handles rich media content in notifications including:
 * - User avatars
 * - Message images/attachments
 * - Server icons
 * - Media optimization and caching
 * - Fallback handling
 */

import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const MEDIA_CACHE_KEY = "@hearth/notification_media_cache";
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE_MB = 50; // 50MB cache limit

// ============================================================================
// Types
// ============================================================================

export interface MediaAttachment {
  id: string;
  url: string;
  type: "image" | "avatar" | "icon" | "video" | "audio" | "document";
  filename?: string;
  size?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  description?: string;
}

export interface NotificationMediaOptions {
  userAvatar?: string;
  serverIcon?: string;
  attachments?: MediaAttachment[];
  enableThumbnails?: boolean;
  maxImageSize?: number; // Max size in KB for notification images
  fallbackIcon?: string;
}

export interface CachedMediaItem {
  url: string;
  localPath: string;
  type: string;
  cachedAt: number;
  size: number;
  expiresAt: number;
}

// ============================================================================
// Media Cache Management
// ============================================================================

/**
 * Get cached media index
 */
async function getCacheIndex(): Promise<Record<string, CachedMediaItem>> {
  try {
    const cached = await AsyncStorage.getItem(MEDIA_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch (error) {
    console.error("Failed to get media cache index:", error);
    return {};
  }
}

/**
 * Save cache index
 */
async function saveCacheIndex(index: Record<string, CachedMediaItem>): Promise<void> {
  try {
    await AsyncStorage.setItem(MEDIA_CACHE_KEY, JSON.stringify(index));
  } catch (error) {
    console.error("Failed to save media cache index:", error);
  }
}

/**
 * Calculate cache size
 */
async function calculateCacheSize(index: Record<string, CachedMediaItem>): Promise<number> {
  return Object.values(index).reduce((total, item) => total + item.size, 0);
}

/**
 * Clean expired cache items
 */
async function cleanExpiredCache(): Promise<void> {
  const index = await getCacheIndex();
  const now = Date.now();
  let hasChanges = false;

  for (const [key, item] of Object.entries(index)) {
    if (item.expiresAt < now) {
      try {
        await FileSystem.deleteAsync(item.localPath, { idempotent: true });
        delete index[key];
        hasChanges = true;
      } catch (error) {
        console.warn(`Failed to delete expired cache item: ${item.localPath}`, error);
      }
    }
  }

  if (hasChanges) {
    await saveCacheIndex(index);
  }
}

/**
 * Enforce cache size limit
 */
async function enforceCacheLimit(): Promise<void> {
  const index = await getCacheIndex();
  const maxSizeBytes = MAX_CACHE_SIZE_MB * 1024 * 1024;
  const currentSize = await calculateCacheSize(index);

  if (currentSize <= maxSizeBytes) return;

  // Sort by access time (oldest first)
  const items = Object.entries(index)
    .map(([key, item]) => ({ key, ...item }))
    .sort((a, b) => a.cachedAt - b.cachedAt);

  let sizeToRemove = currentSize - maxSizeBytes;

  for (const item of items) {
    if (sizeToRemove <= 0) break;

    try {
      await FileSystem.deleteAsync(item.localPath, { idempotent: true });
      delete index[item.key];
      sizeToRemove -= item.size;
    } catch (error) {
      console.warn(`Failed to delete cache item: ${item.localPath}`, error);
    }
  }

  await saveCacheIndex(index);
}

// ============================================================================
// Media Processing
// ============================================================================

/**
 * Generate a cache key for a URL
 */
function getCacheKey(url: string): string {
  // Simple hash function for cache keys
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Get file extension from URL or MIME type
 */
function getFileExtension(url: string, mimeType?: string): string {
  // Try to extract from URL first
  const urlExt = url.split('.').pop()?.split('?')[0];
  if (urlExt && /^[a-zA-Z0-9]{1,4}$/.test(urlExt)) {
    return urlExt;
  }

  // Fallback to MIME type
  const mimeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  };

  return mimeType ? mimeMap[mimeType] || 'bin' : 'bin';
}

/**
 * Download and cache media file
 */
async function downloadAndCacheMedia(
  url: string,
  type: string,
  maxSizeKB?: number
): Promise<string | null> {
  const cacheKey = getCacheKey(url);
  const index = await getCacheIndex();

  // Check if already cached and not expired
  const existing = index[cacheKey];
  if (existing && existing.expiresAt > Date.now()) {
    try {
      const info = await FileSystem.getInfoAsync(existing.localPath);
      if (info.exists) {
        return existing.localPath;
      }
    } catch (error) {
      // File doesn't exist, remove from cache
      delete index[cacheKey];
    }
  }

  try {
    // Check file size first if possible
    const headResponse = await fetch(url, { method: 'HEAD' });
    const contentLength = headResponse.headers.get('content-length');

    if (contentLength && maxSizeKB) {
      const sizeKB = parseInt(contentLength) / 1024;
      if (sizeKB > maxSizeKB) {
        console.warn(`Media file too large: ${sizeKB}KB > ${maxSizeKB}KB`);
        return null;
      }
    }

    const contentType = headResponse.headers.get('content-type');
    const extension = getFileExtension(url, contentType || undefined);
    const filename = `${cacheKey}.${extension}`;
    const localPath = `${FileSystem.documentDirectory}notification_media/${filename}`;

    // Ensure directory exists
    await FileSystem.makeDirectoryAsync(
      `${FileSystem.documentDirectory}notification_media/`,
      { intermediates: true }
    );

    // Download file
    const downloadResult = await FileSystem.downloadAsync(url, localPath);

    if (!downloadResult.uri) {
      throw new Error('Download failed');
    }

    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    if (!fileInfo.exists) {
      throw new Error('Downloaded file not found');
    }

    // Update cache index
    index[cacheKey] = {
      url,
      localPath,
      type,
      cachedAt: Date.now(),
      size: fileInfo.size || 0,
      expiresAt: Date.now() + CACHE_EXPIRY_MS,
    };

    await saveCacheIndex(index);

    // Clean up cache if needed
    await enforceCacheLimit();

    return localPath;
  } catch (error) {
    console.error(`Failed to cache media from ${url}:`, error);
    return null;
  }
}

/**
 * Optimize image for notification display
 */
async function optimizeImageForNotification(
  localPath: string,
  maxSizeKB: number = 100
): Promise<string | null> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    if (!fileInfo.exists) return null;

    const sizeKB = (fileInfo.size || 0) / 1024;
    if (sizeKB <= maxSizeKB) {
      return localPath; // Already optimized
    }

    // For now, we'll use the original file
    // In a production app, you might use expo-image-manipulator to resize
    console.warn(`Image ${localPath} is ${sizeKB}KB, consider optimizing`);
    return localPath;
  } catch (error) {
    console.error("Failed to optimize image:", error);
    return null;
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Process media attachments for notification
 */
export async function processNotificationMedia(
  options: NotificationMediaOptions
): Promise<{
  userAvatar?: string;
  serverIcon?: string;
  primaryImage?: string;
  attachments: MediaAttachment[];
}> {
  const result = {
    attachments: options.attachments || [],
  };

  try {
    // Process user avatar
    if (options.userAvatar) {
      const cachedAvatar = await downloadAndCacheMedia(
        options.userAvatar,
        'avatar',
        50 // 50KB max for avatars
      );
      if (cachedAvatar) {
        (result as any).userAvatar = cachedAvatar;
      }
    }

    // Process server icon
    if (options.serverIcon) {
      const cachedIcon = await downloadAndCacheMedia(
        options.serverIcon,
        'icon',
        50 // 50KB max for icons
      );
      if (cachedIcon) {
        (result as any).serverIcon = cachedIcon;
      }
    }

    // Process first image attachment as primary
    const firstImage = options.attachments?.find(a => a.type === 'image');
    if (firstImage) {
      const cachedImage = await downloadAndCacheMedia(
        firstImage.url,
        'image',
        options.maxImageSize || 200 // 200KB max for notification images
      );
      if (cachedImage) {
        const optimizedImage = await optimizeImageForNotification(cachedImage);
        if (optimizedImage) {
          (result as any).primaryImage = optimizedImage;
        }
      }
    }

    // Clean up old cache items periodically
    if (Math.random() < 0.1) {
      await cleanExpiredCache();
    }

  } catch (error) {
    console.error("Failed to process notification media:", error);
  }

  return result;
}

/**
 * Get optimal notification image
 */
export async function getNotificationImage(
  url: string,
  type: 'avatar' | 'icon' | 'image' | 'thumbnail' = 'image'
): Promise<string | null> {
  const maxSizes = {
    avatar: 50,
    icon: 50,
    image: 200,
    thumbnail: 100,
  };

  return downloadAndCacheMedia(url, type, maxSizes[type]);
}

/**
 * Create media attachments for notification content
 */
export function createNotificationAttachments(
  processedMedia: Awaited<ReturnType<typeof processNotificationMedia>>
): { url: string; options?: Record<string, any> }[] {
  const attachments: { url: string; options?: Record<string, any> }[] = [];

  // Add primary image
  if (processedMedia.primaryImage) {
    attachments.push({
      url: processedMedia.primaryImage,
      options: {
        typeHint: "public.image",
      },
    });
  }

  // Add user avatar (iOS can show multiple attachments)
  if (Platform.OS === 'ios' && processedMedia.userAvatar) {
    attachments.push({
      url: processedMedia.userAvatar,
      options: {
        typeHint: "public.image",
      },
    });
  }

  return attachments;
}

/**
 * Clear notification media cache
 */
export async function clearNotificationMediaCache(): Promise<void> {
  try {
    const index = await getCacheIndex();

    // Delete all cached files
    for (const item of Object.values(index)) {
      try {
        await FileSystem.deleteAsync(item.localPath, { idempotent: true });
      } catch (error) {
        console.warn(`Failed to delete cache file: ${item.localPath}`, error);
      }
    }

    // Clear cache directory
    const cacheDir = `${FileSystem.documentDirectory}notification_media/`;
    await FileSystem.deleteAsync(cacheDir, { idempotent: true });

    // Clear index
    await AsyncStorage.removeItem(MEDIA_CACHE_KEY);

    console.log("Notification media cache cleared");
  } catch (error) {
    console.error("Failed to clear media cache:", error);
  }
}

/**
 * Get cache statistics
 */
export async function getNotificationMediaCacheStats(): Promise<{
  itemCount: number;
  totalSizeBytes: number;
  totalSizeMB: number;
}> {
  try {
    const index = await getCacheIndex();
    const totalSizeBytes = await calculateCacheSize(index);

    return {
      itemCount: Object.keys(index).length,
      totalSizeBytes,
      totalSizeMB: Math.round((totalSizeBytes / (1024 * 1024)) * 100) / 100,
    };
  } catch (error) {
    console.error("Failed to get cache stats:", error);
    return { itemCount: 0, totalSizeBytes: 0, totalSizeMB: 0 };
  }
}

// ============================================================================
// Fallback Avatars & Icons
// ============================================================================

/**
 * Generate fallback avatar URL for user
 */
export function generateFallbackAvatar(
  userId: string,
  username?: string
): string {
  // Generate a consistent color based on user ID
  const colors = [
    "#7c3aed", "#2563eb", "#dc2626", "#ea580c",
    "#ca8a04", "#16a34a", "#0891b2", "#c026d3"
  ];

  const colorIndex = Math.abs(
    userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  ) % colors.length;

  const initials = username
    ? username.slice(0, 2).toUpperCase()
    : userId.slice(0, 2).toUpperCase();

  // Return a data URL with a simple colored circle and initials
  // In a real app, you might use a service like unavatar.io or generate these server-side
  return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="${colors[colorIndex]}"/><text x="32" y="42" text-anchor="middle" fill="white" font-size="24" font-family="sans-serif">${initials}</text></svg>`;
}

/**
 * Generate fallback server icon
 */
export function generateFallbackServerIcon(
  serverId: string,
  serverName?: string
): string {
  const colors = [
    "#5865f2", "#57f287", "#fee75c", "#ed4245",
    "#eb459e", "#ff6b35", "#00d9ff", "#7c3aed"
  ];

  const colorIndex = Math.abs(
    serverId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  ) % colors.length;

  const initials = serverName
    ? serverName.slice(0, 2).toUpperCase()
    : serverId.slice(0, 2).toUpperCase();

  return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${colors[colorIndex]}"/><text x="32" y="42" text-anchor="middle" fill="white" font-size="20" font-family="sans-serif">${initials}</text></svg>`;
}