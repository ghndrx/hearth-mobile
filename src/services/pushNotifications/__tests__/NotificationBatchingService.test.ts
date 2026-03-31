/**
 * Notification Batching Service Tests
 * Tests for smart notification batching, grouping, and prioritization
 */

import NotificationBatchingService from '../NotificationBatchingService';
import type {
  IncomingNotification,
  NotificationBatch,
} from '../NotificationBatchingService';
import { NotificationType } from '../NotificationBatchingService';

// Mock PushNotificationService
jest.mock('../PushNotificationService', () => ({
  dismissNotification: jest.fn().mockResolvedValue(undefined),
}));

// Mock React Native
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Platform: { OS: 'android', Version: 33 },
  };
});

// Mock expo-notifications (required by PushNotificationService import chain)
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2 },
}));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { eas: { projectId: 'test' } } },
}));

/**
 * Helper to create a test notification
 */
function createNotification(overrides: Partial<IncomingNotification> = {}): IncomingNotification {
  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    channelId: 'channel-1',
    channelName: 'general',
    senderId: 'user-1',
    senderName: 'Alice',
    senderAvatarUrl: 'https://example.com/avatar.png',
    messageId: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    messagePreview: 'Hello world',
    type: NotificationType.MESSAGE,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('NotificationBatchingService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    NotificationBatchingService.cleanup();
    NotificationBatchingService.initialize();
  });

  afterEach(() => {
    NotificationBatchingService.cleanup();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with default configuration', () => {
      const config = NotificationBatchingService.getConfig();
      expect(config.batchWindowMs).toBe(5 * 60 * 1000);
      expect(config.maxBatchSize).toBe(50);
      expect(config.prioritizeMentions).toBe(true);
      expect(config.prioritizeDirectMessages).toBe(true);
    });

    test('should initialize with custom configuration', () => {
      NotificationBatchingService.cleanup();
      NotificationBatchingService.initialize({
        batchWindowMs: 10000,
        maxBatchSize: 10,
      });

      const config = NotificationBatchingService.getConfig();
      expect(config.batchWindowMs).toBe(10000);
      expect(config.maxBatchSize).toBe(10);
      expect(config.prioritizeMentions).toBe(true); // default preserved
    });

    test('should update configuration at runtime', () => {
      NotificationBatchingService.updateConfig({ batchWindowMs: 1000 });
      const config = NotificationBatchingService.getConfig();
      expect(config.batchWindowMs).toBe(1000);
      expect(config.maxBatchSize).toBe(50); // unchanged
    });
  });

  describe('Priority Notifications', () => {
    test('should deliver @mentions immediately', () => {
      const onBatchReady = jest.fn();
      NotificationBatchingService.cleanup();
      NotificationBatchingService.initialize({}, onBatchReady);

      const mention = createNotification({ type: NotificationType.MENTION });
      const result = NotificationBatchingService.processNotification(mention);

      expect(result).toBe(true);
      expect(onBatchReady).toHaveBeenCalledTimes(1);
      expect(onBatchReady.mock.calls[0][0].count).toBe(1);
    });

    test('should deliver direct messages immediately', () => {
      const onBatchReady = jest.fn();
      NotificationBatchingService.cleanup();
      NotificationBatchingService.initialize({}, onBatchReady);

      const dm = createNotification({ type: NotificationType.DIRECT_MESSAGE });
      const result = NotificationBatchingService.processNotification(dm);

      expect(result).toBe(true);
      expect(onBatchReady).toHaveBeenCalledTimes(1);
    });

    test('should batch @mentions when prioritizeMentions is disabled', () => {
      const onBatchReady = jest.fn();
      NotificationBatchingService.cleanup();
      NotificationBatchingService.initialize({ prioritizeMentions: false }, onBatchReady);

      const mention = createNotification({ type: NotificationType.MENTION });
      const result = NotificationBatchingService.processNotification(mention);

      expect(result).toBe(false);
      expect(onBatchReady).not.toHaveBeenCalled();
    });

    test('should batch DMs when prioritizeDirectMessages is disabled', () => {
      const onBatchReady = jest.fn();
      NotificationBatchingService.cleanup();
      NotificationBatchingService.initialize({ prioritizeDirectMessages: false }, onBatchReady);

      const dm = createNotification({ type: NotificationType.DIRECT_MESSAGE });
      const result = NotificationBatchingService.processNotification(dm);

      expect(result).toBe(false);
      expect(onBatchReady).not.toHaveBeenCalled();
    });

    test('should not immediately deliver regular messages', () => {
      const onBatchReady = jest.fn();
      NotificationBatchingService.cleanup();
      NotificationBatchingService.initialize({}, onBatchReady);

      const msg = createNotification({ type: NotificationType.MESSAGE });
      const result = NotificationBatchingService.processNotification(msg);

      expect(result).toBe(false);
      expect(onBatchReady).not.toHaveBeenCalled();
    });
  });

  describe('Batching by Sender and Channel', () => {
    test('should group notifications from the same sender in the same channel', () => {
      const onBatchReady = jest.fn();
      NotificationBatchingService.cleanup();
      NotificationBatchingService.initialize({ batchWindowMs: 5000 }, onBatchReady);

      NotificationBatchingService.processNotification(
        createNotification({ senderId: 'user-1', channelId: 'ch-1', timestamp: 1000 }),
      );
      NotificationBatchingService.processNotification(
        createNotification({ senderId: 'user-1', channelId: 'ch-1', timestamp: 2000 }),
      );
      NotificationBatchingService.processNotification(
        createNotification({ senderId: 'user-1', channelId: 'ch-1', timestamp: 3000 }),
      );

      expect(NotificationBatchingService.getActiveBatches()).toHaveLength(1);
      expect(NotificationBatchingService.getActiveBatches()[0].count).toBe(3);
    });

    test('should create separate batches for different senders', () => {
      NotificationBatchingService.processNotification(
        createNotification({ senderId: 'user-1', channelId: 'ch-1' }),
      );
      NotificationBatchingService.processNotification(
        createNotification({ senderId: 'user-2', channelId: 'ch-1' }),
      );

      expect(NotificationBatchingService.getActiveBatches()).toHaveLength(2);
    });

    test('should create separate batches for different channels', () => {
      NotificationBatchingService.processNotification(
        createNotification({ senderId: 'user-1', channelId: 'ch-1' }),
      );
      NotificationBatchingService.processNotification(
        createNotification({ senderId: 'user-1', channelId: 'ch-2' }),
      );

      expect(NotificationBatchingService.getActiveBatches()).toHaveLength(2);
    });
  });

  describe('Batch Window Timer', () => {
    test('should deliver batch when timer expires', () => {
      const onBatchReady = jest.fn();
      NotificationBatchingService.cleanup();
      NotificationBatchingService.initialize({ batchWindowMs: 5000 }, onBatchReady);

      NotificationBatchingService.processNotification(
        createNotification({ senderId: 'user-1', channelId: 'ch-1' }),
      );
      NotificationBatchingService.processNotification(
        createNotification({ senderId: 'user-1', channelId: 'ch-1' }),
      );

      expect(onBatchReady).not.toHaveBeenCalled();

      jest.advanceTimersByTime(5000);

      expect(onBatchReady).toHaveBeenCalledTimes(1);
      expect(onBatchReady.mock.calls[0][0].count).toBe(2);
      expect(NotificationBatchingService.getActiveBatches()).toHaveLength(0);
    });

    test('should not re-deliver after timer if batch was already flushed', () => {
      const onBatchReady = jest.fn();
      NotificationBatchingService.cleanup();
      NotificationBatchingService.initialize({ batchWindowMs: 5000 }, onBatchReady);

      NotificationBatchingService.processNotification(
        createNotification({ senderId: 'user-1', channelId: 'ch-1' }),
      );

      NotificationBatchingService.flushAll();
      expect(onBatchReady).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(5000);
      // Should not deliver again
      expect(onBatchReady).toHaveBeenCalledTimes(1);
    });
  });

  describe('Max Batch Size', () => {
    test('should force delivery when batch reaches maxBatchSize', () => {
      const onBatchReady = jest.fn();
      NotificationBatchingService.cleanup();
      NotificationBatchingService.initialize({ maxBatchSize: 3 }, onBatchReady);

      NotificationBatchingService.processNotification(
        createNotification({ senderId: 'user-1', channelId: 'ch-1' }),
      );
      NotificationBatchingService.processNotification(
        createNotification({ senderId: 'user-1', channelId: 'ch-1' }),
      );
      expect(onBatchReady).not.toHaveBeenCalled();

      NotificationBatchingService.processNotification(
        createNotification({ senderId: 'user-1', channelId: 'ch-1' }),
      );
      expect(onBatchReady).toHaveBeenCalledTimes(1);
      expect(onBatchReady.mock.calls[0][0].count).toBe(3);
    });
  });

  describe('Flush All', () => {
    test('should deliver all active batches immediately', () => {
      const onBatchReady = jest.fn();
      NotificationBatchingService.cleanup();
      NotificationBatchingService.initialize({}, onBatchReady);

      NotificationBatchingService.processNotification(
        createNotification({ senderId: 'user-1', channelId: 'ch-1' }),
      );
      NotificationBatchingService.processNotification(
        createNotification({ senderId: 'user-2', channelId: 'ch-2' }),
      );

      NotificationBatchingService.flushAll();

      expect(onBatchReady).toHaveBeenCalledTimes(2);
      expect(NotificationBatchingService.getActiveBatches()).toHaveLength(0);
    });

    test('should handle flushAll with no active batches', () => {
      const onBatchReady = jest.fn();
      NotificationBatchingService.cleanup();
      NotificationBatchingService.initialize({}, onBatchReady);

      NotificationBatchingService.flushAll();
      expect(onBatchReady).not.toHaveBeenCalled();
    });
  });

  describe('Batch Formatting', () => {
    test('should format single-message batch with sender name', () => {
      const batch: NotificationBatch = {
        batchId: 'batch-1',
        channelId: 'ch-1',
        channelName: 'general',
        senderId: 'user-1',
        senderName: 'Alice',
        notifications: [createNotification()],
        firstMessagePreview: 'Hello world',
        count: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(NotificationBatchingService.formatBatchTitle(batch)).toBe('Alice');
      expect(NotificationBatchingService.formatBatchBody(batch)).toBe('Hello world');
    });

    test('should format multi-message batch with count', () => {
      const notifications = [
        createNotification({ messagePreview: 'First message' }),
        createNotification({ messagePreview: 'Second message' }),
        createNotification({ messagePreview: 'Third message' }),
      ];
      const batch: NotificationBatch = {
        batchId: 'batch-1',
        channelId: 'ch-1',
        channelName: 'general',
        senderId: 'user-1',
        senderName: 'Alice',
        notifications,
        firstMessagePreview: 'First message',
        count: 3,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(NotificationBatchingService.formatBatchTitle(batch)).toBe(
        '3 messages from Alice',
      );
      expect(NotificationBatchingService.formatBatchBody(batch)).toBe(
        'First message\n…and 2 more in #general',
      );
    });
  });

  describe('Deep Linking', () => {
    test('should return deep link to specific message in a batch', () => {
      const onBatchReady = jest.fn();
      NotificationBatchingService.cleanup();
      NotificationBatchingService.initialize({ batchWindowMs: 5000 }, onBatchReady);

      const n1 = createNotification({ messageId: 'msg-1', channelId: 'ch-1', senderId: 'user-1' });
      const n2 = createNotification({ messageId: 'msg-2', channelId: 'ch-1', senderId: 'user-1' });

      NotificationBatchingService.processNotification(n1);
      NotificationBatchingService.processNotification(n2);

      jest.advanceTimersByTime(5000);

      const batchId = onBatchReady.mock.calls[0][0].batchId;
      const deepLink = NotificationBatchingService.getDeepLink(batchId, 'msg-1');

      expect(deepLink).toEqual({ channelId: 'ch-1', messageId: 'msg-1' });
    });

    test('should default to most recent message when no messageId given', () => {
      const onBatchReady = jest.fn();
      NotificationBatchingService.cleanup();
      NotificationBatchingService.initialize({ batchWindowMs: 5000 }, onBatchReady);

      const n1 = createNotification({ messageId: 'msg-1', channelId: 'ch-1', senderId: 'user-1' });
      const n2 = createNotification({ messageId: 'msg-2', channelId: 'ch-1', senderId: 'user-1' });

      NotificationBatchingService.processNotification(n1);
      NotificationBatchingService.processNotification(n2);

      jest.advanceTimersByTime(5000);

      const batchId = onBatchReady.mock.calls[0][0].batchId;
      const deepLink = NotificationBatchingService.getDeepLink(batchId);

      expect(deepLink).toEqual({ channelId: 'ch-1', messageId: 'msg-2' });
    });

    test('should return null for unknown batch', () => {
      const deepLink = NotificationBatchingService.getDeepLink('nonexistent');
      expect(deepLink).toBeNull();
    });

    test('should deep link into individually delivered priority notifications', () => {
      const onBatchReady = jest.fn();
      NotificationBatchingService.cleanup();
      NotificationBatchingService.initialize({}, onBatchReady);

      const mention = createNotification({
        id: 'mention-1',
        type: NotificationType.MENTION,
        messageId: 'msg-mention',
        channelId: 'ch-1',
      });
      NotificationBatchingService.processNotification(mention);

      const batchId = onBatchReady.mock.calls[0][0].batchId;
      const deepLink = NotificationBatchingService.getDeepLink(batchId);

      expect(deepLink).toEqual({ channelId: 'ch-1', messageId: 'msg-mention' });
    });
  });

  describe('Batch Dismissal', () => {
    test('should return message IDs when dismissing a batch', async () => {
      const onBatchReady = jest.fn();
      NotificationBatchingService.cleanup();
      NotificationBatchingService.initialize({ batchWindowMs: 5000 }, onBatchReady);

      const n1 = createNotification({ messageId: 'msg-1', senderId: 'user-1', channelId: 'ch-1' });
      const n2 = createNotification({ messageId: 'msg-2', senderId: 'user-1', channelId: 'ch-1' });

      NotificationBatchingService.processNotification(n1);
      NotificationBatchingService.processNotification(n2);
      jest.advanceTimersByTime(5000);

      const batchId = onBatchReady.mock.calls[0][0].batchId;
      const messageIds = await NotificationBatchingService.dismissBatch(batchId);

      expect(messageIds).toEqual(['msg-1', 'msg-2']);
    });

    test('should remove batch from delivered batches after dismissal', async () => {
      const onBatchReady = jest.fn();
      NotificationBatchingService.cleanup();
      NotificationBatchingService.initialize({ batchWindowMs: 5000 }, onBatchReady);

      NotificationBatchingService.processNotification(
        createNotification({ senderId: 'user-1', channelId: 'ch-1' }),
      );
      jest.advanceTimersByTime(5000);

      const batchId = onBatchReady.mock.calls[0][0].batchId;
      await NotificationBatchingService.dismissBatch(batchId);

      expect(NotificationBatchingService.getDeliveredBatches()).toHaveLength(0);
    });

    test('should call PushNotificationService.dismissNotification', async () => {
      const PushNotificationService = require('../PushNotificationService');
      const onBatchReady = jest.fn();
      NotificationBatchingService.cleanup();
      NotificationBatchingService.initialize({ batchWindowMs: 5000 }, onBatchReady);

      NotificationBatchingService.processNotification(
        createNotification({ senderId: 'user-1', channelId: 'ch-1' }),
      );
      jest.advanceTimersByTime(5000);

      const batchId = onBatchReady.mock.calls[0][0].batchId;
      await NotificationBatchingService.dismissBatch(batchId);

      expect(PushNotificationService.dismissNotification).toHaveBeenCalledWith(batchId);
    });

    test('should return empty array for unknown batch', async () => {
      const result = await NotificationBatchingService.dismissBatch('nonexistent');
      expect(result).toEqual([]);
    });
  });

  describe('Batch Content', () => {
    test('should preserve sender avatar URL in batch', () => {
      NotificationBatchingService.processNotification(
        createNotification({
          senderId: 'user-1',
          channelId: 'ch-1',
          senderAvatarUrl: 'https://example.com/alice.png',
        }),
      );

      const batches = NotificationBatchingService.getActiveBatches();
      expect(batches[0].senderAvatarUrl).toBe('https://example.com/alice.png');
    });

    test('should preserve first message preview in batch', () => {
      NotificationBatchingService.processNotification(
        createNotification({
          senderId: 'user-1',
          channelId: 'ch-1',
          messagePreview: 'First message',
        }),
      );
      NotificationBatchingService.processNotification(
        createNotification({
          senderId: 'user-1',
          channelId: 'ch-1',
          messagePreview: 'Second message',
        }),
      );

      const batches = NotificationBatchingService.getActiveBatches();
      expect(batches[0].firstMessagePreview).toBe('First message');
    });

    test('should track group count accurately', () => {
      for (let i = 0; i < 5; i++) {
        NotificationBatchingService.processNotification(
          createNotification({ senderId: 'user-1', channelId: 'ch-1' }),
        );
      }

      const batches = NotificationBatchingService.getActiveBatches();
      expect(batches[0].count).toBe(5);
      expect(batches[0].notifications).toHaveLength(5);
    });
  });

  describe('Cleanup', () => {
    test('should clear all state on cleanup', () => {
      NotificationBatchingService.processNotification(
        createNotification({ senderId: 'user-1', channelId: 'ch-1' }),
      );

      NotificationBatchingService.cleanup();

      expect(NotificationBatchingService.getActiveBatches()).toHaveLength(0);
      expect(NotificationBatchingService.getDeliveredBatches()).toHaveLength(0);
    });

    test('should clear timers on cleanup without delivering', () => {
      const onBatchReady = jest.fn();
      NotificationBatchingService.cleanup();
      NotificationBatchingService.initialize({ batchWindowMs: 5000 }, onBatchReady);

      NotificationBatchingService.processNotification(
        createNotification({ senderId: 'user-1', channelId: 'ch-1' }),
      );

      NotificationBatchingService.cleanup();
      jest.advanceTimersByTime(10000);

      expect(onBatchReady).not.toHaveBeenCalled();
    });
  });

  describe('Notification Types', () => {
    test('should batch regular messages', () => {
      const result = NotificationBatchingService.processNotification(
        createNotification({ type: NotificationType.MESSAGE }),
      );
      expect(result).toBe(false);
    });

    test('should batch reply notifications', () => {
      const result = NotificationBatchingService.processNotification(
        createNotification({ type: NotificationType.REPLY }),
      );
      expect(result).toBe(false);
    });

    test('should batch system notifications', () => {
      const result = NotificationBatchingService.processNotification(
        createNotification({ type: NotificationType.SYSTEM }),
      );
      expect(result).toBe(false);
    });
  });
});
