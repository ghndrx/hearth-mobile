import { CameraCaptureUploadService } from '../CameraCaptureUploadService';

// Mock dependencies
jest.mock('../CameraService');
jest.mock('../FileUploadService');

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