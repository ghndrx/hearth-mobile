import React, {
  createContext,
  useContext,
  useEffect,
  ReactNode,
} from "react";
import * as Notifications from "expo-notifications";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { useNotificationPermission } from "../hooks/useNotifications";
import { NotificationSettings, Notification, DEFAULT_NOTIFICATION_SETTINGS } from "../services/notifications";
import { notificationDeliveryService, type DeliveryStats } from "../services/notificationDelivery";
import { useAuthStore } from "../stores/auth";

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

  // Delivery service
  deliveryStats: DeliveryStats | null;
  deliveryRate: number;
  pendingNotificationCount: number;
  isMeetingDeliveryTarget: boolean;

  // Actions
  clearAllNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { token: authToken } = useAuthStore();

  const {
    expoPushToken,
    notification,
    settings,
    isLoading,
    error,
    register,
    updateSettings,
    clearNotifications,
  } = usePushNotifications({ authToken: authToken || undefined });

  const { isGranted } = useNotificationPermission();

  // Initialize and start delivery service
  useEffect(() => {
    const initializeDeliveryService = async () => {
      try {
        await notificationDeliveryService.initialize();
        await notificationDeliveryService.start();
        console.log('[NotificationContext] Delivery service initialized and started');
      } catch (err) {
        console.error('[NotificationContext] Failed to initialize delivery service:', err);
      }
    };

    initializeDeliveryService();

    // Cleanup on unmount
    return () => {
      notificationDeliveryService.stop();
    };
  }, []);

  // Set up silent push handler for background notifications
  useEffect(() => {
    notificationDeliveryService.setSilentPushHandler(async (data) => {
      console.log('[NotificationContext] Silent push received:', data);
      
      // Handle different sync types from silent pushes
      const syncType = data.syncType || data.type;
      
      switch (syncType) {
        case 'new_message':
        case 'messages':
          // Trigger message sync
          console.log('[NotificationContext] Syncing messages from silent push');
          break;
        case 'notification':
        case 'notifications':
          // Trigger notification sync
          console.log('[NotificationContext] Syncing notifications from silent push');
          break;
        case 'sync_all':
          // Full sync
          console.log('[NotificationContext] Full sync from silent push');
          break;
        default:
          console.log('[NotificationContext] Unknown silent push type:', syncType);
      }
    });
  }, []);

  // Get delivery stats
  const deliveryStats = notificationDeliveryService.getStats();
  const deliveryRate = notificationDeliveryService.getDeliveryRate();
  const pendingNotificationCount = notificationDeliveryService.getPendingCount();
  const isMeetingDeliveryTarget = notificationDeliveryService.isMeetingDeliveryTarget();

  const value: NotificationContextValue = {
    expoPushToken,
    notification,
    settings: settings || DEFAULT_NOTIFICATION_SETTINGS,
    updateSettings,
    permissionStatus: null, // usePushNotifications doesn't provide this directly
    isPermissionGranted: isGranted,
    requestPermission: register,
    isLoading,
    error,
    clearAllNotifications: clearNotifications,
    deliveryStats,
    deliveryRate,
    pendingNotificationCount,
    isMeetingDeliveryTarget,
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
