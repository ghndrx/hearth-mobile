/**
 * useFileUpload Hook
 * React hook for managing file uploads in components
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  fileUploadService,
  imagePickerService,
  LocalFile,
  UploadOptions,
  UploadJob,
  UploadResponse,
  UploadQueueEvent,
  formatFileSize,
} from '../fileUpload';

export interface UseFileUploadOptions {
  /** Target channel/conversation ID */
  targetId: string;
  /** Target type */
  targetType: 'channel' | 'conversation';
  /** Auto-start uploads when files are added */
  autoUpload?: boolean;
  /** Compress images before upload */
  compress?: boolean;
  /** Compression quality (0-1) */
  compressionQuality?: number;
}

export interface UseFileUploadReturn {
  /** Selected files ready for upload */
  selectedFiles: LocalFile[];
  /** Active upload jobs */
  uploadJobs: UploadJob[];
  /** Whether upload is in progress */
  isUploading: boolean;
  /** Number of pending uploads */
  pendingCount: number;
  /** Number of failed uploads */
  failedCount: number;
  /** Total bytes to upload */
  totalBytes: number;
  /** Bytes uploaded so far */
  uploadedBytes: number;
  /** Overall progress percentage */
  overallProgress: number;
  /** Pick images from gallery */
  pickFromGallery: () => Promise<LocalFile[]>;
  /** Capture photo from camera */
  capturePhoto: () => Promise<LocalFile | null>;
  /** Add files to queue manually */
  addFiles: (files: LocalFile[]) => void;
  /** Remove a file from selection */
  removeFile: (localId: string) => void;
  /** Clear all selected files */
  clearFiles: () => void;
  /** Start uploading all queued files */
  startUpload: () => Promise<UploadResponse[]>;
  /** Upload a single file */
  uploadFile: (localFile: LocalFile) => Promise<UploadResponse>;
  /** Cancel a specific upload */
  cancelUpload: (uploadId: string) => void;
  /** Retry a failed upload */
  retryUpload: (uploadId: string) => Promise<void>;
  /** Cancel all uploads */
  cancelAll: () => void;
  /** Get formatted size string */
  formatSize: (bytes: number) => string;
}

/**
 * Hook for managing file uploads
 */
