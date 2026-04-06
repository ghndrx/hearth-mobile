import { CameraService } from '../lib/services/camera/CameraService';

// Mock expo-camera
jest.mock('expo-camera', () => ({
  Camera: {
    getCameraPermissionsAsync: jest.fn(() =>
      Promise.resolve({ status: 'granted' })
    ),
    requestCameraPermissionsAsync: jest.fn(() =>
      Promise.resolve({ status: 'granted' })
    ),
    getMicrophonePermissionsAsync: jest.fn(() =>
      Promise.resolve({ status: 'granted' })
    ),
    requestMicrophonePermissionsAsync: jest.fn(() =>
      Promise.resolve({ status: 'granted' })
    ),
  },
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
  },
}));

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(() => Promise.resolve({
    exists: true,
    size: 1000,
    uri: 'file://test.jpg',
    isDirectory: false
  })),
}));

describe('CameraService', () => {
  let cameraService: CameraService;

  beforeEach(() => {
    cameraService = CameraService.getInstance();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be a singleton', () => {
    const instance1 = CameraService.getInstance();
    const instance2 = CameraService.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should request camera permission successfully', async () => {
    const hasPermission = await cameraService.requestCameraPermission();
    expect(hasPermission).toBe(true);
  });

  it('should request microphone permission successfully', async () => {
    const hasPermission = await cameraService.requestMicrophonePermission();
    expect(hasPermission).toBe(true);
  });

  it('should check camera permission status', async () => {
    const hasPermission = await cameraService.hasCameraPermission();
    expect(hasPermission).toBe(true);
  });

  it('should check microphone permission status', async () => {
    const hasPermission = await cameraService.hasMicrophonePermission();
    expect(hasPermission).toBe(true);
  });

  it('should return default camera config', () => {
    const config = cameraService.getDefaultConfig();
    expect(config).toEqual({
      type: 'back',
      flashMode: 'auto',
      quality: 0.8,
      base64: false,
      exif: false,
    });
  });

  it('should check camera availability', async () => {
    const isAvailable = await cameraService.isAvailable();
    expect(typeof isAvailable).toBe('boolean');
  });

  it('should get current permissions', () => {
    const permissions = cameraService.getPermissions();
    expect(permissions).toHaveProperty('camera');
    expect(permissions).toHaveProperty('audio');
  });
});