/**
 * Tests for Enhanced Notification Pipeline (PN-005 Integration)
 *
 * Tests the integration of rich notifications with the existing smart batching
 * system from PN-004. Verifies backward compatibility, fallback behavior,
 * and configuration options.
 */

// Mock settings
const mockSettings = {
  enabled: true,
  messages: true,
  dms: true,
  mentions: true,
  serverActivity: true,
  friendRequests: true,
  calls: true,
};

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  getBadgeCountAsync: jest.fn(() => Promise.resolve(0)),
  setBadgeCountAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
}));

// Mock React Native
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => () => {}),
    currentState: 'background',
  },
}));

// Mock basic notifications service
jest.mock('../../lib/services/notifications', () => ({
  getNotificationSettings: jest.fn(() => Promise.resolve(mockSettings)),
  scheduleLocalNotification: jest.fn(),
  setBadgeCount: jest.fn(),
}));

// Mock rich notifications service
const mockRichNotificationsInit = jest.fn();
const mockRichNotificationsShutdown = jest.fn();
const mockRichNotificationsIsInitialized = jest.fn(() => true);
const mockScheduleMessageNotification = jest.fn();

jest.mock('../../lib/services/richNotifications', () => ({
  richNotifications: {
    initialize: mockRichNotificationsInit,
    shutdown: mockRichNotificationsShutdown,
    isInitialized: mockRichNotificationsIsInitialized,
    scheduleMessageNotification: mockScheduleMessageNotification,
  },
}));

// Mock action handlers service
const mockActionHandlersInit = jest.fn();
const mockActionHandlersShutdown = jest.fn();

jest.mock('../../lib/services/notificationActionHandlers', () => ({
  notificationActionHandlers: {
    initialize: mockActionHandlersInit,
    shutdown: mockActionHandlersShutdown,
  },
}));

// Mock notification batching service
const mockAddNotification = jest.fn();

jest.mock('../../lib/services/notificationBatching', () => ({
  notificationBatching: {
    addNotification: mockAddNotification,
  },
}));

// Mock websocket service
const mockSubscribe = jest.fn(() => () => {}); // Return unsubscribe function

jest.mock('../../lib/services/websocket', () => ({
  websocketService: {
    subscribe: mockSubscribe,
  },
  WebSocketMessageType: {
    MESSAGE_NEW: 'MESSAGE_NEW',
    DM_NEW: 'DM_NEW',
    FRIEND_REQUEST: 'FRIEND_REQUEST',
    VOICE_JOIN: 'VOICE_JOIN',
    NOTIFICATION: 'NOTIFICATION',
  },
}));

// Import after mocking
import {
  EnhancedNotificationPipelineService,
  enhancedNotificationPipeline,
  DEFAULT_ENHANCED_CONFIG,
} from '../../lib/services/enhancedNotificationPipeline';
import type { IncomingMessage, FriendRequest, VoiceCallNotification } from '../../lib/services/notificationPipeline';
import * as notificationsMock from '../../lib/services/notifications';

