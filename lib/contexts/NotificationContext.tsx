import React, {
  createContext,
  useContext,
  ReactNode,
} from "react";
import * as Notifications from "expo-notifications";
import { usePushNotifications } from "../hooks/usePushNotifications";
import {
  NotificationSettings,
  NotificationPermissionDetails,
  Notification,
  DEFAULT_NOTIFICATION_SETTINGS,
} from "../services/notifications";

interface NotificationContextValue {
  // Push token
  expoPushToken: string | null;

  // Current notification (when received in foreground)
  notification: Notification | null;

  // Settings
  settings: NotificationSettings;
  updateSettings: (updates: Partial<NotificationSettings>) => Promise<void>;

  // Permission - basic
  permissionStatus: Notifications.PermissionStatus | null;
  isPermissionGranted: boolean;

  // Permission - granular details
  permissionDetails: NotificationPermissionDetails | null;
  isProvisional: boolean;

  // Quiet hours
  isInQuietHours: boolean;

  // Actions
  requestPermission: () => Promise<boolean>;
  requestPermissionWithOptions: (options: Parameters<NotificationContextValue["requestPermissionWithOptions"]>[0]) => Promise<NotificationPermissionDetails>;
  refreshPermissionStatus: () => Promise<void>;
  clearAllNotifications: () => Promise<void>;

  // State
  isLoading: boolean;
  error: string | null;
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
    permissionStatus,
    permissionDetails,
    isLoading,
    error,
    register,
    updateSettings,
    clearNotifications,
    requestPermissionWithOptions,
    refreshPermissionStatus,
    isInQuietHours,
  } = usePushNotifications();

  const value: NotificationContextValue = {
    expoPushToken,
    notification,
    settings: settings || DEFAULT_NOTIFICATION_SETTINGS,
    updateSettings,
    permissionStatus,
    isPermissionGranted: permissionStatus === "granted",
    permissionDetails,
    isProvisional: permissionDetails?.ios?.provisional ?? false,
    isInQuietHours,
    requestPermission: register,
    requestPermissionWithOptions,
    refreshPermissionStatus,
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
