/**
 * Tests for Device Discovery Service - CDH-001
 *
 * Tests the device discovery service functionality including
 * device registration, discovery, and call handoff capabilities.
 */

// Mock dependencies
const mockApi = {
  post: jest.fn(),
  get: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};

const mockDevice = {
  deviceName: 'iPhone 14 Pro',
  brand: 'Apple',
  modelName: 'iPhone14,3',
  deviceType: 1, // PHONE
};

const mockPlatform = {
  OS: 'ios',
};

const mockSecureStore = {
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
};

const mockConstants = {
  expoConfig: {
    extra: {
      deviceLocation: 'Test Location',
    },
  },
};

jest.mock('../../lib/services/api', () => ({ api: mockApi }));
jest.mock('expo-device', () => mockDevice);
jest.mock('react-native', () => ({ Platform: mockPlatform }));
jest.mock('expo-secure-store', () => mockSecureStore);
jest.mock('expo-constants', () => ({ default: mockConstants }));

import {
  DeviceDiscoveryService,
  DeviceCapabilityDetector,
  DeviceInfoCollector,
  deviceDiscoveryService,
} from '../../lib/services/deviceDiscovery';

describe('DeviceCapabilityDetector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should detect iOS device capabilities', async () => {
    mockPlatform.OS = 'ios';

    const capabilities = await DeviceCapabilityDetector.detectCapabilities();

    expect(capabilities.hasCamera).toBe(true);
    expect(capabilities.hasMicrophone).toBe(true);
    expect(capabilities.supportsVideo).toBe(true);
    expect(capabilities.supportsWebRTC).toBe(true);
    expect(capabilities.supportsScreenShare).toBe(true);
    expect(capabilities.maxVideoResolution).toBe('1080p');
    expect(capabilities.audioCodecs).toEqual(['opus', 'pcmu', 'pcma']);
    expect(capabilities.videoCodecs).toEqual(['VP8', 'VP9', 'H264']);
  });

  it('should detect Android device capabilities', async () => {
    mockPlatform.OS = 'android';

    const capabilities = await DeviceCapabilityDetector.detectCapabilities();

    expect(capabilities.hasCamera).toBe(true);
    expect(capabilities.hasMicrophone).toBe(true);
    expect(capabilities.supportsVideo).toBe(true);
    expect(capabilities.supportsWebRTC).toBe(true);
    expect(capabilities.supportsScreenShare).toBe(false); // Android has limited screen share
  });

  it('should detect web device capabilities', async () => {
    mockPlatform.OS = 'web';

    // Mock navigator
    global.navigator = {
      mediaDevices: {
        getUserMedia: jest.fn(),
        getDisplayMedia: jest.fn(),
      },
    } as any;

    const capabilities = await DeviceCapabilityDetector.detectCapabilities();

    expect(capabilities.hasCamera).toBe(true);
    expect(capabilities.hasMicrophone).toBe(true);
    expect(capabilities.supportsVideo).toBe(true);
    expect(capabilities.supportsScreenShare).toBe(true);
  });

  it('should handle capability detection errors', async () => {
    mockPlatform.OS = 'unknown';

    const capabilities = await DeviceCapabilityDetector.detectCapabilities();

    // Should return safe defaults
    expect(capabilities.hasCamera).toBe(false);
    expect(capabilities.hasMicrophone).toBe(false);
    expect(capabilities.hasSpeakers).toBe(true);
  });
});

