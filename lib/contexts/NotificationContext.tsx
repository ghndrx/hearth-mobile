import React, {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
} from "react";
import * as Notifications from "expo-notifications";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { useNotificationPermission } from "../hooks/useNotifications";
import { NotificationSettings, Notification, DEFAULT_NOTIFICATION_SETTINGS, getPermissionStatus } from "../services/notifications";

interface NotificationContextValue {
  // Push token
  expoPushToken: string | null;

  // Current notification (when received in foreground)
  notification: Notification | null;

  // Settings
  settings: NotificationSettings;
  updateSettings: (updates: Partial<NotificationSettings>) => Promise<void>;

  // Permission
  permissionStatus: Notifications.PermissionStatus | null;
  isPermissionGranted: boolean;
  requestPermission: () => Promise<boolean>;

  // State
  isLoading: boolean;
  error: string | null;

  // Actions
  clearAllNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const {
    expoPushToken,
    notification,
    settings,
    isLoading,
    error,
    register,
    updateSettings,
    clearNotifications,
  } = usePushNotifications();

  const { isGranted } = useNotificationPermission();
  const [permissionStatus, setPermissionStatus] = useState<Notifications.PermissionStatus | null>(null);

  // Track permission status changes
  useEffect(() => {
    const loadPermissionStatus = async () => {
      try {
        const status = await getPermissionStatus();
        setPermissionStatus(status);
      } catch (error) {
        console.error("Failed to get permission status:", error);
      }
    };

    loadPermissionStatus();

    // Set up listener for permission status changes
    const subscription = Notifications.addNotificationReceivedListener(() => {
      // Refresh permission status when notifications are received
      loadPermissionStatus();
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Enhanced request permission function with status tracking
  const handleRequestPermission = async (): Promise<boolean> => {
    try {
      const success = await register();
      if (success) {
        const newStatus = await getPermissionStatus();
        setPermissionStatus(newStatus);
      }
      return success;
    } catch (error) {
      console.error("Failed to request permission:", error);
      return false;
    }
  };

  const value: NotificationContextValue = {
    expoPushToken,
    notification,
    settings: settings || DEFAULT_NOTIFICATION_SETTINGS,
    updateSettings,
    permissionStatus,
    isPermissionGranted: isGranted && permissionStatus === 'granted',
    requestPermission: handleRequestPermission,
    isLoading,
    error,
    clearAllNotifications: clearNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotificationContext must be used within a NotificationProvider"
    );
  }
  return context;
}
