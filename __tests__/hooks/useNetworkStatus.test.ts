/**
 * Tests for Enhanced useNetworkStatus Hook (NET-001)
 *
 * Tests the React hook for network monitoring with intelligence analysis
 * for the Network Intelligence Engine implementation.
 */

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(),
}));

jest.mock('../../lib/services/networkIntelligence', () => ({
  getNetworkIntelligenceEngine: jest.fn(),
}));

import { renderHook, act } from '@testing-library/react-hooks';
import NetInfo from '@react-native-community/netinfo';
import {
  useNetworkStatus,
  useIsOnline,
  useNetworkIntelligence,
} from '../../lib/hooks/useNetworkStatus';
import { getNetworkIntelligenceEngine } from '../../lib/services/networkIntelligence';
import { VoiceProfiles } from '../../lib/types/network';
import type { NetInfoState } from '@react-native-community/netinfo';

const mockNetInfo = jest.mocked(NetInfo);
const mockGetNetworkIntelligenceEngine = jest.mocked(getNetworkIntelligenceEngine);

// Mock NetworkIntelligenceEngine
const mockNetworkEngine = {
  startMonitoring: jest.fn(),
  stopMonitoring: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  getCurrentConditions: jest.fn(),
  getNetworkQuality: jest.fn(),
  getOptimalVoiceProfile: jest.fn(),
  getCurrentProfile: jest.fn(),
  refreshAnalysis: jest.fn(),
};

