import PowerStateManager, { PowerState, FeatureState, PowerStateChangeEvent, FeatureDegradationEvent } from '../powerStateManager';
import BatteryMonitoringService from '../batteryMonitoring';
import ResourceMonitorService from '../resourceMonitor';
import AdaptiveSyncEngine from '../adaptiveSyncEngine';
import BackgroundTaskManager from '../backgroundTaskManager';

// Mock dependencies
jest.mock('../batteryMonitoring');
jest.mock('../resourceMonitor');
jest.mock('../adaptiveSyncEngine');
jest.mock('../backgroundTaskManager');

jest.mock('react-native', () => ({
  DeviceEventEmitter: {
    emit: jest.fn(),
  },
}));

describe('PowerStateManager', () => {
  let powerManager: PowerStateManager;
  let mockBatteryService: jest.Mocked<BatteryMonitoringService>;
  let mockResourceService: jest.Mocked<ResourceMonitorService>;

  const mockBatteryInfo = {
    level: 0.8,
    isCharging: false,
    isLowPowerMode: false,
    temperature: 30,
  };

  const mockResourceMetrics = {
    cpu: { usage: 30, temperature: 30, throttling: false },
    memory: { used: 1000, total: 4000, available: 3000, pressure: 'normal' as const },
    thermal: { state: 'nominal' as const, temperature: 30, throttling: false },
    network: { bytesReceived: 100, bytesSent: 50, packetsReceived: 10, packetsSent: 5, connectionType: 'wifi' as const },
    storage: { used: 20000, total: 64000, available: 44000, pressure: 'normal' as const },
    timestamp: Date.now(),
  };

  beforeEach(() => {
    // Reset singletons
    (PowerStateManager as any).instance = null;
    (BatteryMonitoringService as any).instance = null;
    (ResourceMonitorService as any).instance = null;
    (AdaptiveSyncEngine as any).instance = null;
    (BackgroundTaskManager as any).instance = null;

    // Mock services
    mockBatteryService = {
      getCurrentBatteryInfo: jest.fn().mockReturnValue(mockBatteryInfo),
      addBatteryListener: jest.fn().mockReturnValue(() => {}),
    } as any;

    mockResourceService = {
      getCurrentMetrics: jest.fn().mockReturnValue(mockResourceMetrics),
      addListener: jest.fn().mockReturnValue(() => {}),
    } as any;

    (BatteryMonitoringService.getInstance as jest.Mock).mockReturnValue(mockBatteryService);
    (ResourceMonitorService.getInstance as jest.Mock).mockReturnValue(mockResourceService);
    (AdaptiveSyncEngine.getInstance as jest.Mock).mockReturnValue({});
    (BackgroundTaskManager.getInstance as jest.Mock).mockReturnValue({});

    powerManager = PowerStateManager.getInstance();

    jest.useFakeTimers();
  });

  afterEach(() => {
    powerManager.destroy();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create singleton instance', () => {
      const instance1 = PowerStateManager.getInstance();
      const instance2 = PowerStateManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should start with optimal power state', () => {
      expect(powerManager.getCurrentPowerState()).toBe('optimal');
    });

    it('should set up battery and resource listeners', () => {
      expect(mockBatteryService.addBatteryListener).toHaveBeenCalled();
      expect(mockResourceService.addListener).toHaveBeenCalled();
    });
  });

  describe('power state transitions', () => {
    it('should transition to critical state on very low battery', () => {
      const listener = jest.fn();
      powerManager.addPowerStateListener(listener);

      mockBatteryService.getCurrentBatteryInfo.mockReturnValue({
        ...mockBatteryInfo,
        level: 0.05, // Critical level
      });

      (powerManager as any).evaluateAndApplyRules();

      expect(powerManager.getCurrentPowerState()).toBe('critical');
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          current: 'critical',
          previous: 'optimal',
        })
      );
    });

    it('should transition to battery_saver on low battery', () => {
      mockBatteryService.getCurrentBatteryInfo.mockReturnValue({
        ...mockBatteryInfo,
        level: 0.15, // Low level
      });

      (powerManager as any).evaluateAndApplyRules();

      expect(powerManager.getCurrentPowerState()).toBe('battery_saver');
    });

    it('should transition to critical on low power mode', () => {
      mockBatteryService.getCurrentBatteryInfo.mockReturnValue({
        ...mockBatteryInfo,
        level: 0.5,
        isLowPowerMode: true,
      });

      (powerManager as any).evaluateAndApplyRules();

      expect(powerManager.getCurrentPowerState()).toBe('critical');
    });

    it('should transition to balanced on moderate battery', () => {
      mockBatteryService.getCurrentBatteryInfo.mockReturnValue({
        ...mockBatteryInfo,
        level: 0.3, // Moderate level
      });

      (powerManager as any).evaluateAndApplyRules();

      expect(powerManager.getCurrentPowerState()).toBe('balanced');
    });

    it('should transition based on thermal state', () => {
      mockResourceService.getCurrentMetrics.mockReturnValue({
        ...mockResourceMetrics,
        thermal: { state: 'critical', temperature: 60, throttling: true },
      });

      (powerManager as any).evaluateAndApplyRules();

      expect(powerManager.getCurrentPowerState()).toBe('balanced');
    });
  });

  describe('rule evaluation', () => {
    it('should apply critical battery rule', () => {
      const rule = (powerManager as any).degradationRules.find((r: any) => r.id === 'critical_battery');
      expect(rule).toBeDefined();

      const applies = (powerManager as any).evaluateRuleCondition(
        rule,
        { ...mockBatteryInfo, level: 0.05 },
        mockResourceMetrics
      );

      expect(applies).toBe(true);
    });

    it('should not apply critical battery rule for good battery', () => {
      const rule = (powerManager as any).degradationRules.find((r: any) => r.id === 'critical_battery');

      const applies = (powerManager as any).evaluateRuleCondition(
        rule,
        { ...mockBatteryInfo, level: 0.8 },
        mockResourceMetrics
      );

      expect(applies).toBe(false);
    });

    it('should apply thermal rule for critical temperature', () => {
      const rule = (powerManager as any).degradationRules.find((r: any) => r.id === 'thermal_critical');

      const applies = (powerManager as any).evaluateRuleCondition(
        rule,
        mockBatteryInfo,
        { ...mockResourceMetrics, thermal: { state: 'critical' } }
      );

      expect(applies).toBe(true);
    });

    it('should apply high CPU usage rule', () => {
      const rule = (powerManager as any).degradationRules.find((r: any) => r.id === 'high_cpu_usage');

      const applies = (powerManager as any).evaluateRuleCondition(
        rule,
        mockBatteryInfo,
        { ...mockResourceMetrics, cpu: { usage: 90 } }
      );

      expect(applies).toBe(true);
    });

    it('should apply high memory usage rule', () => {
      const rule = (powerManager as any).degradationRules.find((r: any) => r.id === 'high_memory_usage');

      const applies = (powerManager as any).evaluateRuleCondition(
        rule,
        mockBatteryInfo,
        { ...mockResourceMetrics, memory: { ...mockResourceMetrics.memory, used: 3800, total: 4000 } } // 95% usage
      );

      expect(applies).toBe(true);
    });
  });

  describe('feature state management', () => {
    it('should provide current feature states', () => {
      const animationState = powerManager.getFeatureState('animations');
      expect(animationState).toBe('enabled'); // Default for optimal state
    });

    it('should check if feature is enabled', () => {
      expect(powerManager.isFeatureEnabled('animations')).toBe(true);
      expect(powerManager.isFeatureReduced('animations')).toBe(false);
    });

    it('should degrade features based on power state', () => {
      // Force to critical state
      powerManager.forceProfile('critical');

      expect(powerManager.getFeatureState('animations')).toBe('disabled');
      expect(powerManager.isFeatureEnabled('animations')).toBe(false);
    });

    it('should emit feature degradation events', () => {
      const listener = jest.fn();
      powerManager.addFeatureDegradationListener(listener);

      // Force degradation
      powerManager.forceProfile('battery_saver');

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('power savings estimation', () => {
    it('should provide savings estimates for different states', () => {
      expect(powerManager.getPowerSavingsEstimate()).toBe('0% power savings (optimal performance)');

      powerManager.forceProfile('balanced');
      expect(powerManager.getPowerSavingsEstimate()).toBe('15-20% power savings');

      powerManager.forceProfile('battery_saver');
      expect(powerManager.getPowerSavingsEstimate()).toBe('30-40% power savings');

      powerManager.forceProfile('critical');
      expect(powerManager.getPowerSavingsEstimate()).toBe('50-60% power savings');
    });
  });

  describe('manual power state control', () => {
    it('should force power profile', () => {
      const listener = jest.fn();
      powerManager.addPowerStateListener(listener);

      powerManager.forceProfile('battery_saver');

      expect(powerManager.getCurrentPowerState()).toBe('battery_saver');
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          current: 'battery_saver',
          previous: 'optimal',
          reason: 'Manually forced profile',
        })
      );
    });

    it('should maintain forced profile until changed', () => {
      powerManager.forceProfile('critical');
      expect(powerManager.getCurrentPowerState()).toBe('critical');

      // Simulate good conditions that would normally change state
      mockBatteryService.getCurrentBatteryInfo.mockReturnValue({
        ...mockBatteryInfo,
        level: 0.9,
        isCharging: true,
      });

      // State should remain forced until another manual change
      expect(powerManager.getCurrentPowerState()).toBe('critical');
    });
  });

  describe('active rules tracking', () => {
    it('should track active rules', () => {
      // Apply a rule condition
      mockBatteryService.getCurrentBatteryInfo.mockReturnValue({
        ...mockBatteryInfo,
        level: 0.05, // Critical battery
      });

      (powerManager as any).evaluateAndApplyRules();

      const activeRules = powerManager.getActiveRules();
      expect(activeRules).toContain('critical_battery');
    });

    it('should remove rules when conditions no longer apply', () => {
      // Apply critical battery condition
      mockBatteryService.getCurrentBatteryInfo.mockReturnValue({
        ...mockBatteryInfo,
        level: 0.05,
      });

      (powerManager as any).evaluateAndApplyRules();
      expect(powerManager.getActiveRules()).toContain('critical_battery');

      // Improve battery condition
      mockBatteryService.getCurrentBatteryInfo.mockReturnValue({
        ...mockBatteryInfo,
        level: 0.8,
      });

      (powerManager as any).evaluateAndApplyRules();
      expect(powerManager.getActiveRules()).not.toContain('critical_battery');
    });
  });

  describe('listeners', () => {
    it('should add and remove power state listeners', () => {
      const listener = jest.fn();
      const unsubscribe = powerManager.addPowerStateListener(listener);

      powerManager.forceProfile('battery_saver');
      expect(listener).toHaveBeenCalled();

      unsubscribe();
      listener.mockClear();

      powerManager.forceProfile('optimal');
      expect(listener).not.toHaveBeenCalled();
    });

    it('should add and remove feature degradation listeners', () => {
      const listener = jest.fn();
      const unsubscribe = powerManager.addFeatureDegradationListener(listener);

      powerManager.forceProfile('critical');
      expect(listener).toHaveBeenCalled();

      unsubscribe();
      listener.mockClear();

      powerManager.forceProfile('optimal');
      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      powerManager.addPowerStateListener(errorListener);
      powerManager.forceProfile('battery_saver');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Error notifying power state change listener:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('profile management', () => {
    it('should provide current profile', () => {
      const profile = powerManager.getCurrentProfile();
      expect(profile.state).toBe('optimal');
      expect(profile.features).toBeDefined();
      expect(profile.limits).toBeDefined();
      expect(profile.thresholds).toBeDefined();
    });

    it('should return a copy of the profile (not reference)', () => {
      const profile1 = powerManager.getCurrentProfile();
      const profile2 = powerManager.getCurrentProfile();

      expect(profile1).not.toBe(profile2); // Different objects
      expect(profile1).toEqual(profile2); // But same content
    });
  });

  describe('integration with system events', () => {
    it('should emit device events for power profile changes', () => {
      const { DeviceEventEmitter } = require('react-native');

      powerManager.forceProfile('battery_saver');

      expect(DeviceEventEmitter.emit).toHaveBeenCalledWith(
        'PowerProfileChanged',
        expect.objectContaining({
          state: 'battery_saver',
        })
      );
    });

    it('should emit device events for feature degradation', () => {
      const { DeviceEventEmitter } = require('react-native');

      powerManager.forceProfile('critical');

      expect(DeviceEventEmitter.emit).toHaveBeenCalledWith(
        'FeatureDegradation',
        expect.objectContaining({
          feature: expect.any(String),
          current: expect.any(String),
          previous: expect.any(String),
        })
      );
    });
  });

  describe('lifecycle management', () => {
    it('should start and stop monitoring', () => {
      powerManager.stop();
      expect((powerManager as any).isActive).toBe(false);

      powerManager.start();
      expect((powerManager as any).isActive).toBe(true);
    });

    it('should clean up on destroy', () => {
      const listener = jest.fn();
      powerManager.addPowerStateListener(listener);

      powerManager.destroy();

      expect((powerManager as any).isActive).toBe(false);
      expect((powerManager as any).listeners).toEqual([]);
      expect((powerManager as any).featureListeners).toEqual([]);
    });
  });
});