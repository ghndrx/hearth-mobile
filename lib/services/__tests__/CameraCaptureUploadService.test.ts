import { CameraCaptureUploadService } from '../CameraCaptureUploadService';
import { cameraService } from '../CameraService';
import { mockCameraRef } from '../../../__mocks__/expo-camera';

// Mock the camera service
jest.mock('../CameraService', () => ({
  cameraService: {
    capturePhoto: jest.fn(() => Promise.resolve({
      uri: 'file:///mock/photo.jpg',
      type: 'photo',
      width: 1920,
      height: 1080,
      fileSize: 1024000,
      mimeType: 'image/jpeg',
    })),
    startVideoRecording: jest.fn(() => Promise.resolve()),
    stopVideoRecording: jest.fn(() => Promise.resolve({
      uri: 'file:///mock/video.mp4',
      type: 'video',
      width: 1920,
      height: 1080,
      fileSize: 5000000,
      mimeType: 'video/mp4',
      duration: 30,
    })),
    deleteTempFile: jest.fn(() => Promise.resolve()),
  },
}));

describe('CameraCaptureUploadService', () => {
  let uploadService: CameraCaptureUploadService;

  beforeEach(() => {
    uploadService = CameraCaptureUploadService.getInstance();
    jest.clearAllMocks();
    // Clear any existing sessions
    uploadService['activeSessions'].clear();
    uploadService['uploadQueue'] = [];
    uploadService['isProcessingQueue'] = false;
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = CameraCaptureUploadService.getInstance();
      const instance2 = CameraCaptureUploadService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Photo Capture and Upload', () => {
    it('should capture photo and create upload session', async () => {
      const session = await uploadService.capturePhotoAndUpload(mockCameraRef);

      expect(session).toBeDefined();
      expect(session.media.type).toBe('photo');
      expect(session.media.uri).toBe('file:///mock/photo.jpg');
      expect(session.state).toBe('uploading');
      expect(cameraService.capturePhoto).toHaveBeenCalledWith(mockCameraRef);
    });

    it('should handle photo capture errors', async () => {
      (cameraService.capturePhoto as jest.Mock).mockRejectedValue(new Error('Capture failed'));

      await expect(uploadService.capturePhotoAndUpload(mockCameraRef)).rejects.toThrow(
        'Failed to capture and upload photo: Capture failed'
      );
    });
  });

  describe('Video Recording and Upload', () => {
    it('should record video and create upload session', async () => {
      const session = await uploadService.recordVideoAndUpload(mockCameraRef);

      expect(session).toBeDefined();
      expect(session.media.type).toBe('video');
      expect(session.media.uri).toBe('file:///mock/video.mp4');
      expect(session.state).toBe('uploading');
      expect(cameraService.startVideoRecording).toHaveBeenCalledWith(mockCameraRef, {});
      expect(cameraService.stopVideoRecording).toHaveBeenCalledWith(mockCameraRef);
    });

    it('should handle video recording errors', async () => {
      (cameraService.startVideoRecording as jest.Mock).mockRejectedValue(new Error('Recording failed'));

      await expect(uploadService.recordVideoAndUpload(mockCameraRef)).rejects.toThrow(
        'Failed to record and upload video: Recording failed'
      );
    });
  });

  describe('Session Management', () => {
    it('should create upload session with unique ID', async () => {
      const media = {
        uri: 'file:///test.jpg',
        type: 'photo' as const,
        width: 1920,
        height: 1080,
        fileSize: 1024000,
        mimeType: 'image/jpeg',
      };

      const session = uploadService['createUploadSession'](media);

      expect(session.id).toMatch(/^capture_\d+_[a-z0-9]+$/);
      expect(session.media).toBe(media);
      expect(session.state).toBe('idle');
      expect(session.progress.percentage).toBe(0);
    });

    it('should get session by ID', async () => {
      const session = await uploadService.capturePhotoAndUpload(mockCameraRef);
      const retrieved = uploadService.getSession(session.id);

      expect(retrieved).toBe(session);
    });

    it('should get all sessions', async () => {
      const session1 = await uploadService.capturePhotoAndUpload(mockCameraRef);
      const session2 = await uploadService.capturePhotoAndUpload(mockCameraRef);

      const allSessions = uploadService.getAllSessions();

      expect(allSessions).toHaveLength(2);
      expect(allSessions).toContain(session1);
      expect(allSessions).toContain(session2);
    });
  });

  describe('Upload Processing', () => {
    it('should process upload queue and complete successfully', async () => {
      const session = await uploadService.capturePhotoAndUpload(mockCameraRef);

      // Wait for upload to complete
      await new Promise(resolve => setTimeout(resolve, 3000));

      const completedSession = uploadService.getSession(session.id);
      expect(completedSession?.state).toBe('completed');
      expect(completedSession?.result?.success).toBe(true);
      expect(completedSession?.result?.url).toMatch(/https:\/\/example\.com\/media\/.+\.jpg/);
    });

    it('should handle multiple uploads in queue', async () => {
      const session1 = await uploadService.capturePhotoAndUpload(mockCameraRef);
      const session2 = await uploadService.capturePhotoAndUpload(mockCameraRef);

      // Wait for uploads to complete
      await new Promise(resolve => setTimeout(resolve, 5000));

      const completed1 = uploadService.getSession(session1.id);
      const completed2 = uploadService.getSession(session2.id);

      expect(completed1?.state).toBe('completed');
      expect(completed2?.state).toBe('completed');
    });
  });

  describe('Upload Cancellation', () => {
    it('should cancel upload and clean up', async () => {
      const session = await uploadService.capturePhotoAndUpload(mockCameraRef);

      await uploadService.cancelUpload(session.id);

      const canceledSession = uploadService.getSession(session.id);
      expect(canceledSession).toBeUndefined();
      expect(cameraService.deleteTempFile).toHaveBeenCalledWith(session.media.uri);
    });

    it('should handle canceling non-existent session', async () => {
      // Should not throw error
      await expect(uploadService.cancelUpload('non-existent')).resolves.toBeUndefined();
    });
  });

  describe('Session Cleanup', () => {
    it('should clear completed sessions', async () => {
      const session = await uploadService.capturePhotoAndUpload(mockCameraRef);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 3000));

      uploadService.clearCompletedSessions();

      const clearedSession = uploadService.getSession(session.id);
      expect(clearedSession).toBeUndefined();
    });
  });

  describe('ID Generation', () => {
    it('should generate unique session IDs', () => {
      const id1 = uploadService['generateSessionId']();
      const id2 = uploadService['generateSessionId']();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^capture_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^capture_\d+_[a-z0-9]+$/);
    });
  });
});