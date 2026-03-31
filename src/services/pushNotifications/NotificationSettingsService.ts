/**
 * Notification Settings Service
 * Manages platform-specific notification channels (Android) and categories (iOS)
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/**
 * Android notification channel identifiers
 */
export enum AndroidChannelId {
  DEFAULT = 'default',
  MESSAGES = 'messages',
  MENTIONS = 'mentions',
  FRIEND_REQUESTS = 'friend_requests',
  VOICE_CHAT = 'voice_chat',
  SYSTEM = 'system',
  SECURITY = 'security',
}

/**
 * iOS notification category identifiers
 */
export enum IOSCategoryId {
  MESSAGE = 'MESSAGE_CATEGORY',
  MENTION = 'MENTION_CATEGORY',
  FRIEND_REQUEST = 'FRIEND_REQUEST_CATEGORY',
  VOICE_CHAT = 'VOICE_CHAT_CATEGORY',
  SYSTEM = 'SYSTEM_CATEGORY',
  SECURITY = 'SECURITY_CATEGORY',
}

/**
 * Notification priority levels
 */
export enum NotificationPriority {
  LOW = 'low',
  DEFAULT = 'default',
  HIGH = 'high',
  MAX = 'max',
}

/**
 * Android notification channel configuration
 */
interface AndroidChannelConfig {
  id: AndroidChannelId;
  name: string;
  description: string;
  importance: Notifications.AndroidImportance;
  vibrationPattern?: number[];
  lightColor?: string;
  showBadge?: boolean;
  sound?: string;
  enableVibration?: boolean;
  enableLights?: boolean;
}

/**
 * iOS notification category configuration
 */
interface IOSCategoryConfig {
  identifier: IOSCategoryId;
  actions?: Notifications.NotificationAction[];
  options?: {
    allowInCarPlay?: boolean;
    allowAnnouncement?: boolean;
    hiddenPreviewsShowTitle?: boolean;
    hiddenPreviewsShowSubtitle?: boolean;
  };
}

/**
 * Android notification channels configuration
 */
const ANDROID_CHANNELS: AndroidChannelConfig[] = [
  {
    id: AndroidChannelId.DEFAULT,
    name: 'General',
    description: 'General app notifications',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
    showBadge: true,
    enableVibration: true,
    enableLights: true,
  },
  {
    id: AndroidChannelId.MESSAGES,
    name: 'Messages',
    description: 'New messages from friends and servers',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 100, 200],
    lightColor: '#00A6FB',
    showBadge: true,
    enableVibration: true,
    enableLights: true,
  },
  {
    id: AndroidChannelId.MENTIONS,
    name: 'Mentions & Replies',
    description: 'When someone mentions you or replies to your message',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 300, 200, 300, 200, 300],
    lightColor: '#FFB700',
    showBadge: true,
    enableVibration: true,
    enableLights: true,
  },
  {
    id: AndroidChannelId.FRIEND_REQUESTS,
    name: 'Friend Requests',
    description: 'New friend requests and acceptances',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 150, 150, 150],
    lightColor: '#28A745',
    showBadge: true,
    enableVibration: true,
    enableLights: true,
  },
  {
    id: AndroidChannelId.VOICE_CHAT,
    name: 'Voice & Video',
    description: 'Voice chat invitations and calls',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 250, 500],
    lightColor: '#6F42C1',
    showBadge: true,
    enableVibration: true,
    enableLights: true,
  },
  {
    id: AndroidChannelId.SYSTEM,
    name: 'System Updates',
    description: 'App updates and system announcements',
    importance: Notifications.AndroidImportance.LOW,
    vibrationPattern: [0, 100],
    lightColor: '#6C757D',
    showBadge: false,
    enableVibration: false,
    enableLights: false,
  },
  {
    id: AndroidChannelId.SECURITY,
    name: 'Security Alerts',
    description: 'Security-related notifications and alerts',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 300, 100, 300, 100, 300, 100, 300],
    lightColor: '#DC3545',
    showBadge: true,
    enableVibration: true,
    enableLights: true,
  },
];

