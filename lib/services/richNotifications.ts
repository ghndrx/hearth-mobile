/**
 * Rich Notifications Service - PN-005
 *
 * Implements rich notifications with inline action buttons for both iOS (UNNotificationAction)
 * and Android (NotificationCompat.Builder.addAction). Builds on top of the existing
 * notification pipeline from PN-004 to provide interactive notification experiences.
 *
 * Features:
 * - Cross-platform action buttons (Reply, Mark Read, etc.)
 * - Quick reply functionality with text input
 * - Action response handling and routing
 * - Integration with smart batching system
 * - Type-safe action definitions
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  scheduleLocalNotification,
  getNotificationSettings,
  type NotificationPayload,
  type NotificationType,
} from './notifications';
import type { IncomingMessage } from './notificationPipeline';

// Rich notification action types
export type NotificationActionType =
  | 'reply'
  | 'mark_read'
  | 'mute_channel'
  | 'view_conversation'
  | 'accept_friend_request'
  | 'decline_friend_request'
  | 'join_voice_call'
  | 'decline_call';

// Action button configuration
export interface NotificationAction {
  id: NotificationActionType;
  title: string;
  icon?: string; // Android only
  authRequired?: boolean; // iOS only - requires device unlock
  textInput?: boolean; // Enables quick reply text input
  placeholder?: string; // Text input placeholder
}

// Extended payload for rich notifications
export interface RichNotificationPayload extends NotificationPayload {
  actions?: NotificationAction[];
  categoryId?: string; // iOS notification category
  groupId?: string; // Android notification group
}

// Action response from user interaction
export interface NotificationActionResponse {
  actionId: NotificationActionType;
  notificationPayload: RichNotificationPayload;
  userText?: string; // For text input actions like reply
  timestamp: number;
}

// Predefined action templates for common scenarios
export const NOTIFICATION_ACTIONS = {
  // Message actions
  REPLY: {
    id: 'reply' as NotificationActionType,
    title: 'Reply',
    icon: 'reply', // Android icon
    textInput: true,
    placeholder: 'Type your reply...',
    authRequired: false,
  },
  MARK_READ: {
    id: 'mark_read' as NotificationActionType,
    title: 'Mark Read',
    icon: 'check',
    authRequired: false,
  },
  MUTE_CHANNEL: {
    id: 'mute_channel' as NotificationActionType,
    title: 'Mute',
    icon: 'volume_off',
    authRequired: false,
  },
  VIEW_CONVERSATION: {
    id: 'view_conversation' as NotificationActionType,
    title: 'View',
    icon: 'open_in_app',
    authRequired: false,
  },

  // Friend request actions
  ACCEPT_FRIEND_REQUEST: {
    id: 'accept_friend_request' as NotificationActionType,
    title: 'Accept',
    icon: 'person_add',
    authRequired: false,
  },
  DECLINE_FRIEND_REQUEST: {
    id: 'decline_friend_request' as NotificationActionType,
    title: 'Decline',
    icon: 'person_remove',
    authRequired: false,
  },

  // Call actions
  JOIN_VOICE_CALL: {
    id: 'join_voice_call' as NotificationActionType,
    title: 'Join',
    icon: 'call',
    authRequired: true, // Requires device unlock for call access
  },
  DECLINE_CALL: {
    id: 'decline_call' as NotificationActionType,
    title: 'Decline',
    icon: 'call_end',
    authRequired: false,
  },
} as const;

// iOS notification categories with action combinations
export const IOS_NOTIFICATION_CATEGORIES = {
  MESSAGE: 'MESSAGE_CATEGORY',
  DM: 'DM_CATEGORY',
  MENTION: 'MENTION_CATEGORY',
  FRIEND_REQUEST: 'FRIEND_REQUEST_CATEGORY',
  CALL: 'CALL_CATEGORY',
  SERVER_INVITE: 'SERVER_INVITE_CATEGORY',
} as const;

// Android notification groups for batching
export const ANDROID_NOTIFICATION_GROUPS = {
  MESSAGES: 'messages_group',
  DMS: 'dms_group',
  SOCIAL: 'social_group',
  CALLS: 'calls_group',
} as const;

/**
 * Rich notifications service with action support
 */
