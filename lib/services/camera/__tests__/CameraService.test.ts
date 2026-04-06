import { CameraService } from '../CameraService';

// Mock expo-camera
jest.mock('expo-camera');

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(() => Promise.resolve({
    exists: true,
    size: 1024 * 1024, // 1MB
  })),
}));

describe('CameraService', () => {
  let cameraService: CameraService;

  beforeEach(() => {
    cameraService = CameraService.getInstance();
    jest.clearAllMocks();
  });

  it('should be a singleton', () => {
    const instance1 = CameraService.getInstance();
    const instance2 = CameraService.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should request camera permission', async () => {
    const hasPermission = await cameraService.requestCameraPermission();
    expect(hasPermission).toBe(true);
  });

  it('should request microphone permission', async () => {
    const hasPermission = await cameraService.requestMicrophonePermission();
    expect(hasPermission).toBe(true);
  });

  it('should check camera availability', async () => {
    const isAvailable = await cameraService.isAvailable();
    expect(isAvailable).toBe(true);
  });

  it('should return default camera config', () => {
    const config = cameraService.getDefaultConfig();
    expect(config).toHaveProperty('type');
    expect(config).toHaveProperty('flashMode');
    expect(config).toHaveProperty('quality');
  });

  it('should capture photo with camera reference', async () => {
    const mockCameraRef = {
      current: {
        takePictureAsync: jest.fn(() => Promise.resolve({
          uri: 'file:///test/photo.jpg',
          width: 1920,
          height: 1080,
        })),
      },
    };

    const photo = await cameraService.capturePhoto(mockCameraRef);

    expect(photo).toBeTruthy();
    expect(photo?.uri).toBe('file:///test/photo.jpg');
    expect(photo?.fileType).toBe('image');
    expect(photo?.width).toBe(1920);
    expect(photo?.height).toBe(1080);
    expect(mockCameraRef.current.takePictureAsync).toHaveBeenCalled();
  });

  it('should handle capture photo error when camera ref is null', async () => {
    const mockCameraRef = { current: null };

    await expect(cameraService.capturePhoto(mockCameraRef))
      .rejects
      .toThrow('Camera reference not available');
  });

  it('should get permissions status', () => {
    const permissions = cameraService.getPermissions();
    expect(permissions).toHaveProperty('camera');
    expect(permissions).toHaveProperty('audio');
  });
});