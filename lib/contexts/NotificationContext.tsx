import React, {
  createContext,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import * as Notifications from "expo-notifications";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { useNotificationPermission } from "../hooks/usePermissionManager";
import { NotificationSettings, Notification, DEFAULT_NOTIFICATION_SETTINGS } from "../services/notifications";
import { notificationPipeline } from "../services/notificationPipeline";
import { richNotifications } from "../services/richNotifications";
import { notificationActionHandlers } from "../services/notificationActionHandlers";

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

  const { status: rawPermissionStatus, isGranted } = useNotificationPermission();

  // Map ExtendedPermissionStatus to Notifications.PermissionStatus
  const permissionStatus: Notifications.PermissionStatus | null =
    (rawPermissionStatus === "granted" ? "granted" :
    rawPermissionStatus === "denied" ? "denied" :
    rawPermissionStatus === "undetermined" ? "undetermined" :
    null) as Notifications.PermissionStatus | null;

  // Initialize notification services when component mounts
  useEffect(() => {
    let servicesInitialized = false;

    const initializeNotificationServices = async () => {
      if (servicesInitialized) return;

      try {
        console.log('[NotificationContext] Initializing notification services...');

        // Initialize rich notifications service first
        await richNotifications.initialize();
        console.log('[NotificationContext] Rich notifications service initialized');

        // Initialize action handlers service
        await notificationActionHandlers.initialize();
        console.log('[NotificationContext] Action handlers service initialized');

        // Initialize notification pipeline
        await notificationPipeline.initialize();
        console.log('[NotificationContext] Notification pipeline initialized');

        servicesInitialized = true;
        console.log('[NotificationContext] All notification services initialized successfully');
      } catch (error) {
        console.error('[NotificationContext] Failed to initialize notification services:', error);
      }
    };

    // Initialize services when notifications are enabled and permission is granted
    if (settings?.enabled && isGranted) {
      initializeNotificationServices();
    }

    return () => {
      if (servicesInitialized) {
        console.log('[NotificationContext] Shutting down notification services...');
        notificationPipeline.shutdown();
        notificationActionHandlers.shutdown();
        richNotifications.shutdown();
        console.log('[NotificationContext] All notification services shut down');
      }
    };
  }, [settings?.enabled, isGranted]);

  const value: NotificationContextValue = {
    expoPushToken,
    notification,
    settings: settings || DEFAULT_NOTIFICATION_SETTINGS,
    updateSettings,
    permissionStatus,
    isPermissionGranted: isGranted,
    requestPermission: register,
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
