/**
 * Push Notifications Hook
 *
 * Provides easy access to push notification functionality:
 * - Registration
 * - Listeners for received/tapped notifications
 * - Settings management
 * - Badge management
 * - Granular permission controls (iOS alert, badge, sound, critical, provisional)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { AppState, type AppStateStatus } from 'react-native';
import { router } from 'expo-router';
import {
  registerForPushNotifications,
  getNotificationSettings,
  saveNotificationSettings,
  getPermissionStatusDetails,
  requestPermissionsWithOptions,
  setBadgeCount,
  clearBadgeCount,
  dismissAllNotifications,
  isQuietHours,
  type NotificationSettings,
  type NotificationPermissionDetails,
  type NotificationPayload,
  type RequestPermissionOptions,
} from '../services/notifications';

interface UsePushNotificationsOptions {
  authToken?: string;
  onNotificationReceived?: (notification: Notifications.Notification) => void;
  onNotificationTapped?: (data: NotificationPayload) => void;
}

interface UsePushNotificationsReturn {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  settings: NotificationSettings | null;
  badgeCount: number;
  isRegistered: boolean;
  isLoading: boolean;
  error: string | null;
  // Permission - basic
  permissionStatus: Notifications.PermissionStatus | null;
  isPermissionGranted: boolean;
  // Permission - granular details
  permissionDetails: NotificationPermissionDetails | null;
  isProvisional: boolean;
  // Quiet hours
  isInQuietHours: boolean;
  // Actions
  register: () => Promise<boolean>;
  updateSettings: (updates: Partial<NotificationSettings>) => Promise<void>;
  clearNotifications: () => Promise<void>;
  clearChannelNotifications: (channelId: string) => Promise<void>;
  setBadge: (count: number) => Promise<void>;
  incrementBadge: () => Promise<void>;
  decrementBadge: () => Promise<void>;
  requestPermissionWithOptions: (options: RequestPermissionOptions) => Promise<NotificationPermissionDetails>;
  refreshPermissionStatus: () => Promise<void>;
}

/**
 * Handle notification tap - navigate to relevant screen
 */
function handleNotificationResponse(
  response: Notifications.NotificationResponse
): void {
  const data = response.notification.request.content.data as NotificationPayload;

  // Clear badge when user interacts with notification
  clearBadgeCount();

  switch (data.type) {
    case 'message':
    case 'mention':
    case 'reply':
      if (data.threadId) {
        router.push({
          pathname: '/chat/thread',
          params: { id: data.threadId, channelId: data.channelId },
        });
      } else if (data.channelId) {
        router.push({
          pathname: '/chat/[id]',
          params: { id: data.channelId, serverId: data.serverId },
        });
      }
      break;

    case 'dm':
      if (data.channelId) {
        router.push({
          pathname: '/chat/[id]',
          params: { id: data.channelId, isDm: 'true' },
        });
      }
      break;

    case 'friend_request':
      router.push('/(tabs)/friends');
      break;

    case 'server_invite':
      router.push('/(tabs)/invites');
      break;

    case 'call':
      if (data.channelId) {
        router.push({
          pathname: '/voice/[id]',
          params: { id: data.channelId },
        });
      }
      break;

    default:
      router.push('/(tabs)');
  }
}

