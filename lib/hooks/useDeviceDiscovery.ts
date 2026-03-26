/**
 * Device Discovery Hooks
 * CDH-001: Real-time device discovery and registration
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDeviceDiscovery as useDeviceDiscoveryContext } from '../contexts/DeviceDiscoveryContext';
import type {
  UserDevice,
  DeviceDiscoveryOptions,
  DeviceHandoffSuggestion,
  CallState,
  DeviceCapabilities,
  DeviceSyncPreferences,
} from '../types/callHandoff';

// Main device discovery hook (re-export context hook)
export { useDeviceDiscovery } from '../contexts/DeviceDiscoveryContext';

/**
 * Hook for device registration with automatic retry logic
 */
export function useDeviceRegistration() {
  const { state, actions } = useDeviceDiscoveryContext();
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  const register = useCallback(async () => {
    if (state.isRegistered || isRegistering) {
      return state.currentDevice;
    }

    try {
      setIsRegistering(true);
      setRegistrationError(null);
      const device = await actions.registerDevice();
      return device;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      setRegistrationError(message);
      throw error;
    } finally {
      setIsRegistering(false);
    }
  }, [state.isRegistered, state.currentDevice, isRegistering, actions.registerDevice]);

  const retryRegistration = useCallback(async () => {
    return register();
  }, [register]);

  return {
    currentDevice: state.currentDevice,
    isRegistered: state.isRegistered,
    isRegistering,
    registrationError,
    register,
    retryRegistration,
  };
}

/**
 * Hook for filtered device discovery with search and filtering capabilities
 */
export function useDeviceList(options?: {
  filter?: (device: UserDevice) => boolean;
  search?: string;
  sortBy?: 'name' | 'lastSeen' | 'presence' | 'type';
  sortOrder?: 'asc' | 'desc';
}) {
  const { state, actions } = useDeviceDiscoveryContext();

  const filteredAndSortedDevices = useMemo(() => {
    let devices = [...state.discoveredDevices];

    // Apply custom filter
    if (options?.filter) {
      devices = devices.filter(options.filter);
    }

    // Apply search filter
    if (options?.search) {
      const searchLower = options.search.toLowerCase();
      devices = devices.filter(device =>
        device.name.toLowerCase().includes(searchLower) ||
        device.type.toLowerCase().includes(searchLower) ||
        device.platform.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    if (options?.sortBy) {
      devices.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (options.sortBy) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'lastSeen':
            aValue = new Date(a.lastSeen).getTime();
            bValue = new Date(b.lastSeen).getTime();
            break;
          case 'presence':
            // Online first, then idle, busy, offline
            const presenceOrder = { online: 0, idle: 1, busy: 2, offline: 3 };
            aValue = presenceOrder[a.presence];
            bValue = presenceOrder[b.presence];
            break;
          case 'type':
            aValue = a.type.toLowerCase();
            bValue = b.type.toLowerCase();
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return options.sortOrder === 'desc' ? 1 : -1;
        if (aValue > bValue) return options.sortOrder === 'desc' ? -1 : 1;
        return 0;
      });
    }

    return devices;
  }, [
    state.discoveredDevices,
    options?.filter,
    options?.search,
    options?.sortBy,
    options?.sortOrder
  ]);

  const onlineDevices = useMemo(() =>
    filteredAndSortedDevices.filter(device => device.presence === 'online'),
    [filteredAndSortedDevices]
  );

  const offlineDevices = useMemo(() =>
    filteredAndSortedDevices.filter(device => device.presence === 'offline'),
    [filteredAndSortedDevices]
  );

  return {
    allDevices: filteredAndSortedDevices,
    onlineDevices,
    offlineDevices,
    deviceCount: {
      total: state.totalDevicesCount,
      online: state.onlineDevicesCount,
      filtered: filteredAndSortedDevices.length,
    },
    isLoading: state.isDiscovering,
    error: state.error,
    refresh: actions.discoverDevices,
  };
}

/**
 * Hook for device capabilities filtering and compatibility checking
 */
export function useDeviceCompatibility(requiredCapabilities?: Partial<DeviceCapabilities>) {
  const { state } = useDeviceDiscoveryContext();

  const compatibleDevices = useMemo(() => {
    if (!requiredCapabilities) {
      return state.discoveredDevices;
    }

    return state.discoveredDevices.filter(device => {
      const capabilities = device.capabilities;

      // Check each required capability
      for (const [capability, required] of Object.entries(requiredCapabilities)) {
        if (required && !capabilities[capability as keyof DeviceCapabilities]) {
          return false;
        }
      }

      return true;
    });
  }, [state.discoveredDevices, requiredCapabilities]);

  const isDeviceCompatible = useCallback((device: UserDevice): boolean => {
    if (!requiredCapabilities) return true;

    for (const [capability, required] of Object.entries(requiredCapabilities)) {
      if (required && !device.capabilities[capability as keyof DeviceCapabilities]) {
        return false;
      }
    }

    return true;
  }, [requiredCapabilities]);

  return {
    compatibleDevices,
    isDeviceCompatible,
    capabilityMatrix: state.discoveredDevices.map(device => ({
      device,
      capabilities: device.capabilities,
      isCompatible: isDeviceCompatible(device),
    })),
  };
}