export class RichNotificationsService {
  private initialized = false;
  private actionHandlers = new Map<NotificationActionType, (response: NotificationActionResponse) => Promise<void>>();
  private notificationListener?: Notifications.Subscription;
  private responseListener?: Notifications.Subscription;

  /**
   * Initialize rich notifications system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('[RichNotifications] Initializing...');

    // Set up platform-specific notification categories/actions
    if (Platform.OS === 'ios') {
      await this.setupIOSCategories();
    }

    // Set up notification response listener
    this.setupNotificationListeners();

    this.initialized = true;
    console.log('[RichNotifications] Initialized successfully');
  }

  /**
   * Shutdown service and clean up listeners
   */
  shutdown(): void {
    console.log('[RichNotifications] Shutting down...');

    this.notificationListener?.remove();
    this.responseListener?.remove();
    this.actionHandlers.clear();
    this.initialized = false;
  }

  /**
   * Register handler for specific action type
   */
  registerActionHandler(
    actionType: NotificationActionType,
    handler: (response: NotificationActionResponse) => Promise<void>
  ): void {
    this.actionHandlers.set(actionType, handler);
    console.log(`[RichNotifications] Registered handler for action: ${actionType}`);
  }

  /**
   * Schedule a rich notification with action buttons
   */
  async scheduleRichNotification(
    title: string,
    body: string,
    payload: RichNotificationPayload,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string> {
    const settings = await getNotificationSettings();

    if (!settings.enabled) {
      throw new Error('Notifications are disabled');
    }

    // Determine actions based on notification type
    const actions = payload.actions || this.getDefaultActionsForType(payload.type);
    const categoryId = payload.categoryId || this.getCategoryForType(payload.type);

    // Create notification content with platform-specific action handling
    const content: Notifications.NotificationContentInput = {
      title,
      body,
      data: payload,
      sound: true,
      ...this.getPlatformSpecificContent(actions, categoryId, payload),
    };

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content,
        trigger: trigger ?? null,
      });