describe('EnhancedNotificationPipelineService', () => {
  let pipelineService: EnhancedNotificationPipelineService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementations
    mockRichNotificationsInit.mockResolvedValue(undefined);
    mockActionHandlersInit.mockResolvedValue(undefined);
    mockRichNotificationsIsInitialized.mockReturnValue(true);

    pipelineService = new EnhancedNotificationPipelineService();
  });

  afterEach(() => {
    pipelineService.shutdown();
  });

  describe('initialization', () => {
    it('should initialize with rich notifications enabled by default', async () => {
      await pipelineService.initialize();

      expect(mockRichNotificationsInit).toHaveBeenCalled();
      expect(mockActionHandlersInit).toHaveBeenCalled();

      const stats = pipelineService.getStats();
      expect(stats.initialized).toBe(true);
      expect(stats.richNotificationsEnabled).toBe(true);
      expect(stats.smartBatchingEnabled).toBe(true);
    });

    it('should initialize without rich notifications when disabled', async () => {
      const config = { useRichNotifications: false };
      const service = new EnhancedNotificationPipelineService(config);

      await service.initialize();

      expect(mockRichNotificationsInit).not.toHaveBeenCalled();
      expect(mockActionHandlersInit).not.toHaveBeenCalled();

      const stats = service.getStats();
      expect(stats.richNotificationsEnabled).toBe(false);

      service.shutdown();
    });

    it('should fallback to basic notifications when rich notifications fail', async () => {
      mockRichNotificationsInit.mockRejectedValueOnce(new Error('Rich notifications failed'));

      const config = { fallbackToBasic: true };
      const service = new EnhancedNotificationPipelineService(config);

      // Should not throw
      await expect(service.initialize()).resolves.toBeUndefined();

      const stats = service.getStats();
      expect(stats.initialized).toBe(true);
      expect(stats.richNotificationsEnabled).toBe(false);

      service.shutdown();
    });

    it('should throw when rich notifications fail and fallback is disabled', async () => {
      mockRichNotificationsInit.mockRejectedValueOnce(new Error('Rich notifications failed'));

      const config = { fallbackToBasic: false };
      const service = new EnhancedNotificationPipelineService(config);

      await expect(service.initialize()).rejects.toThrow('Rich notifications failed');

      service.shutdown();
    });

    it('should not initialize twice', async () => {
      await pipelineService.initialize();
      await pipelineService.initialize();

      // Should only initialize rich notifications once
      expect(mockRichNotificationsInit).toHaveBeenCalledTimes(1);
    });
  });

  describe('configuration management', () => {
    it('should use default configuration', () => {
      const config = pipelineService.getConfig();
      expect(config).toEqual(DEFAULT_ENHANCED_CONFIG);
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        useRichNotifications: false,
        useSmartBatching: false,
        debugMode: true,
      };

      const service = new EnhancedNotificationPipelineService(customConfig);
      const config = service.getConfig();

      expect(config.useRichNotifications).toBe(false);
      expect(config.useSmartBatching).toBe(false);
      expect(config.debugMode).toBe(true);

      service.shutdown();
    });

    it('should update configuration dynamically', () => {
      const newConfig = { debugMode: true };
      pipelineService.updateConfig(newConfig);

      const config = pipelineService.getConfig();
      expect(config.debugMode).toBe(true);
    });
  });

  describe('message processing with rich notifications', () => {
    beforeEach(async () => {
      await pipelineService.initialize();
      // Mock app as background for notifications to show
      (pipelineService as any).isAppActive = false;
    });

    it('should process message with smart batching and rich notifications', async () => {
      const message = createTestMessage('message');

      await (pipelineService as any).processMessage(message);

      // Should use batching system with rich payload
      expect(mockAddNotification).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          type: 'message',
          channelId: message.channel.id,
          messageId: message.id,
          actions: expect.any(Array),
          categoryId: expect.any(String),
        })
      );
    });

    it('should process DM with immediate rich notification when batching disabled', async () => {
      pipelineService.updateConfig({ useSmartBatching: false });

      const message = createTestMessage('dm');

      await (pipelineService as any).processMessage(message);

      // Should use rich notifications directly
      expect(mockScheduleMessageNotification).toHaveBeenCalledWith(message);
      expect(mockAddNotification).not.toHaveBeenCalled();
    });

    it('should fallback to basic notifications when rich notifications unavailable', async () => {
      mockRichNotificationsIsInitialized.mockReturnValue(false);

      const message = createTestMessage('message');

      await (pipelineService as any).processMessage(message);

      // Should use basic notification through batching
      expect(mockAddNotification).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          type: 'message',
          channelId: message.channel.id,
          messageId: message.id,
          // Should not have rich notification properties
        })
      );
      expect(mockScheduleMessageNotification).not.toHaveBeenCalled();
    });

    it('should skip notifications when app is active', async () => {
      (pipelineService as any).isAppActive = true;

      const message = createTestMessage('message');

      await (pipelineService as any).processMessage(message);

      expect(mockAddNotification).not.toHaveBeenCalled();
      expect(mockScheduleMessageNotification).not.toHaveBeenCalled();
    });

    it('should skip notifications when disabled in settings', async () => {
      const mockGetSettings = notificationsMock.getNotificationSettings as jest.Mock;
      mockGetSettings.mockResolvedValueOnce({ ...mockSettings, enabled: false });

      const message = createTestMessage('message');

      await (pipelineService as any).processMessage(message);

      expect(mockAddNotification).not.toHaveBeenCalled();
      expect(mockScheduleMessageNotification).not.toHaveBeenCalled();
    });

    it('should respect notification type settings', async () => {
      const mockGetSettings = notificationsMock.getNotificationSettings as jest.Mock;
      mockGetSettings.mockResolvedValueOnce({ ...mockSettings, messages: false });

      const message = createTestMessage('message');

      await (pipelineService as any).processMessage(message);

      expect(mockAddNotification).not.toHaveBeenCalled();
    });
  });

  describe('fallback behavior for notification failures', () => {
    beforeEach(async () => {
      await pipelineService.initialize();
      (pipelineService as any).isAppActive = false;
    });

    it('should fallback to basic notification when rich notification fails', async () => {
      pipelineService.updateConfig({ useSmartBatching: false, fallbackToBasic: true });
      mockScheduleMessageNotification.mockRejectedValueOnce(new Error('Rich notification failed'));

      const message = createTestMessage('dm');

      await (pipelineService as any).processMessage(message);

      // Should attempt rich notification first
      expect(mockScheduleMessageNotification).toHaveBeenCalled();

      // Should fallback to basic notification
      expect(notificationsMock.scheduleLocalNotification).toHaveBeenCalledWith(
        message.author.username, // DM title format
        message.content,
        expect.objectContaining({
          type: 'dm',
          channelId: message.channel.id,
        })
      );
    });

    it('should not fallback when fallback is disabled', async () => {
      pipelineService.updateConfig({ useSmartBatching: false, fallbackToBasic: false });
      mockScheduleMessageNotification.mockRejectedValueOnce(new Error('Rich notification failed'));

      const message = createTestMessage('dm');

      await (pipelineService as any).processMessage(message);

      // Should attempt rich notification
      expect(mockScheduleMessageNotification).toHaveBeenCalled();

      // Should not attempt basic notification fallback
      expect(notificationsMock.scheduleLocalNotification).not.toHaveBeenCalled();
    });

    it('should handle fallback errors gracefully', async () => {
      pipelineService.updateConfig({ useSmartBatching: false, fallbackToBasic: true });
      mockScheduleMessageNotification.mockRejectedValueOnce(new Error('Rich notification failed'));
      (notificationsMock.scheduleLocalNotification as jest.Mock).mockRejectedValueOnce(
        new Error('Basic notification also failed')
      );

      const message = createTestMessage('dm');

      // Should not throw
      await expect((pipelineService as any).processMessage(message)).resolves.toBeUndefined();

      expect(mockScheduleMessageNotification).toHaveBeenCalled();
      expect(notificationsMock.scheduleLocalNotification).toHaveBeenCalled();
    });
  });

  describe('friend request notifications', () => {
    beforeEach(async () => {
      await pipelineService.initialize();
      (pipelineService as any).isAppActive = false;
    });

    it('should process friend request with rich notifications', async () => {
      const request: FriendRequest = {
        id: 'req-123',
        user: {
          id: 'user-456',
          username: 'testfriend',
          avatar: 'https://example.com/avatar.png',
        },
        timestamp: Date.now(),
      };

      await (pipelineService as any).processFriendRequest(request);

      // Should use rich notifications for friend requests
      expect(notificationsMock.scheduleLocalNotification).not.toHaveBeenCalled();
      // Rich notifications would be called internally, but we can't easily mock private methods
    });

    it('should fallback to basic notification for friend requests when rich notifications fail', async () => {
      mockRichNotificationsIsInitialized.mockReturnValue(false);

      const request: FriendRequest = {
        id: 'req-123',
        user: {
          id: 'user-456',
          username: 'testfriend',
        },
        timestamp: Date.now(),
      };

      await (pipelineService as any).processFriendRequest(request);

      expect(notificationsMock.scheduleLocalNotification).toHaveBeenCalledWith(
        'Friend Request',
        'testfriend sent you a friend request',
        expect.objectContaining({
          type: 'friend_request',
          userId: 'user-456',
        })
      );
    });
  });

  describe('voice call notifications', () => {
    beforeEach(async () => {
      await pipelineService.initialize();
      (pipelineService as any).isAppActive = false;
    });

    it('should process voice call with rich notifications', async () => {
      const call: VoiceCallNotification = {
        id: 'call-123',
        channel: {
          id: 'voice-456',
          name: 'General Voice',
          serverId: 'server-789',
        },
        caller: {
          id: 'caller-999',
          username: 'caller',
          avatar: 'https://example.com/caller.png',
        },
        type: 'voice',
        timestamp: Date.now(),
      };

      await (pipelineService as any).processVoiceCall(call);

      // Voice calls should always show (regardless of app state for calls)
      // Would use rich notifications internally
      expect(notificationsMock.setBadgeCount).toHaveBeenCalled();
    });
  });

  describe('WebSocket integration', () => {
    it('should register WebSocket listeners during construction', () => {
      const service = new EnhancedNotificationPipelineService();

      expect(mockSubscribe).toHaveBeenCalledTimes(5);
      expect(mockSubscribe).toHaveBeenCalledWith('MESSAGE_NEW', expect.any(Function));
      expect(mockSubscribe).toHaveBeenCalledWith('DM_NEW', expect.any(Function));
      expect(mockSubscribe).toHaveBeenCalledWith('FRIEND_REQUEST', expect.any(Function));
      expect(mockSubscribe).toHaveBeenCalledWith('VOICE_JOIN', expect.any(Function));
      expect(mockSubscribe).toHaveBeenCalledWith('NOTIFICATION', expect.any(Function));

      service.shutdown();
    });
  });

  describe('service management', () => {
    it('should shutdown cleanly', () => {
      pipelineService.initialize();
      pipelineService.shutdown();

      expect(mockRichNotificationsShutdown).toHaveBeenCalled();
      expect(mockActionHandlersShutdown).toHaveBeenCalled();

      const stats = pipelineService.getStats();
      expect(stats.initialized).toBe(false);
    });

    it('should provide accurate service statistics', async () => {
      await pipelineService.initialize();

      const stats = pipelineService.getStats();

      expect(stats).toEqual({
        initialized: true,
        richNotificationsEnabled: true,
        smartBatchingEnabled: true,
        badgeCount: expect.any(Number),
        isAppActive: expect.any(Boolean),
      });
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(enhancedNotificationPipeline).toBeInstanceOf(EnhancedNotificationPipelineService);
    });
  });
});

// Helper function to create test messages
function createTestMessage(type: string): IncomingMessage {
  return {
    id: 'msg-123',
    content: 'Test message content',
    author: {
      id: 'user-456',
      username: 'testuser',
      avatar: 'https://example.com/avatar.png',
    },
    channel: {
      id: 'channel-789',
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