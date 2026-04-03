/**
 * Performance Monitor Service
 * Handles hardware detection and device-adaptive performance optimization
 * Part of PN-006: Background processing and delivery optimization
 */

import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system';

// Device performance tier classification
export type DevicePerformanceTier = 'low' | 'medium' | 'high' | 'flagship';

// Thermal management states
export type ThermalState = 'nominal' | 'fair' | 'serious' | 'critical';

// Device capabilities profile
export interface DeviceCapabilities {
  performanceTier: DevicePerformanceTier;
  totalMemoryMB: number;
  availableMemoryMB: number;
  cpuCores: number;
  supportLevel: {
    backgroundProcessing: 'limited' | 'standard' | 'enhanced';
    pushNotifications: 'basic' | 'rich' | 'advanced';
    multimedia: 'basic' | 'standard' | 'advanced';
    networking: 'basic' | 'standard' | 'advanced';
  };
  optimizations: {
    enableAggressiveBatching: boolean;
    enablePreemptiveSync: boolean;
    enableRichNotifications: boolean;
    enableBackgroundVoice: boolean;
    maxConcurrentConnections: number;
    recommendedSyncInterval: number;
    enableThermalThrottling: boolean;
  };
}

// Performance monitoring data
export interface PerformanceData {
  timestamp: number;
  cpuUsage: number;
  memoryUsage: number;
  memoryPressure: 'low' | 'medium' | 'high' | 'critical';
  thermalState: ThermalState;
  batteryImpact: 'minimal' | 'low' | 'moderate' | 'high';
  networkLatency: number;
  frameRate: number;
  isThrottling: boolean;
}

// Storage analysis
interface StorageInfo {
  totalSpace: number;
  freeSpace: number;
  usedSpace: number;
  freePercentage: number;
  needsCleanup: boolean;
}

// Performance optimization recommendations
export interface PerformanceRecommendations {
  immediate: string[];
  background: string[];
  longTerm: string[];
  priority: 'low' | 'medium' | 'high';
}