export function useFileUpload(options: UseFileUploadOptions): UseFileUploadReturn {
  const {
    targetId,
    targetType,
    autoUpload = true,
    compress = true,
    compressionQuality = 0.8,
  } = options;

  const [selectedFiles, setSelectedFiles] = useState<LocalFile[]>([]);
  const [uploadJobs, setUploadJobs] = useState<UploadJob[]>([]);
  const isMountedRef = useRef(true);

  // Listen to upload queue events
  useEffect(() => {
    const unsubscribe = fileUploadService.addListener((event: UploadQueueEvent) => {
      if (!isMountedRef.current) return;

      switch (event.type) {
        case 'job_added':
        case 'job_started':
        case 'job_progress':
        case 'job_completed':
        case 'job_failed':
        case 'job_cancelled':
          if (event.job) {
            setUploadJobs(prev => {
              const index = prev.findIndex(j => j.uploadId === event.job!.uploadId);
              if (index !== -1) {
                const updated = [...prev];
                updated[index] = event.job!;
                return updated;
              } else if (event.type !== 'job_cancelled') {
                return [...prev, event.job!];
              }
              return prev;
            });
          }
          break;
        case 'queue_empty':
          // Refresh jobs list
          setUploadJobs(fileUploadService.getQueue());
          break;
      }
    });

    return unsubscribe;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Calculate totals
  const totalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);
  const uploadedBytes = uploadJobs.reduce((sum, job) => {
    if (job.status === 'completed' && job.localFile) {
      return sum + job.localFile.size;
    }
    if (job.status === 'uploading') {
      return sum + (job.localFile.size * job.progress / 100);
    }
    return sum;
  }, 0);
  const overallProgress = totalBytes > 0 ? (uploadedBytes / totalBytes) * 100 : 0;

  // Pick images from gallery
  const pickFromGallery = useCallback(async (): Promise<LocalFile[]> => {
    const files = await imagePickerService.pickFromLibrary({
      allowsMultiple: true,
      mediaType: 'images',
      quality: compressionQuality,
    });

    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);

      if (autoUpload) {
        const uploadOptions: UploadOptions = {
          targetId,
          targetType,
          compress,
          compressionQuality,
        };

        for (const file of files) {
          await fileUploadService.queueUpload(file, uploadOptions);
        }
      }
    }

    return files;
  }, [targetId, targetType, autoUpload, compress, compressionQuality]);

  // Capture photo from camera
  const capturePhoto = useCallback(async (): Promise<LocalFile | null> => {
    const file = await imagePickerService.capturePhoto({
      quality: compressionQuality,
    });

    if (file) {
      setSelectedFiles(prev => [...prev, file]);

      if (autoUpload) {
        const uploadOptions: UploadOptions = {
          targetId,
          targetType,
          compress,
          compressionQuality,
        };

        await fileUploadService.queueUpload(file, uploadOptions);
      }
    }

    return file;
  }, [targetId, targetType, autoUpload, compress, compressionQuality]);

  // Add files manually
  const addFiles = useCallback((files: LocalFile[]) => {
    setSelectedFiles(prev => [...prev, ...files]);

    if (autoUpload) {
      const uploadOptions: UploadOptions = {
        targetId,
        targetType,
        compress,
        compressionQuality,
      };

      for (const file of files) {
        fileUploadService.queueUpload(file, uploadOptions);
      }
    }
  }, [targetId, targetType, autoUpload, compress, compressionQuality]);

  // Remove a file
  const removeFile = useCallback((localId: string) => {
    setSelectedFiles(prev => prev.filter(f => f.localId !== localId));
    
    // Also cancel any in-progress upload for this file
    const job = uploadJobs.find(j => j.localFile.localId === localId);
    if (job) {
      fileUploadService.cancelUpload(job.uploadId);
    }
  }, [uploadJobs]);

  // Clear all files
  const clearFiles = useCallback(() => {
    setSelectedFiles([]);
    fileUploadService.cancelAll();
  }, []);

  // Start uploading queued files
  const startUpload = useCallback(async (): Promise<UploadResponse[]> => {
    const uploadOptions: UploadOptions = {
      targetId,
      targetType,
      compress,
      compressionQuality,
    };

    const results: UploadResponse[] = [];

    for (const file of selectedFiles) {
      // Check if already uploaded
      const existingJob = uploadJobs.find(
        j => j.localFile.localId === file.localId && j.status === 'completed'
      );
      
      if (existingJob?.result) {
        results.push(existingJob.result);
      } else {
        const uploadId = await fileUploadService.queueUpload(file, uploadOptions);
        // Wait for completion (simplified - in production you'd want better handling)
        const job = fileUploadService.getJob(uploadId);
        if (job) {
          // Poll for completion
          await new Promise<void>(resolve => {
            const checkInterval = setInterval(() => {
              const updatedJob = fileUploadService.getJob(uploadId);
              if (updatedJob?.status === 'completed' && updatedJob.result) {
                results.push(updatedJob.result);
                clearInterval(checkInterval);
                resolve();
              } else if (updatedJob?.status === 'failed') {
                clearInterval(checkInterval);
                resolve();
              }
            }, 100);
          });
        }
      }
    }

    return results;
  }, [selectedFiles, uploadJobs, targetId, targetType, compress, compressionQuality]);

  // Upload a single file
  const uploadFile = useCallback(async (localFile: LocalFile): Promise<UploadResponse> => {
    const uploadOptions: UploadOptions = {
      targetId,
      targetType,
      compress,
      compressionQuality,
    };

    const uploadId = await fileUploadService.queueUpload(localFile, uploadOptions);
    
    // Wait for completion
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const job = fileUploadService.getJob(uploadId);
        if (job?.status === 'completed' && job.result) {
          clearInterval(checkInterval);
          resolve(job.result);
        } else if (job?.status === 'failed') {
          clearInterval(checkInterval);
          reject(new Error(job.error || 'Upload failed'));
        }
      }, 100);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Upload timed out'));
      }, 300000);
    });
  }, [targetId, targetType, compress, compressionQuality]);

  // Cancel an upload
  const cancelUpload = useCallback((uploadId: string) => {
    fileUploadService.cancelUpload(uploadId);
  }, []);

  // Retry a failed upload
  const retryUpload = useCallback(async (uploadId: string): Promise<void> => {
    await fileUploadService.retryUpload(uploadId);
  }, []);

  // Cancel all uploads
  const cancelAll = useCallback(() => {
    fileUploadService.cancelAll();
  }, []);

  return {
    selectedFiles,
    uploadJobs,
    isUploading: uploadJobs.some(j => j.status === 'uploading'),
    pendingCount: uploadJobs.filter(j => j.status === 'pending' || j.status === 'uploading').length,
    failedCount: uploadJobs.filter(j => j.status === 'failed').length,
    totalBytes,
    uploadedBytes,
    overallProgress,
    pickFromGallery,
    capturePhoto,
    addFiles,
    removeFile,
    clearFiles,
    startUpload,
    uploadFile,
    cancelUpload,
    retryUpload,
    cancelAll,
    formatSize: formatFileSize,
  };
}

export default useFileUpload;
