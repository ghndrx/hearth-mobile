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

// Notification action types for inline interactions
export type NotificationActionType =
  | "reply"
  | "mark_read"
  | "mute"
  | "join_voice"
  | "accept_friend"
  | "decline_friend"
  | "dismiss";

// Notification action definition
export interface NotificationAction {
  identifier: string;
  title: string;
  type: NotificationActionType;
  destructive?: boolean;
  authenticationRequired?: boolean;
  foreground?: boolean;
  textInput?: {
    buttonTitle: string;
    placeholder: string;
  };
}

// Custom sound definitions
export interface CustomSound {
  id: string;
  name: string;
  fileName: string;
  category: 'default' | 'custom' | 'classic';
  duration?: number;
}

// Rich notification content
export interface RichNotificationContent {
  title: string;
  body: string;
  subtitle?: string;
  attachments?: Array<{
    identifier: string;
    url: string;
    type: 'image' | 'audio' | 'video';
    thumbnailUrl?: string;
  }>;
  actions?: NotificationAction[];
  categoryIdentifier?: string;
  threadIdentifier?: string;
  summaryArgument?: string;
  summaryArgumentCount?: number;
  targetContentIdentifier?: string;
}

// Keyword filter definition
export interface KeywordFilter {
  id: string;
  keyword: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  enabled: boolean;
  notificationType: NotificationType[];
  serverIds?: string[];
  channelIds?: string[];
}

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
  // PN-005: Rich notifications and inline actions
  inlineActions: boolean;
  quickReply: boolean;
  showAvatars: boolean;
  groupNotifications: boolean;
  customSoundId: string;
  keywordFilters: KeywordFilter[];
  richContent: boolean;
  expandableNotifications: boolean;
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
  // PN-005: Rich notifications and inline actions
  inlineActions: true,
  quickReply: true,
  showAvatars: true,
  groupNotifications: true,
  customSoundId: "default",
  keywordFilters: [],
  richContent: true,
  expandableNotifications: true,
};

