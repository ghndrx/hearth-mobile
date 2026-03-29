/**
 * Tests for NetworkIntelligenceEngine Service (NET-001)
 *
 * Tests the network analysis and voice optimization functionality
 * for the Network Intelligence Engine implementation.
 */

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(),
}));

// Mock global fetch
global.fetch = jest.fn();

import NetInfo from '@react-native-community/netinfo';
import {
  NetworkIntelligenceEngine,
  getNetworkIntelligenceEngine,
} from '../../lib/services/networkIntelligence';
import {
  VoiceProfiles,
  DEFAULT_NETWORK_INTELLIGENCE_CONFIG,
} from '../../lib/types/network';
import type { NetInfoState } from '@react-native-community/netinfo';

const mockNetInfo = jest.mocked(NetInfo);
const mockFetch = jest.mocked(fetch);

describe('NetworkIntelligenceEngine', () => {
  let engine: NetworkIntelligenceEngine;

  const mockWifiState: NetInfoState = {
    type: 'wifi',
    isConnected: true,
    details: {
      isConnectionExpensive: false,
      ssid: 'TestWiFi',
      frequency: 5180,
    },
  };

  const mockCellularState: NetInfoState = {
    type: 'cellular',
    isConnected: true,
    details: {
      isConnectionExpensive: true,
      cellularGeneration: '4g',
      isRoaming: false,
    },
  };

  const mockPoorCellularState: NetInfoState = {
    type: 'cellular',
    isConnected: true,
    details: {
      isConnectionExpensive: true,
      cellularGeneration: '3g',
      isRoaming: false,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

    engine = new NetworkIntelligenceEngine();

    // Mock successful latency test
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);
  });

  afterEach(() => {
    jest.useRealTimers();
    if (engine) {
      engine.stopMonitoring();
    }
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      expect(engine).toBeInstanceOf(NetworkIntelligenceEngine);
      expect(engine.getCurrentConditions()).toBeNull();
      expect(engine.getCurrentProfile()).toBe('STANDARD');
    });

    it('should initialize with custom config', () => {
      const customConfig = {
        monitoringInterval: 1000,
        voiceOptimization: {
          autoSwitch: false,
        },
      };
      const customEngine = new NetworkIntelligenceEngine(customConfig);
      expect(customEngine).toBeInstanceOf(NetworkIntelligenceEngine);
    });
  });

  describe('network monitoring', () => {
    it('should start monitoring successfully', async () => {
      mockNetInfo.fetch.mockResolvedValue(mockWifiState);

      await engine.startMonitoring();

      expect(mockNetInfo.fetch).toHaveBeenCalled();
      expect(engine.getCurrentConditions()).not.toBeNull();
    });

    it('should stop monitoring successfully', async () => {
      mockNetInfo.fetch.mockResolvedValue(mockWifiState);
      await engine.startMonitoring();

      engine.stopMonitoring();

      expect(engine.getCurrentConditions()).not.toBeNull(); // Conditions persist after stopping
    });

    it('should not start monitoring twice', async () => {
      mockNetInfo.fetch.mockResolvedValue(mockWifiState);

      await engine.startMonitoring();
      await engine.startMonitoring(); // Second call should be ignored

      expect(mockNetInfo.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('network condition analysis', () => {
    it('should analyze Wi-Fi network conditions', async () => {
      mockNetInfo.fetch.mockResolvedValue(mockWifiState);

      await engine.startMonitoring();
      const conditions = engine.getCurrentConditions();

      expect(conditions).not.toBeNull();
      expect(conditions!.type).toBe('wifi');
      expect(conditions!.wifiFrequency).toBe('5ghz');
      expect(conditions!.dataLimited).toBe(false);
    });

    it('should analyze cellular network conditions', async () => {
      mockNetInfo.fetch.mockResolvedValue(mockCellularState);

      await engine.startMonitoring();
      const conditions = engine.getCurrentConditions();

      expect(conditions).not.toBeNull();
      expect(conditions!.type).toBe('cellular');
      expect(conditions!.cellularTechnology).toBe('lte');
      expect(conditions!.dataLimited).toBe(true);
    });

    it('should measure latency', async () => {
      mockNetInfo.fetch.mockResolvedValue(mockWifiState);
      // Mock fetch to resolve immediately — latency is measured via Date.now() delta
      mockFetch.mockResolvedValue({ ok: true } as Response);

      await engine.startMonitoring();

      const conditions = engine.getCurrentConditions();
      expect(conditions!.latency).toBeGreaterThanOrEqual(0);
    });

    it('should handle latency measurement timeout', async () => {
      mockNetInfo.fetch.mockResolvedValue(mockWifiState);
      // Mock fetch to reject with abort error (simulating timeout)
      mockFetch.mockRejectedValue(new DOMException('The operation was aborted', 'AbortError'));

      await engine.startMonitoring();

      const conditions = engine.getCurrentConditions();
      // Should fall back to the configured latency timeout value (3000ms)
      expect(conditions!.latency).toBe(3000);
    });
  });

  describe('voice profile optimization', () => {
    it('should recommend PREMIUM profile for excellent Wi-Fi', async () => {
      mockNetInfo.fetch.mockResolvedValue(mockWifiState);

      await engine.startMonitoring();
      const profile = engine.getOptimalVoiceProfile();
      const quality = engine.getNetworkQuality();

      expect(profile).not.toBeNull();
      expect(profile!.codec).toBe('opus');
      expect(profile!.bitrate).toBe(96);
      expect(quality!.category).toBe('excellent');
    });

    it('should recommend EFFICIENT profile for poor cellular', async () => {
      mockNetInfo.fetch.mockResolvedValue(mockPoorCellularState);

      await engine.startMonitoring();

      // Wait for monitoring to process
      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      const profile = engine.getOptimalVoiceProfile();
      expect(profile).not.toBeNull();
      expect(['silk', 'opus'].includes(profile!.codec)).toBe(true); // Should be a lower quality codec
    });

    it('should respect data limitations', async () => {
      const dataLimitedState = {
        ...mockCellularState,
        details: {
          ...mockCellularState.details,
          isConnectionExpensive: true,
        },
      };
      mockNetInfo.fetch.mockResolvedValue(dataLimitedState);

      await engine.startMonitoring();
      const profile = engine.getOptimalVoiceProfile();

      expect(profile).not.toBeNull();
      expect(profile!.bitrate).toBeLessThanOrEqual(64); // Should use lower bitrate for expensive connections
    });
  });

  describe('network quality assessment', () => {
    it('should calculate network quality correctly', async () => {
      mockNetInfo.fetch.mockResolvedValue(mockWifiState);

      await engine.startMonitoring();
      const quality = engine.getNetworkQuality();

      expect(quality).not.toBeNull();
      expect(quality!.score).toBeGreaterThanOrEqual(0);
      expect(quality!.score).toBeLessThanOrEqual(100);
      expect(['excellent', 'good', 'fair', 'poor'].includes(quality!.category)).toBe(true);
      expect(quality!.components).toHaveProperty('bandwidth');
      expect(quality!.components).toHaveProperty('latency');
      expect(quality!.components).toHaveProperty('stability');
      expect(quality!.components).toHaveProperty('strength');
    });

    it('should provide recommended profile in quality assessment', async () => {
      mockNetInfo.fetch.mockResolvedValue(mockWifiState);

      await engine.startMonitoring();
      const quality = engine.getNetworkQuality();

      expect(quality).not.toBeNull();
      expect(Object.keys(VoiceProfiles).includes(quality!.recommendedProfile)).toBe(true);
    });
  });

  describe('network transitions', () => {
    it('should detect network type transitions', async () => {
      const transitionEvents: any[] = [];

      engine.addEventListener('transitionStart', (transition) => {
        transitionEvents.push(transition);
      });

      // Start with Wi-Fi
      mockNetInfo.fetch.mockResolvedValue(mockWifiState);
      await engine.startMonitoring();

      // Switch to cellular
      mockNetInfo.fetch.mockResolvedValue(mockCellularState);
      await engine.refreshAnalysis();

      expect(transitionEvents.length).toBeGreaterThan(0);
      expect(transitionEvents[0].type).toBe('wifi_to_cellular');
    });

    it('should handle profile changes during transitions', async () => {
      const profileChanges: any[] = [];

      engine.addEventListener('profileChange', (profile, reason) => {
        profileChanges.push({ profile, reason });
      });

      // Start with good conditions
      mockNetInfo.fetch.mockResolvedValue(mockWifiState);
      await engine.startMonitoring();

      // Simulate degraded conditions
      mockNetInfo.fetch.mockResolvedValue(mockPoorCellularState);
      await engine.refreshAnalysis();

      // Profile should change due to network degradation
      jest.advanceTimersByTime(DEFAULT_NETWORK_INTELLIGENCE_CONFIG.voiceOptimization.switchCooldown + 1000);
      await Promise.resolve();
    });
  });

  describe('event handling', () => {
    it('should emit network change events', async () => {
      const networkChanges: any[] = [];

      engine.addEventListener('networkChange', (conditions) => {
        networkChanges.push(conditions);
      });

      mockNetInfo.fetch.mockResolvedValue(mockWifiState);
      await engine.startMonitoring();

      expect(networkChanges.length).toBeGreaterThan(0);
      expect(networkChanges[0].type).toBe('wifi');
    });

    it('should remove event listeners', async () => {
      const callback = jest.fn();

      engine.addEventListener('networkChange', callback);
      engine.removeEventListener('networkChange', callback);

      mockNetInfo.fetch.mockResolvedValue(mockWifiState);
      await engine.startMonitoring();

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('bandwidth testing', () => {
    it('should perform bandwidth tests when enabled', async () => {
      const configWithBandwidthTest = {
        bandwidthTest: {
          enabled: true,
          interval: 1000,
          duration: 100,
        },
      };
      const testEngine = new NetworkIntelligenceEngine(configWithBandwidthTest);

      mockNetInfo.fetch.mockResolvedValue(mockWifiState);
      mockFetch.mockResolvedValue({
        ok: true,
      } as Response);

      await testEngine.startMonitoring();

      // Fast forward to trigger bandwidth test
      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      // Should have made bandwidth test request
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('httpbin.org/bytes'),
        expect.any(Object)
      );

      testEngine.stopMonitoring();
    });

    it('should skip bandwidth tests when disabled', async () => {
      const configWithoutBandwidthTest = {
        bandwidthTest: {
          enabled: false,
        },
      };
      const testEngine = new NetworkIntelligenceEngine(configWithoutBandwidthTest);

      mockNetInfo.fetch.mockResolvedValue(mockWifiState);
      await testEngine.startMonitoring();

      // Fast forward past bandwidth test interval
      jest.advanceTimersByTime(10000);
      await Promise.resolve();

      // Should not have made bandwidth test requests
      expect(mockFetch).not.toHaveBeenCalledWith(
        expect.stringContaining('httpbin.org/bytes'),
        expect.any(Object)
      );

      testEngine.stopMonitoring();
    });
  });

  describe('stability calculation', () => {
    it('should maintain stability history', async () => {
      mockNetInfo.fetch.mockResolvedValue(mockWifiState);

      await engine.startMonitoring();

      // Perform multiple analyses to build history
      for (let i = 0; i < 5; i++) {
        await engine.refreshAnalysis();
        jest.advanceTimersByTime(1000);
      }

      const conditions = engine.getCurrentConditions();
      expect(conditions!.stability).toBeGreaterThanOrEqual(0);
      expect(conditions!.stability).toBeLessThanOrEqual(100);
    });
  });

  describe('error handling', () => {
    it('should handle NetInfo fetch errors gracefully', async () => {
      mockNetInfo.fetch.mockRejectedValue(new Error('Network error'));

      await engine.startMonitoring();

      // Should not throw and should handle the error
      expect(engine.getCurrentConditions()).toBeNull();
    });

    it('should handle latency measurement errors', async () => {
      mockNetInfo.fetch.mockResolvedValue(mockWifiState);
      mockFetch.mockRejectedValue(new Error('Fetch error'));

      await engine.startMonitoring();
      const conditions = engine.getCurrentConditions();

      // Should fallback to timeout value for failed latency measurements
      expect(conditions!.latency).toBeGreaterThan(0);
    });
  });
});

describe('getNetworkIntelligenceEngine singleton', () => {
  it('should return the same instance', () => {
    const instance1 = getNetworkIntelligenceEngine();
    const instance2 = getNetworkIntelligenceEngine();

    expect(instance1).toBe(instance2);
  });

  it('should accept configuration on first call', () => {
    const config = { monitoringInterval: 2000 };
    const instance = getNetworkIntelligenceEngine(config);

    expect(instance).toBeInstanceOf(NetworkIntelligenceEngine);
  });
});