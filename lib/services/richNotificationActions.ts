/**
 * Rich Notification Actions Service - PN-005
 *
 * Handles advanced inline actions for notifications including:
 * - Quick emoji reactions
 * - Voice channel join actions
 * - Message forwarding
 * - Quick replies with suggestions
 * - Media attachments
 * - Custom action buttons
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NotificationPayload } from "./notifications";

const ACTION_CACHE_KEY = "@hearth/notification_actions";
const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡"];
const VOICE_ACTIONS = ["join", "mute", "unmute", "leave"];

// ============================================================================
// Types
// ============================================================================

export type NotificationActionType =
  | "reply"
  | "quick_reply"
  | "emoji_reaction"
  | "mark_read"
  | "mute"
  | "unmute"
  | "join_voice"
  | "leave_voice"
  | "forward"
  | "view_thread"
  | "accept_invite"
  | "decline_invite"
  | "custom";

export interface NotificationAction {
  id: string;
  type: NotificationActionType;
  title: string;
  subtitle?: string;
  icon?: string; // Emoji or icon name
  textInput?: {
    placeholder: string;
    buttonTitle: string;
    suggestions?: string[];
  };
  destructive?: boolean;
  authRequired?: boolean;
  foregroundActivation?: boolean;
  data?: Record<string, any>;
}

export interface RichNotificationCategory {
  categoryId: string;
  displayName: string;
  description?: string;
  actions: NotificationAction[];
  summaryFormat?: string; // iOS grouped notification summary
}

export interface ActionResponse {
  actionId: string;
  categoryId: string;
  notificationId: string;
  userText?: string;
  timestamp: number;
  data: NotificationPayload;
}

export interface ActionHandler {
  (response: ActionResponse): Promise<void>;
}

// ============================================================================
// Rich Notification Categories
// ============================================================================

/**
 * Enhanced message notification with quick actions
 */
export const MESSAGE_CATEGORY: RichNotificationCategory = {
  categoryId: "rich_message",
  displayName: "Message",
  description: "Server and channel messages with quick actions",
  summaryFormat: "%u new messages in %@",
  actions: [
    {
      id: "quick_reply",
      type: "quick_reply",
      title: "Reply",
      icon: "💬",
      textInput: {
        placeholder: "Type a reply...",
        buttonTitle: "Send",
        suggestions: ["👍", "Thanks!", "On my way!", "Sure!"],
      },
      foregroundActivation: false,
    },
    {
      id: "emoji_react_thumbs_up",
      type: "emoji_reaction",
      title: "👍",
      icon: "👍",
      foregroundActivation: false,
      data: { emoji: "👍" },
    },
    {
      id: "emoji_react_heart",
      type: "emoji_reaction",
      title: "❤️",
      icon: "❤️",
      foregroundActivation: false,
      data: { emoji: "❤️" },
    },
    {
      id: "mark_read",
      type: "mark_read",
      title: "Mark Read",
      icon: "✓",
      foregroundActivation: false,
    },
    {
      id: "view_thread",
      type: "view_thread",
      title: "View",
      icon: "👁️",
      foregroundActivation: true,
    },
  ],
};

/**
 * Direct message category with enhanced privacy actions
 */
export const DM_CATEGORY: RichNotificationCategory = {
  categoryId: "rich_dm",
  displayName: "Direct Message",
  description: "Private messages with quick response options",
  actions: [
    {
      id: "quick_reply",
      type: "quick_reply",
      title: "Reply",
      icon: "💬",
      textInput: {
        placeholder: "Type a reply...",
        buttonTitle: "Send",
        suggestions: ["Thanks!", "Will do!", "Got it!", "👍"],
      },
      foregroundActivation: false,
    },
    {
      id: "emoji_react",
      type: "emoji_reaction",
      title: "React",
      icon: "😊",
      foregroundActivation: false,
      data: { showPicker: true },
    },
    {
      id: "mark_read",
      type: "mark_read",
      title: "Mark Read",
      icon: "✓",
      foregroundActivation: false,
    },
    {
      id: "mute",
      type: "mute",
      title: "Mute",
      icon: "🔇",
      destructive: true,
      foregroundActivation: false,
    },
  ],
};

/**
 * Voice channel notification with join/leave actions
 */
