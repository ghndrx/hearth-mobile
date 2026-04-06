import { CameraCaptureUploadService } from '../CameraCaptureUploadService';

// Mock dependencies
jest.mock('../CameraService', () => ({
  CameraService: {
    getInstance: jest.fn(() => ({
      isAvailable: jest.fn(() => Promise.resolve(true)),
      hasCameraPermission: jest.fn(() => Promise.resolve(true)),
      requestCameraPermission: jest.fn(() => Promise.resolve(true)),
      capturePhoto: jest.fn(() => Promise.resolve({
        uri: 'test-uri',
        filename: 'test-photo.jpg',
        filesize: 1000,
        mimeType: 'image/jpeg',
        createdAt: new Date().toISOString(),
      })),
    })),
  },
}));
jest.mock('../../fileUpload/FileUploadService', () => ({
  FileUploadService: {
    getInstance: jest.fn(() => ({
      addListener: jest.fn(),
      removeListener: jest.fn(),
      uploadFile: jest.fn(() => Promise.resolve({ id: 'test-upload-id', url: 'test-url' })),
      isUploading: jest.fn(() => false),
      getActiveUploadCount: jest.fn(() => 0),
      getQueuedUploadCount: jest.fn(() => 0),
      configure: jest.fn(),
    })),
  },
}));

describe('CameraCaptureUploadService', () => {
  let service: CameraCaptureUploadService;

  beforeEach(() => {
    service = CameraCaptureUploadService.getInstance();
    jest.clearAllMocks();
  });

  it('should be a singleton', () => {
    const instance1 = CameraCaptureUploadService.getInstance();
    const instance2 = CameraCaptureUploadService.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should add and remove listeners', () => {
    const listener = {
      onCaptureStart: jest.fn(),
      onCaptureComplete: jest.fn(),
    };

    const removeListener = service.addListener(listener);
    expect(typeof removeListener).toBe('function');

    removeListener();
  });

  it('should check if camera is ready', async () => {
    // The actual implementation will be tested via mocked dependencies
    const isReady = await service.isReady();
    expect(typeof isReady).toBe('boolean');
  });

  it('should request permissions', async () => {
    const permissionsGranted = await service.requestPermissions();
    expect(typeof permissionsGranted).toBe('boolean');
  });
});