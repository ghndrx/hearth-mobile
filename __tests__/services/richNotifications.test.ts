/**
 * Tests for Rich Notifications Service (PN-005)
 *
 * Tests rich notification functionality including action button configuration,
 * iOS categories, platform-specific handling, and notification response processing.
 */

// Mock expo-notifications - must be defined before any imports
jest.mock('expo-notifications', () => {
  const mockFn = jest.fn();
  return {
    scheduleNotificationAsync: mockFn,
    setNotificationCategoryAsync: mockFn,
    setNotificationCategoriesAsync: mockFn,
    addNotificationResponseReceivedListener: mockFn.mockReturnValue({ remove: jest.fn() }),
    addNotificationReceivedListener: mockFn.mockReturnValue({ remove: jest.fn() }),
    DEFAULT_ACTION_IDENTIFIER: 'DEFAULT_ACTION_IDENTIFIER',
  };
});

jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: jest.fn((options) => options.ios || options.default) },
}));

jest.mock('../../lib/services/notifications', () => ({
  getNotificationSettings: jest.fn(() => Promise.resolve({
    enabled: true,
    messages: true,
    dms: true,
    mentions: true,
    calls: true,
    friendRequests: true,
  })),
  scheduleLocalNotification: jest.fn(),
}));

// Import after mocking
import { Platform } from 'react-native';
import {
  RichNotificationsService,
  NOTIFICATION_ACTIONS,
  IOS_NOTIFICATION_CATEGORIES,
  type RichNotificationPayload,
} from '../../lib/services/richNotifications';
import type { IncomingMessage } from '../../lib/services/notificationPipeline';

