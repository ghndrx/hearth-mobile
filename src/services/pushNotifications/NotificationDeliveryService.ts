/**
 * Notification Delivery Service
 * Handles incoming push notification processing and routing
 * Part of PN-002: Basic push notification delivery pipeline
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import {
  NotificationPayload,
  NotificationType,
  NOTIFICATION_CHANNELS,
  setBadgeCount,
} from '../../../lib/services/notifications';

// Notification data structure from backend
export interface IncomingNotification {
  title: string;
  body: string;
  data: NotificationData;
  priority?: 'high' | 'normal' | 'low';
  channelId?: string;
}

export interface NotificationData {
  type: NotificationType;
  serverId?: string;
  channelId?: string;
  messageId?: string;
  threadId?: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  serverName?: string;
  channelName?: string;
  mentionCount?: number;
  imageUrl?: string;
  soundName?: string;
  clickAction?: string;
}

// Routing configuration for notification types
interface NotificationRoute {
  type: NotificationType;
  getPath: (data: NotificationData) => string | object;
  requiresAuth?: boolean;
  bypassQuietHours?: boolean;
}

// Define routing for different notification types
const NOTIFICATION_ROUTES: NotificationRoute[] = [
  {
    type: 'dm',
    requiresAuth: true,
    bypassQuietHours: false,
    getPath: (data: NotificationData) => ({
      pathname: '/chat/[id]',
      params: { id: data.channelId, isDm: 'true' },
    }),
  },
  {
    type: 'message',
    requiresAuth: true,
    bypassQuietHours: false,
    getPath: (data: NotificationData) =>
      data.threadId
        ? { pathname: '/chat/thread', params: { id: data.threadId, channelId: data.channelId } }
        : { pathname: '/chat/[id]', params: { id: data.channelId, serverId: data.serverId } },
  },
  {
    type: 'mention',
    requiresAuth: true,
    bypassQuietHours: true, // Mentions are high priority
    getPath: (data: NotificationData) =>
      data.threadId
        ? { pathname: '/chat/thread', params: { id: data.threadId, channelId: data.channelId } }
        : { pathname: '/chat/[id]', params: { id: data.channelId, serverId: data.serverId } },
  },
  {
    type: 'reply',
    requiresAuth: true,
    bypassQuietHours: false,
    getPath: (data: NotificationData) => ({
      pathname: '/chat/thread',
      params: { id: data.threadId, channelId: data.channelId },
    }),
  },
  {
    type: 'friend_request',
    requiresAuth: true,
    bypassQuietHours: false,
    getPath: () => '/(tabs)/friends',
  },
  {
    type: 'server_invite',
    requiresAuth: true,
    bypassQuietHours: false,
    getPath: () => '/(tabs)/invites',
  },
  {
    type: 'call',
    requiresAuth: true,
    bypassQuietHours: true, // Calls should always come through
    getPath: (data: NotificationData) => ({
      pathname: '/voice/[id]',
      params: { id: data.channelId },
    }),
  },
  {
    type: 'system',
    requiresAuth: true,
    bypassQuietHours: false,
    getPath: () => '/(tabs)',
  },
];

/**
 * Get the appropriate Android notification channel for a notification type
 */
function getChannelForType(type: NotificationType): string {
  switch (type) {
    case 'dm':
      return NOTIFICATION_CHANNELS.DIRECT_MESSAGES;
    case 'message':
      return NOTIFICATION_CHANNELS.MESSAGES;
    case 'mention':
    case 'reply':
      return NOTIFICATION_CHANNELS.MENTIONS;
    case 'friend_request':
      return NOTIFICATION_CHANNELS.SOCIAL;
    case 'server_invite':
      return NOTIFICATION_CHANNELS.SERVER;
    case 'call':
      return NOTIFICATION_CHANNELS.CALLS;
    case 'system':
    default:
      return NOTIFICATION_CHANNELS.SYSTEM;
  }
}

/**
 * Get route config for notification type
 */
function getRouteForType(type: NotificationType): NotificationRoute | undefined {
  return NOTIFICATION_ROUTES.find((route) => route.type === type);
}

/**
 * Process and display an incoming notification
 * Handles the full pipeline from receipt to display
 */
export async function processIncomingNotification(
  notification: Notifications.Notification
): Promise<void> {
  const { title, body, data } = notification.request.content;

  console.log('[NotificationDelivery] Processing notification:', {
    title,
    type: (data as NotificationData)?.type,
  });

  try {
    // Get the appropriate channel for this notification type
    const notificationType = (data as NotificationData)?.type || 'system';
    const channelId = getChannelForType(notificationType);

    // Log notification processing
    console.log('[NotificationDelivery] Routing to channel:', channelId);

    // Update badge count
    await updateBadgeCount(notificationType);

  } catch (error) {
    console.error('[NotificationDelivery] Error processing notification:', error);
  }
}

/**
 * Handle notification tap - navigate to appropriate screen
 */
export function handleNotificationTap(
  response: Notifications.NotificationResponse
): void {
  const data = response.notification.request.content.data as NotificationData;

  console.log('[NotificationDelivery] Notification tapped:', data?.type);

  // Clear badge when user interacts
  clearBadge();

  // Find route for notification type
  const route = getRouteForType(data?.type);

  if (route) {
    const path = route.getPath(data);
    console.log('[NotificationDelivery] Navigating to:', path);

    // Navigate using expo-router
    if (typeof path === 'string') {
      router.push(path as any);
    } else {
      router.push(path as any);
    }
  } else {
    // Default fallback - go to home
    console.log('[NotificationDelivery] No route found, going to home');
    router.push('/(tabs)');
  }
}

