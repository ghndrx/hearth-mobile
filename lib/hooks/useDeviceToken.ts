/**
 * useDeviceToken Hook
 *
 * Manages native FCM/APNs device token lifecycle:
 * - Retrieves and caches the native push token
 * - Listens for token refresh events
 * - Provides registration status
 */

import { useEffect, useState, useCallback, useRef } from "react";
import {
  getNativeDeviceToken,
  getStoredNativeToken,
  registerNativeTokenWithBackend,
  onTokenRefresh,
  startTokenRefreshListener,
  type NativeTokenInfo,
} from "../services/fcmService";

interface UseDeviceTokenReturn {
  nativeToken: NativeTokenInfo | null;
  isRegistered: boolean;
  isLoading: boolean;
  error: string | null;
  refreshToken: () => Promise<void>;
}

export function useDeviceToken(): UseDeviceTokenReturn {
  const [nativeToken, setNativeToken] = useState<NativeTokenInfo | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Load stored token on mount
  useEffect(() => {
    mountedRef.current = true;

    async function loadToken() {
      try {
        const stored = await getStoredNativeToken();
        if (mountedRef.current) {
          setNativeToken(stored);
          setIsRegistered(stored !== null);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(
            err instanceof Error ? err.message : "Failed to load device token"
          );
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    }

    loadToken();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Listen for token refreshes
  useEffect(() => {
    startTokenRefreshListener();

    const cleanup = onTokenRefresh((tokenInfo) => {
      if (mountedRef.current) {
        setNativeToken(tokenInfo);
        setIsRegistered(true);
      }
    });

    return cleanup;
  }, []);

  const refreshToken = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const tokenInfo = await getNativeDeviceToken();
      if (!tokenInfo) {
        setError("Unable to obtain device token");
        setIsLoading(false);
        return;
      }

      setNativeToken(tokenInfo);

      const registered = await registerNativeTokenWithBackend(tokenInfo);
      setIsRegistered(registered);

      if (!registered) {
        setError("Token obtained but backend registration failed");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to refresh device token"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    nativeToken,
    isRegistered,
    isLoading,
    error,
    refreshToken,
  };
}

export default useDeviceToken;
