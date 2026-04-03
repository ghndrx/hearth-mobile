/**
 * File Upload Service
 * Handles file uploads with compression, retry logic, and CDN integration
 */

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { nanoid } from 'nanoid';
import { apiClient } from '../../../lib/services/api';
import { imageProcessingService, COMPRESSION_PRESETS } from '../../../lib/services/imageProcessing';
import { getAttachmentUrl, getThumbnailUrl } from '../../../lib/services/cdn';
import {
  LocalFile,
  UploadOptions,
  UploadResponse,
  UploadJob,
  UploadStatus,
  UploadProgressEvent,
  UploadConfig,
  DEFAULT_UPLOAD_CONFIG,
  formatFileSize,
  getFileTypeFromMimeType,
  CDNPatterns,
} from './types';

/** Upload queue event types */
export type UploadQueueEventType = 
  | 'job_added'
  | 'job_started'
  | 'job_progress'
  | 'job_completed'
  | 'job_failed'
  | 'job_cancelled'
  | 'queue_empty';

/** Upload queue event */
export interface UploadQueueEvent {
  type: UploadQueueEventType;
  job?: UploadJob;
  queue?: UploadJob[];
}

/** Upload queue listener */
export type UploadQueueListener = (event: UploadQueueEvent) => void;

class FileUploadService {
  private config: UploadConfig;
  private uploadQueue: UploadJob[] = [];
  private activeUploads: Map<string, UploadJob> = new Map();
  private listeners: Set<UploadQueueListener> = new Set();
  private isProcessing = false;

  constructor(config: UploadConfig = DEFAULT_UPLOAD_CONFIG) {
    this.config = config;
  }

