import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { registerDevice, unregisterDevice } from "./api";
import { notificationPermissions } from "./notificationPermissions";

const PUSH_TOKEN_KEY = "@hearth/push_token";
const NOTIFICATION_SETTINGS_KEY = "@hearth/notification_settings";
const DEVICE_REGISTRATION_KEY = "@hearth/device_registration";

// Notification types for categorization and routing
export type NotificationType =
  | "message"
  | "dm"
  | "mention"
  | "reply"
  | "friend_request"
  | "server_invite"
  | "call"
  | "system";

// Data payload structure for notifications
export interface NotificationPayload {
  type: NotificationType;
  serverId?: string;
  channelId?: string;
  messageId?: string;
  threadId?: string;
  userId?: string;
  title: string;
  body: string;
  imageUrl?: string;
}

export interface NotificationSettings {
  enabled: boolean;
  messages: boolean;
  dms: boolean;
  mentions: boolean;
  serverActivity: boolean;
  friendRequests: boolean;
  calls: boolean;
  sounds: boolean;
  vibration: boolean;
  badgeCount: boolean;
  showPreviews: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string; // "07:00"
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  messages: true,
  dms: true,
  mentions: true,
  serverActivity: true,
  friendRequests: true,
  calls: true,
  sounds: true,
  vibration: true,
  badgeCount: true,
  showPreviews: true,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
};

// Configure default notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    try {
      const settings = await getNotificationSettings();

      // Extract notification data for permission checking
      const data = notification.request.content.data as Record<string, any>;
      const notificationType = data?.type as NotificationType;
      const rawSenderId = data?.senderId || data?.userId;
      const senderId: string | undefined = rawSenderId ? String(rawSenderId) : undefined;
      const serverId = data?.serverId;
      const channelId = data?.channelId;
      const content = notification.request.content.body || undefined;

      // Check advanced permissions first
      if (notificationType) {
        const permissionResult = await notificationPermissions.shouldDeliverNotification(
          notificationType,
          senderId,
          serverId,
          channelId,
          content
        );

        if (!permissionResult.shouldDeliver) {
          console.log(`Notification blocked: ${permissionResult.reason}`);
          return {
            shouldShowAlert: false,
            shouldPlaySound: false,
            shouldSetBadge: false,
            shouldShowBanner: false,
            shouldShowList: false, // Don't even add to notification center
          };
        }

        // Apply custom sound/vibration if specified
        if (permissionResult.customizations) {
          // Store customizations in notification data for later use
          data._customizations = permissionResult.customizations;
        }
      }

      // Check quiet hours (unless overridden by priority contact)
      const isPriorityContact = senderId ? await notificationPermissions.isPriorityContact(senderId) : null;
      const shouldBypassQuietHours = isPriorityContact?.notificationOverrides.bypassQuietHours;

      if (settings.quietHoursEnabled && isQuietHours(settings) && !shouldBypassQuietHours) {
        // Check server-specific quiet hours override
        if (serverId) {
          const serverSettings = await notificationPermissions.getServerSetting(serverId);
          if (!serverSettings?.quietHoursOverride) {
            return {
              shouldShowAlert: false,
              shouldPlaySound: false,
              shouldSetBadge: false,
              shouldShowBanner: false,
              shouldShowList: true, // Still add to notification center during quiet hours
            };
          }
        } else {
          return {
            shouldShowAlert: false,
            shouldPlaySound: false,
            shouldSetBadge: false,
            shouldShowBanner: false,
            shouldShowList: true,
          };
        }
      }

      return {
        shouldShowAlert: settings.enabled,
        shouldPlaySound: settings.enabled && settings.sounds,
        shouldSetBadge: settings.enabled && settings.badgeCount,
        shouldShowBanner: settings.enabled,
        shouldShowList: true,
      };
    } catch (error) {
      console.error("Error in notification handler:", error);
      // Fall back to basic settings on error
      const settings = await getNotificationSettings();
      return {
        shouldShowAlert: settings.enabled,
        shouldPlaySound: settings.enabled && settings.sounds,
        shouldSetBadge: settings.enabled && settings.badgeCount,
        shouldShowBanner: settings.enabled,
        shouldShowList: true,
      };
    }
  },
});

