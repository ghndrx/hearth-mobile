/**
 * Rich Notification Categories
 *
 * Defines notification categories with inline reply actions for both
 * iOS (APNs UITextInputAcceptAction) and Android (FCM remoteInput).
 *
 * expo-notifications handles platform-specific details internally.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Category identifiers
export const NOTIFICATION_CATEGORY = {
  MESSAGE: 'hearth_message',
  CHAT_REPLY: 'hearth_chat_reply',
  MENTION: 'hearth_mention',
} as const;

// Action identifiers
export const NOTIFICATION_ACTION = {
  REPLY: 'hearth_reply',
  MARK_READ: 'hearth_mark_read',
  VIEW: 'hearth_view',
} as const;

// Reply action button text
const REPLY_BUTTON_TEXT = 'Reply';

// Data keys for passing data through notifications
export const NOTIFICATION_DATA_KEYS = {
  CONVERSATION_ID: 'conversationId',
  SENDER_ID: 'senderId',
  SENDER_NAME: 'senderName',
  MESSAGE_ID: 'messageId',
  THREAD_ID: 'threadId',
  NOTIFICATION_TYPE: 'notificationType',
  TIMESTAMP: 'timestamp',
} as const;

export interface RichNotificationCategory {
  categoryId: string;
  actions: Notifications.NotificationAction[];
}

export interface NotificationReplyData {
  conversationId: string;
  senderId: string;
  senderName: string;
  messageId: string;
  threadId?: string;
  text: string;
  timestamp: number;
}

/**
 * Get all notification categories with actions
 */