describe('DeviceInfoCollector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDeviceType', () => {
    it('should return mobile for phone devices', () => {
      mockPlatform.OS = 'ios';
      mockDevice.deviceType = 1; // PHONE

      const deviceType = DeviceInfoCollector.getDeviceType();
      expect(deviceType).toBe('mobile');
    });

    it('should return tablet for tablet devices', () => {
      mockPlatform.OS = 'ios';
      mockDevice.deviceType = 2; // TABLET

      const deviceType = DeviceInfoCollector.getDeviceType();
      expect(deviceType).toBe('tablet');
    });

    it('should return desktop for web platform', () => {
      mockPlatform.OS = 'web';
      global.navigator = { userAgent: 'Mozilla/5.0 Chrome' } as any;

      const deviceType = DeviceInfoCollector.getDeviceType();
      expect(deviceType).toBe('desktop');
    });

    it('should detect tablet from web user agent', () => {
      mockPlatform.OS = 'web';
      global.navigator = { userAgent: 'Mozilla/5.0 iPad' } as any;

      const deviceType = DeviceInfoCollector.getDeviceType();
      expect(deviceType).toBe('tablet');
    });
  });

  describe('getDevicePlatform', () => {
    it('should return correct platform for iOS', () => {
      mockPlatform.OS = 'ios';
      expect(DeviceInfoCollector.getDevicePlatform()).toBe('ios');
    });

    it('should return correct platform for Android', () => {
      mockPlatform.OS = 'android';
      expect(DeviceInfoCollector.getDevicePlatform()).toBe('android');
    });

    it('should return correct platform for web', () => {
      mockPlatform.OS = 'web';
      expect(DeviceInfoCollector.getDevicePlatform()).toBe('web');
    });
  });

  describe('getDeviceName', () => {
    it('should return device name for mobile devices', async () => {
      mockPlatform.OS = 'ios';
      mockDevice.deviceName = 'John\'s iPhone';

      const name = await DeviceInfoCollector.getDeviceName();
      expect(name).toBe('John\'s iPhone');
    });

    it('should fallback to brand and model', async () => {
      mockPlatform.OS = 'ios';
      mockDevice.deviceName = null;
      mockDevice.brand = 'Apple';
      mockDevice.modelName = 'iPhone14,3';

      const name = await DeviceInfoCollector.getDeviceName();
      expect(name).toBe('Apple iPhone14,3');
    });

    it('should return browser name for web', async () => {
      mockPlatform.OS = 'web';
      global.navigator = { userAgent: 'Mozilla/5.0 Chrome/91.0' } as any;

      const name = await DeviceInfoCollector.getDeviceName();
      expect(name).toBe('Chrome Browser');
    });

    it('should handle errors gracefully', async () => {
      mockPlatform.OS = 'ios';
      mockDevice.deviceName = null;
      mockDevice.brand = null;
      mockDevice.modelName = null;

      const name = await DeviceInfoCollector.getDeviceName();
      expect(name).toBe('Mobile Device');
    });
  });

  describe('generateDeviceId', () => {
    it('should return existing device ID from secure store', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue('existing-device-id');

      const deviceId = await DeviceInfoCollector.generateDeviceId();
      expect(deviceId).toBe('existing-device-id');
      expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('device_id');
    });

    it('should generate and store new device ID', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);
      mockSecureStore.setItemAsync.mockResolvedValue();

      const deviceId = await DeviceInfoCollector.generateDeviceId();
      expect(deviceId).toMatch(/^ios_\d+_[a-z0-9]+$/);
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('device_id', deviceId);
    });

    it('should handle secure store errors', async () => {
      mockSecureStore.getItemAsync.mockRejectedValue(new Error('Storage error'));

      const deviceId = await DeviceInfoCollector.generateDeviceId();
      expect(deviceId).toMatch(/^ios_\d+_[a-z0-9]+$/);
    });
  });
});

