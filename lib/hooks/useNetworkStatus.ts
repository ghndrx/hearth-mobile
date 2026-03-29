/**
 * Network Status Hook (Enhanced for NET-001)
 * Monitors network connectivity with advanced intelligence analysis
 */

import { useState, useEffect, useCallback, useRef } from "react";
import NetInfo, {
  type NetInfoState,
  type NetInfoSubscription,
} from "@react-native-community/netinfo";
import type { NetworkStatus } from "../types/offline";
import type {
  NetworkConditions,
  NetworkQuality,
  VoiceOptimizationProfile,
  VoiceProfiles,
  NetworkIntelligenceConfig,
} from "../types/network";
import { getNetworkIntelligenceEngine } from "../services/networkIntelligence";

// ============================================================================
// Enhanced Hook Options and Results
// ============================================================================

interface UseNetworkStatusOptions {
  /** Poll interval in milliseconds (0 to disable polling) */
  pollInterval?: number;
  /** Callback when connectivity changes */
  onConnectivityChange?: (isConnected: boolean) => void;
  /** Enable advanced network intelligence */
  enableIntelligence?: boolean;
  /** Network intelligence configuration */
  intelligenceConfig?: Partial<NetworkIntelligenceConfig>;
  /** Callback when network conditions change */
  onNetworkConditionsChange?: (conditions: NetworkConditions) => void;
  /** Callback when voice profile changes */
  onVoiceProfileChange?: (profile: keyof typeof VoiceProfiles, reason: string) => void;
}

interface UseNetworkStatusResult extends NetworkStatus {
  /** Force refresh network status */
  refresh: () => Promise<void>;
  /** Whether a refresh is in progress */
  isRefreshing: boolean;

  // Enhanced intelligence features
  /** Detailed network conditions (if intelligence enabled) */
  conditions: NetworkConditions | null;
  /** Network quality assessment (if intelligence enabled) */
  quality: NetworkQuality | null;
  /** Current optimal voice profile (if intelligence enabled) */
  voiceProfile: VoiceOptimizationProfile | null;
  /** Current voice profile key */
  voiceProfileKey: keyof typeof VoiceProfiles | null;
  /** Whether network intelligence is active */
  isIntelligenceActive: boolean;
  /** Start network intelligence monitoring */
  startIntelligence: () => Promise<void>;
  /** Stop network intelligence monitoring */
  stopIntelligence: () => void;
}

/**
 * Enhanced hook to monitor network connectivity with intelligence analysis
 * Uses NetInfo for real-time updates with optional NetworkIntelligenceEngine
 */
