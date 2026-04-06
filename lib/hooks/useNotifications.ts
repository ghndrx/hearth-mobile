import { useEffect, useRef, useState, useCallback } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import {
  registerForPushNotifications,
  getNotificationSettings,
  saveNotificationSettings,
  getPermissionStatus,
  getPermissionStatusDetails,
  requestPermissionsWithOptions,
  clearBadgeCount,
  isQuietHours,
  NotificationSettings,
  NotificationPermissionDetails,
  RequestPermissionOptions,
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
  permissionDetails: NotificationPermissionDetails | null;
  isLoading: boolean;
  error: string | null;
  registerForNotifications: () => Promise<void>;
  updateSettings: (updates: Partial<NotificationSettings>) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  requestPermissionWithOptions: (options: RequestPermissionOptions) => Promise<NotificationPermissionDetails>;
  refreshPermissionStatus: () => Promise<void>;
  isInQuietHours: boolean;
}

export function useNotifications(): UseNotificationsResult {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [settings, setSettings] = useState<NotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS
  );
  const [permissionStatus, setPermissionStatus] =
    useState<Notifications.PermissionStatus | null>(null);
  const [permissionDetails, setPermissionDetails] =
    useState<NotificationPermissionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInQuietHours, setIsInQuietHours] = useState(false);

  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();
  const quietHoursIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Check quiet hours periodically
  useEffect(() => {
    const checkQuietHours = () => {
      setIsInQuietHours(isQuietHours(settings));
    };

    checkQuietHours(); // Initial check
    quietHoursIntervalRef.current = setInterval(checkQuietHours, 60000); // Check every minute

    return () => {
      if (quietHoursIntervalRef.current) {
        clearInterval(quietHoursIntervalRef.current);
      }
    };
  }, [settings]);

  // Refresh permission status
  const refreshPermissionStatus = useCallback(async () => {
    try {
      const details = await getPermissionStatusDetails();
      setPermissionStatus(details.status);
      setPermissionDetails(details);
    } catch (err) {
      console.error("Failed to refresh permission status:", err);
    }
  }, []);

  // Request permission with granular options
  const requestPermissionWithOptions = useCallback(
    async (options: RequestPermissionOptions): Promise<NotificationPermissionDetails> => {
      try {
        setError(null);
        const details = await requestPermissionsWithOptions(options);
        setPermissionStatus(details.status);
        setPermissionDetails(details);

        if (details.granted) {
          const token = await registerForPushNotifications();
          setExpoPushToken(token);
        }

        return details;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to request permissions";
        setError(message);
        console.error("Permission request error:", err);
        throw err;
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

        // Check permission status with full details
        const details = await getPermissionStatusDetails();
        setPermissionStatus(details.status);
        setPermissionDetails(details);

        // If already granted, get push token
        if (details.status === "granted") {
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

  // Register for push notifications (legacy, uses basic permissions)
  const registerForNotifications = useCallback(async () => {
    try {
      setError(null);
      const token = await registerForPushNotifications();
      const details = await getPermissionStatusDetails();
      setPermissionStatus(details.status);
      setPermissionDetails(details);

      if (token) {
        setExpoPushToken(token);
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
    permissionDetails,
    isLoading,
    error,
    registerForNotifications,
    updateSettings,
    clearAllNotifications,
    requestPermissionWithOptions,
    refreshPermissionStatus,
    isInQuietHours,
  };
}

// Convenience hook for just checking notification permissions with granular details
export function useNotificationPermission(): {
  status: Notifications.PermissionStatus | null;
  details: NotificationPermissionDetails | null;
  isGranted: boolean;
  isProvisional: boolean;
  requestPermission: () => Promise<boolean>;
  requestPermissionWithOptions: (options: RequestPermissionOptions) => Promise<NotificationPermissionDetails>;
} {
  const [status, setStatus] = useState<Notifications.PermissionStatus | null>(null);
  const [details, setDetails] = useState<NotificationPermissionDetails | null>(null);

  useEffect(() => {
    getPermissionStatusDetails().then((d) => {
      setStatus(d.status);
      setDetails(d);
    });
  }, []);

  const requestPermission = useCallback(async () => {
    const token = await registerForPushNotifications();
    const newDetails = await getPermissionStatusDetails();
    setStatus(newDetails.status);
    setDetails(newDetails);
    return token !== null;
  }, []);

  const requestPermissionWithOptions = useCallback(
    async (options: RequestPermissionOptions): Promise<NotificationPermissionDetails> => {
      const newDetails = await requestPermissionsWithOptions(options);
      setStatus(newDetails.status);
      setDetails(newDetails);
      return newDetails;
    },
    []
  );

  return {
    status,
    details,
    isGranted: status === "granted",
    isProvisional: details?.ios?.provisional ?? false,
    requestPermission,
    requestPermissionWithOptions,
  };
}
