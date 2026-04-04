import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { nanoid } from 'nanoid';
import { FileAttachment } from './FileAttachmentService';

export interface UploadProgress {
  fileId: string;
  progress: number; // 0-100
  uploaded: number; // bytes uploaded
  total: number; // total bytes
  speed?: number; // bytes per second
  estimatedTimeRemaining?: number; // seconds
}

export interface UploadResult {
  fileId: string;
  success: boolean;
  url?: string;
  thumbnailUrl?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface UploadOptions {
  endpoint?: string;
  headers?: Record<string, string>;
  compress?: boolean;
  quality?: number;
  generateThumbnail?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  onProgress?: (progress: UploadProgress) => void;
  onComplete?: (result: UploadResult) => void;
  onError?: (error: string) => void;
}

export interface CompressionOptions {
  quality: number; // 0.1 - 1.0
  maxWidth?: number;
  maxHeight?: number;
  format?: ImageManipulator.SaveFormat;
  preserveAspectRatio?: boolean;
}

class FileUploadService {
  private static instance: FileUploadService;
  private activeUploads = new Map<string, AbortController>();
  private uploadQueue: { file: FileAttachment; options: UploadOptions }[] = [];
  private isProcessingQueue = false;
  private maxConcurrentUploads = 3;

  public static getInstance(): FileUploadService {
    if (!FileUploadService.instance) {
      FileUploadService.instance = new FileUploadService();
    }
    return FileUploadService.instance;
  }

