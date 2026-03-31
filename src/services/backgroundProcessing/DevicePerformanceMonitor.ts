/**
 * Device Performance Monitor
 *
 * Monitors device performance state including battery, thermal,
 * memory, and storage conditions to adapt background processing
 * behavior for optimal battery life and user experience.
 *
 * Part of PN-006: Background processing and delivery optimization.
 */

import { AppState, AppStateStatus, Platform } from 'react-native';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DeviceCapabilities {
  brand: string | null;
  modelName: string | null;
  osVersion: string | null;
  isDevice: boolean;
  platform: 'ios' | 'android';
  totalMemoryMB: number;
}

export interface PowerState {
  batteryLevel: number;
  isCharging: boolean;
  isLowPowerMode: boolean;
}

export type ThermalState = 'nominal' | 'fair' | 'serious' | 'critical';

export interface MemoryState {
  usedMemoryMB: number;
  totalMemoryMB: number;
  memoryPressure: 'low' | 'moderate' | 'high' | 'critical';
}

export interface StorageState {
  availableStorageMB: number;
  isLowStorage: boolean;
}

export interface PerformanceProfile {
  id: string;
  name: string;
  maxConcurrentTasks: number;
  batchSize: number;
  processingIntervalMs: number;
  backgroundProcessingEnabled: boolean;
  networkOptimized: boolean;
}

export interface DevicePerformanceState {
  capabilities: DeviceCapabilities;
  powerState: PowerState;
  thermalState: ThermalState;
  memoryState: MemoryState;
  storageState: StorageState;
  activeProfile: PerformanceProfile;
  lastUpdated: number;
}

export interface PerformanceRecommendation {
  shouldReduceProcessing: boolean;
  shouldDeferNonCritical: boolean;
  shouldPauseBackground: boolean;
  recommendedConcurrency: number;
  reason: string;
}

const PERFORMANCE_PROFILES: Record<string, PerformanceProfile> = {
  high_performance: {
    id: 'high_performance',
    name: 'High Performance',
    maxConcurrentTasks: 5,
    batchSize: 10,
    processingIntervalMs: 2000,
    backgroundProcessingEnabled: true,
    networkOptimized: false,
  },
  balanced: {
    id: 'balanced',
    name: 'Balanced',
    maxConcurrentTasks: 3,
    batchSize: 5,
    processingIntervalMs: 5000,
    backgroundProcessingEnabled: true,
    networkOptimized: true,
  },
  battery_saver: {
    id: 'battery_saver',
    name: 'Battery Saver',
    maxConcurrentTasks: 1,
    batchSize: 3,
    processingIntervalMs: 15000,
    backgroundProcessingEnabled: true,
    networkOptimized: true,
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    maxConcurrentTasks: 1,
    batchSize: 1,
    processingIntervalMs: 30000,
    backgroundProcessingEnabled: false,
    networkOptimized: true,
  },
};

const MONITOR_STORAGE_KEY = '@hearth/device_performance_state';

class DevicePerformanceMonitor {
  private state: DevicePerformanceState | null = null;
  private isInitialized = false;
  private monitoringInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<(state: DevicePerformanceState) => void> = new Set();
  private appState: AppStateStatus = 'active';

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const capabilities = this.detectCapabilities();

    this.state = {
      capabilities,
      powerState: {
        batteryLevel: 100,
        isCharging: false,
        isLowPowerMode: false,
      },
      thermalState: 'nominal',
      memoryState: {
        usedMemoryMB: 0,
        totalMemoryMB: capabilities.totalMemoryMB,
        memoryPressure: 'low',
      },
      storageState: {
        availableStorageMB: 1000,
        isLowStorage: false,
      },
      activeProfile: PERFORMANCE_PROFILES.balanced,
      lastUpdated: Date.now(),
    };

    await this.loadState();

    AppState.addEventListener('change', this.handleAppStateChange);

    this.monitoringInterval = setInterval(
      () => this.updateState(),
      15000,
    );

