/**
 * File Upload Types
 * TypeScript types for file upload infrastructure
 */

import { Attachment } from '../../../lib/types';

/** Supported file types */
export type FileType = 'image' | 'video' | 'audio' | 'document' | 'archive';

/** File upload status */
export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled';

/** Upload priority levels */
export type UploadPriority = 'high' | 'normal' | 'low';

/** Upload progress callback */
export interface UploadProgressEvent {
  /** Bytes uploaded so far */
  loaded: number;
  /** Total bytes to upload */
  total: number;
  /** Percentage complete (0-100) */
  percentage: number;
  /** Upload speed in bytes per second (if available) */
  speed?: number;
  /** Estimated time remaining in seconds (if available) */
  eta?: number;
}

/** Local file before upload */
export interface LocalFile {
  /** Unique local identifier */
  localId: string;
  /** URI to the local file */
  uri: string;
  /** Original filename */
  filename: string;
  /** MIME type */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** Detected file type */
  fileType: FileType;
  /** Width (for images/videos) */
  width?: number;
  /** Height (for images/videos) */
  height?: number;
  /** Duration (for audio/video) in seconds */
  duration?: number;
  /** Thumbnail URI (for images/videos) */
  thumbnailUri?: string;
  /** Whether the file has been compressed */
  compressed: boolean;
  /** Original size before compression */
  originalSize?: number;
}

/** Upload configuration options */
export interface UploadOptions {
  /** Target channel or conversation ID */
  targetId: string;
  /** Target type (channel or conversation) */
  targetType: 'channel' | 'conversation';
  /** Upload priority */
  priority?: UploadPriority;
  /** Whether to compress images before upload */
  compress?: boolean;
  /** Custom compression quality (0-1) */
  compressionQuality?: number;
  /** Maximum file size in bytes (auto-reject larger files) */
  maxFileSize?: number;
  /** Whether to generate a thumbnail */
  generateThumbnail?: boolean;
  /** Message ID being replied to (if any) */
  replyToId?: string;
}

/** Upload result from the server */
export interface UploadResponse {
  /** Server-assigned ID */
  id: string;
  /** CDN URL for the file */
  url: string;
  /** Thumbnail URL (for images/videos) */
  thumbnailUrl?: string;
  /** Original filename */
  filename: string;
  /** MIME type */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** File type */
  fileType: FileType;
  /** Width (for images/videos) */
  width?: number;
  /** Height (for images/videos) */
  height?: number;
  /** Duration (for audio/video) in seconds */
  duration?: number;
  /** Upload timestamp */
  createdAt: string;
}

/** Active upload job */
export interface UploadJob {
  /** Unique upload identifier */
  uploadId: string;
  /** Local file being uploaded */
  localFile: LocalFile;
  /** Upload options used */
  options: UploadOptions;
  /** Current upload status */
  status: UploadStatus;
  /** Upload progress (0-100) */
  progress: number;
  /** Error message if failed */
  error?: string;
  /** Server response if completed */
  result?: UploadResponse;
  /** Retry count */
  retryCount: number;
  /** Created timestamp */
  createdAt: Date;
  /** Started timestamp */
  startedAt?: Date;
  /** Completed timestamp */
  completedAt?: Date;
}

/** CDN URL patterns */
export interface CDNPatterns {
  /** Base URL for attachments */
  attachments: string;
  /** URL pattern for thumbnails (use {id} placeholder) */
  thumbnails: string;
  /** URL pattern for images (use {id} placeholder) */
  images: string;
}

/** Upload configuration */
export interface UploadConfig {
  /** Maximum concurrent uploads */
  maxConcurrentUploads: number;
  /** Maximum retries per file */
  maxRetries: number;
  /** Base retry delay in ms */
  retryBaseDelay: number;
  /** Maximum retry delay in ms */
  retryMaxDelay: number;
  /** Upload chunk size in bytes (for resumable uploads) */
  chunkSize: number;
  /** CDN patterns for URL generation */
  cdnPatterns: CDNPatterns;
  /** File size limits by type */
  fileSizeLimits: Record<FileType, number>;
}

/** Default upload configuration */
export const DEFAULT_UPLOAD_CONFIG: UploadConfig = {
  maxConcurrentUploads: 3,
  maxRetries: 3,
  retryBaseDelay: 1000,
  retryMaxDelay: 30000,
  chunkSize: 5 * 1024 * 1024, // 5MB
  cdnPatterns: {
    attachments: 'https://cdn.hearth.example.com/attachments/{id}',
    thumbnails: 'https://cdn.hearth.example.com/thumbnails/{id}',
    images: 'https://cdn.hearth.example.com/images/{id}',
  },
  fileSizeLimits: {
    image: 25 * 1024 * 1024, // 25MB
    video: 100 * 1024 * 1024, // 100MB
    audio: 25 * 1024 * 1024, // 25MB
    document: 25 * 1024 * 1024, // 25MB
    archive: 25 * 1024 * 1024, // 25MB
  },
};

/** Convert Attachment type to UploadResponse */
export function attachmentToUploadResponse(attachment: Attachment): UploadResponse {
  const fileType = getFileTypeFromMimeType(attachment.contentType);
  return {
    id: attachment.id,
    url: attachment.url,
    filename: attachment.filename,
    mimeType: attachment.contentType,
    size: attachment.size,
    fileType,
    createdAt: new Date().toISOString(),
  };
}

/** Determine file type from MIME type */
export function getFileTypeFromMimeType(mimeType: string): FileType {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('application/zip') || 
      mimeType.startsWith('application/x-rar') ||
      mimeType.startsWith('application/x-7z')) return 'archive';
  return 'document';
}

/** Check if file type is supported */
export function isSupportedFileType(mimeType: string): boolean {
  const supportedTypes = [
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
    // Videos
    'video/mp4', 'video/quicktime', 'video/webm',
    // Audio
    'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/ogg',
    // Documents
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'text/rtf',
    // Archives
    'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
  ];
  return supportedTypes.includes(mimeType);
}

/** Format bytes to human-readable string */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}
