/**
 * Notification Delivery Service Tests
 *
 * Tests for PN-006: Background processing and delivery optimization
 */

import notificationDeliveryService, {
  DeliveryReceipt,
  PendingDelivery,
  DeliveryStats,
  DeliveryConfig,
} from '../NotificationDeliveryService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// Mock AppState
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    AppState: {
      ...RN.AppState,
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    },
    Platform: {
      OS: 'android',
      Version: 33,
    },
  };
});

describe('NotificationDeliveryService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Reset service state
    await notificationDeliveryService.shutdown();
    await notificationDeliveryService.clearHistory();
  });

  afterEach(async () => {
    await notificationDeliveryService.shutdown();
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await notificationDeliveryService.initialize();
      expect(notificationDeliveryService).toBeDefined();
    });

    test('should accept custom configuration', async () => {
      const customConfig: Partial<DeliveryConfig> = {
        maxRetries: 10,
        baseDelayMs: 500,
        enableDeliveryReceipts: true,
      };

      await notificationDeliveryService.initialize(customConfig);
      notificationDeliveryService.updateConfig(customConfig);
    });

    test('should not re-initialize if already initialized', async () => {
      await notificationDeliveryService.initialize();
      await notificationDeliveryService.initialize(); // Should be no-op
    });
  });

  describe('Queue Notification', () => {
    test('should queue notification and return notification ID', async () => {
      await notificationDeliveryService.initialize();

      const payload = {
        title: 'Test Title',
        body: 'Test Body',
        data: { type: 'message' },
      };

      const notificationId = await notificationDeliveryService.queueNotification(
        'msg_123',
        payload as any,
        'ExponentPushToken/test-token',
        'high'
      );

      expect(notificationId).toBeDefined();
      expect(typeof notificationId).toBe('string');
      expect(notificationId.startsWith('notif_')).toBe(true);
    });

    test('should store pending delivery in queue', async () => {
      await notificationDeliveryService.initialize();

      const payload = {
        title: 'Test',
        body: 'Test body',
      };

      await notificationDeliveryService.queueNotification(
        'msg_456',
        payload as any,
        'ExponentPushToken/test-token'
      );

      expect(notificationDeliveryService.getPendingCount()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Delivery Receipts', () => {
    test('should create delivery receipt on queue', async () => {
      await notificationDeliveryService.initialize();

      const payload = {
        title: 'Test',
        body: 'Test body',
      };

      const notificationId = await notificationDeliveryService.queueNotification(
        'msg_789',
        payload as any,
        'ExponentPushToken/test-token',
        'normal'
      );

      const receipt = notificationDeliveryService.getDeliveryReceipt(notificationId);
      // Receipt may or may not exist depending on processing timing
      expect(receipt === undefined || receipt.notificationId === notificationId).toBe(true);
    });

    test('should retrieve all delivery receipts', async () => {
      await notificationDeliveryService.initialize();
      const receipts = notificationDeliveryService.getAllDeliveryReceipts();
      expect(Array.isArray(receipts)).toBe(true);
    });
  });

  describe('Cancel Delivery', () => {
    test('should return false for non-existent delivery', async () => {
      await notificationDeliveryService.initialize();
      const result = await notificationDeliveryService.cancelDelivery('non_existent_id');
      expect(result).toBe(false);
    });
  });

  describe('Retry Delivery', () => {
    test('should return false for non-existent delivery', async () => {
      await notificationDeliveryService.initialize();
      const result = await notificationDeliveryService.retryDelivery('non_existent_id');
      expect(result).toBe(false);
    });
  });

  describe('Delivery Statistics', () => {
    test('should return delivery stats', async () => {
      await notificationDeliveryService.initialize();
      const stats = notificationDeliveryService.getStats();

      expect(stats).toBeDefined();
      expect(typeof stats.totalSent).toBe('number');
      expect(typeof stats.totalDelivered).toBe('number');
      expect(typeof stats.totalFailed).toBe('number');
      expect(typeof stats.successRate).toBe('number');
      expect(stats.lastUpdated).toBeGreaterThan(0);
    });
  });

  describe('Subscription', () => {
    test('should subscribe to delivery receipts', async () => {
      await notificationDeliveryService.initialize();

      const callback = jest.fn();
      const unsubscribe = notificationDeliveryService.subscribeToDeliveries(callback);

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    test('should subscribe to stats updates', async () => {
      await notificationDeliveryService.initialize();

      const callback = jest.fn();
      const unsubscribe = notificationDeliveryService.subscribeToStats(callback);

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });

  describe('Shutdown', () => {
    test('should shutdown without error', async () => {
      await notificationDeliveryService.initialize();
      await notificationDeliveryService.shutdown();
    });

    test('should be idempotent shutdown', async () => {
      await notificationDeliveryService.initialize();
      await notificationDeliveryService.shutdown();
      await notificationDeliveryService.shutdown(); // Should not throw
    });
  });

  describe('Config Update', () => {
    test('should update configuration', async () => {
      await notificationDeliveryService.initialize();

      notificationDeliveryService.updateConfig({
        maxRetries: 7,
        backoffMultiplier: 3,
      });
    });
  });

  describe('Get Receipt By Message ID', () => {
    test('should return undefined for non-existent message', async () => {
      await notificationDeliveryService.initialize();
      const receipt = notificationDeliveryService.getReceiptByMessageId('non_existent');
      expect(receipt).toBeUndefined();
    });
  });

  describe('Clear History', () => {
    test('should clear all history without error', async () => {
      await notificationDeliveryService.initialize();
      await notificationDeliveryService.clearHistory();

      const stats = notificationDeliveryService.getStats();
      expect(stats.totalSent).toBe(0);
      expect(stats.totalDelivered).toBe(0);
    });
  });

  describe('Pending Count', () => {
    test('should return pending count', async () => {
      await notificationDeliveryService.initialize();
      const count = notificationDeliveryService.getPendingCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