class PerformanceMonitorService {
  private deviceCapabilities: DeviceCapabilities | null = null;
  private performanceHistory: PerformanceData[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly MAX_HISTORY_LENGTH = 100;
  private readonly MONITORING_INTERVAL_MS = 10000; // 10 seconds
  private isInitialized = false;

  /**
   * Initialize the performance monitoring service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('[PerformanceMonitor] Initializing service');

    try {
      // Detect device capabilities
      this.deviceCapabilities = await this.detectDeviceCapabilities();

      // Start performance monitoring
      await this.startMonitoring();

      this.isInitialized = true;
      console.log('[PerformanceMonitor] Service initialized', this.deviceCapabilities);
    } catch (error) {
      console.error('[PerformanceMonitor] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Stop the performance monitoring service
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isInitialized = false;
    console.log('[PerformanceMonitor] Service stopped');
  }

  /**
   * Get device capabilities profile
   */
  getDeviceCapabilities(): DeviceCapabilities | null {
    return this.deviceCapabilities;
  }

  /**
   * Get current performance data
   */
  getCurrentPerformance(): PerformanceData | null {
    return this.performanceHistory[this.performanceHistory.length - 1] || null;
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(maxEntries?: number): PerformanceData[] {
    const limit = maxEntries || this.performanceHistory.length;
    return this.performanceHistory.slice(-limit);
  }

  /**
   * Get performance recommendations based on current state
   */
  getRecommendations(): PerformanceRecommendations {
    const current = this.getCurrentPerformance();
    const device = this.deviceCapabilities;

    if (!current || !device) {
      return {
        immediate: ['Initialize performance monitoring'],
        background: [],
        longTerm: [],
        priority: 'medium',
      };
    }

    const recommendations: PerformanceRecommendations = {
      immediate: [],
      background: [],
      longTerm: [],
      priority: 'low',
    };

    // Immediate recommendations based on current performance
    if (current.thermalState === 'critical') {
      recommendations.immediate.push('Reduce background processing due to critical thermal state');
      recommendations.priority = 'high';
    }

    if (current.memoryPressure === 'critical') {
      recommendations.immediate.push('Clear message cache and reduce memory usage');
      recommendations.priority = 'high';
    }

    if (current.isThrottling) {
      recommendations.immediate.push('Enable thermal throttling to prevent overheating');
      recommendations.priority = 'high';
    }

    if (current.batteryImpact === 'high') {
      recommendations.immediate.push('Switch to power-saving mode');
      recommendations.priority = 'medium';
    }

    // Background recommendations based on device capabilities
    if (device.performanceTier === 'low') {
      recommendations.background.push('Enable aggressive message batching');
      recommendations.background.push('Reduce sync frequency to preserve battery');
      recommendations.background.push('Disable rich notifications on low-end devices');
    }

    if (device.totalMemoryMB < 3000) {
      recommendations.background.push('Enable automatic cache cleanup');
      recommendations.background.push('Limit concurrent network connections');
    }

    // Long-term recommendations based on usage patterns
    const avgMemoryUsage = this.getAverageMetric('memoryUsage', 10);
    if (avgMemoryUsage > 80) {
      recommendations.longTerm.push('Consider reducing app memory footprint');
    }

    const avgThermal = this.getAverageThermalLevel();
    if (avgThermal > 2) { // Above 'fair' level
      recommendations.longTerm.push('Implement better thermal management');
    }

    return recommendations;
  }

  /**
   * Check if device supports advanced features
   */
  supportsFeature(feature: keyof DeviceCapabilities['supportLevel']): boolean {
    const capabilities = this.deviceCapabilities?.supportLevel[feature];
    return capabilities === 'enhanced' || capabilities === 'advanced';
  }

  /**
   * Get optimal settings for current device
   */
  getOptimalSettings(): {
    syncInterval: number;
    maxConcurrentConnections: number;
    enableBackgroundProcessing: boolean;
    enableRichNotifications: boolean;
    batchSize: number;
  } {
    if (!this.deviceCapabilities) {
      return {
        syncInterval: 30000,
        maxConcurrentConnections: 3,
        enableBackgroundProcessing: true,
        enableRichNotifications: true,
        batchSize: 10,
      };
    }

    const { optimizations, performanceTier } = this.deviceCapabilities;

    return {
      syncInterval: optimizations.recommendedSyncInterval,
      maxConcurrentConnections: optimizations.maxConcurrentConnections,
      enableBackgroundProcessing: performanceTier !== 'low',
      enableRichNotifications: optimizations.enableRichNotifications,
      batchSize: performanceTier === 'low' ? 5 : performanceTier === 'medium' ? 10 : 15,
    };
  }

  /**
   * Detect device capabilities and performance tier
   */
  private async detectDeviceCapabilities(): Promise<DeviceCapabilities> {
    const deviceInfo = {
      brand: Device.brand,
      manufacturer: Device.manufacturer,
      modelName: Device.modelName,
      osName: Device.osName,
      osVersion: Device.osVersion,
      platformApiLevel: Device.platformApiLevel,
      totalMemory: Device.totalMemory,
    };

    console.log('[PerformanceMonitor] Device info:', deviceInfo);

    // Estimate performance tier based on device information
    const performanceTier = this.classifyDevicePerformance(deviceInfo);

    // Estimate memory (simplified approach for cross-platform compatibility)
    const totalMemoryMB = this.estimateTotalMemory(deviceInfo);
    const availableMemoryMB = Math.round(totalMemoryMB * 0.7); // Estimate available memory

    // Estimate CPU cores (simplified)
    const cpuCores = this.estimateCpuCores(performanceTier);

    // Determine support levels based on platform and device tier
    const supportLevel = this.determineSupportLevel(performanceTier);

    // Generate optimizations based on device capabilities
    const optimizations = this.generateOptimizations(performanceTier, totalMemoryMB);

    return {
      performanceTier,
      totalMemoryMB,
      availableMemoryMB,
      cpuCores,
      supportLevel,
      optimizations,
    };
  }

  /**
   * Classify device performance tier
   */
  private classifyDevicePerformance(deviceInfo: any): DevicePerformanceTier {
    // iOS classification
    if (Platform.OS === 'ios') {
      const modelName = deviceInfo.modelName?.toLowerCase() || '';

      // Flagship devices (2022+)
      if (modelName.includes('iphone 14') || modelName.includes('iphone 15') ||
          modelName.includes('ipad pro') && deviceInfo.osVersion >= '16.0') {
        return 'flagship';
      }

      // High-end devices (2019-2021)
      if (modelName.includes('iphone 1') || modelName.includes('ipad air')) {
        return 'high';
      }

      // Medium devices
      if (modelName.includes('iphone 8') || modelName.includes('iphone se')) {
        return 'medium';
      }

      // Older devices
      return 'low';
    }

    // Android classification
    if (Platform.OS === 'android') {
      const manufacturer = deviceInfo.manufacturer?.toLowerCase() || '';
      const modelName = deviceInfo.modelName?.toLowerCase() || '';
      const apiLevel = deviceInfo.platformApiLevel || 0;

      // Flagship Android (recent flagships)
      if ((manufacturer.includes('samsung') && modelName.includes('s2')) ||
          (manufacturer.includes('google') && modelName.includes('pixel')) ||
          (manufacturer.includes('oneplus') && apiLevel >= 33)) {
        return 'flagship';
      }

      // High-end Android
      if (apiLevel >= 30 && (
          manufacturer.includes('samsung') ||
          manufacturer.includes('google') ||
          manufacturer.includes('oneplus') ||
          manufacturer.includes('xiaomi')
      )) {
        return 'high';
      }

      // Medium Android
      if (apiLevel >= 26) {
        return 'medium';
      }

      // Low-end Android
      return 'low';
    }

    // Default to medium for unknown platforms
    return 'medium';
  }

  /**
   * Estimate total device memory
   */
  private estimateTotalMemory(deviceInfo: any): number {
    // Use actual total memory if available (newer Expo versions)
    if (deviceInfo.totalMemory) {
      return Math.round(deviceInfo.totalMemory / (1024 * 1024)); // Convert to MB
    }

    // Estimate based on device tier and platform
    const tier = this.classifyDevicePerformance(deviceInfo);

    const memoryEstimates = {
      flagship: Platform.OS === 'ios' ? 8192 : 12288, // 8GB iOS, 12GB Android
      high: Platform.OS === 'ios' ? 6144 : 8192,      // 6GB iOS, 8GB Android
      medium: Platform.OS === 'ios' ? 4096 : 6144,    // 4GB iOS, 6GB Android
      low: Platform.OS === 'ios' ? 2048 : 3072,       // 2GB iOS, 3GB Android
    };

    return memoryEstimates[tier];
  }

  /**
   * Estimate CPU core count
   */
  private estimateCpuCores(tier: DevicePerformanceTier): number {
    const coreEstimates = {
      flagship: 8,
      high: 8,
      medium: 6,
      low: 4,
    };

    return coreEstimates[tier];
  }

  /**
   * Determine support level for various features
   */
  private determineSupportLevel(tier: DevicePerformanceTier): DeviceCapabilities['supportLevel'] {
    switch (tier) {
      case 'flagship':
        return {
          backgroundProcessing: 'enhanced',
          pushNotifications: 'advanced',
          multimedia: 'advanced',
          networking: 'advanced',
        };
      case 'high':
        return {
          backgroundProcessing: 'enhanced',
          pushNotifications: 'advanced',
          multimedia: 'standard',
          networking: 'advanced',
        };
      case 'medium':
        return {
          backgroundProcessing: 'standard',
          pushNotifications: 'rich',
          multimedia: 'standard',
          networking: 'standard',
        };
      case 'low':
      default:
        return {
          backgroundProcessing: 'limited',
          pushNotifications: 'basic',
          multimedia: 'basic',
          networking: 'basic',
        };
    }
  }

  /**
   * Generate optimizations based on device capabilities
   */
  private generateOptimizations(
    tier: DevicePerformanceTier,
    memoryMB: number
  ): DeviceCapabilities['optimizations'] {
    switch (tier) {
      case 'flagship':
        return {
          enableAggressiveBatching: false,
          enablePreemptiveSync: true,
          enableRichNotifications: true,
          enableBackgroundVoice: true,
          maxConcurrentConnections: 8,
          recommendedSyncInterval: 5000,
          enableThermalThrottling: true,
        };
      case 'high':
        return {
          enableAggressiveBatching: false,
          enablePreemptiveSync: true,
          enableRichNotifications: true,
          enableBackgroundVoice: true,
          maxConcurrentConnections: 6,
          recommendedSyncInterval: 10000,
          enableThermalThrottling: true,
        };
      case 'medium':
        return {
          enableAggressiveBatching: true,
          enablePreemptiveSync: false,
          enableRichNotifications: true,
          enableBackgroundVoice: false,
          maxConcurrentConnections: 4,
          recommendedSyncInterval: 15000,
          enableThermalThrottling: true,
        };
      case 'low':
      default:
        return {
          enableAggressiveBatching: true,
          enablePreemptiveSync: false,
          enableRichNotifications: false,
          enableBackgroundVoice: false,
          maxConcurrentConnections: 2,
          recommendedSyncInterval: 30000,
          enableThermalThrottling: true,
        };
    }
  }

  /**
   * Start performance monitoring
   */
  private async startMonitoring(): Promise<void> {
    // Take initial measurement
    await this.collectPerformanceData();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.collectPerformanceData();
    }, this.MONITORING_INTERVAL_MS);

    console.log('[PerformanceMonitor] Started monitoring with interval:', this.MONITORING_INTERVAL_MS);
  }

