import React, {
  createContext,
  useContext,
  ReactNode,
} from "react";
import * as Notifications from "expo-notifications";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { useNotificationPermission } from "../hooks/useNotifications";
import { useDeviceToken } from "../hooks/useDeviceToken";
import { NotificationSettings, Notification, DEFAULT_NOTIFICATION_SETTINGS, type NativeTokenInfo } from "../services/notifications";

interface NotificationContextValue {
  // Push token
  expoPushToken: string | null;

  // Native FCM/APNs token
  nativeToken: NativeTokenInfo | null;
  isNativeTokenRegistered: boolean;

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
  refreshNativeToken: () => Promise<void>;
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

  const {
    nativeToken,
    isRegistered: isNativeTokenRegistered,
    refreshToken: refreshNativeToken,
  } = useDeviceToken();

  const value: NotificationContextValue = {
    expoPushToken,
    nativeToken,
    isNativeTokenRegistered,
    notification,
    settings: settings || DEFAULT_NOTIFICATION_SETTINGS,
    updateSettings,
    permissionStatus: null, // usePushNotifications doesn't provide this directly
    isPermissionGranted: isGranted,
    requestPermission: register,
    isLoading,
    error,
    clearAllNotifications: clearNotifications,
    refreshNativeToken,
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