describe('useNetworkStatus Hook (Enhanced)', () => {
  const mockWifiState: NetInfoState = {
    type: 'wifi',
    isConnected: true,
    details: {
      isConnectionExpensive: false,
      ssid: 'TestWiFi',
    },
  };

  const mockCellularState: NetInfoState = {
    type: 'cellular',
    isConnected: true,
    details: {
      isConnectionExpensive: true,
      cellularGeneration: '4g',
    },
  };

  const mockDisconnectedState: NetInfoState = {
    type: 'none',
    isConnected: false,
    details: null,
  };

  const mockNetworkConditions = {
    type: 'wifi' as const,
    strength: 85,
    latency: 45,
    bandwidth: { up: 1000, down: 5000 },
    stability: 90,
    dataLimited: false,
    timestamp: Date.now(),
  };

  const mockNetworkQuality = {
    score: 90,
    category: 'excellent' as const,
    components: {
      bandwidth: 90,
      latency: 85,
      stability: 90,
      strength: 85,
    },
    recommendedProfile: 'PREMIUM' as keyof typeof VoiceProfiles,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

    // Setup default mocks
    mockNetInfo.fetch.mockResolvedValue(mockWifiState);
    mockNetInfo.addEventListener.mockReturnValue(() => {});

    mockGetNetworkIntelligenceEngine.mockReturnValue(mockNetworkEngine);

    mockNetworkEngine.startMonitoring.mockResolvedValue(undefined);
    mockNetworkEngine.stopMonitoring.mockReturnValue(undefined);
    mockNetworkEngine.getCurrentConditions.mockReturnValue(mockNetworkConditions);
    mockNetworkEngine.getNetworkQuality.mockReturnValue(mockNetworkQuality);
    mockNetworkEngine.getOptimalVoiceProfile.mockReturnValue(VoiceProfiles.PREMIUM);
    mockNetworkEngine.getCurrentProfile.mockReturnValue('PREMIUM');
    mockNetworkEngine.refreshAnalysis.mockResolvedValue(mockNetworkConditions);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('basic functionality (legacy compatibility)', () => {
    it('should return initial network status', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useNetworkStatus());

      await act(async () => {
        await waitForNextUpdate();
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.type).toBe('wifi');
      expect(result.current.isMetered).toBe(false);
    });

    it('should update when network state changes', async () => {
      const mockListener = jest.fn();
      mockNetInfo.addEventListener.mockImplementation((callback) => {
        mockListener.mockImplementation(callback);
        return () => {};
      });

      const { result, waitForNextUpdate } = renderHook(() => useNetworkStatus());

      await act(async () => {
        await waitForNextUpdate();
      });

      // Simulate network change
      act(() => {
        mockListener(mockCellularState);
      });

      expect(result.current.type).toBe('cellular');
      expect(result.current.isMetered).toBe(true);
    });

    it('should handle disconnected state', async () => {
      mockNetInfo.fetch.mockResolvedValue(mockDisconnectedState);

      const { result, waitForNextUpdate } = renderHook(() => useNetworkStatus());

      await act(async () => {
        await waitForNextUpdate();
      });

      expect(result.current.isConnected).toBe(false);
    });

    it('should refresh network status manually', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useNetworkStatus());

      await act(async () => {
        await waitForNextUpdate();
      });

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockNetInfo.fetch).toHaveBeenCalledTimes(2); // Initial + refresh
    });
  });

  describe('network intelligence integration', () => {
    it('should start intelligence monitoring when enabled', async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        useNetworkStatus({ enableIntelligence: true })
      );

      await act(async () => {
        await waitForNextUpdate();
      });

      expect(mockGetNetworkIntelligenceEngine).toHaveBeenCalled();
      expect(mockNetworkEngine.startMonitoring).toHaveBeenCalled();
      expect(result.current.isIntelligenceActive).toBe(true);
    });

    it('should not start intelligence when disabled', async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        useNetworkStatus({ enableIntelligence: false })
      );

      await act(async () => {
        await waitForNextUpdate();
      });

      expect(result.current.isIntelligenceActive).toBe(false);
    });

    it('should provide enhanced network data when intelligence is active', async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        useNetworkStatus({ enableIntelligence: true })
      );

      await act(async () => {
        await waitForNextUpdate();
      });

      expect(result.current.conditions).toEqual(mockNetworkConditions);
      expect(result.current.quality).toEqual(mockNetworkQuality);
      expect(result.current.voiceProfile).toEqual(VoiceProfiles.PREMIUM);
      expect(result.current.voiceProfileKey).toBe('PREMIUM');
    });

    it('should handle network conditions change events', async () => {
      const onNetworkConditionsChange = jest.fn();
      let networkChangeCallback: any;

      mockNetworkEngine.addEventListener.mockImplementation((event, callback) => {
        if (event === 'networkChange') {
          networkChangeCallback = callback;
        }
      });

      const { waitForNextUpdate } = renderHook(() =>
        useNetworkStatus({
          enableIntelligence: true,
          onNetworkConditionsChange,
        })
      );

      await act(async () => {
        await waitForNextUpdate();
      });

      // Simulate network conditions change
      act(() => {
        networkChangeCallback(mockNetworkConditions);
      });

      expect(onNetworkConditionsChange).toHaveBeenCalledWith(mockNetworkConditions);
    });

    it('should handle voice profile change events', async () => {
      const onVoiceProfileChange = jest.fn();
      let profileChangeCallback: any;

      mockNetworkEngine.addEventListener.mockImplementation((event, callback) => {
        if (event === 'profileChange') {
          profileChangeCallback = callback;
        }
      });

      const { waitForNextUpdate } = renderHook(() =>
        useNetworkStatus({
          enableIntelligence: true,
          onVoiceProfileChange,
        })
      );

      await act(async () => {
        await waitForNextUpdate();
      });

      // Simulate profile change
      act(() => {
        profileChangeCallback('STANDARD', 'network_change');
      });

      expect(onVoiceProfileChange).toHaveBeenCalledWith('STANDARD', 'network_change');
    });

    it('should stop intelligence monitoring on unmount', async () => {
      const { unmount, waitForNextUpdate } = renderHook(() =>
        useNetworkStatus({ enableIntelligence: true })
      );

      await act(async () => {
        await waitForNextUpdate();
      });

      unmount();

      expect(mockNetworkEngine.stopMonitoring).toHaveBeenCalled();
    });

    it('should manually start and stop intelligence', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useNetworkStatus());

      await act(async () => {
        await waitForNextUpdate();
      });

      // Start intelligence
      await act(async () => {
        await result.current.startIntelligence();
      });

      expect(result.current.isIntelligenceActive).toBe(true);
      expect(mockNetworkEngine.startMonitoring).toHaveBeenCalled();

      // Stop intelligence
      act(() => {
        result.current.stopIntelligence();
      });

      expect(result.current.isIntelligenceActive).toBe(false);
      expect(mockNetworkEngine.stopMonitoring).toHaveBeenCalled();
    });
  });

  describe('polling functionality', () => {
    it('should poll network status at specified interval', async () => {
      const { waitForNextUpdate } = renderHook(() =>
        useNetworkStatus({ pollInterval: 1000 })
      );

      await act(async () => {
        await waitForNextUpdate();
      });

      const initialCalls = mockNetInfo.fetch.mock.calls.length;

      // Fast forward 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockNetInfo.fetch.mock.calls.length).toBeGreaterThan(initialCalls);
    });

    it('should not poll when interval is 0', async () => {
      const { waitForNextUpdate } = renderHook(() =>
        useNetworkStatus({ pollInterval: 0 })
      );

      await act(async () => {
        await waitForNextUpdate();
      });

      const initialCalls = mockNetInfo.fetch.mock.calls.length;

      // Fast forward 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(mockNetInfo.fetch.mock.calls.length).toBe(initialCalls);
    });
  });

  describe('connectivity change callbacks', () => {
    it('should call onConnectivityChange when connection status changes', async () => {
      const onConnectivityChange = jest.fn();
      let mockListener: any;

      mockNetInfo.addEventListener.mockImplementation((callback) => {
        mockListener = callback;
        return () => {};
      });

      const { waitForNextUpdate } = renderHook(() =>
        useNetworkStatus({ onConnectivityChange })
      );

      await act(async () => {
        await waitForNextUpdate();
      });

      // Simulate disconnect
      act(() => {
        mockListener(mockDisconnectedState);
      });

      expect(onConnectivityChange).toHaveBeenCalledWith(false);

      // Simulate reconnect
      act(() => {
        mockListener(mockWifiState);
      });

      expect(onConnectivityChange).toHaveBeenCalledWith(true);
    });
  });

  describe('error handling', () => {
    it('should handle NetInfo fetch errors gracefully', async () => {
      mockNetInfo.fetch.mockRejectedValue(new Error('Network error'));

      const { result, waitForNextUpdate } = renderHook(() => useNetworkStatus());

      await act(async () => {
        await waitForNextUpdate();
      });

      // Should not crash and should maintain some state
      expect(result.current).toBeDefined();
    });

    it('should handle intelligence engine startup errors', async () => {
      mockNetworkEngine.startMonitoring.mockRejectedValue(new Error('Engine error'));

      const { result, waitForNextUpdate } = renderHook(() =>
        useNetworkStatus({ enableIntelligence: true })
      );

      await act(async () => {
        await waitForNextUpdate();
      });

      // Should not crash
      expect(result.current).toBeDefined();
    });
  });

  describe('refresh with intelligence integration', () => {
    it('should refresh intelligence engine when active', async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        useNetworkStatus({ enableIntelligence: true })
      );

      await act(async () => {
        await waitForNextUpdate();
      });

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockNetworkEngine.refreshAnalysis).toHaveBeenCalled();
    });
  });
});

