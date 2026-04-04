/**
 * Rich Notifications Hook - PN-005
 *
 * Comprehensive hook that integrates all rich notification features:
 * - Rich notification actions
 * - Media processing
 * - Sound and vibration management
 * - Filtering and scheduling
 * - Action handling
 * - Easy component integration
 */

import { useEffect, useRef, useState, useCallback } from "react";
import * as Notifications from "expo-notifications";
import { AppState } from "react-native";
import { router } from "expo-router";

// Rich notification services
import {
  createRichNotification,
  initializeRichNotificationActions,
  type NotificationAction,
  type RichNotificationCategory,
} from "../services/richNotificationActions";
import {
  processNotificationMedia,
  type NotificationMediaOptions,
  type MediaAttachment,
} from "../services/notificationMedia";
import {
  getSoundForNotification,
  getAvailableSounds,
  getAvailableVibrations,
  playNotificationSound,
  triggerNotificationVibration,
  initializeNotificationSounds,
  type NotificationSound,
  type VibrationPattern,
} from "../services/notificationSounds";
import {
  applyNotificationFilters,
  getKeywordAlerts,
  getFilterStatistics,
  initializeNotificationFiltering,
  type KeywordAlert,
  type FilterSettings,
} from "../services/notificationFiltering";
import {
  processNotificationAction,
  initializeNotificationActionHandlers,
  retryPendingActions,
  getActionHistory,
  type ActionHistoryItem,
} from "../services/notificationActionHandlers";
import {
  addKeywordAlert as addKeywordAlertService,
  deleteKeywordAlert,
} from "../services/notificationFiltering";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearBadgeCount } from "../services/notifications";

// Base notification services
import {
  registerForPushNotifications,
  getNotificationSettings,
  saveNotificationSettings,
  type NotificationSettings,
  type NotificationPayload,
  type NotificationType,
} from "../services/notifications";

// ============================================================================
// Types
// ============================================================================

interface UseRichNotificationsOptions {
  authToken?: string;
  enableAutoRetry?: boolean;
  enableActionHistory?: boolean;
  onNotificationReceived?: (notification: Notifications.Notification) => void;
  onActionExecuted?: (actionId: string, success: boolean) => void;
  onFilterApplied?: (filtered: boolean, reason?: string) => void;
}

interface UseRichNotificationsReturn {
  // Basic notification state
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  settings: NotificationSettings | null;
  isLoading: boolean;
  error: string | null;

  // Rich notification features
  availableSounds: NotificationSound[];
  availableVibrations: VibrationPattern[];
  keywordAlerts: KeywordAlert[];
  actionHistory: ActionHistoryItem[];

  // Statistics
  filterStats: {
    totalKeywordAlerts: number;
    activeKeywordAlerts: number;
    scheduledNotifications: number;
    recentlyFiltered: number;
  } | null;

  // Core functions
  register: () => Promise<boolean>;
  updateSettings: (updates: Partial<NotificationSettings>) => Promise<void>;

  // Rich notification functions
  createNotification: (
    payload: NotificationPayload,
    options?: {
      media?: NotificationMediaOptions;
      customActions?: NotificationAction[];
      customSound?: string;
      customVibration?: string;
    }
  ) => Promise<string>;

  // Sound and vibration
  previewSound: (soundId: string, volume?: number) => Promise<void>;
  previewVibration: (vibrationId: string) => Promise<void>;
  previewSoundAndVibration: (soundId: string, vibrationId: string, volume?: number) => Promise<void>;

  // Filtering and alerts
  addKeywordAlert: (alert: Omit<KeywordAlert, "id" | "createdAt">) => Promise<KeywordAlert>;
  removeKeywordAlert: (alertId: string) => Promise<void>;
  testFilter: (payload: NotificationPayload) => Promise<{ allowed: boolean; reason?: string }>;

  // Action management
  retryFailedActions: () => Promise<void>;
  clearActionHistory: () => Promise<void>;

  // Utility functions
  refreshData: () => Promise<void>;
  clearAllNotifications: () => Promise<void>;
}

// ============================================================================
// Main Hook
// ============================================================================

