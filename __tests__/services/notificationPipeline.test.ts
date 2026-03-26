/**
 * Tests for Notification Pipeline Service (PN-002)
 *
 * Tests the basic push notification delivery pipeline that connects
 * WebSocket messaging with local notification display.
 */

// Mock dependencies
const mockNotifications = {
  getBadgeCountAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(),
};

const mockWebSocket = {
  subscribe: jest.fn(),
  isConnected: jest.fn(() => true),
};

const mockAppState = {
  addEventListener: jest.fn(),
  currentState: 'active',
};

const mockNotificationSettings = {
  enabled: true,
  messages: true,
  dms: true,
  mentions: true,
  serverActivity: true,
  friendRequests: true,
  calls: true,
  sounds: true,
  vibration: true,
  badgeCount: true,
  showPreviews: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
};

const mockNotificationService = {
  getNotificationSettings: jest.fn(() => Promise.resolve(mockNotificationSettings)),
  scheduleLocalNotification: jest.fn(),
  setBadgeCount: jest.fn(),
};

// Apply mocks
jest.mock('expo-notifications', () => mockNotifications);
jest.mock('react-native', () => ({ AppState: mockAppState }));
jest.mock('../../lib/services/websocket', () => ({ websocketService: mockWebSocket }));
jest.mock('../../lib/services/notifications', () => mockNotificationService);

// Import after mocking
import { notificationPipeline } from '../../lib/services/notificationPipeline';
import type { IncomingMessage, FriendRequest, VoiceCallNotification } from '../../lib/services/notificationPipeline';