    await this.updateState();
    this.isInitialized = true;
  }

  shutdown(): void {
    if (!this.isInitialized) {
      return;
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.saveState();
    this.listeners.clear();
    this.isInitialized = false;
  }

  getState(): DevicePerformanceState | null {
    return this.state ? { ...this.state } : null;
  }

  getActiveProfile(): PerformanceProfile {
    return this.state?.activeProfile || PERFORMANCE_PROFILES.balanced;
  }

  getRecommendation(): PerformanceRecommendation {
    if (!this.state) {
      return {
        shouldReduceProcessing: false,
        shouldDeferNonCritical: false,
        shouldPauseBackground: false,
        recommendedConcurrency: 3,
        reason: 'No state available',
      };
    }

    const { powerState, thermalState, memoryState } = this.state;

    if (
      thermalState === 'critical' ||
      memoryState.memoryPressure === 'critical'
    ) {
      return {
        shouldReduceProcessing: true,
        shouldDeferNonCritical: true,
        shouldPauseBackground: true,
        recommendedConcurrency: 1,
        reason: `Critical state: thermal=${thermalState}, memory=${memoryState.memoryPressure}`,
      };
    }

    if (
      powerState.isLowPowerMode ||
      (!powerState.isCharging && powerState.batteryLevel < 20)
    ) {
      return {
        shouldReduceProcessing: true,
        shouldDeferNonCritical: true,
        shouldPauseBackground: false,
        recommendedConcurrency: 1,
        reason: 'Low power mode or low battery',
      };
    }

    if (thermalState === 'serious' || memoryState.memoryPressure === 'high') {
      return {
        shouldReduceProcessing: true,
        shouldDeferNonCritical: false,
        shouldPauseBackground: false,
        recommendedConcurrency: 2,
        reason: `Elevated state: thermal=${thermalState}, memory=${memoryState.memoryPressure}`,
      };
    }

    return {
      shouldReduceProcessing: false,
      shouldDeferNonCritical: false,
      shouldPauseBackground: false,
      recommendedConcurrency: this.state.activeProfile.maxConcurrentTasks,
      reason: 'Normal operation',
    };
  }

  subscribe(
    callback: (state: DevicePerformanceState) => void,
  ): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Private methods

  private detectCapabilities(): DeviceCapabilities {
    return {
      brand: Device.brand,
      modelName: Device.modelName,
      osVersion: Device.osVersion,
      isDevice: Device.isDevice,
      platform: Platform.OS as 'ios' | 'android',
      totalMemoryMB: Device.totalMemory
        ? Math.round(Device.totalMemory / (1024 * 1024))
        : 4096,
    };
  }

  private async updateState(): Promise<void> {
    if (!this.state) return;

    // Estimate memory pressure based on task load
    const memoryPressure = this.estimateMemoryPressure();

    // Estimate thermal state
    const thermalState = this.estimateThermalState();

    this.state = {
      ...this.state,
      thermalState,
      memoryState: {
        ...this.state.memoryState,
        memoryPressure,
      },
      lastUpdated: Date.now(),
    };

    // Select appropriate profile
    this.state.activeProfile = this.selectProfile();

    this.notifyListeners();
  }

  private estimateMemoryPressure(): MemoryState['memoryPressure'] {
    // Simplified estimation
    if (this.appState !== 'active') return 'low';
    return 'low';
  }

  private estimateThermalState(): ThermalState {
    // Simplified estimation
    return 'nominal';
  }

  private selectProfile(): PerformanceProfile {
    if (!this.state) return PERFORMANCE_PROFILES.balanced;

    const { powerState, thermalState, memoryState } = this.state;

    if (
      thermalState === 'critical' ||
      memoryState.memoryPressure === 'critical'
    ) {
      return PERFORMANCE_PROFILES.minimal;
    }

    if (
      powerState.isLowPowerMode ||
      (!powerState.isCharging && powerState.batteryLevel < 20)
    ) {
      return PERFORMANCE_PROFILES.battery_saver;
    }

    if (powerState.isCharging && thermalState === 'nominal') {
      return PERFORMANCE_PROFILES.high_performance;
    }

    return PERFORMANCE_PROFILES.balanced;
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    this.appState = nextAppState;
    if (nextAppState === 'active') {
      this.updateState();
    }
  };

  private notifyListeners(): void {
    if (!this.state) return;
    const stateCopy = { ...this.state };
    this.listeners.forEach((listener) => {
      try {
        listener(stateCopy);
      } catch (error) {
        console.error('Error in performance monitor listener:', error);
      }
    });
  }

  private async loadState(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(MONITOR_STORAGE_KEY);
      if (stored && this.state) {
        const saved = JSON.parse(stored);
        // Only restore profile preference, not transient state
        if (saved.activeProfile?.id && PERFORMANCE_PROFILES[saved.activeProfile.id]) {
          this.state.activeProfile = PERFORMANCE_PROFILES[saved.activeProfile.id];
        }
      }
    } catch {
      // Non-critical, ignore
    }
  }

  private async saveState(): Promise<void> {
    if (!this.state) return;
    try {
      await AsyncStorage.setItem(
        MONITOR_STORAGE_KEY,
        JSON.stringify({
          activeProfile: { id: this.state.activeProfile.id },
          lastUpdated: this.state.lastUpdated,
        }),
      );
    } catch {
      // Non-critical, ignore
    }
  }
}

export const devicePerformanceMonitor = new DevicePerformanceMonitor();
export default devicePerformanceMonitor;
