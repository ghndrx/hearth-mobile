/**
 * useNotificationPermissions Hook
 * React hook for managing notification permissions state and actions
 */

import { useState, useEffect, useCallback } from 'react';
import {
  NotificationPermissionStatus,
  getPermissionStatus,
  requestPermission,
  openSettings,
  areNotificationsEnabled,
  getPermissionDescription,
} from '../services/pushNotifications/permissionService';

export interface NotificationPermissionsState {
  /** Current permission status */
  status: NotificationPermissionStatus;
  /** Whether notifications are fully enabled */
  isEnabled: boolean;
  /** Loading state for async operations */
  isLoading: boolean;
  /** Error state if something went wrong */
  error: string | null;
  /** Human-readable description of current status */
  description: string;
}

export interface NotificationPermissionsActions {
  /** Request notification permissions */
  requestPermissions: () => Promise<NotificationPermissionStatus>;
  /** Open device notification settings */
  openDeviceSettings: () => Promise<void>;
  /** Refresh current permission status */
  checkStatus: () => Promise<void>;
  /** Clear any current error */
  clearError: () => void;
}

export interface UseNotificationPermissionsReturn {
  /** Current state */
  state: NotificationPermissionsState;
  /** Available actions */
  actions: NotificationPermissionsActions;
}

/**
 * Hook for managing notification permissions
 * Provides state and actions for permission handling
 */
export const useNotificationPermissions = (): UseNotificationPermissionsReturn => {
  const [state, setState] = useState<NotificationPermissionsState>({
    status: NotificationPermissionStatus.UNKNOWN,
    isEnabled: false,
    isLoading: true,
    error: null,
    description: 'Checking notification status...',
  });

  /**
   * Update state helper
   */
  const updateState = useCallback((updates: Partial<NotificationPermissionsState>) => {
    setState(current => ({
      ...current,
      ...updates,
    }));
  }, []);

  /**
   * Check current permission status
   */
  const checkStatus = useCallback(async () => {
    try {
      updateState({ isLoading: true, error: null });

      const [status, enabled] = await Promise.all([
        getPermissionStatus(),
        areNotificationsEnabled(),
      ]);

      const description = getPermissionDescription(status);

      updateState({
        status,
        isEnabled: enabled,
        description,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to check notification status:', error);
      updateState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to check notification status',
        description: 'Unable to check notification status',
      });
    }
  }, [updateState]);

  /**
   * Request notification permissions
   */
  const requestPermissions = useCallback(async (): Promise<NotificationPermissionStatus> => {
    try {
      updateState({ isLoading: true, error: null });

      const newStatus = await requestPermission();
      const enabled = await areNotificationsEnabled();
      const description = getPermissionDescription(newStatus);

      updateState({
        status: newStatus,
        isEnabled: enabled,
        description,
        isLoading: false,
        error: null,
      });

      return newStatus;
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to request permissions';

      updateState({
        isLoading: false,
        error: errorMessage,
        description: 'Failed to request notification permissions',
      });

      // Re-throw so caller can handle if needed
      throw error;
    }
  }, [updateState]);

  /**
   * Open device notification settings
   */
  const openDeviceSettings = useCallback(async (): Promise<void> => {
    try {
      updateState({ error: null });
      await openSettings();

      // After opening settings, refresh status when user returns
      // Note: This might not immediately reflect changes as the user needs to actually change settings
      setTimeout(checkStatus, 1000);
    } catch (error) {
      console.error('Failed to open device settings:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Failed to open settings',
      });
      throw error;
    }
  }, [updateState, checkStatus]);

  /**
   * Clear any current error
   */
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  /**
   * Check permission status on mount and when app becomes active
   */
  useEffect(() => {
    checkStatus();

    // Listen for app state changes to refresh status when user returns from settings
    // Note: This would typically use AppState from 'react-native' but we'll keep it simple for now
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // App became visible, refresh status
        setTimeout(checkStatus, 500);
      }
    };

    // Web-specific visibility handling (for development)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }

    // For React Native, you would use:
    // import { AppState } from 'react-native';
    // const handleAppStateChange = (nextAppState: string) => {
    //   if (nextAppState === 'active') {
    //     setTimeout(checkStatus, 500);
    //   }
    // };
    // const subscription = AppState.addEventListener('change', handleAppStateChange);
    // return () => subscription?.remove();

    return undefined;
  }, [checkStatus]);

  return {
    state,
    actions: {
      requestPermissions,
      openDeviceSettings,
      checkStatus,
      clearError,
    },
  };
};

/**
 * Hook for getting just the permission status (lightweight version)
 */
export const useNotificationPermissionStatus = () => {
  const [status, setStatus] = useState<NotificationPermissionStatus>(NotificationPermissionStatus.UNKNOWN);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkStatus = async () => {
      try {
        const currentStatus = await getPermissionStatus();
        if (mounted) {
          setStatus(currentStatus);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to check permission status:', error);
        if (mounted) {
          setStatus(NotificationPermissionStatus.UNKNOWN);
          setIsLoading(false);
        }
      }
    };

    checkStatus();

    return () => {
      mounted = false;
    };
  }, []);

  return { status, isLoading };
};

export default useNotificationPermissions;