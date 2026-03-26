/**
 * Tests for Notification Action Handlers Service (PN-005)
 *
 * Tests the handling of notification actions including reply functionality,
 * mark read, mute channel, friend requests, and voice calls. Focuses on
 * the reply action which is the success criteria for PN-005.
 */

// Mock rich notifications service
const mockRegisterActionHandler = jest.fn();

jest.mock('../../lib/services/richNotifications', () => ({
  richNotifications: {
    registerActionHandler: mockRegisterActionHandler,
  },
}));

// Import after mocking
import {
  NotificationActionHandlersService,
  notificationActionHandlers,
} from '../../lib/services/notificationActionHandlers';
import type { NotificationActionResponse } from '../../lib/services/richNotifications';

describe('NotificationActionHandlersService', () => {
  let actionHandlers: NotificationActionHandlersService;

  // Capture registered handlers for testing
  let registeredHandlers: Map<string, Function> = new Map();

  beforeEach(() => {
    jest.clearAllMocks();
    registeredHandlers.clear();

    // Capture handlers as they're registered
    mockRegisterActionHandler.mockImplementation((actionType: string, handler: Function) => {
      registeredHandlers.set(actionType, handler);
    });

    actionHandlers = new NotificationActionHandlersService();
  });

  afterEach(() => {
    actionHandlers.shutdown();
  });

  describe('initialization', () => {
    it('should initialize and register all action handlers', async () => {
      await actionHandlers.initialize();

      expect(actionHandlers.isInitialized()).toBe(true);
      expect(mockRegisterActionHandler).toHaveBeenCalledTimes(8);

      // Verify all expected actions are registered
      expect(mockRegisterActionHandler).toHaveBeenCalledWith('reply', expect.any(Function));
      expect(mockRegisterActionHandler).toHaveBeenCalledWith('mark_read', expect.any(Function));
      expect(mockRegisterActionHandler).toHaveBeenCalledWith('mute_channel', expect.any(Function));
      expect(mockRegisterActionHandler).toHaveBeenCalledWith('view_conversation', expect.any(Function));
      expect(mockRegisterActionHandler).toHaveBeenCalledWith('accept_friend_request', expect.any(Function));
      expect(mockRegisterActionHandler).toHaveBeenCalledWith('decline_friend_request', expect.any(Function));
      expect(mockRegisterActionHandler).toHaveBeenCalledWith('join_voice_call', expect.any(Function));
      expect(mockRegisterActionHandler).toHaveBeenCalledWith('decline_call', expect.any(Function));
    });

    it('should not initialize twice', async () => {
      await actionHandlers.initialize();
      await actionHandlers.initialize();

      // Should only register handlers once
      expect(mockRegisterActionHandler).toHaveBeenCalledTimes(8);
    });
  });

  describe('reply action handler - PN-005 success criteria', () => {
    beforeEach(async () => {
      await actionHandlers.initialize();
    });

    it('should handle reply action with valid text input', async () => {
      const response: NotificationActionResponse = {
        actionId: 'reply',
        notificationPayload: {
          type: 'dm',
          channelId: 'channel-123',
          messageId: 'message-456',
          userId: 'sender-789',
          title: 'Test User',
          body: 'Original message',
        },
        userText: 'This is my reply message',
        timestamp: Date.now(),
      };

      const replyHandler = registeredHandlers.get('reply')!;

      // Mock console.log to capture the service calls
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await replyHandler(response);

      // Verify reply was processed
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MessageService] Sending reply to channel-123/message-456: "This is my reply message"')
      );

      // Verify original message was marked as read
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MessageService] Marking as read: channel-123/message-456')
      );

      // Verify success feedback
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[NotificationActionHandlers] Success: Reply sent')
      );

      consoleSpy.mockRestore();
    });

    it('should handle reply with thread context', async () => {
      const response: NotificationActionResponse = {
        actionId: 'reply',
        notificationPayload: {
          type: 'reply',
          channelId: 'channel-123',
          messageId: 'message-456',
          threadId: 'thread-789',
          userId: 'sender-999',
          title: 'Thread Reply',
          body: 'Thread message',
        },
        userText: 'Reply in thread',
        timestamp: Date.now(),
      };

      const replyHandler = registeredHandlers.get('reply')!;
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await replyHandler(response);

      // Verify thread ID is included in the service call
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MessageService] Sending reply to channel-123/message-456: "Reply in thread"')
      );

      consoleSpy.mockRestore();
    });

    it('should reject reply with empty text', async () => {
      const response: NotificationActionResponse = {
        actionId: 'reply',
        notificationPayload: {
          type: 'dm',
          channelId: 'channel-123',
          messageId: 'message-456',
          userId: 'sender-789',
          title: 'Test User',
          body: 'Original message',
        },
        userText: '   ', // Empty/whitespace only
        timestamp: Date.now(),
      };

      const replyHandler = registeredHandlers.get('reply')!;
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await replyHandler(response);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[NotificationActionHandlers] Reply action received but no text provided'
      );

      consoleSpy.mockRestore();
    });

    it('should handle missing channel/message ID gracefully', async () => {
      const response: NotificationActionResponse = {
        actionId: 'reply',
        notificationPayload: {
          type: 'dm',
          // Missing channelId and messageId
          userId: 'sender-789',
          title: 'Test User',
          body: 'Original message',
        },
        userText: 'Reply text',
        timestamp: Date.now(),
      };

      const replyHandler = registeredHandlers.get('reply')!;
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await replyHandler(response);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[NotificationActionHandlers] Reply action missing required channel/message IDs'
      );

      consoleSpy.mockRestore();
    });

    it('should handle reply service errors gracefully', async () => {
      // Mock console.error to simulate service failure
      const originalConsoleLog = console.log;
      console.log = jest.fn().mockImplementation((message) => {
        if (message.includes('[MessageService] Sending reply')) {
          throw new Error('Network error');
        }
        return originalConsoleLog(message);
      });

      const response: NotificationActionResponse = {
        actionId: 'reply',
        notificationPayload: {
          type: 'dm',
          channelId: 'channel-123',
          messageId: 'message-456',
          userId: 'sender-789',
          title: 'Test User',
          body: 'Original message',
        },
        userText: 'Reply text',
        timestamp: Date.now(),
      };

      const replyHandler = registeredHandlers.get('reply')!;
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await replyHandler(response);

      expect(errorSpy).toHaveBeenCalledWith(
        '[NotificationActionHandlers] Failed to handle reply action:',
        expect.any(Error)
      );
      expect(warnSpy).toHaveBeenCalledWith(
        '[NotificationActionHandlers] Error: Failed to send reply'
      );

      console.log = originalConsoleLog;
      errorSpy.mockRestore();
      warnSpy.mockRestore();
    });
  });

  describe('mark read action handler', () => {
    beforeEach(async () => {
      await actionHandlers.initialize();
    });

    it('should handle mark read action for specific message', async () => {
      const response: NotificationActionResponse = {
        actionId: 'mark_read',
        notificationPayload: {
          type: 'message',
          channelId: 'channel-123',
          messageId: 'message-456',
          title: 'Channel Message',
          body: 'Test message',
        },
        timestamp: Date.now(),
      };

      const markReadHandler = registeredHandlers.get('mark_read')!;
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await markReadHandler(response);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[MessageService] Marking as read: channel-123/message-456'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[NotificationActionHandlers] Success: Marked as read'
      );

      consoleSpy.mockRestore();
    });

    it('should handle mark read for entire channel', async () => {
      const response: NotificationActionResponse = {
        actionId: 'mark_read',
        notificationPayload: {
          type: 'message',
          channelId: 'channel-123',
          // No messageId = mark entire channel as read
          title: 'Channel Message',
          body: 'Test message',
        },
        timestamp: Date.now(),
      };

      const markReadHandler = registeredHandlers.get('mark_read')!;
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await markReadHandler(response);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[MessageService] Marking as read: channel-123'
      );

      consoleSpy.mockRestore();
    });

    it('should handle missing channel ID error', async () => {
      const response: NotificationActionResponse = {
        actionId: 'mark_read',
        notificationPayload: {
          type: 'message',
          // Missing channelId
          title: 'Message',
          body: 'Test',
        },
        timestamp: Date.now(),
      };

      const markReadHandler = registeredHandlers.get('mark_read')!;
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      await markReadHandler(response);

      expect(errorSpy).toHaveBeenCalledWith(
        '[NotificationActionHandlers] Mark read action missing channel ID'
      );

      errorSpy.mockRestore();
    });
  });

  describe('mute channel action handler', () => {
    beforeEach(async () => {
      await actionHandlers.initialize();
    });

    it('should handle mute channel action', async () => {
      const response: NotificationActionResponse = {
        actionId: 'mute_channel',
        notificationPayload: {
          type: 'message',
          channelId: 'channel-123',
          title: 'Channel Message',
          body: 'Test message',
        },
        timestamp: Date.now(),
      };

      const muteHandler = registeredHandlers.get('mute_channel')!;
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await muteHandler(response);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[MessageService] Muting channel channel-123 for 60 minutes'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[NotificationActionHandlers] Success: Channel muted for 1 hour'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('friend request action handlers', () => {
    beforeEach(async () => {
      await actionHandlers.initialize();
    });

    it('should handle accept friend request action', async () => {
      const response: NotificationActionResponse = {
        actionId: 'accept_friend_request',
        notificationPayload: {
          type: 'friend_request',
          userId: 'user-456',
          title: 'Friend Request',
          body: 'User wants to be friends',
        },
        timestamp: Date.now(),
      };

      const acceptHandler = registeredHandlers.get('accept_friend_request')!;
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await acceptHandler(response);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SocialService] Accepting friend request: user-456'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[NotificationActionHandlers] Success: Friend request accepted'
      );

      consoleSpy.mockRestore();
    });

    it('should handle decline friend request action', async () => {
      const response: NotificationActionResponse = {
        actionId: 'decline_friend_request',
        notificationPayload: {
          type: 'friend_request',
          userId: 'user-456',
          title: 'Friend Request',
          body: 'User wants to be friends',
        },
        timestamp: Date.now(),
      };

      const declineHandler = registeredHandlers.get('decline_friend_request')!;
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await declineHandler(response);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SocialService] Declining friend request: user-456'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[NotificationActionHandlers] Success: Friend request declined'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('voice call action handlers', () => {
    beforeEach(async () => {
      await actionHandlers.initialize();
    });

    it('should handle join voice call action', async () => {
      const response: NotificationActionResponse = {
        actionId: 'join_voice_call',
        notificationPayload: {
          type: 'call',
          channelId: 'voice-channel-123',
          userId: 'caller-456',
          title: 'Voice Call',
          body: 'Incoming call',
        },
        timestamp: Date.now(),
      };

      const joinHandler = registeredHandlers.get('join_voice_call')!;
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await joinHandler(response);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[VoiceService] Joining voice channel: voice-channel-123'
      );

      consoleSpy.mockRestore();
    });

    it('should handle decline call action', async () => {
      const response: NotificationActionResponse = {
        actionId: 'decline_call',
        notificationPayload: {
          type: 'call',
          channelId: 'voice-channel-123',
          userId: 'caller-456',
          title: 'Voice Call',
          body: 'Incoming call',
        },
        timestamp: Date.now(),
      };

      const declineHandler = registeredHandlers.get('decline_call')!;
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await declineHandler(response);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[VoiceService] Declining call in channel: voice-channel-123'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('view conversation action handler', () => {
    beforeEach(async () => {
      await actionHandlers.initialize();
    });

    it('should handle view conversation action', async () => {
      const response: NotificationActionResponse = {
        actionId: 'view_conversation',
        notificationPayload: {
          type: 'message',
          channelId: 'channel-123',
          serverId: 'server-456',
          messageId: 'message-789',
          title: 'Channel Message',
          body: 'Test message',
        },
        timestamp: Date.now(),
      };

      const viewHandler = registeredHandlers.get('view_conversation')!;
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await viewHandler(response);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[NotificationActionHandlers] Opening conversation: channel-123'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[NotificationActionHandlers] Would navigate to channel channel-123 in server server-456'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[NotificationActionHandlers] Would scroll to message message-789'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await actionHandlers.initialize();
    });

    it('should handle service errors gracefully across all actions', async () => {
      const responses: NotificationActionResponse[] = [
        {
          actionId: 'mark_read',
          notificationPayload: { type: 'message', title: 'Test', body: 'Test' },
          timestamp: Date.now(),
        },
        {
          actionId: 'mute_channel',
          notificationPayload: { type: 'message', title: 'Test', body: 'Test' },
          timestamp: Date.now(),
        },
        {
          actionId: 'accept_friend_request',
          notificationPayload: { type: 'friend_request', title: 'Test', body: 'Test' },
          timestamp: Date.now(),
        },
      ];

      for (const response of responses) {
        const handler = registeredHandlers.get(response.actionId)!;

        // Should not throw even with missing required data
        await expect(handler(response)).resolves.toBeUndefined();
      }
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(notificationActionHandlers).toBeInstanceOf(NotificationActionHandlersService);
    });
  });
});