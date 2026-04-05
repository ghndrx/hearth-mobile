import { DeviceEventEmitter } from 'react-native';
import BatteryMonitoringService, { BatteryInfo } from './batteryMonitoring';
import ResourceMonitorService, { ResourceMetrics } from './resourceMonitor';
import AdaptiveSyncEngine from './adaptiveSyncEngine';
import BackgroundTaskManager from './backgroundTaskManager';

export type PowerState = 'optimal' | 'balanced' | 'battery_saver' | 'critical';

export type FeatureState = 'enabled' | 'reduced' | 'minimal' | 'disabled';

export interface PowerProfile {
  state: PowerState;
  features: {
    animations: FeatureState;
    backgroundSync: FeatureState;
    imageQuality: FeatureState;
    notificationFrequency: FeatureState;
    voiceProcessing: FeatureState;
    locationServices: FeatureState;
    hapticFeedback: FeatureState;
    autoPreview: FeatureState;
    richPresence: FeatureState;
    pushNotifications: FeatureState;
  };
  limits: {
    maxConcurrentTasks: number;
    syncIntervalMs: number;
    cacheSize: number;
    imageCompressionQuality: number;
    maxNotificationsPerHour: number;
    cpuUsageLimit: number;
    memoryUsageLimit: number;
  };
  thresholds: {
    battery: {
      optimal: number;     // 0.6+
      balanced: number;    // 0.4-0.6
      batterySaver: number; // 0.2-0.4
      critical: number;    // <0.2
    };
    thermal: {
      normal: string;      // 'nominal'
      warning: string;     // 'fair'
      critical: string;    // 'serious'
      emergency: string;   // 'critical'
    };
    performance: {
      cpuWarning: number;  // 70%
      cpuCritical: number; // 90%
      memoryWarning: number; // 80%
      memoryCritical: number; // 95%
    };
  };
}

export interface PerformanceDegradationRule {
  id: string;
  name: string;
  condition: {
    battery?: { operator: '<' | '<=' | '>' | '>='; value: number };
    thermal?: { states: string[] };
    cpu?: { operator: '<' | '<=' | '>' | '>='; value: number };
    memory?: { operator: '<' | '<=' | '>' | '>='; value: number };
    powerMode?: boolean; // System low power mode
  };
  actions: {
    features?: Partial<PowerProfile['features']>;
    limits?: Partial<PowerProfile['limits']>;
  };
  priority: number; // Higher number = higher priority
  reversible: boolean;
}

export interface PowerStateChangeEvent {
  previous: PowerState;
  current: PowerState;
  reason: string;
  timestamp: number;
  profile: PowerProfile;
}

export interface FeatureDegradationEvent {
  feature: keyof PowerProfile['features'];
  previous: FeatureState;
  current: FeatureState;
  reason: string;
  impact: string;
  timestamp: number;
}

