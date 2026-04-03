/**
 * Background Processing Context
 * Provides access to background processing services throughout the app
 * Part of PN-006: Background processing and delivery optimization
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { backgroundProcessingService } from '../services/backgroundProcessing';
import { batteryOptimizationService, type PowerMode, type BatteryUsageData } from '../services/batteryOptimization';
import { performanceMonitorService, type PerformanceData, type DeviceCapabilities } from '../services/performanceMonitor';

interface BackgroundProcessingContextType {
  // Battery optimization
  powerMode: PowerMode;
  batteryData: BatteryUsageData | null;
  batteryHealth: string;
  setPowerMode: (mode: PowerMode) => Promise<void>;

  // Performance monitoring
  performanceData: PerformanceData | null;
  deviceCapabilities: DeviceCapabilities | null;

  // Background processing
  taskStats: {
    total: number;
    pending: number;
    byPriority: Record<string, number>;
  };

  // Service status
  isInitialized: boolean;
  isOptimizing: boolean;
}

const BackgroundProcessingContext = createContext<BackgroundProcessingContextType | null>(null);

interface BackgroundProcessingProviderProps {
  children: ReactNode;
}

export function BackgroundProcessingProvider({ children }: BackgroundProcessingProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Battery optimization state
  const [powerMode, setPowerModeState] = useState<PowerMode>('balanced');
  const [batteryData, setBatteryData] = useState<BatteryUsageData | null>(null);
  const [batteryHealth, setBatteryHealth] = useState<string>('unknown');

  // Performance monitoring state
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [deviceCapabilities, setDeviceCapabilities] = useState<DeviceCapabilities | null>(null);

  // Background processing state
  const [taskStats, setTaskStats] = useState({
    total: 0,
    pending: 0,
    byPriority: {
      critical: 0,
      high: 0,
      normal: 0,
      low: 0,
      background: 0,
    },
  });

  // Initialize services and set up listeners
  useEffect(() => {
    let batteryStateListener: (() => void) | null = null;

    const initializeContext = async () => {
      try {
        console.log('[BackgroundProcessingContext] Initializing context...');

        // Wait for services to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Set initial state from services
        setPowerModeState(batteryOptimizationService.getPowerMode());
        setBatteryData(batteryOptimizationService.getCurrentBatteryData());
        setBatteryHealth(batteryOptimizationService.getBatteryHealth());
        setPerformanceData(performanceMonitorService.getCurrentPerformance());
        setDeviceCapabilities(performanceMonitorService.getDeviceCapabilities());
        setTaskStats(backgroundProcessingService.getTaskStats());

        // Set up battery state listener
        batteryStateListener = batteryOptimizationService.addBatteryStateListener((data) => {
          setBatteryData(data);
        });

        // Set up periodic updates
        const updateInterval = setInterval(() => {
          try {
            // Update performance data
            const currentPerformance = performanceMonitorService.getCurrentPerformance();
            if (currentPerformance) {
              setPerformanceData(currentPerformance);
            }

            // Update task stats
            setTaskStats(backgroundProcessingService.getTaskStats());

            // Update battery health occasionally
            setBatteryHealth(batteryOptimizationService.getBatteryHealth());
          } catch (error) {
            console.error('[BackgroundProcessingContext] Error updating data:', error);
          }
        }, 30000); // Update every 30 seconds

        setIsInitialized(true);
        console.log('[BackgroundProcessingContext] Context initialized successfully');

        // Return cleanup function
        return () => {
          if (batteryStateListener) {
            batteryStateListener();
          }
          clearInterval(updateInterval);
        };
      } catch (error) {
        console.error('[BackgroundProcessingContext] Failed to initialize:', error);
        setIsInitialized(true); // Set to true anyway to not block the app

        // Return empty cleanup function for error case
        return () => {};
      }
    };

    const cleanup = initializeContext();

    return () => {
      if (cleanup instanceof Promise) {
        cleanup.then(cleanupFn => {
          if (cleanupFn) cleanupFn();
        });
      }
    };
  }, []);

  // Handle power mode changes
  const setPowerMode = async (mode: PowerMode) => {
    setIsOptimizing(true);
    try {
      await batteryOptimizationService.setPowerMode(mode);
      setPowerModeState(mode);

      // Update other state that might be affected by power mode change
      setBatteryData(batteryOptimizationService.getCurrentBatteryData());
      setTaskStats(backgroundProcessingService.getTaskStats());
    } catch (error) {
      console.error('[BackgroundProcessingContext] Failed to set power mode:', error);
      throw error;
    } finally {
      setIsOptimizing(false);
    }
  };

  // Handle app state changes for optimization
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        // When app goes to background, record feature usage
        batteryOptimizationService.recordFeatureUsage(
          'app_backgrounded',
          1000, // 1 second
          'minimal'
        );
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const contextValue: BackgroundProcessingContextType = {
    // Battery optimization
    powerMode,
    batteryData,
    batteryHealth,
    setPowerMode,

    // Performance monitoring
    performanceData,
    deviceCapabilities,

    // Background processing
    taskStats,

    // Service status
    isInitialized,
    isOptimizing,
  };

  return (
    <BackgroundProcessingContext.Provider value={contextValue}>
      {children}
    </BackgroundProcessingContext.Provider>
  );
}

// Hook to use the background processing context
export function useBackgroundProcessing(): BackgroundProcessingContextType {
  const context = useContext(BackgroundProcessingContext);
  if (!context) {
    throw new Error('useBackgroundProcessing must be used within a BackgroundProcessingProvider');
  }
  return context;
}

// Hook for battery optimization specifically
export function useBatteryContext() {
  const { powerMode, batteryData, batteryHealth, setPowerMode, isOptimizing } = useBackgroundProcessing();
  return {
    powerMode,
    batteryData,
    batteryHealth,
    setPowerMode,
    isOptimizing,
  };
}

// Hook for performance monitoring specifically
export function usePerformanceContext() {
  const { performanceData, deviceCapabilities } = useBackgroundProcessing();
  return {
    performanceData,
    deviceCapabilities,
  };
}

// Hook for task management specifically
export function useTaskContext() {
  const { taskStats } = useBackgroundProcessing();
  return {
    taskStats,
  };
}