function isQuietHours(settings: NotificationSettings): boolean {
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  
  const start = settings.quietHoursStart;
  const end = settings.quietHoursEnd;
  
  // Handle overnight quiet hours (e.g., 22:00 - 07:00)
  if (start > end) {
    return currentTime >= start || currentTime < end;
  }
  
  return currentTime >= start && currentTime < end;
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error("Failed to get notification settings:", error);
  }
  return DEFAULT_NOTIFICATION_SETTINGS;
}

export async function saveNotificationSettings(
  settings: Partial<NotificationSettings>
): Promise<NotificationSettings> {
  try {
    const current = await getNotificationSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(
      NOTIFICATION_SETTINGS_KEY,
      JSON.stringify(updated)
    );
    return updated;
  } catch (error) {
    console.error("Failed to save notification settings:", error);
    throw error;
  }
}

export async function registerForPushNotifications(): Promise<string | null> {
  let token: string | null = null;

  // Check if running on physical device
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return null;
  }

  // Check/request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission denied");
    return null;
  }

  try {
    // Get project ID from app config
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    const pushTokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    token = pushTokenData.data;

    // Store token locally
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

    console.log("Push token:", token);

    // Register device with backend
    await registerDeviceWithBackend(token);

  } catch (error) {
    console.error("Failed to get push token:", error);
    return null;
  }

  // Configure Android notification channel
  if (Platform.OS === "android") {
    await setupAndroidChannels();
  }

  return token;
}

async function registerDeviceWithBackend(token: string): Promise<void> {
  try {
    // Gather device information
    const deviceId = Constants.sessionId || `${Device.brand}-${Device.modelName}-${Date.now()}`;
    const platform = Platform.OS === 'ios' ? 'ios' : 'android' as const;
    const deviceName = Device.deviceName || `${Device.brand} ${Device.modelName}`;
    const osVersion = Device.osVersion || Platform.Version.toString();
    const appVersion = Constants.expoConfig?.version || '1.0.0';

    // Register with backend
    const registration = await registerDevice({
      token,
      platform,
      deviceId,
      deviceName,
      osVersion,
      appVersion,
    });

    // Store registration info locally
    await AsyncStorage.setItem(
      DEVICE_REGISTRATION_KEY,
      JSON.stringify({
        id: registration.id,
        deviceId,
        platform,
        registeredAt: registration.registeredAt,
      })
    );

    console.log("Device registered successfully:", registration.id);
  } catch (error) {
    console.error("Failed to register device with backend:", error);
    // Don't throw - we still want push tokens to work locally
    // Backend registration is an enhancement, not a requirement
  }
}

async function setupAndroidChannels(): Promise<void> {
  // Default channel for general notifications
  await Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#5865f2",
    sound: "default",
  });

  // Messages channel with high priority
  await Notifications.setNotificationChannelAsync("messages", {
    name: "Messages",
    description: "Channel messages from servers",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#5865f2",
    sound: "default",
    enableVibrate: true,
    showBadge: true,
  });

  // Direct messages channel - highest priority for personal messages
  await Notifications.setNotificationChannelAsync("direct-messages", {
    name: "Direct Messages",
    description: "Private messages from friends",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#5865f2",
    sound: "default",
    enableVibrate: true,
    showBadge: true,
    bypassDnd: false,
  });

  // Mentions channel with max priority
  await Notifications.setNotificationChannelAsync("mentions", {
    name: "Mentions",
    description: "When someone mentions you",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 200, 500],
    lightColor: "#ed4245",
    sound: "default",
    enableVibrate: true,
    showBadge: true,
  });

  // Calls channel - urgent with DND bypass for incoming calls
  await Notifications.setNotificationChannelAsync("calls", {
    name: "Calls",
    description: "Incoming voice and video calls",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 1000, 500, 1000],
    lightColor: "#3ba55c",
    sound: "default",
    enableVibrate: true,
    showBadge: true,
    bypassDnd: true,
  });

  // Server activity channel
  await Notifications.setNotificationChannelAsync("server", {
    name: "Server Activity",
    description: "Server events and updates",
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: "#5865f2",
    sound: "default",
    showBadge: true,
  });

  // Friend requests channel
  await Notifications.setNotificationChannelAsync("social", {
    name: "Friend Requests",
    description: "Friend requests and social updates",
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: "#57f287",
    sound: "default",
    showBadge: true,
  });

  // System notifications - low priority
  await Notifications.setNotificationChannelAsync("system", {
    name: "System",
    description: "App updates and system notifications",
    importance: Notifications.AndroidImportance.LOW,
    sound: undefined,
    showBadge: false,
  });
}

