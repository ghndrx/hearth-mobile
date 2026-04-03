/**
 * Battery Optimization Service
 * Handles power management, battery awareness, and optimization features
 * Part of PN-006: Background processing and delivery optimization
 */

import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Optional expo-battery import - will use fallback if not available
let Battery: {
  getBatteryLevelAsync: () => Promise<number>;
  getBatteryStateAsync: () => Promise<number>;
  getPowerStateAsync: () => Promise<{ lowPowerMode: boolean }>;
  BatteryState: { UNKNOWN: number; CHARGING: number; DISCHARGING: number; NOT_CHARGING: number; FULL: number; UNPLUGGED: number };
} | null = null;

try {
  Battery = require('expo-battery');
} catch {
  console.warn('[BatteryOptimization] expo-battery not available, using fallback values');
}

// Battery optimization modes
export type PowerMode = 'maximum' | 'balanced' | 'power_saver' | 'ultra_saver';

// Battery health classification
export type BatteryHealth = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';

// Power saving features that can be toggled
export interface PowerSavingFeatures {
  enableBackgroundSync: boolean;
  enablePushNotifications: boolean;
  enableRichNotifications: boolean;
  enableVoiceProcessing: boolean;
  enableLocationServices: boolean;
  enableVideoAutoplay: boolean;
  reduceAnimations: boolean;
  limitBackgroundTasks: boolean;
  aggressiveBatching: boolean;
  reduceSyncFrequency: boolean;
}

// Battery state enum (matching expo-battery)
export enum BatteryState {
  UNKNOWN = 0,
  UNPLUGGED = 1,
  CHARGING = 2,
  FULL = 3,
}

// Battery usage analytics
export interface BatteryUsageData {
  timestamp: number;
  batteryLevel: number;
  batteryState: BatteryState;
  powerMode: PowerMode;
  estimatedTimeRemaining: number; // in minutes
  drainRate: number; // percentage per hour
  chargingStatus: {
    isCharging: boolean;
    chargingType: 'none' | 'usb' | 'ac' | 'wireless' | 'unknown';
    estimatedTimeToFull?: number; // in minutes
  };
  thermalState: 'normal' | 'warm' | 'hot' | 'critical';
  isLowPowerMode: boolean;
}

// Power optimization recommendations
export interface PowerRecommendation {
  id: string;
  type: 'immediate' | 'scheduled' | 'configuration';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  action: string;
  estimatedSavings: string; // e.g., "10-15% battery life"
  isEnabled: boolean;
  canToggle: boolean;
  execute?: () => Promise<void>;
}

// Battery usage by feature
export interface FeatureUsageData {
  feature: string;
  batteryImpact: 'minimal' | 'low' | 'moderate' | 'high' | 'critical';
  usageTimeMs: number;
  estimatedDrain: number; // percentage
  isOptimized: boolean;
}

class BatteryOptimizationService {
  private currentPowerMode: PowerMode = 'balanced';
  private currentFeatures: PowerSavingFeatures;
  private batteryHistory: BatteryUsageData[] = [];
  private featureUsage: Map<string, FeatureUsageData> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private listeners: Array<(data: BatteryUsageData) => void> = [];

  // Storage keys
  private readonly STORAGE_KEYS = {
    powerMode: 'hearth_power_mode',
    features: 'hearth_power_features',
    batteryHistory: 'hearth_battery_history',
    featureUsage: 'hearth_feature_usage',
  };

  // Default power saving features
  private readonly DEFAULT_FEATURES: Record<PowerMode, PowerSavingFeatures> = {
    maximum: {
      enableBackgroundSync: true,
      enablePushNotifications: true,
      enableRichNotifications: true,
      enableVoiceProcessing: true,
      enableLocationServices: true,
      enableVideoAutoplay: true,
      reduceAnimations: false,
      limitBackgroundTasks: false,
      aggressiveBatching: false,
      reduceSyncFrequency: false,
    },
    balanced: {
      enableBackgroundSync: true,
      enablePushNotifications: true,
      enableRichNotifications: true,
      enableVoiceProcessing: true,
      enableLocationServices: false,
      enableVideoAutoplay: false,
      reduceAnimations: false,
      limitBackgroundTasks: true,
      aggressiveBatching: true,
      reduceSyncFrequency: false,
    },
    power_saver: {
      enableBackgroundSync: true,
      enablePushNotifications: true,
      enableRichNotifications: false,
      enableVoiceProcessing: false,
      enableLocationServices: false,
      enableVideoAutoplay: false,
      reduceAnimations: true,
      limitBackgroundTasks: true,
      aggressiveBatching: true,
      reduceSyncFrequency: true,
    },
    ultra_saver: {
      enableBackgroundSync: false,
      enablePushNotifications: true,
      enableRichNotifications: false,
      enableVoiceProcessing: false,
      enableLocationServices: false,
      enableVideoAutoplay: false,
      reduceAnimations: true,
      limitBackgroundTasks: true,
      aggressiveBatching: true,
      reduceSyncFrequency: true,
    },
  };

