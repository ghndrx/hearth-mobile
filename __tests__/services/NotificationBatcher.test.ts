/**
 * Tests for Notification Batching Service
 *
 * Tests the smart notification batching and grouping functionality
 * for PN-004 implementation.
 */

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Import after mocks
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NotificationBatcher,
  BatchedNotification,
  BatchingSettings,
  DEFAULT_BATCHING_SETTINGS,
  BatchDensity,
} from '../../lib/services/notifications/NotificationBatcher';
import { NotificationPayload } from '../../lib/services/notifications';

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('NotificationBatcher', () => {
  let mockNotificationPayload: NotificationPayload;
  let mockChannelPayload: NotificationPayload;
  let mockDmPayload: NotificationPayload;
  let mockCallPayload: NotificationPayload;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset singleton state by creating fresh instances
    (NotificationBatcher as any).batches = new Map();
    (NotificationBatcher as any).timeouts = new Map();
    (NotificationBatcher as any).settings = DEFAULT_BATCHING_SETTINGS;
    (NotificationBatcher as any).listeners = new Set();
    (NotificationBatcher as any).nextId = 1;

    mockNotificationPayload = {
      type: 'message',
      title: 'Test Message',
      body: 'This is a test message',
      channelId: 'channel-123',
      userId: 'user-456',
      serverId: 'server-789',
    };

    mockChannelPayload = {
      type: 'message',
      title: 'Channel Message',
      body: 'Message in channel',
      channelId: 'channel-123',
      userId: 'user-456',
    };

    mockDmPayload = {
      type: 'dm',
      title: 'Direct Message',
      body: 'DM from friend',
      userId: 'user-789',
    };

    mockCallPayload = {
      type: 'call',
      title: 'Incoming Call',
      body: 'John is calling',
      userId: 'user-456',
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('shouldBatch', () => {
    it('should batch batchable notification types', () => {
      expect(NotificationBatcher.shouldBatch(mockChannelPayload)).toBe(true);
      expect(NotificationBatcher.shouldBatch(mockDmPayload)).toBe(true);
      expect(NotificationBatcher.shouldBatch({
        ...mockNotificationPayload,
        type: 'mention'
      })).toBe(true);
      expect(NotificationBatcher.shouldBatch({
        ...mockNotificationPayload,
        type: 'reply'
      })).toBe(true);
    });

    it('should not batch urgent notification types', () => {
      expect(NotificationBatcher.shouldBatch(mockCallPayload)).toBe(false);
      expect(NotificationBatcher.shouldBatch({
        ...mockNotificationPayload,
        type: 'friend_request'
      })).toBe(false);
    });

    it('should not batch when batching is disabled', async () => {
      await NotificationBatcher.updateSettings({ enabled: false });

      expect(NotificationBatcher.shouldBatch(mockChannelPayload)).toBe(false);
    });
  });

  describe('addNotification', () => {
    it('should create new batch for first notification', async () => {
      const result = await NotificationBatcher.addNotification(mockChannelPayload);

      expect(result).toBe(true);

      const batches = NotificationBatcher.getBatches();
      expect(batches).toHaveLength(1);
      expect(batches[0].groupKey).toBe('channel:channel-123');
      expect(batches[0].count).toBe(1);
      expect(batches[0].notifications).toHaveLength(1);
      expect(batches[0].title).toBe('Channel Message');
    });

    it('should add to existing batch for same group', async () => {
      // Add first notification
      await NotificationBatcher.addNotification(mockChannelPayload);

      // Add second notification to same channel
      const secondPayload = {
        ...mockChannelPayload,
        title: 'Another Message',
        body: 'Another test message',
      };

      await NotificationBatcher.addNotification(secondPayload);

      const batches = NotificationBatcher.getBatches();
      expect(batches).toHaveLength(1);
      expect(batches[0].count).toBe(2);
      expect(batches[0].notifications).toHaveLength(2);
      expect(batches[0].summary).toBe('2 new messages');
      expect(batches[0].body).toBe('Latest: Another test message');
    });

    it('should create separate batches for different groups', async () => {
      await NotificationBatcher.addNotification(mockChannelPayload);
      await NotificationBatcher.addNotification(mockDmPayload);

      const batches = NotificationBatcher.getBatches();
      expect(batches).toHaveLength(2);

      const channelBatch = batches.find(b => b.groupKey === 'channel:channel-123');
      const dmBatch = batches.find(b => b.groupKey === 'user:user-789');

      expect(channelBatch).toBeDefined();
      expect(dmBatch).toBeDefined();
    });

    it('should not batch urgent notifications', async () => {
      const result = await NotificationBatcher.addNotification(mockCallPayload);

      expect(result).toBe(false);

      const batches = NotificationBatcher.getBatches();
      expect(batches).toHaveLength(0);
    });

    it('should limit batch size to maxBatchSize', async () => {
      await NotificationBatcher.updateSettings({ maxBatchSize: 2 });

      // Add 3 notifications to same channel
      await NotificationBatcher.addNotification(mockChannelPayload);
      await NotificationBatcher.addNotification({...mockChannelPayload, body: 'Message 2'});
      await NotificationBatcher.addNotification({...mockChannelPayload, body: 'Message 3'});

      const batches = NotificationBatcher.getBatches();
      expect(batches[0].notifications).toHaveLength(2);
      expect(batches[0].count).toBe(3); // Count includes all, even if notifications array is trimmed
    });
  });

  describe('grouping logic', () => {
    it('should group by channel when enabled', async () => {
      await NotificationBatcher.updateSettings({
        groupByChannel: true,
        groupByUser: false,
        groupByType: false,
      });

      await NotificationBatcher.addNotification(mockChannelPayload);

      const batches = NotificationBatcher.getBatches();
      expect(batches[0].groupKey).toBe('channel:channel-123');
      expect(batches[0].groupType).toBe('channel');
    });

    it('should group by user when channel grouping disabled', async () => {
      await NotificationBatcher.updateSettings({
        groupByChannel: false,
        groupByUser: true,
        groupByType: false,
      });

      await NotificationBatcher.addNotification(mockChannelPayload);

      const batches = NotificationBatcher.getBatches();
      expect(batches[0].groupKey).toBe('user:user-456');
      expect(batches[0].groupType).toBe('user');
    });

    it('should group by type when other grouping disabled', async () => {
      await NotificationBatcher.updateSettings({
        groupByChannel: false,
        groupByUser: false,
        groupByType: true,
      });

      await NotificationBatcher.addNotification(mockChannelPayload);

      const batches = NotificationBatcher.getBatches();
      expect(batches[0].groupKey).toBe('type:message');
      expect(batches[0].groupType).toBe('type');
    });
  });

  describe('summary generation', () => {
    it('should generate correct channel summary', async () => {
      await NotificationBatcher.addNotification(mockChannelPayload);
      await NotificationBatcher.addNotification({...mockChannelPayload, body: 'Second message'});

      const batches = NotificationBatcher.getBatches();
      expect(batches[0].summary).toBe('2 new messages');
    });

    it('should generate correct user summary', async () => {
      await NotificationBatcher.updateSettings({ groupByChannel: false, groupByUser: true });

      await NotificationBatcher.addNotification(mockChannelPayload);
      await NotificationBatcher.addNotification({...mockChannelPayload, body: 'Second message'});

      const batches = NotificationBatcher.getBatches();
      expect(batches[0].summary).toBe('2 messages from user-456');
    });

    it('should generate correct mention summary', async () => {
      const mentionPayload = { ...mockChannelPayload, type: 'mention' as const };
      await NotificationBatcher.updateSettings({ groupByType: true, groupByChannel: false });

      await NotificationBatcher.addNotification(mentionPayload);
      await NotificationBatcher.addNotification({...mentionPayload, body: 'Second mention'});

      const batches = NotificationBatcher.getBatches();
      expect(batches[0].summary).toBe('2 mentions');
    });
  });

  describe('batch delivery', () => {
    it('should deliver batch after timeout', async () => {
      const listener = jest.fn();
      const cleanup = NotificationBatcher.addListener(listener);

      await NotificationBatcher.addNotification(mockChannelPayload);

      // Initially should have batch
      expect(NotificationBatcher.getBatches()).toHaveLength(1);

      // Fast-forward past batch timeout
      jest.advanceTimersByTime(DEFAULT_BATCHING_SETTINGS.batchTimeWindow);

      // Batch should be delivered and removed
      expect(NotificationBatcher.getBatches()).toHaveLength(0);

      cleanup();
    });

    it('should reschedule delivery when new notification added', async () => {
      await NotificationBatcher.addNotification(mockChannelPayload);

      // Fast-forward part way through timeout
      jest.advanceTimersByTime(DEFAULT_BATCHING_SETTINGS.batchTimeWindow / 2);

      // Add another notification (should reschedule)
      await NotificationBatcher.addNotification({...mockChannelPayload, body: 'Second message'});

      // Fast-forward the remaining original time (should not deliver yet)
      jest.advanceTimersByTime(DEFAULT_BATCHING_SETTINGS.batchTimeWindow / 2);
      expect(NotificationBatcher.getBatches()).toHaveLength(1);

      // Fast-forward the full timeout from second notification
      jest.advanceTimersByTime(DEFAULT_BATCHING_SETTINGS.batchTimeWindow);
      expect(NotificationBatcher.getBatches()).toHaveLength(0);
    });
  });

  describe('shouldShowImmediately', () => {
    it('should show urgent notifications immediately', () => {
      expect(NotificationBatcher.shouldShowImmediately(mockCallPayload)).toBe(true);
    });

    it('should show first notification in group immediately', () => {
      expect(NotificationBatcher.shouldShowImmediately(mockChannelPayload)).toBe(true);
    });

    it('should show notifications under auto-collapse threshold immediately', async () => {
      await NotificationBatcher.updateSettings({ autoCollapseThreshold: 3 });

      await NotificationBatcher.addNotification(mockChannelPayload);
      await NotificationBatcher.addNotification({...mockChannelPayload, body: 'Second'});

      // Third notification should still show immediately (count = 2, threshold = 3)
      expect(NotificationBatcher.shouldShowImmediately({
        ...mockChannelPayload,
        body: 'Third'
      })).toBe(true);
    });

    it('should not show notifications above auto-collapse threshold immediately', async () => {
      await NotificationBatcher.updateSettings({ autoCollapseThreshold: 2 });

      await NotificationBatcher.addNotification(mockChannelPayload);
      await NotificationBatcher.addNotification({...mockChannelPayload, body: 'Second'});

      // Third notification should not show immediately (count = 2, threshold = 2)
      expect(NotificationBatcher.shouldShowImmediately({
        ...mockChannelPayload,
        body: 'Third'
      })).toBe(false);
    });
  });

  describe('batch management', () => {
    it('should dismiss specific batch', async () => {
      await NotificationBatcher.addNotification(mockChannelPayload);
      await NotificationBatcher.addNotification(mockDmPayload);

      expect(NotificationBatcher.getBatches()).toHaveLength(2);

      NotificationBatcher.dismissBatch('channel:channel-123');

      const batches = NotificationBatcher.getBatches();
      expect(batches).toHaveLength(1);
      expect(batches[0].groupKey).toBe('user:user-789');
    });

    it('should dismiss all batches', async () => {
      await NotificationBatcher.addNotification(mockChannelPayload);
      await NotificationBatcher.addNotification(mockDmPayload);

      expect(NotificationBatcher.getBatches()).toHaveLength(2);

      NotificationBatcher.dismissAll();

      expect(NotificationBatcher.getBatches()).toHaveLength(0);
    });

    it('should get specific batch', async () => {
      await NotificationBatcher.addNotification(mockChannelPayload);

      const batch = NotificationBatcher.getBatch('channel:channel-123');
      expect(batch).toBeDefined();
      expect(batch?.groupKey).toBe('channel:channel-123');

      const nonExistentBatch = NotificationBatcher.getBatch('nonexistent');
      expect(nonExistentBatch).toBeUndefined();
    });
  });

  describe('density settings', () => {
    it('should set density to "all"', async () => {
      await NotificationBatcher.setDensity('all');

      const settings = await NotificationBatcher.getSettings();
      expect(settings.enabled).toBe(true);
      expect(settings.autoCollapseThreshold).toBe(1);
      expect(NotificationBatcher.getDensity()).toBe('all');
    });

    it('should set density to "summary"', async () => {
      await NotificationBatcher.setDensity('summary');

      const settings = await NotificationBatcher.getSettings();
      expect(settings.enabled).toBe(true);
      expect(settings.autoCollapseThreshold).toBe(3);
      expect(NotificationBatcher.getDensity()).toBe('summary');
    });

    it('should set density to "off"', async () => {
      await NotificationBatcher.setDensity('off');

      const settings = await NotificationBatcher.getSettings();
      expect(settings.enabled).toBe(false);
      expect(NotificationBatcher.getDensity()).toBe('off');
    });
  });

  describe('settings persistence', () => {
    it('should load settings from storage', async () => {
      const storedSettings = {
        enabled: false,
        maxBatchSize: 10,
        batchTimeWindow: 60000,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedSettings));

      // Trigger settings load by creating new instance
      await (NotificationBatcher as any).loadSettings();

      const settings = await NotificationBatcher.getSettings();
      expect(settings.enabled).toBe(false);
      expect(settings.maxBatchSize).toBe(10);
      expect(settings.batchTimeWindow).toBe(60000);
    });

    it('should save settings to storage', async () => {
      const updates = { maxBatchSize: 8 };

      await NotificationBatcher.updateSettings(updates);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@hearth/batching_settings',
        expect.stringContaining('"maxBatchSize":8')
      );
    });
  });

  describe('listener management', () => {
    it('should notify listeners of batch updates', async () => {
      const listener = jest.fn();
      const cleanup = NotificationBatcher.addListener(listener);

      await NotificationBatcher.addNotification(mockChannelPayload);

      expect(listener).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({
          groupKey: 'channel:channel-123',
          count: 1,
        }),
      ]));

      cleanup();
    });

    it('should handle listener errors gracefully', async () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = jest.fn();

      const cleanup1 = NotificationBatcher.addListener(errorListener);
      const cleanup2 = NotificationBatcher.addListener(goodListener);

      // Should not throw despite error in first listener
      await NotificationBatcher.addNotification(mockChannelPayload);

      expect(goodListener).toHaveBeenCalled();

      cleanup1();
      cleanup2();
    });

    it('should remove listener correctly', async () => {
      const listener = jest.fn();
      const cleanup = NotificationBatcher.addListener(listener);

      cleanup();

      await NotificationBatcher.addNotification(mockChannelPayload);

      expect(listener).not.toHaveBeenCalled();
    });
  });
});