// Android notification channel names for reference
export const NOTIFICATION_CHANNELS = {
  DEFAULT: "default",
  MESSAGES: "messages",
  DIRECT_MESSAGES: "direct-messages",
  MENTIONS: "mentions",
  CALLS: "calls",
  SERVER: "server",
  SOCIAL: "social",
  SYSTEM: "system",
} as const;

export async function getStoredPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function clearPushToken(): Promise<void> {
  try {
    // Unregister from backend first
    await unregisterDeviceFromBackend();

    // Clear local storage
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    await AsyncStorage.removeItem(DEVICE_REGISTRATION_KEY);
  } catch (error) {
    console.error("Failed to clear push token:", error);
  }
}

async function unregisterDeviceFromBackend(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(DEVICE_REGISTRATION_KEY);
    if (stored) {
      const registration = JSON.parse(stored);
      await unregisterDevice(registration.deviceId);
      console.log("Device unregistered successfully");
    }
  } catch (error) {
    console.error("Failed to unregister device from backend:", error);
    // Don't throw - cleanup should continue
  }
}

export async function getStoredDeviceRegistration(): Promise<{
  id: string;
  deviceId: string;
  platform: string;
  registeredAt: number;
} | null> {
  try {
    const stored = await AsyncStorage.getItem(DEVICE_REGISTRATION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export async function getPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function setBadgeCount(count: number): Promise<void> {
  const settings = await getNotificationSettings();
  if (settings.badgeCount) {
    await Notifications.setBadgeCountAsync(count);
  }
}

export async function clearBadgeCount(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
  trigger?: Notifications.NotificationTriggerInput
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: trigger ?? null,
  });
}

/**
 * Process and deliver a notification with enhanced permission checking
 */
export async function processAndDeliverNotification(payload: {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  senderId?: string;
  serverId?: string;
  channelId?: string;
  trigger?: Notifications.NotificationTriggerInput;
}): Promise<{ delivered: boolean; notificationId?: string; reason?: string }> {
  try {
    // Check if we should deliver this notification
    const permissionResult = await notificationPermissions.shouldDeliverNotification(
      payload.type,
      payload.senderId,
      payload.serverId,
      payload.channelId,
      payload.body
    );

    if (!permissionResult.shouldDeliver) {
      return {
        delivered: false,
        reason: permissionResult.reason || "Permission denied",
      };
    }

    // Get permission settings for content customization
    const permissions = await notificationPermissions.getPermissionSettings();

    // Customize notification content based on permissions
    let customizedTitle = payload.title;
    let customizedBody = payload.body;

    if (!permissions.showSenderNames && payload.senderId) {
      customizedTitle = customizedTitle.replace(/^[^:]+:/, "New message:");
    }

    if (!permissions.showMessagePreviews) {
      customizedBody = "New message";
    } else if (permissions.maxPreviewLength > 0 && customizedBody.length > permissions.maxPreviewLength) {
      customizedBody = customizedBody.substring(0, permissions.maxPreviewLength) + "...";
    }

    if (!permissions.showServerNames && payload.serverId) {
      customizedTitle = customizedTitle.replace(/#[^:\s]+/, "#channel");
    }

    // Prepare notification data
    const notificationData = {
      ...payload.data,
      type: payload.type,
      senderId: payload.senderId,
      serverId: payload.serverId,
      channelId: payload.channelId,
      originalTitle: payload.title,
      originalBody: payload.body,
      _customizations: permissionResult.customizations,
    };

    // Determine the appropriate channel for Android
    let androidChannelId: string = NOTIFICATION_CHANNELS.DEFAULT;
    switch (payload.type) {
      case "dm":
        androidChannelId = NOTIFICATION_CHANNELS.DIRECT_MESSAGES;
        break;
      case "mention":
        androidChannelId = NOTIFICATION_CHANNELS.MENTIONS;
        break;
      case "message":
        androidChannelId = NOTIFICATION_CHANNELS.MESSAGES;
        break;
      case "call":
        androidChannelId = NOTIFICATION_CHANNELS.CALLS;
        break;
      case "friend_request":
        androidChannelId = NOTIFICATION_CHANNELS.SOCIAL;
        break;
      case "system":
        androidChannelId = NOTIFICATION_CHANNELS.SYSTEM;
        break;
    }

    // Schedule the notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: customizedTitle,
        body: customizedBody,
        data: notificationData,
        sound: true, // Will be handled by the notification handler based on permissions
        badge: permissions.allowNotificationActions ? undefined : 1,
        categoryIdentifier: permissions.allowNotificationActions ? "message_actions" : undefined,
      },
      trigger: payload.trigger ?? null,
    });

    console.log(`Notification delivered: ${notificationId}, type: ${payload.type}, customizations:`, permissionResult.customizations);

    return {
      delivered: true,
      notificationId,
    };

  } catch (error) {
    console.error("Failed to process and deliver notification:", error);
    return {
      delivered: false,
      reason: `Processing error: ${error}`,
    };
  }
}