  /**
   * Collect current performance data
   */
  private async collectPerformanceData(): Promise<void> {
    try {
      const timestamp = Date.now();

      // Simplified performance metrics for React Native
      const cpuUsage = this.estimateCurrentCpuUsage();
      const memoryData = await this.getMemoryInfo();
      const thermalState = this.estimateThermalState(cpuUsage);
      const batteryImpact = this.estimateBatteryImpact(cpuUsage, memoryData.memoryUsage);

      const performanceData: PerformanceData = {
        timestamp,
        cpuUsage,
        memoryUsage: memoryData.memoryUsage,
        memoryPressure: memoryData.pressure,
        thermalState,
        batteryImpact,
        networkLatency: await this.measureNetworkLatency(),
        frameRate: 60, // Simplified - would use actual FPS measurement
        isThrottling: thermalState === 'serious' || thermalState === 'critical',
      };

      this.addPerformanceData(performanceData);

    } catch (error) {
      console.error('[PerformanceMonitor] Failed to collect performance data:', error);
    }
  }

  /**
   * Estimate current CPU usage (simplified for React Native)
   */
  private estimateCurrentCpuUsage(): number {
    // Simple estimation based on app activity and time
    const baseUsage = 5; // Base usage
    const currentTasks = (global as any).__taskCount || 0; // Would track active tasks
    const taskUsage = Math.min(currentTasks * 10, 60);

    // Add some randomness to simulate real CPU usage variation
    const variation = (Math.random() - 0.5) * 20;

    return Math.max(0, Math.min(100, baseUsage + taskUsage + variation));
  }

