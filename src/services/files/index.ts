/**
 * File Attachment Services
 *
 * Services for file attachment, document handling, and media management
 */

export { default as FileAttachmentService } from './FileAttachmentService';
export type {
  FileAttachment,
  FileValidationResult,
  FileUploadOptions,
} from './FileAttachmentService';

export { default as FileUploadService } from './FileUploadService';
export type {
  UploadProgress,
  UploadResult,
  UploadOptions,
  CompressionOptions,
} from './FileUploadService';