/**
 * CDN Service
 * Handles CDN URL construction, file URL resolution, and attachment URL management
 */

import Constants from "expo-constants";

/** CDN configuration */
interface CDNConfig {
  /** Base CDN URL */
  baseUrl: string;
  /** CDN URL prefix for assets */
  assetsPrefix: string;
  /** Whether CDN is enabled */
  enabled: boolean;
}

/** Default CDN configuration from app config */
function getDefaultConfig(): CDNConfig {
  const extra = Constants.expoConfig?.extra || {};
  return {
    baseUrl: extra.cdnUrl || extra.apiUrl?.replace("/api/v1", "") || "https://hearth.example.com",
    assetsPrefix: extra.cdnAssetsPrefix || "/assets",
    enabled: extra.cdnEnabled !== false, // CDN enabled by default unless explicitly disabled
  };
}

const config = getDefaultConfig();

/**
 * Build a full CDN URL for an attachment
 */
export function getAttachmentUrl(path: string): string {
  if (!path) return "";
  
  // Already a full URL
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  
  // CDN disabled or no base URL - return as relative path
  if (!config.enabled || !config.baseUrl) {
    return path;
  }
  
  // Ensure path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  
  return `${config.baseUrl}${config.assetsPrefix}${normalizedPath}`;
}

/**
 * Build a thumbnail URL for an image attachment
 * Uses the same CDN but could be configured to use a separate thumbnail service
 */
export function getThumbnailUrl(path: string, size: "small" | "medium" | "large" = "medium"): string {
  const baseUrl = getAttachmentUrl(path);
  
  if (!config.enabled) {
    return baseUrl;
  }
  
  // Add thumbnail query param if CDN supports it
  const sizeMap = {
    small: 100,
    medium: 300,
    large: 600,
  };
  
  const queryParams = new URLSearchParams({
    thumb: sizeMap[size].toString(),
  });
  
  return `${baseUrl}?${queryParams.toString()}`;
}

/**
 * Check if a URL points to a local file (not remote)
 */
export function isLocalFile(uri: string): boolean {
  if (!uri) return false;
  
  // Local file URIs
  return (
    uri.startsWith("file://") ||
    uri.startsWith("content://") ||
    uri.startsWith("ph://") || // iOS Photo Library
    uri.startsWith("///") || // Android local file
    uri.startsWith("assets-library://")
  );
}

/**
 * Get a display URL for showing in the UI
 * Returns the CDN URL for remote files or local URI for local files
 */
export function getDisplayUrl(url: string): string {
  if (isLocalFile(url)) {
    return url;
  }
  return getAttachmentUrl(url);
}

/**
 * Parse attachment data from API response
 */
export interface AttachmentData {
  id: string;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  contentType: string;
  size: number;
  width?: number;
  height?: number;
}

/**
 * Transform raw attachment from API to include CDN URLs
 */
export function transformAttachment(attachment: {
  id: string;
  url?: string;
  filename?: string;
  content_type?: string;
  size?: number;
  width?: number;
  height?: string;
}): AttachmentData {
  const url = attachment.url || "";
  
  return {
    id: attachment.id,
    url: getAttachmentUrl(url),
    thumbnailUrl: url ? getThumbnailUrl(url) : undefined,
    filename: attachment.filename || "attachment",
    contentType: attachment.content_type || "application/octet-stream",
    size: attachment.size || 0,
    width: attachment.width,
    height: attachment.height ? parseInt(String(attachment.height), 10) : undefined,
  };
}

/**
 * Check if content type is an image
 */
export function isImage(contentType: string): boolean {
  return contentType.startsWith("image/");
}

/**
 * Check if content type is a video
 */
export function isVideo(contentType: string): boolean {
  return contentType.startsWith("video/");
}

/**
 * Check if content type is audio
 */
export function isAudio(contentType: string): boolean {
  return contentType.startsWith("audio/");
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  
  const units = ["B", "KB", "MB", "GB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

// Re-export config for testing
export { config as cdnConfig };
