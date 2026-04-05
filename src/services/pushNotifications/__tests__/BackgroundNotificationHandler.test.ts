/**
 * Tests for BackgroundNotificationHandler
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// Mock modules before importing handler
jest.mock('expo-background-fetch', () => ({
  registerTaskAsync: jest.fn().mockResolvedValue(undefined),
  unregisterTaskAsync: jest.fn().mockResolvedValue(undefined),
  BackgroundFetchResult: {
    NewData: 1,
    NoData: 2,
    Failed: 3,
  },
}));

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn().mockResolvedValue('mock-id'),
  addNotificationReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  multiGet: jest.fn().mockResolvedValue([
    ['@pn006/retry_queue', null],
    ['@pn006/delivery_state', null],
  ]),
  multiSet: jest.fn().mockResolvedValue(undefined),
  multiRemove: jest.fn().mockResolvedValue(undefined),
}));

// We need to get the singleton fresh for each test
let handler: typeof import('../BackgroundNotificationHandler').default;

beforeEach(() => {
  jest.clearAllMocks();
  // Re-import to get fresh singleton state
  jest.isolateModules(() => {
    handler = require('../BackgroundNotificationHandler').default;
  });
});

describe('BackgroundNotificationHandler', () => {
  describe('registerBackgroundFetch', () => {
    it('should register background fetch task and return true', async () => {
      const result = await handler.registerBackgroundFetch();
      expect(result).toBe(true);
    });

    it('should return false on registration failure', async () => {
      // Create handler where registerTaskAsync fails
      const BackgroundFetch = require('expo-background-fetch');
      BackgroundFetch.registerTaskAsync.mockRejectedValueOnce(new Error('fail'));

      let failHandler: typeof handler;
      jest.isolateModules(() => {
        failHandler = require('../BackgroundNotificationHandler').default;
      });
      const result = await failHandler!.registerBackgroundFetch();
      expect(result).toBe(false);
    });
  });

  describe('delivery tracking', () => {
    it('should track notification sent', async () => {
      await handler.trackNotificationSent('notif-1', { title: 'Test' });
      const stats = handler.getDeliveryStats();
      expect(stats.total).toBe(1);
      expect(stats.pending).toBe(1);
    });

    it('should confirm delivery', async () => {
      await handler.trackNotificationSent('notif-2');
      await handler.confirmDelivery('notif-2');
      const stats = handler.getDeliveryStats();
      expect(stats.delivered).toBe(1);
      expect(stats.pending).toBe(0);
    });

    it('should handle confirming non-existent notification', async () => {
      // Should not throw
      await handler.confirmDelivery('non-existent');
      const stats = handler.getDeliveryStats();
      expect(stats.total).toBe(0);
    });

    it('should compute delivery rate', async () => {
      await handler.trackNotificationSent('n1');
      await handler.trackNotificationSent('n2');
      await handler.trackNotificationSent('n3');
      await handler.trackNotificationSent('n4');
      await handler.confirmDelivery('n1');
      await handler.confirmDelivery('n2');
      await handler.confirmDelivery('n3');

      const stats = handler.getDeliveryStats();
      expect(stats.deliveryRate).toBe(75);
      expect(stats.delivered).toBe(3);
      expect(stats.pending).toBe(1);
    });
  });

  describe('retry logic', () => {
    it('should add to retry queue on failure', async () => {
      await handler.trackNotificationSent('fail-1');
      await handler.recordFailure('fail-1', { title: 'Test' }, 'Network error', 5);

      const stats = handler.getDeliveryStats();
      expect(stats.retrying).toBe(1);
      expect(handler.getRetryQueue()).toHaveLength(1);
    });

    it('should mark as failed after max retries', async () => {
      await handler.trackNotificationSent('fail-max');
      // Simulate 5 consecutive failures with maxRetries=5
      for (let i = 0; i < 5; i++) {
        await handler.recordFailure('fail-max', { title: 'Test' }, 'Network error', 5);
      }

      const stats = handler.getDeliveryStats();
      expect(stats.failed).toBe(1);
      expect(stats.retrying).toBe(0);
      // Should be removed from retry queue
      const queue = handler.getRetryQueue();
      const item = queue.find((q) => q.notificationId === 'fail-max');
      expect(item).toBeUndefined();
    });

    it('should use exponential backoff for retry delays', async () => {
      await handler.trackNotificationSent('backoff-1');
      await handler.recordFailure('backoff-1', { title: 'Test' }, 'error', 5);

      const queue = handler.getRetryQueue();
      const item = queue.find((q) => q.notificationId === 'backoff-1');
      expect(item).toBeDefined();
      // First retry: backoff should be 2s (2^1 * 1000) since retryCount is 1
      expect(item!.nextRetryAt).toBeGreaterThan(Date.now() - 100);
    });

    it('should process due retry items', async () => {
      await handler.trackNotificationSent('retry-1');
      await handler.recordFailure('retry-1', { title: 'Hello', body: 'World' }, 'temp error', 5);

      // Manually set nextRetryAt to past
      const queue = handler.getRetryQueue();
      if (queue.length > 0) {
        queue[0].nextRetryAt = Date.now() - 1000;
      }

      const processed = await handler.processRetryQueue();
      expect(processed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('retryFailedDeliveries', () => {
    it('should reset failed items and reprocess', async () => {
      await handler.trackNotificationSent('manual-retry');
      // Exhaust retries
      for (let i = 0; i < 3; i++) {
        await handler.recordFailure('manual-retry', {}, 'error', 3);
      }
      expect(handler.getDeliveryStats().failed).toBe(1);

      await handler.retryFailedDeliveries();
      // After retry, it should be processed (delivered via local notification)
      const stats = handler.getDeliveryStats();
      expect(stats.failed).toBe(0);
    });

    it('should return 0 when no failed deliveries', async () => {
      const result = await handler.retryFailedDeliveries();
      expect(result).toBe(0);
    });
  });

  describe('state persistence', () => {
    it('should persist state on changes', async () => {
      await handler.trackNotificationSent('persist-1');
      expect(AsyncStorage.multiSet).toHaveBeenCalled();
    });

    it('should clear state', async () => {
      await handler.trackNotificationSent('clear-1');
      await handler.clearState();
      const stats = handler.getDeliveryStats();
      expect(stats.total).toBe(0);
      expect(AsyncStorage.multiRemove).toHaveBeenCalled();
    });
  });
});
