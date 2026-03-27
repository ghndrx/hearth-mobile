import AsyncStorage from '@react-native-async-storage/async-storage';
import BatteryOptimizationService from '../battery/BatteryOptimizationService';
import * as Battery from 'expo-battery';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-battery');
jest.mock('@react-native-community/netinfo');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockBattery = Battery as jest.Mocked<typeof Battery>;

describe('BatteryOptimizationService', () => {
  let service: typeof BatteryOptimizationService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();

    // Mock battery API
    mockBattery.getBatteryLevelAsync.mockResolvedValue(0.8);
    mockBattery.getBatteryStateAsync.mockResolvedValue(Battery.BatteryState.UNPLUGGED);
    mockBattery.isLowPowerModeEnabledAsync.mockResolvedValue(false);

    service = BatteryOptimizationService;
  });

  afterEach(() => {
    service.dispose();
  });

  describe('initialization', () => {
    it('should initialize with default settings', async () => {
      await service.initialize();

      const settings = service.getSettings();
      expect(settings.adaptiveCPU).toBe(true);
      expect(settings.intelligentSync).toBe(true);
      expect(settings.batteryAwareNotifications).toBe(true);
    });

    it('should load saved settings from storage', async () => {
      const savedSettings = {
        adaptiveCPU: false,
        intelligentSync: false,
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(savedSettings));

      await service.initialize();

      const settings = service.getSettings();
      expect(settings.adaptiveCPU).toBe(false);
      expect(settings.intelligentSync).toBe(false);
    });
  });

  describe('battery metrics', () => {
    it('should update battery metrics correctly', async () => {
      mockBattery.getBatteryLevelAsync.mockResolvedValue(0.65);
      mockBattery.getBatteryStateAsync.mockResolvedValue(Battery.BatteryState.CHARGING);

      await service.initialize();

      const metrics = service.getBatteryMetrics();
      expect(metrics.level).toBe(0.65);
      expect(metrics.isCharging).toBe(true);
    });

    it('should notify subscribers of battery changes', async () => {
      const mockCallback = jest.fn();

      await service.initialize();
      service.subscribe(mockCallback);

      expect(mockCallback).toHaveBeenCalled();
      expect(mockCallback.mock.calls[0][0]).toHaveProperty('level');
      expect(mockCallback.mock.calls[0][0]).toHaveProperty('isCharging');
    });
  });

  describe('performance profiles', () => {
    it('should return high performance when battery > 50% and charging', async () => {
      mockBattery.getBatteryLevelAsync.mockResolvedValue(0.8);
      mockBattery.getBatteryStateAsync.mockResolvedValue(Battery.BatteryState.CHARGING);

      await service.initialize();

      const profile = service.getPerformanceProfile();
      expect(profile).toBe('high');
    });

    it('should return battery_saver when battery < 20% and not charging', async () => {
      mockBattery.getBatteryLevelAsync.mockResolvedValue(0.15);
      mockBattery.getBatteryStateAsync.mockResolvedValue(Battery.BatteryState.UNPLUGGED);

      await service.initialize();

      const profile = service.getPerformanceProfile();
      expect(profile).toBe('battery_saver');
    });

    it('should return balanced for moderate battery levels', async () => {
      mockBattery.getBatteryLevelAsync.mockResolvedValue(0.4);
      mockBattery.getBatteryStateAsync.mockResolvedValue(Battery.BatteryState.UNPLUGGED);

      await service.initialize();

      const profile = service.getPerformanceProfile();
      expect(profile).toBe('balanced');
    });
  });

  describe('CPU usage optimization', () => {
    it('should recommend CPU reduction when battery is low', async () => {
      mockBattery.getBatteryLevelAsync.mockResolvedValue(0.15);
      mockBattery.getBatteryStateAsync.mockResolvedValue(Battery.BatteryState.UNPLUGGED);

      await service.initialize();

      expect(service.shouldReduceCPUUsage()).toBe(true);
    });

    it('should not recommend CPU reduction when charging', async () => {
      mockBattery.getBatteryLevelAsync.mockResolvedValue(0.15);
      mockBattery.getBatteryStateAsync.mockResolvedValue(Battery.BatteryState.CHARGING);

      await service.initialize();

      expect(service.shouldReduceCPUUsage()).toBe(false);
    });

    it('should recommend CPU reduction in low power mode', async () => {
      mockBattery.getBatteryLevelAsync.mockResolvedValue(0.8);
      mockBattery.isLowPowerModeEnabledAsync.mockResolvedValue(true);

      await service.initialize();

      expect(service.shouldReduceCPUUsage()).toBe(true);
    });
  });

  describe('background sync optimization', () => {
    it('should throttle sync when battery is very low', async () => {
      mockBattery.getBatteryLevelAsync.mockResolvedValue(0.10);
      mockBattery.getBatteryStateAsync.mockResolvedValue(Battery.BatteryState.UNPLUGGED);

      await service.initialize();

      expect(service.shouldThrottleBackgroundSync()).toBe(true);
    });

    it('should not throttle sync when charging', async () => {
      mockBattery.getBatteryLevelAsync.mockResolvedValue(0.10);
      mockBattery.getBatteryStateAsync.mockResolvedValue(Battery.BatteryState.CHARGING);

      await service.initialize();

      expect(service.shouldThrottleBackgroundSync()).toBe(false);
    });
  });

  describe('notification optimization', () => {
    it('should optimize notifications when battery is low', async () => {
      mockBattery.getBatteryLevelAsync.mockResolvedValue(0.20);
      mockBattery.getBatteryStateAsync.mockResolvedValue(Battery.BatteryState.UNPLUGGED);

      await service.initialize();

      expect(service.shouldOptimizeNotifications()).toBe(true);
    });

    it('should optimize notifications in low power mode', async () => {
      mockBattery.getBatteryLevelAsync.mockResolvedValue(0.8);
      mockBattery.isLowPowerModeEnabledAsync.mockResolvedValue(true);

      await service.initialize();

      expect(service.shouldOptimizeNotifications()).toBe(true);
    });
  });

  describe('settings management', () => {
    it('should update settings and save to storage', async () => {
      await service.initialize();

      await service.updateSettings({ adaptiveCPU: false });

      const settings = service.getSettings();
      expect(settings.adaptiveCPU).toBe(false);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'battery_optimization_settings',
        expect.stringContaining('"adaptiveCPU":false')
      );
    });
  });

  describe('battery usage history', () => {
    it('should return empty history initially', async () => {
      await service.initialize();

      const history = await service.getBatteryUsageHistory();
      expect(history).toEqual([]);
    });

    it('should load saved history from storage', async () => {
      const savedHistory = [
        { timestamp: Date.now() - 3600000, level: 0.8, isCharging: false }
      ];
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'battery_usage_history') {
          return Promise.resolve(JSON.stringify(savedHistory));
        }
        return Promise.resolve(null);
      });

      await service.initialize();

      const history = await service.getBatteryUsageHistory();
      expect(history).toEqual(savedHistory);
    });
  });
});