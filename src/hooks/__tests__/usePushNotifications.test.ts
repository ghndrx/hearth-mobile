/**
 * @jest-environment jsdom
 */

/**
 * usePushNotifications Hook Tests
 * Tests for the smart notification batching React hook
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { usePushNotifications } from '../usePushNotifications';
import NotificationBatchingService, {
  NotificationType,
  type IncomingNotification,
  type NotificationBatch,
} from '../../services/pushNotifications/NotificationBatchingService';

// Mock PushNotificationService (transitive dependency)
jest.mock('../../services/pushNotifications/PushNotificationService', () => ({
  dismissNotification: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return { ...RN, Platform: { OS: 'android', Version: 33 } };
});

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2 },
}));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { eas: { projectId: 'test' } } },
}));

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

describe('usePushNotifications', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    NotificationBatchingService.cleanup();
  });

  afterEach(() => {
    NotificationBatchingService.cleanup();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => usePushNotifications());

      expect(result.current.state.isInitialized).toBe(true);
      expect(result.current.state.deliveredBatches).toEqual([]);
      expect(result.current.state.activeBatchCount).toBe(0);
      expect(result.current.state.error).toBeNull();
    });

    it('should accept custom batching config', () => {
      renderHook(() =>
        usePushNotifications({ config: { batchWindowMs: 1000, maxBatchSize: 5 } }),
      );

      const config = NotificationBatchingService.getConfig();
      expect(config.batchWindowMs).toBe(1000);
      expect(config.maxBatchSize).toBe(5);
    });

    it('should clean up on unmount', () => {
      const { result, unmount } = renderHook(() => usePushNotifications());

      act(() => {
        result.current.actions.processNotification(createNotification());
      });

      expect(result.current.state.activeBatchCount).toBe(1);

      unmount();

      // After unmount, service should be cleaned up
      expect(NotificationBatchingService.getActiveBatches()).toHaveLength(0);
    });
  });

  describe('processNotification', () => {
    it('should return true for priority notifications (mentions)', () => {
      const { result } = renderHook(() => usePushNotifications());

      let immediate: boolean = false;
      act(() => {
        immediate = result.current.actions.processNotification(
          createNotification({ type: NotificationType.MENTION }),
        );
      });

      expect(immediate).toBe(true);
      expect(result.current.state.deliveredBatches).toHaveLength(1);
    });

    it('should return true for priority notifications (DMs)', () => {
      const { result } = renderHook(() => usePushNotifications());

      let immediate: boolean = false;
      act(() => {
        immediate = result.current.actions.processNotification(
          createNotification({ type: NotificationType.DIRECT_MESSAGE }),
        );
      });

      expect(immediate).toBe(true);
      expect(result.current.state.deliveredBatches).toHaveLength(1);
    });

    it('should return false and batch regular messages', () => {
      const { result } = renderHook(() => usePushNotifications());

      let immediate: boolean = true;
      act(() => {
        immediate = result.current.actions.processNotification(
          createNotification({ type: NotificationType.MESSAGE }),
        );
      });

      expect(immediate).toBe(false);
      expect(result.current.state.deliveredBatches).toHaveLength(0);
      expect(result.current.state.activeBatchCount).toBe(1);
    });

    it('should deliver batch when timer expires', () => {
      const { result } = renderHook(() =>
        usePushNotifications({ config: { batchWindowMs: 5000 } }),
      );

      act(() => {
        result.current.actions.processNotification(
          createNotification({ senderId: 'user-1', channelId: 'ch-1' }),
        );
        result.current.actions.processNotification(
          createNotification({ senderId: 'user-1', channelId: 'ch-1' }),
        );
      });

      expect(result.current.state.deliveredBatches).toHaveLength(0);

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(result.current.state.deliveredBatches).toHaveLength(1);
      expect(result.current.state.deliveredBatches[0].count).toBe(2);
      expect(result.current.state.activeBatchCount).toBe(0);
    });
  });

  describe('onBatchReady callback', () => {
    it('should call onBatchReady when a batch is delivered', () => {
      const onBatchReady = jest.fn();
      const { result } = renderHook(() =>
        usePushNotifications({ config: { batchWindowMs: 5000 }, onBatchReady }),
      );

      act(() => {
        result.current.actions.processNotification(
          createNotification({ type: NotificationType.MESSAGE }),
        );
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(onBatchReady).toHaveBeenCalledTimes(1);
      expect(onBatchReady.mock.calls[0][0].count).toBe(1);
    });

    it('should call onBatchReady immediately for priority notifications', () => {
      const onBatchReady = jest.fn();
      const { result } = renderHook(() =>
        usePushNotifications({ onBatchReady }),
      );

      act(() => {
        result.current.actions.processNotification(
          createNotification({ type: NotificationType.MENTION }),
        );
      });

      expect(onBatchReady).toHaveBeenCalledTimes(1);
    });
  });

  describe('flushAll', () => {
    it('should deliver all active batches immediately', () => {
      const { result } = renderHook(() => usePushNotifications());

      act(() => {
        result.current.actions.processNotification(
          createNotification({ senderId: 'user-1', channelId: 'ch-1' }),
        );
        result.current.actions.processNotification(
          createNotification({ senderId: 'user-2', channelId: 'ch-2' }),
        );
      });

      expect(result.current.state.deliveredBatches).toHaveLength(0);

      act(() => {
        result.current.actions.flushAll();
      });

      expect(result.current.state.deliveredBatches).toHaveLength(2);
      expect(result.current.state.activeBatchCount).toBe(0);
    });
  });

  describe('dismissBatch', () => {
    it('should remove batch from deliveredBatches and return message IDs', async () => {
      const { result } = renderHook(() =>
        usePushNotifications({ config: { batchWindowMs: 5000 } }),
      );

      act(() => {
        result.current.actions.processNotification(
          createNotification({ messageId: 'msg-1', senderId: 'user-1', channelId: 'ch-1' }),
        );
        result.current.actions.processNotification(
          createNotification({ messageId: 'msg-2', senderId: 'user-1', channelId: 'ch-1' }),
        );
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(result.current.state.deliveredBatches).toHaveLength(1);
      const batchId = result.current.state.deliveredBatches[0].batchId;

      let messageIds: string[] = [];
      await act(async () => {
        messageIds = await result.current.actions.dismissBatch(batchId);
      });

      expect(messageIds).toEqual(['msg-1', 'msg-2']);
      expect(result.current.state.deliveredBatches).toHaveLength(0);
    });

    it('should return empty array for unknown batch', async () => {
      const { result } = renderHook(() => usePushNotifications());

      let messageIds: string[] = [];
      await act(async () => {
        messageIds = await result.current.actions.dismissBatch('nonexistent');
      });

      expect(messageIds).toEqual([]);
    });
  });

  describe('getDeepLink', () => {
    it('should return deep link for a delivered batch', () => {
      const { result } = renderHook(() => usePushNotifications());

      act(() => {
        result.current.actions.processNotification(
          createNotification({
            type: NotificationType.MENTION,
            messageId: 'msg-1',
            channelId: 'ch-1',
          }),
        );
      });

      const batchId = result.current.state.deliveredBatches[0].batchId;
      const deepLink = result.current.actions.getDeepLink(batchId);

      expect(deepLink).toEqual({ channelId: 'ch-1', messageId: 'msg-1' });
    });

    it('should return deep link for specific message in batch', () => {
      const { result } = renderHook(() =>
        usePushNotifications({ config: { batchWindowMs: 5000 } }),
      );

      act(() => {
        result.current.actions.processNotification(
          createNotification({ messageId: 'msg-1', senderId: 'user-1', channelId: 'ch-1' }),
        );
        result.current.actions.processNotification(
          createNotification({ messageId: 'msg-2', senderId: 'user-1', channelId: 'ch-1' }),
        );
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      const batchId = result.current.state.deliveredBatches[0].batchId;
      const deepLink = result.current.actions.getDeepLink(batchId, 'msg-1');

      expect(deepLink).toEqual({ channelId: 'ch-1', messageId: 'msg-1' });
    });

    it('should return null for unknown batch', () => {
      const { result } = renderHook(() => usePushNotifications());
      const deepLink = result.current.actions.getDeepLink('nonexistent');
      expect(deepLink).toBeNull();
    });
  });

  describe('formatting', () => {
    it('should format batch title for single message', () => {
      const { result } = renderHook(() => usePushNotifications());

      act(() => {
        result.current.actions.processNotification(
          createNotification({ type: NotificationType.MENTION, senderName: 'Alice' }),
        );
      });

      const batch = result.current.state.deliveredBatches[0];
      expect(result.current.actions.formatBatchTitle(batch)).toBe('Alice');
    });

    it('should format batch title for multiple messages', () => {
      const { result } = renderHook(() =>
        usePushNotifications({ config: { batchWindowMs: 5000 } }),
      );

      act(() => {
        result.current.actions.processNotification(
          createNotification({ senderId: 'user-1', channelId: 'ch-1', senderName: 'Alice' }),
        );
        result.current.actions.processNotification(
          createNotification({ senderId: 'user-1', channelId: 'ch-1', senderName: 'Alice' }),
        );
        result.current.actions.processNotification(
          createNotification({ senderId: 'user-1', channelId: 'ch-1', senderName: 'Alice' }),
        );
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      const batch = result.current.state.deliveredBatches[0];
      expect(result.current.actions.formatBatchTitle(batch)).toBe('3 messages from Alice');
    });

    it('should format batch body with preview and count', () => {
      const { result } = renderHook(() =>
        usePushNotifications({ config: { batchWindowMs: 5000 } }),
      );

      act(() => {
        result.current.actions.processNotification(
          createNotification({
            senderId: 'user-1',
            channelId: 'ch-1',
            channelName: 'general',
            messagePreview: 'First msg',
          }),
        );
        result.current.actions.processNotification(
          createNotification({
            senderId: 'user-1',
            channelId: 'ch-1',
            channelName: 'general',
            messagePreview: 'Second msg',
          }),
        );
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      const batch = result.current.state.deliveredBatches[0];
      expect(result.current.actions.formatBatchBody(batch)).toBe(
        'First msg\n…and 1 more in #general',
      );
    });
  });

  describe('updateConfig', () => {
    it('should update batching config at runtime', () => {
      const { result } = renderHook(() => usePushNotifications());

      act(() => {
        result.current.actions.updateConfig({ batchWindowMs: 1000 });
      });

      expect(NotificationBatchingService.getConfig().batchWindowMs).toBe(1000);
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      const { result } = renderHook(() => usePushNotifications());

      // Error state starts null
      expect(result.current.state.error).toBeNull();

      act(() => {
        result.current.actions.clearError();
      });

      expect(result.current.state.error).toBeNull();
    });
  });
});
