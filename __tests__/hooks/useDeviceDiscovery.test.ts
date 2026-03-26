/**
 * Tests for Device Discovery Hooks - CDH-001
 *
 * Tests the React hooks for device discovery functionality including
 * device registration, discovery, presence, and call handoff.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import React from 'react';

// Mock the device discovery service
const mockDeviceDiscoveryService = {
  registerDevice: jest.fn(),
  discoverDevices: jest.fn(),
  updatePresence: jest.fn(),
  getHandoffSuggestions: jest.fn(),
  initiateCallHandoff: jest.fn(),
  acceptCallHandoff: jest.fn(),
  getSyncPreferences: jest.fn(),
  updateSyncPreferences: jest.fn(),
  stopPresenceUpdates: jest.fn(),
  getCurrentDevice: jest.fn(),
};

// Mock the WebSocket service
const mockWebSocketService = {
  isConnected: jest.fn(),
  subscribe: jest.fn(),
  send: jest.fn(),
};

// Mock the device discovery context
const mockDeviceDiscoveryContext = {
  state: {
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
  },
  actions: {
    registerDevice: jest.fn(),
    discoverDevices: jest.fn(),
    refreshDiscovery: jest.fn(),
    getHandoffSuggestions: jest.fn(),
    initiateCallHandoff: jest.fn(),
    acceptCallHandoff: jest.fn(),
    updateSyncPreferences: jest.fn(),
    clearError: jest.fn(),
  },
};

// Mock React Native
const mockAppState = {
  addEventListener: jest.fn(),
  currentState: 'active',
};

jest.mock('../../lib/services/deviceDiscovery', () => ({
  deviceDiscoveryService: mockDeviceDiscoveryService,
  DeviceCapabilityDetector: {
    detectCapabilities: jest.fn(),
  },
}));

jest.mock('../../lib/services/websocket', () => ({
  websocketService: mockWebSocketService,
  WebSocketMessageType: {
    DEVICE_DISCOVERED: 'device:discovered',
    DEVICE_UPDATED: 'device:updated',
    DEVICE_PRESENCE_CHANGED: 'device:presence_changed',
    DEVICE_DISCONNECTED: 'device:disconnected',
    CALL_HANDOFF_INITIATED: 'call:handoff:initiated',
    CALL_HANDOFF_PROGRESS: 'call:handoff:progress',
    CALL_HANDOFF_COMPLETED: 'call:handoff:completed',
    CALL_HANDOFF_FAILED: 'call:handoff:failed',
  },
}));

jest.mock('../../lib/contexts/DeviceDiscoveryContext', () => ({
  useDeviceDiscovery: jest.fn(() => mockDeviceDiscoveryContext),
}));

jest.mock('react-native', () => ({
  AppState: mockAppState,
}));

// Mock useWebSocket hook
jest.mock('../../lib/hooks/useWebSocket', () => ({
  useWebSocket: jest.fn(() => ({
    isConnected: true,
    isConnecting: false,
    error: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    send: jest.fn(),
    subscribe: jest.fn(),
  })),
  useWebSocketMessage: jest.fn(),
}));

import {
  useDeviceRegistration,
  useDeviceList,
  useDeviceCompatibility,
  useCallHandoff,
  useDevicePresence,
  useDeviceSyncPreferences,
  useDeviceDiscoveryPolling,
} from '../../lib/hooks/useDeviceDiscovery';

describe('useDeviceRegistration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeviceDiscoveryContext.state.isRegistered = false;
    mockDeviceDiscoveryContext.state.currentDevice = null;
  });

  it('should register device successfully', async () => {
    const mockDevice = {
      id: 'device-123',
      name: 'Test Device',
      type: 'mobile',
      platform: 'ios',
    };

    mockDeviceDiscoveryContext.actions.registerDevice.mockResolvedValue(mockDevice);

    const { result } = renderHook(() => useDeviceRegistration());

    await act(async () => {
      const device = await result.current.register();
      expect(device).toEqual(mockDevice);
    });

    expect(mockDeviceDiscoveryContext.actions.registerDevice).toHaveBeenCalled();
    expect(result.current.isRegistering).toBe(false);
    expect(result.current.registrationError).toBe(null);
  });

  it('should handle registration errors', async () => {
    const error = new Error('Registration failed');
    mockDeviceDiscoveryContext.actions.registerDevice.mockRejectedValue(error);

    const { result } = renderHook(() => useDeviceRegistration());

    await act(async () => {
      try {
        await result.current.register();
      } catch (err) {
        // Expected to throw
      }
    });

    expect(result.current.registrationError).toBe('Registration failed');
    expect(result.current.isRegistering).toBe(false);
  });

  it('should not register if already registered', async () => {
    mockDeviceDiscoveryContext.state.isRegistered = true;
    mockDeviceDiscoveryContext.state.currentDevice = { id: 'device-123' } as any;

    const { result } = renderHook(() => useDeviceRegistration());

    await act(async () => {
      const device = await result.current.register();
      expect(device).toEqual(mockDeviceDiscoveryContext.state.currentDevice);
    });

    expect(mockDeviceDiscoveryContext.actions.registerDevice).not.toHaveBeenCalled();
  });
});

describe('useDeviceList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeviceDiscoveryContext.state.discoveredDevices = [
      {
        id: 'device-1',
        name: 'MacBook Pro',
        type: 'desktop',
        platform: 'macos',
        presence: 'online',
        lastSeen: '2024-01-01T10:00:00Z',
      },
      {
        id: 'device-2',
        name: 'iPhone 14',
        type: 'mobile',
        platform: 'ios',
        presence: 'idle',
        lastSeen: '2024-01-01T09:00:00Z',
      },
      {
        id: 'device-3',
        name: 'iPad Pro',
        type: 'tablet',
        platform: 'ios',
        presence: 'offline',
        lastSeen: '2024-01-01T08:00:00Z',
      },
    ] as any[];
  });

  it('should filter devices by search term', () => {
    const { result } = renderHook(() => useDeviceList({
      search: 'MacBook',
    }));

    expect(result.current.allDevices).toHaveLength(1);
    expect(result.current.allDevices[0].name).toBe('MacBook Pro');
  });

  it('should filter devices by custom filter', () => {
    const { result } = renderHook(() => useDeviceList({
      filter: (device) => device.platform === 'ios',
    }));

    expect(result.current.allDevices).toHaveLength(2);
    expect(result.current.allDevices.every(d => d.platform === 'ios')).toBe(true);
  });

  it('should sort devices by name', () => {
    const { result } = renderHook(() => useDeviceList({
      sortBy: 'name',
      sortOrder: 'asc',
    }));

    expect(result.current.allDevices[0].name).toBe('iPad Pro');
    expect(result.current.allDevices[1].name).toBe('iPhone 14');
    expect(result.current.allDevices[2].name).toBe('MacBook Pro');
  });

  it('should sort devices by presence', () => {
    const { result } = renderHook(() => useDeviceList({
      sortBy: 'presence',
      sortOrder: 'asc',
    }));

    expect(result.current.allDevices[0].presence).toBe('online');
    expect(result.current.allDevices[1].presence).toBe('idle');
    expect(result.current.allDevices[2].presence).toBe('offline');
  });

  it('should separate online and offline devices', () => {
    const { result } = renderHook(() => useDeviceList());

    expect(result.current.onlineDevices).toHaveLength(1);
    expect(result.current.onlineDevices[0].presence).toBe('online');

    expect(result.current.offlineDevices).toHaveLength(1);
    expect(result.current.offlineDevices[0].presence).toBe('offline');
  });

  it('should provide device counts', () => {
    mockDeviceDiscoveryContext.state.totalDevicesCount = 5;
    mockDeviceDiscoveryContext.state.onlineDevicesCount = 2;

    const { result } = renderHook(() => useDeviceList());

    expect(result.current.deviceCount).toEqual({
      total: 5,
      online: 2,
      filtered: 3, // Based on mock data
    });
  });
});

describe('useDeviceCompatibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeviceDiscoveryContext.state.discoveredDevices = [
      {
        id: 'device-1',
        name: 'MacBook Pro',
        capabilities: {
          hasCamera: true,
          hasMicrophone: true,
          supportsVideo: true,
          supportsScreenShare: true,
          supportsWebRTC: true,
        },
      },
      {
        id: 'device-2',
        name: 'Old Phone',
        capabilities: {
          hasCamera: false,
          hasMicrophone: true,
          supportsVideo: false,
          supportsScreenShare: false,
          supportsWebRTC: false,
        },
      },
    ] as any[];
  });

  it('should filter compatible devices', () => {
    const requiredCapabilities = {
      hasCamera: true,
      supportsVideo: true,
    };

    const { result } = renderHook(() => useDeviceCompatibility(requiredCapabilities));

    expect(result.current.compatibleDevices).toHaveLength(1);
    expect(result.current.compatibleDevices[0].name).toBe('MacBook Pro');
  });

  it('should check individual device compatibility', () => {
    const requiredCapabilities = {
      hasCamera: true,
      supportsVideo: true,
    };

    const { result } = renderHook(() => useDeviceCompatibility(requiredCapabilities));

    const macbook = mockDeviceDiscoveryContext.state.discoveredDevices[0];
    const oldPhone = mockDeviceDiscoveryContext.state.discoveredDevices[1];

    expect(result.current.isDeviceCompatible(macbook)).toBe(true);
    expect(result.current.isDeviceCompatible(oldPhone)).toBe(false);
  });

  it('should return all devices when no requirements', () => {
    const { result } = renderHook(() => useDeviceCompatibility());

    expect(result.current.compatibleDevices).toHaveLength(2);
  });

  it('should provide capability matrix', () => {
    const requiredCapabilities = { hasCamera: true };

    const { result } = renderHook(() => useDeviceCompatibility(requiredCapabilities));

    expect(result.current.capabilityMatrix).toHaveLength(2);
    expect(result.current.capabilityMatrix[0].isCompatible).toBe(true);
    expect(result.current.capabilityMatrix[1].isCompatible).toBe(false);
  });
});

describe('useCallHandoff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeviceDiscoveryContext.state.activeHandoffs = new Map();
    mockDeviceDiscoveryContext.state.handoffSuggestions = [];
  });

  it('should initiate call handoff', async () => {
    const mockCallState = {
      callId: 'call-123',
      channelId: 'channel-456',
    } as any;

    const { result } = renderHook(() => useCallHandoff());

    await act(async () => {
      await result.current.initiateHandoff('target-device', mockCallState);
    });

    expect(mockDeviceDiscoveryContext.actions.initiateCallHandoff).toHaveBeenCalledWith(
      'target-device',
      mockCallState
    );
    expect(result.current.isInitiating).toBe(false);
    expect(result.current.handoffError).toBe(null);
  });

  it('should handle handoff initiation errors', async () => {
    const error = new Error('Handoff failed');
    mockDeviceDiscoveryContext.actions.initiateCallHandoff.mockRejectedValue(error);

    const { result } = renderHook(() => useCallHandoff());

    await act(async () => {
      try {
        await result.current.initiateHandoff('target-device', {} as any);
      } catch (err) {
        // Expected to throw
      }
    });

    expect(result.current.handoffError).toBe('Handoff failed');
    expect(result.current.isInitiating).toBe(false);
  });

  it('should accept call handoff', async () => {
    const mockHandoffManager = {
      sourceDeviceId: 'source',
      targetDeviceId: 'target',
      status: 'completed',
    } as any;

    mockDeviceDiscoveryContext.actions.acceptCallHandoff.mockResolvedValue(mockHandoffManager);

    const { result } = renderHook(() => useCallHandoff());

    await act(async () => {
      const handoff = await result.current.acceptHandoff('handoff-123');
      expect(handoff).toEqual(mockHandoffManager);
    });

    expect(mockDeviceDiscoveryContext.actions.acceptCallHandoff).toHaveBeenCalledWith('handoff-123');
  });

  it('should clear handoff error', () => {
    const { result } = renderHook(() => useCallHandoff());

    act(() => {
      result.current.clearHandoffError();
    });

    expect(result.current.handoffError).toBe(null);
  });
});

describe('useDevicePresence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeviceDiscoveryContext.state.currentDevice = {
      id: 'current-device',
      presence: 'online',
      lastSeen: '2024-01-01T10:00:00Z',
      batteryLevel: 85,
      networkType: 'wifi',
      isCurrentDevice: true,
    } as any;

    mockDeviceDiscoveryContext.state.discoveredDevices = [
      {
        id: 'other-device',
        presence: 'idle',
        lastSeen: '2024-01-01T09:00:00Z',
        batteryLevel: 45,
        networkType: 'cellular',
        isCurrentDevice: false,
      },
    ] as any[];
  });

  it('should return current device when no deviceId specified', () => {
    const { result } = renderHook(() => useDevicePresence());

    expect(result.current.device).toEqual(mockDeviceDiscoveryContext.state.currentDevice);
    expect(result.current.isCurrentDevice).toBe(true);
    expect(result.current.presenceInfo?.isOnline).toBe(true);
  });

  it('should return specific device when deviceId specified', () => {
    const { result } = renderHook(() => useDevicePresence('other-device'));

    expect(result.current.device).toEqual(mockDeviceDiscoveryContext.state.discoveredDevices[0]);
    expect(result.current.isCurrentDevice).toBe(false);
    expect(result.current.presenceInfo?.isOnline).toBe(false);
  });

  it('should calculate minutes since last seen', () => {
    const now = new Date('2024-01-01T10:05:00Z');
    jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

    const { result } = renderHook(() => useDevicePresence('other-device'));

    expect(result.current.presenceInfo?.minutesSinceLastSeen).toBe(65); // 1 hour 5 minutes
  });

  it('should handle device not found', () => {
    const { result } = renderHook(() => useDevicePresence('nonexistent-device'));

    expect(result.current.device).toBe(undefined);
    expect(result.current.presenceInfo).toBe(null);
    expect(result.current.isCurrentDevice).toBe(false);
  });
});

describe('useDeviceSyncPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeviceDiscoveryContext.state.syncPreferences = {
      autoHandoff: true,
      handoffConfirmation: false,
      preferredDeviceOrder: ['device-1', 'device-2'],
      syncCallHistory: true,
      syncContactList: true,
      notifyOnHandoffAvailable: true,
    };
  });

  it('should update sync preferences', async () => {
    const { result } = renderHook(() => useDeviceSyncPreferences());

    const updates = { autoHandoff: false, handoffConfirmation: true };

    await act(async () => {
      await result.current.updatePreferences(updates);
    });

    expect(mockDeviceDiscoveryContext.actions.updateSyncPreferences).toHaveBeenCalledWith(updates);
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.updateError).toBe(null);
  });

  it('should handle update errors', async () => {
    const error = new Error('Update failed');
    mockDeviceDiscoveryContext.actions.updateSyncPreferences.mockRejectedValue(error);

    const { result } = renderHook(() => useDeviceSyncPreferences());

    await act(async () => {
      try {
        await result.current.updatePreferences({ autoHandoff: false });
      } catch (err) {
        // Expected to throw
      }
    });

    expect(result.current.updateError).toBe('Update failed');
    expect(result.current.isUpdating).toBe(false);
  });

  it('should clear update error', () => {
    const { result } = renderHook(() => useDeviceSyncPreferences());

    act(() => {
      result.current.clearUpdateError();
    });

    expect(result.current.updateError).toBe(null);
  });
});

describe('useDeviceDiscoveryPolling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should poll device discovery at specified interval', async () => {
    const { result } = renderHook(() => useDeviceDiscoveryPolling({
      interval: 5000,
      enabled: true,
    }));

    // Initial poll should happen immediately
    expect(mockDeviceDiscoveryContext.actions.discoverDevices).toHaveBeenCalledTimes(1);

    // Advance timer and check if poll happens again
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(mockDeviceDiscoveryContext.actions.discoverDevices).toHaveBeenCalledTimes(2);
  });

  it('should not poll when disabled', () => {
    renderHook(() => useDeviceDiscoveryPolling({
      enabled: false,
    }));

    expect(mockDeviceDiscoveryContext.actions.discoverDevices).not.toHaveBeenCalled();
  });

  it('should allow manual polling', async () => {
    const { result } = renderHook(() => useDeviceDiscoveryPolling({
      enabled: false,
    }));

    await act(async () => {
      await result.current.poll();
    });

    expect(mockDeviceDiscoveryContext.actions.discoverDevices).toHaveBeenCalledTimes(1);
  });

  it('should update last poll time', async () => {
    const mockDate = new Date('2024-01-01T10:00:00Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

    const { result } = renderHook(() => useDeviceDiscoveryPolling({
      enabled: false,
    }));

    await act(async () => {
      await result.current.poll();
    });

    expect(result.current.lastPollTime).toEqual(mockDate);
  });
});