  /**
   * Get memory information
   */
  private async getMemoryInfo(): Promise<{ memoryUsage: number; pressure: PerformanceData['memoryPressure'] }> {
    try {
      // Simplified memory estimation for React Native
      const totalMemory = this.deviceCapabilities?.totalMemoryMB || 4096;

      // Estimate current usage based on app runtime and complexity
      const runtime = Date.now() - (global as any).__startTime || 0;
      const runtimeFactor = Math.min(runtime / (1000 * 60 * 60), 1); // 1 hour max

      const baseUsage = 200; // Base app memory in MB
      const runtimeUsage = runtimeFactor * 300; // Additional usage over time

      const currentUsageMB = baseUsage + runtimeUsage;
      const memoryUsage = (currentUsageMB / totalMemory) * 100;

      let pressure: PerformanceData['memoryPressure'];
      if (memoryUsage > 90) pressure = 'critical';
      else if (memoryUsage > 75) pressure = 'high';
      else if (memoryUsage > 60) pressure = 'medium';
      else pressure = 'low';

      return { memoryUsage: Math.min(100, memoryUsage), pressure };
    } catch (error) {
      console.error('[PerformanceMonitor] Failed to get memory info:', error);
      return { memoryUsage: 50, pressure: 'medium' };
    }
  }