export const VOICE_CATEGORY: RichNotificationCategory = {
  categoryId: "rich_voice",
  displayName: "Voice Channel",
  description: "Voice channel activity with quick join options",
  actions: [
    {
      id: "join_voice",
      type: "join_voice",
      title: "Join",
      icon: "🎤",
      foregroundActivation: true,
      authRequired: true,
    },
    {
      id: "quick_reply",
      type: "quick_reply",
      title: "Reply in Text",
      icon: "💬",
      textInput: {
        placeholder: "Say something...",
        buttonTitle: "Send",
      },
      foregroundActivation: false,
    },
    {
      id: "mute",
      type: "mute",
      title: "Mute Channel",
      icon: "🔇",
      destructive: true,
      foregroundActivation: false,
    },
  ],
};

/**
 * Friend request category with accept/decline
 */
export const FRIEND_REQUEST_CATEGORY: RichNotificationCategory = {
  categoryId: "rich_friend_request",
  displayName: "Friend Request",
  description: "Friend requests with quick response",
  actions: [
    {
      id: "accept_invite",
      type: "accept_invite",
      title: "Accept",
      icon: "✅",
      foregroundActivation: false,
      authRequired: true,
    },
    {
      id: "decline_invite",
      type: "decline_invite",
      title: "Decline",
      icon: "❌",
      destructive: true,
      foregroundActivation: false,
      authRequired: true,
    },
    {
      id: "view_profile",
      type: "custom",
      title: "View Profile",
      icon: "👤",
      foregroundActivation: true,
    },
  ],
};

/**
 * Mention category with priority actions
 */
export const MENTION_CATEGORY: RichNotificationCategory = {
  categoryId: "rich_mention",
  displayName: "Mention",
  description: "User mentions with quick response options",
  summaryFormat: "%u new mentions",
  actions: [
    {
      id: "quick_reply",
      type: "quick_reply",
      title: "Reply",
      icon: "💬",
      textInput: {
        placeholder: "Reply to mention...",
        buttonTitle: "Send",
        suggestions: ["Thanks for the mention!", "On it!", "👍", "Will check"],
      },
      foregroundActivation: false,
    },
    {
      id: "emoji_react_thumbs_up",
      type: "emoji_reaction",
      title: "👍",
      icon: "👍",
      foregroundActivation: false,
      data: { emoji: "👍" },
    },
    {
      id: "view_thread",
      type: "view_thread",
      title: "View",
      icon: "👁️",
      foregroundActivation: true,
    },
    {
      id: "mark_read",
      type: "mark_read",
      title: "Mark Read",
      icon: "✓",
      foregroundActivation: false,
    },
  ],
};

// ============================================================================
// Action Registry
// ============================================================================

export const ALL_CATEGORIES = [
  MESSAGE_CATEGORY,
  DM_CATEGORY,
  VOICE_CATEGORY,
  FRIEND_REQUEST_CATEGORY,
  MENTION_CATEGORY,
];

// ============================================================================
// Action Response Cache
// ============================================================================

/**
 * Cache action responses locally for offline handling and retry
 */
export async function cacheActionResponse(response: ActionResponse): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(ACTION_CACHE_KEY);
    const cache = existing ? JSON.parse(existing) : [];

    cache.push({
      ...response,
      cached: true,
      retryCount: 0,
    });

    // Keep only last 50 responses
    if (cache.length > 50) {
      cache.splice(0, cache.length - 50);
    }

    await AsyncStorage.setItem(ACTION_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error("Failed to cache action response:", error);
  }
}

/**
 * Get cached action responses for retry/sync
 */
export async function getCachedActionResponses(): Promise<ActionResponse[]> {
  try {
    const cached = await AsyncStorage.getItem(ACTION_CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    console.error("Failed to get cached action responses:", error);
    return [];
  }
}

/**
 * Clear action response cache
 */
export async function clearActionCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ACTION_CACHE_KEY);
  } catch (error) {
    console.error("Failed to clear action cache:", error);
  }
}

// ============================================================================
// Platform-Specific Setup
// ============================================================================

/**
 * Setup iOS notification categories with rich actions
 */
