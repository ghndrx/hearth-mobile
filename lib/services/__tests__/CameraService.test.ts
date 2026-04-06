import { CameraService } from '../CameraService';
import { FlashMode, CameraType, Camera, PermissionStatus } from 'expo-camera';
import { mockCameraPermissions, mockCameraRef } from '../../../__mocks__/expo-camera';
import { mockMediaLibraryPermissions } from '../../../__mocks__/expo-media-library';

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(() => Promise.resolve({ size: 1024000 })),
  deleteAsync: jest.fn(() => Promise.resolve()),
}));

describe('CameraService', () => {
  let cameraService: CameraService;

  beforeEach(() => {
    cameraService = CameraService.getInstance();
    cameraService.reset();
    mockCameraPermissions.reset();
    mockMediaLibraryPermissions.reset();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = CameraService.getInstance();
      const instance2 = CameraService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Flash Mode Management', () => {
    it('should initialize with flash off', () => {
      expect(cameraService.flashMode).toBe(FlashMode.off);
    });

    it('should toggle flash mode correctly', () => {
      expect(cameraService.toggleFlashMode()).toBe(FlashMode.on);
      expect(cameraService.toggleFlashMode()).toBe(FlashMode.auto);
      expect(cameraService.toggleFlashMode()).toBe(FlashMode.off);
    });

    it('should set flash mode directly', () => {
      cameraService.setFlashMode(FlashMode.auto);
      expect(cameraService.flashMode).toBe(FlashMode.auto);
    });
  });

  describe('Camera Type Management', () => {
    it('should initialize with back camera', () => {
      expect(cameraService.cameraType).toBe(CameraType.back);
    });

    it('should toggle camera type correctly', () => {
      expect(cameraService.toggleCameraType()).toBe(CameraType.front);
      expect(cameraService.toggleCameraType()).toBe(CameraType.back);
    });

    it('should set camera type directly', () => {
      cameraService.setCameraType(CameraType.front);
      expect(cameraService.cameraType).toBe(CameraType.front);
    });
  });

  describe('Permissions', () => {
    it('should request all permissions successfully', async () => {
      mockCameraPermissions.setGranted(true);
      mockCameraPermissions.setMicrophoneGranted(true);
      mockMediaLibraryPermissions.setGranted(true);

      const permissions = await cameraService.requestAllPermissions();

      expect(permissions.cameraGranted).toBe(true);
      expect(permissions.microphoneGranted).toBe(true);
      expect(permissions.mediaLibraryGranted).toBe(true);
      expect(permissions.canAskAgain).toBe(false);
    });

    it('should handle denied permissions', async () => {
      mockCameraPermissions.setGranted(false);
      mockCameraPermissions.setMicrophoneGranted(false);
      mockMediaLibraryPermissions.setGranted(false);

      const permissions = await cameraService.requestAllPermissions();

      expect(permissions.cameraGranted).toBe(false);
      expect(permissions.microphoneGranted).toBe(false);
      expect(permissions.mediaLibraryGranted).toBe(false);
      expect(permissions.canAskAgain).toBe(true);
    });

    it('should get current permission status', async () => {
      mockCameraPermissions.setGranted(true);
      mockCameraPermissions.setMicrophoneGranted(true);
      mockMediaLibraryPermissions.setGranted(true);

      const permissions = await cameraService.getPermissionStatus();

      expect(permissions.cameraGranted).toBe(true);
      expect(permissions.microphoneGranted).toBe(true);
      expect(permissions.mediaLibraryGranted).toBe(true);
    });
  });

  describe('Photo Capture', () => {
    it('should capture photo successfully', async () => {
      const media = await cameraService.capturePhoto(mockCameraRef);

      expect(media.type).toBe('photo');
      expect(media.uri).toBe('file:///mock/camera/photo.jpg');
      expect(media.width).toBe(1920);
      expect(media.height).toBe(1080);
      expect(media.mimeType).toBe('image/jpeg');
      expect(mockCameraRef.takePictureAsync).toHaveBeenCalledWith({
        quality: 0.8,
        base64: false,
        exif: false,
      });
    });

    it('should throw error when camera ref is null', async () => {
      await expect(cameraService.capturePhoto(null)).rejects.toThrow(
        'Camera reference is required for capturing photo'
      );
    });

    it('should handle capture errors', async () => {
      const errorCameraRef = {
        takePictureAsync: jest.fn(() => Promise.reject(new Error('Camera error'))),
      };

      await expect(cameraService.capturePhoto(errorCameraRef)).rejects.toThrow(
        'Failed to capture photo: Camera error'
      );
    });
  });

  describe('Video Recording', () => {
    it('should start video recording successfully', async () => {
      await cameraService.startVideoRecording(mockCameraRef);

      expect(mockCameraRef.recordAsync).toHaveBeenCalledWith({
        quality: 'high',
        maxDuration: 60,
        mute: false,
      });
    });

    it('should start video recording with custom options', async () => {
      const options = {
        quality: '720p',
        maxDuration: 30,
        mute: true,
      };

      await cameraService.startVideoRecording(mockCameraRef, options);

      expect(mockCameraRef.recordAsync).toHaveBeenCalledWith(options);
    });

    it('should stop video recording successfully', async () => {
      const media = await cameraService.stopVideoRecording(mockCameraRef);

      expect(media.type).toBe('video');
      expect(media.uri).toBe('file:///mock/camera/video.mp4');
      expect(media.mimeType).toBe('video/mp4');
      expect(mockCameraRef.stopRecording).toHaveBeenCalled();
    });

    it('should throw error when camera ref is null for video recording', async () => {
      await expect(cameraService.startVideoRecording(null)).rejects.toThrow(
        'Camera reference is required for video recording'
      );

      await expect(cameraService.stopVideoRecording(null)).rejects.toThrow(
        'Camera reference is required for stopping video recording'
      );
    });
  });

  describe('Reset', () => {
    it('should reset to default settings', () => {
      cameraService.setFlashMode(FlashMode.on);
      cameraService.setCameraType(CameraType.front);

      cameraService.reset();

      expect(cameraService.flashMode).toBe(FlashMode.off);
      expect(cameraService.cameraType).toBe(CameraType.back);
    });
  });

  describe('Available Camera Types', () => {
    it('should return available camera types', async () => {
      const types = await cameraService.getAvailableCameraTypes();
      expect(types).toEqual([CameraType.front, CameraType.back]);
    });
  });
});