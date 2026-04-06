/**
 * Tests for NotificationBatcher
 *
 * Tests the smart notification batching and grouping logic for PN-004.
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

import { NotificationBatcher, type BatchedNotification, type BatchingSettings } from '../../src/services/notifications/NotificationBatcher';
import { type NotificationPayload } from '../../lib/services/notifications';

// Access the class directly to create fresh instances for testing
function createBatcher(): NotificationBatcher {
  // Use Object.create to bypass the singleton for isolated tests
  const instance = Object.create(NotificationBatcher.prototype);
  // Manually initialize internal state
  (instance as any).batches = new Map();
  (instance as any).settings = {
    enabled: true,
    maxBatchSize: 5,
    batchTimeWindow: 30000,
    groupByChannel: true,
    groupByUser: true,
    groupByType: false,
    autoCollapseThreshold: 3,
  };
  (instance as any).timeouts = new Map();
  (instance as any).listeners = new Set();
  return instance;
}

function makeNotification(overrides: Partial<NotificationPayload> = {}): NotificationPayload {
  return {
    type: 'message',
    title: 'Test User',
    body: 'Hello world',
    channelId: 'channel-1',
    serverId: 'server-1',
    userId: 'user-1',
    ...overrides,
  };
}

describe('NotificationBatcher', () => {
  let batcher: NotificationBatcher;

  beforeEach(() => {
    jest.useFakeTimers();
    batcher = createBatcher();
  });

  afterEach(() => {
    batcher.dismissAllBatches();
    jest.useRealTimers();
  });

  describe('singleton', () => {
    it('should return the same instance', () => {
      const instance1 = NotificationBatcher.getInstance();
      const instance2 = NotificationBatcher.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('addNotification', () => {
    it('should create a new batch for the first notification', async () => {
      const notification = makeNotification();
      const result = await batcher.addNotification(notification);

      expect(result).not.toBeNull();
      expect(result!.count).toBe(1);
      expect(result!.notifications).toHaveLength(1);
      expect(result!.notifications[0]).toEqual(notification);
    });

    it('should group notifications with the same channel and user', async () => {
      const notif1 = makeNotification({ body: 'Message 1' });
      const notif2 = makeNotification({ body: 'Message 2' });

      await batcher.addNotification(notif1);
      await batcher.addNotification(notif2);

      const batches = batcher.getBatches();
      // Both share channelId and userId so they group together
      expect(batches.length).toBe(1);
      expect(batches[0].count).toBe(2);
    });

    it('should create separate batches for different channels', async () => {
      const notif1 = makeNotification({ channelId: 'channel-1' });
      const notif2 = makeNotification({ channelId: 'channel-2' });

      await batcher.addNotification(notif1);
      await batcher.addNotification(notif2);

      const batches = batcher.getBatches();
      expect(batches.length).toBe(2);
    });

    it('should return batch immediately on first notification', async () => {
      const result = await batcher.addNotification(makeNotification());
      // count === 1 triggers immediate display
      expect(result).not.toBeNull();
    });

    it('should return null for intermediate notifications before threshold', async () => {
      await batcher.addNotification(makeNotification({ body: 'msg 1' }));
      const result = await batcher.addNotification(makeNotification({ body: 'msg 2' }));
      // count is 2, below autoCollapseThreshold of 3
      expect(result).toBeNull();
    });

    it('should return batch when reaching autoCollapseThreshold', async () => {
      await batcher.addNotification(makeNotification({ body: 'msg 1' }));
      await batcher.addNotification(makeNotification({ body: 'msg 2' }));
      const result = await batcher.addNotification(makeNotification({ body: 'msg 3' }));
      // count is 3, equals autoCollapseThreshold
      expect(result).not.toBeNull();
      expect(result!.count).toBe(3);
    });

    it('should trim notifications beyond maxBatchSize', async () => {
      for (let i = 0; i < 7; i++) {
        await batcher.addNotification(makeNotification({ body: `msg ${i}` }));
      }

      const batches = batcher.getBatches();
      // Only keeps the last maxBatchSize (5) notifications in the array
      expect(batches[0].notifications).toHaveLength(5);
      // Oldest notifications are trimmed, most recent are kept
      expect(batches[0].notifications[0].body).toBe('msg 2');
      expect(batches[0].notifications[4].body).toBe('msg 6');
    });

    it('should return null when batching is disabled', async () => {
      await batcher.updateSettings({ enabled: false });
      const result = await batcher.addNotification(makeNotification());
      expect(result).toBeNull();
      expect(batcher.getBatches()).toHaveLength(0);
    });
  });

  describe('grouping logic', () => {
    it('should group by channel when groupByChannel is enabled', async () => {
      await batcher.updateSettings({ groupByChannel: true, groupByUser: false });

      await batcher.addNotification(makeNotification({ channelId: 'ch-1', userId: 'u-1' }));
      await batcher.addNotification(makeNotification({ channelId: 'ch-1', userId: 'u-2' }));

      const batches = batcher.getBatches();
      expect(batches).toHaveLength(1);
      expect(batches[0].groupType).toBe('channel');
    });

    it('should group by user when groupByUser is enabled and groupByChannel is disabled', async () => {
      await batcher.updateSettings({ groupByChannel: false, groupByUser: true });

      await batcher.addNotification(makeNotification({ channelId: 'ch-1', userId: 'u-1' }));
      await batcher.addNotification(makeNotification({ channelId: 'ch-2', userId: 'u-1' }));

      const batches = batcher.getBatches();
      expect(batches).toHaveLength(1);
      expect(batches[0].groupType).toBe('user');
    });

    it('should group by type when groupByType is enabled', async () => {
      await batcher.updateSettings({ groupByChannel: false, groupByUser: false, groupByType: true });

      await batcher.addNotification(makeNotification({ type: 'mention', channelId: 'ch-1' }));
      await batcher.addNotification(makeNotification({ type: 'mention', channelId: 'ch-2' }));

      const batches = batcher.getBatches();
      expect(batches).toHaveLength(1);
      expect(batches[0].groupType).toBe('type');
    });

    it('should fall back to server grouping when no grouping options match', async () => {
      await batcher.updateSettings({ groupByChannel: false, groupByUser: false, groupByType: false });

      const notif = makeNotification({ channelId: undefined, userId: undefined });
      await batcher.addNotification(notif);

      const batches = batcher.getBatches();
      expect(batches).toHaveLength(1);
      expect(batches[0].groupType).toBe('server');
    });

    it('should fall back to type grouping when no other keys available', async () => {
      await batcher.updateSettings({ groupByChannel: false, groupByUser: false, groupByType: false });

      const notif = makeNotification({ channelId: undefined, userId: undefined, serverId: undefined });
      await batcher.addNotification(notif);

      const batches = batcher.getBatches();
      expect(batches).toHaveLength(1);
      expect(batches[0].groupType).toBe('type');
    });
  });

  describe('batch summaries', () => {
    it('should show original title/body for single notification in channel group', async () => {
      const notif = makeNotification({ title: 'Alice', body: 'Hey there!' });
      const result = await batcher.addNotification(notif);

      expect(result!.title).toBe('Alice');
      expect(result!.body).toBe('Hey there!');
    });

    it('should show count and latest for multiple channel notifications', async () => {
      await batcher.addNotification(makeNotification({ body: 'First message' }));
      await batcher.addNotification(makeNotification({ body: 'Second message' }));
      await batcher.addNotification(makeNotification({ body: 'Third message' }));

      const batches = batcher.getBatches();
      expect(batches[0].title).toBe('3 new messages');
      expect(batches[0].body).toBe('Latest: Third message');
      expect(batches[0].summary).toBe('3 messages in channel');
    });

    it('should show user-specific summary for user groups', async () => {
      await batcher.updateSettings({ groupByChannel: false, groupByUser: true });

      await batcher.addNotification(makeNotification({ title: 'Bob: hello', channelId: 'ch-1' }));
      await batcher.addNotification(makeNotification({ title: 'Bob: world', channelId: 'ch-2' }));
      await batcher.addNotification(makeNotification({ title: 'Bob: test', channelId: 'ch-3' }));

      const batches = batcher.getBatches();
      expect(batches[0].title).toBe('3 messages from Bob');
      expect(batches[0].summary).toBe('3 messages from user');
    });
  });

  describe('shouldBatchNotification', () => {
    it('should batch message types', () => {
      expect(batcher.shouldBatchNotification(makeNotification({ type: 'message' }))).toBe(true);
      expect(batcher.shouldBatchNotification(makeNotification({ type: 'dm' }))).toBe(true);
      expect(batcher.shouldBatchNotification(makeNotification({ type: 'mention' }))).toBe(true);
      expect(batcher.shouldBatchNotification(makeNotification({ type: 'reply' }))).toBe(true);
    });

    it('should not batch urgent notifications (calls, friend requests)', () => {
      expect(batcher.shouldBatchNotification(makeNotification({ type: 'call' }))).toBe(false);
      expect(batcher.shouldBatchNotification(makeNotification({ type: 'friend_request' }))).toBe(false);
    });

    it('should batch other notification types (server_invite, system)', () => {
      expect(batcher.shouldBatchNotification(makeNotification({ type: 'server_invite' }))).toBe(true);
      expect(batcher.shouldBatchNotification(makeNotification({ type: 'system' }))).toBe(true);
    });

    it('should return false when batching is disabled', async () => {
      await batcher.updateSettings({ enabled: false });
      expect(batcher.shouldBatchNotification(makeNotification())).toBe(false);
    });
  });

  describe('dismissBatch', () => {
    it('should remove a specific batch', async () => {
      await batcher.addNotification(makeNotification({ channelId: 'ch-1' }));
      await batcher.addNotification(makeNotification({ channelId: 'ch-2' }));

      expect(batcher.getBatches()).toHaveLength(2);

      const groupKey = batcher.getBatches()[0].groupKey;
      batcher.dismissBatch(groupKey);

      expect(batcher.getBatches()).toHaveLength(1);
    });

    it('should clear timeout for dismissed batch', async () => {
      await batcher.addNotification(makeNotification());
      const groupKey = batcher.getBatches()[0].groupKey;

      batcher.dismissBatch(groupKey);

      // Advancing timers should not cause errors
      jest.advanceTimersByTime(60000);
      expect(batcher.getBatches()).toHaveLength(0);
    });
  });

  describe('dismissAllBatches', () => {
    it('should clear all batches', async () => {
      await batcher.addNotification(makeNotification({ channelId: 'ch-1' }));
      await batcher.addNotification(makeNotification({ channelId: 'ch-2' }));
      await batcher.addNotification(makeNotification({ channelId: 'ch-3' }));

      expect(batcher.getBatches()).toHaveLength(3);

      batcher.dismissAllBatches();

      expect(batcher.getBatches()).toHaveLength(0);
    });
  });

  describe('getNotificationCount', () => {
    it('should return total count across all batches', async () => {
      await batcher.addNotification(makeNotification({ channelId: 'ch-1', body: 'a' }));
      await batcher.addNotification(makeNotification({ channelId: 'ch-1', body: 'b' }));
      await batcher.addNotification(makeNotification({ channelId: 'ch-2', body: 'c' }));

      expect(batcher.getNotificationCount()).toBe(3);
    });

    it('should return 0 when no batches exist', () => {
      expect(batcher.getNotificationCount()).toBe(0);
    });
  });

  describe('listeners', () => {
    it('should notify listeners when batches change', async () => {
      const listener = jest.fn();
      batcher.addListener(listener);

      await batcher.addNotification(makeNotification());

      expect(listener).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ count: 1 }),
        ])
      );
    });

    it('should support unsubscribing', async () => {
      const listener = jest.fn();
      const unsubscribe = batcher.addListener(listener);

      unsubscribe();
      await batcher.addNotification(makeNotification());

      expect(listener).not.toHaveBeenCalled();
    });

    it('should notify listeners on dismiss', async () => {
      const listener = jest.fn();
      batcher.addListener(listener);

      await batcher.addNotification(makeNotification());
      listener.mockClear();

      batcher.dismissAllBatches();

      expect(listener).toHaveBeenCalledWith([]);
    });
  });

  describe('batch delivery timing', () => {
    it('should deliver batch after time window elapses', async () => {
      const listener = jest.fn();
      batcher.addListener(listener);

      await batcher.addNotification(makeNotification());
      listener.mockClear();

      // Advance past the batch time window (30s default)
      jest.advanceTimersByTime(30000);

      // Listener should be called for the delivery
      expect(listener).toHaveBeenCalled();
    });

    it('should reset timeout when new notification arrives in same group', async () => {
      const listener = jest.fn();
      batcher.addListener(listener);

      await batcher.addNotification(makeNotification({ body: 'msg 1' }));
      listener.mockClear();

      // Advance 20s (not yet at 30s window)
      jest.advanceTimersByTime(20000);

      // Add another notification to same group - should reset timer
      await batcher.addNotification(makeNotification({ body: 'msg 2' }));
      listener.mockClear();

      // Advance another 20s - only 20s since last notification, not 30s
      jest.advanceTimersByTime(20000);
      expect(listener).not.toHaveBeenCalled();

      // Advance remaining 10s to hit the full window
      jest.advanceTimersByTime(10000);
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('settings', () => {
    it('should update settings', async () => {
      await batcher.updateSettings({ maxBatchSize: 10, batchTimeWindow: 60000 });

      const settings = batcher.getSettings();
      expect(settings.maxBatchSize).toBe(10);
      expect(settings.batchTimeWindow).toBe(60000);
    });

    it('should preserve unmodified settings during partial update', async () => {
      const original = batcher.getSettings();
      await batcher.updateSettings({ maxBatchSize: 10 });

      const updated = batcher.getSettings();
      expect(updated.groupByChannel).toBe(original.groupByChannel);
      expect(updated.groupByUser).toBe(original.groupByUser);
    });

    it('should return a copy of settings (not mutable reference)', () => {
      const settings = batcher.getSettings();
      settings.maxBatchSize = 999;

      expect(batcher.getSettings().maxBatchSize).not.toBe(999);
    });
  });

  describe('getBatch', () => {
    it('should return a specific batch by group key', async () => {
      await batcher.addNotification(makeNotification({ channelId: 'ch-1' }));
      await batcher.addNotification(makeNotification({ channelId: 'ch-2' }));

      const batches = batcher.getBatches();
      const key = batches[0].groupKey;
      const batch = batcher.getBatch(key);

      expect(batch).toBeDefined();
      expect(batch!.groupKey).toBe(key);
    });

    it('should return undefined for non-existent group key', () => {
      expect(batcher.getBatch('nonexistent')).toBeUndefined();
    });
  });
});
