/**
 * Android Rich Notifications - PN-005
 *
 * Android-specific implementation for rich notifications with inline actions.
 * Unlike iOS which uses categories, Android uses action buttons directly on notifications.
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { NotificationPayload, NotificationType } from "./notifications";
import type { NotificationAction, ActionResponse } from "./richNotificationActions";

// ============================================================================
// Android Action Types
// ============================================================================

export interface AndroidNotificationAction {
  id: string;
  title: string;
  icon?: string; // Android icon resource or emoji
  inputs?: {
    placeholder: string;
    choices?: string[];
  };
  semanticAction?: "reply" | "mark_as_read" | "delete" | "archive" | "call" | "none";
  showsUserInterface?: boolean;
}

export interface AndroidNotificationStyle {
  type: "big_text" | "big_picture" | "inbox" | "messaging";
  title?: string;
  summaryText?: string;
  bigText?: string;
  bigPictureUrl?: string;
  lines?: string[];
  messages?: {
    text: string;
    timestamp: number;
    sender?: string;
  }[];
}

// ============================================================================
// Android Rich Notification Builder
// ============================================================================

/**
 * Build Android notification with rich actions and media
 */
export function buildAndroidRichNotification(
  payload: NotificationPayload,
  options?: {
    style?: AndroidNotificationStyle;
    actions?: AndroidNotificationAction[];
    largeIcon?: string;
    color?: string;
    priority?: "min" | "low" | "default" | "high" | "max";
    groupKey?: string;
    sortKey?: string;
  }
): Notifications.NotificationRequestInput {
  const actions = options?.actions || getDefaultActionsForType(payload.type);
  const style = options?.style || getDefaultStyleForType(payload.type, payload);

  const content: Notifications.NotificationContentInput = {
    title: payload.title,
    body: payload.body,
    data: {
      ...payload,
      richNotification: true,
      androidActions: actions.map(a => a.id),
      style: style.type,
    },
    sound: true,
    color: options?.color || "#5865f2", // Discord blue
    // Add rich media
    ...(payload.imageUrl && {
      attachments: [
        {
          identifier: "image",
          url: payload.imageUrl,
          type: "public.image",
        },
      ],
    }),
  };

  // Android-specific properties
  if (Platform.OS === "android") {
    // Group notifications
    if (options?.groupKey) {
      content.data = {
        ...content.data,
        groupKey: options.groupKey,
        sortKey: options.sortKey || Date.now().toString(),
      };
    }

    // Add style information for rich content
    if (style.type === "big_picture" && style.bigPictureUrl) {
      content.attachments = [
        {
          identifier: "big_picture",
          url: style.bigPictureUrl,
          type: "public.image",
        },
      ];
    }

    // Store action information for handling
    content.data = {
      ...content.data,
      androidStyle: style,
      availableActions: actions,
    };
  }

  return {
    content,
    trigger: null,
  };
}

/**
 * Get default actions for notification type
 */
export function getDefaultActionsForType(type: NotificationType): AndroidNotificationAction[] {
  switch (type) {
    case "message":
      return [
        {
          id: "reply",
          title: "Reply",
          icon: "💬",
          inputs: {
            placeholder: "Type a reply...",
            choices: ["👍", "Thanks!", "On my way!", "Sure!"],
          },
          semanticAction: "reply",
          showsUserInterface: false,
        },
        {
          id: "react_thumbs_up",
          title: "👍",
          icon: "👍",
          semanticAction: "none",
          showsUserInterface: false,
        },
        {
          id: "mark_read",
          title: "Mark Read",
          icon: "✓",
          semanticAction: "mark_as_read",
          showsUserInterface: false,
        },
      ];

    case "dm":
      return [
        {
          id: "reply",
          title: "Reply",
          icon: "💬",
          inputs: {
            placeholder: "Type a reply...",
            choices: ["Thanks!", "Will do!", "Got it!", "👍"],
          },
          semanticAction: "reply",
          showsUserInterface: false,
        },
        {
          id: "react",
          title: "React",
          icon: "😊",
          semanticAction: "none",
          showsUserInterface: false,
        },
        {
          id: "mark_read",
          title: "Mark Read",
          icon: "✓",
          semanticAction: "mark_as_read",
          showsUserInterface: false,
        },
      ];

    case "mention":
    case "reply":
      return [
        {
          id: "reply",
          title: "Reply",
          icon: "💬",
          inputs: {
            placeholder: "Reply to mention...",
            choices: ["Thanks for the mention!", "On it!", "👍", "Will check"],
          },
          semanticAction: "reply",
          showsUserInterface: false,
        },
        {
          id: "react_thumbs_up",
          title: "👍",
          icon: "👍",
          semanticAction: "none",
          showsUserInterface: false,
        },
        {
          id: "view",
          title: "View",
          icon: "👁️",
          semanticAction: "none",
          showsUserInterface: true,
        },
      ];

    case "friend_request":
      return [
        {
          id: "accept",
          title: "Accept",
          icon: "✅",
          semanticAction: "none",
          showsUserInterface: false,
        },
        {
          id: "decline",
          title: "Decline",
          icon: "❌",
          semanticAction: "delete",
          showsUserInterface: false,
        },
        {
          id: "view_profile",
          title: "View Profile",
          icon: "👤",
          semanticAction: "none",
          showsUserInterface: true,
        },
      ];

    case "call":
      return [
        {
          id: "join",
          title: "Join",
          icon: "🎤",
          semanticAction: "call",
          showsUserInterface: true,
        },
        {
          id: "decline",
          title: "Decline",
          icon: "📞",
          semanticAction: "delete",
          showsUserInterface: false,
        },
      ];

    case "server_invite":
      return [
        {
          id: "accept",
          title: "Accept",
          icon: "✅",
          semanticAction: "none",
          showsUserInterface: false,
        },
        {
          id: "decline",
          title: "Decline",
          icon: "❌",
          semanticAction: "delete",
          showsUserInterface: false,
        },
      ];

    default:
      return [
        {
          id: "mark_read",
          title: "Mark Read",
          icon: "✓",
          semanticAction: "mark_as_read",
          showsUserInterface: false,
        },
      ];
  }
}