  /**
   * Upload a single file with optional compression
   */
  async uploadFile(file: FileAttachment, options: UploadOptions = {}): Promise<UploadResult> {
    try {
      // Add to queue and process
      return new Promise((resolve, reject) => {
        this.uploadQueue.push({
          file,
          options: {
            ...options,
            onComplete: (result) => {
              options.onComplete?.(result);
              resolve(result);
            },
            onError: (error) => {
              options.onError?.(error);
              reject(new Error(error));
            },
          },
        });

        this.processQueue();
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      return {
        fileId: file.id,
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Upload multiple files with queue management
   */
  async uploadMultipleFiles(
    files: FileAttachment[],
    options: UploadOptions = {}
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    return Promise.all(
      files.map(async (file) => {
        try {
          const result = await this.uploadFile(file, {
            ...options,
            onProgress: (progress) => {
              options.onProgress?.(progress);
            },
          });
          results.push(result);
          return result;
        } catch (error) {
          const errorResult: UploadResult = {
            fileId: file.id,
            success: false,
            error: error instanceof Error ? error.message : 'Upload failed',
          };
          results.push(errorResult);
          return errorResult;
        }
      })
    );
  }

  /**
   * Compress an image file
   */
  async compressImage(file: FileAttachment, options: CompressionOptions): Promise<FileAttachment> {
    if (file.type !== 'image') {
      throw new Error('Only image files can be compressed');
    }

    try {
      const actions: ImageManipulator.Action[] = [];

      // Resize if dimensions are specified
      if (options.maxWidth || options.maxHeight) {
        const resize: ImageManipulator.Action = {
          resize: {},
        };

        if (options.maxWidth) resize.resize.width = options.maxWidth;
        if (options.maxHeight) resize.resize.height = options.maxHeight;

        actions.push(resize);
      }

      const result = await ImageManipulator.manipulateAsync(
        file.uri,
        actions,
        {
          compress: options.quality,
          format: options.format || ImageManipulator.SaveFormat.JPEG,
        }
      );

      // Get compressed file size
      const fileInfo = await FileSystem.getInfoAsync(result.uri, { size: true });

      return {
        ...file,
        uri: result.uri,
        size: fileInfo.exists ? (fileInfo.size ?? file.size) : file.size,
        metadata: {
          ...file.metadata,
          width: result.width,
          height: result.height,
        },
      };
    } catch (error) {
      console.error('Error compressing image:', error);
      throw new Error('Failed to compress image');
    }
  }

  /**
   * Generate thumbnail for a file
   */
  async generateThumbnail(file: FileAttachment): Promise<string | null> {
    if (file.type === 'image') {
      try {
        const result = await ImageManipulator.manipulateAsync(
          file.uri,
          [{ resize: { width: 200 } }], // Thumbnail width
          {
            compress: 0.8,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );

        return result.uri;
      } catch (error) {
        console.error('Error generating image thumbnail:', error);
        return null;
      }
    }

    // For other file types, return null for now
    // In a full implementation, you would generate thumbnails for:
    // - Videos using expo-av or react-native-video
    // - PDFs using react-native-pdf-thumbnail
    // - Documents using appropriate libraries
    return null;
  }

  /**
   * Process the upload queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.uploadQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (
        this.uploadQueue.length > 0 &&
        this.activeUploads.size < this.maxConcurrentUploads
      ) {
        const queueItem = this.uploadQueue.shift();
        if (queueItem) {
          this.processUpload(queueItem.file, queueItem.options);
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Process a single upload
   */
  private async processUpload(file: FileAttachment, options: UploadOptions): Promise<void> {
    const abortController = new AbortController();
    this.activeUploads.set(file.id, abortController);

    try {
      let processedFile = file;

      // Compress if requested and file type supports it
      if (options.compress && file.type === 'image') {
        try {
          processedFile = await this.compressImage(file, {
            quality: options.quality || 0.8,
            maxWidth: options.maxWidth,
            maxHeight: options.maxHeight,
          });

          console.log(`Compressed ${file.name}: ${this.formatFileSize(file.size)} → ${this.formatFileSize(processedFile.size)}`);
        } catch (error) {
          console.warn('Compression failed, uploading original file:', error);
        }
      }

      // Generate thumbnail if requested
      let thumbnailUrl: string | undefined;
      if (options.generateThumbnail) {
        try {
          const thumbnail = await this.generateThumbnail(processedFile);
          if (thumbnail) {
            // In a real implementation, you would upload the thumbnail too
            thumbnailUrl = thumbnail;
          }
        } catch (error) {
          console.warn('Thumbnail generation failed:', error);
        }
      }

      // Simulate upload process with progress
      const result = await this.simulateUpload(processedFile, options, abortController);

      // Include thumbnail URL if generated
      const finalResult: UploadResult = {
        ...result,
        thumbnailUrl,
      };

      options.onComplete?.(finalResult);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      options.onError?.(errorMessage);
    } finally {
      this.activeUploads.delete(file.id);
      this.processQueue(); // Process next item in queue
    }
  }

  /**
   * Simulate file upload with progress (replace with actual upload implementation)
   */
  private async simulateUpload(
    file: FileAttachment,
    options: UploadOptions,
    abortController: AbortController
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const totalSize = file.size;
      let uploadedSize = 0;
      const startTime = Date.now();

      const interval = setInterval(() => {
        if (abortController.signal.aborted) {
          clearInterval(interval);
          reject(new Error('Upload cancelled'));
          return;
        }

        // Simulate upload progress
        const chunkSize = Math.min(totalSize * 0.1, 1024 * 1024); // 10% or 1MB chunks
        uploadedSize = Math.min(uploadedSize + chunkSize, totalSize);

        const progress = Math.round((uploadedSize / totalSize) * 100);
        const elapsed = Date.now() - startTime;
        const speed = uploadedSize / (elapsed / 1000); // bytes per second
        const estimatedTimeRemaining = speed > 0 ? (totalSize - uploadedSize) / speed : 0;

        options.onProgress?.({
          fileId: file.id,
          progress,
          uploaded: uploadedSize,
          total: totalSize,
          speed,
          estimatedTimeRemaining,
        });

        if (uploadedSize >= totalSize) {
          clearInterval(interval);

          // In a real implementation, you would:
          // 1. Create FormData with the file
          // 2. Make a fetch request to your upload endpoint
          // 3. Handle the response and return the file URL

          resolve({
            fileId: file.id,
            success: true,
            url: `https://example.com/files/${file.id}/${encodeURIComponent(file.name)}`,
            metadata: {
              originalSize: file.size,
              mimeType: file.mimeType,
              uploadedAt: new Date().toISOString(),
            },
          });
        }
      }, 100); // Update progress every 100ms
    });
  }

  /**
   * Cancel an upload
   */
  cancelUpload(fileId: string): void {
    const abortController = this.activeUploads.get(fileId);
    if (abortController) {
      abortController.abort();
      this.activeUploads.delete(fileId);
    }

    // Remove from queue if not yet started
    this.uploadQueue = this.uploadQueue.filter(item => item.file.id !== fileId);
  }

  /**
   * Cancel all uploads
   */
  cancelAllUploads(): void {
    // Cancel active uploads
    this.activeUploads.forEach(controller => controller.abort());
    this.activeUploads.clear();

    // Clear queue
    this.uploadQueue = [];
  }

  /**
   * Get upload status for a file
   */
  getUploadStatus(fileId: string): 'idle' | 'queued' | 'uploading' | 'completed' | 'failed' {
    if (this.activeUploads.has(fileId)) {
      return 'uploading';
    }

    if (this.uploadQueue.some(item => item.file.id === fileId)) {
      return 'queued';
    }

    return 'idle';
  }

  /**
   * Get queue information
   */
  getQueueInfo(): {
    active: number;
    queued: number;
    total: number;
  } {
    return {
      active: this.activeUploads.size,
      queued: this.uploadQueue.length,
      total: this.activeUploads.size + this.uploadQueue.length,
    };
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Validate file before upload
   */
  validateUpload(file: FileAttachment): { isValid: boolean; error?: string } {
    // Check file size (max 100MB for any file)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File size (${this.formatFileSize(file.size)}) exceeds maximum allowed size (${this.formatFileSize(maxSize)})`,
      };
    }

    // Check if file exists
    if (!file.uri) {
      return {
        isValid: false,
        error: 'File URI is missing',
      };
    }

    return { isValid: true };
  }

  /**
   * Create upload metadata
   */
  createUploadMetadata(file: FileAttachment): Record<string, any> {
    return {
      fileId: file.id,
      originalName: file.name,
      mimeType: file.mimeType,
      size: file.size,
      type: file.type,
      category: file.category,
      uploadedAt: new Date().toISOString(),
      ...file.metadata,
    };
  }
}

export default FileUploadService;