describe('RichNotificationsService', () => {
  let richNotifications: RichNotificationsService;
  let mockScheduleNotificationAsync: jest.Mock;
  let mockSetNotificationCategoryAsync: jest.Mock;
  let mockAddNotificationResponseReceivedListener: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    richNotifications = new RichNotificationsService();

    // Get the mocked functions
    const expoNotifications = require('expo-notifications');
    mockScheduleNotificationAsync = expoNotifications.scheduleNotificationAsync;
    mockSetNotificationCategoryAsync = expoNotifications.setNotificationCategoryAsync;
    mockAddNotificationResponseReceivedListener = expoNotifications.addNotificationResponseReceivedListener;

    // Reset platform to iOS
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

    // Mock successful notification scheduling
    mockScheduleNotificationAsync.mockResolvedValue('notification-123');
  });

  afterEach(() => {
    richNotifications.shutdown();
  });

  describe('initialization', () => {
    it('should initialize successfully on iOS', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

      await richNotifications.initialize();

      expect(richNotifications.isInitialized()).toBe(true);
      expect(mockAddNotificationResponseReceivedListener).toHaveBeenCalled();
      expect(mockAddNotificationReceivedListener).toHaveBeenCalled();
    });

    it('should initialize successfully on Android', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });

      await richNotifications.initialize();

      expect(richNotifications.isInitialized()).toBe(true);
      expect(mockAddNotificationResponseReceivedListener).toHaveBeenCalled();
    });

    it('should not initialize twice', async () => {
      await richNotifications.initialize();
      await richNotifications.initialize();

      // Should only be called once
      expect(mockAddNotificationResponseReceivedListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('notification actions configuration', () => {
    it('should provide correct default actions for different notification types', async () => {
      await richNotifications.initialize();

      const dmMessage = createTestMessage('dm');
      await richNotifications.scheduleMessageNotification(dmMessage);

      const scheduledCall = mockScheduleNotificationAsync.mock.calls[0][0];
      const payload = scheduledCall.content.data as RichNotificationPayload;

      expect(payload.actions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'reply' }),
          expect.objectContaining({ id: 'mark_read' }),
          expect.objectContaining({ id: 'view_conversation' }),
        ])
      );
    });

    it('should provide different actions for friend requests', async () => {
      await richNotifications.initialize();

      const payload: RichNotificationPayload = {
        type: 'friend_request',
        userId: 'user-123',
        title: 'Friend Request',
        body: 'Test friend request',
      };

      await richNotifications.scheduleRichNotification(
        payload.title,
        payload.body,
        payload
      );

      const scheduledCall = mockScheduleNotificationAsync.mock.calls[0][0];
      const scheduledPayload = scheduledCall.content.data as RichNotificationPayload;

      expect(scheduledPayload.actions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'accept_friend_request' }),
          expect.objectContaining({ id: 'decline_friend_request' }),
        ])
      );
    });

    it('should provide call-specific actions for voice calls', async () => {
      await richNotifications.initialize();

      const payload: RichNotificationPayload = {
        type: 'call',
        channelId: 'channel-123',
        userId: 'caller-456',
        title: 'Voice Call',
        body: 'Incoming call',
      };

      await richNotifications.scheduleRichNotification(
        payload.title,
        payload.body,
        payload
      );

      const scheduledCall = mockScheduleNotificationAsync.mock.calls[0][0];
      const scheduledPayload = scheduledCall.content.data as RichNotificationPayload;

      expect(scheduledPayload.actions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'join_voice_call' }),
          expect.objectContaining({ id: 'decline_call' }),
        ])
      );
    });
  });

  describe('platform-specific behavior', () => {
    it('should set iOS category identifier for iOS notifications', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      await richNotifications.initialize();

      const payload: RichNotificationPayload = {
        type: 'dm',
        title: 'Test DM',
        body: 'Test message',
      };

      await richNotifications.scheduleRichNotification(
        payload.title,
        payload.body,
        payload
      );

      const scheduledCall = mockScheduleNotificationAsync.mock.calls[0][0];
      expect(scheduledCall.content.categoryIdentifier).toBe(IOS_NOTIFICATION_CATEGORIES.DM);
    });

    it('should include actions in data for Android notifications', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
      await richNotifications.initialize();

      const payload: RichNotificationPayload = {
        type: 'message',
        title: 'Test Message',
        body: 'Test content',
      };

      await richNotifications.scheduleRichNotification(
        payload.title,
        payload.body,
        payload
      );

      const scheduledCall = mockScheduleNotificationAsync.mock.calls[0][0];
      const data = scheduledCall.content.data;

      expect(data.actions).toBeDefined();
      expect(data.actions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'reply',
            title: 'Reply',
            textInput: true,
          }),
        ])
      );
    });
  });

  describe('action handler registration', () => {
    it('should register action handlers correctly', async () => {
      const mockHandler = jest.fn();

      richNotifications.registerActionHandler('reply', mockHandler);

      expect(richNotifications.getRegisteredHandlersCount()).toBe(1);
    });

    it('should handle multiple action registrations', async () => {
      const replyHandler = jest.fn();
      const markReadHandler = jest.fn();

      richNotifications.registerActionHandler('reply', replyHandler);
      richNotifications.registerActionHandler('mark_read', markReadHandler);

      expect(richNotifications.getRegisteredHandlersCount()).toBe(2);
    });
  });

  describe('notification response handling', () => {
    it('should handle reply action with text input', async () => {
      const mockHandler = jest.fn();
      richNotifications.registerActionHandler('reply', mockHandler);
      await richNotifications.initialize();

      // Simulate notification response
      const mockResponse = {
        notification: {
          request: {
            identifier: 'notification-123',
            content: {
              data: {
                type: 'dm',
                channelId: 'channel-123',
                messageId: 'message-456',
              } as RichNotificationPayload,
            },
          },
        },
        actionIdentifier: 'reply',
        userText: 'This is my reply',
      };

      // Get the registered listener and call it
      const listenerCall = mockAddNotificationResponseReceivedListener.mock.calls[0];
      const listener = listenerCall[0];
      await listener(mockResponse);

      expect(mockHandler).toHaveBeenCalledWith({
        actionId: 'reply',
        notificationPayload: mockResponse.notification.request.content.data,
        userText: 'This is my reply',
        timestamp: expect.any(Number),
      });
    });

    it('should ignore default action identifier (notification tap)', async () => {
      const mockHandler = jest.fn();
      richNotifications.registerActionHandler('reply', mockHandler);
      await richNotifications.initialize();

      const mockResponse = {
        notification: {
          request: {
            content: {
              data: { type: 'dm' } as RichNotificationPayload,
            },
          },
        },
        actionIdentifier: 'DEFAULT_ACTION_IDENTIFIER',
      };

      const listenerCall = mockAddNotificationResponseReceivedListener.mock.calls[0];
      const listener = listenerCall[0];
      await listener(mockResponse);

      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should handle unregistered actions gracefully', async () => {
      await richNotifications.initialize();

      const mockResponse = {
        notification: {
          request: {
            content: {
              data: { type: 'dm' } as RichNotificationPayload,
            },
          },
        },
        actionIdentifier: 'unknown_action',
      };

      const listenerCall = mockAddNotificationResponseReceivedListener.mock.calls[0];
      const listener = listenerCall[0];

      // Should not throw
      await expect(listener(mockResponse)).resolves.toBeUndefined();
    });
  });

  describe('message notification helpers', () => {
    it('should schedule message notification with correct formatting', async () => {
      await richNotifications.initialize();

      const message = createTestMessage('mention');
      await richNotifications.scheduleMessageNotification(message);

      expect(mockScheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'testuser mentioned you',
          body: 'Test message content',
          data: expect.objectContaining({
            type: 'mention',
            channelId: 'channel-123',
            messageId: 'msg-456',
            userId: 'user-789',
            actions: expect.arrayContaining([
              expect.objectContaining({ id: 'reply' }),
            ]),
          }),
          sound: true,
          categoryIdentifier: IOS_NOTIFICATION_CATEGORIES.MENTION,
        },
        trigger: null,
      });
    });

    it('should truncate long message content', async () => {
      await richNotifications.initialize();

      const longMessage = createTestMessage('dm');
      longMessage.content = 'A'.repeat(150);

      await richNotifications.scheduleMessageNotification(longMessage);

      const scheduledCall = mockScheduleNotificationAsync.mock.calls[0][0];
      expect(scheduledCall.content.body).toHaveLength(100);
      expect(scheduledCall.content.body).toEndWith('...');
    });
  });

  describe('error handling', () => {
    it('should throw error when scheduling disabled notifications', async () => {
      const { getNotificationSettings } = require('../../lib/services/notifications');
      getNotificationSettings.mockResolvedValueOnce({ enabled: false });

      await richNotifications.initialize();

      const payload: RichNotificationPayload = {
        type: 'message',
        title: 'Test',
        body: 'Test',
      };

      await expect(
        richNotifications.scheduleRichNotification('Test', 'Test', payload)
      ).rejects.toThrow('Notifications are disabled');
    });

    it('should handle notification scheduling errors', async () => {
      mockScheduleNotificationAsync.mockRejectedValueOnce(new Error('Scheduling failed'));

      await richNotifications.initialize();

      const payload: RichNotificationPayload = {
        type: 'message',
        title: 'Test',
        body: 'Test',
      };

      await expect(
        richNotifications.scheduleRichNotification('Test', 'Test', payload)
      ).rejects.toThrow('Scheduling failed');
    });
  });

  describe('cleanup and shutdown', () => {
    it('should clean up listeners on shutdown', () => {
      richNotifications.initialize();
      richNotifications.shutdown();

      expect(richNotifications.isInitialized()).toBe(false);
      expect(richNotifications.getRegisteredHandlersCount()).toBe(0);
    });
  });
});

function createTestMessage(type: string): IncomingMessage {
  return {
    id: 'msg-456',
    content: 'Test message content',
    author: {
      id: 'user-789',
      username: 'testuser',
      avatar: 'https://example.com/avatar.png',
    },
    channel: {
      id: 'channel-123',
      name: 'general',
      type: 'text',
    },
    server: {
      id: 'server-999',
      name: 'Test Server',
    },
    timestamp: Date.now(),
    type: type as any,
  };
}
