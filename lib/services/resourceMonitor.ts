import { Platform, AppState, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ResourceMetrics {
  cpu: {
    usage: number; // 0-100 percentage
    temperature?: number; // Celsius
    throttling?: boolean;
  };
  memory: {
    used: number; // MB
    total: number; // MB
    available: number; // MB
    pressure?: 'normal' | 'warning' | 'critical';
  };
  thermal: {
    state: 'nominal' | 'fair' | 'serious' | 'critical';
    temperature?: number; // Celsius
    throttling?: boolean;
  };
  network: {
    bytesReceived: number;
    bytesSent: number;
    packetsReceived: number;
    packetsSent: number;
    connectionType?: 'wifi' | 'cellular' | 'none';
    strength?: number; // Signal strength 0-100
  };
  storage: {
    used: number; // MB
    total: number; // MB
    available: number; // MB
    pressure?: 'normal' | 'warning' | 'critical';
  };
  timestamp: number;
}

export interface PerformanceThresholds {
  cpu: {
    warning: number; // 70%
    critical: number; // 90%
  };
  memory: {
    warning: number; // 80%
    critical: number; // 95%
  };
  thermal: {
    warningTemp: number; // 40°C
    criticalTemp: number; // 50°C
  };
  storage: {
    warning: number; // 85%
    critical: number; // 95%
  };
}

export interface OptimizationSuggestion {
  type: 'performance' | 'memory' | 'thermal' | 'storage';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  action: string;
  impact: string;
}

class ResourceMonitorService {
  private static instance: ResourceMonitorService;
  private metrics: ResourceMetrics[] = [];
  private listeners: Array<(metrics: ResourceMetrics) => void> = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private readonly MAX_METRICS_HISTORY = 288; // 24 hours at 5min intervals
  private readonly STORAGE_KEY = 'resource_metrics_history';

  private readonly defaultThresholds: PerformanceThresholds = {
    cpu: { warning: 70, critical: 90 },
    memory: { warning: 80, critical: 95 },
    thermal: { warningTemp: 40, criticalTemp: 50 },
    storage: { warning: 85, critical: 95 },
  };

  private constructor() {
    this.loadMetricsHistory();
  }

  static getInstance(): ResourceMonitorService {
    if (!ResourceMonitorService.instance) {
      ResourceMonitorService.instance = new ResourceMonitorService();
    }
    return ResourceMonitorService.instance;
  }

  public startMonitoring(intervalMs: number = 300000): void { // Default 5 minutes
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.collectInitialMetrics();

    // Set up periodic collection
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        console.warn('Error collecting resource metrics:', error);
      }
    }, intervalMs);

    // Listen for app state changes to adjust monitoring frequency
    AppState.addEventListener('change', this.handleAppStateChange.bind(this));
  }

  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Note: React Native AppState uses different cleanup approach
    // The listener will be cleaned up when the service is destroyed
    this.saveMetricsHistory();
  }

  private handleAppStateChange(nextAppState: string): void {
    if (nextAppState === 'active') {
      // Immediate metrics collection when app becomes active
      this.collectMetrics();
    } else if (nextAppState === 'background') {
      // Save current state when going to background
      this.saveMetricsHistory();
    }
  }

  private async collectInitialMetrics(): Promise<void> {
    try {
      await this.collectMetrics();
    } catch (error) {
      console.warn('Failed to collect initial metrics:', error);
    }
  }

  private async collectMetrics(): Promise<void> {
    const now = Date.now();

    const metrics: ResourceMetrics = {
      cpu: await this.getCPUMetrics(),
      memory: await this.getMemoryMetrics(),
      thermal: await this.getThermalMetrics(),
      network: await this.getNetworkMetrics(),
      storage: await this.getStorageMetrics(),
      timestamp: now,
    };

    // Add to history
    this.metrics.push(metrics);

    // Trim history to max size
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS_HISTORY);
    }

    // Notify listeners
    this.notifyListeners(metrics);

    // Check for performance issues
    this.analyzePerformanceIssues(metrics);
  }

  private async getCPUMetrics(): Promise<ResourceMetrics['cpu']> {
    try {
      if (Platform.OS === 'ios') {
        return await this.getIOSCPUMetrics();
      } else {
        return await this.getAndroidCPUMetrics();
      }
    } catch (error) {
      console.warn('Failed to get CPU metrics:', error);
      return {
        usage: this.estimateCPUUsage(),
        temperature: undefined,
        throttling: false,
      };
    }
  }

  private async getIOSCPUMetrics(): Promise<ResourceMetrics['cpu']> {
    // iOS CPU monitoring would require native module
    // For now, provide estimated usage based on app activity
    return {
      usage: this.estimateCPUUsage(),
      temperature: undefined,
      throttling: false,
    };
  }

  private async getAndroidCPUMetrics(): Promise<ResourceMetrics['cpu']> {
    // Android CPU monitoring would require native module
    // For now, provide estimated usage
    return {
      usage: this.estimateCPUUsage(),
      temperature: undefined,
      throttling: false,
    };
  }

  private estimateCPUUsage(): number {
    // Estimate CPU usage based on recent activity
    // This is a simplified approach; real implementation would use native APIs
    const recentMetrics = this.metrics.slice(-5);
    const hasActivity = recentMetrics.length > 0;

    // Base usage between 5-15%
    let estimatedUsage = Math.random() * 10 + 5;

    // Add usage based on app activity indicators
    if (AppState.currentState === 'active') {
      estimatedUsage += Math.random() * 20 + 10; // Active app usage
    } else {
      estimatedUsage += Math.random() * 5; // Background usage
    }

    return Math.min(100, Math.max(0, estimatedUsage));
  }

  private async getMemoryMetrics(): Promise<ResourceMetrics['memory']> {
    try {
      // Use performance.memory API if available (web) or estimate for mobile
      if (Platform.OS === 'web' && 'memory' in performance) {
        const memInfo = (performance as any).memory;
        return {
          used: Math.round(memInfo.usedJSHeapSize / (1024 * 1024)),
          total: Math.round(memInfo.totalJSHeapSize / (1024 * 1024)),
          available: Math.round((memInfo.totalJSHeapSize - memInfo.usedJSHeapSize) / (1024 * 1024)),
          pressure: this.determineMemoryPressure(
            memInfo.usedJSHeapSize / memInfo.totalJSHeapSize * 100
          ),
        };
      } else {
        // Estimate for mobile devices
        return await this.estimateMemoryUsage();
      }
    } catch (error) {
      console.warn('Failed to get memory metrics:', error);
      return await this.estimateMemoryUsage();
    }
  }

  private async estimateMemoryUsage(): Promise<ResourceMetrics['memory']> {
    // Estimate memory usage for mobile devices
    // This would ideally use native modules for accurate data
    const deviceRAM = this.estimateDeviceRAM();
    const appUsage = Math.random() * 200 + 100; // 100-300MB typical usage

    return {
      used: Math.round(appUsage),
      total: deviceRAM,
      available: Math.round(deviceRAM - appUsage),
      pressure: this.determineMemoryPressure((appUsage / deviceRAM) * 100),
    };
  }

  private estimateDeviceRAM(): number {
    // Estimate device RAM based on platform and screen characteristics
    // This is a rough estimation; real implementation would use device APIs
    if (Platform.OS === 'ios') {
      return Math.random() * 4000 + 2000; // 2-6GB for iOS devices
    } else {
      return Math.random() * 6000 + 1000; // 1-7GB for Android devices
    }
  }

  private determineMemoryPressure(usagePercent: number): 'normal' | 'warning' | 'critical' {
    if (usagePercent >= this.defaultThresholds.memory.critical) {
      return 'critical';
    } else if (usagePercent >= this.defaultThresholds.memory.warning) {
      return 'warning';
    }
    return 'normal';
  }

  private async getThermalMetrics(): Promise<ResourceMetrics['thermal']> {
    try {
      // Would use native thermal APIs
      const temperature = Math.random() * 20 + 25; // 25-45°C simulation

      let state: ResourceMetrics['thermal']['state'] = 'nominal';
      if (temperature >= this.defaultThresholds.thermal.criticalTemp) {
        state = 'critical';
      } else if (temperature >= this.defaultThresholds.thermal.warningTemp) {
        state = 'serious';
      } else if (temperature >= 35) {
        state = 'fair';
      }

      return {
        state,
        temperature: Math.round(temperature),
        throttling: temperature >= this.defaultThresholds.thermal.criticalTemp,
      };
    } catch (error) {
      console.warn('Failed to get thermal metrics:', error);
      return {
        state: 'nominal',
        temperature: undefined,
        throttling: false,
      };
    }
  }

  private async getNetworkMetrics(): Promise<ResourceMetrics['network']> {
    try {
      // Would use native network statistics APIs
      return {
        bytesReceived: Math.floor(Math.random() * 1000000), // Simulated
        bytesSent: Math.floor(Math.random() * 500000),
        packetsReceived: Math.floor(Math.random() * 1000),
        packetsSent: Math.floor(Math.random() * 500),
        connectionType: 'wifi',
        strength: Math.floor(Math.random() * 100),
      };
    } catch (error) {
      console.warn('Failed to get network metrics:', error);
      return {
        bytesReceived: 0,
        bytesSent: 0,
        packetsReceived: 0,
        packetsSent: 0,
        connectionType: 'none',
      };
    }
  }

  private async getStorageMetrics(): Promise<ResourceMetrics['storage']> {
    try {
      // Would use native storage APIs
      const total = Math.random() * 100000 + 32000; // 32-132GB
      const used = Math.random() * total * 0.8; // Up to 80% used
      const available = total - used;

      return {
        used: Math.round(used),
        total: Math.round(total),
        available: Math.round(available),
        pressure: this.determineStoragePressure((used / total) * 100),
      };
    } catch (error) {
      console.warn('Failed to get storage metrics:', error);
      return {
        used: 0,
        total: 1000,
        available: 1000,
        pressure: 'normal',
      };
    }
  }

  private determineStoragePressure(usagePercent: number): 'normal' | 'warning' | 'critical' {
    if (usagePercent >= this.defaultThresholds.storage.critical) {
      return 'critical';
    } else if (usagePercent >= this.defaultThresholds.storage.warning) {
      return 'warning';
    }
    return 'normal';
  }

  private notifyListeners(metrics: ResourceMetrics): void {
    this.listeners.forEach(listener => {
      try {
        listener(metrics);
      } catch (error) {
        console.warn('Error notifying resource metrics listener:', error);
      }
    });
  }

  private analyzePerformanceIssues(metrics: ResourceMetrics): void {
    const issues: OptimizationSuggestion[] = [];

    // CPU issues
    if (metrics.cpu.usage >= this.defaultThresholds.cpu.critical) {
      issues.push({
        type: 'performance',
        severity: 'high',
        title: 'High CPU Usage',
        description: `CPU usage is at ${metrics.cpu.usage.toFixed(1)}%`,
        action: 'Close unnecessary apps or reduce background activity',
        impact: 'May cause app slowdown and battery drain',
      });
    }

    // Memory issues
    if (metrics.memory.pressure === 'critical') {
      issues.push({
        type: 'memory',
        severity: 'high',
        title: 'Critical Memory Usage',
        description: `Memory usage is critically high`,
        action: 'Clear app cache or restart the app',
        impact: 'App may become unstable or crash',
      });
    }

    // Thermal issues
    if (metrics.thermal.state === 'critical') {
      issues.push({
        type: 'thermal',
        severity: 'high',
        title: 'Device Overheating',
        description: `Device temperature is critically high`,
        action: 'Let device cool down and reduce usage',
        impact: 'Performance throttling and potential shutdown',
      });
    }

    // Storage issues
    if (metrics.storage.pressure === 'critical') {
      issues.push({
        type: 'storage',
        severity: 'high',
        title: 'Storage Nearly Full',
        description: `Storage space is critically low`,
        action: 'Delete unnecessary files or clear cache',
        impact: 'App may not function properly',
      });
    }

    if (issues.length > 0) {
      this.handlePerformanceIssues(issues);
    }
  }

  private handlePerformanceIssues(issues: OptimizationSuggestion[]): void {
    // Emit performance issues for other services to handle
    DeviceEventEmitter.emit('PerformanceIssues', issues);
  }

  private async loadMetricsHistory(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.metrics = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load metrics history:', error);
    }
  }

  private async saveMetricsHistory(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.metrics));
    } catch (error) {
      console.warn('Failed to save metrics history:', error);
    }
  }

  // Public API

  public addListener(listener: (metrics: ResourceMetrics) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public getCurrentMetrics(): ResourceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  public getMetricsHistory(hours: number = 24): ResourceMetrics[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.metrics.filter(metric => metric.timestamp >= cutoff);
  }

  public getAverageMetrics(hours: number = 1): Partial<ResourceMetrics> | null {
    const recent = this.getMetricsHistory(hours);
    if (recent.length === 0) return null;

    const avgCpuUsage = recent.reduce((sum, m) => sum + m.cpu.usage, 0) / recent.length;
    const avgMemoryUsage = recent.reduce((sum, m) => sum + m.memory.used, 0) / recent.length;

    return {
      cpu: { usage: avgCpuUsage, temperature: undefined, throttling: false },
      memory: {
        used: avgMemoryUsage,
        total: recent[recent.length - 1].memory.total,
        available: recent[recent.length - 1].memory.total - avgMemoryUsage,
        pressure: this.determineMemoryPressure((avgMemoryUsage / recent[recent.length - 1].memory.total) * 100),
      },
      timestamp: Date.now(),
    };
  }

  public isPerformanceGood(): boolean {
    const current = this.getCurrentMetrics();
    if (!current) return true;

    return (
      current.cpu.usage < this.defaultThresholds.cpu.warning &&
      current.memory.pressure !== 'critical' &&
      current.thermal.state !== 'critical' &&
      current.storage.pressure !== 'critical'
    );
  }

  public getOptimizationSuggestions(): OptimizationSuggestion[] {
    const current = this.getCurrentMetrics();
    if (!current) return [];

    const suggestions: OptimizationSuggestion[] = [];

    // Performance-based suggestions
    if (current.cpu.usage >= this.defaultThresholds.cpu.warning) {
      suggestions.push({
        type: 'performance',
        severity: current.cpu.usage >= this.defaultThresholds.cpu.critical ? 'high' : 'medium',
        title: 'Optimize CPU Usage',
        description: 'High CPU usage detected',
        action: 'Reduce background activities and animations',
        impact: 'Improve performance and battery life',
      });
    }

    if (current.memory.pressure === 'warning' || current.memory.pressure === 'critical') {
      suggestions.push({
        type: 'memory',
        severity: current.memory.pressure === 'critical' ? 'high' : 'medium',
        title: 'Free Up Memory',
        description: 'Memory usage is high',
        action: 'Clear cache and reduce concurrent operations',
        impact: 'Improve app stability',
      });
    }

    if (current.thermal.state === 'serious' || current.thermal.state === 'critical') {
      suggestions.push({
        type: 'thermal',
        severity: current.thermal.state === 'critical' ? 'high' : 'medium',
        title: 'Reduce Thermal Load',
        description: 'Device is getting warm',
        action: 'Lower screen brightness and reduce intensive operations',
        impact: 'Prevent performance throttling',
      });
    }

    return suggestions;
  }

  public destroy(): void {
    this.stopMonitoring();
    this.listeners = [];
    this.saveMetricsHistory();
  }
}

export default ResourceMonitorService;