  constructor() {
    this.currentFeatures = this.DEFAULT_FEATURES.balanced;
  }

  /**
   * Initialize the battery optimization service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('[BatteryOptimization] Initializing service');

    try {
      // Load saved settings
      await this.loadSettings();

      // Start battery monitoring
      await this.startMonitoring();

      // Set up platform-specific optimizations
      await this.setupPlatformOptimizations();

      // Register for battery state changes
      this.registerBatteryStateListeners();

      this.isInitialized = true;
      console.log('[BatteryOptimization] Service initialized', {
        powerMode: this.currentPowerMode,
        features: this.currentFeatures,
      });
    } catch (error) {
      console.error('[BatteryOptimization] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Stop the battery optimization service
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.saveSettings();
    this.isInitialized = false;
    console.log('[BatteryOptimization] Service stopped');
  }

  /**
   * Set power mode and update features accordingly
   */
  async setPowerMode(mode: PowerMode): Promise<void> {
    console.log(`[BatteryOptimization] Setting power mode to: ${mode}`);

    this.currentPowerMode = mode;
    this.currentFeatures = { ...this.DEFAULT_FEATURES[mode] };

    // Apply optimizations immediately
    await this.applyOptimizations();

    // Save settings
    await this.saveSettings();

    // Notify listeners
    this.notifyBatteryStateChanged();
  }

  /**
   * Get current power mode
   */
  getPowerMode(): PowerMode {
    return this.currentPowerMode;
  }

  /**
   * Update specific power saving feature
   */
  async updateFeature<K extends keyof PowerSavingFeatures>(
    feature: K,
    enabled: PowerSavingFeatures[K]
  ): Promise<void> {
    this.currentFeatures[feature] = enabled;
    await this.applyOptimizations();
    await this.saveSettings();

    console.log(`[BatteryOptimization] Updated feature ${feature}: ${enabled}`);
  }

  /**
   * Get current power saving features
   */
  getFeatures(): PowerSavingFeatures {
    return { ...this.currentFeatures };
  }

  /**
   * Get current battery data
   */
  getCurrentBatteryData(): BatteryUsageData | null {
    return this.batteryHistory[this.batteryHistory.length - 1] || null;
  }

  /**
   * Get battery usage history
   */
  getBatteryHistory(hours?: number): BatteryUsageData[] {
    if (!hours) return this.batteryHistory;

    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.batteryHistory.filter(data => data.timestamp > cutoff);
  }

