/**
 * Network Intelligence Hook - NET-001
 * Enhanced network monitoring with intelligent analysis and voice optimization
 * Extends useNetworkStatus with advanced features from Network Intelligence Engine
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getNetworkIntelligenceEngine, type NetworkIntelligenceEventListener } from '../services/networkIntelligence';
import type {
  NetworkConditions,
  NetworkQualityScore,
  VoiceOptimizationProfile,
  NetworkTransitionEvent,
  NetworkAnalytics,
  NetworkIntelligenceConfig,
} from '../types/networkIntelligence';

export interface UseNetworkIntelligenceOptions {
  /** Whether to enable the intelligence engine */
  enabled?: boolean;
  /** Custom configuration for the engine */
  config?: Partial<NetworkIntelligenceConfig>;
  /** Callback when network conditions change */
  onConditionsChange?: (conditions: NetworkConditions) => void;
  /** Callback when quality score updates */
  onQualityUpdate?: (score: NetworkQualityScore) => void;
  /** Callback when voice profile changes */
  onProfileChange?: (profile: VoiceOptimizationProfile) => void;
  /** Callback when network transition occurs */
  onTransitionDetected?: (event: NetworkTransitionEvent) => void;
}

export interface UseNetworkIntelligenceResult {
  /** Current network conditions */
  conditions: NetworkConditions | null;
  /** Current network quality score */
  qualityScore: NetworkQualityScore | null;
  /** Current recommended voice profile */
  voiceProfile: VoiceOptimizationProfile | null;
  /** Network analytics data */
  analytics: NetworkAnalytics | null;
  /** Whether the engine is running */
  isRunning: boolean;
  /** Whether the engine is initializing */
  isInitializing: boolean;
  /** Any error that occurred */
  error: string | null;

  // Control functions
  /** Start the intelligence engine */
  start: () => Promise<void>;
  /** Stop the intelligence engine */
  stop: () => void;
  /** Refresh current network conditions */
  refresh: () => Promise<void>;

  // Convenience getters
  /** Get current signal strength (0-100) */
  signalStrength: number;
  /** Get current network type */
  networkType: string | null;
  /** Whether on cellular data */
  isCellular: boolean;
  /** Whether on Wi-Fi */
  isWiFi: boolean;
  /** Whether connection is metered/data-limited */
  isDataLimited: boolean;
  /** Current overall quality score (0-100) */
  overallQuality: number;
  /** Quality level description */
  qualityLevel: string | null;
  /** Whether voice quality is optimal */
  isOptimalQuality: boolean;
}

/**
 * Hook for advanced network intelligence and voice optimization
 * Integrates with NET-001 Network Intelligence Engine
 */
