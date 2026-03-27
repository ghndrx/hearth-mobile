import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Dimensions } from 'react-native';
import DeviceAdaptiveService from '../device/DeviceAdaptiveService';
import * as Device from 'expo-device';
import BatteryOptimizationService from '../battery/BatteryOptimizationService';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '15.0' },
  Dimensions: {
    get: jest.fn().mockReturnValue({ width: 390, height: 844 }),
  },
}));
jest.mock('expo-device');
jest.mock('../battery/BatteryOptimizationService');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockDevice = Device as jest.Mocked<typeof Device>;
const mockBatteryService = BatteryOptimizationService as jest.Mocked<typeof BatteryOptimizationService>;

describe('DeviceAdaptiveService', () => {
  let service: typeof DeviceAdaptiveService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();

    // Mock device properties
    mockDevice.deviceType = Device.DeviceType.PHONE;
    mockDevice.deviceName = 'iPhone 14 Pro';
    mockDevice.modelName = 'iPhone14,3';

    // Mock battery service
    mockBatteryService.getPerformanceProfile.mockReturnValue('balanced');

    service = DeviceAdaptiveService;
  });

  afterEach(() => {
    service = DeviceAdaptiveService; // Reset to get fresh instance
  });

  describe('initialization', () => {
    it('should initialize with default settings', async () => {
      await service.initialize();

      const settings = service.getSettings();
      expect(settings.autoOptimization).toBe(true);
      expect(settings.respectBatteryState).toBe(true);
    });

    it('should detect device capabilities', async () => {
      await service.initialize();

      const capabilities = service.getCapabilities();
      expect(capabilities).toBeTruthy();
      expect(capabilities!.deviceType).toBe(Device.DeviceType.PHONE);
      expect(capabilities!.screenSize).toEqual({ width: 390, height: 844 });
    });

    it('should calculate performance tier based on capabilities', async () => {
      await service.initialize();

      const tier = service.getPerformanceTier();
      expect(tier).toBeTruthy();
      expect(['high', 'medium', 'low']).toContain(tier!.tier);
    });
  });

  describe('device detection', () => {
    it('should detect high-end iPhone', async () => {
      mockDevice.deviceName = 'iPhone 15 Pro Max';

      await service.initialize();

      const capabilities = service.getCapabilities();
      expect(capabilities!.totalMemoryGB).toBeGreaterThanOrEqual(6);
      expect(capabilities!.isLowEndDevice).toBe(false);
    });

    it('should detect low-end device', async () => {
      mockDevice.deviceName = 'iPhone SE';
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 320, height: 568 });

      await service.initialize();

      const capabilities = service.getCapabilities();
      expect(capabilities!.isLowEndDevice).toBe(true);
    });

    it('should detect Android device', async () => {
      (Platform as any).OS = 'android';
      (Platform as any).Version = '12';
      mockDevice.modelName = 'Pixel 7';

      await service.initialize();

      const capabilities = service.getCapabilities();
      expect(capabilities!.totalMemoryGB).toBeGreaterThan(0);
    });

    it('should detect high refresh rate support', async () => {
      mockDevice.deviceName = 'iPhone 14 Pro';

      await service.initialize();

      const capabilities = service.getCapabilities();
      expect(capabilities!.supportsHighRefreshRate).toBe(true);
    });
  });

  describe('performance tiers', () => {
    it('should assign high tier for powerful devices', async () => {
      mockDevice.deviceName = 'iPhone 15 Pro Max';
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 430, height: 932 });

      await service.initialize();

      const tier = service.getPerformanceTier();
      expect(tier!.tier).toBe('high');
      expect(tier!.maxConcurrentVoice).toBeGreaterThanOrEqual(4);
      expect(tier!.imageQuality).toBe('high');
      expect(tier!.animationsEnabled).toBe(true);
    });

    it('should assign low tier for low-end devices', async () => {
      mockDevice.deviceName = 'iPhone SE';
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 320, height: 568 });

      await service.initialize();

      const tier = service.getPerformanceTier();
      expect(tier!.tier).toBe('low');
      expect(tier!.maxConcurrentVoice).toBe(1);
      expect(tier!.imageQuality).toBe('low');
      expect(tier!.animationsEnabled).toBe(false);
    });

    it('should assign medium tier for mid-range devices', async () => {
      mockDevice.deviceName = 'iPhone 13';
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 390, height: 844 });

      await service.initialize();

      const tier = service.getPerformanceTier();
      expect(tier!.tier).toBe('medium');
      expect(tier!.maxConcurrentVoice).toBe(2);
      expect(tier!.imageQuality).toBe('medium');
    });
  });

  describe('optimized settings', () => {
    it('should apply battery optimizations in battery saver mode', async () => {
      mockBatteryService.getPerformanceProfile.mockReturnValue('battery_saver');

      await service.initialize();

      const optimizedSettings = service.getOptimizedSettings();
      expect(optimizedSettings!.maxConcurrentVoice).toBeLessThanOrEqual(1);
      expect(optimizedSettings!.imageQuality).toBe('low');
      expect(optimizedSettings!.animationsEnabled).toBe(false);
    });

    it('should apply thermal throttling optimizations', async () => {
      mockBatteryService.getPerformanceProfile.mockReturnValue('thermal_throttled');

      await service.initialize();

      const optimizedSettings = service.getOptimizedSettings();
      expect(optimizedSettings!.maxConcurrentVoice).toBeLessThanOrEqual(1);
    });

    it('should maintain high performance when battery is good', async () => {
      mockBatteryService.getPerformanceProfile.mockReturnValue('high');
      mockDevice.deviceName = 'iPhone 15 Pro';

      await service.initialize();

      const optimizedSettings = service.getOptimizedSettings();
      expect(optimizedSettings!.tier).toBe('high');
      expect(optimizedSettings!.animationsEnabled).toBe(true);
    });
  });

  describe('cache optimization', () => {
    it('should calculate cache size based on RAM', async () => {
      mockDevice.deviceName = 'iPhone 15 Pro Max'; // 8GB RAM

      await service.initialize();

      const cacheSize = service.getOptimalCacheSize();
      expect(cacheSize.messages).toBeGreaterThan(1000);
      expect(cacheSize.images).toBeGreaterThan(50);
      expect(cacheSize.audio).toBeGreaterThan(10);
    });

    it('should use conservative cache sizes for low-end devices', async () => {
      mockDevice.deviceName = 'iPhone SE'; // 3GB RAM

      await service.initialize();

      const cacheSize = service.getOptimalCacheSize();
      expect(cacheSize.messages).toBeLessThan(10000);
      expect(cacheSize.images).toBeLessThan(200);
    });
  });

  describe('image loading strategy', () => {
    it('should provide aggressive preloading for high-end devices', async () => {
      mockDevice.deviceName = 'iPhone 15 Pro Max';

      await service.initialize();

      const strategy = service.getImageLoadingStrategy();
      expect(strategy.maxConcurrent).toBeGreaterThanOrEqual(4);
      expect(strategy.quality).toBeGreaterThanOrEqual(0.9);
      expect(strategy.preloadDistance).toBeGreaterThanOrEqual(5);
    });

    it('should be conservative for low-end devices', async () => {
      mockDevice.deviceName = 'iPhone SE';

      await service.initialize();

      const strategy = service.getImageLoadingStrategy();
      expect(strategy.maxConcurrent).toBeLessThanOrEqual(2);
      expect(strategy.quality).toBeLessThanOrEqual(0.7);
      expect(strategy.preloadDistance).toBeLessThanOrEqual(3);
    });
  });

  describe('voice optimization', () => {
    it('should use high-quality codec for high-end devices', async () => {
      mockDevice.deviceName = 'iPhone 15 Pro';

      await service.initialize();

      const voiceOptimization = service.getVoiceOptimization();
      expect(voiceOptimization.codec).toBe('opus');
      expect(voiceOptimization.bitrate).toBeGreaterThanOrEqual(128000);
      expect(voiceOptimization.maxChannels).toBeGreaterThanOrEqual(4);
    });

    it('should use basic codec for low-end devices', async () => {
      mockDevice.deviceName = 'iPhone SE';

      await service.initialize();

      const voiceOptimization = service.getVoiceOptimization();
      expect(voiceOptimization.codec).toBe('basic');
      expect(voiceOptimization.bitrate).toBeLessThanOrEqual(96000);
      expect(voiceOptimization.maxChannels).toBe(1);
    });
  });

  describe('storage optimization', () => {
    it('should provide storage recommendations based on device capabilities', async () => {
      await service.initialize();

      const storageOptimization = service.getStorageOptimization();
      expect(storageOptimization.maxCacheSize).toBeGreaterThan(0);
      expect(storageOptimization.cleanupThreshold).toBeBetween(0.7, 0.9);
      expect(storageOptimization.compressionLevel).toBeBetween(0.5, 1.0);
    });
  });

  describe('performance benchmark', () => {
    it('should run performance benchmark', async () => {
      jest.useRealTimers();
      await service.initialize();

      const benchmark = await service.runPerformanceBenchmark();

      expect(benchmark.score).toBeGreaterThan(0);
      expect(['low', 'medium', 'high']).toContain(benchmark.tier);
      expect(benchmark.recommendations).toBeInstanceOf(Array);
      expect(benchmark.recommendations.length).toBeGreaterThan(0);

      jest.useFakeTimers();
    });
  });

  describe('settings management', () => {
    it('should update and persist settings', async () => {
      await service.initialize();

      await service.updateSettings({
        autoOptimization: false,
        thermalThrottling: false,
      });

      const settings = service.getSettings();
      expect(settings.autoOptimization).toBe(false);
      expect(settings.thermalThrottling).toBe(false);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'device_adaptive_settings',
        expect.stringContaining('"autoOptimization":false')
      );
    });

    it('should load saved settings', async () => {
      const savedSettings = {
        autoOptimization: false,
        performanceLogging: true,
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(savedSettings));

      await service.initialize();

      const settings = service.getSettings();
      expect(settings.autoOptimization).toBe(false);
      expect(settings.performanceLogging).toBe(true);
    });
  });
});

// Helper matcher
expect.extend({
  toBeBetween(received: number, min: number, max: number) {
    const pass = received >= min && received <= max;
    if (pass) {
      return {
        message: () => `expected ${received} not to be between ${min} and ${max}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be between ${min} and ${max}`,
        pass: false,
      };
    }
  },
});