export function usePushNotifications(
  options: UsePushNotificationsOptions = {}
): UsePushNotificationsReturn {
  const { authToken, onNotificationReceived, onNotificationTapped } = options;

  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [badgeCount, setBadgeCountState] = useState(0);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<Notifications.PermissionStatus | null>(null);
  const [permissionDetails, setPermissionDetails] =
    useState<NotificationPermissionDetails | null>(null);
  const [isInQuietHours, setIsInQuietHours] = useState(false);

  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();
  const appStateListener = useRef<ReturnType<typeof AppState.addEventListener>>();
  const quietHoursIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refresh permission status
  const refreshPermissionStatus = useCallback(async () => {
    try {
      const details = await getPermissionStatusDetails();
      setPermissionStatus(details.status);
      setPermissionDetails(details);
    } catch (err) {
      console.error('Failed to refresh permission status:', err);
    }
  }, []);

  // Request permission with granular options
  const requestPermissionWithOptions = useCallback(
    async (opts: RequestPermissionOptions): Promise<NotificationPermissionDetails> => {
      setIsLoading(true);
      setError(null);

      try {
        const details = await requestPermissionsWithOptions(opts);
        setPermissionStatus(details.status);
        setPermissionDetails(details);

        if (details.granted) {
          const token = await registerForPushNotifications();
          setExpoPushToken(token);
          setIsRegistered(true);
        }

        setIsLoading(false);
        return details;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Permission request failed';
        setError(message);
        setIsLoading(false);
        throw err;
      }
    },
    []
  );

  // Check quiet hours periodically
  useEffect(() => {
    const checkQuietHours = () => {
      if (settings) {
        setIsInQuietHours(isQuietHours(settings));
      }
    };

    checkQuietHours();
    quietHoursIntervalRef.current = setInterval(checkQuietHours, 60000);

    return () => {
      if (quietHoursIntervalRef.current) {
        clearInterval(quietHoursIntervalRef.current);
      }
    };
  }, [settings]);

  // Load settings and badge count on mount
  useEffect(() => {
    const loadInitialState = async () => {
      try {
        const [loadedSettings, badge, perms] = await Promise.all([
          getNotificationSettings(),
          Notifications.getBadgeCountAsync(),
          getPermissionStatusDetails(),
        ]);
        setSettings(loadedSettings);
        setBadgeCountState(badge);
        setPermissionStatus(perms.status);
        setPermissionDetails(perms);
      } catch (err) {
        console.error('Failed to load notification state:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialState();
  }, []);

  // Set up notification listeners
  useEffect(() => {
    // Listener for notifications received while app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener((receivedNotification) => {
        setNotification(receivedNotification);
        onNotificationReceived?.(receivedNotification);
      });

    // Listener for notification taps
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content
          .data as NotificationPayload;
        onNotificationTapped?.(data);
        handleNotificationResponse(response);
      });

    // App state listener to refresh badge count
    appStateListener.current = AppState.addEventListener(
      'change',
      async (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          const badge = await Notifications.getBadgeCountAsync();
          setBadgeCountState(badge);
          await refreshPermissionStatus();
        }
      }
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
      appStateListener.current?.remove();
    };
  }, [onNotificationReceived, onNotificationTapped, refreshPermissionStatus]);

  // Register for push notifications
  const register = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await registerForPushNotifications();

      if (!token) {
        setError('Failed to get push token');
        setIsLoading(false);
        return false;
      }

      setExpoPushToken(token);

      // Register with backend if auth token provided
      if (authToken) {
        try {
          const response = await fetch(
            `${process.env.EXPO_PUBLIC_API_URL}/users/@me/devices`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${authToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                type: 'expo',
                token,
              }),
            }
          );

          if (!response.ok) {
            console.warn('Failed to register token with backend');
          }
        } catch (err) {
          console.warn('Failed to register token with backend:', err);
        }
      }

      setIsRegistered(true);
      await refreshPermissionStatus();
      setIsLoading(false);
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      setIsLoading(false);
      return false;
    }
  }, [authToken, refreshPermissionStatus]);

  // Auto-register when auth token becomes available
  useEffect(() => {
    if (authToken && settings?.enabled && !isRegistered && !isLoading) {
      register();
    }
  }, [authToken, settings?.enabled, isRegistered, isLoading, register]);

  // Update settings
  const handleUpdateSettings = useCallback(
    async (updates: Partial<NotificationSettings>) => {
      try {
        const updated = await saveNotificationSettings(updates);
        setSettings(updated);

        // If notifications were disabled, clear badge
        if ('enabled' in updates && !updates.enabled) {
          await clearBadgeCount();
          setBadgeCountState(0);
        }
      } catch (err) {
        console.error('Failed to update settings:', err);
        throw err;
      }
    },
    []
  );

  // Clear all notifications
  const handleClearNotifications = useCallback(async () => {
    await dismissAllNotifications();
    await clearBadgeCount();
    setBadgeCountState(0);
  }, []);

  // Clear notifications for specific channel
  const handleClearChannelNotifications = useCallback(
    async (channelId: string) => {
      const notifications =
        await Notifications.getPresentedNotificationsAsync();

      for (const notif of notifications) {
        const data = notif.request.content.data as NotificationPayload;
        if (data.channelId === channelId) {
          await Notifications.dismissNotificationAsync(notif.request.identifier);
        }
      }

      // Refresh badge count
      const badge = await Notifications.getBadgeCountAsync();
      setBadgeCountState(badge);
    },
    []
  );

  // Set badge count
  const handleSetBadge = useCallback(async (count: number) => {
    await setBadgeCount(count);
    setBadgeCountState(count);
  }, []);

  // Increment badge
  const incrementBadge = useCallback(async () => {
    const newCount = badgeCount + 1;
    await setBadgeCount(newCount);
    setBadgeCountState(newCount);
  }, [badgeCount]);

  // Decrement badge
  const decrementBadge = useCallback(async () => {
    const newCount = Math.max(0, badgeCount - 1);
    await setBadgeCount(newCount);
    setBadgeCountState(newCount);
  }, [badgeCount]);

  return {
    expoPushToken,
    notification,
    settings,
    badgeCount,
    isRegistered,
    isLoading,
    error,
    permissionStatus,
    isPermissionGranted: permissionStatus === 'granted',
    permissionDetails,
    isProvisional: permissionDetails?.ios?.provisional ?? false,
    isInQuietHours,
    register,
    updateSettings: handleUpdateSettings,
    clearNotifications: handleClearNotifications,
    clearChannelNotifications: handleClearChannelNotifications,
    setBadge: handleSetBadge,
    incrementBadge,
    decrementBadge,
    requestPermissionWithOptions,
    refreshPermissionStatus,
  };
}

export default usePushNotifications;