/**
 * Bulk process notifications with intelligent batching
 */
export async function processBulkNotifications(
  notifications: Array<Parameters<typeof processAndDeliverNotification>[0]>
): Promise<{
  delivered: number;
  blocked: number;
  batched: number;
}> {
  try {
    const permissions = await notificationPermissions.getPermissionSettings();
    let delivered = 0;
    let blocked = 0;
    let batched = 0;

    if (permissions.smartBatching && notifications.length > 1) {
      // Group notifications by sender/server for batching
      const grouped = new Map<string, typeof notifications>();

      notifications.forEach(notification => {
        const key = notification.senderId || notification.serverId || 'general';
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)!.push(notification);
      });

      // Process each group
      for (const [groupKey, groupNotifications] of grouped) {
        if (groupNotifications.length === 1) {
          // Single notification, process normally
          const result = await processAndDeliverNotification(groupNotifications[0]);
          if (result.delivered) delivered++;
          else blocked++;
        } else {
          // Multiple notifications, create a batched notification
          const firstNotification = groupNotifications[0];
          const count = groupNotifications.length;

          const batchedNotification = {
            ...firstNotification,
            title: `${count} new messages`,
            body: groupNotifications.map(n => n.body).join(', '),
            data: {
              ...firstNotification.data,
              batch: true,
              count,
              notifications: groupNotifications.map(n => ({
                type: n.type,
                title: n.title,
                body: n.body,
                data: n.data,
              })),
            },
          };

          const result = await processAndDeliverNotification(batchedNotification);
          if (result.delivered) {
            delivered++;
            batched += count - 1; // All but one were batched
          } else {
            blocked += count;
          }
        }
      }
    } else {
      // Process individually
      for (const notification of notifications) {
        const result = await processAndDeliverNotification(notification);
        if (result.delivered) delivered++;
        else blocked++;
      }
    }

    return { delivered, blocked, batched };
  } catch (error) {
    console.error("Failed to process bulk notifications:", error);
    return { delivered: 0, blocked: notifications.length, batched: 0 };
  }
}

export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function dismissAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}

export type NotificationResponse = Notifications.NotificationResponse;
export type Notification = Notifications.Notification;
