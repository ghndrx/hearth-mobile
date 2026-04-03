/**
 * Camera Service Tests - MS-002
 * Tests for camera integration and photo capture functionality
 */

import { CameraService, type CameraOptions, type VideoOptions, type LibraryOptions } from '../../lib/services/camera';
import * as ImagePicker from 'expo-image-picker';

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  getCameraPermissionsAsync: jest.fn(),
  getMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: {
    Images: 'Images',
    Videos: 'Videos',
    All: 'All',
  },
}));

// Mock image processing service
jest.mock('../../lib/services/imageProcessing', () => ({
  imageProcessingService: {
    compressImage: jest.fn(),
  },
}));

// Mock media service
jest.mock('../../lib/services/media', () => ({
  mediaService: {
    clearCache: jest.fn(),
  },
}));

describe('CameraService', () => {
  let cameraService: CameraService;

  beforeEach(() => {
    cameraService = new CameraService();
    jest.clearAllMocks();
  });

  describe('requestPermissions', () => {
    it('should request both camera and media library permissions', async () => {
      const mockCameraPermission = { status: 'granted', canAskAgain: true };
      const mockLibraryPermission = { status: 'granted', canAskAgain: true };

      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue(mockCameraPermission);
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue(mockLibraryPermission);

      const result = await cameraService.requestPermissions();

      expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(ImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        camera: true,
        mediaLibrary: true,
        canAskAgain: true,
      });
    });

    it('should handle denied permissions', async () => {
      const mockCameraPermission = { status: 'denied', canAskAgain: false };
      const mockLibraryPermission = { status: 'denied', canAskAgain: false };

      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue(mockCameraPermission);
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue(mockLibraryPermission);

      const result = await cameraService.requestPermissions();

      expect(result).toEqual({
        camera: false,
        mediaLibrary: false,
        canAskAgain: false,
      });
    });

    it('should handle permission request errors', async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockRejectedValue(new Error('Permission error'));

      const result = await cameraService.requestPermissions();

      expect(result).toEqual({
        camera: false,
        mediaLibrary: false,
        canAskAgain: false,
      });
    });
  });

  describe('getPermissions', () => {
    it('should get current permission status', async () => {
      const mockCameraPermission = { status: 'granted', canAskAgain: true };
      const mockLibraryPermission = { status: 'granted', canAskAgain: true };

      (ImagePicker.getCameraPermissionsAsync as jest.Mock).mockResolvedValue(mockCameraPermission);
      (ImagePicker.getMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue(mockLibraryPermission);

      const result = await cameraService.getPermissions();

      expect(ImagePicker.getCameraPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(ImagePicker.getMediaLibraryPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        camera: true,
        mediaLibrary: true,
        canAskAgain: true,
      });
    });
  });

  describe('takePicture', () => {
    beforeEach(() => {
      // Mock permissions as granted
      (ImagePicker.getCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
        canAskAgain: true
      });
    });

    it('should take a picture with default options', async () => {
      const mockAsset = {
        uri: 'file://test-photo.jpg',
        width: 1920,
        height: 1080,
        fileName: 'photo.jpg',
        fileSize: 2048000,
        mimeType: 'image/jpeg',
      };

      (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [mockAsset],
      });

      const result = await cameraService.takePicture();

      expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: undefined,
        quality: 0.9,
        base64: false,
      });

      expect(result).toEqual({
        uri: mockAsset.uri,
        type: 'image',
        fileName: mockAsset.fileName,
        fileSize: mockAsset.fileSize,
        mimeType: mockAsset.mimeType,
        width: mockAsset.width,
        height: mockAsset.height,
        compressed: false,
        originalSize: mockAsset.fileSize,
        compressionRatio: 1,
      });
    });

    it('should take a picture with custom options', async () => {
      const mockAsset = {
        uri: 'file://test-photo.jpg',
        width: 1920,
        height: 1080,
        fileName: 'photo.jpg',
        fileSize: 2048000,
        mimeType: 'image/jpeg',
      };

      (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [mockAsset],
      });

      const options: CameraOptions = {
        quality: 0.7,
        allowsEditing: true,
        aspect: [4, 3],
      };

      const result = await cameraService.takePicture(options);

      expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: false,
      });

      expect(result.type).toBe('image');
    });

    it('should handle canceled photo capture', async () => {
      (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
        canceled: true,
        assets: [],
      });

      await expect(cameraService.takePicture()).rejects.toThrow('Photo capture was cancelled');
    });

    it('should request permissions if not granted', async () => {
      // Mock initial permission check as denied
      (ImagePicker.getCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
        canAskAgain: true
      });

      // Mock permission request as granted
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
        canAskAgain: true
      });
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
        canAskAgain: true
      });

      const mockAsset = {
        uri: 'file://test-photo.jpg',
        width: 1920,
        height: 1080,
        fileName: 'photo.jpg',
        fileSize: 2048000,
        mimeType: 'image/jpeg',
      };

      (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [mockAsset],
      });

      await cameraService.takePicture();

      expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled();
    });

    it('should throw error if permission denied', async () => {
      (ImagePicker.getCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
        canAskAgain: true
      });
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
        canAskAgain: false
      });

      await expect(cameraService.takePicture()).rejects.toThrow('Camera permission not granted');
    });
  });

  describe('recordVideo', () => {
    beforeEach(() => {
      // Mock permissions as granted
      (ImagePicker.getCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
        canAskAgain: true
      });
    });

    it('should record a video with default options', async () => {
      const mockAsset = {
        uri: 'file://test-video.mp4',
        width: 1920,
        height: 1080,
        fileName: 'video.mp4',
        fileSize: 10485760, // 10MB
        mimeType: 'video/mp4',
        duration: 30,
      };

      (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [mockAsset],
      });

      const result = await cameraService.recordVideo();

      expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 0.8,
        videoMaxDuration: 60,
        base64: false,
      });

      expect(result).toEqual({
        uri: mockAsset.uri,
        type: 'video',
        fileName: mockAsset.fileName,
        fileSize: mockAsset.fileSize,
        mimeType: mockAsset.mimeType,
        width: mockAsset.width,
        height: mockAsset.height,
        duration: mockAsset.duration,
        compressed: false,
        originalSize: mockAsset.fileSize,
        compressionRatio: 1,
      });
    });

    it('should record a video with custom options', async () => {
      const mockAsset = {
        uri: 'file://test-video.mp4',
        width: 1920,
        height: 1080,
        fileName: 'video.mp4',
        fileSize: 10485760,
        mimeType: 'video/mp4',
        duration: 15,
      };

      (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [mockAsset],
      });

      const options: VideoOptions = {
        quality: 1.0,
        maxDuration: 15,
        allowsEditing: true,
      };

      await cameraService.recordVideo(options);

      expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1.0,
        videoMaxDuration: 15,
        base64: false,
      });
    });

    it('should handle canceled video recording', async () => {
      (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
        canceled: true,
        assets: [],
      });

      await expect(cameraService.recordVideo()).rejects.toThrow('Video capture was cancelled');
    });
  });

  describe('pickFromLibrary', () => {
    beforeEach(() => {
      // Mock permissions as granted
      (ImagePicker.getMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
        canAskAgain: true
      });
    });

    it('should pick images from library with default options', async () => {
      const mockAssets = [
        {
          uri: 'file://library-photo1.jpg',
          type: 'image',
          width: 1920,
          height: 1080,
          fileName: 'photo1.jpg',
          fileSize: 2048000,
          mimeType: 'image/jpeg',
        },
        {
          uri: 'file://library-photo2.jpg',
          type: 'image',
          width: 1920,
          height: 1080,
          fileName: 'photo2.jpg',
          fileSize: 1536000,
          mimeType: 'image/jpeg',
        },
      ];

      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: mockAssets,
      });

      const result = await cameraService.pickFromLibrary();

      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: false,
        quality: 0.9,
        selectionLimit: 10,
        base64: false,
      });

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('image');
      expect(result[1].type).toBe('image');
    });

    it('should pick multiple images with custom options', async () => {
      const mockAssets = [
        {
          uri: 'file://library-photo1.jpg',
          type: 'image',
          width: 1920,
          height: 1080,
          fileName: 'photo1.jpg',
          fileSize: 2048000,
          mimeType: 'image/jpeg',
        },
      ];

      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: mockAssets,
      });

      const options: LibraryOptions = {
        allowsMultiple: true,
        mediaType: 'images',
        quality: 0.8,
        selectionLimit: 5,
      };

      await cameraService.pickFromLibrary(options);

      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5,
        base64: false,
      });
    });

    it('should return empty array when canceled', async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: true,
        assets: [],
      });

      const result = await cameraService.pickFromLibrary();
      expect(result).toEqual([]);
    });

    it('should handle video assets from library', async () => {
      const mockAssets = [
        {
          uri: 'file://library-video.mp4',
          type: 'video',
          width: 1920,
          height: 1080,
          fileName: 'video.mp4',
          fileSize: 10485760,
          mimeType: 'video/mp4',
          duration: 30,
        },
      ];

      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: mockAssets,
      });

      const result = await cameraService.pickFromLibrary({ mediaType: 'videos' });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('video');
      expect(result[0].duration).toBe(30);
    });
  });

  describe('quickCapture', () => {
    beforeEach(() => {
      // Mock permissions as granted
      (ImagePicker.getCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
        canAskAgain: true
      });
    });

    it('should perform quick photo capture', async () => {
      const mockAsset = {
        uri: 'file://quick-photo.jpg',
        width: 1920,
        height: 1080,
        fileName: 'photo.jpg',
        fileSize: 2048000,
        mimeType: 'image/jpeg',
      };

      (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [mockAsset],
      });

      const result = await cameraService.quickCapture('photo');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('image');
    });

    it('should perform quick video capture', async () => {
      const mockAsset = {
        uri: 'file://quick-video.mp4',
        width: 1920,
        height: 1080,
        fileName: 'video.mp4',
        fileSize: 10485760,
        mimeType: 'video/mp4',
        duration: 15,
      };

      (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [mockAsset],
      });

      const result = await cameraService.quickCapture('video');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('video');
    });

    it('should return null on capture failure', async () => {
      (ImagePicker.launchCameraAsync as jest.Mock).mockRejectedValue(new Error('Camera failed'));

      const result = await cameraService.quickCapture('photo');

      expect(result).toBeNull();
    });
  });

  describe('getCameraFeatures', () => {
    it('should return camera capabilities', async () => {
      const features = await cameraService.getCameraFeatures();

      expect(features).toEqual({
        hasFlash: true,
        hasFrontCamera: true,
        hasBackCamera: true,
        supportedAspectRatios: [[1, 1], [4, 3], [16, 9], [3, 4], [9, 16]],
      });
    });
  });

  describe('cleanup', () => {
    it('should cleanup temporary files', async () => {
      const { mediaService } = require('../../lib/services/media');

      await cameraService.cleanup();

      expect(mediaService.clearCache).toHaveBeenCalledTimes(1);
    });
  });
});