export function useRichNotifications(
  options: UseRichNotificationsOptions = {}
): UseRichNotificationsReturn {
  const {
    authToken,
    enableAutoRetry = true,
    enableActionHistory = true,
    onNotificationReceived,
    onActionExecuted,
    onFilterApplied,
  } = options;

  // State
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rich notification state
  const [availableSounds, setAvailableSounds] = useState<NotificationSound[]>([]);
  const [availableVibrations, setAvailableVibrations] = useState<VibrationPattern[]>([]);
  const [keywordAlerts, setKeywordAlerts] = useState<KeywordAlert[]>([]);
  const [actionHistory, setActionHistory] = useState<ActionHistoryItem[]>([]);
  const [filterStats, setFilterStats] = useState<any>(null);

  // Refs for cleanup
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();
  const appStateListener = useRef<ReturnType<typeof AppState.addEventListener>>();
  const retryInterval = useRef<NodeJS.Timeout>();

  // ============================================================================
  // Initialization
  // ============================================================================

  useEffect(() => {
    const initializeRichNotifications = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Initialize all rich notification systems
        await Promise.all([
          initializeRichNotificationActions(),
          initializeNotificationSounds(),
          initializeNotificationFiltering(),
          initializeNotificationActionHandlers(),
        ]);

        // Load initial data
        await refreshData();

        console.log("Rich notifications initialized successfully");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to initialize rich notifications";
        setError(message);
        console.error("Rich notifications initialization error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeRichNotifications();
  }, []);

  // ============================================================================
  // Notification Listeners
  // ============================================================================

  useEffect(() => {
    // Listener for when notification is received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(
      async (receivedNotification) => {
        setNotification(receivedNotification);
        onNotificationReceived?.(receivedNotification);

        // Apply rich filtering
        const data = receivedNotification.request.content.data as NotificationPayload;
        if (data) {
          try {
            const filterResult = await applyNotificationFilters(data);
            onFilterApplied?.(filterResult.allowed, filterResult.reason);

            if (!filterResult.allowed) {
              // Dismiss the notification if filtered
              await Notifications.dismissNotificationAsync(
                receivedNotification.request.identifier
              );
            }
          } catch (error) {
            console.warn("Filter application failed:", error);
          }
        }
      }
    );

    // Listener for notification actions
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        try {
          // Handle rich notification actions
          await processNotificationAction(response);

          // Handle basic navigation
          const data = response.notification.request.content.data as NotificationPayload;
          if (data && response.actionIdentifier === "default") {
            // Default tap action - navigate
            handleNotificationNavigation(data);
          }

          // Track action execution
          if (enableActionHistory && response.actionIdentifier !== "default") {
            setTimeout(async () => {
              const history = await getActionHistory();
              setActionHistory(history.slice(-50)); // Keep last 50 actions
            }, 1000);
          }

          onActionExecuted?.(response.actionIdentifier || "tap", true);
        } catch (error) {
          console.error("Action processing failed:", error);
          onActionExecuted?.(response.actionIdentifier || "tap", false);
        }
      }
    );

    // App state listener for background processing
    appStateListener.current = AppState.addEventListener("change", async (nextAppState) => {
      if (nextAppState === "active") {
        // Refresh data when app becomes active
        await refreshData();
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
      appStateListener.current?.remove();
    };
  }, [onNotificationReceived, onActionExecuted, onFilterApplied, enableActionHistory]);

  // ============================================================================
  // Auto-retry for failed actions
  // ============================================================================

  useEffect(() => {
    if (enableAutoRetry) {
      retryInterval.current = setInterval(async () => {
        try {
          await retryPendingActions();
        } catch (error) {
          console.warn("Auto-retry failed:", error);
        }
      }, 30000); // Every 30 seconds

      return () => {
        if (retryInterval.current) {
          clearInterval(retryInterval.current);
        }
      };
    }
    return undefined;
  }, [enableAutoRetry]);

  // ============================================================================
  // Core Functions
  // ============================================================================

  const refreshData = useCallback(async () => {
    try {
      const [
        notificationSettings,
        sounds,
        vibrations,
        alerts,
        stats,
        history,
      ] = await Promise.all([
        getNotificationSettings(),
        getAvailableSounds(),
        Promise.resolve(getAvailableVibrations()),
        getKeywordAlerts(),
        getFilterStatistics(),
        enableActionHistory ? getActionHistory() : Promise.resolve([]),
      ]);

      setSettings(notificationSettings);
      setAvailableSounds(sounds);
      setAvailableVibrations(vibrations);
      setKeywordAlerts(alerts);
      setFilterStats(stats);
      setActionHistory(history.slice(-50)); // Keep last 50
    } catch (error) {
      console.error("Failed to refresh data:", error);
    }
  }, [enableActionHistory]);

  const register = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      const token = await registerForPushNotifications();

      if (token) {
        setExpoPushToken(token);
        return true;
      }

      setError("Failed to get push token");
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      setError(message);
      return false;
    }
  }, []);

  const updateSettings = useCallback(async (updates: Partial<NotificationSettings>) => {
    try {
      const newSettings = await saveNotificationSettings(updates);
      setSettings(newSettings);
    } catch (err) {
      console.error("Failed to update settings:", err);
      throw err;
    }
  }, []);

  // ============================================================================
  // Rich Notification Functions
  // ============================================================================

  const createNotification = useCallback(async (
    payload: NotificationPayload,
    options?: {
      media?: NotificationMediaOptions;
      customActions?: NotificationAction[];
      customSound?: string;
      customVibration?: string;
    }
  ): Promise<string> => {
    try {
      // Process media if provided
      let processedMedia;
      if (options?.media) {
        processedMedia = await processNotificationMedia(options.media);
      }

      // Get sound and vibration settings
      const soundSettings = await getSoundForNotification(
        payload.type,
        payload.channelId,
        payload.userId
      );

      // Create rich notification
      return await createRichNotification(payload, {
        imageUrl: processedMedia?.primaryImage || payload.imageUrl,
        customActions: options?.customActions,
      });
    } catch (error) {
      console.error("Failed to create rich notification:", error);
      throw error;
    }
  }, []);

  // ============================================================================
  // Sound and Vibration Functions
  // ============================================================================

  const previewSound = useCallback(async (soundId: string, volume: number = 0.8) => {
    try {
      await playNotificationSound(soundId, volume);
    } catch (error) {
      console.error("Failed to preview sound:", error);
      throw error;
    }
  }, []);

  const previewVibration = useCallback(async (vibrationId: string) => {
    try {
      await triggerNotificationVibration(vibrationId);
    } catch (error) {
      console.error("Failed to preview vibration:", error);
      throw error;
    }
  }, []);

  const previewSoundAndVibration = useCallback(async (
    soundId: string,
    vibrationId: string,
    volume: number = 0.8
  ) => {
    try {
      await triggerNotificationVibration(vibrationId);
      setTimeout(async () => {
        await playNotificationSound(soundId, volume);
      }, 100);
    } catch (error) {
      console.error("Failed to preview sound and vibration:", error);
      throw error;
    }
  }, []);

  // ============================================================================
  // Filtering Functions
  // ============================================================================

  const addKeywordAlert = useCallback(async (
    alert: Omit<KeywordAlert, "id" | "createdAt">
  ): Promise<KeywordAlert> => {
    try {
      const newAlert = await addKeywordAlertService(alert);
      await refreshData();
      return newAlert;
    } catch (error) {
      console.error("Failed to add keyword alert:", error);
      throw error;
    }
  }, [refreshData]);

  const removeKeywordAlert = useCallback(async (alertId: string) => {
    try {
      await deleteKeywordAlert(alertId);
      await refreshData();
    } catch (error) {
      console.error("Failed to remove keyword alert:", error);
      throw error;
    }
  }, [refreshData]);

  const testFilter = useCallback(async (payload: NotificationPayload) => {
    try {
      const result = await applyNotificationFilters(payload);
      return {
        allowed: result.allowed,
        reason: result.reason,
      };
    } catch (error) {
      console.error("Failed to test filter:", error);
      return { allowed: true };
    }
  }, []);

  // ============================================================================
  // Action Management Functions
  // ============================================================================

  const retryFailedActions = useCallback(async () => {
    try {
      await retryPendingActions();
      if (enableActionHistory) {
        const history = await getActionHistory();
        setActionHistory(history.slice(-50));
      }
    } catch (error) {
      console.error("Failed to retry actions:", error);
      throw error;
    }
  }, [enableActionHistory]);

  const clearActionHistory = useCallback(async () => {
    try {
      // Clear the stored history
      await AsyncStorage.removeItem("@hearth/notification_action_history");
      setActionHistory([]);
    } catch (error) {
      console.error("Failed to clear action history:", error);
      throw error;
    }
  }, []);

  // ============================================================================
  // Utility Functions
  // ============================================================================

  const clearAllNotifications = useCallback(async () => {
    try {
      await Notifications.dismissAllNotificationsAsync();
      await clearBadgeCount();
      setNotification(null);
    } catch (error) {
      console.error("Failed to clear notifications:", error);
      throw error;
    }
  }, []);

  // ============================================================================
  // Navigation Helper
  // ============================================================================

  const handleNotificationNavigation = useCallback((data: NotificationPayload) => {
    try {
      switch (data.type) {
        case "message":
        case "mention":
        case "reply":
          if (data.threadId) {
            router.push({
              pathname: "/chat/thread",
              params: { id: data.threadId, channelId: data.channelId },
            });
          } else if (data.channelId) {
            router.push({
              pathname: "/chat/[id]",
              params: { id: data.channelId, serverId: data.serverId },
            });
          }
          break;

        case "dm":
          if (data.channelId) {
            router.push({
              pathname: "/chat/[id]",
              params: { id: data.channelId, isDm: "true" },
            });
          }
          break;

        case "friend_request":
          router.push("/(tabs)/friends");
          break;

        case "server_invite":
          router.push("/(tabs)/invites");
          break;

        case "call":
          if (data.channelId) {
            router.push({
              pathname: "/voice/[id]",
              params: { id: data.channelId },
            });
          }
          break;

        default:
          router.push("/(tabs)");
      }
    } catch (error) {
      console.error("Navigation failed:", error);
      router.push("/(tabs)");
    }
  }, []);

  // ============================================================================
  // Return Hook Result
  // ============================================================================

  return {
    // Basic notification state
    expoPushToken,
    notification,
    settings,
    isLoading,
    error,

    // Rich notification features
    availableSounds,
    availableVibrations,
    keywordAlerts,
    actionHistory,
    filterStats,

    // Core functions
    register,
    updateSettings,

    // Rich notification functions
    createNotification,

    // Sound and vibration
    previewSound,
    previewVibration,
    previewSoundAndVibration,

    // Filtering and alerts
    addKeywordAlert,
    removeKeywordAlert,
    testFilter,

    // Action management
    retryFailedActions,
    clearActionHistory,

    // Utility functions
    refreshData,
    clearAllNotifications,
  };
}

export default useRichNotifications;