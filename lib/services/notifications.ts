import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { registerDevice, unregisterDevice } from "./api";

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
export interface NotificationPayload extends Record<string, unknown> {
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
  handleNotification: async (_notification) => {
    const settings = await getNotificationSettings();
    
    // Check quiet hours
    if (settings.quietHoursEnabled && isQuietHours(settings)) {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: true, // Still add to notification center
      };
    }

    return {
      shouldShowAlert: settings.enabled,
      shouldPlaySound: settings.enabled && settings.sounds,
      shouldSetBadge: settings.enabled && settings.badgeCount,
      shouldShowBanner: settings.enabled,
      shouldShowList: true,
    };
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
