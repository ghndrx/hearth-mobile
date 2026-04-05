import { Platform, NativeEventEmitter, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BatteryInfo {
  level: number; // 0.0 to 1.0
  isCharging: boolean;
  isLowPowerMode: boolean;
  temperature?: number; // Celsius, Android only
  health?: 'good' | 'overheat' | 'dead' | 'over_voltage' | 'unspecified_failure' | 'cold';
  technology?: string; // e.g., "Li-ion"
}

export interface BatteryUsagePattern {
  averageConsumptionPerHour: number;
  peakUsageTimes: Array<{ hour: number; consumption: number }>;
  chargingPatterns: Array<{ startTime: number; endTime: number; level: number }>;
  lastUpdated: number;
}

export interface PowerOptimizationRecommendation {
  type: 'background_sync' | 'notification_frequency' | 'image_quality' | 'animation_speed' | 'polling_interval';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  estimatedSavings: string; // e.g., "10-15% battery life"
  action: 'enable' | 'disable' | 'reduce' | 'optimize';
}

class BatteryMonitoringService {
  private static instance: BatteryMonitoringService;
  private eventEmitter: NativeEventEmitter | null = null;
  private batteryInfo: BatteryInfo = {
    level: 1.0,
    isCharging: false,
    isLowPowerMode: false,
  };
  private usageHistory: Array<{ timestamp: number; level: number; isCharging: boolean }> = [];
  private listeners: Array<(info: BatteryInfo) => void> = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly STORAGE_KEY = 'battery_usage_history';
  private readonly MAX_HISTORY_DAYS = 7;

  private constructor() {
    this.initializeBatteryMonitoring();
    this.loadUsageHistory();
  }

  static getInstance(): BatteryMonitoringService {
    if (!BatteryMonitoringService.instance) {
      BatteryMonitoringService.instance = new BatteryMonitoringService();
    }
    return BatteryMonitoringService.instance;
  }

  private async initializeBatteryMonitoring(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await this.initializeIOSBatteryMonitoring();
      } else if (Platform.OS === 'android') {
        await this.initializeAndroidBatteryMonitoring();
      }

      // Start periodic monitoring
      this.startPeriodicMonitoring();
    } catch (error) {
      console.warn('Failed to initialize battery monitoring:', error);
      // Fallback to manual checks
      this.startFallbackMonitoring();
    }
  }

  private async initializeIOSBatteryMonitoring(): Promise<void> {
    // iOS battery monitoring via native module or expo-battery
    try {
      const { Battery } = NativeModules;
      if (Battery) {
        this.eventEmitter = new NativeEventEmitter(Battery);
        this.eventEmitter.addListener('BatteryLevelDidChange', this.handleBatteryUpdate.bind(this));
        this.eventEmitter.addListener('BatteryStateDidChange', this.handleBatteryUpdate.bind(this));

        // Get initial battery state
        const initialState = await Battery.getBatteryState();
        this.updateBatteryInfo(initialState);
      }
    } catch (error) {
      console.warn('Native iOS battery module not available, using fallback');
      throw error;
    }
  }

  private async initializeAndroidBatteryMonitoring(): Promise<void> {
    // Android battery monitoring via native module
    try {
      const { BatteryManager } = NativeModules;
      if (BatteryManager) {
        this.eventEmitter = new NativeEventEmitter(BatteryManager);
        this.eventEmitter.addListener('BatteryChanged', this.handleBatteryUpdate.bind(this));

        // Get initial battery state
        const initialState = await BatteryManager.getBatteryInfo();
        this.updateBatteryInfo(initialState);
      }
    } catch (error) {
      console.warn('Native Android battery module not available, using fallback');
      throw error;
    }
  }

  private startPeriodicMonitoring(): void {
    // Monitor battery every 30 seconds when app is active
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.refreshBatteryInfo();
        this.recordUsagePoint();
      } catch (error) {
        console.warn('Error during periodic battery monitoring:', error);
      }
    }, 30000);
  }

  private startFallbackMonitoring(): void {
    // Simplified fallback monitoring
    this.monitoringInterval = setInterval(() => {
      // Basic battery simulation for development/testing
      const mockBatteryInfo: BatteryInfo = {
        level: Math.random() * 0.5 + 0.5, // 50-100%
        isCharging: Math.random() > 0.7,
        isLowPowerMode: Math.random() > 0.9,
      };
      this.updateBatteryInfo(mockBatteryInfo);
      this.recordUsagePoint();
    }, 60000);
  }

  private async refreshBatteryInfo(): Promise<void> {
    try {
      if (Platform.OS === 'ios' && NativeModules.Battery) {
        const state = await NativeModules.Battery.getBatteryState();
        this.updateBatteryInfo(state);
      } else if (Platform.OS === 'android' && NativeModules.BatteryManager) {
        const state = await NativeModules.BatteryManager.getBatteryInfo();
        this.updateBatteryInfo(state);
      }
    } catch (error) {
      console.warn('Failed to refresh battery info:', error);
    }
  }

  private handleBatteryUpdate(batteryData: any): void {
    this.updateBatteryInfo(batteryData);
    this.recordUsagePoint();
  }

  private updateBatteryInfo(newInfo: Partial<BatteryInfo>): void {
    const previousLevel = this.batteryInfo.level;
    this.batteryInfo = { ...this.batteryInfo, ...newInfo };

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(this.batteryInfo);
      } catch (error) {
        console.warn('Error notifying battery listener:', error);
      }
    });

    // Check for significant battery changes
    if (Math.abs(previousLevel - this.batteryInfo.level) >= 0.05) {
      this.analyzeUsagePatterns();
    }
  }

  private recordUsagePoint(): void {
    const now = Date.now();
    this.usageHistory.push({
      timestamp: now,
      level: this.batteryInfo.level,
      isCharging: this.batteryInfo.isCharging,
    });

    // Limit history to last 7 days
    const cutoff = now - (this.MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000);
    this.usageHistory = this.usageHistory.filter(point => point.timestamp > cutoff);

    // Save to storage periodically (every 10 points to avoid excessive writes)
    if (this.usageHistory.length % 10 === 0) {
      this.saveUsageHistory();
    }
  }

  private async loadUsageHistory(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.usageHistory = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load battery usage history:', error);
    }
  }

  private async saveUsageHistory(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.usageHistory));
    } catch (error) {
      console.warn('Failed to save battery usage history:', error);
    }
  }

  private analyzeUsagePatterns(): void {
    // Trigger background analysis of usage patterns
    setTimeout(() => {
      this.generateOptimizationRecommendations();
    }, 1000);
  }

  // Public API

  public getCurrentBatteryInfo(): BatteryInfo {
    return { ...this.batteryInfo };
  }

  public addBatteryListener(listener: (info: BatteryInfo) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public isLowBattery(threshold: number = 0.2): boolean {
    return this.batteryInfo.level <= threshold && !this.batteryInfo.isCharging;
  }

  public isCriticalBattery(threshold: number = 0.1): boolean {
    return this.batteryInfo.level <= threshold && !this.batteryInfo.isCharging;
  }

  public shouldReduceBackgroundActivity(): boolean {
    return (
      this.batteryInfo.isLowPowerMode ||
      this.isLowBattery(0.15) ||
      (this.batteryInfo.temperature !== undefined && this.batteryInfo.temperature > 40)
    );
  }

  public getBatteryUsagePattern(): BatteryUsagePattern | null {
    if (this.usageHistory.length < 24) {
      return null; // Need at least 24 data points for meaningful analysis
    }

    const now = Date.now();
    const last24Hours = this.usageHistory.filter(
      point => point.timestamp > now - (24 * 60 * 60 * 1000)
    );

    if (last24Hours.length < 10) {
      return null;
    }

    // Calculate hourly consumption
    const hourlyConsumption: { [hour: number]: number } = {};
    for (let i = 1; i < last24Hours.length; i++) {
      const prev = last24Hours[i - 1];
      const current = last24Hours[i];

      if (!current.isCharging && !prev.isCharging) {
        const hoursDiff = (current.timestamp - prev.timestamp) / (60 * 60 * 1000);
        const levelDiff = prev.level - current.level;

        if (hoursDiff > 0 && levelDiff > 0) {
          const hour = new Date(current.timestamp).getHours();
          const consumption = levelDiff / hoursDiff;

          hourlyConsumption[hour] = (hourlyConsumption[hour] || 0) + consumption;
        }
      }
    }

    const averageConsumption = Object.values(hourlyConsumption).reduce((a, b) => a + b, 0) /
                              Math.max(Object.keys(hourlyConsumption).length, 1);

    const peakUsageTimes = Object.entries(hourlyConsumption)
      .map(([hour, consumption]) => ({ hour: parseInt(hour), consumption }))
      .sort((a, b) => b.consumption - a.consumption)
      .slice(0, 5);

    // Find charging patterns
    const chargingPatterns: Array<{ startTime: number; endTime: number; level: number }> = [];
    let chargingStart: number | null = null;

    for (const point of last24Hours) {
      if (point.isCharging && chargingStart === null) {
        chargingStart = point.timestamp;
      } else if (!point.isCharging && chargingStart !== null) {
        chargingPatterns.push({
          startTime: chargingStart,
          endTime: point.timestamp,
          level: point.level,
        });
        chargingStart = null;
      }
    }

    return {
      averageConsumptionPerHour: averageConsumption,
      peakUsageTimes,
      chargingPatterns,
      lastUpdated: now,
    };
  }

  public generateOptimizationRecommendations(): PowerOptimizationRecommendation[] {
    const recommendations: PowerOptimizationRecommendation[] = [];
    const pattern = this.getBatteryUsagePattern();

    // Low battery recommendations
    if (this.isLowBattery(0.25)) {
      recommendations.push({
        type: 'background_sync',
        priority: 'high',
        title: 'Reduce Background Sync',
        description: 'Limit background message synchronization to save battery',
        estimatedSavings: '15-20% battery life',
        action: 'reduce',
      });

      recommendations.push({
        type: 'image_quality',
        priority: 'medium',
        title: 'Lower Image Quality',
        description: 'Reduce image resolution and quality to decrease processing load',
        estimatedSavings: '8-12% battery life',
        action: 'reduce',
      });
    }

    // Critical battery recommendations
    if (this.isCriticalBattery(0.1)) {
      recommendations.push({
        type: 'animation_speed',
        priority: 'high',
        title: 'Disable Animations',
        description: 'Turn off UI animations to reduce GPU usage',
        estimatedSavings: '5-8% battery life',
        action: 'disable',
      });

      recommendations.push({
        type: 'notification_frequency',
        priority: 'high',
        title: 'Reduce Notifications',
        description: 'Limit push notifications to only critical messages',
        estimatedSavings: '10-15% battery life',
        action: 'reduce',
      });
    }

    // High consumption patterns
    if (pattern && pattern.averageConsumptionPerHour > 0.15) {
      recommendations.push({
        type: 'polling_interval',
        priority: 'medium',
        title: 'Increase Sync Intervals',
        description: 'Reduce frequency of background data fetching',
        estimatedSavings: '12-18% battery life',
        action: 'optimize',
      });
    }

    // Low power mode active
    if (this.batteryInfo.isLowPowerMode) {
      recommendations.push({
        type: 'background_sync',
        priority: 'high',
        title: 'Minimal Background Activity',
        description: 'Respect system low power mode settings',
        estimatedSavings: '20-30% battery life',
        action: 'optimize',
      });
    }

    return recommendations;
  }

  public getBatteryHealthScore(): number {
    // Calculate battery health score based on charging patterns and temperature
    let score = 100;

    // Temperature impact
    if (this.batteryInfo.temperature !== undefined) {
      if (this.batteryInfo.temperature > 45) score -= 20;
      else if (this.batteryInfo.temperature > 40) score -= 10;
      else if (this.batteryInfo.temperature < 0) score -= 15;
    }

    // Health status impact
    if (this.batteryInfo.health) {
      switch (this.batteryInfo.health) {
        case 'good':
          break;
        case 'overheat':
          score -= 30;
          break;
        case 'dead':
          score = 0;
          break;
        case 'over_voltage':
          score -= 25;
          break;
        case 'unspecified_failure':
          score -= 40;
          break;
        case 'cold':
          score -= 15;
          break;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  public destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.eventEmitter) {
      this.eventEmitter.removeAllListeners('BatteryLevelDidChange');
      this.eventEmitter.removeAllListeners('BatteryStateDidChange');
      this.eventEmitter.removeAllListeners('BatteryChanged');
    }

    this.listeners = [];
    this.saveUsageHistory();
  }
}

export default BatteryMonitoringService;