describe('NotificationPipelineService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWebSocket.subscribe.mockImplementation(() => () => {});
    mockNotifications.getBadgeCountAsync.mockResolvedValue(0);
  });

  describe('initialization', () => {
    it('should initialize successfully and get badge count', async () => {
      mockNotifications.getBadgeCountAsync.mockResolvedValue(5);

      await notificationPipeline.initialize();

      expect(mockNotifications.getBadgeCountAsync).toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      mockNotifications.getBadgeCountAsync.mockRejectedValue(new Error('Badge error'));

      await expect(notificationPipeline.initialize()).resolves.toBeUndefined();
    });
  });

  describe('message processing', () => {
    const mockMessage: IncomingMessage = {
      id: 'msg-123',
      content: 'Hello there!',
      author: {
        id: 'user-456',
        username: 'testuser',
        avatar: 'https://example.com/avatar.jpg',
      },
      channel: {
        id: 'channel-789',
        name: 'general',
        type: 'text',
        serverId: 'server-101',
      },
      server: {
        id: 'server-101',
        name: 'Test Server',
        icon: 'https://example.com/server.jpg',
      },
      timestamp: Date.now(),
      type: 'message',
    };

    it('should format notification title correctly for server messages', () => {
      // Access private method through reflection for testing
      const pipeline = notificationPipeline as any;
      const title = pipeline.formatNotificationTitle(mockMessage);
      expect(title).toBe('#general • Test Server');
    });

    it('should format notification title correctly for DMs', () => {
      const dmMessage = {
        ...mockMessage,
        type: 'dm' as const,
        server: undefined,
      };

      const pipeline = notificationPipeline as any;
      const title = pipeline.formatNotificationTitle(dmMessage);
      expect(title).toBe('testuser');
    });

    it('should format notification title correctly for mentions', () => {
      const mentionMessage = {
        ...mockMessage,
        type: 'mention' as const,
      };

      const pipeline = notificationPipeline as any;
      const title = pipeline.formatNotificationTitle(mentionMessage);
      expect(title).toBe('testuser mentioned you');
    });

    it('should format notification body with content truncation', () => {
      const longMessage = {
        ...mockMessage,
        content: 'A'.repeat(150), // Long content that should be truncated
      };

      const pipeline = notificationPipeline as any;
      const body = pipeline.formatNotificationBody(longMessage);
      expect(body).toHaveLength(100);
      expect(body).toEndWith('...');
    });

    it('should create correct notification payload', () => {
      const pipeline = notificationPipeline as any;
      const payload = pipeline.createNotificationPayload(mockMessage);

      expect(payload).toEqual({
        type: 'message',
        serverId: 'server-101',
        channelId: 'channel-789',
        messageId: 'msg-123',
        threadId: undefined,
        userId: 'user-456',
        title: '#general • Test Server',
        body: 'Hello there!',
        imageUrl: 'https://example.com/avatar.jpg',
      });
    });
  });

  describe('notification filtering', () => {
    it('should not show notifications when disabled', async () => {
      mockNotificationService.getNotificationSettings.mockResolvedValue({
        ...mockNotificationSettings,
        enabled: false,
      });

      const pipeline = notificationPipeline as any;
      const message: IncomingMessage = {
        id: 'msg-123',
        content: 'Test message',
        author: { id: 'user-456', username: 'testuser' },
        channel: { id: 'channel-789', name: 'general', type: 'text' },
        timestamp: Date.now(),
        type: 'message',
      };

      await pipeline.processMessage(message);

      expect(mockNotificationService.scheduleLocalNotification).not.toHaveBeenCalled();
    });

    it('should not show notifications when app is active', async () => {
      // Simulate app in foreground
      const pipeline = notificationPipeline as any;
      pipeline.isAppActive = true;

      const message: IncomingMessage = {
        id: 'msg-123',
        content: 'Test message',
        author: { id: 'user-456', username: 'testuser' },
        channel: { id: 'channel-789', name: 'general', type: 'text' },
        timestamp: Date.now(),
        type: 'message',
      };

      await pipeline.processMessage(message);

      expect(mockNotificationService.scheduleLocalNotification).not.toHaveBeenCalled();
    });

    it('should respect notification type settings', async () => {
      mockNotificationService.getNotificationSettings.mockResolvedValue({
        ...mockNotificationSettings,
        messages: false, // Disable message notifications
      });

      const pipeline = notificationPipeline as any;
      pipeline.isAppActive = false; // App in background

      const message: IncomingMessage = {
        id: 'msg-123',
        content: 'Test message',
        author: { id: 'user-456', username: 'testuser' },
        channel: { id: 'channel-789', name: 'general', type: 'text' },
        timestamp: Date.now(),
        type: 'message',
      };

      await pipeline.processMessage(message);

      expect(mockNotificationService.scheduleLocalNotification).not.toHaveBeenCalled();
    });

    it('should show notifications for allowed types when app is in background', async () => {
      const pipeline = notificationPipeline as any;
      pipeline.isAppActive = false; // App in background

      const message: IncomingMessage = {
        id: 'msg-123',
        content: 'Test message',
        author: { id: 'user-456', username: 'testuser' },
        channel: { id: 'channel-789', name: 'general', type: 'text' },
        timestamp: Date.now(),
        type: 'message',
      };

      await pipeline.processMessage(message);

      expect(mockNotificationService.scheduleLocalNotification).toHaveBeenCalledWith(
        '#general',
        'Test message',
        expect.objectContaining({
          type: 'message',
          channelId: 'channel-789',
        })
      );
    });
  });

  describe('friend request notifications', () => {
    it('should show friend request notifications', async () => {
      const pipeline = notificationPipeline as any;
      pipeline.isAppActive = false;

      const request: FriendRequest = {
        id: 'req-123',
        user: {
          id: 'user-456',
          username: 'newfriendy',
          avatar: 'https://example.com/avatar.jpg',
        },
        timestamp: Date.now(),
      };

      await pipeline.processFriendRequest(request);

      expect(mockNotificationService.scheduleLocalNotification).toHaveBeenCalledWith(
        'Friend Request',
        'newfriendy sent you a friend request',
        expect.objectContaining({
          type: 'friend_request',
          userId: 'user-456',
        })
      );
    });

    it('should not show friend request notifications when disabled', async () => {
      mockNotificationService.getNotificationSettings.mockResolvedValue({
        ...mockNotificationSettings,
        friendRequests: false,
      });

      const pipeline = notificationPipeline as any;
      pipeline.isAppActive = false;

      const request: FriendRequest = {
        id: 'req-123',
        user: { id: 'user-456', username: 'newfriendy' },
        timestamp: Date.now(),
      };

      await pipeline.processFriendRequest(request);

      expect(mockNotificationService.scheduleLocalNotification).not.toHaveBeenCalled();
    });
  });

  describe('voice call notifications', () => {
    it('should show voice call notifications', async () => {
      const pipeline = notificationPipeline as any;

      const call: VoiceCallNotification = {
        id: 'call-123',
        channel: {
          id: 'voice-channel-456',
          name: 'General Voice',
          serverId: 'server-789',
        },
        caller: {
          id: 'caller-101',
          username: 'caller',
          avatar: 'https://example.com/caller.jpg',
        },
        type: 'voice',
        timestamp: Date.now(),
      };

      await pipeline.processVoiceCall(call);

      expect(mockNotificationService.scheduleLocalNotification).toHaveBeenCalledWith(
        'Voice Call',
        'caller is calling',
        expect.objectContaining({
          type: 'call',
          channelId: 'voice-channel-456',
          userId: 'caller-101',
        })
      );
    });

    it('should show video call notifications with correct title', async () => {
      const pipeline = notificationPipeline as any;

      const call: VoiceCallNotification = {
        id: 'call-123',
        channel: { id: 'voice-channel-456', name: 'General Voice' },
        caller: { id: 'caller-101', username: 'caller' },
        type: 'video',
        timestamp: Date.now(),
      };

      await pipeline.processVoiceCall(call);

      expect(mockNotificationService.scheduleLocalNotification).toHaveBeenCalledWith(
        'Video Call',
        'caller is calling',
        expect.anything()
      );
    });
  });

  describe('badge count management', () => {
    it('should increment badge count when showing notifications', async () => {
      const pipeline = notificationPipeline as any;
      pipeline.isAppActive = false;
      pipeline.badgeCount = 3;

      const message: IncomingMessage = {
        id: 'msg-123',
        content: 'Test',
        author: { id: 'user-456', username: 'testuser' },
        channel: { id: 'channel-789', name: 'general', type: 'text' },
        timestamp: Date.now(),
        type: 'message',
      };

      await pipeline.processMessage(message);

      expect(mockNotificationService.setBadgeCount).toHaveBeenCalledWith(4);
    });
  });

  describe('WebSocket integration', () => {
    it('should register WebSocket listeners during setup', () => {
      const pipeline = notificationPipeline as any;
      pipeline.setupWebSocketListeners();

      // Should register listeners for different message types
      expect(mockWebSocket.subscribe).toHaveBeenCalledWith(
        expect.stringContaining('message'),
        expect.any(Function)
      );
      expect(mockWebSocket.subscribe).toHaveBeenCalledWith(
        expect.stringContaining('dm'),
        expect.any(Function)
      );
      expect(mockWebSocket.subscribe).toHaveBeenCalledWith(
        expect.stringContaining('friend'),
        expect.any(Function)
      );
    });

    it('should unsubscribe from WebSocket listeners on shutdown', () => {
      const unsubscribeMock = jest.fn();
      mockWebSocket.subscribe.mockReturnValue(unsubscribeMock);

      const pipeline = notificationPipeline as any;
      pipeline.setupWebSocketListeners();

      // Simulate having some subscriptions
      pipeline.unsubscribeHandlers = [unsubscribeMock, unsubscribeMock];

      pipeline.shutdown();

      expect(unsubscribeMock).toHaveBeenCalledTimes(2);
    });
  });
});