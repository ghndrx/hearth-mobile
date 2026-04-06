export type FileType = 'image' | 'video' | 'audio' | 'document' | 'archive';

export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled';

export interface LocalFile {
  localId: string;
  uri: string;
  name: string;
  type: string;
  size: number;
  fileType: FileType;
  width?: number;
  height?: number;
  duration?: number;
  thumbnailUri?: string;
  createdAt: Date;
}

export interface UploadResponse {
  id: string;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  contentType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  createdAt: string;
}

export interface UploadJob {
  uploadId: string;
  localFile: LocalFile;
  status: UploadStatus;
  progress: number;
  speed?: number;
  error?: string;
  response?: UploadResponse;
  retryCount: number;
  startTime?: Date;
  endTime?: Date;
}

export interface UploadConfig {
  maxConcurrentUploads: number;
  maxRetries: number;
  chunkSize: number;
  timeout: number;
  maxFileSizes: Record<FileType, number>;
  allowedMimeTypes: Record<FileType, string[]>;
  cdnUrlPattern?: string;
  uploadEndpoint: string;
}

export interface UploadProgressEvent {
  uploadId: string;
  progress: number;
  speed?: number;
  status: UploadStatus;
}

export interface UploadQueueListener {
  onProgress?: (event: UploadProgressEvent) => void;
  onComplete?: (uploadId: string, response: UploadResponse) => void;
  onError?: (uploadId: string, error: string) => void;
  onStatusChange?: (uploadId: string, status: UploadStatus) => void;
}

export interface CameraOptions {
  quality: number;
  allowsEditing: boolean;
  aspect: [number, number];
  base64: boolean;
}

export interface ImagePickerOptions {
  mediaTypes: 'images' | 'videos' | 'all';
  allowsEditing: boolean;
  quality: number;
  allowsMultipleSelection: boolean;
  selectionLimit?: number;
}