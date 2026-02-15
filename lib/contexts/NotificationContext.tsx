import React, {
  createContext,
  useContext,
  ReactNode,
} from "react";
import * as Notifications from "expo-notifications";
import {
  useNotifications,
  useNotificationPermission,
} from "../hooks/useNotifications";
import { NotificationSettings, Notification } from "../services/notifications";

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
  requestPermission: () => Promise<void>;

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
    permissionStatus,
    isLoading,
    error,
    registerForNotifications,
    updateSettings,
    clearAllNotifications,
  } = useNotifications();

  const { isGranted } = useNotificationPermission();

  const value: NotificationContextValue = {
    expoPushToken,
    notification,
    settings,
    updateSettings,
    permissionStatus,
    isPermissionGranted: isGranted,
    requestPermission: registerForNotifications,
    isLoading,
    error,
    clearAllNotifications,
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