// Configure default notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const settings = await getNotificationSettings();
    const notificationData = notification.request.content.data || {};

    // PN-005: Check keyword filters if enabled
    if (settings.keywordFilters.length > 0 && notificationData.body) {
      const notificationType = notificationData.type as NotificationType || "message";
      const matchesFilter = matchesKeywordFilter(
        notificationData.body,
        settings.keywordFilters,
        notificationType,
        notificationData.serverId,
        notificationData.channelId
      );

      // If keyword filters are set and this doesn't match any, suppress the notification
      if (!matchesFilter) {
        return {
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: false,
          shouldShowList: false,
        };
      }
    }

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

    // PN-005: Enhanced notification behavior for rich content
    return {
      shouldShowAlert: settings.enabled,
      shouldPlaySound: settings.enabled && settings.sounds,
      shouldSetBadge: settings.enabled && settings.badgeCount,
      shouldShowBanner: settings.enabled,
      shouldShowList: true,
      // iOS-specific rich notification options
      ...(Platform.OS === 'ios' && settings.richContent && {
        shouldShowInLockScreen: true,
        shouldShowInNotificationCenter: true,
        shouldShowInCarPlay: false,
      }),
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

  // PN-005: Setup notification categories for iOS
  await setupNotificationCategories();

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

// PN-005: Custom notification sounds
export const NOTIFICATION_SOUNDS: CustomSound[] = [
  { id: "default", name: "Default", fileName: "default", category: "default" },
  { id: "hearth_classic", name: "Hearth Classic", fileName: "hearth_classic.wav", category: "classic" },
  { id: "soft_ping", name: "Soft Ping", fileName: "soft_ping.wav", category: "default" },
  { id: "gentle_chime", name: "Gentle Chime", fileName: "gentle_chime.wav", category: "default" },
  { id: "message_pop", name: "Message Pop", fileName: "message_pop.wav", category: "default" },
  { id: "mention_alert", name: "Mention Alert", fileName: "mention_alert.wav", category: "default" },
  { id: "call_ring", name: "Call Ring", fileName: "call_ring.wav", category: "default" },
  { id: "water_drop", name: "Water Drop", fileName: "water_drop.wav", category: "classic" },
  { id: "crystal_bell", name: "Crystal Bell", fileName: "crystal_bell.wav", category: "classic" },
  { id: "space_echo", name: "Space Echo", fileName: "space_echo.wav", category: "classic" },
  { id: "forest_bird", name: "Forest Bird", fileName: "forest_bird.wav", category: "classic" },
  { id: "ocean_wave", name: "Ocean Wave", fileName: "ocean_wave.wav", category: "classic" },
];

// PN-005: Predefined notification actions
export const NOTIFICATION_ACTIONS: { [key: string]: NotificationAction } = {
  REPLY: {
    identifier: "REPLY",
    title: "Reply",
    type: "reply",
    foreground: false,
    textInput: {
      buttonTitle: "Send",
      placeholder: "Type your reply...",
    },
  },
  MARK_READ: {
    identifier: "MARK_READ",
    title: "Mark as Read",
    type: "mark_read",
    foreground: false,
  },
  MUTE: {
    identifier: "MUTE",
    title: "Mute",
    type: "mute",
    foreground: false,
  },
  JOIN_VOICE: {
    identifier: "JOIN_VOICE",
    title: "Join Voice",
    type: "join_voice",
    foreground: true,
  },
  ACCEPT_FRIEND: {
    identifier: "ACCEPT_FRIEND",
    title: "Accept",
    type: "accept_friend",
    foreground: false,
  },
  DECLINE_FRIEND: {
    identifier: "DECLINE_FRIEND",
    title: "Decline",
    type: "decline_friend",
    destructive: true,
    foreground: false,
  },
  DISMISS: {
    identifier: "DISMISS",
    title: "Dismiss",
    type: "dismiss",
    foreground: false,
  },
};

// PN-005: Notification categories for grouping actions
export const NOTIFICATION_CATEGORIES = {
  MESSAGE: "MESSAGE_CATEGORY",
  DM: "DM_CATEGORY",
  MENTION: "MENTION_CATEGORY",
  FRIEND_REQUEST: "FRIEND_REQUEST_CATEGORY",
  CALL: "CALL_CATEGORY",
  SERVER_INVITE: "SERVER_INVITE_CATEGORY",
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

// PN-005: Custom sound management
export function getAvailableSounds(): CustomSound[] {
  return NOTIFICATION_SOUNDS;
}

export function getSoundById(soundId: string): CustomSound | undefined {
  return NOTIFICATION_SOUNDS.find(sound => sound.id === soundId);
}

export async function setCustomSound(soundId: string): Promise<void> {
  const settings = await getNotificationSettings();
  await saveNotificationSettings({ customSoundId: soundId });
}

// PN-005: Keyword filter management
export async function addKeywordFilter(filter: Omit<KeywordFilter, 'id'>): Promise<KeywordFilter> {
  const settings = await getNotificationSettings();
  const newFilter: KeywordFilter = {
    ...filter,
    id: `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };

  const updatedFilters = [...settings.keywordFilters, newFilter];
  await saveNotificationSettings({ keywordFilters: updatedFilters });

  return newFilter;
}

export async function removeKeywordFilter(filterId: string): Promise<void> {
  const settings = await getNotificationSettings();
  const updatedFilters = settings.keywordFilters.filter(f => f.id !== filterId);
  await saveNotificationSettings({ keywordFilters: updatedFilters });
}

export async function updateKeywordFilter(filterId: string, updates: Partial<KeywordFilter>): Promise<void> {
  const settings = await getNotificationSettings();
  const updatedFilters = settings.keywordFilters.map(filter =>
    filter.id === filterId ? { ...filter, ...updates } : filter
  );
  await saveNotificationSettings({ keywordFilters: updatedFilters });
}

export function matchesKeywordFilter(
  content: string,
  filters: KeywordFilter[],
  notificationType: NotificationType,
  serverId?: string,
  channelId?: string
): boolean {
  return filters.some(filter => {
    if (!filter.enabled) return false;
    if (!filter.notificationType.includes(notificationType)) return false;
    if (filter.serverIds && serverId && !filter.serverIds.includes(serverId)) return false;
    if (filter.channelIds && channelId && !filter.channelIds.includes(channelId)) return false;

    const searchText = filter.caseSensitive ? content : content.toLowerCase();
    const keyword = filter.caseSensitive ? filter.keyword : filter.keyword.toLowerCase();

    if (filter.wholeWord) {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      return regex.test(searchText);
    } else {
      return searchText.includes(keyword);
    }
  });
}

// PN-005: Rich notification creation
export async function scheduleRichNotification(
  content: RichNotificationContent,
  data?: Record<string, unknown>,
  trigger?: Notifications.NotificationTriggerInput
): Promise<string> {
  const settings = await getNotificationSettings();

  // Get custom sound
  const customSound = getSoundById(settings.customSoundId);
  const soundFileName = customSound?.fileName || "default";

  // Prepare notification content
  const notificationContent: any = {
    title: content.title,
    body: content.body,
    data: {
      ...data,
      richContent: settings.richContent,
      showAvatars: settings.showAvatars,
    },
    sound: settings.sounds ? soundFileName : false,
    vibrate: settings.vibration,
  };

  // Add subtitle if provided and rich content is enabled
  if (content.subtitle && settings.richContent) {
    notificationContent.subtitle = content.subtitle;
  }

  // Add attachments if rich content is enabled
  if (content.attachments && settings.richContent) {
    notificationContent.attachments = content.attachments;
  }

  // Add category for action grouping
  if (content.categoryIdentifier) {
    notificationContent.categoryIdentifier = content.categoryIdentifier;
  }

  // Add thread identifier for grouping
  if (content.threadIdentifier && settings.groupNotifications) {
    notificationContent.threadIdentifier = content.threadIdentifier;
  }

  // Add summary info for grouped notifications
  if (content.summaryArgument && settings.expandableNotifications) {
    notificationContent.summaryArgument = content.summaryArgument;
    notificationContent.summaryArgumentCount = content.summaryArgumentCount;
  }

  return await Notifications.scheduleNotificationAsync({
    content: notificationContent,
    trigger: trigger ?? null,
  });
}

// PN-005: Setup notification categories and actions
export async function setupNotificationCategories(): Promise<void> {
  if (Platform.OS !== "ios") return; // iOS only feature

  const settings = await getNotificationSettings();
  if (!settings.inlineActions) return;

  // Message category with reply, mark read, and mute actions
  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.MESSAGE, [
    NOTIFICATION_ACTIONS.REPLY,
    NOTIFICATION_ACTIONS.MARK_READ,
    NOTIFICATION_ACTIONS.MUTE,
  ]);

  // DM category with reply and mark read actions
  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.DM, [
    NOTIFICATION_ACTIONS.REPLY,
    NOTIFICATION_ACTIONS.MARK_READ,
  ]);

  // Mention category with reply, mark read, and mute actions
  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.MENTION, [
    NOTIFICATION_ACTIONS.REPLY,
    NOTIFICATION_ACTIONS.MARK_READ,
    NOTIFICATION_ACTIONS.MUTE,
  ]);

  // Friend request category with accept and decline actions
  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.FRIEND_REQUEST, [
    NOTIFICATION_ACTIONS.ACCEPT_FRIEND,
    NOTIFICATION_ACTIONS.DECLINE_FRIEND,
  ]);

  // Call category with join voice action
  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.CALL, [
    NOTIFICATION_ACTIONS.JOIN_VOICE,
    NOTIFICATION_ACTIONS.DISMISS,
  ]);

  // Server invite category
  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.SERVER_INVITE, [
    NOTIFICATION_ACTIONS.ACCEPT_FRIEND,
    NOTIFICATION_ACTIONS.DECLINE_FRIEND,
  ]);
}

// PN-005: Handle notification action responses
export async function handleNotificationAction(
  actionIdentifier: string,
  notification: Notifications.Notification,
  textInput?: string
): Promise<void> {
  const notificationData = notification.request.content.data || {};

  try {
    switch (actionIdentifier) {
      case "REPLY":
        if (textInput) {
          await handleQuickReply(notificationData, textInput);
        }
        break;
      case "MARK_READ":
        await handleMarkAsRead(notificationData);
        break;
      case "MUTE":
        await handleMuteConversation(notificationData);
        break;
      case "JOIN_VOICE":
        await handleJoinVoice(notificationData);
        break;
      case "ACCEPT_FRIEND":
        await handleAcceptFriend(notificationData);
        break;
      case "DECLINE_FRIEND":
        await handleDeclineFriend(notificationData);
        break;
      case "DISMISS":
        await handleDismissNotification(notificationData);
        break;
      default:
        console.warn("Unknown notification action:", actionIdentifier);
    }
  } catch (error) {
    console.error("Error handling notification action:", error);
  }
}

// PN-005: Action handlers (placeholder implementations)
async function handleQuickReply(data: any, message: string): Promise<void> {
  // TODO: Implement quick reply functionality
  console.log("Quick reply:", message, "to:", data);
  // This would typically call an API endpoint to send the message
}

async function handleMarkAsRead(data: any): Promise<void> {
  // TODO: Implement mark as read functionality
  console.log("Mark as read:", data);
  // This would typically call an API endpoint to mark messages as read
}

async function handleMuteConversation(data: any): Promise<void> {
  // TODO: Implement mute conversation functionality
  console.log("Mute conversation:", data);
  // This would typically call an API endpoint to mute the conversation
}

async function handleJoinVoice(data: any): Promise<void> {
  // TODO: Implement join voice functionality
  console.log("Join voice:", data);
  // This would typically navigate to the voice channel or call
}

async function handleAcceptFriend(data: any): Promise<void> {
  // TODO: Implement accept friend request functionality
  console.log("Accept friend:", data);
  // This would typically call an API endpoint to accept the friend request
}

async function handleDeclineFriend(data: any): Promise<void> {
  // TODO: Implement decline friend request functionality
  console.log("Decline friend:", data);
  // This would typically call an API endpoint to decline the friend request
}

async function handleDismissNotification(data: any): Promise<void> {
  // TODO: Implement dismiss notification functionality
  console.log("Dismiss notification:", data);
  // This would typically just dismiss the notification
}

export type NotificationResponse = Notifications.NotificationResponse;
export type Notification = Notifications.Notification;
