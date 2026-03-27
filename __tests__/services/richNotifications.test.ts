/**
 * Tests for Rich Notifications Service (PN-005)
 */

import { Platform } from 'react-native';

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notification-id-123')),
  setNotificationCategoryAsync: jest.fn(() => Promise.resolve()),
  DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
}));

// Mock notifications service
jest.mock('../../lib/services/notifications', () => ({
  getNotificationSettings: jest.fn(() => Promise.resolve({ enabled: true })),
  scheduleLocalNotification: jest.fn(),
}));

// Mock Platform
jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: jest.fn((options) => options.ios || options.default) },
}));

import * as Notifications from 'expo-notifications';
import { richNotifications, NOTIFICATION_ACTIONS, IOS_NOTIFICATION_CATEGORIES } from '../../lib/services/richNotifications';
import type { IncomingMessage } from '../../lib/services/notificationPipeline';

// Mock incoming message for testing
const mockMessage: IncomingMessage = {
  id: 'msg-123',
  content: 'Hello, this is a test message!',
  author: {
    id: 'user-456',
    username: 'TestUser',
    avatar: 'https://example.com/avatar.jpg',
  },
  channel: {
    id: 'channel-789',
    name: 'general',
    type: 'text',
    serverId: 'server-123',
  },
  server: {
    id: 'server-123',
    name: 'Test Server',
    icon: 'https://example.com/server-icon.jpg',
  },
  mentions: [],
  timestamp: Date.now(),
  type: 'mention',
};

