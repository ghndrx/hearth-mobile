/**
 * Power Management Hook
 *
 * React hook for monitoring device power state and adapting
 * background processing behavior accordingly.
 *
 * Part of PN-006: Background processing and delivery optimization.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  devicePerformanceMonitor,
  type DevicePerformanceState,
  type PerformanceProfile,
  type PerformanceRecommendation,
} from '../services/backgroundProcessing/DevicePerformanceMonitor';
import {
  backgroundProcessingService,
  type ProcessingConfig,
} from '../services/backgroundProcessing/BackgroundProcessingService';

export interface PowerManagementState {
  batteryLevel: number;
  isCharging: boolean;
  isLowPowerMode: boolean;
  thermalState: string;
  activeProfile: PerformanceProfile;
  recommendation: PerformanceRecommendation;
}

export interface PowerManagementActions {
  forceProfile: (profileId: string) => void;
  updateProcessingConfig: (config: Partial<ProcessingConfig>) => void;
  refreshState: () => void;
}

export interface UsePowerManagementOptions {
  autoAdapt?: boolean;
  onStateChange?: (state: PowerManagementState) => void;
}

export type UsePowerManagementReturn = PowerManagementState &
  PowerManagementActions;

export function usePowerManagement(
  options: UsePowerManagementOptions = {},
): UsePowerManagementReturn {
  const { autoAdapt = true, onStateChange } = options;

  const [state, setState] = useState<PowerManagementState>(() => {
    const perfState = devicePerformanceMonitor.getState();
    const recommendation = devicePerformanceMonitor.getRecommendation();
    return {
      batteryLevel: perfState?.powerState.batteryLevel ?? 100,
      isCharging: perfState?.powerState.isCharging ?? false,
      isLowPowerMode: perfState?.powerState.isLowPowerMode ?? false,
      thermalState: perfState?.thermalState ?? 'nominal',
      activeProfile:
        perfState?.activeProfile ??
        devicePerformanceMonitor.getActiveProfile(),
      recommendation,
    };
  });

  useEffect(() => {
    const unsubscribe = devicePerformanceMonitor.subscribe(
      (perfState: DevicePerformanceState) => {
        const recommendation = devicePerformanceMonitor.getRecommendation();
        const newState: PowerManagementState = {
          batteryLevel: perfState.powerState.batteryLevel,
          isCharging: perfState.powerState.isCharging,
          isLowPowerMode: perfState.powerState.isLowPowerMode,
          thermalState: perfState.thermalState,
          activeProfile: perfState.activeProfile,
          recommendation,
        };

        setState(newState);
        onStateChange?.(newState);

        if (autoAdapt) {
          backgroundProcessingService.updateConfig({
            maxConcurrentTasks: perfState.activeProfile.maxConcurrentTasks,
            batchSize: perfState.activeProfile.batchSize,
          });
        }
      },
    );

    return unsubscribe;
  }, [autoAdapt, onStateChange]);

  const forceProfile = useCallback((profileId: string) => {
    console.log(`Force profile: ${profileId}`);
  }, []);

  const updateProcessingConfig = useCallback(
    (config: Partial<ProcessingConfig>) => {
      backgroundProcessingService.updateConfig(config);
    },
    [],
  );

  const refreshState = useCallback(() => {
    const perfState = devicePerformanceMonitor.getState();
    const recommendation = devicePerformanceMonitor.getRecommendation();
    if (perfState) {
      setState({
        batteryLevel: perfState.powerState.batteryLevel,
        isCharging: perfState.powerState.isCharging,
        isLowPowerMode: perfState.powerState.isLowPowerMode,
        thermalState: perfState.thermalState,
        activeProfile: perfState.activeProfile,
        recommendation,
      });
    }
  }, []);

  return {
    ...state,
    forceProfile,
    updateProcessingConfig,
    refreshState,
  };
}

export default usePowerManagement;
