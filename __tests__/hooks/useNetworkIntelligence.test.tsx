/**
 * Network Intelligence Hooks Tests - NET-001
 * Tests for React hooks that provide network intelligence functionality
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-hooks';
import {
  useNetworkIntelligence,
  useNetworkQuality,
  useVoiceOptimization,
  useNetworkTransitions,
  type UseNetworkIntelligenceOptions,
} from '../../lib/hooks/useNetworkIntelligence';
import {
  getNetworkIntelligenceEngine,
  resetNetworkIntelligenceEngine,
} from '../../lib/services/networkIntelligence';
import {
  VOICE_QUALITY_PROFILES,
  DEFAULT_NETWORK_INTELLIGENCE_CONFIG,
  type NetworkTransitionEvent,
  type NetworkConditions,
  type NetworkQualityScore,
} from '../../lib/types/networkIntelligence';

// Mock react-native dependencies
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
}));

const mockNetInfo = require('@react-native-community/netinfo');

// Mock platform network monitor
const mockPlatformMonitor = {
  measureLatency: jest.fn(),
  estimateBandwidth: jest.fn(),
  getCellularInfo: jest.fn(),
  getWiFiInfo: jest.fn(),
  getCarrierInfo: jest.fn(),
  getNetworkCapabilities: jest.fn(),
};
jest.mock('../../lib/services/platformNetworkMonitor', () => ({
  getPlatformNetworkMonitor: () => mockPlatformMonitor,
}));

// Mock global fetch
global.fetch = jest.fn();

describe('useNetworkIntelligence Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

    // Reset singleton before each test
    resetNetworkIntelligenceEngine();

    // Setup default mocks
    mockNetInfo.fetch.mockResolvedValue({
      type: 'wifi',
      isConnected: true,
      details: {
        ssid: 'TestWiFi',
        strength: -50,
        ipAddress: '192.168.1.100',
      },
    });

    mockPlatformMonitor.measureLatency.mockResolvedValue(50);
    mockPlatformMonitor.estimateBandwidth.mockResolvedValue({ up: 50000, down: 100000 });
    mockPlatformMonitor.getWiFiInfo.mockResolvedValue({
      ssid: 'TestWiFi',
      rssi: -50,
      frequency: 2400,
    });
    mockPlatformMonitor.getCellularInfo.mockResolvedValue(null);

    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic Functionality', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useNetworkIntelligence());

      expect(result.current.conditions).toBeNull();
      expect(result.current.qualityScore).toBeNull();
      expect(result.current.voiceProfile).toBeNull();
      expect(result.current.analytics).toBeNull();
      expect(result.current.isRunning).toBe(false);
      expect(result.current.isInitializing).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should start engine automatically by default', async () => {
      const { result } = renderHook(() => useNetworkIntelligence());

      expect(result.current.isInitializing).toBe(true);

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(result.current.isRunning).toBe(true);
      expect(result.current.isInitializing).toBe(false);
    });

    it('should not start engine when disabled', () => {
      const { result } = renderHook(() =>
        useNetworkIntelligence({ enabled: false })
      );

      expect(result.current.isRunning).toBe(false);
      expect(result.current.isInitializing).toBe(false);
    });

    it('should use custom configuration', async () => {
      const customConfig = {
        monitoringIntervalMs: 2000,
        qualityAssessmentIntervalMs: 8000,
      };

      const { result } = renderHook(() =>
        useNetworkIntelligence({ config: customConfig })
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      // Verify engine is using custom config
      const engine = getNetworkIntelligenceEngine();
      const engineConfig = engine.getConfig();

      expect(engineConfig.monitoringIntervalMs).toBe(2000);
      expect(engineConfig.qualityAssessmentIntervalMs).toBe(8000);
    });
  });

  describe('Network Conditions Updates', () => {
    it('should update conditions when engine reports changes', async () => {
      const mockOnConditionsChange = jest.fn();

      const { result } = renderHook(() =>
        useNetworkIntelligence({
          onConditionsChange: mockOnConditionsChange,
        })
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      // Advance timers to trigger network monitoring
      await act(async () => {
        jest.advanceTimersByTime(DEFAULT_NETWORK_INTELLIGENCE_CONFIG.monitoringIntervalMs);
        await jest.runAllTimersAsync();
      });

      expect(result.current.conditions).toBeDefined();
      expect(result.current.conditions?.type).toBe('wifi');
      expect(mockOnConditionsChange).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'wifi' })
      );
    });

    it('should provide convenience getters for network state', async () => {
      const { result } = renderHook(() => useNetworkIntelligence());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await act(async () => {
        jest.advanceTimersByTime(DEFAULT_NETWORK_INTELLIGENCE_CONFIG.monitoringIntervalMs);
        await jest.runAllTimersAsync();
      });

      expect(result.current.networkType).toBe('wifi');
      expect(result.current.isWiFi).toBe(true);
      expect(result.current.isCellular).toBe(false);
      expect(result.current.signalStrength).toBeGreaterThan(0);
    });

    it('should detect cellular connections correctly', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        type: 'cellular',
        isConnected: true,
        details: {
          cellularGeneration: '4G',
          carrierName: 'TestCarrier',
        },
      });

      mockPlatformMonitor.getCellularInfo.mockResolvedValue({
        generation: '4G',
        technology: '4G',
        signalStrength: 75,
        signalBars: 4,
        isRoaming: false,
        networkOperator: 'TestCarrier',
      });
      mockPlatformMonitor.getWiFiInfo.mockResolvedValue(null);

      const { result } = renderHook(() => useNetworkIntelligence());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await act(async () => {
        jest.advanceTimersByTime(DEFAULT_NETWORK_INTELLIGENCE_CONFIG.monitoringIntervalMs);
        await jest.runAllTimersAsync();
      });

      expect(result.current.networkType).toBe('cellular');
      expect(result.current.isCellular).toBe(true);
      expect(result.current.isWiFi).toBe(false);
    });
  });

  describe('Quality Score Updates', () => {
    it('should update quality scores and voice profiles', async () => {
      const mockOnQualityUpdate = jest.fn();
      const mockOnProfileChange = jest.fn();

      const { result } = renderHook(() =>
        useNetworkIntelligence({
          onQualityUpdate: mockOnQualityUpdate,
          onProfileChange: mockOnProfileChange,
        })
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      // Trigger quality assessment
      await act(async () => {
        jest.advanceTimersByTime(DEFAULT_NETWORK_INTELLIGENCE_CONFIG.qualityAssessmentIntervalMs);
        await jest.runAllTimersAsync();
      });

      expect(result.current.qualityScore).toBeDefined();
      expect(result.current.qualityScore?.overall).toBeGreaterThan(0);
      expect(result.current.voiceProfile).toBeDefined();
      expect(result.current.overallQuality).toBeGreaterThan(0);
      expect(result.current.qualityLevel).toBeDefined();

      expect(mockOnQualityUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ overall: expect.any(Number) })
      );
      expect(mockOnProfileChange).toHaveBeenCalledWith(
        expect.objectContaining({ profileName: expect.any(String) })
      );
    });

    it('should determine optimal quality correctly', async () => {
      // Mock excellent conditions
      mockPlatformMonitor.measureLatency.mockResolvedValue(25);
      mockPlatformMonitor.estimateBandwidth.mockResolvedValue({ up: 100000, down: 200000 });

      const { result } = renderHook(() => useNetworkIntelligence());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await act(async () => {
        jest.advanceTimersByTime(DEFAULT_NETWORK_INTELLIGENCE_CONFIG.qualityAssessmentIntervalMs);
        await jest.runAllTimersAsync();
      });

      expect(result.current.isOptimalQuality).toBe(true);
      expect(result.current.overallQuality).toBeGreaterThanOrEqual(85);
    });
  });

  describe('Network Transitions', () => {
    it('should detect and report network transitions', async () => {
      const mockOnTransition = jest.fn();

      const { result } = renderHook(() =>
        useNetworkIntelligence({
          onTransitionDetected: mockOnTransition,
        })
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      // Start with WiFi, then switch to cellular
      mockNetInfo.fetch.mockResolvedValue({
        type: 'cellular',
        isConnected: true,
        details: {
          cellularGeneration: '4G',
          carrierName: 'TestCarrier',
        },
      });

      mockPlatformMonitor.getCellularInfo.mockResolvedValue({
        generation: '4G',
        technology: '4G',
        signalStrength: 75,
        signalBars: 4,
        isRoaming: false,
        networkOperator: 'TestCarrier',
      });
      mockPlatformMonitor.getWiFiInfo.mockResolvedValue(null);

      await act(async () => {
        jest.advanceTimersByTime(DEFAULT_NETWORK_INTELLIGENCE_CONFIG.monitoringIntervalMs);
        await jest.runAllTimersAsync();
      });

      expect(mockOnTransition).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'wifi_to_cellular',
          from: expect.objectContaining({ type: 'wifi' }),
          to: expect.objectContaining({ type: 'cellular' }),
        })
      );
    });
  });

  describe('Control Functions', () => {
    it('should start and stop engine manually', async () => {
      const { result } = renderHook(() =>
        useNetworkIntelligence({ enabled: false })
      );

      expect(result.current.isRunning).toBe(false);

      await act(async () => {
        await result.current.start();
        await jest.runAllTimersAsync();
      });

      expect(result.current.isRunning).toBe(true);

      act(() => {
        result.current.stop();
      });

      expect(result.current.isRunning).toBe(false);
    });

    it('should refresh network conditions manually', async () => {
      const { result } = renderHook(() => useNetworkIntelligence());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      const initialConditions = result.current.conditions;

      // Change network state
      mockPlatformMonitor.measureLatency.mockResolvedValue(100);

      await act(async () => {
        await result.current.refresh();
      });

      // Should have updated conditions
      expect(result.current.conditions).toBeDefined();
    });

    it('should handle refresh when engine not running', async () => {
      const { result } = renderHook(() =>
        useNetworkIntelligence({ enabled: false })
      );

      await act(async () => {
        await result.current.refresh();
      });

      // Should not throw error
      expect(result.current.conditions).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle engine start errors gracefully', async () => {
      mockNetInfo.fetch.mockRejectedValue(new Error('Network unavailable'));

      const { result } = renderHook(() => useNetworkIntelligence());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.isRunning).toBe(false);
      expect(result.current.isInitializing).toBe(false);
    });

    it('should recover from temporary errors', async () => {
      // Start with error
      mockNetInfo.fetch.mockRejectedValueOnce(new Error('Network unavailable'));

      const { result } = renderHook(() => useNetworkIntelligence());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(result.current.error).toBeDefined();

      // Fix the error
      mockNetInfo.fetch.mockResolvedValue({
        type: 'wifi',
        isConnected: true,
        details: { ssid: 'TestWiFi' },
      });

      // Restart
      await act(async () => {
        await result.current.start();
        await jest.runAllTimersAsync();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isRunning).toBe(true);
    });
  });

  describe('Component Unmount Cleanup', () => {
    it('should clean up event listeners on unmount', async () => {
      const { result, unmount } = renderHook(() => useNetworkIntelligence());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      const engine = getNetworkIntelligenceEngine();
      const removeListenerSpy = jest.spyOn(engine, 'removeEventListener');

      unmount();

      expect(removeListenerSpy).toHaveBeenCalled();
    });

    it('should stop engine if running on unmount', async () => {
      const { result, unmount } = renderHook(() => useNetworkIntelligence());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(result.current.isRunning).toBe(true);

      const engine = getNetworkIntelligenceEngine();
      const stopSpy = jest.spyOn(engine, 'removeEventListener');

      unmount();

      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('Re-render Optimization', () => {
    it('should not restart engine unnecessarily on re-renders', async () => {
      const { result, rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) =>
          useNetworkIntelligence({ enabled }),
        { initialProps: { enabled: true } }
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(result.current.isRunning).toBe(true);

      // Re-render with same enabled state
      rerender({ enabled: true });

      expect(result.current.isRunning).toBe(true);
      // Engine should still be running without restart
    });

    it('should restart engine when enabled state changes', async () => {
      const { result, rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) =>
          useNetworkIntelligence({ enabled }),
        { initialProps: { enabled: false } }
      );

      expect(result.current.isRunning).toBe(false);

      // Enable the engine
      rerender({ enabled: true });

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(result.current.isRunning).toBe(true);

      // Disable the engine
      rerender({ enabled: false });

      expect(result.current.isRunning).toBe(false);
    });
  });
});

describe('useNetworkQuality Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetNetworkIntelligenceEngine();

    // Setup basic mocks
    mockNetInfo.fetch.mockResolvedValue({
      type: 'wifi',
      isConnected: true,
      details: { ssid: 'TestWiFi' },
    });

    mockPlatformMonitor.measureLatency.mockResolvedValue(50);
    mockPlatformMonitor.estimateBandwidth.mockResolvedValue({ up: 50000, down: 100000 });
  });

  it('should provide simplified quality information', async () => {
    const { result } = renderHook(() => useNetworkQuality());

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    await act(async () => {
      jest.advanceTimersByTime(DEFAULT_NETWORK_INTELLIGENCE_CONFIG.qualityAssessmentIntervalMs);
      await jest.runAllTimersAsync();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.quality).toBeGreaterThan(0);
    expect(result.current.level).toBeDefined();
    expect(typeof result.current.isOptimal).toBe('boolean');
  });
});

describe('useVoiceOptimization Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetNetworkIntelligenceEngine();

    // Setup basic mocks
    mockNetInfo.fetch.mockResolvedValue({
      type: 'wifi',
      isConnected: true,
      details: { ssid: 'TestWiFi' },
    });

    mockPlatformMonitor.measureLatency.mockResolvedValue(50);
    mockPlatformMonitor.estimateBandwidth.mockResolvedValue({ up: 50000, down: 100000 });
  });

  it('should provide voice optimization profile information', async () => {
    const { result } = renderHook(() => useVoiceOptimization());

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    await act(async () => {
      jest.advanceTimersByTime(DEFAULT_NETWORK_INTELLIGENCE_CONFIG.qualityAssessmentIntervalMs);
      await jest.runAllTimersAsync();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.profile).toBeDefined();
    expect(result.current.codec).toBeDefined();
    expect(result.current.bitrate).toBeGreaterThan(0);
    expect(result.current.profileName).toBeDefined();
  });
});

describe('useNetworkTransitions Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetNetworkIntelligenceEngine();

    // Setup basic mocks
    mockNetInfo.fetch.mockResolvedValue({
      type: 'wifi',
      isConnected: true,
      details: { ssid: 'TestWiFi' },
    });

    mockPlatformMonitor.measureLatency.mockResolvedValue(50);
    mockPlatformMonitor.estimateBandwidth.mockResolvedValue({ up: 50000, down: 100000 });
  });

  it('should track network transitions', async () => {
    const mockOnTransition = jest.fn();
    const { result } = renderHook(() =>
      useNetworkTransitions(mockOnTransition)
    );

    expect(result.current.lastTransition).toBeNull();
    expect(result.current.transitionCount).toBe(0);

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    // Trigger a network transition
    mockNetInfo.fetch.mockResolvedValue({
      type: 'cellular',
      isConnected: true,
      details: {
        cellularGeneration: '4G',
      },
    });

    mockPlatformMonitor.getCellularInfo.mockResolvedValue({
      generation: '4G',
      technology: '4G',
      signalStrength: 75,
      signalBars: 4,
      isRoaming: false,
    });
    mockPlatformMonitor.getWiFiInfo.mockResolvedValue(null);

    await act(async () => {
      jest.advanceTimersByTime(DEFAULT_NETWORK_INTELLIGENCE_CONFIG.monitoringIntervalMs);
      await jest.runAllTimersAsync();
    });

    expect(mockOnTransition).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'wifi_to_cellular',
      })
    );
    expect(result.current.lastTransition).toBeDefined();
    expect(result.current.transitionCount).toBeGreaterThan(0);
  });
});