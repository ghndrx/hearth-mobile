/**
 * Network Status Hook
 * Monitors network connectivity and provides real-time status updates
 */

import { useState, useEffect, useCallback, useRef } from "react";
import NetInfo, {
  type NetInfoState,
  type NetInfoSubscription,
} from "@react-native-community/netinfo";
import type { NetworkStatus } from "../types/offline";

interface UseNetworkStatusOptions {
  /** Poll interval in milliseconds (0 to disable polling) */
  pollInterval?: number;
  /** Callback when connectivity changes */
  onConnectivityChange?: (isConnected: boolean) => void;
}

interface UseNetworkStatusResult extends NetworkStatus {
  /** Force refresh network status */
  refresh: () => Promise<void>;
  /** Whether a refresh is in progress */
  isRefreshing: boolean;
}

/**
 * Hook to monitor network connectivity status
 * Uses NetInfo for real-time updates with optional polling fallback
 */
export function useNetworkStatus(
  options: UseNetworkStatusOptions = {}
): UseNetworkStatusResult {
  const { pollInterval = 0, onConnectivityChange } = options;

  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true, // Optimistic default
    type: null,
    isMetered: false,
    lastChecked: Date.now(),
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Track previous connected state to detect changes
  const wasConnectedRef = useRef<boolean | null>(null);
  const onConnectivityChangeRef = useRef(onConnectivityChange);
  onConnectivityChangeRef.current = onConnectivityChange;

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
    } catch (error) {
      console.error("[useNetworkStatus] Failed to fetch network state:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [parseNetInfoState]);

  // Subscribe to network state changes
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

  return {
    ...status,
    refresh,
    isRefreshing,
  };
}

/**
 * Simple hook to get just the connection status
 * Lighter weight for components that only need boolean
 */
export function useIsOnline(): boolean {
  const { isConnected } = useNetworkStatus();
  return isConnected;
}

export default useNetworkStatus;