/**
 * Hook for call handoff functionality
 */
export function useCallHandoff() {
  const { state, actions } = useDeviceDiscoveryContext();
  const [isInitiating, setIsInitiating] = useState(false);
  const [handoffError, setHandoffError] = useState<string | null>(null);

  const initiateHandoff = useCallback(async (targetDeviceId: string, callState: CallState) => {
    try {
      setIsInitiating(true);
      setHandoffError(null);
      await actions.initiateCallHandoff(targetDeviceId, callState);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Handoff failed';
      setHandoffError(message);
      throw error;
    } finally {
      setIsInitiating(false);
    }
  }, [actions.initiateCallHandoff]);

  const acceptHandoff = useCallback(async (handoffId: string) => {
    try {
      setHandoffError(null);
      const handoffManager = await actions.acceptCallHandoff(handoffId);
      return handoffManager;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to accept handoff';
      setHandoffError(message);
      throw error;
    }
  }, [actions.acceptCallHandoff]);

  const clearHandoffError = useCallback(() => {
    setHandoffError(null);
  }, []);

  return {
    activeHandoffs: Array.from(state.activeHandoffs.values()),
    handoffSuggestions: state.handoffSuggestions,
    isInitiating,
    handoffError,
    initiateHandoff,
    acceptHandoff,
    getHandoffSuggestions: actions.getHandoffSuggestions,
    clearHandoffError,
  };
}

/**
 * Hook for device presence and real-time updates
 */
export function useDevicePresence(deviceId?: string) {
  const { state } = useDeviceDiscoveryContext();

  const targetDevice = useMemo(() => {
    if (!deviceId) return state.currentDevice;
    return state.discoveredDevices.find(device => device.id === deviceId);
  }, [deviceId, state.currentDevice, state.discoveredDevices]);

  const presenceInfo = useMemo(() => {
    if (!targetDevice) return null;

    const now = new Date();
    const lastSeen = new Date(targetDevice.lastSeen);
    const minutesSinceLastSeen = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));

    return {
      presence: targetDevice.presence,
      lastSeen: targetDevice.lastSeen,
      minutesSinceLastSeen,
      isOnline: targetDevice.presence === 'online',
      batteryLevel: targetDevice.batteryLevel,
      networkType: targetDevice.networkType,
      capabilities: targetDevice.capabilities,
    };
  }, [targetDevice]);

  return {
    device: targetDevice,
    presenceInfo,
    isCurrentDevice: targetDevice?.isCurrentDevice || false,
  };
}

/**
 * Hook for device sync preferences management
 */
export function useDeviceSyncPreferences() {
  const { state, actions } = useDeviceDiscoveryContext();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const updatePreferences = useCallback(async (preferences: Partial<DeviceSyncPreferences>) => {
    try {
      setIsUpdating(true);
      setUpdateError(null);
      await actions.updateSyncPreferences(preferences);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update preferences';
      setUpdateError(message);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [actions.updateSyncPreferences]);

  const clearUpdateError = useCallback(() => {
    setUpdateError(null);
  }, []);

  return {
    preferences: state.syncPreferences,
    isUpdating,
    updateError,
    updatePreferences,
    clearUpdateError,
  };
}

/**
 * Hook for device discovery polling with configurable intervals
 */
export function useDeviceDiscoveryPolling(options?: {
  interval?: number;
  enabled?: boolean;
  discoveryOptions?: DeviceDiscoveryOptions;
}) {
  const { actions } = useDeviceDiscoveryContext();
  const [lastPollTime, setLastPollTime] = useState<Date | null>(null);

  const {
    interval = 30000, // 30 seconds default
    enabled = true,
    discoveryOptions
  } = options || {};

  const poll = useCallback(async () => {
    try {
      await actions.discoverDevices(discoveryOptions);
      setLastPollTime(new Date());
    } catch (error) {
      console.warn('Device discovery polling failed:', error);
    }
  }, [actions.discoverDevices, discoveryOptions]);

  useEffect(() => {
    if (!enabled) return;

    // Initial poll
    poll();

    // Set up polling interval
    const intervalId = setInterval(poll, interval);

    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, interval, poll]);

  return {
    lastPollTime,
    poll,
  };
}