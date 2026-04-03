/**
 * File Upload Service
 * 
 * Infrastructure for handling file uploads including:
 * - Image selection from gallery/camera
 * - File compression
 * - Upload queue management
 * - CDN URL generation
 * - Progress tracking
 */

export {
  fileUploadService,
  default as FileUploadService,
} from './FileUploadService';

export {
  imagePickerService,
  default as ImagePickerService,
} from './ImagePickerService';

export {
  useFileUpload,
  default as useFileUploadHook,
} from './useFileUpload';

export type {
  ImagePickerOptions,
  CameraCaptureOptions,
  MediaPermissionStatus,
  CameraPermissionStatus,
} from './ImagePickerService';

export type {
  UseFileUploadOptions,
  UseFileUploadReturn,
} from './useFileUpload';

export type {
  LocalFile,
  UploadOptions,
  UploadResponse,
  UploadJob,
  UploadStatus,
  UploadPriority,
  UploadProgressEvent,
  UploadConfig,
  FileType,
  CDNPatterns,
} from './types';

export type {
  UploadQueueEvent,
  UploadQueueEventType,
} from './FileUploadService';

export {
  DEFAULT_UPLOAD_CONFIG,
  formatFileSize,
  getFileTypeFromMimeType,
  isSupportedFileType,
} from './types';
