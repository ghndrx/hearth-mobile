/**
 * Push Notifications Hook
 *
 * Provides easy access to push notification functionality:
 * - Registration
 * - Listeners for received/tapped notifications
 * - Settings management
 * - Badge management
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { AppState, type AppStateStatus } from 'react-native';
import { router } from 'expo-router';
import {
  registerForPushNotifications,
  getNotificationSettings,
  saveNotificationSettings,
  setBadgeCount,
  clearBadgeCount,
  dismissAllNotifications,
  type NotificationSettings,
  type NotificationPayload,
} from '../services/notifications';
import { notificationBatcher, type BatchedNotification } from '../../src/services/notifications/NotificationBatcher';

interface UsePushNotificationsOptions {
  authToken?: string;
  onNotificationReceived?: (notification: Notifications.Notification, batch?: BatchedNotification) => void;
  onNotificationTapped?: (data: NotificationPayload) => void;
  onBatchUpdated?: (batches: BatchedNotification[]) => void;
}

interface UsePushNotificationsReturn {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  settings: NotificationSettings | null;
  badgeCount: number;
  batchedNotifications: BatchedNotification[];
  isRegistered: boolean;
  isLoading: boolean;
  error: string | null;
  register: () => Promise<boolean>;
  updateSettings: (updates: Partial<NotificationSettings>) => Promise<void>;
  clearNotifications: () => Promise<void>;
  clearChannelNotifications: (channelId: string) => Promise<void>;
  clearBatch: (groupKey: string) => void;
  clearAllBatches: () => void;
  setBadge: (count: number) => Promise<void>;
  incrementBadge: () => Promise<void>;
  decrementBadge: () => Promise<void>;
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
  const { authToken, onNotificationReceived, onNotificationTapped, onBatchUpdated } = options;

  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [badgeCount, setBadgeCountState] = useState(0);
  const [batchedNotifications, setBatchedNotifications] = useState<BatchedNotification[]>([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();
  const appStateListener = useRef<ReturnType<typeof AppState.addEventListener>>();

  // Load settings and badge count on mount
  useEffect(() => {
    const loadInitialState = async () => {
      try {
        const [loadedSettings, badge] = await Promise.all([
          getNotificationSettings(),
          Notifications.getBadgeCountAsync(),
        ]);
        setSettings(loadedSettings);
        setBadgeCountState(badge);
      } catch (err) {
        console.error('Failed to load notification state:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialState();
  }, []);

  // Set up notification listeners and batcher subscription
  useEffect(() => {
    // Subscribe to notification batcher updates
    const unsubscribeBatcher = notificationBatcher.addListener((batches) => {
      setBatchedNotifications(batches);
      onBatchUpdated?.(batches);

      // Update badge count based on batched notifications
      const totalCount = notificationBatcher.getNotificationCount();
      setBadgeCountState(totalCount);
      setBadgeCount(totalCount);
    });

    // Listener for notifications received while app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener(async (receivedNotification) => {
        setNotification(receivedNotification);

        const data = receivedNotification.request.content.data as NotificationPayload;

        // Check if batching is enabled in settings
        const currentSettings = settings || await getNotificationSettings();

        if (currentSettings.batchingEnabled && notificationBatcher.shouldBatchNotification(data)) {
          // Update batcher settings from notification settings
          await notificationBatcher.updateSettings({
            enabled: currentSettings.batchingEnabled,
            batchTimeWindow: currentSettings.batchTimeWindow,
            maxBatchSize: currentSettings.maxBatchSize,
            groupByChannel: currentSettings.groupByChannel,
            groupByUser: currentSettings.groupByUser,
            groupByType: currentSettings.groupByType,
            autoCollapseThreshold: currentSettings.autoCollapseThreshold,
          });

          // Add to batch
          const batch = await notificationBatcher.addNotification(data);
          onNotificationReceived?.(receivedNotification, batch || undefined);
        } else {
          // Handle normally for non-batchable notifications
          onNotificationReceived?.(receivedNotification);
        }
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
        }
      }
    );

    return () => {
      unsubscribeBatcher();
      notificationListener.current?.remove();
      responseListener.current?.remove();
      appStateListener.current?.remove();
    };
  }, [onNotificationReceived, onNotificationTapped, onBatchUpdated, settings]);

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
      setIsLoading(false);
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      setIsLoading(false);
      return false;
    }
  }, [authToken]);

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
    notificationBatcher.dismissAllBatches();
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

  // Clear specific batch
  const clearBatch = useCallback((groupKey: string) => {
    notificationBatcher.dismissBatch(groupKey);
    // Badge count will be updated automatically via batcher listener
  }, []);

  // Clear all batches
  const clearAllBatches = useCallback(() => {
    notificationBatcher.dismissAllBatches();
    // Badge count will be updated automatically via batcher listener
  }, []);

  return {
    expoPushToken,
    notification,
    settings,
    badgeCount,
    batchedNotifications,
    isRegistered,
    isLoading,
    error,
    register,
    updateSettings: handleUpdateSettings,
    clearNotifications: handleClearNotifications,
    clearChannelNotifications: handleClearChannelNotifications,
    clearBatch,
    clearAllBatches,
    setBadge: handleSetBadge,
    incrementBadge,
    decrementBadge,
  };
}

export default usePushNotifications;
