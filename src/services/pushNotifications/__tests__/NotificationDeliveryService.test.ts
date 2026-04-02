/**
 * Notification Delivery Service Tests
 * Tests for PN-002: Basic push notification delivery pipeline
 */

import * as Notifications from 'expo-notifications';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  addPushTokenListener: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  dismissAllNotificationsAsync: jest.fn(),
  dismissNotificationAsync: jest.fn(),
  getPresentedNotificationsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  getBadgeCountAsync: jest.fn().mockResolvedValue(0),
  setBadgeCountAsync: jest.fn().mockResolvedValue(undefined),
  AndroidImportance: {
    MAX: 5,
    HIGH: 4,
    DEFAULT: 3,
    LOW: 2,
    MIN: 1,
    NONE: 0,
  },
  TriggerType: {
    DATE: 1,
    TIME_INTERVAL: 2,
    Push: 3,
  },
}));

// Mock lib/services/notifications
jest.mock('../../../../lib/services/notifications', () => ({
  NOTIFICATION_CHANNELS: {
    DEFAULT: 'default',
    MESSAGES: 'messages',
    DIRECT_MESSAGES: 'direct-messages',
    MENTIONS: 'mentions',
    CALLS: 'calls',
    SERVER: 'server',
    SOCIAL: 'social',
    SYSTEM: 'system',
  },
  setBadgeCount: jest.fn().mockResolvedValue(undefined),
}));

import {
  processIncomingNotification,
  handleNotificationTap,
  getDisplayOptions,
  formatNotificationTitle,
  formatNotificationBody,
  shouldDisplayNotification,
} from '../NotificationDeliveryService';

