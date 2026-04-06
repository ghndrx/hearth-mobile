/**
 * Tests for Notification Batching Service (PN-004)
 */

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: {
    MAX: 'max',
    HIGH: 'high',
    DEFAULT: 'default',
    LOW: 'low',
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: '17.0',
  },
}));

jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-nanoid-id'),
}));

// Import after mocking
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('Notification Batching Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
  });

  afterEach(async () => {
    // Clean up pending notifications between tests
    const { clearPendingNotifications } = await import(
      '../../lib/services/notificationBatching'
    );
    await clearPendingNotifications();
  });

  describe('Configuration Management', () => {
    it('should return default batching config when none stored', async () => {
      const { getBatchingConfig } = await import(
        '../../lib/services/notificationBatching'
      );

      const config = await getBatchingConfig();

      expect(config.enabled).toBe(true);
      expect(config.batchWindowMs).toBe(5000);
      expect(config.maxGroupSize).toBe(10);
      expect(config.groupingStrategy).toBe('conversation');
      expect(config.showGroupSummary).toBe(true);
    });

    it('should merge stored config with defaults', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({ enabled: false, batchWindowMs: 10000 })
      );

      const { getBatchingConfig } = await import(
        '../../lib/services/notificationBatching'
      );

      const config = await getBatchingConfig();

      expect(config.enabled).toBe(false);
      expect(config.batchWindowMs).toBe(10000);
      expect(config.maxGroupSize).toBe(10); // default
    });

    it('should save batching config', async () => {
      const { saveBatchingConfig } = await import(
        '../../lib/services/notificationBatching'
      );

      await saveBatchingConfig({ batchWindowMs: 10000 });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@hearth/notification_batching_config',
        expect.any(String)
      );
    });
  });

  describe('Grouping Settings', () => {
    it('should return default grouping settings when none stored', async () => {
      const { getGroupingSettings } = await import(
        '../../lib/services/notificationBatching'
      );

      const settings = await getGroupingSettings();

      expect(settings.bySender).toBe(true);
      expect(settings.byConversation).toBe(true);
      expect(settings.byChannel).toBe(true);
      expect(settings.timeWindowSeconds).toBe(5);
    });

    it('should save grouping settings', async () => {
      const { saveGroupingSettings } = await import(
        '../../lib/services/notificationBatching'
      );

      await saveGroupingSettings({ bySender: false, timeWindowSeconds: 10 });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@hearth/notification_grouping_settings',
        expect.any(String)
      );
    });
  });

  describe('Notification Queuing', () => {
    it('should return null when batching is disabled', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({ enabled: false })
      );

      const { queueNotification } = await import(
        '../../lib/services/notificationBatching'
      );

      const result = await queueNotification({
        type: 'message',
        title: 'Test',
        body: 'Test body',
        data: { channelId: '123' },
        channelId: '123',
        senderId: 'user-1',
        senderName: 'John',
      });

      expect(result).toBeNull();
    });

    it('should queue notification for batching when enabled', async () => {
      const { queueNotification, getPendingGroupCount } = await import(
        '../../lib/services/notificationBatching'
      );

      // Queue first notification
      await queueNotification({
        type: 'message',
        title: 'Chat with John',
        body: 'Hey, how are you?',
        data: { channelId: 'channel-1' },
        channelId: 'channel-1',
        senderId: 'user-1',
        senderName: 'John',
      });

      // Should have 1 pending group
      expect(getPendingGroupCount()).toBe(1);
    });

    it('should batch notifications from same conversation', async () => {
      const { queueNotification, getPendingNotificationCount, flushAllGroups } =
        await import('../../lib/services/notificationBatching');

      // Queue multiple notifications from same sender
      await queueNotification({
        type: 'message',
        title: 'Chat with John',
        body: 'Message 1',
        data: { channelId: 'channel-1' },
        channelId: 'channel-1',
        senderId: 'user-1',
        senderName: 'John',
      });

      await queueNotification({
        type: 'message',
        title: 'Chat with John',
        body: 'Message 2',
        data: { channelId: 'channel-1' },
        channelId: 'channel-1',
        senderId: 'user-1',
        senderName: 'John',
      });

      expect(getPendingNotificationCount()).toBe(2);

      // Flush all groups
      await flushAllGroups();
    });

    it('should create separate groups for different senders', async () => {
      const { queueNotification, getPendingGroupCount, flushAllGroups } =
        await import('../../lib/services/notificationBatching');

      // Queue notifications from different senders
      await queueNotification({
        type: 'message',
        title: 'Chat with John',
        body: 'Message from John',
        data: { channelId: 'channel-1' },
        channelId: 'channel-1',
        senderId: 'user-1',
        senderName: 'John',
      });

      await queueNotification({
        type: 'message',
        title: 'Chat with Jane',
        body: 'Message from Jane',
        data: { channelId: 'channel-1' },
        channelId: 'channel-1',
        senderId: 'user-2',
        senderName: 'Jane',
      });

      // Should have 2 separate groups
      expect(getPendingGroupCount()).toBe(2);

      await flushAllGroups();
    });
  });

  describe('Group Flushing', () => {
    it('should display notification when flushed', async () => {
      jest.useFakeTimers();

      const { queueNotification, flushGroup } = await import(
        '../../lib/services/notificationBatching'
      );

      // Queue a notification
      await queueNotification({
        type: 'message',
        title: 'Test Chat',
        body: 'Test message',
        data: { channelId: 'channel-1' },
        channelId: 'channel-1',
        senderId: 'user-1',
        senderName: 'John',
      });

      // Get the grouping key
      const groupingKey = 'conv:user-1:channel-1';

      // Flush the group
      await flushGroup(groupingKey);

      // Should have scheduled notification
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: expect.objectContaining({
          title: 'Test Chat',
          body: 'Test message',
        }),
        trigger: null,
      });

      jest.useRealTimers();
    });

    it('should flush all pending groups', async () => {
      const { queueNotification, flushAllGroups, getPendingGroupCount } =
        await import('../../lib/services/notificationBatching');

      // Queue some notifications
      await queueNotification({
        type: 'message',
        title: 'Chat with John',
        body: 'Message',
        data: { channelId: 'channel-1' },
        channelId: 'channel-1',
        senderId: 'user-1',
        senderName: 'John',
      });

      expect(getPendingGroupCount()).toBe(1);

      await flushAllGroups();

      expect(getPendingGroupCount()).toBe(0);
    });
  });

  describe('Group Summary Generation', () => {
    it('should generate appropriate summary for single notification', async () => {
      jest.useFakeTimers();

      const { queueNotification, flushAllGroups } = await import(
        '../../lib/services/notificationBatching'
      );

      await queueNotification({
        type: 'message',
        title: 'Chat with John',
        body: 'Hello there!',
        data: { channelId: 'channel-1' },
        channelId: 'channel-1',
        senderId: 'user-1',
        senderName: 'John',
      });

      await flushAllGroups();

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: expect.objectContaining({
          title: 'Chat with John',
          body: 'Hello there!',
        }),
        trigger: null,
      });

      jest.useRealTimers();
    });

    it('should generate grouped summary for multiple notifications', async () => {
      jest.useFakeTimers();

      const { queueNotification, flushAllGroups } = await import(
        '../../lib/services/notificationBatching'
      );

      // Queue two notifications from same sender
      await queueNotification({
        type: 'message',
        title: 'Chat with John',
        body: 'First message',
        data: { channelId: 'channel-1' },
        channelId: 'channel-1',
        senderId: 'user-1',
        senderName: 'John',
      });

      await queueNotification({
        type: 'message',
        title: 'Chat with John',
        body: 'Second message',
        data: { channelId: 'channel-1' },
        channelId: 'channel-1',
        senderId: 'user-1',
        senderName: 'John',
      });

      await flushAllGroups();

      // Should have called scheduleNotificationAsync for the grouped notification
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalled();
    });
  });

  describe('Statistics', () => {
    it('should return correct pending counts', async () => {
      const {
        queueNotification,
        getPendingGroupCount,
        getPendingNotificationCount,
        flushAllGroups,
      } = await import('../../lib/services/notificationBatching');

      expect(getPendingGroupCount()).toBe(0);
      expect(getPendingNotificationCount()).toBe(0);

      // Queue notifications
      await queueNotification({
        type: 'message',
        title: 'Chat with John',
        body: 'Message 1',
        data: { channelId: 'channel-1' },
        channelId: 'channel-1',
        senderId: 'user-1',
        senderName: 'John',
      });

      await queueNotification({
        type: 'message',
        title: 'Chat with Jane',
        body: 'Message 2',
        data: { channelId: 'channel-2' },
        channelId: 'channel-2',
        senderId: 'user-2',
        senderName: 'Jane',
      });

      expect(getPendingGroupCount()).toBe(2);
      expect(getPendingNotificationCount()).toBe(2);

      await flushAllGroups();
    });

    it('should clear pending notifications', async () => {
      const { queueNotification, clearPendingNotifications, getPendingGroupCount } =
        await import('../../lib/services/notificationBatching');

      await queueNotification({
        type: 'message',
        title: 'Chat',
        body: 'Message',
        data: { channelId: 'channel-1' },
        channelId: 'channel-1',
        senderId: 'user-1',
        senderName: 'John',
      });

      expect(getPendingGroupCount()).toBe(1);

      await clearPendingNotifications();

      expect(getPendingGroupCount()).toBe(0);
    });
  });

  describe('Platform Configuration', () => {
    it('should have Android configuration function available', async () => {
      // The function should exist and be callable
      // Platform-specific behavior is tested at integration level
      const { configureAndroidNotificationGrouping } = await import(
        '../../lib/services/notificationBatching'
      );

      expect(typeof configureAndroidNotificationGrouping).toBe('function');
    });
  });
});
