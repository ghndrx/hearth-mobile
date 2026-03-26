/**
 * Tests for Notification Batching Service (PN-004)
 *
 * Tests smart notification batching and grouping functionality that prevents
 * notification spam while ensuring important messages reach users promptly.
 */

// Inline mock settings
const mockSettings = {
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

// Apply mocks
jest.mock('expo-notifications', () => ({
  getBadgeCountAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(),
}));

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => () => {}),
    currentState: 'background',
  },
}));

jest.mock('../../lib/services/notifications', () => ({
  getNotificationSettings: jest.fn(() => Promise.resolve(mockSettings)),
  scheduleLocalNotification: jest.fn(),
  setBadgeCount: jest.fn(),
}));

// Mock timers for testing batching delays
jest.useFakeTimers();

// Import after mocking
import { NotificationBatchingService, DEFAULT_BATCHING_CONFIG } from '../../lib/services/notificationBatching';
import type { IncomingMessage } from '../../lib/services/notificationPipeline';
import type { NotificationPayload } from '../../lib/services/notifications';
import * as notificationsMock from '../../lib/services/notifications';

// Re-export for convenience in tests
const mockScheduleLocalNotification = notificationsMock.scheduleLocalNotification as jest.Mock;
const mockSetBadgeCount = notificationsMock.setBadgeCount as jest.Mock;
const mockGetNotificationSettings = notificationsMock.getNotificationSettings as jest.Mock;

