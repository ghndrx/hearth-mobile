import { useState, useEffect, useCallback } from 'react';
import {
  FileUploadService,
  ImagePickerService,
} from '../services/fileUpload';
import {
  LocalFile,
  UploadJob,
  UploadResponse,
  UploadQueueListener,
} from '../types';

interface UseFileUploadOptions {
  autoUpload?: boolean;
  onUploadComplete?: (uploadId: string, response: UploadResponse) => void;
  onUploadError?: (uploadId: string, error: string) => void;
}

interface UseFileUploadReturn {
  // State
  selectedFiles: LocalFile[];
  uploadJobs: UploadJob[];
  isUploading: boolean;
  pendingCount: number;
  failedCount: number;
  completedCount: number;
  totalBytes: number;
  uploadedBytes: number;
  overallProgress: number;

  // File selection methods
  pickFromGallery: (options?: { allowMultiple?: boolean; mediaTypes?: 'images' | 'videos' | 'all' }) => Promise<LocalFile[]>;
  capturePhoto: () => Promise<LocalFile | null>;
  captureVideo: () => Promise<LocalFile | null>;

  // File management
  addFiles: (files: LocalFile[]) => void;
  addFile: (file: LocalFile) => void;
  removeFile: (localId: string) => void;
  clearFiles: () => void;

  // Upload management
  startUpload: () => Promise<UploadResponse[]>;
  uploadFile: (localFile: LocalFile) => Promise<UploadResponse>;
  cancelUpload: (uploadId: string) => Promise<void>;
  retryUpload: (uploadId: string) => Promise<void>;
  cancelAll: () => Promise<void>;

  // Utility methods
  formatSize: (bytes: number) => string;
  getUploadStatus: (uploadId: string) => UploadJob | null;
  clearCompleted: () => void;
}

