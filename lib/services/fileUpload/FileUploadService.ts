import * as FileSystem from 'expo-file-system';
import {
  LocalFile,
  UploadJob,
  UploadStatus,
  UploadConfig,
  UploadResponse,
  UploadProgressEvent,
  UploadQueueListener,
  FileType,
} from '../../types';

export class FileUploadService {
  private static instance: FileUploadService;
  private uploadQueue: UploadJob[] = [];
  private activeUploads: Map<string, UploadJob> = new Map();
  private listeners: Set<UploadQueueListener> = new Set();
  private config: UploadConfig;

  private constructor() {
    this.config = this.getDefaultConfig();
  }

  public static getInstance(): FileUploadService {
    if (!FileUploadService.instance) {
      FileUploadService.instance = new FileUploadService();
    }
    return FileUploadService.instance;
  }

  /**
   * Configure the upload service
   */
  configure(config: Partial<UploadConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Add a listener for upload events
   */
  addListener(listener: UploadQueueListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Queue a file for upload
   */
  async queueUpload(localFile: LocalFile): Promise<string> {
    try {
      // Validate file
      this.validateFile(localFile);

      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const uploadJob: UploadJob = {
        uploadId,
        localFile,
        status: 'pending',
        progress: 0,
        retryCount: 0,
      };

      this.uploadQueue.push(uploadJob);
      this.notifyListeners('onStatusChange', uploadId, 'pending');

      // Start processing queue
      this.processQueue();

      return uploadId;
    } catch (error) {
      console.error('Error queuing upload:', error);
      throw error;
    }
  }

  /**
   * Cancel an upload
   */
  async cancelUpload(uploadId: string): Promise<void> {
    try {
      // Remove from queue if pending
      const queueIndex = this.uploadQueue.findIndex(job => job.uploadId === uploadId);
      if (queueIndex !== -1) {
        this.uploadQueue.splice(queueIndex, 1);
      }

      // Cancel if active
      const activeJob = this.activeUploads.get(uploadId);
      if (activeJob) {
        activeJob.status = 'cancelled';
        this.activeUploads.delete(uploadId);
        this.notifyListeners('onStatusChange', uploadId, 'cancelled');
      }
    } catch (error) {
      console.error('Error cancelling upload:', error);
      throw error;
    }
  }

  /**
   * Retry a failed upload
   */
  async retryUpload(uploadId: string): Promise<void> {
    try {
      const job = this.findJob(uploadId);
      if (!job || job.status !== 'failed') {
        throw new Error('Upload not found or not in failed state');
      }

      if (job.retryCount >= this.config.maxRetries) {
        throw new Error('Maximum retry count exceeded');
      }

      job.status = 'pending';
      job.progress = 0;
      job.error = undefined;

      this.uploadQueue.push(job);
      this.notifyListeners('onStatusChange', uploadId, 'pending');

      this.processQueue();
    } catch (error) {
      console.error('Error retrying upload:', error);
      throw error;
    }
  }

  /**
   * Get upload job status
   */
  getUploadStatus(uploadId: string): UploadJob | null {
    return this.findJob(uploadId) || null;
  }

  /**
   * Get all upload jobs
   */
  getAllUploads(): UploadJob[] {
    const allJobs = [...this.uploadQueue];
    for (const job of this.activeUploads.values()) {
      allJobs.push(job);
    }
    return allJobs;
  }

  /**
   * Clear all completed uploads
   */
  clearCompleted(): void {
    this.uploadQueue = this.uploadQueue.filter(job =>
      job.status !== 'completed' && job.status !== 'failed' && job.status !== 'cancelled'
    );
  }

  /**
   * Process upload queue
   */
  private async processQueue(): Promise<void> {
    if (this.activeUploads.size >= this.config.maxConcurrentUploads) {
      return;
    }

    const pendingJob = this.uploadQueue.find(job => job.status === 'pending');
    if (!pendingJob) {
      return;
    }

    // Remove from queue and add to active
    const jobIndex = this.uploadQueue.findIndex(job => job.uploadId === pendingJob.uploadId);
    this.uploadQueue.splice(jobIndex, 1);
    this.activeUploads.set(pendingJob.uploadId, pendingJob);

    try {
      await this.uploadFile(pendingJob);
    } catch (error) {
      console.error('Upload error:', error);
    }

    // Process next in queue
    setTimeout(() => this.processQueue(), 100);
  }

  /**
   * Upload a single file
   */
  private async uploadFile(job: UploadJob): Promise<void> {
    try {
      job.status = 'uploading';
      job.startTime = new Date();
      this.notifyListeners('onStatusChange', job.uploadId, 'uploading');

      const response = await this.performUpload(job);

      job.status = 'completed';
      job.progress = 100;
      job.endTime = new Date();
      job.response = response;

      this.activeUploads.delete(job.uploadId);
      this.notifyListeners('onComplete', job.uploadId, response);
      this.notifyListeners('onStatusChange', job.uploadId, 'completed');

    } catch (error) {
      job.retryCount++;
      job.error = error instanceof Error ? error.message : 'Upload failed';

      if (job.retryCount < this.config.maxRetries) {
        // Retry with exponential backoff
        const delay = Math.pow(2, job.retryCount) * 1000;
        setTimeout(() => {
          job.status = 'pending';
          this.uploadQueue.push(job);
          this.activeUploads.delete(job.uploadId);
          this.processQueue();
        }, delay);
      } else {
        job.status = 'failed';
        this.activeUploads.delete(job.uploadId);
        this.notifyListeners('onError', job.uploadId, job.error);
        this.notifyListeners('onStatusChange', job.uploadId, 'failed');
      }
    }
  }

  /**
   * Perform the actual file upload
   */
  private async performUpload(job: UploadJob): Promise<UploadResponse> {
    try {
      const { localFile } = job;

      // For now, we'll simulate an upload to a mock endpoint
      // In a real implementation, this would use FileSystem.uploadAsync or fetch
      const uploadResult = await FileSystem.uploadAsync(
        this.config.uploadEndpoint,
        localFile.uri,
        {
          fieldName: 'file',
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          parameters: {
            filename: localFile.name,
            type: localFile.type,
          },
        }
      );

      // Parse response
      const response: UploadResponse = JSON.parse(uploadResult.body);

      return {
        id: response.id || `file_${Date.now()}`,
        url: response.url || localFile.uri, // Fallback to local URI for demo
        thumbnailUrl: response.thumbnailUrl,
        filename: localFile.name,
        contentType: localFile.type,
        size: localFile.size,
        width: localFile.width,
        height: localFile.height,
        duration: localFile.duration,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  /**
   * Validate file before upload
   */
  private validateFile(localFile: LocalFile): void {
    const { fileType, size, type } = localFile;

    // Check file size
    const maxSize = this.config.maxFileSizes[fileType];
    if (size > maxSize) {
      throw new Error(`File size exceeds maximum allowed size for ${fileType}`);
    }

    // Check MIME type
    const allowedTypes = this.config.allowedMimeTypes[fileType];
    if (!allowedTypes.includes(type)) {
      throw new Error(`File type ${type} is not allowed for ${fileType}`);
    }
  }

  /**
   * Find a job by upload ID
   */
  private findJob(uploadId: string): UploadJob | undefined {
    return (
      this.uploadQueue.find(job => job.uploadId === uploadId) ||
      this.activeUploads.get(uploadId)
    );
  }

  /**
   * Notify all listeners of an event
   */
  private notifyListeners(
    event: keyof UploadQueueListener,
    ...args: any[]
  ): void {
    this.listeners.forEach(listener => {
      if (listener[event]) {
        try {
          (listener[event] as any)(...args);
        } catch (error) {
          console.error('Listener error:', error);
        }
      }
    });
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): UploadConfig {
    return {
      maxConcurrentUploads: 3,
      maxRetries: 3,
      chunkSize: 5 * 1024 * 1024, // 5MB
      timeout: 30000, // 30 seconds
      maxFileSizes: {
        image: 25 * 1024 * 1024, // 25MB
        video: 100 * 1024 * 1024, // 100MB
        audio: 25 * 1024 * 1024, // 25MB
        document: 25 * 1024 * 1024, // 25MB
        archive: 25 * 1024 * 1024, // 25MB
      },
      allowedMimeTypes: {
        image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic'],
        video: ['video/mp4', 'video/quicktime', 'video/webm'],
        audio: ['audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/ogg'],
        document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/rtf'],
        archive: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'],
      },
      uploadEndpoint: '/api/upload', // This should be configured by the app
    };
  }
}