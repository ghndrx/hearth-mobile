import BatteryMonitoringService, { BatteryInfo, PowerOptimizationRecommendation } from '../batteryMonitoring';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  NativeEventEmitter: jest.fn(),
  NativeModules: {
    Battery: {
      getBatteryState: jest.fn(),
    },
  },
}));

jest.mock('@react-native-async-storage/async-storage');

describe('BatteryMonitoringService', () => {
  let service: BatteryMonitoringService;
  const mockBatteryInfo: BatteryInfo = {
    level: 0.75,
    isCharging: false,
    isLowPowerMode: false,
    temperature: 30,
    health: 'good',
    technology: 'Li-ion',
  };

  beforeEach(() => {
    // Reset singleton
    (BatteryMonitoringService as any).instance = null;
    service = BatteryMonitoringService.getInstance();

    // Mock AsyncStorage
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    service.destroy();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create singleton instance', () => {
      const instance1 = BatteryMonitoringService.getInstance();
      const instance2 = BatteryMonitoringService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should initialize with default battery info', () => {
      const batteryInfo = service.getCurrentBatteryInfo();
      expect(batteryInfo).toEqual({
        level: 1.0,
        isCharging: false,
        isLowPowerMode: false,
      });
    });
  });

  describe('battery state detection', () => {
    beforeEach(() => {
      // Update battery info manually for testing
      (service as any).updateBatteryInfo(mockBatteryInfo);
    });

    it('should detect low battery correctly', () => {
      (service as any).updateBatteryInfo({ ...mockBatteryInfo, level: 0.15 });
      expect(service.isLowBattery()).toBe(true);
      expect(service.isLowBattery(0.1)).toBe(false);
    });

    it('should detect critical battery correctly', () => {
      (service as any).updateBatteryInfo({ ...mockBatteryInfo, level: 0.05 });
      expect(service.isCriticalBattery()).toBe(true);

      (service as any).updateBatteryInfo({ ...mockBatteryInfo, level: 0.15 });
      expect(service.isCriticalBattery()).toBe(false);
    });

    it('should not detect low battery when charging', () => {
      (service as any).updateBatteryInfo({ ...mockBatteryInfo, level: 0.15, isCharging: true });
      expect(service.isLowBattery()).toBe(false);
    });

    it('should recommend background activity reduction appropriately', () => {
      // Normal state - should not reduce
      (service as any).updateBatteryInfo({ ...mockBatteryInfo, level: 0.5, isLowPowerMode: false });
      expect(service.shouldReduceBackgroundActivity()).toBe(false);

      // Low power mode - should reduce
      (service as any).updateBatteryInfo({ ...mockBatteryInfo, isLowPowerMode: true });
      expect(service.shouldReduceBackgroundActivity()).toBe(true);

      // Low battery - should reduce
      (service as any).updateBatteryInfo({ ...mockBatteryInfo, level: 0.1, isLowPowerMode: false });
      expect(service.shouldReduceBackgroundActivity()).toBe(true);

      // High temperature - should reduce
      (service as any).updateBatteryInfo({ ...mockBatteryInfo, temperature: 45, isLowPowerMode: false });
      expect(service.shouldReduceBackgroundActivity()).toBe(true);
    });
  });

  describe('battery health calculation', () => {
    it('should calculate health score correctly for good battery', () => {
      (service as any).updateBatteryInfo({
        ...mockBatteryInfo,
        health: 'good',
        temperature: 25,
      });
      expect(service.getBatteryHealthScore()).toBe(100);
    });

    it('should reduce score for high temperature', () => {
      (service as any).updateBatteryInfo({
        ...mockBatteryInfo,
        health: 'good',
        temperature: 50,
      });
      expect(service.getBatteryHealthScore()).toBe(80); // 100 - 20 for overheating
    });

    it('should reduce score for poor health status', () => {
      (service as any).updateBatteryInfo({
        ...mockBatteryInfo,
        health: 'overheat',
        temperature: 30,
      });
      expect(service.getBatteryHealthScore()).toBe(70); // 100 - 30 for overheat
    });

    it('should return 0 for dead battery', () => {
      (service as any).updateBatteryInfo({
        ...mockBatteryInfo,
        health: 'dead',
      });
      expect(service.getBatteryHealthScore()).toBe(0);
    });
  });

  describe('usage pattern analysis', () => {
    beforeEach(() => {
      // Add some usage history
      const usageHistory = [
        { timestamp: Date.now() - 60000, level: 0.8, isCharging: false },
        { timestamp: Date.now() - 30000, level: 0.75, isCharging: false },
        { timestamp: Date.now(), level: 0.7, isCharging: false },
      ];
      (service as any).usageHistory = usageHistory;
    });

    it('should return null pattern with insufficient data', () => {
      (service as any).usageHistory = [];
      const pattern = service.getBatteryUsagePattern();
      expect(pattern).toBeNull();
    });

    it('should calculate usage pattern with sufficient data', () => {
      // Add more data points
      const now = Date.now();
      const usageHistory = [];
      for (let i = 0; i < 30; i++) {
        usageHistory.push({
          timestamp: now - (i * 60000), // Every minute
          level: Math.max(0.1, 0.9 - (i * 0.02)), // Gradual decrease
          isCharging: false,
        });
      }
      (service as any).usageHistory = usageHistory;

      const pattern = service.getBatteryUsagePattern();
      expect(pattern).not.toBeNull();
      expect(pattern!.averageConsumptionPerHour).toBeGreaterThan(0);
      expect(pattern!.peakUsageTimes).toBeInstanceOf(Array);
      expect(pattern!.lastUpdated).toBeGreaterThan(0);
    });
  });

  describe('optimization recommendations', () => {
    it('should generate low battery recommendations', () => {
      (service as any).updateBatteryInfo({ ...mockBatteryInfo, level: 0.15 });
      const recommendations = service.generateOptimizationRecommendations();

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);

      const backgroundSyncRec = recommendations.find(r => r.type === 'background_sync');
      expect(backgroundSyncRec).toBeDefined();
      expect(backgroundSyncRec?.priority).toBe('high');
    });

    it('should generate critical battery recommendations', () => {
      (service as any).updateBatteryInfo({ ...mockBatteryInfo, level: 0.05 });
      const recommendations = service.generateOptimizationRecommendations();

      expect(recommendations.length).toBeGreaterThan(1);

      const animationRec = recommendations.find(r => r.type === 'animation_speed');
      expect(animationRec).toBeDefined();
      expect(animationRec?.action).toBe('disable');
    });

    it('should generate low power mode recommendations', () => {
      (service as any).updateBatteryInfo({ ...mockBatteryInfo, isLowPowerMode: true });
      const recommendations = service.generateOptimizationRecommendations();

      const backgroundSyncRec = recommendations.find(r => r.type === 'background_sync');
      expect(backgroundSyncRec).toBeDefined();
      expect(backgroundSyncRec?.title).toContain('Minimal Background Activity');
    });

    it('should generate no recommendations for good battery state', () => {
      (service as any).updateBatteryInfo({ ...mockBatteryInfo, level: 0.8, isLowPowerMode: false });
      const recommendations = service.generateOptimizationRecommendations();

      expect(recommendations.length).toBe(0);
    });
  });

  describe('battery listeners', () => {
    it('should add and remove battery listeners', () => {
      const mockListener = jest.fn();
      const unsubscribe = service.addBatteryListener(mockListener);

      // Trigger battery update
      (service as any).updateBatteryInfo({ ...mockBatteryInfo, level: 0.5 });

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({ level: 0.5 })
      );

      // Unsubscribe
      unsubscribe();

      // Trigger another update
      (service as any).updateBatteryInfo({ ...mockBatteryInfo, level: 0.4 });

      // Should not be called again
      expect(mockListener).toHaveBeenCalledTimes(1);
    });

    it('should handle listener errors gracefully', () => {
      const mockListener = jest.fn(() => {
        throw new Error('Listener error');
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      service.addBatteryListener(mockListener);
      (service as any).updateBatteryInfo({ ...mockBatteryInfo, level: 0.5 });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Error notifying battery listener:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('data persistence', () => {
    it('should save usage history to AsyncStorage', async () => {
      const mockHistory = [
        { timestamp: Date.now(), level: 0.75, isCharging: false },
      ];
      (service as any).usageHistory = mockHistory;

      await (service as any).saveUsageHistory();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'battery_usage_history',
        JSON.stringify(mockHistory)
      );
    });

    it('should load usage history from AsyncStorage', async () => {
      const mockHistory = [
        { timestamp: Date.now(), level: 0.75, isCharging: false },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockHistory));

      await (service as any).loadUsageHistory();

      expect((service as any).usageHistory).toEqual(mockHistory);
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await (service as any).saveUsageHistory();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to save battery usage history:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('cleanup', () => {
    it('should clean up resources on destroy', () => {
      const mockListener = jest.fn();
      service.addBatteryListener(mockListener);

      service.destroy();

      // Should not call listeners after destroy
      (service as any).updateBatteryInfo({ ...mockBatteryInfo, level: 0.5 });
      expect(mockListener).not.toHaveBeenCalled();
    });
  });
});