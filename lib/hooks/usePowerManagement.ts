import { useState, useEffect, useCallback } from 'react';
import BatteryMonitoringService, { BatteryInfo, PowerOptimizationRecommendation } from '../services/batteryMonitoring';
import ResourceMonitorService, { ResourceMetrics, OptimizationSuggestion } from '../services/resourceMonitor';
import PowerStateManager, { PowerState, PowerProfile, PowerStateChangeEvent, FeatureDegradationEvent, FeatureState } from '../services/powerStateManager';
import AdaptiveSyncEngine, { SyncMetrics, UserActivityPattern } from '../services/adaptiveSyncEngine';
import BackgroundTaskManager, { TaskSchedulerMetrics } from '../services/backgroundTaskManager';

export interface PowerManagementState {
  // Battery state
  battery: BatteryInfo | null;
  batteryHealthScore: number;
  batteryRecommendations: PowerOptimizationRecommendation[];

  // Resource state
  resources: ResourceMetrics | null;
  resourceSuggestions: OptimizationSuggestion[];
  isPerformanceGood: boolean;

  // Power management state
  powerState: PowerState;
  powerProfile: PowerProfile | null;
  powerSavingsEstimate: string;
  activeRules: string[];

  // Sync state
  syncMetrics: SyncMetrics | null;
  activityPattern: UserActivityPattern | null;

  // Task management state
  taskMetrics: TaskSchedulerMetrics | null;
  queueStatus: {
    queued: number;
    running: number;
    queuedByPriority: Record<string, number>;
  } | null;

  // Loading and error states
  isLoading: boolean;
  error: string | null;
}

export interface PowerManagementActions {
  // Power state actions
  forcePowerState: (state: PowerState) => void;
  refreshData: () => Promise<void>;

  // Feature control
  getFeatureState: (feature: keyof PowerProfile['features']) => FeatureState;
  isFeatureEnabled: (feature: keyof PowerProfile['features']) => boolean;
  isFeatureReduced: (feature: keyof PowerProfile['features']) => boolean;

  // Sync actions
  syncChannel: (channelId: string, immediate?: boolean) => string;
  getCachedMessage: (messageId: string) => any | null;
  updateChannelPreference: (channelId: string, preference: any) => void;

  // Task actions
  addBackgroundTask: (task: any) => string;
  cancelTask: (taskId: string) => boolean;
  pauseTaskProcessing: () => void;
  resumeTaskProcessing: () => void;

  // Analytics actions
  getBatteryUsagePattern: () => any | null;
  generateOptimizationRecommendations: () => PowerOptimizationRecommendation[];
}

export interface UsePowerManagementOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableEventListeners?: boolean;
}

