import { useEffect, useRef, useState, useCallback } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import {
  registerForPushNotifications,
  getNotificationSettings,
  saveNotificationSettings,
  getPermissionStatus,
  clearBadgeCount,
  NotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
  NotificationResponse,
  Notification,
} from "../services/notifications";

interface NotificationData {
  type?: "message" | "mention" | "friend_request" | "server" | "call";
  channelId?: string;
  serverId?: string;
  userId?: string;
  messageId?: string;
}

interface UseNotificationsResult {
  expoPushToken: string | null;
  notification: Notification | null;
  settings: NotificationSettings;
  permissionStatus: Notifications.PermissionStatus | null;
  isLoading: boolean;
  error: string | null;
  registerForNotifications: () => Promise<void>;
  updateSettings: (updates: Partial<NotificationSettings>) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
}

export function useNotifications(): UseNotificationsResult {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [settings, setSettings] = useState<NotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS
  );
  const [permissionStatus, setPermissionStatus] =
    useState<Notifications.PermissionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  // Handle notification tap navigation
  const handleNotificationResponse = useCallback(
    (response: NotificationResponse) => {
      const data = response.notification.request.content.data as NotificationData;

      // Clear badge when user interacts with notification
      clearBadgeCount();

      // Navigate based on notification type
      if (data) {
        switch (data.type) {
          case "message":
          case "mention":
            if (data.channelId) {
              if (data.serverId) {
                router.push({
                  pathname: "/chat/[id]",
                  params: { id: data.channelId, server: data.serverId },
                });
              } else {
                router.push({
                  pathname: "/chat/[id]",
                  params: { id: data.channelId },
                });
              }
            }
            break;

          case "friend_request":
            router.push("/(tabs)/notifications");
            break;

          case "server":
            if (data.serverId) {
              router.push({
                pathname: "/(tabs)/server/[id]",
                params: { id: data.serverId },
              });
            }
            break;

          case "call":
            // Handle call notification (future feature)
            console.log("Call notification tapped:", data);
            break;

          default:
            // Default to notifications tab
            router.push("/(tabs)/notifications");
        }
      }
    },
    []
  );

  // Initial setup
  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);
        setError(null);

        // Load saved settings
        const savedSettings = await getNotificationSettings();
        setSettings(savedSettings);

        // Check permission status
        const status = await getPermissionStatus();
        setPermissionStatus(status);

        // If already granted, get push token
        if (status === "granted") {
          const token = await registerForPushNotifications();
          setExpoPushToken(token);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to initialize notifications");
        console.error("Notification init error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  // Set up notification listeners
  useEffect(() => {
    // Listener for when notification is received while app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        setNotification(notification);

        // You can show in-app notification UI here
        console.log("Notification received:", notification);
      });

    // Listener for when user taps on notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener(
        handleNotificationResponse
      );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current
        );
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [handleNotificationResponse]);

  // Register for push notifications
  const registerForNotifications = useCallback(async () => {
    try {
      setError(null);
      const token = await registerForPushNotifications();
      const newStatus = await getPermissionStatus();
      setPermissionStatus(newStatus);

      if (token) {
        setExpoPushToken(token);
        // TODO: Send token to your backend server
        // await api.registerPushToken(token);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to register for notifications"
      );
      console.error("Registration error:", err);
    }
  }, []);

  // Update notification settings
  const updateSettings = useCallback(
    async (updates: Partial<NotificationSettings>) => {
      try {
        setError(null);
        const newSettings = await saveNotificationSettings(updates);
        setSettings(newSettings);

        // If disabling all notifications, you might want to unregister
        // from the server but keep the token locally for re-enabling
        if (updates.enabled === false) {
          // TODO: Notify backend that notifications are disabled
          // await api.disablePushNotifications();
        } else if (updates.enabled === true && expoPushToken) {
          // TODO: Re-enable on backend
          // await api.enablePushNotifications(expoPushToken);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update notification settings"
        );
        console.error("Settings update error:", err);
      }
    },
    [expoPushToken]
  );

  // Clear all notifications
  const clearAllNotifications = useCallback(async () => {
    try {
      await Notifications.dismissAllNotificationsAsync();
      await clearBadgeCount();
      setNotification(null);
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    }
  }, []);

  return {
    expoPushToken,
    notification,
    settings,
    permissionStatus,
    isLoading,
    error,
    registerForNotifications,
    updateSettings,
    clearAllNotifications,
  };
}

// Convenience hook for just checking notification permissions
export function useNotificationPermission(): {
  status: Notifications.PermissionStatus | null;
  isGranted: boolean;
  requestPermission: () => Promise<boolean>;
} {
  const [status, setStatus] = useState<Notifications.PermissionStatus | null>(null);

  useEffect(() => {
    getPermissionStatus().then(setStatus);
  }, []);

  const requestPermission = useCallback(async () => {
    const token = await registerForPushNotifications();
    const newStatus = await getPermissionStatus();
    setStatus(newStatus);
    return token !== null;
  }, []);

  return {
    status,
    isGranted: status === "granted",
    requestPermission,
  };
}