  /**
   * Update the upload configuration
   */
  setConfig(config: Partial<UploadConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current upload configuration
   */
  getConfig(): UploadConfig {
    return { ...this.config };
  }

  /**
   * Set CDN patterns for URL generation
   */
  setCDNPatterns(patterns: Partial<CDNPatterns>): void {
    this.config.cdnPatterns = { ...this.config.cdnPatterns, ...patterns };
  }

  /**
   * Add a listener for upload queue events
   */
  addListener(listener: UploadQueueListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit an event to all listeners
   */
  private emit(event: UploadQueueEvent): void {
    this.listeners.forEach(listener => listener(event));
  }

  /**
   * Get the current upload queue
   */
  getQueue(): UploadJob[] {
    return [...this.uploadQueue];
  }

  /**
   * Get an upload job by ID
   */
  getJob(uploadId: string): UploadJob | undefined {
    return this.uploadQueue.find(job => job.uploadId === uploadId) ||
           this.activeUploads.get(uploadId);
  }

  /**
   * Create a LocalFile from a URI
   */
  async createLocalFile(
    uri: string,
    filename: string,
    mimeType: string,
    size?: number
  ): Promise<LocalFile> {
    // Get file info if size not provided
    let fileSize = size;
    if (!fileSize) {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists && 'size' in info) {
        fileSize = info.size;
      }
    }

    // Get dimensions for images/videos
    let width: number | undefined;
    let height: number | undefined;

    if (mimeType.startsWith('image/') || mimeType.startsWith('video/')) {
      try {
        const dimensions = await imageProcessingService.getImageDimensions(uri);
        width = dimensions.width;
        height = dimensions.height;
      } catch {
        // Ignore dimension errors
      }
    }

    return {
      localId: nanoid(),
      uri,
      filename,
      mimeType,
      size: fileSize || 0,
      fileType: getFileTypeFromMimeType(mimeType),
      width,
      height,
      compressed: false,
    };
  }

  /**
   * Compress a local file (images only)
   */
  async compressFile(
    localFile: LocalFile,
    quality: number = 0.8
  ): Promise<LocalFile> {
    if (!localFile.mimeType.startsWith('image/')) {
      return localFile;
    }

    // Check if compression is needed
    const needsCompression = await imageProcessingService.needsCompression(
      localFile.uri,
      1024 * 1024 // 1MB
    );

    if (!needsCompression) {
      return localFile;
    }

    // Compress the image
    const result = await imageProcessingService.compressToTargetSize(localFile.uri, {
      quality,
      maxWidth: 1200,
      maxHeight: 1200,
      targetSizeBytes: 500 * 1024, // 500KB target
      minQuality: 0.5,
    });

    // Create new local file with compressed data
    const compressedFile: LocalFile = {
      ...localFile,
      uri: result.uri,
      size: result.fileSize,
      width: result.width,
      height: result.height,
      compressed: true,
      originalSize: localFile.originalSize || localFile.size,
    };

    return compressedFile;
  }

  /**
   * Add a file to the upload queue
   */
  async queueUpload(
    localFile: LocalFile,
    options: UploadOptions
  ): Promise<string> {
    // Check file size limits
    const sizeLimit = this.config.fileSizeLimits[localFile.fileType];
    if (localFile.size > sizeLimit) {
      throw new Error(
        `File size (${formatFileSize(localFile.size)}) exceeds limit (${formatFileSize(sizeLimit)}) for ${localFile.fileType}`
      );
    }

    // Create upload job
    const job: UploadJob = {
      uploadId: nanoid(),
      localFile,
      options,
      status: 'pending',
      progress: 0,
      retryCount: 0,
      createdAt: new Date(),
    };

    this.uploadQueue.push(job);
    this.emit({ type: 'job_added', job, queue: this.getQueue() });

    // Start processing if not already
    this.processQueue();

    return job.uploadId;
  }

  /**
   * Cancel an upload
   */
  cancelUpload(uploadId: string): boolean {
    // Check queue
    const queueIndex = this.uploadQueue.findIndex(job => job.uploadId === uploadId);
    if (queueIndex !== -1) {
      const job = this.uploadQueue[queueIndex];
      job.status = 'cancelled';
      this.uploadQueue.splice(queueIndex, 1);
      this.emit({ type: 'job_cancelled', job, queue: this.getQueue() });
      return true;
    }

    // Check active uploads
    const activeJob = this.activeUploads.get(uploadId);
    if (activeJob) {
      activeJob.status = 'cancelled';
      this.activeUploads.delete(uploadId);
      this.emit({ type: 'job_cancelled', job: activeJob });
      return true;
    }

    return false;
  }

  /**
   * Retry a failed upload
   */
  async retryUpload(uploadId: string): Promise<void> {
    const job = this.uploadQueue.find(j => j.uploadId === uploadId) ||
                this.activeUploads.get(uploadId);

    if (!job) {
      throw new Error('Upload job not found');
    }

    if (job.status !== 'failed') {
      throw new Error('Can only retry failed uploads');
    }

    // Reset job status and add back to queue
    job.status = 'pending';
    job.progress = 0;
    job.error = undefined;

    if (!this.uploadQueue.includes(job)) {
      this.uploadQueue.push(job);
    }

    this.processQueue();
  }

  /**
   * Get the number of pending uploads
   */
  getPendingCount(): number {
    return this.uploadQueue.length;
  }

  /**
   * Get the number of active uploads
   */
  getActiveCount(): number {
    return this.activeUploads.size;
  }

  /**
   * Process the upload queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.uploadQueue.length > 0) {
      // Check if we can start more uploads
      if (this.activeUploads.size >= this.config.maxConcurrentUploads) {
        await this.waitForSlot();
        continue;
      }

      // Get next pending job
      const jobIndex = this.uploadQueue.findIndex(j => j.status === 'pending');
      if (jobIndex === -1) break;

      const job = this.uploadQueue.splice(jobIndex, 1)[0];
      this.startUpload(job);
    }

    if (this.uploadQueue.length === 0 && this.activeUploads.size === 0) {
      this.emit({ type: 'queue_empty' });
    }

    this.isProcessing = false;
  }

  /**
   * Wait for an upload slot to become available
   */
  private waitForSlot(): Promise<void> {
    return new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (this.activeUploads.size < this.config.maxConcurrentUploads) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Start an upload job
   */
  private async startUpload(job: UploadJob): Promise<void> {
    job.status = 'uploading';
    job.startedAt = new Date();
    this.activeUploads.set(job.uploadId, job);
    this.emit({ type: 'job_started', job });

    try {
      // Compress if enabled
      let fileToUpload = job.localFile;
      if (job.options.compress && job.localFile.mimeType.startsWith('image/')) {
        fileToUpload = await this.compressFile(
          job.localFile,
          job.options.compressionQuality || 0.8
        );
        job.localFile = fileToUpload;
      }

      // Perform the upload
      const result = await this.performUpload(job, fileToUpload);

      job.status = 'completed';
      job.progress = 100;
      job.result = result;
      job.completedAt = new Date();

      this.activeUploads.delete(job.uploadId);
      this.emit({ type: 'job_completed', job, queue: this.getQueue() });
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Upload failed';
      job.completedAt = new Date();

      this.activeUploads.delete(job.uploadId);

      // Retry if under max retries
      if (job.retryCount < this.config.maxRetries) {
        job.retryCount++;
        const delay = Math.min(
          this.config.retryBaseDelay * Math.pow(2, job.retryCount),
          this.config.retryMaxDelay
        );
        
        setTimeout(() => {
          if (job.status === 'failed') {
            this.uploadQueue.unshift(job);
            job.status = 'pending';
            this.processQueue();
          }
        }, delay);
      } else {
        this.emit({ type: 'job_failed', job, queue: this.getQueue() });
      }
    }
  }

  /**
   * Perform the actual upload
   */
  private async performUpload(
    job: UploadJob,
    localFile: LocalFile
  ): Promise<UploadResponse> {
    const { targetId, targetType, replyToId } = job.options;

    // Build the endpoint URL
    const endpoint = `/media/upload`;
    const channelId = targetType === 'channel' ? targetId : undefined;
    const conversationId = targetType === 'conversation' ? targetId : undefined;

    // Create form data
    const formData = new FormData();
    formData.append('file', {
      uri: Platform.OS === 'ios' ? localFile.uri.replace('file://', '') : localFile.uri,
      type: localFile.mimeType,
      name: localFile.filename,
    } as unknown as Blob);

    if (channelId) {
      formData.append('channelId', channelId);
    }
    if (conversationId) {
      formData.append('conversationId', conversationId);
    }
    if (replyToId) {
      formData.append('replyToId', replyToId);
    }

    // Upload with progress tracking
    const result = await apiClient.upload<{
      id: string;
      url: string;
      thumbnailUrl?: string;
      filename: string;
      contentType: string;
      size: number;
      width?: number;
      height?: number;
      createdAt: string;
    }>(endpoint, formData, {
      requireAuth: true,
      onProgress: (event) => {
        if (event.total) {
          const percentage = (event.loaded / event.total) * 100;
          job.progress = percentage;
          this.emit({ type: 'job_progress', job });
        }
      },
    });

    if (result.error || !result.data) {
      throw new Error(result.error?.message || 'Upload failed');
    }

    // Transform to UploadResponse
    return {
      id: result.data.id,
      url: getAttachmentUrl(result.data.url),
      thumbnailUrl: result.data.thumbnailUrl 
        ? getThumbnailUrl(result.data.thumbnailUrl)
        : undefined,
      filename: result.data.filename,
      mimeType: result.data.contentType,
      size: result.data.size,
      fileType: getFileTypeFromMimeType(result.data.contentType),
      width: result.data.width,
      height: result.data.height,
      createdAt: result.data.createdAt,
    };
  }

  /**
   * Generate a mock CDN URL for a local file (used when CDN is not configured)
   */
  generateMockCDNUrl(localFile: LocalFile): string {
    const baseUrl = this.config.cdnPatterns.attachments.replace('{id}', localFile.localId);
    return `${baseUrl}/${localFile.filename}`;
  }

  /**
   * Clean up completed uploads from the queue
   */
  clearCompleted(): void {
    this.uploadQueue = this.uploadQueue.filter(job => job.status !== 'completed');
  }

  /**
   * Cancel all uploads
   */
  cancelAll(): void {
    // Cancel all queue items
    this.uploadQueue.forEach(job => {
      job.status = 'cancelled';
      this.emit({ type: 'job_cancelled', job });
    });
    this.uploadQueue = [];

    // Cancel all active uploads
    this.activeUploads.forEach(job => {
      job.status = 'cancelled';
      this.emit({ type: 'job_cancelled', job });
    });
    this.activeUploads.clear();
  }
}

// Export singleton instance
export const fileUploadService = new FileUploadService();
export default fileUploadService;