export async function setupIOSRichNotificationCategories(): Promise<void> {
  if (Platform.OS !== "ios") return;

  for (const category of ALL_CATEGORIES) {
    const actions: Notifications.NotificationAction[] = category.actions.map(
      (action) => ({
        identifier: action.id,
        buttonTitle: action.title,
        options: {
          opensAppToForeground: action.foregroundActivation ?? false,
          isAuthenticationRequired: action.authRequired ?? false,
          isDestructive: action.destructive ?? false,
        },
        ...(action.textInput && {
          textInput: {
            submitButtonTitle: action.textInput.buttonTitle,
            placeholder: action.textInput.placeholder,
          },
        }),
      })
    );

    await Notifications.setNotificationCategoryAsync(
      category.categoryId,
      actions,
      {
        ...(category.summaryFormat && {
          intentIdentifiers: [],
        }),
      }
    );
  }

  console.log("Rich iOS notification categories configured");
}

/**
 * Setup Android notification actions (custom implementation)
 */
export async function setupAndroidRichNotificationActions(): Promise<void> {
  if (Platform.OS !== "android") return;

  // Android uses different approach - actions are added per notification
  // This prepares the action handling infrastructure
  console.log("Rich Android notification actions configured");
}

// ============================================================================
// Action Handler Registry
// ============================================================================

const actionHandlers = new Map<string, ActionHandler>();

/**
 * Register a handler for a specific action type
 */
export function registerActionHandler(
  actionType: NotificationActionType,
  handler: ActionHandler
): void {
  actionHandlers.set(actionType, handler);
}

/**
 * Get handler for action type
 */
export function getActionHandler(actionType: NotificationActionType): ActionHandler | null {
  return actionHandlers.get(actionType) || null;
}

/**
 * Execute action handler if registered
 */
export async function executeActionHandler(response: ActionResponse): Promise<boolean> {
  try {
    // Cache the response first
    await cacheActionResponse(response);

    // Find the action type from the response
    const category = ALL_CATEGORIES.find(c => c.categoryId === response.categoryId);
    const action = category?.actions.find(a => a.id === response.actionId);

    if (!action) {
      console.warn(`No action found for ${response.actionId}`);
      return false;
    }

    const handler = getActionHandler(action.type);
    if (handler) {
      await handler(response);
      return true;
    } else {
      console.warn(`No handler registered for action type: ${action.type}`);
      return false;
    }
  } catch (error) {
    console.error(`Failed to execute action handler:`, error);
    return false;
  }
}

// ============================================================================
// Rich Notification Creation
// ============================================================================

/**
 * Create a rich notification with appropriate category and actions
 */
export async function createRichNotification(
  payload: NotificationPayload,
  options?: {
    imageUrl?: string;
    attachments?: string[];
    customActions?: NotificationAction[];
  }
): Promise<string> {
  // Determine the appropriate category
  let categoryId = "default";

  switch (payload.type) {
    case "message":
      categoryId = MESSAGE_CATEGORY.categoryId;
      break;
    case "dm":
      categoryId = DM_CATEGORY.categoryId;
      break;
    case "mention":
    case "reply":
      categoryId = MENTION_CATEGORY.categoryId;
      break;
    case "friend_request":
      categoryId = FRIEND_REQUEST_CATEGORY.categoryId;
      break;
    case "call":
      categoryId = VOICE_CATEGORY.categoryId;
      break;
  }

  const content: Notifications.NotificationContentInput = {
    title: payload.title,
    body: payload.body,
    data: {
      ...payload,
      richNotification: true,
      categoryUsed: categoryId,
    },
    sound: true,
    categoryIdentifier: categoryId,
    ...(options?.imageUrl && {
      attachments: [
        {
          identifier: "image",
          url: options.imageUrl,
          type: "public.image",
        },
      ],
    }),
  };

  const notificationId = await Notifications.scheduleNotificationAsync({
    content,
    trigger: null,
  });

  return notificationId;
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize rich notification actions system
 */
export async function initializeRichNotificationActions(): Promise<void> {
  try {
    // Setup platform-specific categories and actions
    await setupIOSRichNotificationCategories();
    await setupAndroidRichNotificationActions();

    console.log("Rich notification actions system initialized");
  } catch (error) {
    console.error("Failed to initialize rich notification actions:", error);
    throw error;
  }
}

// Export utility functions
export {
  QUICK_REACTIONS,
  VOICE_ACTIONS,
};