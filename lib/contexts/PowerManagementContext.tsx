import React, { createContext, useContext, useEffect, useState } from 'react';
import usePowerManagement, { PowerManagementState, PowerManagementActions, UsePowerManagementOptions } from '../hooks/usePowerManagement';

interface PowerManagementContextType {
  state: PowerManagementState;
  actions: PowerManagementActions;
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

const PowerManagementContext = createContext<PowerManagementContextType | null>(null);

export interface PowerManagementProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
  options?: UsePowerManagementOptions;
}

export function PowerManagementProvider({
  children,
  enabled = true,
  options = {}
}: PowerManagementProviderProps) {
  const [isEnabled, setIsEnabled] = useState(enabled);

  // Use the power management hook with default options
  const [state, actions] = usePowerManagement({
    autoRefresh: true,
    refreshInterval: 30000, // 30 seconds
    enableEventListeners: isEnabled,
    ...options,
  });

  // Log power optimization status changes for debugging
  useEffect(() => {
    if (state.powerState && !state.isLoading) {
      console.log(`[PN-006] Power state: ${state.powerState}, Battery: ${Math.round((state.battery?.level || 0) * 100)}%`);

      // Log feature state changes for key features
      if (state.powerProfile) {
        const features = state.powerProfile.features;
        const reducedFeatures = Object.entries(features)
          .filter(([, featureState]) => featureState === 'reduced' || featureState === 'disabled')
          .map(([feature]) => feature);

        if (reducedFeatures.length > 0) {
          console.log(`[PN-006] Reduced/disabled features: ${reducedFeatures.join(', ')}`);
        }
      }
    }
  }, [state.powerState, state.battery?.level, state.powerProfile]);

  const contextValue: PowerManagementContextType = {
    state,
    actions,
    isEnabled,
    setEnabled: setIsEnabled,
  };

  return (
    <PowerManagementContext.Provider value={contextValue}>
      {children}
    </PowerManagementContext.Provider>
  );
}

export function usePowerManagementContext(): PowerManagementContextType {
  const context = useContext(PowerManagementContext);
  if (!context) {
    throw new Error('usePowerManagementContext must be used within a PowerManagementProvider');
  }
  return context;
}

// Convenience hooks for specific power management aspects
export function usePowerState() {
  const { state } = usePowerManagementContext();
  return {
    powerState: state.powerState,
    isOptimal: state.powerState === 'optimal',
    isBatterySaver: state.powerState === 'battery_saver',
    isCritical: state.powerState === 'critical',
    savingsEstimate: state.powerSavingsEstimate,
    isLoading: state.isLoading,
  };
}

export function useBatteryStatus() {
  const { state } = usePowerManagementContext();
  return {
    level: state.battery?.level || 0,
    isCharging: state.battery?.isCharging || false,
    isLowPowerMode: state.battery?.isLowPowerMode || false,
    healthScore: state.batteryHealthScore,
    recommendations: state.batteryRecommendations,
    isLow: (state.battery?.level || 1) <= 0.2,
    isCritical: (state.battery?.level || 1) <= 0.1,
    isLoading: state.isLoading,
  };
}

export function useResourceStatus() {
  const { state } = usePowerManagementContext();
  return {
    resources: state.resources,
    suggestions: state.resourceSuggestions,
    isPerformanceGood: state.isPerformanceGood,
    isLoading: state.isLoading,
  };
}

export function useTaskManagerStatus() {
  const { state, actions } = usePowerManagementContext();
  return {
    metrics: state.taskMetrics,
    queueStatus: state.queueStatus,
    addTask: actions.addBackgroundTask,
    cancelTask: actions.cancelTask,
    pauseProcessing: actions.pauseTaskProcessing,
    resumeProcessing: actions.resumeTaskProcessing,
    isLoading: state.isLoading,
  };
}

export function useSyncStatus() {
  const { state, actions } = usePowerManagementContext();
  return {
    metrics: state.syncMetrics,
    activityPattern: state.activityPattern,
    syncChannel: actions.syncChannel,
    getCachedMessage: actions.getCachedMessage,
    updateChannelPreference: actions.updateChannelPreference,
    isLoading: state.isLoading,
  };
}

export function usePowerActions() {
  const { actions } = usePowerManagementContext();
  return {
    forcePowerState: actions.forcePowerState,
    refreshData: actions.refreshData,
    getFeatureState: actions.getFeatureState,
    isFeatureEnabled: actions.isFeatureEnabled,
    isFeatureReduced: actions.isFeatureReduced,
  };
}

export default PowerManagementProvider;