import { renderHook, act } from '@testing-library/react-hooks';
import usePowerManagement, { usePowerState, useBatteryStatus, useFeatureStates } from '../usePowerManagement';
import BatteryMonitoringService from '../../services/batteryMonitoring';
import ResourceMonitorService from '../../services/resourceMonitor';
import PowerStateManager from '../../services/powerStateManager';
import AdaptiveSyncEngine from '../../services/adaptiveSyncEngine';
import BackgroundTaskManager from '../../services/backgroundTaskManager';

// Mock services
jest.mock('../../services/batteryMonitoring');
jest.mock('../../services/resourceMonitor');
jest.mock('../../services/powerStateManager');
jest.mock('../../services/adaptiveSyncEngine');
jest.mock('../../services/backgroundTaskManager');

describe('usePowerManagement', () => {
  let mockBatteryService: jest.Mocked<BatteryMonitoringService>;
  let mockResourceService: jest.Mocked<ResourceMonitorService>;
  let mockPowerManager: jest.Mocked<PowerStateManager>;
  let mockSyncEngine: jest.Mocked<AdaptiveSyncEngine>;
  let mockTaskManager: jest.Mocked<BackgroundTaskManager>;

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

  const mockPowerProfile = {
    state: 'optimal' as const,
    features: {
      animations: 'enabled' as const,
      backgroundSync: 'enabled' as const,
      imageQuality: 'enabled' as const,
      notificationFrequency: 'enabled' as const,
      voiceProcessing: 'enabled' as const,
      locationServices: 'enabled' as const,
      hapticFeedback: 'enabled' as const,
      autoPreview: 'enabled' as const,
      richPresence: 'enabled' as const,
      pushNotifications: 'enabled' as const,
    },
    limits: {
      maxConcurrentTasks: 5,
      syncIntervalMs: 60000,
      cacheSize: 500,
      imageCompressionQuality: 0.9,
      maxNotificationsPerHour: 60,
      cpuUsageLimit: 80,
      memoryUsageLimit: 85,
    },
    thresholds: {
      battery: { optimal: 0.6, balanced: 0.4, batterySaver: 0.2, critical: 0.1 },
      thermal: { normal: 'nominal', warning: 'fair', critical: 'serious', emergency: 'critical' },
      performance: { cpuWarning: 70, cpuCritical: 90, memoryWarning: 80, memoryCritical: 95 },
    },
  };

  beforeEach(() => {
    // Mock services
    mockBatteryService = {
      getCurrentBatteryInfo: jest.fn().mockReturnValue(mockBatteryInfo),
      getBatteryHealthScore: jest.fn().mockReturnValue(95),
      generateOptimizationRecommendations: jest.fn().mockReturnValue([]),
      addBatteryListener: jest.fn().mockReturnValue(() => {}),
      getBatteryUsagePattern: jest.fn().mockReturnValue(null),
    } as any;

    mockResourceService = {
      getCurrentMetrics: jest.fn().mockReturnValue(mockResourceMetrics),
      getOptimizationSuggestions: jest.fn().mockReturnValue([]),
      isPerformanceGood: jest.fn().mockReturnValue(true),
      addListener: jest.fn().mockReturnValue(() => {}),
    } as any;

    mockPowerManager = {
      getCurrentPowerState: jest.fn().mockReturnValue('optimal'),
      getCurrentProfile: jest.fn().mockReturnValue(mockPowerProfile),
      getPowerSavingsEstimate: jest.fn().mockReturnValue('0% power savings'),
      getActiveRules: jest.fn().mockReturnValue([]),
      getFeatureState: jest.fn().mockReturnValue('enabled'),
      isFeatureEnabled: jest.fn().mockReturnValue(true),
      isFeatureReduced: jest.fn().mockReturnValue(false),
      forceProfile: jest.fn(),
      addPowerStateListener: jest.fn().mockReturnValue(() => {}),
      addFeatureDegradationListener: jest.fn().mockReturnValue(() => {}),
    } as any;

    mockSyncEngine = {
      getSyncMetrics: jest.fn().mockReturnValue(null),
      getActivityPattern: jest.fn().mockReturnValue(null),
      syncChannel: jest.fn().mockReturnValue('sync-id'),
      getCachedMessage: jest.fn().mockReturnValue(null),
      updateChannelPreference: jest.fn(),
    } as any;

    mockTaskManager = {
      getQueueMetrics: jest.fn().mockReturnValue({
        tasksQueued: 0,
        tasksRunning: 0,
        tasksCompleted: 0,
        tasksFailed: 0,
        averageWaitTime: 0,
        averageExecutionTime: 0,
        batteryOptimizationCount: 0,
        thermalThrottlingCount: 0,
      }),
      getQueueStatus: jest.fn().mockReturnValue({
        queued: 0,
        running: 0,
        queuedByPriority: {},
      }),
      addTask: jest.fn().mockReturnValue('task-id'),
      cancelTask: jest.fn().mockReturnValue(true),
      pauseProcessing: jest.fn(),
      resumeProcessing: jest.fn(),
    } as any;

    // Mock getInstance methods
    (BatteryMonitoringService.getInstance as jest.Mock).mockReturnValue(mockBatteryService);
    (ResourceMonitorService.getInstance as jest.Mock).mockReturnValue(mockResourceService);
    (PowerStateManager.getInstance as jest.Mock).mockReturnValue(mockPowerManager);
    (AdaptiveSyncEngine.getInstance as jest.Mock).mockReturnValue(mockSyncEngine);
    (BackgroundTaskManager.getInstance as jest.Mock).mockReturnValue(mockTaskManager);

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('usePowerManagement hook', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => usePowerManagement());

      expect(result.current[0].isLoading).toBe(true);
      expect(result.current[0].battery).toBeNull();
    });

    it('should load initial data', async () => {
      const { result, waitForNextUpdate } = renderHook(() => usePowerManagement());

      await waitForNextUpdate();

      expect(result.current[0].isLoading).toBe(false);
      expect(result.current[0].battery).toEqual(mockBatteryInfo);
      expect(result.current[0].resources).toEqual(mockResourceMetrics);
      expect(result.current[0].powerState).toBe('optimal');
    });

    it('should provide action methods', async () => {
      const { result, waitForNextUpdate } = renderHook(() => usePowerManagement());

      await waitForNextUpdate();

      const [, actions] = result.current;

      expect(typeof actions.forcePowerState).toBe('function');
      expect(typeof actions.refreshData).toBe('function');
      expect(typeof actions.getFeatureState).toBe('function');
      expect(typeof actions.syncChannel).toBe('function');
    });

    it('should handle forcePowerState action', async () => {
      const { result, waitForNextUpdate } = renderHook(() => usePowerManagement());

      await waitForNextUpdate();

      act(() => {
        result.current[1].forcePowerState('battery_saver');
      });

      expect(mockPowerManager.forceProfile).toHaveBeenCalledWith('battery_saver');
    });

    it('should handle syncChannel action', async () => {
      const { result, waitForNextUpdate } = renderHook(() => usePowerManagement());

      await waitForNextUpdate();

      const syncId = result.current[1].syncChannel('channel-123', true);

      expect(mockSyncEngine.syncChannel).toHaveBeenCalledWith('channel-123', true);
      expect(syncId).toBe('sync-id');
    });

    it('should handle addBackgroundTask action', async () => {
      const { result, waitForNextUpdate } = renderHook(() => usePowerManagement());

      await waitForNextUpdate();

      const task = {
        category: 'message_sync',
        priority: 'high',
        estimatedDuration: 1000,
        estimatedCpuUsage: 20,
        estimatedMemoryUsage: 10,
        estimatedBatteryImpact: 3,
        requiresNetwork: true,
        canRunOnMeteredConnection: false,
        maxRetries: 3,
        data: {},
      };

      const taskId = result.current[1].addBackgroundTask(task);

      expect(mockTaskManager.addTask).toHaveBeenCalledWith(task);
      expect(taskId).toBe('task-id');
    });

    it('should handle errors gracefully', async () => {
      mockBatteryService.getCurrentBatteryInfo.mockImplementation(() => {
        throw new Error('Service error');
      });

      const { result, waitForNextUpdate } = renderHook(() => usePowerManagement());

      await waitForNextUpdate();

      expect(result.current[0].error).toBe('Service error');
      expect(result.current[0].isLoading).toBe(false);
    });

    it('should setup event listeners when enabled', async () => {
      renderHook(() => usePowerManagement({ enableEventListeners: true }));

      expect(mockBatteryService.addBatteryListener).toHaveBeenCalled();
      expect(mockResourceService.addListener).toHaveBeenCalled();
      expect(mockPowerManager.addPowerStateListener).toHaveBeenCalled();
      expect(mockPowerManager.addFeatureDegradationListener).toHaveBeenCalled();
    });

    it('should not setup event listeners when disabled', () => {
      renderHook(() => usePowerManagement({ enableEventListeners: false }));

      expect(mockBatteryService.addBatteryListener).not.toHaveBeenCalled();
      expect(mockResourceService.addListener).not.toHaveBeenCalled();
    });

    it('should auto-refresh data when enabled', async () => {
      const { waitForNextUpdate } = renderHook(() =>
        usePowerManagement({ autoRefresh: true, refreshInterval: 1000 })
      );

      await waitForNextUpdate();

      // Clear initial calls
      mockTaskManager.getQueueMetrics.mockClear();
      mockSyncEngine.getSyncMetrics.mockClear();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockTaskManager.getQueueMetrics).toHaveBeenCalled();
      expect(mockSyncEngine.getSyncMetrics).toHaveBeenCalled();
    });
  });

  describe('usePowerState hook', () => {
    it('should provide power state information', async () => {
      const { result, waitForNextUpdate } = renderHook(() => usePowerState());

      await waitForNextUpdate();

      expect(result.current.powerState).toBe('optimal');
      expect(result.current.isOptimal).toBe(true);
      expect(result.current.isBatterySaver).toBe(false);
      expect(result.current.isCritical).toBe(false);
      expect(result.current.savingsEstimate).toBe('0% power savings');
    });

    it('should update when power state changes', async () => {
      const { result, waitForNextUpdate } = renderHook(() => usePowerState());

      await waitForNextUpdate();

      // Simulate power state change
      act(() => {
        mockPowerManager.getCurrentPowerState.mockReturnValue('battery_saver');
        mockPowerManager.getPowerSavingsEstimate.mockReturnValue('30-40% power savings');

        // Simulate listener callback
        const listener = mockPowerManager.addPowerStateListener.mock.calls[0][0];
        listener({
          previous: 'optimal',
          current: 'battery_saver',
          reason: 'Low battery',
          timestamp: Date.now(),
          profile: { ...mockPowerProfile, state: 'battery_saver' },
        });
      });

      expect(result.current.powerState).toBe('battery_saver');
      expect(result.current.isBatterySaver).toBe(true);
      expect(result.current.isOptimal).toBe(false);
    });
  });

  describe('useBatteryStatus hook', () => {
    it('should provide battery status information', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useBatteryStatus());

      await waitForNextUpdate();

      expect(result.current.level).toBe(0.8);
      expect(result.current.isCharging).toBe(false);
      expect(result.current.isLowPowerMode).toBe(false);
      expect(result.current.healthScore).toBe(95);
      expect(result.current.isLow).toBe(false);
      expect(result.current.isCritical).toBe(false);
    });

    it('should detect low and critical battery states', async () => {
      mockBatteryService.getCurrentBatteryInfo.mockReturnValue({
        ...mockBatteryInfo,
        level: 0.05, // Critical level
      });

      const { result, waitForNextUpdate } = renderHook(() => useBatteryStatus());

      await waitForNextUpdate();

      expect(result.current.level).toBe(0.05);
      expect(result.current.isLow).toBe(true);
      expect(result.current.isCritical).toBe(true);
    });

    it('should update when battery changes', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useBatteryStatus());

      await waitForNextUpdate();

      // Simulate battery change
      act(() => {
        const newBatteryInfo = { ...mockBatteryInfo, level: 0.15, isCharging: true };
        mockBatteryService.getCurrentBatteryInfo.mockReturnValue(newBatteryInfo);

        // Simulate listener callback
        const listener = mockBatteryService.addBatteryListener.mock.calls[0][0];
        listener(newBatteryInfo);
      });

      expect(result.current.level).toBe(0.15);
      expect(result.current.isCharging).toBe(true);
      expect(result.current.isLow).toBe(true);
      expect(result.current.isCritical).toBe(false);
    });
  });

  describe('useFeatureStates hook', () => {
    it('should provide feature state information', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useFeatureStates());

      await waitForNextUpdate();

      expect(result.current.animations).toBe('enabled');
      expect(result.current.backgroundSync).toBe('enabled');
      expect(result.current.imageQuality).toBe('enabled');
      expect(typeof result.current.getFeatureState).toBe('function');
      expect(typeof result.current.isEnabled).toBe('function');
      expect(typeof result.current.isReduced).toBe('function');
    });

    it('should provide feature state methods', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useFeatureStates());

      await waitForNextUpdate();

      const animationState = result.current.getFeatureState('animations');
      const isEnabled = result.current.isEnabled('animations');
      const isReduced = result.current.isReduced('animations');

      expect(mockPowerManager.getFeatureState).toHaveBeenCalledWith('animations');
      expect(mockPowerManager.isFeatureEnabled).toHaveBeenCalledWith('animations');
      expect(mockPowerManager.isFeatureReduced).toHaveBeenCalledWith('animations');
    });
  });

  describe('hook cleanup', () => {
    it('should cleanup listeners on unmount', async () => {
      const batteryUnsubscribe = jest.fn();
      const resourceUnsubscribe = jest.fn();
      const powerStateUnsubscribe = jest.fn();
      const featureUnsubscribe = jest.fn();

      mockBatteryService.addBatteryListener.mockReturnValue(batteryUnsubscribe);
      mockResourceService.addListener.mockReturnValue(resourceUnsubscribe);
      mockPowerManager.addPowerStateListener.mockReturnValue(powerStateUnsubscribe);
      mockPowerManager.addFeatureDegradationListener.mockReturnValue(featureUnsubscribe);

      const { unmount, waitForNextUpdate } = renderHook(() =>
        usePowerManagement({ enableEventListeners: true })
      );

      await waitForNextUpdate();

      unmount();

      expect(batteryUnsubscribe).toHaveBeenCalled();
      expect(resourceUnsubscribe).toHaveBeenCalled();
      expect(powerStateUnsubscribe).toHaveBeenCalled();
      expect(featureUnsubscribe).toHaveBeenCalled();
    });
  });
});