/**
 * iOS notification categories configuration
 */
const IOS_CATEGORIES: IOSCategoryConfig[] = [
  {
    identifier: IOSCategoryId.MESSAGE,
    actions: [
      {
        identifier: 'REPLY_ACTION',
        buttonTitle: 'Reply',
        options: {
          opensAppToForeground: false,
          isAuthenticationRequired: false,
          isDestructive: false,
        },
        textInput: {
          submitButtonTitle: 'Send',
          placeholder: 'Type a message...',
        },
      },
      {
        identifier: 'MARK_READ_ACTION',
        buttonTitle: 'Mark as Read',
        options: {
          opensAppToForeground: false,
          isAuthenticationRequired: false,
          isDestructive: false,
        },
      },
    ],
    options: {
      allowInCarPlay: true,
      allowAnnouncement: true,
    },
  },
  {
    identifier: IOSCategoryId.MENTION,
    actions: [
      {
        identifier: 'REPLY_ACTION',
        buttonTitle: 'Reply',
        options: {
          opensAppToForeground: false,
          isAuthenticationRequired: false,
          isDestructive: false,
        },
        textInput: {
          submitButtonTitle: 'Send',
          placeholder: 'Reply to mention...',
        },
      },
      {
        identifier: 'VIEW_ACTION',
        buttonTitle: 'View',
        options: {
          opensAppToForeground: true,
          isAuthenticationRequired: false,
          isDestructive: false,
        },
      },
    ],
    options: {
      allowInCarPlay: true,
      allowAnnouncement: true,
    },
  },
  {
    identifier: IOSCategoryId.FRIEND_REQUEST,
    actions: [
      {
        identifier: 'ACCEPT_ACTION',
        buttonTitle: 'Accept',
        options: {
          opensAppToForeground: false,
          isAuthenticationRequired: false,
          isDestructive: false,
        },
      },
      {
        identifier: 'DECLINE_ACTION',
        buttonTitle: 'Decline',
        options: {
          opensAppToForeground: false,
          isAuthenticationRequired: false,
          isDestructive: true,
        },
      },
    ],
    options: {
      allowInCarPlay: false,
      allowAnnouncement: false,
    },
  },
  {
    identifier: IOSCategoryId.VOICE_CHAT,
    actions: [
      {
        identifier: 'JOIN_ACTION',
        buttonTitle: 'Join',
        options: {
          opensAppToForeground: true,
          isAuthenticationRequired: false,
          isDestructive: false,
        },
      },
      {
        identifier: 'DECLINE_ACTION',
        buttonTitle: 'Decline',
        options: {
          opensAppToForeground: false,
          isAuthenticationRequired: false,
          isDestructive: true,
        },
      },
    ],
    options: {
      allowInCarPlay: false,
      allowAnnouncement: true,
    },
  },
  {
    identifier: IOSCategoryId.SYSTEM,
    actions: [],
    options: {
      allowInCarPlay: false,
      allowAnnouncement: false,
    },
  },
  {
    identifier: IOSCategoryId.SECURITY,
    actions: [
      {
        identifier: 'VIEW_ACTION',
        buttonTitle: 'View Details',
        options: {
          opensAppToForeground: true,
          isAuthenticationRequired: true,
          isDestructive: false,
        },
      },
    ],
    options: {
      allowInCarPlay: false,
      allowAnnouncement: true,
    },
  },
];

class NotificationSettingsService {
  private isInitialized = false;

  /**
   * Initialize notification channels (Android) and categories (iOS)
   */
  async initialize(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      } else if (Platform.OS === 'ios') {
        await this.setupIOSCategories();
      }

