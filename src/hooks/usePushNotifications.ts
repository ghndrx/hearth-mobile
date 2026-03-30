/**
 * usePushNotifications Hook (PN-001)
 *
 * Thin wrapper around NotificationService that provides React lifecycle
 * integration: auto-initialization, listener setup, token refresh, and
 * cleanup on unmount. Delegates to lib/hooks/usePushNotifications for
 * the core implementation and adds NotificationService lifecycle management.
 */

import { useEffect, useCallback } from 'react';
import {
  usePushNotifications as useCorePushNotifications,
} from '../../lib/hooks/usePushNotifications';
import { NotificationService } from '../services/NotificationService';
import type { NotificationPayload } from '../types/notifications';
import type * as Notifications from 'expo-notifications';

interface UsePushNotificationsOptions {
  /** Auth token — triggers auto-registration when set */
  authToken?: string;
  /** Called when a notification is received in the foreground */
  onNotificationReceived?: (notification: Notifications.Notification) => void;
  /** Called when the user taps a notification */
  onNotificationTapped?: (data: NotificationPayload) => void;
}

/**
 * Hook for push notification lifecycle management.
 *
 * Usage:
 * ```tsx
 * const { expoPushToken, register, settings, updateSettings } = usePushNotifications({
 *   authToken: user?.token,
 *   onNotificationReceived: (n) => showBanner(n),
 * });
 * ```
 */
export function usePushNotifications(options: UsePushNotificationsOptions = {}) {
  const core = useCorePushNotifications(options);

  // Initialize NotificationService (sets up token refresh listener)
  useEffect(() => {
    if (options.authToken) {
      NotificationService.initialize();
    }
    return () => {
      NotificationService.teardown();
    };
  }, [options.authToken]);

  // Wrap unregister to also tear down the service
  const unregister = useCallback(async () => {
    await NotificationService.unregisterDevice();
  }, []);

  return {
    ...core,
    unregister,
  };
}

export default usePushNotifications;
