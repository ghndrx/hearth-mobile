/**
 * Unified Permission Manager Hook
 *
 * Provides real-time permission status monitoring and centralized permission management.
 * Replaces the fragmented permission handling across different hooks.
 *
 * Features:
 * - Real-time permission status updates
 * - App state change monitoring (detects system settings changes)
 * - Centralized permission requests with rationale
 * - Retry logic with exponential backoff
 * - Permission status caching
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import {
  permissionManager,
  type PermissionType,
  type PermissionResult,
  type PermissionRationale,
} from "../services/permissionManager";

interface UsePermissionManagerOptions {
  // Which permissions to monitor
  permissions?: PermissionType[];
  // Check permissions on app focus (default: true)
  checkOnFocus?: boolean;
  // Automatic permission refresh interval in ms (default: 5 minutes)
  refreshInterval?: number;
}

interface UsePermissionManagerReturn {
  // Permission statuses for all monitored permissions
  permissions: Record<PermissionType, PermissionResult>;

  // Quick access to specific permissions
  notificationStatus: PermissionResult | null;
  cameraStatus: PermissionResult | null;
  microphoneStatus: PermissionResult | null;
  mediaLibraryStatus: PermissionResult | null;

  // Actions
  requestPermission: (
    type: PermissionType,
    showRationale?: boolean
  ) => Promise<PermissionResult>;
  requestMultiplePermissions: (
    types: PermissionType[]
  ) => Promise<Record<PermissionType, PermissionResult>>;
  refreshPermissions: () => Promise<void>;
  openSystemSettings: () => Promise<void>;
  getRationale: (type: PermissionType) => PermissionRationale;

  // State
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  error: string | null;
}

export function usePermissionManager(
  options: UsePermissionManagerOptions = {}
): UsePermissionManagerReturn {
  const {
    permissions: monitoredPermissions = ["notifications", "camera", "microphone", "mediaLibrary"],
    checkOnFocus = true,
    refreshInterval = 5 * 60 * 1000, // 5 minutes
  } = options;

  // State
  const [permissions, setPermissions] = useState<Record<PermissionType, PermissionResult>>({} as Record<PermissionType, PermissionResult>);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs for cleanup
  const appStateListener = useRef<ReturnType<typeof AppState.addEventListener>>();
  const refreshTimer = useRef<NodeJS.Timeout>();
  const permissionListeners = useRef<(() => void)[]>([]);

  // Initial permissions load
  const loadPermissions = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setError(null);

    try {
      const results: Partial<Record<PermissionType, PermissionResult>> = {};

      // Load all monitored permissions in parallel
      await Promise.all(
        monitoredPermissions.map(async (type) => {
          try {
            results[type] = await permissionManager.getPermissionStatus(type, false); // Force fresh check
          } catch (err) {
            console.error(`Failed to load ${type} permission:`, err);
            results[type] = {
              status: "denied",
              granted: false,
              canAskAgain: false,
              message: `Error loading ${type} permission`,
            };
          }
        })
      );

      setPermissions(results as Record<PermissionType, PermissionResult>);
      setLastUpdated(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load permissions";
      setError(message);
      console.error("Permission loading error:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [monitoredPermissions]);

  // Set up app state monitoring
  useEffect(() => {
    if (!checkOnFocus) return;

    appStateListener.current = AppState.addEventListener(
      "change",
      async (nextAppState: AppStateStatus) => {
        // When app becomes active, check for permission changes
        if (nextAppState === "active") {
          console.log("[PermissionManager] App became active, refreshing permissions");
          await loadPermissions(false); // Refresh without showing loading
        }
      }
    );

    return () => {
      appStateListener.current?.remove();
    };
  }, [loadPermissions, checkOnFocus]);

  // Set up permission change listeners
  useEffect(() => {
    // Clean up existing listeners
    permissionListeners.current.forEach(unsub => unsub());
    permissionListeners.current = [];

    // Set up new listeners for monitored permissions
    monitoredPermissions.forEach((type) => {
      const unsubscribe = permissionManager.addListener(type, (result) => {
        console.log(`[PermissionManager] ${type} permission changed:`, result);
        setPermissions(prev => ({
          ...prev,
          [type]: result,
        }));
        setLastUpdated(new Date());
      });

      permissionListeners.current.push(unsubscribe);
    });

    return () => {
      permissionListeners.current.forEach(unsub => unsub());
      permissionListeners.current = [];
    };
  }, [monitoredPermissions]);

  // Set up periodic refresh
  useEffect(() => {
    if (refreshInterval <= 0) return;

    refreshTimer.current = setInterval(async () => {
      console.log("[PermissionManager] Periodic permission refresh");
      await loadPermissions(false);
    }, refreshInterval);

    return () => {
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current);
      }
    };
  }, [loadPermissions, refreshInterval]);

  // Initial load
  useEffect(() => {
    loadPermissions();
  }, []); // Only run on mount

  // Request single permission
  const requestPermission = useCallback(
    async (type: PermissionType, showRationale = true): Promise<PermissionResult> => {
      setError(null);

      try {
        const result = await permissionManager.requestPermission(type, showRationale);

        // Update local state
        setPermissions(prev => ({
          ...prev,
          [type]: result,
        }));
        setLastUpdated(new Date());

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : `Failed to request ${type} permission`;
        setError(message);
        console.error(`Permission request error for ${type}:`, err);

        // Return error result
        return {
          status: "denied",
          granted: false,
          canAskAgain: false,
          message,
        };
      }
    },
    []
  );

  // Request multiple permissions
  const requestMultiplePermissions = useCallback(
    async (types: PermissionType[]): Promise<Record<PermissionType, PermissionResult>> => {
      setError(null);
      const results: Partial<Record<PermissionType, PermissionResult>> = {};

      // Request all permissions in parallel (but show rationale for each)
      await Promise.all(
        types.map(async (type) => {
          try {
            results[type] = await permissionManager.requestPermission(type, true);
          } catch (err) {
            console.error(`Failed to request ${type} permission:`, err);
            results[type] = {
              status: "denied",
              granted: false,
              canAskAgain: false,
              message: `Error requesting ${type} permission`,
            };
          }
        })
      );

      // Update local state
      setPermissions(prev => ({
        ...prev,
        ...results,
      }));
      setLastUpdated(new Date());

      return results as Record<PermissionType, PermissionResult>;
    },
    []
  );

  // Refresh all permissions
  const refreshPermissions = useCallback(async () => {
    await loadPermissions(false);
  }, [loadPermissions]);

  // Open system settings
  const openSystemSettings = useCallback(async () => {
    try {
      await permissionManager.openSystemSettings();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to open system settings";
      setError(message);
      throw err;
    }
  }, []);

  // Get permission rationale
  const getRationale = useCallback((type: PermissionType): PermissionRationale => {
    return permissionManager.getRationale(type);
  }, []);

  // Quick access getters
  const notificationStatus = permissions.notifications || null;
  const cameraStatus = permissions.camera || null;
  const microphoneStatus = permissions.microphone || null;
  const mediaLibraryStatus = permissions.mediaLibrary || null;

  return {
    permissions,
    notificationStatus,
    cameraStatus,
    microphoneStatus,
    mediaLibraryStatus,
    requestPermission,
    requestMultiplePermissions,
    refreshPermissions,
    openSystemSettings,
    getRationale,
    isLoading,
    isRefreshing,
    lastUpdated,
    error,
  };
}

/**
 * Convenience hook for just notification permissions
 * (backward compatibility with existing code)
 */
export function useNotificationPermission() {
  const {
    notificationStatus,
    requestPermission,
    openSystemSettings,
    getRationale,
    isLoading
  } = usePermissionManager({
    permissions: ["notifications"],
    checkOnFocus: true,
  });

  const requestNotificationPermission = useCallback(async () => {
    const result = await requestPermission("notifications", true);
    return result.granted;
  }, [requestPermission]);

  return {
    status: notificationStatus?.status || null,
    isGranted: notificationStatus?.granted || false,
    canAskAgain: notificationStatus?.canAskAgain || false,
    message: notificationStatus?.message,
    requestPermission: requestNotificationPermission,
    openSystemSettings,
    getRationale: () => getRationale("notifications"),
    isLoading,
  };
}

export default usePermissionManager;