class PowerStateManager {
  private static instance: PowerStateManager;
  private currentProfile: PowerProfile;
  private batteryService: BatteryMonitoringService;
  private resourceService: ResourceMonitorService;
  private syncEngine: AdaptiveSyncEngine;
  private taskManager: BackgroundTaskManager;
  private degradationRules: PerformanceDegradationRule[] = [];
  private activeRules: Set<string> = new Set();
  private listeners: Array<(event: PowerStateChangeEvent) => void> = [];
  private featureListeners: Array<(event: FeatureDegradationEvent) => void> = [];
  private isActive = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  private readonly POWER_PROFILES: Record<PowerState, PowerProfile> = {
    optimal: {
      state: 'optimal',
      features: {
        animations: 'enabled',
        backgroundSync: 'enabled',
        imageQuality: 'enabled',
        notificationFrequency: 'enabled',
        voiceProcessing: 'enabled',
        locationServices: 'enabled',
        hapticFeedback: 'enabled',
        autoPreview: 'enabled',
        richPresence: 'enabled',
        pushNotifications: 'enabled',
      },
      limits: {
        maxConcurrentTasks: 5,
        syncIntervalMs: 60000, // 1 minute
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
    },

    balanced: {
      state: 'balanced',
      features: {
        animations: 'reduced',
        backgroundSync: 'enabled',
        imageQuality: 'reduced',
        notificationFrequency: 'enabled',
        voiceProcessing: 'enabled',
        locationServices: 'reduced',
        hapticFeedback: 'reduced',
        autoPreview: 'reduced',
        richPresence: 'enabled',
        pushNotifications: 'enabled',
      },
      limits: {
        maxConcurrentTasks: 3,
        syncIntervalMs: 180000, // 3 minutes
        cacheSize: 300,
        imageCompressionQuality: 0.8,
        maxNotificationsPerHour: 40,
        cpuUsageLimit: 70,
        memoryUsageLimit: 80,
      },
      thresholds: {
        battery: { optimal: 0.6, balanced: 0.4, batterySaver: 0.2, critical: 0.1 },
        thermal: { normal: 'nominal', warning: 'fair', critical: 'serious', emergency: 'critical' },
        performance: { cpuWarning: 60, cpuCritical: 80, memoryWarning: 75, memoryCritical: 90 },
      },
    },

    battery_saver: {
      state: 'battery_saver',
      features: {
        animations: 'minimal',
        backgroundSync: 'reduced',
        imageQuality: 'minimal',
        notificationFrequency: 'reduced',
        voiceProcessing: 'reduced',
        locationServices: 'minimal',
        hapticFeedback: 'disabled',
        autoPreview: 'disabled',
        richPresence: 'disabled',
        pushNotifications: 'reduced',
      },
      limits: {
        maxConcurrentTasks: 2,
        syncIntervalMs: 600000, // 10 minutes
        cacheSize: 150,
        imageCompressionQuality: 0.6,
        maxNotificationsPerHour: 20,
        cpuUsageLimit: 50,
        memoryUsageLimit: 70,
      },
      thresholds: {
        battery: { optimal: 0.6, balanced: 0.4, batterySaver: 0.2, critical: 0.1 },
        thermal: { normal: 'nominal', warning: 'fair', critical: 'serious', emergency: 'critical' },
        performance: { cpuWarning: 50, cpuCritical: 70, memoryWarning: 65, memoryCritical: 85 },
      },
    },

    critical: {
      state: 'critical',
      features: {
        animations: 'disabled',
        backgroundSync: 'minimal',
        imageQuality: 'minimal',
        notificationFrequency: 'minimal',
        voiceProcessing: 'minimal',
        locationServices: 'disabled',
        hapticFeedback: 'disabled',
        autoPreview: 'disabled',
        richPresence: 'disabled',
        pushNotifications: 'minimal',
      },
      limits: {
        maxConcurrentTasks: 1,
        syncIntervalMs: 1800000, // 30 minutes
        cacheSize: 50,
        imageCompressionQuality: 0.4,
        maxNotificationsPerHour: 5,
        cpuUsageLimit: 30,
        memoryUsageLimit: 60,
      },
      thresholds: {
        battery: { optimal: 0.6, balanced: 0.4, batterySaver: 0.2, critical: 0.1 },
        thermal: { normal: 'nominal', warning: 'fair', critical: 'serious', emergency: 'critical' },
        performance: { cpuWarning: 40, cpuCritical: 60, memoryWarning: 55, memoryCritical: 75 },
      },
    },
  };

  private constructor() {
    this.currentProfile = this.POWER_PROFILES.optimal;
    this.batteryService = BatteryMonitoringService.getInstance();
    this.resourceService = ResourceMonitorService.getInstance();
    this.syncEngine = AdaptiveSyncEngine.getInstance();
    this.taskManager = BackgroundTaskManager.getInstance();

    this.initializeDegradationRules();
    this.setupMonitoring();
  }

  static getInstance(): PowerStateManager {
    if (!PowerStateManager.instance) {
      PowerStateManager.instance = new PowerStateManager();
    }
    return PowerStateManager.instance;
  }

  private initializeDegradationRules(): void {
    this.degradationRules = [
      // Critical battery rules
      {
        id: 'critical_battery',
        name: 'Critical Battery Conservation',
        condition: {
          battery: { operator: '<=', value: 0.1 }
        },
        actions: {
          features: {
            animations: 'disabled',
            backgroundSync: 'minimal',
            imageQuality: 'minimal',
            hapticFeedback: 'disabled',
            autoPreview: 'disabled',
            richPresence: 'disabled',
          },
          limits: {
            maxConcurrentTasks: 1,
            syncIntervalMs: 1800000,
            maxNotificationsPerHour: 5,
          }
        },
        priority: 100,
        reversible: true,
      },

      // Low battery rules
      {
        id: 'low_battery',
        name: 'Low Battery Optimization',
        condition: {
          battery: { operator: '<=', value: 0.2 }
        },
        actions: {
          features: {
            animations: 'minimal',
            backgroundSync: 'reduced',
            locationServices: 'minimal',
            hapticFeedback: 'disabled',
          },
          limits: {
            maxConcurrentTasks: 2,
            syncIntervalMs: 600000,
          }
        },
        priority: 80,
        reversible: true,
      },

      // System low power mode
      {
        id: 'system_low_power',
        name: 'System Low Power Mode',
        condition: {
          powerMode: true
        },
        actions: {
          features: {
            animations: 'minimal',
            backgroundSync: 'reduced',
            imageQuality: 'reduced',
            voiceProcessing: 'reduced',
            hapticFeedback: 'disabled',
          }
        },
        priority: 90,
        reversible: true,
      },

      // Thermal throttling rules
      {
        id: 'thermal_critical',
        name: 'Critical Thermal Throttling',
        condition: {
          thermal: { states: ['critical'] }
        },
        actions: {
          features: {
            animations: 'disabled',
            voiceProcessing: 'minimal',
            backgroundSync: 'minimal',
          },
          limits: {
            maxConcurrentTasks: 1,
            cpuUsageLimit: 30,
          }
        },
        priority: 95,
        reversible: true,
      },

      {
        id: 'thermal_serious',
        name: 'Thermal Load Reduction',
        condition: {
          thermal: { states: ['serious'] }
        },
        actions: {
          features: {
            animations: 'reduced',
            voiceProcessing: 'reduced',
            imageQuality: 'reduced',
          },
          limits: {
            maxConcurrentTasks: 2,
            cpuUsageLimit: 50,
          }
        },
        priority: 70,
        reversible: true,
      },

      // Performance-based rules
      {
        id: 'high_cpu_usage',
        name: 'High CPU Usage Mitigation',
        condition: {
          cpu: { operator: '>=', value: 85 }
        },
        actions: {
          features: {
            animations: 'reduced',
            backgroundSync: 'reduced',
          },
          limits: {
            maxConcurrentTasks: 1,
          }
        },
        priority: 60,
        reversible: true,
      },

      {
        id: 'high_memory_usage',
        name: 'High Memory Usage Mitigation',
        condition: {
          memory: { operator: '>=', value: 90 }
        },
        actions: {
          limits: {
            cacheSize: 100,
            maxConcurrentTasks: 1,
          }
        },
        priority: 65,
        reversible: true,
      },
    ];
  }

  private setupMonitoring(): void {
    // Listen to battery changes
    this.batteryService.addBatteryListener((batteryInfo) => {
      this.evaluateAndApplyRules(batteryInfo);
    });

    // Listen to resource changes
    this.resourceService.addListener((resourceMetrics) => {
      this.evaluateAndApplyRules(undefined, resourceMetrics);
    });

    // Start periodic evaluation
    this.startPeriodicEvaluation();
  }

  private startPeriodicEvaluation(): void {
    if (this.monitoringInterval) {
      return;
    }

    // Evaluate power state every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.evaluateAndApplyRules();
    }, 30000);
  }

  private stopPeriodicEvaluation(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  private evaluateAndApplyRules(
    batteryInfo?: BatteryInfo,
    resourceMetrics?: ResourceMetrics
  ): void {
    if (!batteryInfo) {
      batteryInfo = this.batteryService.getCurrentBatteryInfo();
    }

    const resolvedResourceMetrics: ResourceMetrics | null = resourceMetrics || this.resourceService.getCurrentMetrics() || null;

    // Evaluate each rule
    const applicableRules: PerformanceDegradationRule[] = [];

    for (const rule of this.degradationRules) {
      if (this.evaluateRuleCondition(rule, batteryInfo, resolvedResourceMetrics)) {
        applicableRules.push(rule);
      }
    }

    // Sort by priority (highest first)
    applicableRules.sort((a, b) => b.priority - a.priority);

    // Apply or remove rules
    this.applyRules(applicableRules);

    // Determine new power state
    this.updatePowerState(batteryInfo, resolvedResourceMetrics);
  }

  private evaluateRuleCondition(
    rule: PerformanceDegradationRule,
    batteryInfo: BatteryInfo,
    resourceMetrics: ResourceMetrics | null
  ): boolean {
    const { condition } = rule;

    // Check battery condition
    if (condition.battery) {
      const { operator, value } = condition.battery;
      const batteryLevel = batteryInfo.level;

      switch (operator) {
        case '<':
          if (!(batteryLevel < value)) return false;
          break;
        case '<=':
          if (!(batteryLevel <= value)) return false;
          break;
        case '>':
          if (!(batteryLevel > value)) return false;
          break;
        case '>=':
          if (!(batteryLevel >= value)) return false;
          break;
      }
    }

    // Check power mode condition
    if (condition.powerMode !== undefined) {
      if (batteryInfo.isLowPowerMode !== condition.powerMode) return false;
    }

    if (resourceMetrics) {
      // Check thermal condition
      if (condition.thermal) {
        if (!condition.thermal.states.includes(resourceMetrics.thermal.state)) return false;
      }

      // Check CPU condition
      if (condition.cpu) {
        const { operator, value } = condition.cpu;
        const cpuUsage = resourceMetrics.cpu.usage;

        switch (operator) {
          case '<':
            if (!(cpuUsage < value)) return false;
            break;
          case '<=':
            if (!(cpuUsage <= value)) return false;
            break;
          case '>':
            if (!(cpuUsage > value)) return false;
            break;
          case '>=':
            if (!(cpuUsage >= value)) return false;
            break;
        }
      }

      // Check memory condition
      if (condition.memory) {
        const { operator, value } = condition.memory;
        const memoryPercent = (resourceMetrics.memory.used / resourceMetrics.memory.total) * 100;

        switch (operator) {
          case '<':
            if (!(memoryPercent < value)) return false;
            break;
          case '<=':
            if (!(memoryPercent <= value)) return false;
            break;
          case '>':
            if (!(memoryPercent > value)) return false;
            break;
          case '>=':
            if (!(memoryPercent >= value)) return false;
            break;
        }
      }
    }

    return true;
  }

  private applyRules(applicableRules: PerformanceDegradationRule[]): void {
    const newActiveRules = new Set<string>();

    // Apply new rules
    for (const rule of applicableRules) {
      if (!this.activeRules.has(rule.id)) {
        this.applyRule(rule);
      }
      newActiveRules.add(rule.id);
    }

    // Remove rules that are no longer applicable
    for (const ruleId of this.activeRules) {
      if (!newActiveRules.has(ruleId)) {
        const rule = this.degradationRules.find(r => r.id === ruleId);
        if (rule && rule.reversible) {
          this.removeRule(rule);
        }
      }
    }

    this.activeRules = newActiveRules;
  }

  private applyRule(rule: PerformanceDegradationRule): void {
    const previousProfile = { ...this.currentProfile };

    // Apply feature changes
    if (rule.actions.features) {
      for (const [feature, state] of Object.entries(rule.actions.features)) {
        const featureKey = feature as keyof PowerProfile['features'];
        const previousState = this.currentProfile.features[featureKey];

        if (previousState !== state) {
          this.currentProfile.features[featureKey] = state as FeatureState;
          this.notifyFeatureChange(featureKey, previousState, state as FeatureState, rule.name);
        }
      }
    }

    // Apply limit changes
    if (rule.actions.limits) {
      Object.assign(this.currentProfile.limits, rule.actions.limits);
    }

    // Notify services of changes
    this.notifyServicesOfChanges();

    console.log(`Applied power rule: ${rule.name}`);
  }

  private removeRule(rule: PerformanceDegradationRule): void {
    // This is a simplified reversal - in practice, you'd need to track original values
    // For now, we'll regenerate the profile based on current power state
    this.regenerateProfileFromState();

    console.log(`Removed power rule: ${rule.name}`);
  }

  private regenerateProfileFromState(): void {
    // Determine base profile from power state
    const baseProfile = this.POWER_PROFILES[this.currentProfile.state];
    this.currentProfile = JSON.parse(JSON.stringify(baseProfile));

    // Reapply all active rules
    const currentActiveRules = Array.from(this.activeRules);
    this.activeRules.clear();

    for (const ruleId of currentActiveRules) {
      const rule = this.degradationRules.find(r => r.id === ruleId);
      if (rule) {
        this.applyRule(rule);
      }
    }

    this.notifyServicesOfChanges();
  }

  private updatePowerState(batteryInfo: BatteryInfo, resourceMetrics: ResourceMetrics | null): void {
    let newState: PowerState = 'optimal';

    // Determine power state based on conditions
    if (batteryInfo.level <= 0.1 || batteryInfo.isLowPowerMode) {
      newState = 'critical';
    } else if (batteryInfo.level <= 0.2) {
      newState = 'battery_saver';
    } else if (batteryInfo.level <= 0.4 ||
               (resourceMetrics && (resourceMetrics.thermal.state === 'serious' || resourceMetrics.thermal.state === 'critical'))) {
      newState = 'balanced';
    } else {
      newState = 'optimal';
    }

    // Update power state if changed
    if (newState !== this.currentProfile.state) {
      const previousState = this.currentProfile.state;

      // Update to new base profile
      const newBaseProfile = this.POWER_PROFILES[newState];
      this.currentProfile = JSON.parse(JSON.stringify(newBaseProfile));

      // Reapply active rules
      const activeRules = this.degradationRules.filter(rule => this.activeRules.has(rule.id));
      for (const rule of activeRules) {
        this.applyRule(rule);
      }

      // Notify listeners
      this.notifyPowerStateChange(previousState, newState, 'Automatic power state transition');
    }
  }

  private notifyServicesOfChanges(): void {
    // Update task manager limits
    try {
      // This would require extending the task manager API
      // this.taskManager.updateLimits(this.currentProfile.limits);
    } catch (error) {
      console.warn('Failed to update task manager limits:', error);
    }

    // Update sync engine settings
    try {
      // This would require extending the sync engine API
      // this.syncEngine.updateSettings(this.currentProfile.limits);
    } catch (error) {
      console.warn('Failed to update sync engine settings:', error);
    }

    // Emit global power state change event
    DeviceEventEmitter.emit('PowerProfileChanged', this.currentProfile);
  }

  private notifyFeatureChange(
    feature: keyof PowerProfile['features'],
    previousState: FeatureState,
    currentState: FeatureState,
    reason: string
  ): void {
    const event: FeatureDegradationEvent = {
      feature,
      previous: previousState,
      current: currentState,
      reason,
      impact: this.getFeatureImpactDescription(feature, currentState),
      timestamp: Date.now(),
    };

    this.featureListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.warn('Error notifying feature change listener:', error);
      }
    });

    DeviceEventEmitter.emit('FeatureDegradation', event);
  }

  private notifyPowerStateChange(previous: PowerState, current: PowerState, reason: string): void {
    const event: PowerStateChangeEvent = {
      previous,
      current,
      reason,
      timestamp: Date.now(),
      profile: this.currentProfile,
    };

    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.warn('Error notifying power state change listener:', error);
      }
    });

    DeviceEventEmitter.emit('PowerStateChanged', event);
    console.log(`Power state changed: ${previous} → ${current} (${reason})`);
  }

  private getFeatureImpactDescription(feature: keyof PowerProfile['features'], state: FeatureState): string {
    const impacts: Record<keyof PowerProfile['features'], Record<FeatureState, string>> = {
      animations: {
        enabled: 'Full animations active',
        reduced: 'Simplified animations',
        minimal: 'Basic animations only',
        disabled: 'No animations',
      },
      backgroundSync: {
        enabled: 'Real-time message sync',
        reduced: 'Periodic sync every few minutes',
        minimal: 'Sync only when app is active',
        disabled: 'No background sync',
      },
      imageQuality: {
        enabled: 'High quality images',
        reduced: 'Compressed images',
        minimal: 'Low quality images',
        disabled: 'Images disabled',
      },
      notificationFrequency: {
        enabled: 'All notifications',
        reduced: 'Important notifications only',
        minimal: 'Critical notifications only',
        disabled: 'No notifications',
      },
      voiceProcessing: {
        enabled: 'Full voice processing',
        reduced: 'Basic voice processing',
        minimal: 'Voice processing limited',
        disabled: 'Voice processing disabled',
      },
      locationServices: {
        enabled: 'Full location services',
        reduced: 'Limited location updates',
        minimal: 'Location on demand only',
        disabled: 'Location services off',
      },
      hapticFeedback: {
        enabled: 'Full haptic feedback',
        reduced: 'Limited haptic feedback',
        minimal: 'Essential haptics only',
        disabled: 'No haptic feedback',
      },
      autoPreview: {
        enabled: 'Auto preview all content',
        reduced: 'Preview text only',
        minimal: 'Manual preview only',
        disabled: 'No auto preview',
      },
      richPresence: {
        enabled: 'Full rich presence',
        reduced: 'Basic presence info',
        minimal: 'Online status only',
        disabled: 'No rich presence',
      },
      pushNotifications: {
        enabled: 'All push notifications',
        reduced: 'Important notifications only',
        minimal: 'Critical notifications only',
        disabled: 'No push notifications',
      },
    };

    return impacts[feature][state] || 'Feature state changed';
  }

  // Public API

  public start(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.evaluateAndApplyRules();
  }

  public stop(): void {
    if (!this.isActive) return;

    this.isActive = false;
    this.stopPeriodicEvaluation();
  }

  public getCurrentProfile(): PowerProfile {
    return JSON.parse(JSON.stringify(this.currentProfile));
  }

  public getCurrentPowerState(): PowerState {
    return this.currentProfile.state;
  }

  public getActiveRules(): string[] {
    return Array.from(this.activeRules);
  }

  public forceProfile(state: PowerState): void {
    const previousState = this.currentProfile.state;
    this.currentProfile = JSON.parse(JSON.stringify(this.POWER_PROFILES[state]));

    this.notifyServicesOfChanges();
    this.notifyPowerStateChange(previousState, state, 'Manually forced profile');
  }

  public addPowerStateListener(listener: (event: PowerStateChangeEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public addFeatureDegradationListener(listener: (event: FeatureDegradationEvent) => void): () => void {
    this.featureListeners.push(listener);
    return () => {
      const index = this.featureListeners.indexOf(listener);
      if (index > -1) {
        this.featureListeners.splice(index, 1);
      }
    };
  }

  public getFeatureState(feature: keyof PowerProfile['features']): FeatureState {
    return this.currentProfile.features[feature];
  }

  public isFeatureEnabled(feature: keyof PowerProfile['features']): boolean {
    return this.currentProfile.features[feature] === 'enabled';
  }

  public isFeatureReduced(feature: keyof PowerProfile['features']): boolean {
    const state = this.currentProfile.features[feature];
    return state === 'reduced' || state === 'minimal';
  }

  public getPowerSavingsEstimate(): string {
    switch (this.currentProfile.state) {
      case 'optimal':
        return '0% power savings (optimal performance)';
      case 'balanced':
        return '15-20% power savings';
      case 'battery_saver':
        return '30-40% power savings';
      case 'critical':
        return '50-60% power savings';
      default:
        return 'Unknown savings';
    }
  }

  public destroy(): void {
    this.stop();
    this.listeners = [];
    this.featureListeners = [];
    this.activeRules.clear();
  }
}

export default PowerStateManager;