/**
 * Update badge count based on notification type
 */
async function updateBadgeCount(type: NotificationType): Promise<void> {
  try {
    // For messages and mentions, we would typically fetch the unread count
    // from the server. For now, we increment the badge.
    if (type === 'dm' || type === 'message' || type === 'mention') {
      const currentCount = await Notifications.getBadgeCountAsync();
      await setBadgeCount(currentCount + 1);
    }
  } catch (error) {
    console.error('[NotificationDelivery] Error updating badge:', error);
  }
}

/**
 * Clear badge count
 */
async function clearBadge(): Promise<void> {
  try {
    await setBadgeCount(0);
  } catch (error) {
    console.error('[NotificationDelivery] Error clearing badge:', error);
  }
}

/**
 * Get notification display options based on type
 * Customizes sound, vibration, and priority per notification type
 */
export function getDisplayOptions(
  type: NotificationType,
  priority: 'high' | 'normal' | 'low' = 'normal'
): {
  sound?: boolean | string;
  vibrationPattern?: number[];
  bypassDnd?: boolean;
} {
  const baseOptions = {
    sound: true,
    vibrationPattern: [0, 250, 250, 250],
    bypassDnd: false,
  };

  switch (type) {
    case 'dm':
      return {
        ...baseOptions,
        sound: 'default',
        bypassDnd: false,
      };

    case 'mention':
    case 'reply':
      return {
        ...baseOptions,
        sound: 'mention',
        vibrationPattern: [0, 500, 200, 500],
        bypassDnd: true, // High priority notifications can break DND
      };

    case 'call':
      return {
        ...baseOptions,
        sound: 'call',
        vibrationPattern: [0, 1000, 500, 1000],
        bypassDnd: true,
      };

    case 'friend_request':
    case 'server_invite':
      return {
        ...baseOptions,
        sound: 'social',
        vibrationPattern: [0, 200, 100, 200],
        bypassDnd: false,
      };

    case 'message':
      return {
        ...baseOptions,
        sound: 'message',
        vibrationPattern: [0, 250, 250, 250],
        bypassDnd: false,
      };

    case 'system':
    default:
      return {
        ...baseOptions,
        sound: false, // Silent for system notifications
        vibrationPattern: undefined,
        bypassDnd: false,
      };
  }
}

/**
 * Format notification title based on type
 * Allows for localization and customization
 */
export function formatNotificationTitle(
  type: NotificationType,
  data: NotificationData
): string {
  switch (type) {
    case 'dm':
      return data.userName || 'Direct Message';
    case 'mention':
      return `@${data.userName} mentioned you`;
    case 'reply':
      return `${data.userName} replied to your message`;
    case 'message':
      return data.channelName || data.serverName || 'New message';
    case 'friend_request':
      return 'New friend request';
    case 'server_invite':
      return `Invite to ${data.serverName}`;
    case 'call':
      return `Incoming call from ${data.userName}`;
    case 'system':
    default:
      return 'Hearth';
  }
}

/**
 * Format notification body based on type
 * Truncates and formats the body text
 */
export function formatNotificationBody(
  type: NotificationType,
  originalBody: string,
  data: NotificationData
): string {
  // If there's a mention count (multiple mentions), show count
  if (data.mentionCount && data.mentionCount > 1) {
    return `You were mentioned ${data.mentionCount} times`;
  }

  // Truncate long messages
  const maxLength = 150;
  if (originalBody.length > maxLength) {
    return originalBody.substring(0, maxLength - 3) + '...';
  }

  return originalBody;
}

/**
 * Check if notification should be displayed based on app state
 */
export function shouldDisplayNotification(
  appState: 'active' | 'background' | 'inactive' | 'unknown'
): boolean {
  // Always display when backgrounded or inactive
  // When active, notifications are handled by addNotificationReceivedListener
  return appState !== 'active';
}

/**
 * Register notification delivery service listeners
 * Should be called during app initialization
 */
export function registerDeliveryListeners(): {
  removeNotificationReceived: () => void;
  removeNotificationResponse: () => void;
} {
  let notificationReceivedListener: Notifications.EventSubscription | null = null;
  let notificationResponseListener: Notifications.EventSubscription | null = null;

  // Handle notifications received while app is foregrounded
  notificationReceivedListener = Notifications.addNotificationReceivedListener(
    async (notification) => {
      console.log('[NotificationDelivery] Received foreground notification');
      await processIncomingNotification(notification);
    }
  );

  // Handle notification taps
  notificationResponseListener = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      console.log('[NotificationDelivery] Notification response received');
      handleNotificationTap(response);
    }
  );

  return {
    removeNotificationReceived: () => {
      notificationReceivedListener?.remove();
      notificationReceivedListener = null;
    },
    removeNotificationResponse: () => {
      notificationResponseListener?.remove();
      notificationResponseListener = null;
    },
  };
}

export default {
  processIncomingNotification,
  handleNotificationTap,
  getDisplayOptions,
  formatNotificationTitle,
  formatNotificationBody,
  shouldDisplayNotification,
  registerDeliveryListeners,
  getRouteForType,
  getChannelForType,
};