describe('useIsOnline Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetInfo.fetch.mockResolvedValue(mockWifiState);
    mockNetInfo.addEventListener.mockReturnValue(() => {});
  });

  it('should return connection status', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useIsOnline());

    await act(async () => {
      await waitForNextUpdate();
    });

    expect(result.current).toBe(true);
  });

  it('should update when connection changes', async () => {
    let mockListener: any;
    mockNetInfo.addEventListener.mockImplementation((callback) => {
      mockListener = callback;
      return () => {};
    });

    const { result, waitForNextUpdate } = renderHook(() => useIsOnline());

    await act(async () => {
      await waitForNextUpdate();
    });

    // Simulate disconnect
    act(() => {
      mockListener(mockDisconnectedState);
    });

    expect(result.current).toBe(false);
  });
});

describe('useNetworkIntelligence Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetInfo.fetch.mockResolvedValue(mockWifiState);
    mockNetInfo.addEventListener.mockReturnValue(() => {});
    mockGetNetworkIntelligenceEngine.mockReturnValue(mockNetworkEngine);
    mockNetworkEngine.getCurrentConditions.mockReturnValue(mockNetworkConditions);
    mockNetworkEngine.getNetworkQuality.mockReturnValue(mockNetworkQuality);
    mockNetworkEngine.getOptimalVoiceProfile.mockReturnValue(VoiceProfiles.PREMIUM);
    mockNetworkEngine.getCurrentProfile.mockReturnValue('PREMIUM');
  });

  it('should automatically enable intelligence monitoring', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useNetworkIntelligence());

    await act(async () => {
      await waitForNextUpdate();
    });

    expect(result.current.isActive).toBe(true);
    expect(result.current.conditions).toEqual(mockNetworkConditions);
    expect(result.current.quality).toEqual(mockNetworkQuality);
    expect(result.current.voiceProfile).toEqual(VoiceProfiles.PREMIUM);
    expect(result.current.voiceProfileKey).toBe('PREMIUM');
  });

  it('should accept custom configuration', async () => {
    const config = {
      monitoringInterval: 1000,
      voiceOptimization: {
        autoSwitch: false,
      },
    };

    const { waitForNextUpdate } = renderHook(() => useNetworkIntelligence(config));

    await act(async () => {
      await waitForNextUpdate();
    });

    expect(mockGetNetworkIntelligenceEngine).toHaveBeenCalledWith(
      expect.objectContaining({
        intelligenceConfig: config,
      })
    );
  });
});