describe('RichNotificationsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    richNotifications.shutdown();
  });

  afterEach(() => {
    richNotifications.shutdown();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await richNotifications.initialize();
      expect(richNotifications.isInitialized()).toBe(true);
    });

    it('should not initialize twice', async () => {
      await richNotifications.initialize();
      await richNotifications.initialize();
      expect(richNotifications.isInitialized()).toBe(true);
    });

    it('should set up iOS notification categories on iOS', async () => {
      (Platform.OS as any) = 'ios';
      await richNotifications.initialize();

      expect(Notifications.setNotificationCategoryAsync).toHaveBeenCalledWith(
        IOS_NOTIFICATION_CATEGORIES.MESSAGE,
        expect.any(Array)
      );
      expect(Notifications.setNotificationCategoryAsync).toHaveBeenCalledWith(
        IOS_NOTIFICATION_CATEGORIES.DM,
        expect.any(Array)
      );
      expect(Notifications.setNotificationCategoryAsync).toHaveBeenCalledWith(
        IOS_NOTIFICATION_CATEGORIES.MENTION,
        expect.any(Array)
      );
    });

    it('should set up notification listeners', async () => {
      await richNotifications.initialize();

      expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalled();
      expect(Notifications.addNotificationReceivedListener).toHaveBeenCalled();
    });
  });

  describe('shutdown', () => {
    it('should shutdown properly', async () => {
      await richNotifications.initialize();
      richNotifications.shutdown();
      expect(richNotifications.isInitialized()).toBe(false);
    });

    it('should clear action handlers on shutdown', async () => {
      await richNotifications.initialize();

      // Register a handler
      const mockHandler = jest.fn();
      richNotifications.registerActionHandler('reply', mockHandler);

      // Should have registered handler
      expect(richNotifications.getRegisteredHandlersCount()).toBe(1);

      // Shutdown should clear handlers
      richNotifications.shutdown();
      expect(richNotifications.getRegisteredHandlersCount()).toBe(0);
    });
  });

  describe('action handlers', () => {
    beforeEach(async () => {
      await richNotifications.initialize();
    });

    it('should register action handlers', () => {
      const mockHandler = jest.fn();
      richNotifications.registerActionHandler('reply', mockHandler);

      expect(richNotifications.getRegisteredHandlersCount()).toBe(1);
    });

    it('should register multiple action handlers', () => {
      const replyHandler = jest.fn();
      const markReadHandler = jest.fn();

      richNotifications.registerActionHandler('reply', replyHandler);
      richNotifications.registerActionHandler('mark_read', markReadHandler);

      expect(richNotifications.getRegisteredHandlersCount()).toBe(2);
    });
  });

  describe('rich notification scheduling', () => {
    beforeEach(async () => {
      await richNotifications.initialize();
    });

    it('should schedule rich notification with default actions for mention', async () => {
      const notificationId = await richNotifications.scheduleMessageNotification(mockMessage);

      expect(notificationId).toBe('notification-id-123');
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: expect.objectContaining({
          title: 'TestUser mentioned you',
          body: 'Hello, this is a test message!',
          data: expect.objectContaining({
            type: 'mention',
            channelId: 'channel-789',
            messageId: 'msg-123',
            serverId: 'server-123',
            userId: 'user-456',
          }),
        }),
        trigger: null,
      });
    });

    it('should schedule rich notification for DM', async () => {
      const dmMessage: IncomingMessage = {
        ...mockMessage,
        type: 'dm',
        channel: { ...mockMessage.channel, type: 'dm' },
        server: undefined,
      };

      await richNotifications.scheduleMessageNotification(dmMessage);

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: expect.objectContaining({
          title: 'TestUser',
          body: 'Hello, this is a test message!',
          data: expect.objectContaining({
            type: 'dm',
          }),
        }),
        trigger: null,
      });
    });

    it('should schedule rich notification for channel message', async () => {
      const channelMessage: IncomingMessage = {
        ...mockMessage,
        type: 'message',
      };

      await richNotifications.scheduleMessageNotification(channelMessage);

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: expect.objectContaining({
          title: '#general • Test Server',
          body: 'Hello, this is a test message!',
          data: expect.objectContaining({
            type: 'message',
          }),
        }),
        trigger: null,
      });
    });

    it('should truncate long message bodies', async () => {
      const longMessage: IncomingMessage = {
        ...mockMessage,
        content: 'A'.repeat(150), // 150 characters, should be truncated to 100
      };

      await richNotifications.scheduleMessageNotification(longMessage);

      const expectedBody = 'A'.repeat(97) + '...'; // 100 characters total
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: expect.objectContaining({
          body: expectedBody,
        }),
        trigger: null,
      });
    });

    it('should handle notifications when settings disabled', async () => {
      const { getNotificationSettings } = require('../../lib/services/notifications');
      getNotificationSettings.mockResolvedValueOnce({ enabled: false });

      await expect(richNotifications.scheduleRichNotification(
        'Test',
        'Test body',
        { type: 'message', title: 'Test', body: 'Test body' }
      )).rejects.toThrow('Notifications are disabled');
    });
  });

  describe('default actions for notification types', () => {
    beforeEach(async () => {
      await richNotifications.initialize();
    });

    it('should provide correct actions for DM', async () => {
      const dmMessage: IncomingMessage = {
        ...mockMessage,
        type: 'dm',
      };

      await richNotifications.scheduleMessageNotification(dmMessage);

      const scheduleCall = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
      const actions = scheduleCall.content.data.actions;

      expect(actions).toEqual([
        NOTIFICATION_ACTIONS.REPLY,
        NOTIFICATION_ACTIONS.MARK_READ,
        NOTIFICATION_ACTIONS.VIEW_CONVERSATION,
      ]);
    });

    it('should provide correct actions for mention', async () => {
      const mentionMessage: IncomingMessage = {
        ...mockMessage,
        type: 'mention',
      };

      await richNotifications.scheduleMessageNotification(mentionMessage);

      const scheduleCall = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
      const actions = scheduleCall.content.data.actions;

      expect(actions).toEqual([
        NOTIFICATION_ACTIONS.REPLY,
        NOTIFICATION_ACTIONS.MARK_READ,
        NOTIFICATION_ACTIONS.VIEW_CONVERSATION,
      ]);
    });

    it('should provide correct actions for channel message', async () => {
      const messageNotification: IncomingMessage = {
        ...mockMessage,
        type: 'message',
      };

      await richNotifications.scheduleMessageNotification(messageNotification);

      const scheduleCall = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
      const actions = scheduleCall.content.data.actions;

      expect(actions).toEqual([
        NOTIFICATION_ACTIONS.REPLY,
        NOTIFICATION_ACTIONS.MARK_READ,
        NOTIFICATION_ACTIONS.MUTE_CHANNEL,
      ]);
    });

    it('should provide correct actions for friend request', async () => {
      const friendRequestMessage: IncomingMessage = {
        ...mockMessage,
        type: 'friend_request',
      };

      await richNotifications.scheduleMessageNotification(friendRequestMessage);

      const scheduleCall = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
      const actions = scheduleCall.content.data.actions;

      expect(actions).toEqual([
        NOTIFICATION_ACTIONS.ACCEPT_FRIEND_REQUEST,
        NOTIFICATION_ACTIONS.DECLINE_FRIEND_REQUEST,
      ]);
    });

    it('should provide correct actions for call', async () => {
      const callMessage: IncomingMessage = {
        ...mockMessage,
        type: 'call',
      };

      await richNotifications.scheduleMessageNotification(callMessage);

      const scheduleCall = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
      const actions = scheduleCall.content.data.actions;

      expect(actions).toEqual([
        NOTIFICATION_ACTIONS.JOIN_VOICE_CALL,
        NOTIFICATION_ACTIONS.DECLINE_CALL,
      ]);
    });
  });

  describe('platform-specific content', () => {
    beforeEach(async () => {
      await richNotifications.initialize();
    });

    it('should set category identifier for iOS', async () => {
      (Platform.OS as any) = 'ios';

      await richNotifications.scheduleMessageNotification(mockMessage);

      const scheduleCall = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
      expect(scheduleCall.content.categoryIdentifier).toBe(IOS_NOTIFICATION_CATEGORIES.MENTION);
    });

    it('should include actions in data for Android', async () => {
      (Platform.OS as any) = 'android';

      await richNotifications.scheduleMessageNotification(mockMessage);

      const scheduleCall = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
      expect(scheduleCall.content.data.actions).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: 'reply',
          title: 'Reply',
          textInput: true,
        }),
        expect.objectContaining({
          id: 'mark_read',
          title: 'Mark Read',
        }),
        expect.objectContaining({
          id: 'view_conversation',
          title: 'View',
        }),
      ]));
    });
  });
});