  /**
   * Get power optimization recommendations
   */
  getRecommendations(): PowerRecommendation[] {
    const current = this.getCurrentBatteryData();
    if (!current) return [];

    const recommendations: PowerRecommendation[] = [];

    // Critical battery level recommendations
    if (current.batteryLevel < 10) {
      recommendations.push({
        id: 'ultra_saver_critical',
        type: 'immediate',
        priority: 'critical',
        title: 'Enable Ultra Power Saver',
        description: 'Battery critically low. Switch to ultra power saver mode to extend usage.',
        action: 'Enable Ultra Saver',
        estimatedSavings: '50-70% longer battery life',
        isEnabled: this.currentPowerMode === 'ultra_saver',
        canToggle: true,
        execute: () => this.setPowerMode('ultra_saver'),
      });
    }

    // Low battery recommendations
    if (current.batteryLevel < 20 && this.currentPowerMode !== 'power_saver' && this.currentPowerMode !== 'ultra_saver') {
      recommendations.push({
        id: 'power_saver_low',
        type: 'immediate',
        priority: 'high',
        title: 'Enable Power Saver Mode',
        description: 'Battery running low. Enable power saver to extend battery life.',
        action: 'Enable Power Saver',
        estimatedSavings: '30-40% longer battery life',
        isEnabled: false, // Recommending to enable, so currently disabled
        canToggle: true,
        execute: () => this.setPowerMode('power_saver'),
      });
    }

    // High drain rate recommendations
    if (current.drainRate > 20) { // More than 20% per hour
      recommendations.push({
        id: 'reduce_background_high_drain',
        type: 'immediate',
        priority: 'medium',
        title: 'Reduce Background Activity',
        description: 'High battery drain detected. Consider reducing background sync and notifications.',
        action: 'Optimize Background Tasks',
        estimatedSavings: '15-25% reduced drain',
        isEnabled: this.currentFeatures.limitBackgroundTasks,
        canToggle: true,
        execute: () => this.updateFeature('limitBackgroundTasks', true),
      });
    }

    // Feature-specific recommendations
    if (this.currentFeatures.enableVideoAutoplay) {
      recommendations.push({
        id: 'disable_autoplay',
        type: 'configuration',
        priority: 'medium',
        title: 'Disable Video Autoplay',
        description: 'Video autoplay consumes significant battery. Disable for better battery life.',
        action: 'Disable Autoplay',
        estimatedSavings: '5-10% battery savings',
        isEnabled: !this.currentFeatures.enableVideoAutoplay,
        canToggle: true,
        execute: () => this.updateFeature('enableVideoAutoplay', false),
      });
    }

    // Thermal management recommendations
    if (current.thermalState === 'hot' || current.thermalState === 'critical') {
      recommendations.push({
        id: 'thermal_management',
        type: 'immediate',
        priority: current.thermalState === 'critical' ? 'critical' : 'high',
        title: 'Device Overheating',
        description: 'Device is running hot. Reduce processing to prevent damage and battery drain.',
        action: 'Enable Thermal Protection',
        estimatedSavings: 'Prevents battery damage',
        isEnabled: this.currentFeatures.limitBackgroundTasks,
        canToggle: false,
        execute: () => this.enableThermalProtection(),
      });
    }

    // Charging behavior recommendations
    if (current.chargingStatus.isCharging && current.batteryLevel > 80) {
      recommendations.push({
        id: 'charging_complete',
        type: 'scheduled',
        priority: 'low',
        title: 'Charging Complete Soon',
        description: 'Battery nearly full. Consider unplugging to maintain battery health.',
        action: 'Unplug when full',
        estimatedSavings: 'Better battery longevity',
        isEnabled: false,
        canToggle: false,
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Get feature usage analytics
   */
  getFeatureUsage(): FeatureUsageData[] {
    return Array.from(this.featureUsage.values());
  }

  /**
   * Record feature usage for analytics
   */
  recordFeatureUsage(
    feature: string,
    usageTimeMs: number,
    batteryImpact: FeatureUsageData['batteryImpact']
  ): void {
    const existing = this.featureUsage.get(feature);

    if (existing) {
      existing.usageTimeMs += usageTimeMs;
      existing.estimatedDrain += this.calculateDrainForImpact(batteryImpact, usageTimeMs);
    } else {
      this.featureUsage.set(feature, {
        feature,
        batteryImpact,
        usageTimeMs,
        estimatedDrain: this.calculateDrainForImpact(batteryImpact, usageTimeMs),
        isOptimized: false,
      });
    }
  }

  /**
   * Get battery health assessment
   */
  getBatteryHealth(): BatteryHealth {
    const recentData = this.getBatteryHistory(24); // Last 24 hours
    if (recentData.length < 10) return 'unknown';

    // Analyze drain patterns
    const averageDrain = recentData.reduce((sum, data) => sum + data.drainRate, 0) / recentData.length;

    // Analyze charging patterns
    const chargingCycles = this.analyzeChargingCycles(recentData);

    // Simple health assessment
    if (averageDrain < 5 && chargingCycles.efficiency > 0.9) return 'excellent';
    if (averageDrain < 10 && chargingCycles.efficiency > 0.8) return 'good';
    if (averageDrain < 20 && chargingCycles.efficiency > 0.6) return 'fair';

    return 'poor';
  }

  /**
   * Add battery state change listener
   */
  addBatteryStateListener(listener: (data: BatteryUsageData) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  /**
   * Apply current optimizations
   */
  private async applyOptimizations(): Promise<void> {
    console.log('[BatteryOptimization] Applying optimizations', this.currentFeatures);

    // Notify other services about feature changes
    (global as any).__batteryOptimizationFeatures = this.currentFeatures;

    // Platform-specific optimizations
    if (Platform.OS === 'ios') {
      await this.applyIOSOptimizations();
    } else if (Platform.OS === 'android') {
      await this.applyAndroidOptimizations();
    }
  }

  /**
   * Apply iOS-specific optimizations
   */
  private async applyIOSOptimizations(): Promise<void> {
    // In production, would integrate with iOS APIs
    console.log('[BatteryOptimization] Applying iOS optimizations');

    // Example optimizations:
    // - Background App Refresh settings
    // - URLSession background task optimization
    // - Core Location precision adjustments
    // - CallKit integration for background calls
  }

  /**
   * Apply Android-specific optimizations
   */
  private async applyAndroidOptimizations(): Promise<void> {
    // In production, would integrate with Android APIs
    console.log('[BatteryOptimization] Applying Android optimizations');

    // Example optimizations:
    // - Doze mode compatibility
    // - JobScheduler for background tasks
    // - Battery optimization whitelist guidance
    // - Background execution limits compliance
  }

  /**
   * Setup platform-specific optimizations
   */
  private async setupPlatformOptimizations(): Promise<void> {
    if (Platform.OS === 'ios') {
      // iOS-specific setup
      await this.setupIOSOptimizations();
    } else if (Platform.OS === 'android') {
      // Android-specific setup
      await this.setupAndroidOptimizations();
    }
  }

  /**
   * Setup iOS-specific optimizations
   */
  private async setupIOSOptimizations(): Promise<void> {
    console.log('[BatteryOptimization] Setting up iOS optimizations');
    // Platform-specific initialization would go here
  }

  /**
   * Setup Android-specific optimizations
   */
  private async setupAndroidOptimizations(): Promise<void> {
    console.log('[BatteryOptimization] Setting up Android optimizations');
    // Platform-specific initialization would go here
  }

  /**
   * Enable thermal protection
   */
  private async enableThermalProtection(): Promise<void> {
    console.log('[BatteryOptimization] Enabling thermal protection');

    // Temporarily reduce performance
    await this.updateFeature('limitBackgroundTasks', true);
    await this.updateFeature('reduceAnimations', true);
    await this.updateFeature('aggressiveBatching', true);

    // Notify other services to reduce processing
    (global as any).__thermalProtectionEnabled = true;
  }

  /**
   * Start battery monitoring
   */
  private async startMonitoring(): Promise<void> {
    // Take initial measurement
    await this.collectBatteryData();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.collectBatteryData();
    }, 60000); // Every minute

    console.log('[BatteryOptimization] Started battery monitoring');
  }

  /**
   * Collect current battery data
   */
  private async collectBatteryData(): Promise<void> {
    try {
      if (!Battery) {
        // Use fallback values when Battery is not available
        const batteryData: BatteryUsageData = {
          timestamp: Date.now(),
          batteryLevel: 50, // Default to 50%
          batteryState: BatteryState.UNKNOWN,
          powerMode: this.currentPowerMode,
          estimatedTimeRemaining: 999,
          drainRate: 0,
          chargingStatus: {
            isCharging: false,
            chargingType: 'none',
          },
          thermalState: 'normal',
          isLowPowerMode: false,
        };

        this.addBatteryData(batteryData);
        return;
      }

      const batteryLevel = await Battery.getBatteryLevelAsync();
      const batteryState = await Battery.getBatteryStateAsync() as BatteryState;
      const powerState = await Battery.getPowerStateAsync();

      // Calculate drain rate
      const drainRate = this.calculateDrainRate(Math.round(batteryLevel * 100));

      // Estimate time remaining
      const estimatedTimeRemaining = this.calculateTimeRemaining(
        Math.round(batteryLevel * 100),
        drainRate
      );

      // Detect charging information
      const chargingStatus = {
        isCharging: batteryState === BatteryState.CHARGING,
        chargingType: this.getChargingType(batteryState),
        estimatedTimeToFull: batteryState === BatteryState.CHARGING
          ? this.calculateTimeToFull(Math.round(batteryLevel * 100))
          : undefined,
      };

      const batteryData: BatteryUsageData = {
        timestamp: Date.now(),
        batteryLevel: Math.round(batteryLevel * 100),
        batteryState,
        powerMode: this.currentPowerMode,
        estimatedTimeRemaining,
        drainRate,
        chargingStatus,
        thermalState: this.estimateThermalState(),
        isLowPowerMode: powerState.lowPowerMode,
      };

      this.addBatteryData(batteryData);

    } catch (error) {
      console.error('[BatteryOptimization] Failed to collect battery data:', error);
    }
  }

  /**
   * Calculate battery drain rate
   */
  private calculateDrainRate(currentLevel: number): number {
    const recentData = this.batteryHistory.slice(-5); // Last 5 readings
    if (recentData.length < 2) return 0;

    const timeDiff = Date.now() - recentData[0].timestamp;
    const levelDiff = recentData[0].batteryLevel - currentLevel;

    if (timeDiff <= 0) return 0;

    // Convert to percentage per hour
    return (levelDiff / (timeDiff / (1000 * 60 * 60))) || 0;
  }

  /**
   * Calculate estimated time remaining
   */
  private calculateTimeRemaining(currentLevel: number, drainRate: number): number {
    if (drainRate <= 0) return 999; // Effectively infinite if not draining

    return Math.round((currentLevel / drainRate) * 60); // Convert hours to minutes
  }

  /**
   * Calculate estimated time to full charge
   */
  private calculateTimeToFull(currentLevel: number): number {
    // Simplified charging curve - in reality would be more complex
    const remainingCapacity = 100 - currentLevel;
    const averageChargeRate = 1.5; // 1.5% per minute (simplified)

    return Math.round(remainingCapacity / averageChargeRate);
  }

  /**
   * Get charging type from battery state
   */
  private getChargingType(batteryState: BatteryState): BatteryUsageData['chargingStatus']['chargingType'] {
    switch (batteryState) {
      case BatteryState.CHARGING:
        return 'ac'; // Simplified - would detect actual charging method
      case BatteryState.UNPLUGGED:
        return 'none';
      default:
        return 'unknown';
    }
  }

  /**
   * Estimate thermal state
   */
  private estimateThermalState(): BatteryUsageData['thermalState'] {
    // In production, would use actual thermal sensors
    const recentDrain = this.calculateDrainRate(this.getCurrentBatteryData()?.batteryLevel || 50);

    if (recentDrain > 30) return 'critical';
    if (recentDrain > 20) return 'hot';
    if (recentDrain > 10) return 'warm';
    return 'normal';
  }

  /**
   * Calculate battery drain for feature impact level
   */
  private calculateDrainForImpact(impact: FeatureUsageData['batteryImpact'], usageTimeMs: number): number {
    const impactRates = {
      minimal: 0.1,   // 0.1% per hour
      low: 0.5,       // 0.5% per hour
      moderate: 2,    // 2% per hour
      high: 5,        // 5% per hour
      critical: 15,   // 15% per hour
    };

    const hours = usageTimeMs / (1000 * 60 * 60);
    return impactRates[impact] * hours;
  }

  /**
   * Analyze charging cycles for health assessment
   */
  private analyzeChargingCycles(data: BatteryUsageData[]): { cycles: number; efficiency: number } {
    let cycles = 0;
    let totalEfficiency = 0;
    let efficiencyCount = 0;

    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const curr = data[i];

      // Detect charging cycle (significant level increase)
      if (curr.batteryLevel > prev.batteryLevel + 10) {
        cycles++;

        // Calculate charging efficiency (simplified)
        const timeDiff = curr.timestamp - prev.timestamp;
        const levelGain = curr.batteryLevel - prev.batteryLevel;
        const expectedGain = (timeDiff / (1000 * 60)) * 1.5; // Expected 1.5% per minute

        if (expectedGain > 0) {
          const efficiency = Math.min(levelGain / expectedGain, 1);
          totalEfficiency += efficiency;
          efficiencyCount++;
        }
      }
    }

    return {
      cycles,
      efficiency: efficiencyCount > 0 ? totalEfficiency / efficiencyCount : 0.8, // Default 80%
    };
  }

  /**
   * Add battery data to history
   */
  private addBatteryData(data: BatteryUsageData): void {
    this.batteryHistory.push(data);

    // Keep only last 24 hours of data
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    this.batteryHistory = this.batteryHistory.filter(d => d.timestamp > cutoff);

    // Notify listeners
    this.notifyBatteryStateChanged();
  }

  /**
   * Notify battery state listeners
   */
  private notifyBatteryStateChanged(): void {
    const current = this.getCurrentBatteryData();
    if (current) {
      this.listeners.forEach(listener => {
        try {
          listener(current);
        } catch (error) {
          console.error('[BatteryOptimization] Error in listener:', error);
        }
      });
    }
  }

  /**
   * Register for platform battery state changes
   */
  private registerBatteryStateListeners(): void {
    // Register for app state changes that might affect battery
    AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // Refresh battery data when app becomes active
        this.collectBatteryData();
      }
    });
  }

  /**
   * Load saved settings from storage
   */
  private async loadSettings(): Promise<void> {
    try {
      const [powerMode, features, batteryHistory, featureUsage] = await Promise.all([
        AsyncStorage.getItem(this.STORAGE_KEYS.powerMode),
        AsyncStorage.getItem(this.STORAGE_KEYS.features),
        AsyncStorage.getItem(this.STORAGE_KEYS.batteryHistory),
        AsyncStorage.getItem(this.STORAGE_KEYS.featureUsage),
      ]);

      if (powerMode) {
        this.currentPowerMode = JSON.parse(powerMode);
      }

      if (features) {
        this.currentFeatures = { ...this.DEFAULT_FEATURES[this.currentPowerMode], ...JSON.parse(features) };
      } else {
        this.currentFeatures = this.DEFAULT_FEATURES[this.currentPowerMode];
      }

      if (batteryHistory) {
        const parsed = JSON.parse(batteryHistory);
        // Only load recent data (last 24 hours)
        const cutoff = Date.now() - (24 * 60 * 60 * 1000);
        this.batteryHistory = parsed.filter((data: BatteryUsageData) => data.timestamp > cutoff);
      }

      if (featureUsage) {
        const parsed = JSON.parse(featureUsage);
        this.featureUsage = new Map(parsed);
      }

      console.log('[BatteryOptimization] Loaded settings', {
        powerMode: this.currentPowerMode,
        batteryHistoryLength: this.batteryHistory.length,
        featureUsageCount: this.featureUsage.size,
      });
    } catch (error) {
      console.error('[BatteryOptimization] Failed to load settings:', error);
    }
  }

  /**
   * Save current settings to storage
   */
  private async saveSettings(): Promise<void> {
    try {
      const featureUsageArray = Array.from(this.featureUsage.entries());

      await Promise.all([
        AsyncStorage.setItem(this.STORAGE_KEYS.powerMode, JSON.stringify(this.currentPowerMode)),
        AsyncStorage.setItem(this.STORAGE_KEYS.features, JSON.stringify(this.currentFeatures)),
        AsyncStorage.setItem(this.STORAGE_KEYS.batteryHistory, JSON.stringify(this.batteryHistory)),
        AsyncStorage.setItem(this.STORAGE_KEYS.featureUsage, JSON.stringify(featureUsageArray)),
      ]);
    } catch (error) {
      console.error('[BatteryOptimization] Failed to save settings:', error);
    }
  }
}