      this.isInitialized = true;
      console.log(`Notification settings initialized for ${Platform.OS}`);
      return true;
    } catch (error) {
      console.error('Failed to initialize notification settings:', error);
      return false;
    }
  }

  /**
   * Setup Android notification channels
   */
  private async setupAndroidChannels(): Promise<void> {
    for (const channel of ANDROID_CHANNELS) {
      try {
        await Notifications.setNotificationChannelAsync(channel.id, {
          name: channel.name,
          description: channel.description,
          importance: channel.importance,
          vibrationPattern: channel.vibrationPattern,
          lightColor: channel.lightColor,
          showBadge: channel.showBadge,
          sound: channel.sound || undefined,
          enableVibrate: channel.enableVibration,
        });

        console.log(`Android channel created: ${channel.id}`);
      } catch (error) {
        console.error(`Failed to create Android channel ${channel.id}:`, error);
      }
    }
  }

  /**
   * Setup iOS notification categories
   */
  private async setupIOSCategories(): Promise<void> {
    try {
      for (const category of IOS_CATEGORIES) {
        await Notifications.setNotificationCategoryAsync(
          category.identifier,
          category.actions || [],
          category.options || {}
        );
      }

      console.log('iOS notification categories configured');
    } catch (error) {
      console.error('Failed to setup iOS categories:', error);
    }
  }

  /**
   * Get appropriate channel ID for Android notifications
   */
  getChannelId(type: 'message' | 'mention' | 'friend_request' | 'voice_chat' | 'system' | 'security' | 'default'): AndroidChannelId {
    switch (type) {
      case 'message':
        return AndroidChannelId.MESSAGES;
      case 'mention':
        return AndroidChannelId.MENTIONS;
      case 'friend_request':
        return AndroidChannelId.FRIEND_REQUESTS;
      case 'voice_chat':
        return AndroidChannelId.VOICE_CHAT;
      case 'system':
        return AndroidChannelId.SYSTEM;
      case 'security':
        return AndroidChannelId.SECURITY;
      default:
        return AndroidChannelId.DEFAULT;
    }
  }

  /**
   * Get appropriate category ID for iOS notifications
   */
  getCategoryId(type: 'message' | 'mention' | 'friend_request' | 'voice_chat' | 'system' | 'security'): IOSCategoryId {
    switch (type) {
      case 'message':
        return IOSCategoryId.MESSAGE;
      case 'mention':
        return IOSCategoryId.MENTION;
      case 'friend_request':
        return IOSCategoryId.FRIEND_REQUEST;
      case 'voice_chat':
        return IOSCategoryId.VOICE_CHAT;
      case 'system':
        return IOSCategoryId.SYSTEM;
      case 'security':
        return IOSCategoryId.SECURITY;
      default:
        return IOSCategoryId.MESSAGE;
    }
  }

  /**
   * Get notification configuration for a specific type
   */
  getNotificationConfig(type: 'message' | 'mention' | 'friend_request' | 'voice_chat' | 'system' | 'security' | 'default') {
    const config: any = {};

    if (Platform.OS === 'android') {
      config.android = {
        channelId: this.getChannelId(type),
      };
    } else if (Platform.OS === 'ios') {
      // Only add category if it's not the default type (iOS doesn't need category for basic notifications)
      if (type !== 'default') {
        config.ios = {
          categoryIdentifier: this.getCategoryId(type as any),
        };
      }
    }

    return config;
  }

  /**
   * Get all available Android channels
   */
  getAndroidChannels(): AndroidChannelConfig[] {
    return [...ANDROID_CHANNELS];
  }

  /**
   * Get all available iOS categories
   */
  getIOSCategories(): IOSCategoryConfig[] {
    return [...IOS_CATEGORIES];
  }

  /**
   * Check if the service is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Delete a notification channel (Android only)
   * Note: On Android, once created, channels cannot be modified by the app
   * Users must manually disable channels in system settings
   */
  async deleteAndroidChannel(channelId: AndroidChannelId): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.warn('deleteAndroidChannel called on non-Android platform');
      return false;
    }

    try {
      await Notifications.deleteNotificationChannelAsync(channelId);
      console.log(`Android channel deleted: ${channelId}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete Android channel ${channelId}:`, error);
      return false;
    }
  }
}

export default new NotificationSettingsService();