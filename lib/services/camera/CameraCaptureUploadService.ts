import { CameraService } from './CameraService';
import { FileUploadService } from '../fileUpload/FileUploadService';
import {
  LocalFile,
  CameraConfig,
  UploadQueueListener,
  UploadProgressEvent,
  UploadResponse,
} from '../../types';

export interface CameraCaptureUploadOptions {
  uploadImmediately?: boolean;
  quality?: number;
  base64?: boolean;
  exif?: boolean;
}

export interface CameraCaptureUploadListener {
  onCaptureStart?: () => void;
  onCaptureComplete?: (localFile: LocalFile) => void;
  onCaptureError?: (error: string) => void;
  onUploadProgress?: (event: UploadProgressEvent) => void;
  onUploadComplete?: (uploadId: string, response: UploadResponse) => void;
  onUploadError?: (uploadId: string, error: string) => void;
}

/**
 * Service that integrates camera capture with file upload functionality
 * Provides a seamless experience for capturing and uploading photos/videos
 */
export class CameraCaptureUploadService {
  private static instance: CameraCaptureUploadService;
  private cameraService: CameraService;
  private uploadService: FileUploadService;
  private listeners: Set<CameraCaptureUploadListener> = new Set();

  private constructor() {
    this.cameraService = CameraService.getInstance();
    this.uploadService = FileUploadService.getInstance();
    this.setupUploadListeners();
  }

  public static getInstance(): CameraCaptureUploadService {
    if (!CameraCaptureUploadService.instance) {
      CameraCaptureUploadService.instance = new CameraCaptureUploadService();
    }
    return CameraCaptureUploadService.instance;
  }

  /**
   * Add a listener for capture and upload events
   */
  addListener(listener: CameraCaptureUploadListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Check if camera is available and has permissions
   */
  async isReady(): Promise<boolean> {
    try {
      const isAvailable = await this.cameraService.isAvailable();
      const hasPermission = await this.cameraService.hasCameraPermission();
      return isAvailable && hasPermission;
    } catch (error) {
      console.error('Error checking camera readiness:', error);
      return false;
    }
  }

  /**
   * Request all necessary permissions for camera capture and upload
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const cameraPermission = await this.cameraService.requestCameraPermission();
      if (!cameraPermission) {
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Capture photo and optionally upload immediately
   */
  async capturePhotoAndUpload(
    cameraRef: any,
    options: CameraCaptureUploadOptions = {}
  ): Promise<{
    localFile: LocalFile;
    uploadId?: string;
  }> {
    try {
      // Notify listeners that capture is starting
      this.notifyListeners('onCaptureStart');

      // Configure camera
      const cameraConfig: Partial<CameraConfig> = {
        quality: options.quality || 0.8,
        base64: options.base64 || false,
        exif: options.exif || false,
      };

      // Capture photo
      const localFile = await this.cameraService.capturePhoto(cameraRef, cameraConfig);

      if (!localFile) {
        throw new Error('Failed to capture photo');
      }

      // Notify listeners of capture completion
      this.notifyListeners('onCaptureComplete', localFile);

      let uploadId: string | undefined;

      // Queue for upload if requested
      if (options.uploadImmediately !== false) {
        uploadId = await this.uploadService.queueUpload(localFile);
      }

      return { localFile, uploadId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Photo capture failed';
      this.notifyListeners('onCaptureError', errorMessage);
      throw error;
    }
  }

  /**
   * Start video recording
   */
  async startVideoRecording(
    cameraRef: any,
    options: CameraCaptureUploadOptions = {}
  ): Promise<void> {
    try {
      // Request microphone permission for video recording
      const hasMicPermission = await this.cameraService.requestMicrophonePermission();
      if (!hasMicPermission) {
        throw new Error('Microphone permission required for video recording');
      }

      // Notify listeners that capture is starting
      this.notifyListeners('onCaptureStart');

      // Configure camera for video
      const cameraConfig: Partial<CameraConfig> = {
        quality: options.quality || 0.8,
      };

      await this.cameraService.startVideoRecording(cameraRef, cameraConfig);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Video recording start failed';
      this.notifyListeners('onCaptureError', errorMessage);
      throw error;
    }
  }

  /**
   * Stop video recording and optionally upload immediately
   */
  async stopVideoRecordingAndUpload(
    cameraRef: any,
    options: CameraCaptureUploadOptions = {}
  ): Promise<{
    localFile: LocalFile;
    uploadId?: string;
  }> {
    try {
      // Stop video recording
      const localFile = await this.cameraService.stopVideoRecording(cameraRef);

      if (!localFile) {
        throw new Error('Failed to stop video recording');
      }

      // Notify listeners of capture completion
      this.notifyListeners('onCaptureComplete', localFile);

      let uploadId: string | undefined;

      // Queue for upload if requested
      if (options.uploadImmediately !== false) {
        uploadId = await this.uploadService.queueUpload(localFile);
      }

      return { localFile, uploadId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Video recording stop failed';
      this.notifyListeners('onCaptureError', errorMessage);
      throw error;
    }
  }

  /**
   * Upload a previously captured local file
   */
  async uploadLocalFile(localFile: LocalFile): Promise<string> {
    try {
      return await this.uploadService.queueUpload(localFile);
    } catch (error) {
      console.error('Error queuing local file upload:', error);
      throw error;
    }
  }

  /**
   * Cancel an upload
   */
  async cancelUpload(uploadId: string): Promise<void> {
    try {
      await this.uploadService.cancelUpload(uploadId);
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
      await this.uploadService.retryUpload(uploadId);
    } catch (error) {
      console.error('Error retrying upload:', error);
      throw error;
    }
  }

  /**
   * Get upload status
   */
  getUploadStatus(uploadId: string) {
    return this.uploadService.getUploadStatus(uploadId);
  }

  /**
   * Get all uploads
   */
  getAllUploads() {
    return this.uploadService.getAllUploads();
  }

  /**
   * Setup upload service listeners to forward events
   */
  private setupUploadListeners(): void {
    this.uploadService.addListener({
      onProgress: (event: UploadProgressEvent) => {
        this.notifyListeners('onUploadProgress', event);
      },
      onComplete: (uploadId: string, response: UploadResponse) => {
        this.notifyListeners('onUploadComplete', uploadId, response);
      },
      onError: (uploadId: string, error: string) => {
        this.notifyListeners('onUploadError', uploadId, error);
      },
    });
  }

  /**
   * Notify all listeners of an event
   */
  private notifyListeners(
    event: keyof CameraCaptureUploadListener,
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
}