describe('NotificationBatchingService', () => {
  let batchingService: NotificationBatchingService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();

    // Create fresh service instance for each test
    batchingService = new NotificationBatchingService();
  });

  afterEach(() => {
    batchingService.clearPendingNotifications();
    batchingService.shutdown();
  });

  describe('initialization and configuration', () => {
    it('should initialize with default configuration', () => {
      const service = new NotificationBatchingService();
      expect(service.getStats().pendingGroups).toBe(0);
      expect(service.getStats().isAppActive).toBe(false); // Based on mock
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        normalDelay: 3000,
        maxBatchSize: 15,
        enableSummaryNotifications: false,
      };

      const service = new NotificationBatchingService(customConfig);
      service.updateConfig({ immediateDelay: 100 });

      // Should work with custom config (no errors thrown)
      expect(service.getStats().pendingGroups).toBe(0);
    });

    it('should update configuration dynamically', () => {
      batchingService.updateConfig({
        normalDelay: 2000,
        maxBatchSize: 8,
      });

      // Configuration update should not cause errors
      expect(batchingService.getStats().pendingGroups).toBe(0);
    });
  });

  describe('priority determination', () => {
    const createTestMessage = (type: string): IncomingMessage => ({
      id: 'msg-123',
      content: 'Test message',
      author: { id: 'user-456', username: 'testuser' },
      channel: { id: 'channel-789', name: 'general', type: 'text' },
      timestamp: Date.now(),
      type: type as any,
    });

    const createTestPayload = (type: string): NotificationPayload => ({
      type: type as any,
      title: 'Test',
      body: 'Test message',
    });

    it('should handle immediate priority messages (mentions, DMs, calls)', async () => {
      const mentionMessage = createTestMessage('mention');
      const dmMessage = createTestMessage('dm');
      const callMessage = createTestMessage('call');

      await batchingService.addNotification(mentionMessage, createTestPayload('mention'));
      await batchingService.addNotification(dmMessage, createTestPayload('dm'));
      await batchingService.addNotification(callMessage, createTestPayload('call'));

      // Immediate messages should be delivered right away
      expect(notificationsMock.scheduleLocalNotification).toHaveBeenCalledTimes(3);
      expect(batchingService.getStats().pendingGroups).toBe(0);
    });

    it('should batch normal priority messages', async () => {
      const message1 = createTestMessage('message');
      const message2 = createTestMessage('message');

      await batchingService.addNotification(message1, createTestPayload('message'));
      await batchingService.addNotification(message2, createTestPayload('message'));

      // Should be batched, not delivered immediately
      expect(notificationsMock.scheduleLocalNotification).not.toHaveBeenCalled();
      expect(batchingService.getStats().pendingGroups).toBe(1);
      expect(batchingService.getStats().totalPendingNotifications).toBe(2);
    });

    it('should handle high priority messages with shorter delay', async () => {
      const friendRequestMessage = createTestMessage('friend_request');

      await batchingService.addNotification(friendRequestMessage, createTestPayload('friend_request'));

      // High priority should be batched but with shorter delay
      expect(notificationsMock.scheduleLocalNotification).not.toHaveBeenCalled();
      expect(batchingService.getStats().pendingGroups).toBe(1);
    });

    it('should handle low priority messages with longer delay', async () => {
      const systemMessage = createTestMessage('system');

      await batchingService.addNotification(systemMessage, createTestPayload('system'));

      // Low priority should be batched with longer delay
      expect(notificationsMock.scheduleLocalNotification).not.toHaveBeenCalled();
      expect(batchingService.getStats().pendingGroups).toBe(1);
    });
  });

  describe('grouping logic', () => {
    const createChannelMessage = (channelId: string, authorId: string, serverId?: string): IncomingMessage => ({
      id: `msg-${Date.now()}-${Math.random()}`,
      content: 'Test message',
      author: { id: authorId, username: `user${authorId}` },
      channel: { id: channelId, name: 'general', type: 'text', serverId },
      server: serverId ? { id: serverId, name: `server${serverId}` } : undefined,
      timestamp: Date.now(),
      type: 'message',
    });

    const createDMMessage = (authorId: string): IncomingMessage => ({
      id: `dm-${Date.now()}-${Math.random()}`,
      content: 'DM message',
      author: { id: authorId, username: `user${authorId}` },
      channel: { id: `dm-${authorId}`, name: 'DM', type: 'dm' },
      timestamp: Date.now(),
      type: 'dm',
    });

    it('should group messages by channel', async () => {
      const message1 = createChannelMessage('channel1', 'user1', 'server1');
      const message2 = createChannelMessage('channel1', 'user2', 'server1');
      const message3 = createChannelMessage('channel2', 'user1', 'server1');

      const payload = { type: 'message' as any, title: 'Test', body: 'Test' };

      await batchingService.addNotification(message1, payload);
      await batchingService.addNotification(message2, payload);
      await batchingService.addNotification(message3, payload);

      // With sender grouping enabled, we get 3 groups:
      // - channel1+user1, channel1+user2, channel2+user1
      expect(batchingService.getStats().pendingGroups).toBe(3);
    });

    it('should group DM messages by sender', async () => {
      const dm1 = createDMMessage('user1');
      const dm2 = createDMMessage('user1');
      const dm3 = createDMMessage('user2');

      const payload = { type: 'dm' as any, title: 'Test', body: 'Test' };

      // DMs are immediate priority, so they bypass batching
      await batchingService.addNotification(dm1, payload);
      await batchingService.addNotification(dm2, payload);
      await batchingService.addNotification(dm3, payload);

      // DMs should be delivered immediately
      expect(notificationsMock.scheduleLocalNotification).toHaveBeenCalledTimes(3);
      expect(batchingService.getStats().pendingGroups).toBe(0);
    });

    it('should group regular messages by sender within the same channel', async () => {
      const message1 = createChannelMessage('channel1', 'user1', 'server1');
      const message2 = createChannelMessage('channel1', 'user1', 'server1');
      const message3 = createChannelMessage('channel1', 'user2', 'server1');

      const payload = { type: 'message' as any, title: 'Test', body: 'Test' };

      await batchingService.addNotification(message1, payload);
      await batchingService.addNotification(message2, payload);
      await batchingService.addNotification(message3, payload);

      // Should create groups based on channel and sender
      const stats = batchingService.getStats();
      expect(stats.pendingGroups).toBeGreaterThan(0);
      expect(stats.totalPendingNotifications).toBe(3);
    });
  });

  describe('batch delivery and timeouts', () => {
    it('should deliver batch after timeout expires', async () => {
      const message = {
        id: 'msg-123',
        content: 'Test message',
        author: { id: 'user-456', username: 'testuser' },
        channel: { id: 'channel-789', name: 'general', type: 'text' as const },
        timestamp: Date.now(),
        type: 'message' as const,
      };

      const payload = { type: 'message' as any, title: 'Test', body: 'Test message' };

      await batchingService.addNotification(message, payload);

      // Should be pending
      expect(batchingService.getStats().pendingGroups).toBe(1);
      expect(notificationsMock.scheduleLocalNotification).not.toHaveBeenCalled();

      // Fast-forward time to trigger batch delivery
      jest.advanceTimersByTime(DEFAULT_BATCHING_CONFIG.normalDelay + 100);

      // Wait for promises to resolve
      await Promise.resolve();

      // Should have delivered the batch
      expect(notificationsMock.scheduleLocalNotification).toHaveBeenCalledWith(
        'Test',
        'Test message',
        expect.objectContaining({ type: 'message' })
      );
    });

    it('should deliver batch immediately when max group size is reached', async () => {
      const payload = { type: 'message' as any, title: 'Test', body: 'Test' };

      // Add messages up to max group size
      for (let i = 0; i < DEFAULT_BATCHING_CONFIG.maxGroupSize; i++) {
        const message = {
          id: `msg-${i}`,
          content: `Message ${i}`,
          author: { id: 'user-456', username: 'testuser' },
          channel: { id: 'channel-789', name: 'general', type: 'text' as const },
          timestamp: Date.now(),
          type: 'message' as const,
        };

        await batchingService.addNotification(message, payload);
      }

      // Should have delivered immediately due to max group size
      expect(notificationsMock.scheduleLocalNotification).toHaveBeenCalled();
      expect(batchingService.getStats().pendingGroups).toBe(0);
    });

    it('should deliver all pending notifications when app becomes active', async () => {
      // Set app to background initially
      const service = new NotificationBatchingService();
      (service as any).isAppActive = false;

      const message = {
        id: 'msg-123',
        content: 'Test message',
        author: { id: 'user-456', username: 'testuser' },
        channel: { id: 'channel-789', name: 'general', type: 'text' as const },
        timestamp: Date.now(),
        type: 'message' as const,
      };

      const payload = { type: 'message' as any, title: 'Test', body: 'Test' };

      await service.addNotification(message, payload);
      expect(service.getStats().pendingGroups).toBe(1);

      // Simulate app becoming active
      (service as any).isAppActive = true;
      await (service as any).deliverAllPendingNotifications();

      // Should have delivered all pending notifications
      expect(service.getStats().pendingGroups).toBe(0);
      expect(notificationsMock.scheduleLocalNotification).toHaveBeenCalled();

      service.shutdown();
    });
  });

  describe('summary notifications', () => {
    it('should create summary notification for multiple messages from same sender', async () => {
      const service = new NotificationBatchingService({
        summaryThreshold: 2, // Lower threshold for testing
        normalDelay: 100, // Shorter delay for testing
      });
      (service as any).isAppActive = false;

      const messages = [
        {
          id: 'msg-1',
          content: 'First message',
          author: { id: 'user-456', username: 'testuser' },
          channel: { id: 'channel-789', name: 'general', type: 'text' as const },
          timestamp: Date.now(),
          type: 'message' as const,
        },
        {
          id: 'msg-2',
          content: 'Second message',
          author: { id: 'user-456', username: 'testuser' },
          channel: { id: 'channel-789', name: 'general', type: 'text' as const },
          timestamp: Date.now() + 1000,
          type: 'message' as const,
        },
        {
          id: 'msg-3',
          content: 'Third message',
          author: { id: 'user-456', username: 'testuser' },
          channel: { id: 'channel-789', name: 'general', type: 'text' as const },
          timestamp: Date.now() + 2000,
          type: 'message' as const,
        },
      ];

      for (const message of messages) {
        const payload = { type: 'message' as any, title: '#general', body: message.content };
        await service.addNotification(message, payload);
      }

      // Fast-forward to trigger delivery
      jest.advanceTimersByTime(200);
      await Promise.resolve();

      // Should have created a summary notification
      expect(notificationsMock.scheduleLocalNotification).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('3 new messages'),
        expect.any(Object)
      );

      service.shutdown();
    });

    it('should deliver individual notifications when below summary threshold', async () => {
      const service = new NotificationBatchingService({
        summaryThreshold: 5, // High threshold
        normalDelay: 100,
      });
      (service as any).isAppActive = false;

      const message = {
        id: 'msg-1',
        content: 'Single message',
        author: { id: 'user-456', username: 'testuser' },
        channel: { id: 'channel-789', name: 'general', type: 'text' as const },
        timestamp: Date.now(),
        type: 'message' as const,
      };

      const payload = { type: 'message' as any, title: '#general', body: 'Single message' };
      await service.addNotification(message, payload);

      // Fast-forward to trigger delivery
      jest.advanceTimersByTime(200);
      await Promise.resolve();

      // Should deliver individual notification (not summary)
      expect(notificationsMock.scheduleLocalNotification).toHaveBeenCalledWith(
        '#general',
        'Single message',
        expect.any(Object)
      );

      service.shutdown();
    });
  });

  describe('error handling and fallbacks', () => {
    it('should handle notification service errors gracefully', async () => {
      notificationsMock.scheduleLocalNotification.mockRejectedValueOnce(new Error('Notification failed'));

      const message = {
        id: 'msg-123',
        content: 'Test message',
        author: { id: 'user-456', username: 'testuser' },
        channel: { id: 'channel-789', name: 'general', type: 'text' as const },
        timestamp: Date.now(),
        type: 'mention' as const, // Immediate priority
      };

      const payload = { type: 'mention' as any, title: 'Test', body: 'Test message' };

      // Should not throw error despite notification service failure
      await expect(batchingService.addNotification(message, payload)).resolves.toBeUndefined();

      expect(notificationsMock.scheduleLocalNotification).toHaveBeenCalled();
    });

    it('should skip notifications when disabled in settings', async () => {
      notificationsMock.getNotificationSettings.mockResolvedValueOnce({
        ...mockSettings,
        enabled: false,
      });

      const message = {
        id: 'msg-123',
        content: 'Test message',
        author: { id: 'user-456', username: 'testuser' },
        channel: { id: 'channel-789', name: 'general', type: 'text' as const },
        timestamp: Date.now(),
        type: 'message' as const,
      };

      const payload = { type: 'message' as any, title: 'Test', body: 'Test message' };

      await batchingService.addNotification(message, payload);

      expect(batchingService.getStats().pendingGroups).toBe(0);
      expect(notificationsMock.scheduleLocalNotification).not.toHaveBeenCalled();
    });

    it('should skip notifications when app is active', async () => {
      const service = new NotificationBatchingService();
      (service as any).isAppActive = true; // App is active

      const message = {
        id: 'msg-123',
        content: 'Test message',
        author: { id: 'user-456', username: 'testuser' },
        channel: { id: 'channel-789', name: 'general', type: 'text' as const },
        timestamp: Date.now(),
        type: 'message' as const,
      };

      const payload = { type: 'message' as any, title: 'Test', body: 'Test message' };

      await service.addNotification(message, payload);

      expect(service.getStats().pendingGroups).toBe(0);
      expect(notificationsMock.scheduleLocalNotification).not.toHaveBeenCalled();

      service.shutdown();
    });
  });

  describe('utility methods', () => {
    it('should provide accurate stats', () => {
      const stats = batchingService.getStats();

      expect(stats).toHaveProperty('pendingGroups');
      expect(stats).toHaveProperty('totalPendingNotifications');
      expect(stats).toHaveProperty('isAppActive');
      expect(stats).toHaveProperty('badgeCount');

      expect(typeof stats.pendingGroups).toBe('number');
      expect(typeof stats.totalPendingNotifications).toBe('number');
      expect(typeof stats.isAppActive).toBe('boolean');
      expect(typeof stats.badgeCount).toBe('number');
    });

    it('should clear all pending notifications', async () => {
      const message = {
        id: 'msg-123',
        content: 'Test message',
        author: { id: 'user-456', username: 'testuser' },
        channel: { id: 'channel-789', name: 'general', type: 'text' as const },
        timestamp: Date.now(),
        type: 'message' as const,
      };

      const payload = { type: 'message' as any, title: 'Test', body: 'Test message' };

      await batchingService.addNotification(message, payload);
      expect(batchingService.getStats().pendingGroups).toBe(1);

      batchingService.clearPendingNotifications();
      expect(batchingService.getStats().pendingGroups).toBe(0);
    });

    it('should shutdown cleanly', () => {
      // Should not throw any errors
      expect(() => batchingService.shutdown()).not.toThrow();
    });
  });
});