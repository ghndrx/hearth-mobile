import { cameraService, CapturedMedia } from './CameraService';
import * as FileSystem from 'expo-file-system';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  id?: string;
  error?: string;
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  compress?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export type UploadState = 'idle' | 'preparing' | 'uploading' | 'completed' | 'error';

export interface CaptureUploadSession {
  id: string;
  media: CapturedMedia;
  state: UploadState;
  progress: UploadProgress;
  result?: UploadResult;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Service for integrating camera capture with file upload pipeline
 * Handles the flow from camera capture to upload completion
 */
export class CameraCaptureUploadService {
  private static instance: CameraCaptureUploadService | null = null;
  private activeSessions = new Map<string, CaptureUploadSession>();
  private uploadQueue: CaptureUploadSession[] = [];
  private isProcessingQueue = false;

  private constructor() {}

  static getInstance(): CameraCaptureUploadService {
    if (!CameraCaptureUploadService.instance) {
      CameraCaptureUploadService.instance = new CameraCaptureUploadService();
    }
    return CameraCaptureUploadService.instance;
  }

  /**
   * Capture photo and start upload process
   */
  async capturePhotoAndUpload(
    cameraRef: any,
    options: UploadOptions = {}
  ): Promise<CaptureUploadSession> {
    try {
      // Capture photo using camera service
      const media = await cameraService.capturePhoto(cameraRef);

      // Create upload session
      const session = this.createUploadSession(media);

      // Start upload process
      await this.startUpload(session.id, options);

      return session;
    } catch (error) {
      throw new Error(`Failed to capture and upload photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Record video and start upload process
   */
  async recordVideoAndUpload(
    cameraRef: any,
    recordingOptions: any = {},
    uploadOptions: UploadOptions = {}
  ): Promise<CaptureUploadSession> {
    try {
      // Start video recording
      await cameraService.startVideoRecording(cameraRef, recordingOptions);

      // Note: In a real implementation, you'd handle the recording UI flow
      // For now, we'll simulate stopping after a delay
      const media = await cameraService.stopVideoRecording(cameraRef);

      // Create upload session
      const session = this.createUploadSession(media);

      // Start upload process
      await this.startUpload(session.id, uploadOptions);

      return session;
    } catch (error) {
      throw new Error(`Failed to record and upload video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new upload session
   */
  private createUploadSession(media: CapturedMedia): CaptureUploadSession {
    const id = this.generateSessionId();
    const session: CaptureUploadSession = {
      id,
      media,
      state: 'idle',
      progress: { loaded: 0, total: 0, percentage: 0 },
      startedAt: new Date(),
    };

    this.activeSessions.set(id, session);
    return session;
  }

  /**
   * Start upload for a session
   */
  async startUpload(sessionId: string, options: UploadOptions = {}): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Upload session ${sessionId} not found`);
    }

    // Update session state
    this.updateSessionState(sessionId, 'preparing');

    // Add to upload queue
    this.uploadQueue.push(session);

    // Process queue if not already processing
    if (!this.isProcessingQueue) {
      await this.processUploadQueue();
    }
  }

  /**
   * Process the upload queue
   */
  private async processUploadQueue(): Promise<void> {
    if (this.isProcessingQueue || this.uploadQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.uploadQueue.length > 0) {
      const session = this.uploadQueue.shift();
      if (!session) continue;

      try {
        await this.uploadMedia(session);
      } catch (error) {
        console.error('Upload failed for session', session.id, error);
        this.updateSessionState(session.id, 'error', {
          error: error instanceof Error ? error.message : 'Upload failed',
        });
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Upload media for a session
   */
  private async uploadMedia(session: CaptureUploadSession): Promise<void> {
    this.updateSessionState(session.id, 'uploading');

    try {
      // Simulate file preparation
      await this.prepareMediaForUpload(session);

      // Simulate upload with progress
      const result = await this.performUpload(session);

      // Update session with result
      this.updateSessionState(session.id, 'completed', { result });

      // Cleanup temporary file
      await cameraService.deleteTempFile(session.media.uri);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Prepare media for upload (compression, resizing, etc.)
   */
  private async prepareMediaForUpload(session: CaptureUploadSession): Promise<void> {
    // Update progress
    this.updateProgress(session.id, { loaded: 10, total: 100, percentage: 10 });

    // For photos, we might compress or resize
    if (session.media.type === 'photo') {
      // Simulate compression time
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // For videos, we might compress
    if (session.media.type === 'video') {
      // Simulate compression time
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.updateProgress(session.id, { loaded: 30, total: 100, percentage: 30 });
  }

  /**
   * Perform the actual upload
   * In a real implementation, this would make HTTP requests to your backend
   */
  private async performUpload(session: CaptureUploadSession): Promise<UploadResult> {
    // Simulate upload progress
    for (let i = 30; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      this.updateProgress(session.id, { loaded: i, total: 100, percentage: i });
    }

    // Simulate upload result
    // In a real implementation, you would:
    // 1. Create a FormData with the file
    // 2. Make a POST request to your upload endpoint
    // 3. Handle the response
    return {
      success: true,
      url: `https://example.com/media/${session.id}.${session.media.type === 'photo' ? 'jpg' : 'mp4'}`,
      id: session.id,
    };
  }

  /**
   * Update session state
   */
  private updateSessionState(
    sessionId: string,
    state: UploadState,
    updates: Partial<CaptureUploadSession> = {}
  ): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    Object.assign(session, {
      state,
      ...updates,
      ...(state === 'completed' ? { completedAt: new Date() } : {}),
    });

    this.activeSessions.set(sessionId, session);
  }

  /**
   * Update upload progress for a session
   */
  private updateProgress(sessionId: string, progress: UploadProgress): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.progress = progress;
    this.activeSessions.set(sessionId, session);
  }

  /**
   * Get upload session by ID
   */
  getSession(sessionId: string): CaptureUploadSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): CaptureUploadSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Cancel an upload session
   */
  async cancelUpload(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    // Remove from queue if still pending
    const queueIndex = this.uploadQueue.findIndex(s => s.id === sessionId);
    if (queueIndex >= 0) {
      this.uploadQueue.splice(queueIndex, 1);
    }

    // Clean up temporary file
    await cameraService.deleteTempFile(session.media.uri);

    // Remove from active sessions
    this.activeSessions.delete(sessionId);
  }

  /**
   * Clear completed sessions
   */
  clearCompletedSessions(): void {
    for (const [id, session] of this.activeSessions.entries()) {
      if (session.state === 'completed' || session.state === 'error') {
        this.activeSessions.delete(id);
      }
    }
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `capture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const cameraCaptureUploadService = CameraCaptureUploadService.getInstance();