/**
 * Get default notification style for type
 */
export function getDefaultStyleForType(
  type: NotificationType,
  payload: NotificationPayload
): AndroidNotificationStyle {
  switch (type) {
    case "message":
    case "dm":
    case "mention":
    case "reply":
      return {
        type: "messaging",
        messages: [
          {
            text: payload.body,
            timestamp: Date.now(),
            sender: payload.title,
          },
        ],
      };

    case "friend_request":
    case "server_invite":
      return {
        type: "big_text",
        title: payload.title,
        bigText: payload.body,
        summaryText: "Tap to respond",
      };

    case "call":
      return {
        type: "big_text",
        title: payload.title,
        bigText: payload.body,
        summaryText: "Incoming call",
      };

    default:
      if (payload.imageUrl) {
        return {
          type: "big_picture",
          bigPictureUrl: payload.imageUrl,
          summaryText: payload.body,
        };
      }
      return {
        type: "big_text",
        bigText: payload.body,
      };
  }
}

// ============================================================================
// Android Notification Channel Enhancements
// ============================================================================

/**
 * Enhanced Android notification channels with rich media support
 */
export async function setupAndroidRichNotificationChannels(): Promise<void> {
  if (Platform.OS !== "android") return;

  // Enhanced messages channel with rich media
  await Notifications.setNotificationChannelAsync("rich_messages", {
    name: "Rich Messages",
    description: "Messages with inline actions and media",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#5865f2",
    sound: "default",
    enableVibrate: true,
    showBadge: true,
    enableLights: true,
  });

  // Enhanced DM channel
  await Notifications.setNotificationChannelAsync("rich_dm", {
    name: "Direct Messages",
    description: "Private messages with quick actions",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#5865f2",
    sound: "default",
    enableVibrate: true,
    showBadge: true,
    enableLights: true,
  });

  // Enhanced mentions channel
  await Notifications.setNotificationChannelAsync("rich_mentions", {
    name: "Mentions & Replies",
    description: "When someone mentions you with quick reply",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 200, 500],
    lightColor: "#ed4245",
    sound: "default",
    enableVibrate: true,
    showBadge: true,
    enableLights: true,
  });

  // Enhanced voice channel
  await Notifications.setNotificationChannelAsync("rich_voice", {
    name: "Voice Channels",
    description: "Voice activity with quick join actions",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 1000, 500, 1000],
    lightColor: "#3ba55c",
    sound: "default",
    enableVibrate: true,
    showBadge: true,
    bypassDnd: true,
    enableLights: true,
  });

  // Enhanced social channel
  await Notifications.setNotificationChannelAsync("rich_social", {
    name: "Friend Requests & Invites",
    description: "Social notifications with quick accept/decline",
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: "#57f287",
    sound: "default",
    showBadge: true,
    enableLights: true,
  });

  console.log("Android rich notification channels configured");
}

// ============================================================================
// Android Action Handling
// ============================================================================

/**
 * Handle Android notification action response
 */
export async function handleAndroidActionResponse(
  response: Notifications.NotificationResponse
): Promise<ActionResponse | null> {
  if (Platform.OS !== "android") return null;

  const data = response.notification.request.content.data as NotificationPayload & {
    androidActions?: string[];
    availableActions?: AndroidNotificationAction[];
  };

  // Extract action ID from response
  const actionId = response.actionIdentifier;
  if (!actionId || actionId === "default") return null;

  // Find the corresponding action
  const action = data.availableActions?.find(a => a.id === actionId);
  if (!action) return null;

  return {
    actionId,
    categoryId: `android_${data.type}`,
    notificationId: response.notification.request.identifier,
    userText: response.userText,
    timestamp: Date.now(),
    data,
  };
}

/**
 * Create rich Android notification
 */
export async function createAndroidRichNotification(
  payload: NotificationPayload,
  options?: {
    groupKey?: string;
    customActions?: AndroidNotificationAction[];
    customStyle?: AndroidNotificationStyle;
    priority?: "min" | "low" | "default" | "high" | "max";
  }
): Promise<string> {
  const notificationRequest = buildAndroidRichNotification(payload, {
    ...options,
    groupKey: options?.groupKey || `${payload.type}_${payload.channelId || 'default'}`,
  });

  return await Notifications.scheduleNotificationAsync(notificationRequest);
}

// ============================================================================
// Notification Grouping for Android
// ============================================================================

/**
 * Create group summary notification for Android
 */
export async function createAndroidGroupSummary(
  groupKey: string,
  notifications: NotificationPayload[],
  type: NotificationType
): Promise<string> {
  const count = notifications.length;
  const lastNotification = notifications[notifications.length - 1];

  const summaryContent: Notifications.NotificationContentInput = {
    title: `${count} new ${type === 'dm' ? 'messages' : 'notifications'}`,
    body: lastNotification.body,
    data: {
      groupSummary: true,
      groupKey,
      type,
      count,
    },
    sound: false, // No sound for summary
  };

  return await Notifications.scheduleNotificationAsync({
    content: summaryContent,
    trigger: null,
  });
}

// Types are exported at the top of the file