export function usePowerManagement(options: UsePowerManagementOptions = {}): [PowerManagementState, PowerManagementActions] {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    enableEventListeners = true
  } = options;

  // Initialize services
  const batteryService = BatteryMonitoringService.getInstance();
  const resourceService = ResourceMonitorService.getInstance();
  const powerManager = PowerStateManager.getInstance();
  const syncEngine = AdaptiveSyncEngine.getInstance();
  const taskManager = BackgroundTaskManager.getInstance();

  // State
  const [state, setState] = useState<PowerManagementState>({
    battery: null,
    batteryHealthScore: 0,
    batteryRecommendations: [],
    resources: null,
    resourceSuggestions: [],
    isPerformanceGood: true,
    powerState: 'optimal',
    powerProfile: null,
    powerSavingsEstimate: '',
    activeRules: [],
    syncMetrics: null,
    activityPattern: null,
    taskMetrics: null,
    queueStatus: null,
    isLoading: true,
    error: null,
  });

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Load all data
      const battery = batteryService.getCurrentBatteryInfo();
      const batteryHealthScore = batteryService.getBatteryHealthScore();
      const batteryRecommendations = batteryService.generateOptimizationRecommendations();

      const resources = resourceService.getCurrentMetrics();
      const resourceSuggestions = resourceService.getOptimizationSuggestions();
      const isPerformanceGood = resourceService.isPerformanceGood();

      const powerState = powerManager.getCurrentPowerState();
      const powerProfile = powerManager.getCurrentProfile();
      const powerSavingsEstimate = powerManager.getPowerSavingsEstimate();
      const activeRules = powerManager.getActiveRules();

      const syncMetrics = syncEngine.getSyncMetrics();
      const activityPattern = syncEngine.getActivityPattern();

      const taskMetrics = taskManager.getQueueMetrics();
      const queueStatus = taskManager.getQueueStatus();

      setState(prev => ({
        ...prev,
        battery,
        batteryHealthScore,
        batteryRecommendations,
        resources,
        resourceSuggestions,
        isPerformanceGood,
        powerState,
        powerProfile,
        powerSavingsEstimate,
        activeRules,
        syncMetrics,
        activityPattern,
        taskMetrics,
        queueStatus,
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        isLoading: false,
      }));
    }
  }, [batteryService, resourceService, powerManager, syncEngine, taskManager]);

  // Set up event listeners
  useEffect(() => {
    if (!enableEventListeners) return;

    const unsubscribeFunctions: Array<() => void> = [];

    // Battery events
    const batteryUnsubscribe = batteryService.addBatteryListener((batteryInfo) => {
      setState(prev => ({
        ...prev,
        battery: batteryInfo,
        batteryHealthScore: batteryService.getBatteryHealthScore(),
        batteryRecommendations: batteryService.generateOptimizationRecommendations(),
      }));
    });
    unsubscribeFunctions.push(batteryUnsubscribe);

    // Resource events
    const resourceUnsubscribe = resourceService.addListener((resourceMetrics) => {
      setState(prev => ({
        ...prev,
        resources: resourceMetrics,
        resourceSuggestions: resourceService.getOptimizationSuggestions(),
        isPerformanceGood: resourceService.isPerformanceGood(),
      }));
    });
    unsubscribeFunctions.push(resourceUnsubscribe);

    // Power state events
    const powerStateUnsubscribe = powerManager.addPowerStateListener((event: PowerStateChangeEvent) => {
      setState(prev => ({
        ...prev,
        powerState: event.current,
        powerProfile: event.profile,
        powerSavingsEstimate: powerManager.getPowerSavingsEstimate(),
        activeRules: powerManager.getActiveRules(),
      }));
    });
    unsubscribeFunctions.push(powerStateUnsubscribe);

    // Feature degradation events
    const featureUnsubscribe = powerManager.addFeatureDegradationListener((event: FeatureDegradationEvent) => {
      // Could emit notifications or logs about feature changes
      console.log(`Feature ${event.feature} changed from ${event.previous} to ${event.current}: ${event.reason}`);
    });
    unsubscribeFunctions.push(featureUnsubscribe);

    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }, [enableEventListeners, batteryService, resourceService, powerManager]);

  // Auto refresh data
  useEffect(() => {
    if (!autoRefresh) return;

    loadData(); // Initial load

    const intervalId = setInterval(() => {
      // Only refresh certain data automatically to avoid excessive updates
      setState(prev => ({
        ...prev,
        taskMetrics: taskManager.getQueueMetrics(),
        queueStatus: taskManager.getQueueStatus(),
        syncMetrics: syncEngine.getSyncMetrics(),
      }));
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, loadData, taskManager, syncEngine]);

  // Actions
  const actions: PowerManagementActions = {
    forcePowerState: useCallback((powerState: PowerState) => {
      try {
        powerManager.forceProfile(powerState);
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to force power state',
        }));
      }
    }, [powerManager]),

    refreshData: useCallback(async () => {
      await loadData();
    }, [loadData]),

    getFeatureState: useCallback((feature: keyof PowerProfile['features']) => {
      return powerManager.getFeatureState(feature);
    }, [powerManager]),

    isFeatureEnabled: useCallback((feature: keyof PowerProfile['features']) => {
      return powerManager.isFeatureEnabled(feature);
    }, [powerManager]),

    isFeatureReduced: useCallback((feature: keyof PowerProfile['features']) => {
      return powerManager.isFeatureReduced(feature);
    }, [powerManager]),

    syncChannel: useCallback((channelId: string, immediate: boolean = false) => {
      return syncEngine.syncChannel(channelId, immediate);
    }, [syncEngine]),

    getCachedMessage: useCallback((messageId: string) => {
      return syncEngine.getCachedMessage(messageId);
    }, [syncEngine]),

    updateChannelPreference: useCallback((channelId: string, preference: any) => {
      syncEngine.updateChannelPreference(channelId, preference);
    }, [syncEngine]),

    addBackgroundTask: useCallback((task: any) => {
      return taskManager.addTask(task);
    }, [taskManager]),

    cancelTask: useCallback((taskId: string) => {
      return taskManager.cancelTask(taskId);
    }, [taskManager]),

    pauseTaskProcessing: useCallback(() => {
      taskManager.pauseProcessing();
    }, [taskManager]),

    resumeTaskProcessing: useCallback(() => {
      taskManager.resumeProcessing();
    }, [taskManager]),

    getBatteryUsagePattern: useCallback(() => {
      return batteryService.getBatteryUsagePattern();
    }, [batteryService]),

    generateOptimizationRecommendations: useCallback(() => {
      return batteryService.generateOptimizationRecommendations();
    }, [batteryService]),
  };

  return [state, actions];
}

