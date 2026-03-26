/**
 * Device Discovery Context
 * CDH-001: Real-time device discovery and registration
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import type {
  UserDevice,
  DeviceDiscoveryOptions,
  DeviceDiscoveryResponse,
  CallHandoffManager,
  DeviceDiscoveryEvent,
  DeviceHandoffSuggestion,
  DeviceSyncPreferences,
  CallState,
} from '../types/callHandoff';
import { deviceDiscoveryService } from '../services/deviceDiscovery';
import { deviceDiscoveryWebSocketService } from '../services/deviceDiscoveryWebSocket';

// State interface
interface DeviceDiscoveryState {
  currentDevice: UserDevice | null;
  discoveredDevices: UserDevice[];
  isDiscovering: boolean;
  isRegistered: boolean;
  lastDiscovery: string | null;
  handoffSuggestions: DeviceHandoffSuggestion[];
  activeHandoffs: Map<string, CallHandoffManager>;
  syncPreferences: DeviceSyncPreferences | null;
  error: string | null;
  onlineDevicesCount: number;
  totalDevicesCount: number;
}

// Action types
type DeviceDiscoveryAction =
  | { type: 'SET_CURRENT_DEVICE'; payload: UserDevice }
  | { type: 'SET_DISCOVERED_DEVICES'; payload: UserDevice[] }
  | { type: 'UPDATE_DEVICE'; payload: UserDevice }
  | { type: 'REMOVE_DEVICE'; payload: string }
  | { type: 'SET_DISCOVERING'; payload: boolean }
  | { type: 'SET_REGISTERED'; payload: boolean }
  | { type: 'SET_LAST_DISCOVERY'; payload: string }
  | { type: 'SET_HANDOFF_SUGGESTIONS'; payload: DeviceHandoffSuggestion[] }
  | { type: 'ADD_ACTIVE_HANDOFF'; payload: CallHandoffManager }
  | { type: 'UPDATE_ACTIVE_HANDOFF'; payload: CallHandoffManager }
  | { type: 'REMOVE_ACTIVE_HANDOFF'; payload: string }
  | { type: 'SET_SYNC_PREFERENCES'; payload: DeviceSyncPreferences }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_DEVICE_COUNTS'; payload: { online: number; total: number } };

// Context interface
interface DeviceDiscoveryContextType {
  state: DeviceDiscoveryState;
  actions: {
    registerDevice: () => Promise<UserDevice>;
    discoverDevices: (options?: DeviceDiscoveryOptions) => Promise<DeviceDiscoveryResponse>;
    refreshDiscovery: () => Promise<void>;
    getHandoffSuggestions: () => Promise<DeviceHandoffSuggestion[]>;
    initiateCallHandoff: (targetDeviceId: string, callState: CallState) => Promise<void>;
    acceptCallHandoff: (handoffId: string) => Promise<CallHandoffManager>;
    updateSyncPreferences: (preferences: Partial<DeviceSyncPreferences>) => Promise<void>;
    clearError: () => void;
  };
}

// Initial state
const initialState: DeviceDiscoveryState = {
  currentDevice: null,
  discoveredDevices: [],
  isDiscovering: false,
  isRegistered: false,
  lastDiscovery: null,
  handoffSuggestions: [],
  activeHandoffs: new Map(),
  syncPreferences: null,
  error: null,
  onlineDevicesCount: 0,
  totalDevicesCount: 0,
};

// Reducer
function deviceDiscoveryReducer(
  state: DeviceDiscoveryState,
  action: DeviceDiscoveryAction
): DeviceDiscoveryState {
  switch (action.type) {
    case 'SET_CURRENT_DEVICE':
      return { ...state, currentDevice: action.payload, isRegistered: true };

    case 'SET_DISCOVERED_DEVICES':
      return {
        ...state,
        discoveredDevices: action.payload,
        lastDiscovery: new Date().toISOString(),
        onlineDevicesCount: action.payload.filter(d => d.presence === 'online').length,
        totalDevicesCount: action.payload.length,
      };

    case 'UPDATE_DEVICE': {
      const updatedDevices = state.discoveredDevices.map(device =>
        device.id === action.payload.id ? action.payload : device
      );

      // Also update current device if it's the same
      const updatedCurrentDevice = state.currentDevice?.id === action.payload.id
        ? action.payload
        : state.currentDevice;

      return {
        ...state,
        discoveredDevices: updatedDevices,
        currentDevice: updatedCurrentDevice,
        onlineDevicesCount: updatedDevices.filter(d => d.presence === 'online').length,
        totalDevicesCount: updatedDevices.length,
      };
    }

    case 'REMOVE_DEVICE': {
      const filteredDevices = state.discoveredDevices.filter(device => device.id !== action.payload);
      return {
        ...state,
        discoveredDevices: filteredDevices,
        onlineDevicesCount: filteredDevices.filter(d => d.presence === 'online').length,
        totalDevicesCount: filteredDevices.length,
      };
    }

    case 'SET_DISCOVERING':
      return { ...state, isDiscovering: action.payload };

    case 'SET_REGISTERED':
      return { ...state, isRegistered: action.payload };

    case 'SET_LAST_DISCOVERY':
      return { ...state, lastDiscovery: action.payload };

    case 'SET_HANDOFF_SUGGESTIONS':
      return { ...state, handoffSuggestions: action.payload };

    case 'ADD_ACTIVE_HANDOFF': {
      const newActiveHandoffs = new Map(state.activeHandoffs);
      newActiveHandoffs.set(action.payload.sourceDeviceId + action.payload.targetDeviceId, action.payload);
      return { ...state, activeHandoffs: newActiveHandoffs };
    }

    case 'UPDATE_ACTIVE_HANDOFF': {
      const newActiveHandoffs = new Map(state.activeHandoffs);
      const key = action.payload.sourceDeviceId + action.payload.targetDeviceId;
      if (newActiveHandoffs.has(key)) {
        newActiveHandoffs.set(key, action.payload);
      }
      return { ...state, activeHandoffs: newActiveHandoffs };
    }

    case 'REMOVE_ACTIVE_HANDOFF': {
      const newActiveHandoffs = new Map(state.activeHandoffs);
      newActiveHandoffs.delete(action.payload);
      return { ...state, activeHandoffs: newActiveHandoffs };
    }

    case 'SET_SYNC_PREFERENCES':
      return { ...state, syncPreferences: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_DEVICE_COUNTS':
      return {
        ...state,
        onlineDevicesCount: action.payload.online,
        totalDevicesCount: action.payload.total,
      };

    default:
      return state;
  }
}

// Create context
const DeviceDiscoveryContext = createContext<DeviceDiscoveryContextType | undefined>(undefined);

// Provider component
interface DeviceDiscoveryProviderProps {
  children: ReactNode;
  autoInitialize?: boolean;
}

export function DeviceDiscoveryProvider({
  children,
  autoInitialize = true
}: DeviceDiscoveryProviderProps) {
  const [state, dispatch] = useReducer(deviceDiscoveryReducer, initialState);

  // Handle real-time device discovery events
  const handleDeviceDiscoveryEvent = useCallback((event: DeviceDiscoveryEvent) => {
    switch (event.type) {
      case 'device_discovered':
      case 'device_updated':
        dispatch({ type: 'UPDATE_DEVICE', payload: event.device });
        break;

      case 'device_presence_changed': {
        // Find and update the device with the new presence
        const device = state.discoveredDevices.find(d => d.id === event.update.deviceId);
        if (device) {
          const updatedDevice: UserDevice = {
            ...device,
            presence: event.update.presence,
            lastSeen: event.update.lastSeen,
            batteryLevel: event.update.batteryLevel,
            networkType: event.update.networkType,
          };
          dispatch({ type: 'UPDATE_DEVICE', payload: updatedDevice });
        }
        break;
      }

      case 'device_disconnected':
        dispatch({ type: 'REMOVE_DEVICE', payload: event.deviceId });
        break;

      case 'call_handoff_initiated':
        dispatch({ type: 'ADD_ACTIVE_HANDOFF', payload: event.handoff });
        break;

      case 'call_handoff_progress':
      case 'call_handoff_completed':
        dispatch({ type: 'UPDATE_ACTIVE_HANDOFF', payload: event.handoff });
        break;

      case 'call_handoff_failed':
        dispatch({ type: 'UPDATE_ACTIVE_HANDOFF', payload: event.handoff });
        // Remove failed handoff after a delay
        setTimeout(() => {
          const key = event.handoff.sourceDeviceId + event.handoff.targetDeviceId;
          dispatch({ type: 'REMOVE_ACTIVE_HANDOFF', payload: key });
        }, 5000);
        break;
    }
  }, [state.discoveredDevices]);

  // Initialize device discovery on mount
  useEffect(() => {
    if (autoInitialize) {
      registerDevice().catch(error => {
        console.error('Failed to auto-register device:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to register device' });
      });
    }

    // Subscribe to WebSocket events
    const unsubscribe = deviceDiscoveryWebSocketService.subscribe(handleDeviceDiscoveryEvent);

    return () => {
      unsubscribe();
      deviceDiscoveryService.destroy();
    };
  }, [autoInitialize, handleDeviceDiscoveryEvent]);

  // Load sync preferences on registration
  useEffect(() => {
    if (state.isRegistered) {
      deviceDiscoveryService.getSyncPreferences()
        .then(preferences => {
          dispatch({ type: 'SET_SYNC_PREFERENCES', payload: preferences });
        })
        .catch(error => {
          console.warn('Failed to load sync preferences:', error);
        });
    }
  }, [state.isRegistered]);

  // Actions
  const registerDevice = useCallback(async (): Promise<UserDevice> => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      const device = await deviceDiscoveryService.registerDevice();
      dispatch({ type: 'SET_CURRENT_DEVICE', payload: device });
      return device;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Device registration failed';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    }
  }, []);

  const discoverDevices = useCallback(async (options?: DeviceDiscoveryOptions): Promise<DeviceDiscoveryResponse> => {
    try {
      dispatch({ type: 'SET_DISCOVERING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await deviceDiscoveryService.discoverDevices(options);

      dispatch({ type: 'SET_DISCOVERED_DEVICES', payload: response.devices });

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Device discovery failed';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    } finally {
      dispatch({ type: 'SET_DISCOVERING', payload: false });
    }
  }, []);

  const refreshDiscovery = useCallback(async (): Promise<void> => {
    await discoverDevices();
  }, [discoverDevices]);

  const getHandoffSuggestions = useCallback(async (): Promise<DeviceHandoffSuggestion[]> => {
    try {
      const suggestions = await deviceDiscoveryService.getHandoffSuggestions();
      dispatch({ type: 'SET_HANDOFF_SUGGESTIONS', payload: suggestions });
      return suggestions;
    } catch (error) {
      console.error('Failed to get handoff suggestions:', error);
      return [];
    }
  }, []);

  const initiateCallHandoff = useCallback(async (
    targetDeviceId: string,
    callState: CallState
  ): Promise<void> => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      const result = await deviceDiscoveryService.initiateCallHandoff(targetDeviceId, callState);

      if (!result.success) {
        throw new Error(result.error || 'Call handoff initiation failed');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Call handoff failed';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    }
  }, []);

  const acceptCallHandoff = useCallback(async (handoffId: string): Promise<CallHandoffManager> => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      const handoffManager = await deviceDiscoveryService.acceptCallHandoff(handoffId);
      return handoffManager;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Call handoff acceptance failed';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    }
  }, []);

  const updateSyncPreferences = useCallback(async (
    preferences: Partial<DeviceSyncPreferences>
  ): Promise<void> => {
    try {
      await deviceDiscoveryService.updateSyncPreferences(preferences);

      // Update local state
      if (state.syncPreferences) {
        dispatch({
          type: 'SET_SYNC_PREFERENCES',
          payload: { ...state.syncPreferences, ...preferences }
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update sync preferences';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    }
  }, [state.syncPreferences]);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const contextValue: DeviceDiscoveryContextType = {
    state,
    actions: {
      registerDevice,
      discoverDevices,
      refreshDiscovery,
      getHandoffSuggestions,
      initiateCallHandoff,
      acceptCallHandoff,
      updateSyncPreferences,
      clearError,
    },
  };

  return (
    <DeviceDiscoveryContext.Provider value={contextValue}>
      {children}
    </DeviceDiscoveryContext.Provider>
  );
}

// Custom hook to use device discovery context
export function useDeviceDiscovery(): DeviceDiscoveryContextType {
  const context = useContext(DeviceDiscoveryContext);
  if (context === undefined) {
    throw new Error('useDeviceDiscovery must be used within a DeviceDiscoveryProvider');
  }
  return context;
}

// Export context for advanced usage
export { DeviceDiscoveryContext };