      console.log(`[RichNotifications] Scheduled rich notification: ${title} (${actions.length} actions)`);
      return notificationId;
    } catch (error) {
      console.error('[RichNotifications] Failed to schedule notification:', error);
      throw error;
    }
  }

  /**
   * Get default actions for a notification type
   */
  private getDefaultActionsForType(type: NotificationType): NotificationAction[] {
    switch (type) {
      case 'dm':
      case 'mention':
      case 'reply':
        return [
          NOTIFICATION_ACTIONS.REPLY,
          NOTIFICATION_ACTIONS.MARK_READ,
          NOTIFICATION_ACTIONS.VIEW_CONVERSATION,
        ];

      case 'message':
        return [
          NOTIFICATION_ACTIONS.REPLY,
          NOTIFICATION_ACTIONS.MARK_READ,
          NOTIFICATION_ACTIONS.MUTE_CHANNEL,
        ];

      case 'friend_request':
        return [
          NOTIFICATION_ACTIONS.ACCEPT_FRIEND_REQUEST,
          NOTIFICATION_ACTIONS.DECLINE_FRIEND_REQUEST,
        ];

      case 'call':
        return [
          NOTIFICATION_ACTIONS.JOIN_VOICE_CALL,
          NOTIFICATION_ACTIONS.DECLINE_CALL,
        ];

      case 'server_invite':
        return [
          NOTIFICATION_ACTIONS.VIEW_CONVERSATION,
        ];

      default:
        return [NOTIFICATION_ACTIONS.VIEW_CONVERSATION];
    }
  }

  /**
   * Get iOS category for notification type
   */
  private getCategoryForType(type: NotificationType): string {
    switch (type) {
      case 'dm':
        return IOS_NOTIFICATION_CATEGORIES.DM;
      case 'mention':
      case 'reply':
        return IOS_NOTIFICATION_CATEGORIES.MENTION;
      case 'message':
        return IOS_NOTIFICATION_CATEGORIES.MESSAGE;
      case 'friend_request':
        return IOS_NOTIFICATION_CATEGORIES.FRIEND_REQUEST;
      case 'call':
        return IOS_NOTIFICATION_CATEGORIES.CALL;
      case 'server_invite':
        return IOS_NOTIFICATION_CATEGORIES.SERVER_INVITE;
      default:
        return IOS_NOTIFICATION_CATEGORIES.MESSAGE;
    }
  }

  /**
   * Get platform-specific content properties
   */
  private getPlatformSpecificContent(
    actions: NotificationAction[],
    categoryId: string,
    payload: RichNotificationPayload
  ): Partial<Notifications.NotificationContentInput> {
    if (Platform.OS === 'ios') {
      return {
        categoryIdentifier: categoryId,
      };
    } else if (Platform.OS === 'android') {
      return {
        // Android uses notification data for actions
        data: {
          ...payload,
          actions: actions.map(action => ({
            id: action.id,
            title: action.title,
            icon: action.icon,
            textInput: action.textInput,
            placeholder: action.placeholder,
          })),
        },
      };
    }

    return {};
  }

  /**
   * Set up iOS notification categories with actions
   */
  private async setupIOSCategories(): Promise<void> {
    if (Platform.OS !== 'ios') {
      return;
    }

    try {
      const categories = [
        // Message category (channel messages)
        {
          identifier: IOS_NOTIFICATION_CATEGORIES.MESSAGE,
          actions: [
            {
              identifier: 'reply',
              buttonTitle: 'Reply',
              textInput: {
                submitButtonTitle: 'Send',
                placeholder: 'Type your reply...',
              },
            },
            {
              identifier: 'mark_read',
              buttonTitle: 'Mark Read',
            },
            {
              identifier: 'mute_channel',
              buttonTitle: 'Mute',
            },
          ],
        },

        // DM category (direct messages)
        {
          identifier: IOS_NOTIFICATION_CATEGORIES.DM,
          actions: [
            {
              identifier: 'reply',
              buttonTitle: 'Reply',
              textInput: {
                submitButtonTitle: 'Send',
                placeholder: 'Type your reply...',
              },
            },
            {
              identifier: 'mark_read',
              buttonTitle: 'Mark Read',
            },
            {
              identifier: 'view_conversation',
              buttonTitle: 'View',
            },
          ],
        },

        // Mention category (mentions and replies)
        {
          identifier: IOS_NOTIFICATION_CATEGORIES.MENTION,
          actions: [
            {
              identifier: 'reply',
              buttonTitle: 'Reply',
              textInput: {
                submitButtonTitle: 'Send',
                placeholder: 'Type your reply...',
              },
            },
            {
              identifier: 'mark_read',
              buttonTitle: 'Mark Read',
            },
            {
              identifier: 'view_conversation',
              buttonTitle: 'View',
            },
          ],
        },

        // Friend request category
        {
          identifier: IOS_NOTIFICATION_CATEGORIES.FRIEND_REQUEST,
          actions: [
            {
              identifier: 'accept_friend_request',
              buttonTitle: 'Accept',
            },
            {
              identifier: 'decline_friend_request',
              buttonTitle: 'Decline',
            },
          ],
        },

        // Call category
        {
          identifier: IOS_NOTIFICATION_CATEGORIES.CALL,
          actions: [
            {
              identifier: 'join_voice_call',
              buttonTitle: 'Join',
            },
            {
              identifier: 'decline_call',
              buttonTitle: 'Decline',
            },
          ],
        },

        // Server invite category
        {
          identifier: IOS_NOTIFICATION_CATEGORIES.SERVER_INVITE,
          actions: [
            {
              identifier: 'view_conversation',
              buttonTitle: 'View Invite',
            },
          ],
        },
      ];

      // Set each category individually as setNotificationCategoriesAsync doesn't exist
      for (const category of categories) {
        await Notifications.setNotificationCategoryAsync(
          category.identifier,
          category.actions || []
        );
      }
      console.log('[RichNotifications] iOS notification categories configured');
    } catch (error) {
      console.error('[RichNotifications] Failed to setup iOS categories:', error);
    }
  }

  /**
   * Set up notification listeners for handling responses
   */
  private setupNotificationListeners(): void {
    // Listen for notification responses (when user taps actions)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response: Notifications.NotificationResponse) => {
        this.handleNotificationResponse(response);
      }
    );

    // Listen for notification received events (optional, for logging)
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification: Notifications.Notification) => {
        console.log('[RichNotifications] Notification received:', notification.request.identifier);
      }
    );

    console.log('[RichNotifications] Notification listeners configured');
  }

  /**
   * Handle notification action response
   */
  private async handleNotificationResponse(response: Notifications.NotificationResponse): Promise<void> {
    try {
      const { notification, actionIdentifier, userText } = response;
      const payload = notification.request.content.data as RichNotificationPayload;

      // Skip default tap response (user tapped notification body)
      if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        console.log('[RichNotifications] Default notification tap - opening app');
        return;
      }

      console.log(`[RichNotifications] Action received: ${actionIdentifier}`);

      // Create action response object
      const actionResponse: NotificationActionResponse = {
        actionId: actionIdentifier as NotificationActionType,
        notificationPayload: payload,
        userText,
        timestamp: Date.now(),
      };

      // Find and execute registered handler
      const handler = this.actionHandlers.get(actionResponse.actionId);
      if (handler) {
        await handler(actionResponse);
      } else {
        console.warn(`[RichNotifications] No handler registered for action: ${actionIdentifier}`);

        // Fallback: log action for debugging
        this.logActionForDebugging(actionResponse);
      }
    } catch (error) {
      console.error('[RichNotifications] Error handling notification response:', error);
    }
  }

  /**
   * Log unhandled actions for debugging
   */
  private logActionForDebugging(response: NotificationActionResponse): void {
    console.log('[RichNotifications] Unhandled action:', {
      action: response.actionId,
      hasText: !!response.userText,
      textLength: response.userText?.length || 0,
      notificationType: response.notificationPayload.type,
      channelId: response.notificationPayload.channelId,
      messageId: response.notificationPayload.messageId,
    });
  }

  /**
   * Helper to create rich notification for message
   */
  async scheduleMessageNotification(message: IncomingMessage): Promise<string> {
    const actions = this.getDefaultActionsForType(message.type as NotificationType);
    const categoryId = this.getCategoryForType(message.type as NotificationType);

    const payload: RichNotificationPayload = {
      type: message.type as NotificationType,
      serverId: message.server?.id,
      channelId: message.channel.id,
      messageId: message.id,
      threadId: message.threadId,
      userId: message.author.id,
      title: this.formatNotificationTitle(message),
      body: this.formatNotificationBody(message),
      imageUrl: message.author.avatar,
      actions,
      categoryId,
    };

    return this.scheduleRichNotification(
      payload.title,
      payload.body,
      payload
    );
  }

  /**
   * Format notification title (matches pipeline logic)
   */
  private formatNotificationTitle(message: IncomingMessage): string {
    switch (message.type) {
      case 'dm':
        return message.author.username;
      case 'mention':
        return `${message.author.username} mentioned you`;
      case 'reply':
        return `${message.author.username} replied to you`;
      case 'message':
        if (message.server) {
          return `#${message.channel.name} • ${message.server.name}`;
        }
        return `#${message.channel.name}`;
      default:
        return 'New message';
    }
  }

  /**
   * Format notification body (matches pipeline logic)
   */
  private formatNotificationBody(message: IncomingMessage): string {
    const maxLength = 100;
    const content = message.content.trim();

    if (content.length <= maxLength) {
      return content;
    }

    return content.substring(0, maxLength - 3) + '...';
  }

  /**
   * Get service initialization status
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get registered action handlers count
   */
  getRegisteredHandlersCount(): number {
    return this.actionHandlers.size;
  }
}

// Singleton instance
export const richNotifications = new RichNotificationsService();

export default richNotifications;