describe('DeviceDiscoveryService', () => {
  let service: DeviceDiscoveryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = DeviceDiscoveryService.getInstance();

    // Reset singleton state
    (service as any).currentDevice = null;
    (service as any).discoveredDevices = [];
  });

  describe('registerDevice', () => {
    it('should register device successfully', async () => {
      const mockDevice = {
        id: 'device-123',
        name: 'iPhone 14 Pro',
        type: 'mobile',
        platform: 'ios',
        userId: 'user-456',
        capabilities: {
          hasCamera: true,
          hasMicrophone: true,
          supportsVideo: true,
        },
        presence: 'online',
        lastSeen: '2024-01-01T00:00:00Z',
        isCurrentDevice: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockApi.post.mockResolvedValue({
        data: mockDevice,
        error: null,
      });

      mockSecureStore.getItemAsync.mockResolvedValue('existing-device-id');

      const result = await service.registerDevice();

      expect(mockApi.post).toHaveBeenCalledWith(
        '/devices/register-for-handoff',
        expect.objectContaining({
          deviceId: 'existing-device-id',
          name: expect.any(String),
          type: 'mobile',
          platform: 'ios',
          capabilities: expect.any(Object),
        }),
        true
      );
      expect(result).toEqual(mockDevice);
      expect(service.getCurrentDevice()).toEqual(mockDevice);
    });

    it('should handle registration API errors', async () => {
      mockApi.post.mockResolvedValue({
        data: null,
        error: { message: 'Registration failed', code: 'REG_ERROR', status: 400 },
      });

      await expect(service.registerDevice()).rejects.toThrow(
        'Device registration failed: Registration failed'
      );
    });

    it('should handle missing response data', async () => {
      mockApi.post.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(service.registerDevice()).rejects.toThrow(
        'No device data returned from registration'
      );
    });
  });

  describe('discoverDevices', () => {
    it('should discover devices successfully', async () => {
      const mockResponse = {
        devices: [
          {
            id: 'device-1',
            name: 'MacBook Pro',
            type: 'desktop',
            platform: 'macos',
            presence: 'online',
          },
          {
            id: 'device-2',
            name: 'iPad Pro',
            type: 'tablet',
            platform: 'ios',
            presence: 'idle',
          },
        ],
        currentDevice: {
          id: 'device-3',
          name: 'iPhone',
          type: 'mobile',
          platform: 'ios',
          presence: 'online',
        },
        totalCount: 3,
        onlineCount: 2,
        lastUpdated: '2024-01-01T00:00:00Z',
      };

      mockApi.get.mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await service.discoverDevices();

      expect(mockApi.get).toHaveBeenCalledWith('/devices/discover', true);
      expect(result).toEqual(mockResponse);
    });

    it('should handle discovery options', async () => {
      const mockResponse = {
        devices: [],
        currentDevice: null,
        totalCount: 0,
        onlineCount: 0,
        lastUpdated: '2024-01-01T00:00:00Z',
      };

      mockApi.get.mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const options = {
        includeOfflineDevices: true,
        proximity: 'local' as const,
      };

      await service.discoverDevices(options);

      expect(mockApi.get).toHaveBeenCalledWith(
        '/devices/discover?includeOffline=true&proximity=local',
        true
      );
    });

    it('should handle discovery errors', async () => {
      mockApi.get.mockResolvedValue({
        data: null,
        error: { message: 'Discovery failed', code: 'DISC_ERROR', status: 500 },
      });

      await expect(service.discoverDevices()).rejects.toThrow(
        'Device discovery failed: Discovery failed'
      );
    });
  });

  describe('initiateCallHandoff', () => {
    it('should initiate call handoff successfully', async () => {
      const mockResult = {
        success: true,
        handoffId: 'handoff-123',
        targetDevice: {
          id: 'target-device',
          name: 'MacBook Pro',
        },
        estimatedDuration: 5000,
      };

      mockApi.post.mockResolvedValue({
        data: mockResult,
        error: null,
      });

      const callState = {
        callId: 'call-123',
        channelId: 'channel-456',
        participants: [],
        isScreenSharing: false,
        recordingState: 'inactive' as const,
        audioSettings: {
          inputVolume: 50,
          outputVolume: 75,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        videoSettings: {
          resolution: '1080p',
          frameRate: 30,
          quality: 'high' as const,
          backgroundBlur: false,
        },
        startedAt: '2024-01-01T00:00:00Z',
        duration: 120000,
      };

      // Set current device
      (service as any).currentDevice = { id: 'current-device' };

      const result = await service.initiateCallHandoff('target-device', callState);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/calls/handoff/initiate',
        {
          targetDeviceId: 'target-device',
          callState,
          sourceDeviceId: 'current-device',
        },
        true
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle handoff initiation errors', async () => {
      mockApi.post.mockResolvedValue({
        data: null,
        error: { message: 'Handoff failed', code: 'HANDOFF_ERROR', status: 400 },
      });

      const callState = {} as any;

      await expect(service.initiateCallHandoff('target-device', callState)).rejects.toThrow(
        'Call handoff initiation failed: Handoff failed'
      );
    });
  });

  describe('acceptCallHandoff', () => {
    it('should accept call handoff successfully', async () => {
      const mockHandoffManager = {
        sourceDeviceId: 'source-device',
        targetDeviceId: 'target-device',
        callState: {} as any,
        status: 'initiating' as const,
        progress: 0,
        startedAt: '2024-01-01T00:00:00Z',
      };

      mockApi.post.mockResolvedValue({
        data: mockHandoffManager,
        error: null,
      });

      const result = await service.acceptCallHandoff('handoff-123');

      expect(mockApi.post).toHaveBeenCalledWith(
        '/calls/handoff/handoff-123/accept',
        {},
        true
      );
      expect(result).toEqual(mockHandoffManager);
    });

    it('should handle handoff acceptance errors', async () => {
      mockApi.post.mockResolvedValue({
        data: null,
        error: { message: 'Accept failed', code: 'ACCEPT_ERROR', status: 400 },
      });

      await expect(service.acceptCallHandoff('handoff-123')).rejects.toThrow(
        'Call handoff acceptance failed: Accept failed'
      );
    });
  });

  describe('getSyncPreferences', () => {
    it('should get sync preferences successfully', async () => {
      const mockPreferences = {
        autoHandoff: true,
        handoffConfirmation: false,
        preferredDeviceOrder: ['device-1', 'device-2'],
        syncCallHistory: true,
        syncContactList: true,
        notifyOnHandoffAvailable: true,
      };

      mockApi.get.mockResolvedValue({
        data: mockPreferences,
        error: null,
      });

      const result = await service.getSyncPreferences();

      expect(mockApi.get).toHaveBeenCalledWith('/devices/sync-preferences', true);
      expect(result).toEqual(mockPreferences);
    });

    it('should return default preferences on error', async () => {
      mockApi.get.mockResolvedValue({
        data: null,
        error: { message: 'Not found', code: 'NOT_FOUND', status: 404 },
      });

      const result = await service.getSyncPreferences();

      expect(result).toEqual({
        autoHandoff: false,
        handoffConfirmation: true,
        preferredDeviceOrder: [],
        syncCallHistory: true,
        syncContactList: true,
        notifyOnHandoffAvailable: true,
      });
    });
  });

  describe('updateSyncPreferences', () => {
    it('should update sync preferences successfully', async () => {
      mockApi.patch.mockResolvedValue({
        data: null,
        error: null,
      });

      const updates = { autoHandoff: true, handoffConfirmation: false };

      await service.updateSyncPreferences(updates);

      expect(mockApi.patch).toHaveBeenCalledWith(
        '/devices/sync-preferences',
        updates,
        true
      );
    });

    it('should handle update errors', async () => {
      mockApi.patch.mockResolvedValue({
        data: null,
        error: { message: 'Update failed', code: 'UPDATE_ERROR', status: 400 },
      });

      const updates = { autoHandoff: true };

      await expect(service.updateSyncPreferences(updates)).rejects.toThrow(
        'Failed to update sync preferences: Update failed'
      );
    });
  });

  describe('singleton behavior', () => {
    it('should return the same instance', () => {
      const instance1 = DeviceDiscoveryService.getInstance();
      const instance2 = DeviceDiscoveryService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should maintain state across getInstance calls', async () => {
      const instance1 = DeviceDiscoveryService.getInstance();
      const mockDevice = { id: 'test-device' } as any;

      mockApi.post.mockResolvedValue({ data: mockDevice, error: null });
      mockSecureStore.getItemAsync.mockResolvedValue('device-id');

      await instance1.registerDevice();

      const instance2 = DeviceDiscoveryService.getInstance();
      expect(instance2.getCurrentDevice()).toEqual(mockDevice);
    });
  });
});