export function useNetworkIntelligence(
  options: UseNetworkIntelligenceOptions = {}
): UseNetworkIntelligenceResult {
  const {
    enabled = true,
    config,
    onConditionsChange,
    onQualityUpdate,
    onProfileChange,
    onTransitionDetected,
  } = options;

  // State
  const [conditions, setConditions] = useState<NetworkConditions | null>(null);
  const [qualityScore, setQualityScore] = useState<NetworkQualityScore | null>(null);
  const [voiceProfile, setVoiceProfile] = useState<VoiceOptimizationProfile | null>(null);
  const [analytics, setAnalytics] = useState<NetworkAnalytics | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs to avoid stale closures in callbacks
  const onConditionsChangeRef = useRef(onConditionsChange);
  const onQualityUpdateRef = useRef(onQualityUpdate);
  const onProfileChangeRef = useRef(onProfileChange);
  const onTransitionDetectedRef = useRef(onTransitionDetected);

  // Update refs when callbacks change
  onConditionsChangeRef.current = onConditionsChange;
  onQualityUpdateRef.current = onQualityUpdate;
  onProfileChangeRef.current = onProfileChange;
  onTransitionDetectedRef.current = onTransitionDetected;

  // Get engine instance
  const engine = getNetworkIntelligenceEngine(config);

  // Event listener for engine events
  const eventListener: NetworkIntelligenceEventListener = useCallback((eventType, data) => {
    switch (eventType) {
      case 'conditions_changed':
        setConditions(data);
        onConditionsChangeRef.current?.(data);
        break;

      case 'quality_updated':
        setQualityScore(data);
        onQualityUpdateRef.current?.(data);
        break;

      case 'profile_changed':
        setVoiceProfile(data.to);
        onProfileChangeRef.current?.(data.to);
        break;

      case 'transition_detected':
        onTransitionDetectedRef.current?.(data);
        break;

      case 'analytics_updated':
        setAnalytics(data);
        break;

      default:
        console.debug(`[useNetworkIntelligence] Unhandled event: ${eventType}`);
    }
  }, []);

  // Start the engine
  const start = useCallback(async () => {
    if (!enabled) {
      console.log('[useNetworkIntelligence] Intelligence engine is disabled');
      return;
    }

    if (isRunning || isInitializing) {
      console.log('[useNetworkIntelligence] Engine already running or initializing');
      return;
    }

    try {
      setIsInitializing(true);
      setError(null);

      // Add our event listener
      engine.addEventListener(eventListener);

      // Get initial state if available
      setConditions(engine.getCurrentConditions());
      setQualityScore(engine.getCurrentQualityScore());
      setVoiceProfile(engine.getCurrentProfile());
      setAnalytics(engine.getAnalytics());

      // Start the engine
      await engine.start();

      setIsRunning(true);
      setIsInitializing(false);

      console.log('[useNetworkIntelligence] Engine started successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start network intelligence engine';
      setError(errorMessage);
      setIsInitializing(false);
      console.error('[useNetworkIntelligence] Failed to start engine:', err);
    }
  }, [enabled, isRunning, isInitializing, engine, eventListener]);

  // Stop the engine
  const stop = useCallback(() => {
    try {
      // Remove our event listener
      engine.removeEventListener(eventListener);

      // Stop the engine
      engine.stop();

      setIsRunning(false);
      setError(null);

      console.log('[useNetworkIntelligence] Engine stopped');
    } catch (err) {
      console.error('[useNetworkIntelligence] Error stopping engine:', err);
    }
  }, [engine, eventListener]);

  // Refresh network conditions
  const refresh = useCallback(async () => {
    if (!isRunning) {
      console.warn('[useNetworkIntelligence] Cannot refresh - engine not running');
      return;
    }

    // The engine continuously monitors, so we just get current state
    setConditions(engine.getCurrentConditions());
    setQualityScore(engine.getCurrentQualityScore());
    setVoiceProfile(engine.getCurrentProfile());
    setAnalytics(engine.getAnalytics());
  }, [isRunning, engine]);

  // Auto-start/stop engine based on enabled flag
  useEffect(() => {
    if (enabled) {
      start();
    } else {
      stop();
    }

    return () => {
      if (isRunning) {
        stop();
      }
    };
  }, [enabled]); // Only depend on enabled, not start/stop functions to avoid infinite loops

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRunning) {
        engine.removeEventListener(eventListener);
      }
    };
  }, []);

  // Convenience computed values
  const signalStrength = conditions?.strength || 0;
  const networkType = conditions?.type || null;
  const isCellular = networkType === 'cellular';
  const isWiFi = networkType === 'wifi';
  const isDataLimited = conditions?.dataLimited || false;
  const overallQuality = qualityScore?.overall || 0;
  const qualityLevel = qualityScore?.level || null;
  const isOptimalQuality = overallQuality >= 85;

  return {
    // Core state
    conditions,
    qualityScore,
    voiceProfile,
    analytics,
    isRunning,
    isInitializing,
    error,

    // Control functions
    start,
    stop,
    refresh,

    // Convenience getters
    signalStrength,
    networkType,
    isCellular,
    isWiFi,
    isDataLimited,
    overallQuality,
    qualityLevel,
    isOptimalQuality,
  };
}

/**
 * Simplified hook that just provides current network quality score
 * Lighter weight for components that only need basic quality info
 */
export function useNetworkQuality(): {
  quality: number;
  level: string | null;
  isOptimal: boolean;
  isLoading: boolean;
} {
  const { overallQuality, qualityLevel, isOptimalQuality, isInitializing } = useNetworkIntelligence({
    enabled: true,
  });

  return {
    quality: overallQuality,
    level: qualityLevel,
    isOptimal: isOptimalQuality,
    isLoading: isInitializing,
  };
}

/**
 * Hook that provides current voice optimization profile
 * For voice-related components that need codec/quality settings
 */
export function useVoiceOptimization(): {
  profile: VoiceOptimizationProfile | null;
  codec: string | null;
  bitrate: number | null;
  profileName: string | null;
  isLoading: boolean;
} {
  const { voiceProfile, isInitializing } = useNetworkIntelligence({
    enabled: true,
  });

  return {
    profile: voiceProfile,
    codec: voiceProfile?.codec || null,
    bitrate: voiceProfile?.bitrate || null,
    profileName: voiceProfile?.profileName || null,
    isLoading: isInitializing,
  };
}

/**
 * Hook for monitoring network transitions
 * Useful for components that need to react to network changes
 */
export function useNetworkTransitions(
  onTransition?: (event: NetworkTransitionEvent) => void
): {
  lastTransition: NetworkTransitionEvent | null;
  transitionCount: number;
} {
  const [lastTransition, setLastTransition] = useState<NetworkTransitionEvent | null>(null);
  const [transitionCount, setTransitionCount] = useState(0);

  const { analytics } = useNetworkIntelligence({
    enabled: true,
    onTransitionDetected: useCallback((event: NetworkTransitionEvent) => {
      setLastTransition(event);
      setTransitionCount(prev => prev + 1);
      onTransition?.(event);
    }, [onTransition]),
  });

  return {
    lastTransition,
    transitionCount: analytics?.session.transitionCount || transitionCount,
  };
}

export default useNetworkIntelligence;