// Helper hook for simple power state checking
export function usePowerState(): {
  powerState: PowerState;
  isOptimal: boolean;
  isBatterySaver: boolean;
  isCritical: boolean;
  savingsEstimate: string;
} {
  const [state] = usePowerManagement({
    autoRefresh: true,
    refreshInterval: 10000,
    enableEventListeners: true,
  });

  return {
    powerState: state.powerState,
    isOptimal: state.powerState === 'optimal',
    isBatterySaver: state.powerState === 'battery_saver',
    isCritical: state.powerState === 'critical',
    savingsEstimate: state.powerSavingsEstimate,
  };
}

// Helper hook for battery monitoring
export function useBatteryStatus(): {
  level: number;
  isCharging: boolean;
  isLowPowerMode: boolean;
  healthScore: number;
  recommendations: PowerOptimizationRecommendation[];
  isLow: boolean;
  isCritical: boolean;
} {
  const [state] = usePowerManagement({
    autoRefresh: true,
    refreshInterval: 5000,
    enableEventListeners: true,
  });

  return {
    level: state.battery?.level || 0,
    isCharging: state.battery?.isCharging || false,
    isLowPowerMode: state.battery?.isLowPowerMode || false,
    healthScore: state.batteryHealthScore,
    recommendations: state.batteryRecommendations,
    isLow: (state.battery?.level || 1) <= 0.2,
    isCritical: (state.battery?.level || 1) <= 0.1,
  };
}

// Helper hook for feature state checking
export function useFeatureStates(): {
  animations: FeatureState;
  backgroundSync: FeatureState;
  imageQuality: FeatureState;
  notificationFrequency: FeatureState;
  voiceProcessing: FeatureState;
  getFeatureState: (feature: keyof PowerProfile['features']) => FeatureState;
  isEnabled: (feature: keyof PowerProfile['features']) => boolean;
  isReduced: (feature: keyof PowerProfile['features']) => boolean;
} {
  const [, actions] = usePowerManagement({
    autoRefresh: true,
    refreshInterval: 30000,
    enableEventListeners: true,
  });

  return {
    animations: actions.getFeatureState('animations'),
    backgroundSync: actions.getFeatureState('backgroundSync'),
    imageQuality: actions.getFeatureState('imageQuality'),
    notificationFrequency: actions.getFeatureState('notificationFrequency'),
    voiceProcessing: actions.getFeatureState('voiceProcessing'),
    getFeatureState: actions.getFeatureState,
    isEnabled: actions.isFeatureEnabled,
    isReduced: actions.isFeatureReduced,
  };
}

export default usePowerManagement;