// Singleton instance
export const batteryOptimizationService = new BatteryOptimizationService();

// React hook for using the battery optimization service
export function useBatteryOptimization() {
  return {
    setPowerMode: batteryOptimizationService.setPowerMode.bind(batteryOptimizationService),
    getPowerMode: batteryOptimizationService.getPowerMode.bind(batteryOptimizationService),
    updateFeature: batteryOptimizationService.updateFeature.bind(batteryOptimizationService),
    getFeatures: batteryOptimizationService.getFeatures.bind(batteryOptimizationService),
    getCurrentBatteryData: batteryOptimizationService.getCurrentBatteryData.bind(batteryOptimizationService),
    getBatteryHistory: batteryOptimizationService.getBatteryHistory.bind(batteryOptimizationService),
    getRecommendations: batteryOptimizationService.getRecommendations.bind(batteryOptimizationService),
    getFeatureUsage: batteryOptimizationService.getFeatureUsage.bind(batteryOptimizationService),
    getBatteryHealth: batteryOptimizationService.getBatteryHealth.bind(batteryOptimizationService),
    recordFeatureUsage: batteryOptimizationService.recordFeatureUsage.bind(batteryOptimizationService),
    addBatteryStateListener: batteryOptimizationService.addBatteryStateListener.bind(batteryOptimizationService),
  };
}

export default batteryOptimizationService;