/**
 * Network Intelligence Engine Tests - NET-001
 * Comprehensive tests for real-time network condition analysis and voice optimization
 */

import {
  NetworkIntelligenceEngine,
  getNetworkIntelligenceEngine,
  resetNetworkIntelligenceEngine,
  type NetworkIntelligenceEventListener,
} from '../../lib/services/networkIntelligence';
import {
  VOICE_QUALITY_PROFILES,
  DEFAULT_NETWORK_INTELLIGENCE_CONFIG,
  type NetworkConditions,
  type NetworkQualityScore,
  type VoiceOptimizationProfile,
  type NetworkTransitionEvent,
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

// Mock global fetch for latency measurements
global.fetch = jest.fn();

describe('NetworkIntelligenceEngine', () => {
  let engine: NetworkIntelligenceEngine;
  let mockEventListener: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

    // Reset singleton
    resetNetworkIntelligenceEngine();

    // Create fresh engine instance
    engine = new NetworkIntelligenceEngine();
    mockEventListener = jest.fn();

    // Setup default mocks
    mockNetInfo.fetch.mockResolvedValue({
      type: 'wifi',
      isConnected: true,
      details: {
        ssid: 'TestWiFi',
        strength: -50,
        ipAddress: '192.168.1.100',
        frequency: 2400,
      },
    });

    mockPlatformMonitor.measureLatency.mockResolvedValue(50);
    mockPlatformMonitor.estimateBandwidth.mockResolvedValue({ up: 50000, down: 100000 });
    mockPlatformMonitor.getWiFiInfo.mockResolvedValue({
      ssid: 'TestWiFi',
      rssi: -50,
      frequency: 2400,
      ipAddress: '192.168.1.100',
    });
    mockPlatformMonitor.getCellularInfo.mockResolvedValue(null);

    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    if (engine) {
      engine.stop();
    }
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const config = engine.getConfig();
      expect(config).toEqual(DEFAULT_NETWORK_INTELLIGENCE_CONFIG);
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        enabled: false,
        monitoringIntervalMs: 2000,
        trackDataUsage: false,
      };

      const customEngine = new NetworkIntelligenceEngine(customConfig);
      const config = customEngine.getConfig();

      expect(config.enabled).toBe(false);
      expect(config.monitoringIntervalMs).toBe(2000);
      expect(config.trackDataUsage).toBe(false);
      expect(config.qualityAssessmentIntervalMs).toBe(DEFAULT_NETWORK_INTELLIGENCE_CONFIG.qualityAssessmentIntervalMs);
    });

    it('should initialize analytics properly', () => {
      const analytics = engine.getAnalytics();

      expect(analytics).toBeDefined();
      expect(analytics.dataUsage.cellular).toBe(0);
      expect(analytics.dataUsage.wifi).toBe(0);
      expect(analytics.voiceMetrics.activeCodec).toBe('opus');
      expect(analytics.session.transitionCount).toBe(0);
      expect(analytics.session.startTime).toBeGreaterThan(0);
    });
  });

  describe('Engine Lifecycle', () => {
    it('should start engine successfully', async () => {
      engine.addEventListener(mockEventListener);

      await engine.start();

      // Advance timers to trigger initial network check
      await jest.advanceTimersByTimeAsync(100);

      expect(mockNetInfo.fetch).toHaveBeenCalled();
      expect(mockPlatformMonitor.measureLatency).toHaveBeenCalled();
      expect(mockPlatformMonitor.estimateBandwidth).toHaveBeenCalled();
      expect(mockEventListener).toHaveBeenCalledWith('conditions_changed', expect.any(Object));
    });

    it('should not start if disabled', async () => {
      const disabledEngine = new NetworkIntelligenceEngine({ enabled: false });

      await disabledEngine.start();

      expect(mockNetInfo.fetch).not.toHaveBeenCalled();
    });

    it('should stop engine cleanly', async () => {
      await engine.start();

      engine.stop();

      // Engine should not trigger more network checks after stopping
      jest.advanceTimersByTime(DEFAULT_NETWORK_INTELLIGENCE_CONFIG.monitoringIntervalMs * 2);

      const initialCallCount = mockNetInfo.fetch.mock.calls.length;
      jest.advanceTimersByTime(DEFAULT_NETWORK_INTELLIGENCE_CONFIG.monitoringIntervalMs);

      expect(mockNetInfo.fetch.mock.calls.length).toBe(initialCallCount);
    });

    it('should handle start errors gracefully', async () => {
      mockNetInfo.fetch.mockRejectedValue(new Error('Network error'));

      await expect(engine.start()).resolves.not.toThrow();
    });
  });

  describe('Network Analysis', () => {
    beforeEach(async () => {
      engine.addEventListener(mockEventListener);
      await engine.start();
      await jest.advanceTimersByTimeAsync(100);
    });

    it('should analyze WiFi conditions correctly', async () => {
      const conditions = engine.getCurrentConditions();

      expect(conditions).toBeDefined();
      expect(conditions!.type).toBe('wifi');
      expect(conditions!.latency).toBe(50);
      expect(conditions!.bandwidth.up).toBe(50000);
      expect(conditions!.bandwidth.down).toBe(100000);
      expect(conditions!.wifi).toBeDefined();
      expect(conditions!.wifi!.ssid).toBe('TestWiFi');
      expect(conditions!.wifi!.rssi).toBe(-50);
    });

    it('should analyze cellular conditions correctly', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        type: 'cellular',
        isConnected: true,
        details: {
          cellularGeneration: '4G',
          carrierName: 'TestCarrier',
          isRoaming: false,
          strength: 75,
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

      // Trigger network update
      await jest.advanceTimersByTimeAsync(DEFAULT_NETWORK_INTELLIGENCE_CONFIG.monitoringIntervalMs);

      const conditions = engine.getCurrentConditions();

      expect(conditions!.type).toBe('cellular');
      expect(conditions!.cellular).toBeDefined();
      expect(conditions!.cellular!.generation).toBe('4G');
      expect(conditions!.cellular!.signalBars).toBe(4);
      expect(conditions!.cellular!.isRoaming).toBe(false);
      expect(conditions!.cellular!.carrier).toBe('TestCarrier');
    });

    it('should calculate quality scores correctly', async () => {
      // Advance timers to trigger quality assessment
      await jest.advanceTimersByTimeAsync(DEFAULT_NETWORK_INTELLIGENCE_CONFIG.qualityAssessmentIntervalMs);

      const qualityScore = engine.getCurrentQualityScore();

      expect(qualityScore).toBeDefined();
      expect(qualityScore!.overall).toBeGreaterThan(0);
      expect(qualityScore!.overall).toBeLessThanOrEqual(100);
      expect(qualityScore!.components.strength).toBeGreaterThan(0);
      expect(qualityScore!.components.latency).toBeGreaterThan(0);
      expect(qualityScore!.components.bandwidth).toBeGreaterThan(0);
      expect(qualityScore!.components.stability).toBeGreaterThan(0);
      expect(['PREMIUM', 'STANDARD', 'EFFICIENT', 'SURVIVAL']).toContain(qualityScore!.recommendedProfile);
      expect(['excellent', 'good', 'fair', 'poor', 'very_poor']).toContain(qualityScore!.level);
    });

    it('should select appropriate voice profiles based on network quality', async () => {
      // Test with excellent conditions
      mockPlatformMonitor.measureLatency.mockResolvedValue(30);
      mockPlatformMonitor.estimateBandwidth.mockResolvedValue({ up: 100000, down: 200000 });

      await jest.advanceTimersByTimeAsync(DEFAULT_NETWORK_INTELLIGENCE_CONFIG.qualityAssessmentIntervalMs);

      let profile = engine.getCurrentProfile();
      expect(profile?.profileName).toBe('Premium');

      // Test with poor conditions
      mockPlatformMonitor.measureLatency.mockResolvedValue(300);
      mockPlatformMonitor.estimateBandwidth.mockResolvedValue({ up: 64, down: 128 });

      await jest.advanceTimersByTimeAsync(DEFAULT_NETWORK_INTELLIGENCE_CONFIG.qualityAssessmentIntervalMs);

      profile = engine.getCurrentProfile();
      expect(['Survival', 'Efficient']).toContain(profile?.profileName);
    });

    it('should handle data-limited connections appropriately', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        type: 'cellular',
        isConnected: true,
        details: {
          cellularGeneration: '4G',
          isConnectionExpensive: true,
          carrierName: 'TestCarrier',
        },
      });

      await jest.advanceTimersByTimeAsync(DEFAULT_NETWORK_INTELLIGENCE_CONFIG.monitoringIntervalMs);

      const conditions = engine.getCurrentConditions();
      expect(conditions!.dataLimited).toBe(true);
    });
  });

  describe('Network Transitions', () => {
    beforeEach(async () => {
      engine.addEventListener(mockEventListener);
      await engine.start();
      await jest.advanceTimersByTimeAsync(100);
    });

    it('should detect WiFi to cellular transition', async () => {
      // Start with WiFi
      expect(engine.getCurrentConditions()!.type).toBe('wifi');

      // Switch to cellular
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

      await jest.advanceTimersByTimeAsync(DEFAULT_NETWORK_INTELLIGENCE_CONFIG.monitoringIntervalMs);

      expect(mockEventListener).toHaveBeenCalledWith(
        'transition_detected',
        expect.objectContaining({
          type: 'wifi_to_cellular',
          from: expect.objectContaining({ type: 'wifi' }),
          to: expect.objectContaining({ type: 'cellular' }),
        })
      );
    });

    it('should detect cellular to WiFi transition', async () => {
      // Start with cellular
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

      await jest.advanceTimersByTimeAsync(DEFAULT_NETWORK_INTELLIGENCE_CONFIG.monitoringIntervalMs);

      // Switch to WiFi
      mockNetInfo.fetch.mockResolvedValue({
        type: 'wifi',
        isConnected: true,
        details: {
          ssid: 'TestWiFi',
          strength: -50,
        },
      });
      mockPlatformMonitor.getCellularInfo.mockResolvedValue(null);
      mockPlatformMonitor.getWiFiInfo.mockResolvedValue({
        ssid: 'TestWiFi',
        rssi: -50,
        frequency: 2400,
      });

      await jest.advanceTimersByTimeAsync(DEFAULT_NETWORK_INTELLIGENCE_CONFIG.monitoringIntervalMs);

      expect(mockEventListener).toHaveBeenCalledWith(
        'transition_detected',
        expect.objectContaining({
          type: 'cellular_to_wifi',
          from: expect.objectContaining({ type: 'cellular' }),
          to: expect.objectContaining({ type: 'wifi' }),
        })
      );
    });

    it('should detect weak signal conditions', async () => {
      // Change to weak signal
      mockPlatformMonitor.getWiFiInfo.mockResolvedValue({
        ssid: 'TestWiFi',
        rssi: -90, // Very weak signal
        frequency: 2400,
      });

      await jest.advanceTimersByTimeAsync(DEFAULT_NETWORK_INTELLIGENCE_CONFIG.monitoringIntervalMs);

      expect(mockEventListener).toHaveBeenCalledWith(
        'transition_detected',
        expect.objectContaining({
          type: 'weak_signal',
        })
      );
    });

    it('should update transition count in analytics', async () => {
      // Trigger a transition
      mockNetInfo.fetch.mockResolvedValue({
        type: 'cellular',
        isConnected: true,
        details: {
          cellularGeneration: '4G',
        },
      });

      await jest.advanceTimersByTimeAsync(DEFAULT_NETWORK_INTELLIGENCE_CONFIG.monitoringIntervalMs);

      const analytics = engine.getAnalytics();
      expect(analytics.session.transitionCount).toBeGreaterThan(0);
    });
  });

  describe('Event System', () => {
    it('should add and remove event listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      engine.addEventListener(listener1);
      engine.addEventListener(listener2);

      engine.removeEventListener(listener1);

      // Trigger an event by starting the engine
      engine.start();

      // Only listener2 should be called
      expect(listener1).not.toHaveBeenCalled();
    });

    it('should handle event listener errors gracefully', async () => {
      const faultyListener = jest.fn(() => {
        throw new Error('Listener error');
      });

      engine.addEventListener(faultyListener);
      engine.addEventListener(mockEventListener);

      await engine.start();
      await jest.advanceTimersByTimeAsync(100);

      // Should not prevent other listeners from being called
      expect(mockEventListener).toHaveBeenCalled();
    });

    it('should emit all expected event types', async () => {
      engine.addEventListener(mockEventListener);

      await engine.start();

      // Allow time for all events to fire
      await jest.advanceTimersByTimeAsync(DEFAULT_NETWORK_INTELLIGENCE_CONFIG.qualityAssessmentIntervalMs);

      const eventTypes = mockEventListener.mock.calls.map(call => call[0]);

      expect(eventTypes).toContain('conditions_changed');
      expect(eventTypes).toContain('quality_updated');
      expect(eventTypes).toContain('analytics_updated');
    });
  });

  describe('Error Handling', () => {
    it('should handle NetInfo fetch errors gracefully', async () => {
      mockNetInfo.fetch.mockRejectedValue(new Error('Network unavailable'));

      await expect(engine.start()).resolves.not.toThrow();
    });

    it('should handle platform monitor errors gracefully', async () => {
      mockPlatformMonitor.measureLatency.mockRejectedValue(new Error('Latency measurement failed'));
      mockPlatformMonitor.estimateBandwidth.mockRejectedValue(new Error('Bandwidth estimation failed'));

      engine.addEventListener(mockEventListener);

      await engine.start();
      await jest.advanceTimersByTimeAsync(100);

      // Should still emit events with fallback values
      expect(mockEventListener).toHaveBeenCalledWith('conditions_changed', expect.any(Object));
    });

    it('should handle fetch errors in latency measurement', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Fetch failed'));

      engine.addEventListener(mockEventListener);

      await engine.start();
      await jest.advanceTimersByTimeAsync(100);

      const conditions = engine.getCurrentConditions();
      expect(conditions!.latency).toBe(999); // Fallback high latency
    });
  });

  describe('Analytics Updates', () => {
    beforeEach(async () => {
      engine.addEventListener(mockEventListener);
      await engine.start();
      await jest.advanceTimersByTimeAsync(100);
    });

    it('should update battery impact based on voice profile complexity', async () => {
      // Trigger quality assessment to set a profile
      await jest.advanceTimersByTimeAsync(DEFAULT_NETWORK_INTELLIGENCE_CONFIG.qualityAssessmentIntervalMs);

      const analytics = engine.getAnalytics();
      const profile = engine.getCurrentProfile();

      if (profile) {
        expect(analytics.batteryImpact.processingComplexity).toBe(profile.complexity);
      }
    });

    it('should track session duration correctly', async () => {
      const initialAnalytics = engine.getAnalytics();
      const startTime = initialAnalytics.session.startTime;

      // Advance time significantly
      await jest.advanceTimersByTimeAsync(60000); // 1 minute

      const currentTime = Date.now();
      expect(currentTime - startTime).toBeGreaterThanOrEqual(60000);
    });

    it('should update average quality over time', async () => {
      // Trigger multiple quality assessments
      await jest.advanceTimersByTimeAsync(DEFAULT_NETWORK_INTELLIGENCE_CONFIG.qualityAssessmentIntervalMs * 3);

      const analytics = engine.getAnalytics();
      expect(analytics.session.averageQuality).toBeGreaterThan(0);
      expect(analytics.session.averageQuality).toBeLessThanOrEqual(100);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance from getNetworkIntelligenceEngine', () => {
      const instance1 = getNetworkIntelligenceEngine();
      const instance2 = getNetworkIntelligenceEngine();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = getNetworkIntelligenceEngine();

      resetNetworkIntelligenceEngine();

      const instance2 = getNetworkIntelligenceEngine();

      expect(instance1).not.toBe(instance2);
    });

    it('should pass config to singleton instance', () => {
      const customConfig = { monitoringIntervalMs: 5000 };
      const instance = getNetworkIntelligenceEngine(customConfig);

      expect(instance.getConfig().monitoringIntervalMs).toBe(5000);
    });
  });

  describe('Voice Quality Profiles', () => {
    it('should have all required voice quality profiles', () => {
      expect(VOICE_QUALITY_PROFILES.PREMIUM).toBeDefined();
      expect(VOICE_QUALITY_PROFILES.STANDARD).toBeDefined();
      expect(VOICE_QUALITY_PROFILES.EFFICIENT).toBeDefined();
      expect(VOICE_QUALITY_PROFILES.SURVIVAL).toBeDefined();
    });

    it('should have correct profile characteristics', () => {
      expect(VOICE_QUALITY_PROFILES.PREMIUM.bitrate).toBeGreaterThan(VOICE_QUALITY_PROFILES.STANDARD.bitrate);
      expect(VOICE_QUALITY_PROFILES.STANDARD.bitrate).toBeGreaterThan(VOICE_QUALITY_PROFILES.EFFICIENT.bitrate);
      expect(VOICE_QUALITY_PROFILES.EFFICIENT.bitrate).toBeGreaterThan(VOICE_QUALITY_PROFILES.SURVIVAL.bitrate);
    });

    it('should not switch profiles unnecessarily', async () => {
      engine.addEventListener(mockEventListener);
      await engine.start();

      // Trigger initial quality assessment
      await jest.advanceTimersByTimeAsync(DEFAULT_NETWORK_INTELLIGENCE_CONFIG.qualityAssessmentIntervalMs);

      const initialProfile = engine.getCurrentProfile();
      const profileChangeCallsBefore = mockEventListener.mock.calls.filter(call => call[0] === 'profile_changed').length;

      // Trigger another assessment with same conditions
      await jest.advanceTimersByTimeAsync(DEFAULT_NETWORK_INTELLIGENCE_CONFIG.qualityAssessmentIntervalMs);

      const profileChangeCallsAfter = mockEventListener.mock.calls.filter(call => call[0] === 'profile_changed').length;

      // Profile should not change if conditions are similar
      expect(profileChangeCallsAfter).toBe(profileChangeCallsBefore);
    });
  });
});