  /**
   * Estimate thermal state based on CPU usage
   */
  private estimateThermalState(cpuUsage: number): ThermalState {
    // In production, this would use platform-specific thermal APIs
    if (cpuUsage > 85) return 'critical';
    if (cpuUsage > 70) return 'serious';
    if (cpuUsage > 50) return 'fair';
    return 'nominal';
  }

  /**
   * Estimate battery impact based on resource usage
   */
  private estimateBatteryImpact(cpuUsage: number, memoryUsage: number): PerformanceData['batteryImpact'] {
    const impact = (cpuUsage + memoryUsage) / 2;

    if (impact > 80) return 'high';
    if (impact > 60) return 'moderate';
    if (impact > 30) return 'low';
    return 'minimal';
  }

  /**
   * Measure network latency (simplified)
   */
  private async measureNetworkLatency(): Promise<number> {
    try {
      const start = Date.now();
      // Simple ping-like measurement using a lightweight endpoint
      await fetch('https://httpbin.org/status/200', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      return Date.now() - start;
    } catch (error) {
      return 1000; // Default to 1 second if measurement fails
    }
  }

  /**
   * Add performance data to history
   */
  private addPerformanceData(data: PerformanceData): void {
    this.performanceHistory.push(data);

    // Keep history within bounds
    if (this.performanceHistory.length > this.MAX_HISTORY_LENGTH) {
      this.performanceHistory = this.performanceHistory.slice(-this.MAX_HISTORY_LENGTH);
    }
  }

  /**
   * Get average value for a metric over the last N entries
   */
  private getAverageMetric(metric: keyof PerformanceData, entries: number): number {
    const recent = this.performanceHistory.slice(-entries);
    if (recent.length === 0) return 0;

    const sum = recent.reduce((acc, data) => acc + (data[metric] as number), 0);
    return sum / recent.length;
  }

  /**
   * Get average thermal level (as number for easier calculation)
   */
  private getAverageThermalLevel(): number {
    const recent = this.performanceHistory.slice(-10);
    if (recent.length === 0) return 0;

    const thermalLevels = { nominal: 0, fair: 1, serious: 2, critical: 3 };
    const sum = recent.reduce((acc, data) => acc + thermalLevels[data.thermalState], 0);

    return sum / recent.length;
  }
}

// Singleton instance
export const performanceMonitorService = new PerformanceMonitorService();

// React hook for using the performance monitor service
export function usePerformanceMonitor() {
  return {
    getCapabilities: performanceMonitorService.getDeviceCapabilities.bind(performanceMonitorService),
    getCurrentPerformance: performanceMonitorService.getCurrentPerformance.bind(performanceMonitorService),
    getHistory: performanceMonitorService.getPerformanceHistory.bind(performanceMonitorService),
    getRecommendations: performanceMonitorService.getRecommendations.bind(performanceMonitorService),
    supportsFeature: performanceMonitorService.supportsFeature.bind(performanceMonitorService),
    getOptimalSettings: performanceMonitorService.getOptimalSettings.bind(performanceMonitorService),
  };
}

export default performanceMonitorService;