export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const [selectedFiles, setSelectedFiles] = useState<LocalFile[]>([]);
  const [uploadJobs, setUploadJobs] = useState<UploadJob[]>([]);

  const fileUploadService = FileUploadService.getInstance();
  const imagePickerService = ImagePickerService.getInstance();

  // Create listener for upload events
  const uploadListener: UploadQueueListener = {
    onProgress: (event) => {
      setUploadJobs(current => {
        const updated = current.map(job =>
          job.uploadId === event.uploadId
            ? { ...job, progress: event.progress, status: event.status }
            : job
        );
        return updated;
      });
    },
    onComplete: (uploadId, response) => {
      setUploadJobs(current => {
        const updated = current.map(job =>
          job.uploadId === uploadId
            ? { ...job, status: 'completed' as const, progress: 100, response, endTime: new Date() }
            : job
        );
        return updated;
      });
      options.onUploadComplete?.(uploadId, response);
    },
    onError: (uploadId, error) => {
      setUploadJobs(current => {
        const updated = current.map(job =>
          job.uploadId === uploadId
            ? { ...job, status: 'failed' as const, error, endTime: new Date() }
            : job
        );
        return updated;
      });
      options.onUploadError?.(uploadId, error);
    },
    onStatusChange: (uploadId, status) => {
      setUploadJobs(current => {
        const updated = current.map(job =>
          job.uploadId === uploadId ? { ...job, status } : job
        );
        return updated;
      });
    },
  };

  // Subscribe to upload events
  useEffect(() => {
    const unsubscribe = fileUploadService.addListener(uploadListener);
    return unsubscribe;
  }, []);

  // Sync upload jobs with service
  useEffect(() => {
    const syncJobs = () => {
      const allJobs = fileUploadService.getAllUploads();
      setUploadJobs(allJobs);
    };

    syncJobs();
    const interval = setInterval(syncJobs, 1000); // Sync every second

    return () => clearInterval(interval);
  }, []);

  // Computed values
  const isUploading = uploadJobs.some(job => job.status === 'uploading');
  const pendingCount = uploadJobs.filter(job => job.status === 'pending').length;
  const failedCount = uploadJobs.filter(job => job.status === 'failed').length;
  const completedCount = uploadJobs.filter(job => job.status === 'completed').length;

  const totalBytes = selectedFiles.reduce((total, file) => total + file.size, 0);
  const uploadedBytes = uploadJobs.reduce((total, job) => {
    if (job.status === 'completed') return total + job.localFile.size;
    if (job.status === 'uploading') return total + (job.localFile.size * (job.progress / 100));
    return total;
  }, 0);

  const overallProgress = totalBytes > 0 ? Math.round((uploadedBytes / totalBytes) * 100) : 0;

  // File selection methods
  const pickFromGallery = useCallback(async (pickerOptions: {
    allowMultiple?: boolean;
    mediaTypes?: 'images' | 'videos' | 'all';
  } = {}) => {
    try {
      const files = await imagePickerService.pickFromLibrary({
        allowsMultipleSelection: pickerOptions.allowMultiple || false,
        mediaTypes: pickerOptions.mediaTypes || 'images',
        quality: 0.8,
      });

      if (files.length > 0) {
        addFiles(files);

        if (options.autoUpload) {
          for (const file of files) {
            await uploadFile(file);
          }
        }
      }

      return files;
    } catch (error) {
      console.error('Gallery pick error:', error);
      return [];
    }
  }, [options.autoUpload]);

  const capturePhoto = useCallback(async () => {
    try {
      const photo = await imagePickerService.capturePhoto();

      if (photo) {
        addFile(photo);

        if (options.autoUpload) {
          await uploadFile(photo);
        }
      }

      return photo;
    } catch (error) {
      console.error('Photo capture error:', error);
      return null;
    }
  }, [options.autoUpload]);

  const captureVideo = useCallback(async () => {
    try {
      const video = await imagePickerService.captureVideo();

      if (video) {
        addFile(video);

        if (options.autoUpload) {
          await uploadFile(video);
        }
      }

      return video;
    } catch (error) {
      console.error('Video capture error:', error);
      return null;
    }
  }, [options.autoUpload]);

  // File management
  const addFiles = useCallback((files: LocalFile[]) => {
    setSelectedFiles(current => [...current, ...files]);
  }, []);

  const addFile = useCallback((file: LocalFile) => {
    setSelectedFiles(current => [...current, file]);
  }, []);

  const removeFile = useCallback((localId: string) => {
    setSelectedFiles(current => current.filter(file => file.localId !== localId));
  }, []);

  const clearFiles = useCallback(() => {
    setSelectedFiles([]);
  }, []);

  // Upload management
  const startUpload = useCallback(async (): Promise<UploadResponse[]> => {
    try {
      const responses: UploadResponse[] = [];

      for (const file of selectedFiles) {
        const response = await uploadFile(file);
        responses.push(response);
      }

      return responses;
    } catch (error) {
      console.error('Batch upload error:', error);
      throw error;
    }
  }, [selectedFiles]);

  const uploadFile = useCallback(async (localFile: LocalFile): Promise<UploadResponse> => {
    try {
      const uploadId = await fileUploadService.queueUpload(localFile);

      // Wait for upload completion
      return new Promise<UploadResponse>((resolve, reject) => {
        const checkStatus = () => {
          const job = fileUploadService.getUploadStatus(uploadId);
          if (!job) {
            reject(new Error('Upload job not found'));
            return;
          }

          if (job.status === 'completed' && job.response) {
            resolve(job.response);
          } else if (job.status === 'failed') {
            reject(new Error(job.error || 'Upload failed'));
          } else {
            setTimeout(checkStatus, 500); // Check again in 500ms
          }
        };

        checkStatus();
      });
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }, []);

  const cancelUpload = useCallback(async (uploadId: string) => {
    await fileUploadService.cancelUpload(uploadId);
  }, []);

  const retryUpload = useCallback(async (uploadId: string) => {
    await fileUploadService.retryUpload(uploadId);
  }, []);

  const cancelAll = useCallback(async () => {
    const activeUploads = uploadJobs.filter(job =>
      job.status === 'pending' || job.status === 'uploading'
    );

    for (const job of activeUploads) {
      await cancelUpload(job.uploadId);
    }
  }, [uploadJobs]);

  // Utility methods
  const formatSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const getUploadStatus = useCallback((uploadId: string) => {
    return fileUploadService.getUploadStatus(uploadId);
  }, []);

  const clearCompleted = useCallback(() => {
    fileUploadService.clearCompleted();
    setUploadJobs(current => current.filter(job =>
      job.status !== 'completed' && job.status !== 'failed' && job.status !== 'cancelled'
    ));
  }, []);

  return {
    // State
    selectedFiles,
    uploadJobs,
    isUploading,
    pendingCount,
    failedCount,
    completedCount,
    totalBytes,
    uploadedBytes,
    overallProgress,

    // File selection methods
    pickFromGallery,
    capturePhoto,
    captureVideo,

    // File management
    addFiles,
    addFile,
    removeFile,
    clearFiles,

    // Upload management
    startUpload,
    uploadFile,
    cancelUpload,
    retryUpload,
    cancelAll,

    // Utility methods
    formatSize,
    getUploadStatus,
    clearCompleted,
  };
}