export function getRichNotificationCategories(): RichNotificationCategory[] {
  return [
    // Chat reply category - supports inline reply
    {
      categoryId: NOTIFICATION_CATEGORY.CHAT_REPLY,
      actions: [
        {
          identifier: NOTIFICATION_ACTION.REPLY,
          buttonTitle: REPLY_BUTTON_TEXT,
          options: {
            opensAppToForeground: false,
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
      ],
    },
    // Message notification category
    {
      categoryId: NOTIFICATION_CATEGORY.MESSAGE,
      actions: [
        {
          identifier: NOTIFICATION_ACTION.VIEW,
          buttonTitle: 'View',
          options: {
            opensAppToForeground: true,
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
        {
          identifier: NOTIFICATION_ACTION.MARK_READ,
          buttonTitle: 'Mark Read',
          options: {
            opensAppToForeground: false,
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
      ],
    },
    // Mention notification category
    {
      categoryId: NOTIFICATION_CATEGORY.MENTION,
      actions: [
        {
          identifier: NOTIFICATION_ACTION.REPLY,
          buttonTitle: REPLY_BUTTON_TEXT,
          options: {
            opensAppToForeground: false,
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
        {
          identifier: NOTIFICATION_ACTION.VIEW,
          buttonTitle: 'View',
          options: {
            opensAppToForeground: true,
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
      ],
    },
  ];
}

/**
 * Register all rich notification categories with the system
 */
export async function registerRichNotificationCategories(): Promise<void> {
  const categories = getRichNotificationCategories();

  try {
    // Register each category individually
    // Note: expo-notifications uses setNotificationCategoryAsync (singular)
    for (const cat of categories) {
      await Notifications.setNotificationCategoryAsync(cat.categoryId, cat.actions);
    }
    console.log('Rich notification categories registered successfully');
  } catch (error) {
    console.error('Failed to register rich notification categories:', error);
    throw error;
  }
}

/**
 * Extract reply text from notification response
 * Works for both iOS (UITextInputAcceptAction) and Android (remoteInput)
 */
export function extractReplyText(
  response: Notifications.NotificationResponse
): string | null {
  try {
    const userText = response.userText;
    const actionId = response.actionIdentifier;

    // Only extract text for reply actions
    if (actionId !== NOTIFICATION_ACTION.REPLY) {
      return null;
    }

    // Check if userText exists and has content
    if (!userText || typeof userText !== 'string') {
      return null;
    }

    const trimmedText = userText.trim();
    if (trimmedText.length === 0) {
      return null;
    }

    return trimmedText;
  } catch (error) {
    console.error('Failed to extract reply text:', error);
    return null;
  }
}

/**
 * Build notification content with rich category for chat reply
 */
export function buildChatReplyNotificationContent(params: {
  title: string;
  body: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  messageId: string;
  threadId?: string;
}): Notifications.NotificationContentInput {
  const { title, body, conversationId, senderId, senderName, messageId, threadId } = params;

  const data: Record<string, string> = {
    [NOTIFICATION_DATA_KEYS.CONVERSATION_ID]: conversationId,
    [NOTIFICATION_DATA_KEYS.SENDER_ID]: senderId,
    [NOTIFICATION_DATA_KEYS.SENDER_NAME]: senderName,
    [NOTIFICATION_DATA_KEYS.MESSAGE_ID]: messageId,
    [NOTIFICATION_DATA_KEYS.NOTIFICATION_TYPE]: NOTIFICATION_CATEGORY.CHAT_REPLY,
    [NOTIFICATION_DATA_KEYS.TIMESTAMP]: Date.now().toString(),
  };

  if (threadId) {
    data[NOTIFICATION_DATA_KEYS.THREAD_ID] = threadId;
  }

  return {
    title,
    body,
    data,
    categoryIdentifier: NOTIFICATION_CATEGORY.CHAT_REPLY,
    sticky: false,
  };
}

/**
 * Build notification content with mention category
 */
export function buildMentionNotificationContent(params: {
  title: string;
  body: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  messageId: string;
  threadId?: string;
}): Notifications.NotificationContentInput {
  const { title, body, conversationId, senderId, senderName, messageId, threadId } = params;

  const data: Record<string, string> = {
    [NOTIFICATION_DATA_KEYS.CONVERSATION_ID]: conversationId,
    [NOTIFICATION_DATA_KEYS.SENDER_ID]: senderId,
    [NOTIFICATION_DATA_KEYS.SENDER_NAME]: senderName,
    [NOTIFICATION_DATA_KEYS.MESSAGE_ID]: messageId,
    [NOTIFICATION_DATA_KEYS.NOTIFICATION_TYPE]: NOTIFICATION_CATEGORY.MENTION,
    [NOTIFICATION_DATA_KEYS.TIMESTAMP]: Date.now().toString(),
  };

  if (threadId) {
    data[NOTIFICATION_DATA_KEYS.THREAD_ID] = threadId;
  }

  return {
    title,
    body,
    data,
    categoryIdentifier: NOTIFICATION_CATEGORY.MENTION,
    sticky: false,
  };
}

/**
 * Parse notification data into structured reply data
 */
export function parseNotificationReplyData(
  notification: Notifications.Notification
): NotificationReplyData | null {
  try {
    const data = notification.request.content.data as Record<string, string>;

    const conversationId = data?.[NOTIFICATION_DATA_KEYS.CONVERSATION_ID];
    const senderId = data?.[NOTIFICATION_DATA_KEYS.SENDER_ID];
    const senderName = data?.[NOTIFICATION_DATA_KEYS.SENDER_NAME];
    const messageId = data?.[NOTIFICATION_DATA_KEYS.MESSAGE_ID];
    const threadId = data?.[NOTIFICATION_DATA_KEYS.THREAD_ID];
    const timestamp = data?.[NOTIFICATION_DATA_KEYS.TIMESTAMP];

    if (!conversationId || !senderId || !messageId) {
      console.warn('Missing required fields in notification data');
      return null;
    }

    return {
      conversationId,
      senderId,
      senderName: senderName || 'Unknown',
      messageId,
      threadId,
      text: notification.request.content.body || '',
      timestamp: timestamp ? parseInt(timestamp, 10) : Date.now(),
    };
  } catch (error) {
    console.error('Failed to parse notification reply data:', error);
    return null;
  }
}

/**
 * Check if a notification response is a reply action
 */
export function isReplyAction(response: Notifications.NotificationResponse): boolean {
  return response.actionIdentifier === NOTIFICATION_ACTION.REPLY;
}

/**
 * Check if a notification is a chat reply notification
 */
export function isChatReplyNotification(notification: Notifications.Notification): boolean {
  const data = notification.request.content.data as Record<string, string>;
  return data?.[NOTIFICATION_DATA_KEYS.NOTIFICATION_TYPE] === NOTIFICATION_CATEGORY.CHAT_REPLY;
}

/**
 * Check if a notification is a mention notification
 */
export function isMentionNotification(notification: Notifications.Notification): boolean {
  const data = notification.request.content.data as Record<string, string>;
  return data?.[NOTIFICATION_DATA_KEYS.NOTIFICATION_TYPE] === NOTIFICATION_CATEGORY.MENTION;
}
