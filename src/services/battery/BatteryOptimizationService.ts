import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Conditionally import expo-battery with fallbacks
let Battery: any;
try {
  Battery = require('expo-battery');
} catch (error) {
  // Fallback if expo-battery is not available
  Battery = {
    getBatteryLevelAsync: () => Promise.resolve(1.0),
    getBatteryStateAsync: () => Promise.resolve(2), // UNPLUGGED
    isLowPowerModeEnabledAsync: () => Promise.resolve(false),
    BatteryState: {
      UNKNOWN: 0,
      CHARGING: 1,
      UNPLUGGED: 2,
      FULL: 3,
    },
  };
}

export interface BatteryMetrics {
  level: number;
  isCharging: boolean;
  batteryState: number; // Battery.BatteryState enum value
  lowPowerMode: boolean;
  thermalState?: 'nominal' | 'fair' | 'serious' | 'critical';
}

export interface ResourceMetrics {
  memoryUsage: number;
  cpuIntensive: boolean;
  networkType: string;
  isConnected: boolean;
  backgroundRestricted: boolean;
}

export interface OptimizationSettings {
  adaptiveCPU: boolean;
  intelligentSync: boolean;
  batteryAwareNotifications: boolean;
  thermalThrottling: boolean;
  networkBatching: boolean;
  backgroundOptimization: boolean;
}

export class BatteryOptimizationService {
  private static instance: BatteryOptimizationService;
  private metrics: BatteryMetrics = {
    level: 1,
    isCharging: false,
    batteryState: 0, // UNKNOWN
    lowPowerMode: false,
  };
  private resourceMetrics: ResourceMetrics = {
    memoryUsage: 0,
    cpuIntensive: false,
    networkType: 'unknown',
    isConnected: false,
    backgroundRestricted: false,
  };
  private settings: OptimizationSettings = {
    adaptiveCPU: true,
    intelligentSync: true,
    batteryAwareNotifications: true,
    thermalThrottling: true,
    networkBatching: true,
    backgroundOptimization: true,
  };
  private subscribers: Array<(metrics: BatteryMetrics) => void> = [];
  private monitoringInterval?: NodeJS.Timeout;

  static getInstance(): BatteryOptimizationService {
    if (!BatteryOptimizationService.instance) {
      BatteryOptimizationService.instance = new BatteryOptimizationService();
    }
    return BatteryOptimizationService.instance;
  }

  async initialize(): Promise<void> {
    await this.loadSettings();
    await this.updateMetrics();
    this.startMonitoring();

    // Set up network state listener
    NetInfo.addEventListener(state => {
      this.resourceMetrics.isConnected = state.isConnected || false;
      this.resourceMetrics.networkType = state.type || 'unknown';
    });
  }

  private async updateMetrics(): Promise<void> {
    try {
      // Update battery metrics
      this.metrics.level = await Battery.getBatteryLevelAsync();
      this.metrics.batteryState = await Battery.getBatteryStateAsync();
      this.metrics.isCharging = this.metrics.batteryState === 1; // CHARGING

      // Check for low power mode (iOS specific)
      if (Platform.OS === 'ios') {
        this.metrics.lowPowerMode = await Battery.isLowPowerModeEnabledAsync() || false;
      }

      // Update thermal state (iOS specific)
      if (Platform.OS === 'ios' && Battery.getThermalStateAsync) {
        try {
          const thermalState = await Battery.getThermalStateAsync();
          this.metrics.thermalState = thermalState as any;
        } catch (error) {
          // Thermal state not available on this device
        }
      }

      // Notify subscribers
      this.notifySubscribers();
    } catch (error) {
      console.warn('Failed to update battery metrics:', error);
    }
  }

  private startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Monitor battery state every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.updateMetrics();
    }, 30000);
  }

  private stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  subscribe(callback: (metrics: BatteryMetrics) => void): () => void {
    this.subscribers.push(callback);
    // Immediately call with current metrics
    callback(this.metrics);

    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback(this.metrics));
  }

  getBatteryMetrics(): BatteryMetrics {
    return { ...this.metrics };
  }

  getResourceMetrics(): ResourceMetrics {
    return { ...this.resourceMetrics };
  }

  // Intelligent CPU scaling based on battery and thermal state
  shouldReduceCPUUsage(): boolean {
    if (!this.settings.adaptiveCPU) return false;

    const { level, lowPowerMode = false, thermalState, isCharging } = this.metrics;

    // Reduce CPU usage if:
    // - Battery is below 20% and not charging
    // - Low power mode is enabled
    // - Device is experiencing thermal issues
    return (
      (level < 0.2 && !isCharging) ||
      lowPowerMode ||
      (thermalState !== undefined && ['serious', 'critical'].includes(thermalState))
    );
  }

  // Determine if background sync should be throttled
  shouldThrottleBackgroundSync(): boolean {
    if (!this.settings.intelligentSync) return false;

    const { level, isCharging } = this.metrics;
    const { isConnected, networkType } = this.resourceMetrics;

    // Throttle sync if:
    // - Battery is low and not charging
    // - No network connection
    // - On cellular with low battery
    return (
      (level < 0.15 && !isCharging) ||
      !isConnected ||
      (networkType === 'cellular' && level < 0.3 && !isCharging)
    );
  }

  // Check if notifications should be optimized for battery
  shouldOptimizeNotifications(): boolean {
    if (!this.settings.batteryAwareNotifications) return false;

    const { level, lowPowerMode = false, isCharging } = this.metrics;

    return (level < 0.25 && !isCharging) || lowPowerMode;
  }

  // Determine if thermal throttling should be applied
  shouldApplyThermalThrottling(): boolean {
    if (!this.settings.thermalThrottling) return false;

    const { thermalState } = this.metrics;
    return thermalState !== undefined && (thermalState === 'serious' || thermalState === 'critical');
  }

  // Get recommended performance profile
  getPerformanceProfile(): 'high' | 'balanced' | 'battery_saver' | 'thermal_throttled' {
    if (this.shouldApplyThermalThrottling()) {
      return 'thermal_throttled';
    }

    if (this.shouldReduceCPUUsage()) {
      return 'battery_saver';
    }

    const { level, isCharging } = this.metrics;

    if (level > 0.5 || isCharging) {
      return 'high';
    }

    return 'balanced';
  }

  // Settings management
  async updateSettings(newSettings: Partial<OptimizationSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();
  }

  getSettings(): OptimizationSettings {
    return { ...this.settings };
  }

  private async loadSettings(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('battery_optimization_settings');
      if (stored) {
        this.settings = { ...this.settings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load battery optimization settings:', error);
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem('battery_optimization_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save battery optimization settings:', error);
    }
  }

  // Analytics and reporting
  async getBatteryUsageHistory(): Promise<Array<{ timestamp: number; level: number; isCharging: boolean }>> {
    try {
      const stored = await AsyncStorage.getItem('battery_usage_history');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  private async logBatteryUsage(): Promise<void> {
    try {
      const history = await this.getBatteryUsageHistory();
      const entry = {
        timestamp: Date.now(),
        level: this.metrics.level,
        isCharging: this.metrics.isCharging,
      };

      // Keep only last 7 days of history
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const filteredHistory = history.filter(item => item.timestamp > sevenDaysAgo);
      filteredHistory.push(entry);

      await AsyncStorage.setItem('battery_usage_history', JSON.stringify(filteredHistory));
    } catch (error) {
      console.warn('Failed to log battery usage:', error);
    }
  }

  // Cleanup
  dispose(): void {
    this.stopMonitoring();
    this.subscribers = [];
  }
}

export default BatteryOptimizationService.getInstance();