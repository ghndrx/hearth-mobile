/**
 * NotificationRetryQueue Tests
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Mock dependencies before importing
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
}));

import NotificationRetryQueue from '../NotificationRetryQueue';

describe('NotificationRetryQueue', () => {
  let mockDeliveryFn: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockDeliveryFn = jest.fn().mockResolvedValue(true);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    // Reset internal state
    (NotificationRetryQueue as any).queue = [];
    (NotificationRetryQueue as any).isProcessing = false;
    (NotificationRetryQueue as any).retryTimer = null;
    (NotificationRetryQueue as any).isOnline = true;
    (NotificationRetryQueue as any).deliveryFn = null;
  });

  afterEach(() => {
    NotificationRetryQueue.cleanup();
    jest.useRealTimers();
  });

  describe('initialize', () => {
    test('should load persisted queue and subscribe to network', async () => {
      const persisted = JSON.stringify([
        {
          id: 'n1',
          payload: {},
          retryCount: 1,
          nextRetryAt: Date.now(),
          createdAt: Date.now(),
        },
      ]);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(persisted);

      await NotificationRetryQueue.initialize(mockDeliveryFn);

      expect(AsyncStorage.getItem).toHaveBeenCalledWith(
        '@hearth/notification_retry_queue'
      );
      expect(NetInfo.addEventListener).toHaveBeenCalled();
      expect(NotificationRetryQueue.size).toBe(1);
    });

    test('should handle empty persisted queue', async () => {
      await NotificationRetryQueue.initialize(mockDeliveryFn);
      expect(NotificationRetryQueue.size).toBe(0);
    });
  });

  describe('enqueue', () => {
    beforeEach(async () => {
      await NotificationRetryQueue.initialize(mockDeliveryFn);
    });

    test('should add notification to queue', async () => {
      await NotificationRetryQueue.enqueue('n1', { title: 'Test' });

      expect(NotificationRetryQueue.size).toBe(1);
      expect(NotificationRetryQueue.getQueue()[0].id).toBe('n1');
    });

    test('should persist queue after enqueue', async () => {
      await NotificationRetryQueue.enqueue('n1', { title: 'Test' });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@hearth/notification_retry_queue',
        expect.any(String)
      );
    });

    test('should not add duplicate notifications', async () => {
      await NotificationRetryQueue.enqueue('n1', { title: 'Test' });
      await NotificationRetryQueue.enqueue('n1', { title: 'Test' });

      expect(NotificationRetryQueue.size).toBe(1);
    });

    test('should store error message', async () => {
      await NotificationRetryQueue.enqueue('n1', {}, 'Network error');

      expect(NotificationRetryQueue.getQueue()[0].lastError).toBe(
        'Network error'
      );
    });
  });

  describe('dequeue', () => {
    beforeEach(async () => {
      await NotificationRetryQueue.initialize(mockDeliveryFn);
    });

    test('should remove notification from queue', async () => {
      await NotificationRetryQueue.enqueue('n1', {});
      await NotificationRetryQueue.enqueue('n2', {});
      await NotificationRetryQueue.dequeue('n1');

      expect(NotificationRetryQueue.size).toBe(1);
      expect(NotificationRetryQueue.getQueue()[0].id).toBe('n2');
    });
  });

  describe('processQueue', () => {
    beforeEach(async () => {
      await NotificationRetryQueue.initialize(mockDeliveryFn);
    });

    test('should deliver due items and remove them on success', async () => {
      // Enqueue with nextRetryAt in the past
      (NotificationRetryQueue as any).queue = [
        {
          id: 'n1',
          payload: {},
          retryCount: 0,
          nextRetryAt: Date.now() - 1000,
          createdAt: Date.now(),
        },
      ];

      await NotificationRetryQueue.processQueue();

      expect(mockDeliveryFn).toHaveBeenCalled();
      expect(NotificationRetryQueue.size).toBe(0);
    });

    test('should increment retry count on failure', async () => {
      mockDeliveryFn.mockResolvedValue(false);

      (NotificationRetryQueue as any).queue = [
        {
          id: 'n1',
          payload: {},
          retryCount: 0,
          nextRetryAt: Date.now() - 1000,
          createdAt: Date.now(),
        },
      ];

      await NotificationRetryQueue.processQueue();

      expect(NotificationRetryQueue.size).toBe(1);
      expect(NotificationRetryQueue.getQueue()[0].retryCount).toBe(1);
    });

    test('should remove notification after max retries', async () => {
      mockDeliveryFn.mockResolvedValue(false);

      (NotificationRetryQueue as any).queue = [
        {
          id: 'n1',
          payload: {},
          retryCount: 4, // Will become 5 (max)
          nextRetryAt: Date.now() - 1000,
          createdAt: Date.now(),
        },
      ];

      await NotificationRetryQueue.processQueue();

      expect(NotificationRetryQueue.size).toBe(0);
    });

    test('should not process when offline', async () => {
      (NotificationRetryQueue as any).isOnline = false;
      (NotificationRetryQueue as any).queue = [
        {
          id: 'n1',
          payload: {},
          retryCount: 0,
          nextRetryAt: Date.now() - 1000,
          createdAt: Date.now(),
        },
      ];

      await NotificationRetryQueue.processQueue();

      expect(mockDeliveryFn).not.toHaveBeenCalled();
    });

    test('should skip items not yet due', async () => {
      (NotificationRetryQueue as any).queue = [
        {
          id: 'n1',
          payload: {},
          retryCount: 0,
          nextRetryAt: Date.now() + 60000, // 1 minute in the future
          createdAt: Date.now(),
        },
      ];

      await NotificationRetryQueue.processQueue();

      expect(mockDeliveryFn).not.toHaveBeenCalled();
      expect(NotificationRetryQueue.size).toBe(1);
    });
  });

  describe('clear', () => {
    test('should remove all items', async () => {
      await NotificationRetryQueue.initialize(mockDeliveryFn);
      await NotificationRetryQueue.enqueue('n1', {});
      await NotificationRetryQueue.enqueue('n2', {});

      await NotificationRetryQueue.clear();

      expect(NotificationRetryQueue.size).toBe(0);
    });
  });

  describe('network awareness', () => {
    test('should resume processing when coming back online', async () => {
      let networkCallback: (state: any) => void = () => {};
      (NetInfo.addEventListener as jest.Mock).mockImplementation((cb) => {
        networkCallback = cb;
        return jest.fn();
      });

      await NotificationRetryQueue.initialize(mockDeliveryFn);

      // Add item and go offline
      (NotificationRetryQueue as any).isOnline = false;
      (NotificationRetryQueue as any).queue = [
        {
          id: 'n1',
          payload: {},
          retryCount: 0,
          nextRetryAt: Date.now() - 1000,
          createdAt: Date.now(),
        },
      ];

      // Come back online
      networkCallback({ isConnected: true });

      // Allow async processing
      await new Promise((r) => setTimeout(r, 0));
      jest.runAllTimers();

      expect(mockDeliveryFn).toHaveBeenCalled();
    });
  });
});