export function useNetworkStatus(
  options: UseNetworkStatusOptions = {}
): UseNetworkStatusResult {
  const {
    pollInterval = 0,
    onConnectivityChange,
    enableIntelligence = false,
    intelligenceConfig,
    onNetworkConditionsChange,
    onVoiceProfileChange,
  } = options;

  // Basic network status state
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true, // Optimistic default
    type: null,
    isMetered: false,
    lastChecked: Date.now(),
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Enhanced intelligence state
  const [conditions, setConditions] = useState<NetworkConditions | null>(null);
  const [quality, setQuality] = useState<NetworkQuality | null>(null);
  const [voiceProfile, setVoiceProfile] = useState<VoiceOptimizationProfile | null>(null);
  const [voiceProfileKey, setVoiceProfileKey] = useState<keyof typeof VoiceProfiles | null>(null);
  const [isIntelligenceActive, setIsIntelligenceActive] = useState(false);

  // Refs for callback stability
  const wasConnectedRef = useRef<boolean | null>(null);
  const onConnectivityChangeRef = useRef(onConnectivityChange);
  const onNetworkConditionsChangeRef = useRef(onNetworkConditionsChange);
  const onVoiceProfileChangeRef = useRef(onVoiceProfileChange);
  const intelligenceEngineRef = useRef<ReturnType<typeof getNetworkIntelligenceEngine> | null>(null);

  // Update refs
  onConnectivityChangeRef.current = onConnectivityChange;
  onNetworkConditionsChangeRef.current = onNetworkConditionsChange;
  onVoiceProfileChangeRef.current = onVoiceProfileChange;

  // ============================================================================
  // Basic Network Monitoring (Legacy)
  // ============================================================================

  // Parse NetInfo state into our NetworkStatus format
  const parseNetInfoState = useCallback((state: NetInfoState): NetworkStatus => {
    return {
      isConnected: state.isConnected ?? false,
      type: state.type,
      isMetered: state.details?.isConnectionExpensive ?? false,
      lastChecked: Date.now(),
    };
  }, []);

  // Refresh network status
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const state = await NetInfo.fetch();
      const newStatus = parseNetInfoState(state);
      setStatus(newStatus);

      // Notify on connectivity change
      if (
        wasConnectedRef.current !== null &&
        wasConnectedRef.current !== newStatus.isConnected
      ) {
        onConnectivityChangeRef.current?.(newStatus.isConnected);
      }
      wasConnectedRef.current = newStatus.isConnected;

      // Also refresh intelligence engine if active
      if (isIntelligenceActive && intelligenceEngineRef.current) {
        await intelligenceEngineRef.current.refreshAnalysis();
      }
    } catch (error) {
      console.error("[useNetworkStatus] Failed to fetch network state:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [parseNetInfoState, isIntelligenceActive]);

  // Subscribe to basic network state changes
  useEffect(() => {
    let subscription: NetInfoSubscription | null = null;

    const handleStateChange = (state: NetInfoState) => {
      const newStatus = parseNetInfoState(state);
      setStatus(newStatus);

      // Notify on connectivity change
      if (
        wasConnectedRef.current !== null &&
        wasConnectedRef.current !== newStatus.isConnected
      ) {
        onConnectivityChangeRef.current?.(newStatus.isConnected);
      }
      wasConnectedRef.current = newStatus.isConnected;
    };

    // Initial fetch
    NetInfo.fetch().then((state) => {
      const initialStatus = parseNetInfoState(state);
      setStatus(initialStatus);
      wasConnectedRef.current = initialStatus.isConnected;
    });

    // Subscribe to changes
    subscription = NetInfo.addEventListener(handleStateChange);

    return () => {
      subscription?.();
    };
  }, [parseNetInfoState]);

  // Optional polling for extra reliability
  useEffect(() => {
    if (pollInterval <= 0) return;

    const intervalId = setInterval(refresh, pollInterval);
    return () => clearInterval(intervalId);
  }, [pollInterval, refresh]);

  // ============================================================================
  // Network Intelligence Engine Integration
  // ============================================================================

  const startIntelligence = useCallback(async () => {
    if (isIntelligenceActive) {
      return;
    }

    try {
      // Initialize intelligence engine
      intelligenceEngineRef.current = getNetworkIntelligenceEngine(intelligenceConfig);
      const engine = intelligenceEngineRef.current;

      // Set up event listeners
      engine.addEventListener('networkChange', (newConditions: NetworkConditions) => {
        setConditions(newConditions);
        onNetworkConditionsChangeRef.current?.(newConditions);

        // Update quality assessment
        const newQuality = engine.getNetworkQuality();
        setQuality(newQuality);

        // Update voice profile
        const newVoiceProfile = engine.getOptimalVoiceProfile();
        const newVoiceProfileKey = engine.getCurrentProfile();
        setVoiceProfile(newVoiceProfile);
        setVoiceProfileKey(newVoiceProfileKey);
      });

      engine.addEventListener('profileChange', (profile: keyof typeof VoiceProfiles, reason: string) => {
        const newVoiceProfile = engine.getOptimalVoiceProfile();
        setVoiceProfile(newVoiceProfile);
        setVoiceProfileKey(profile);
        onVoiceProfileChangeRef.current?.(profile, reason);
      });

      // Start monitoring
      await engine.startMonitoring();
      setIsIntelligenceActive(true);

      console.log('[useNetworkStatus] Network intelligence started');
    } catch (error) {
      console.error('[useNetworkStatus] Failed to start intelligence:', error);
    }
  }, [isIntelligenceActive, intelligenceConfig]);

  const stopIntelligence = useCallback(() => {
    if (!isIntelligenceActive || !intelligenceEngineRef.current) {
      return;
    }

    try {
      intelligenceEngineRef.current.stopMonitoring();
      intelligenceEngineRef.current = null;
      setIsIntelligenceActive(false);

      // Clear intelligence state
      setConditions(null);
      setQuality(null);
      setVoiceProfile(null);
      setVoiceProfileKey(null);

      console.log('[useNetworkStatus] Network intelligence stopped');
    } catch (error) {
      console.error('[useNetworkStatus] Failed to stop intelligence:', error);
    }
  }, [isIntelligenceActive]);

  // Auto-start intelligence if enabled
  useEffect(() => {
    if (enableIntelligence && !isIntelligenceActive) {
      startIntelligence();
    }

    return () => {
      if (isIntelligenceActive) {
        stopIntelligence();
      }
    };
  }, [enableIntelligence, isIntelligenceActive, startIntelligence, stopIntelligence]);

  // ============================================================================
  // Return Enhanced Result
  // ============================================================================

  return {
    // Basic status (legacy compatibility)
    ...status,
    refresh,
    isRefreshing,

    // Enhanced intelligence features
    conditions,
    quality,
    voiceProfile,
    voiceProfileKey,
    isIntelligenceActive,
    startIntelligence,
    stopIntelligence,
  };
}

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Simple hook to get just the connection status
 * Lighter weight for components that only need boolean
 */
export function useIsOnline(): boolean {
  const { isConnected } = useNetworkStatus();
  return isConnected;
}

/**
 * Hook specifically for network intelligence features
 * Automatically enables intelligence monitoring
 */
export function useNetworkIntelligence(
  config?: Partial<NetworkIntelligenceConfig>
): {
  conditions: NetworkConditions | null;
  quality: NetworkQuality | null;
  voiceProfile: VoiceOptimizationProfile | null;
  voiceProfileKey: keyof typeof VoiceProfiles | null;
  isActive: boolean;
} {
  const {
    conditions,
    quality,
    voiceProfile,
    voiceProfileKey,
    isIntelligenceActive
  } = useNetworkStatus({
    enableIntelligence: true,
    intelligenceConfig: config,
  });

  return {
    conditions,
    quality,
    voiceProfile,
    voiceProfileKey,
    isActive: isIntelligenceActive,
  };
}

export default useNetworkStatus;