describe('NotificationDeliveryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDisplayOptions', () => {
    test('should return correct options for dm type', () => {
      const options = getDisplayOptions('dm');
      expect(options.sound).toBe('default');
      expect(options.bypassDnd).toBe(false);
    });

    test('should return correct options for mention type', () => {
      const options = getDisplayOptions('mention');
      expect(options.sound).toBe('mention');
      expect(options.bypassDnd).toBe(true);
      expect(options.vibrationPattern).toEqual([0, 500, 200, 500]);
    });

    test('should return correct options for call type', () => {
      const options = getDisplayOptions('call');
      expect(options.sound).toBe('call');
      expect(options.bypassDnd).toBe(true);
      expect(options.vibrationPattern).toEqual([0, 1000, 500, 1000]);
    });

    test('should return silent options for system type', () => {
      const options = getDisplayOptions('system');
      expect(options.sound).toBe(false);
      expect(options.vibrationPattern).toBeUndefined();
    });

    test('should accept priority override', () => {
      const options = getDisplayOptions('message', 'high');
      expect(options).toBeDefined();
    });
  });

  describe('formatNotificationTitle', () => {
    test('should format dm title', () => {
      const title = formatNotificationTitle('dm', { type: 'dm', userName: 'John' } as any);
      expect(title).toBe('John');
    });

    test('should format mention title', () => {
      const title = formatNotificationTitle('mention', { type: 'mention', userName: 'Jane' } as any);
      expect(title).toBe('@Jane mentioned you');
    });

    test('should format reply title', () => {
      const title = formatNotificationTitle('reply', { type: 'reply', userName: 'Bob' } as any);
      expect(title).toBe('Bob replied to your message');
    });

    test('should format message title', () => {
      const title = formatNotificationTitle('message', { type: 'message', channelName: 'general' } as any);
      expect(title).toBe('general');
    });

    test('should format friend_request title', () => {
      const title = formatNotificationTitle('friend_request', { type: 'friend_request' } as any);
      expect(title).toBe('New friend request');
    });

    test('should format server_invite title', () => {
      const title = formatNotificationTitle('server_invite', { type: 'server_invite', serverName: 'Gaming' } as any);
      expect(title).toBe('Invite to Gaming');
    });

    test('should format call title', () => {
      const title = formatNotificationTitle('call', { type: 'call', userName: 'Alice' } as any);
      expect(title).toBe('Incoming call from Alice');
    });

    test('should fallback to Hearth for unknown type', () => {
      const title = formatNotificationTitle('system' as any, { type: 'system' } as any);
      expect(title).toBe('Hearth');
    });
  });

  describe('formatNotificationBody', () => {
    test('should return original body when under max length', () => {
      const body = 'Short message';
      const result = formatNotificationBody('message', body, { type: 'message' } as any);
      expect(result).toBe('Short message');
    });

    test('should truncate long messages', () => {
      const body = 'a'.repeat(200);
      const result = formatNotificationBody('message', body, { type: 'message' } as any);
      expect(result).toBe('a'.repeat(147) + '...');
      expect(result.length).toBe(150);
    });

    test('should show mention count when multiple mentions', () => {
      const body = 'Hey @user @user2';
      const result = formatNotificationBody(
        'mention',
        body,
        { type: 'mention', mentionCount: 5 } as any
      );
      expect(result).toBe('You were mentioned 5 times');
    });
  });

  describe('shouldDisplayNotification', () => {
    test('should return false for active app state', () => {
      expect(shouldDisplayNotification('active')).toBe(false);
    });

    test('should return true for background app state', () => {
      expect(shouldDisplayNotification('background')).toBe(true);
    });

    test('should return true for inactive app state', () => {
      expect(shouldDisplayNotification('inactive')).toBe(true);
    });
  });

  describe('processIncomingNotification', () => {
    test('should process notification without errors', async () => {
      const mockNotification = {
        request: {
          content: {
            title: 'Test',
            body: 'Test body',
            data: { type: 'message', channelId: '123' },
          },
        },
      } as Notifications.Notification;

      await expect(processIncomingNotification(mockNotification)).resolves.not.toThrow();
    });

    test('should handle notification with missing data', async () => {
      const mockNotification = {
        request: {
          content: {
            title: 'Test',
            body: 'Test body',
            data: {},
          },
        },
      } as Notifications.Notification;

      await expect(processIncomingNotification(mockNotification)).resolves.not.toThrow();
    });
  });

  describe('handleNotificationTap', () => {
    test('should navigate for dm notification', () => {
      const mockResponse = {
        notification: {
          request: {
            content: {
              data: { type: 'dm', channelId: '123' },
            },
          },
        },
      } as Notifications.NotificationResponse;

      handleNotificationTap(mockResponse);

      const { router } = require('expo-router');
      expect(router.push).toHaveBeenCalled();
    });

    test('should navigate for message notification', () => {
      const mockResponse = {
        notification: {
          request: {
            content: {
              data: { type: 'message', channelId: '123', serverId: '456' },
            },
          },
        },
      } as Notifications.NotificationResponse;

      handleNotificationTap(mockResponse);

      const { router } = require('expo-router');
      expect(router.push).toHaveBeenCalled();
    });

    test('should navigate for mention notification', () => {
      const mockResponse = {
        notification: {
          request: {
            content: {
              data: { type: 'mention', channelId: '123' },
            },
          },
        },
      } as Notifications.NotificationResponse;

      handleNotificationTap(mockResponse);

      const { router } = require('expo-router');
      expect(router.push).toHaveBeenCalled();
    });

    test('should navigate for thread reply', () => {
      const mockResponse = {
        notification: {
          request: {
            content: {
              data: { type: 'reply', threadId: '789', channelId: '123' },
            },
          },
        },
      } as Notifications.NotificationResponse;

      handleNotificationTap(mockResponse);

      const { router } = require('expo-router');
      expect(router.push).toHaveBeenCalled();
    });

    test('should navigate to friends for friend_request', () => {
      const mockResponse = {
        notification: {
          request: {
            content: {
              data: { type: 'friend_request' },
            },
          },
        },
      } as Notifications.NotificationResponse;

      handleNotificationTap(mockResponse);

      const { router } = require('expo-router');
      expect(router.push).toHaveBeenCalled();
    });

    test('should navigate to invites for server_invite', () => {
      const mockResponse = {
        notification: {
          request: {
            content: {
              data: { type: 'server_invite' },
            },
          },
        },
      } as Notifications.NotificationResponse;

      handleNotificationTap(mockResponse);

      const { router } = require('expo-router');
      expect(router.push).toHaveBeenCalled();
    });

    test('should navigate to voice for call', () => {
      const mockResponse = {
        notification: {
          request: {
            content: {
              data: { type: 'call', channelId: '123' },
            },
          },
        },
      } as Notifications.NotificationResponse;

      handleNotificationTap(mockResponse);

      const { router } = require('expo-router');
      expect(router.push).toHaveBeenCalled();
    });

    test('should clear badge on tap', () => {
      const mockResponse = {
        notification: {
          request: {
            content: {
              data: { type: 'message', channelId: '123' },
            },
          },
        },
      } as Notifications.NotificationResponse;

      handleNotificationTap(mockResponse);

      const { setBadgeCount } = require('../../../../lib/services/notifications');
      expect(setBadgeCount).toHaveBeenCalledWith(0);
    });
  });
});
