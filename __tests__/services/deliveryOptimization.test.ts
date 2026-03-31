/**
 * Tests for Delivery Optimization Service (PN-006)
 */

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    currentState: 'active',
  },
  Platform: { OS: 'ios', Version: '17.0' },
}));

jest.mock('expo-device', () => ({
  isDevice: true,
  brand: 'Apple',
  modelName: 'iPhone 14',
  totalMemory: 4 * 1024 * 1024 * 1024,
}));

jest.mock('expo-notifications', () => ({
  setNotificationChannelAsync: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  AndroidImportance: { MIN: 'min', MAX: 'max', HIGH: 'high', DEFAULT: 'default', LOW: 'low' },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true, type: 'wifi' }),
  addEventListener: jest.fn(() => jest.fn()),
  NetInfoStateType: { wifi: 'wifi', cellular: 'cellular' },
}));

import { backgroundProcessingService } from '../../src/services/backgroundProcessing/BackgroundProcessingService';
import {
  deliveryOptimizationService,
  type DeliveryReceipt,
} from '../../src/services/backgroundProcessing/DeliveryOptimizationService';

describe('DeliveryOptimizationService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    backgroundProcessingService.shutdown();
    deliveryOptimizationService.shutdown();
    await backgroundProcessingService.initialize();
    await deliveryOptimizationService.initialize();
  });

  afterEach(() => {
    deliveryOptimizationService.shutdown();
    backgroundProcessingService.shutdown();
    jest.useRealTimers();
  });

  describe('delivery tracking', () => {
    it('should create a delivery receipt when tracking', async () => {
      const receipt = await deliveryOptimizationService.trackDelivery(
        'notif-1',
        jest.fn().mockResolvedValue(undefined),
        { priority: 'high', platform: 'ios' },
      );
      expect(receipt.notificationId).toBe('notif-1');
      expect(receipt.status).toBe('pending');
      expect(receipt.platform).toBe('ios');
      expect(receipt.retryCount).toBe(0);
    });

    it('should store receipt for retrieval', async () => {
      await deliveryOptimizationService.trackDelivery(
        'notif-2',
        jest.fn().mockResolvedValue(undefined),
      );
      const receipt = deliveryOptimizationService.getReceipt('notif-2');
      expect(receipt).toBeDefined();
      expect(receipt!.notificationId).toBe('notif-2');
    });

    it('should queue a background processing task', async () => {
      await deliveryOptimizationService.trackDelivery(
        'notif-3',
        jest.fn().mockResolvedValue(undefined),
      );
      expect(backgroundProcessingService.hasTask('delivery_notif-3')).toBe(true);
    });
  });

  describe('delivery confirmation', () => {
    it('should confirm delivery and update receipt', async () => {
      await deliveryOptimizationService.trackDelivery(
        'confirm-1',
        jest.fn().mockResolvedValue(undefined),
      );
      deliveryOptimizationService.confirmDelivery('confirm-1');
      const receipt = deliveryOptimizationService.getReceipt('confirm-1');
      expect(receipt!.status).toBe('confirmed');
      expect(receipt!.confirmedAt).toBeGreaterThan(0);
    });

    it('should handle batch confirmations', async () => {
      await deliveryOptimizationService.trackDelivery(
        'batch-1',
        jest.fn().mockResolvedValue(undefined),
      );
      await deliveryOptimizationService.trackDelivery(
        'batch-2',
        jest.fn().mockResolvedValue(undefined),
      );
      deliveryOptimizationService.batchConfirmDeliveries(['batch-1', 'batch-2']);
      expect(deliveryOptimizationService.getReceipt('batch-1')!.status).toBe('confirmed');
      expect(deliveryOptimizationService.getReceipt('batch-2')!.status).toBe('confirmed');
    });

    it('should handle confirmation of unknown notification', () => {
      expect(() => deliveryOptimizationService.confirmDelivery('unknown')).not.toThrow();
    });
  });

  describe('delivery metrics', () => {
    it('should return metrics with correct shape', () => {
      const metrics = deliveryOptimizationService.getMetrics();
      expect(metrics).toHaveProperty('totalSent');
      expect(metrics).toHaveProperty('totalDelivered');
      expect(metrics).toHaveProperty('totalConfirmed');
      expect(metrics).toHaveProperty('totalFailed');
      expect(metrics).toHaveProperty('deliveryRate');
      expect(metrics).toHaveProperty('averageDeliveryTimeMs');
      expect(metrics).toHaveProperty('pendingCount');
      expect(metrics).toHaveProperty('inFlightCount');
    });

    it('should track sent count', async () => {
      const sentBefore = deliveryOptimizationService.getMetrics().totalSent;
      await deliveryOptimizationService.trackDelivery(
        'metric-1',
        jest.fn().mockResolvedValue(undefined),
      );
      expect(deliveryOptimizationService.getMetrics().totalSent).toBe(sentBefore + 1);
    });

    it('should track confirmed count', async () => {
      const confirmedBefore = deliveryOptimizationService.getMetrics().totalConfirmed;
      await deliveryOptimizationService.trackDelivery(
        'metric-2',
        jest.fn().mockResolvedValue(undefined),
      );
      deliveryOptimizationService.confirmDelivery('metric-2');
      expect(deliveryOptimizationService.getMetrics().totalConfirmed).toBe(confirmedBefore + 1);
    });
  });

  describe('retry delay calculation', () => {
    it('should calculate exponential backoff', () => {
      const delay0 = deliveryOptimizationService.calculateRetryDelay(0);
      const delay1 = deliveryOptimizationService.calculateRetryDelay(1);
      const delay2 = deliveryOptimizationService.calculateRetryDelay(2);
      expect(delay1).toBeGreaterThan(delay0);
      expect(delay2).toBeGreaterThan(delay1);
    });

    it('should cap delay at maxRetryDelayMs', () => {
      const delay = deliveryOptimizationService.calculateRetryDelay(20);
      expect(delay).toBeLessThanOrEqual(60000);
    });
  });

  describe('receipt update listeners', () => {
    it('should notify listeners on receipt updates', async () => {
      const updates: DeliveryReceipt[] = [];
      deliveryOptimizationService.onReceiptUpdate((receipt) => updates.push(receipt));
      await deliveryOptimizationService.trackDelivery(
        'listen-1',
        jest.fn().mockResolvedValue(undefined),
      );
      expect(updates.length).toBeGreaterThanOrEqual(1);
    });

    it('should unsubscribe correctly', async () => {
      const updates: DeliveryReceipt[] = [];
      const unsubscribe = deliveryOptimizationService.onReceiptUpdate(
        (receipt) => updates.push(receipt),
      );
      unsubscribe();
      await deliveryOptimizationService.trackDelivery(
        'unsub-1',
        jest.fn().mockResolvedValue(undefined),
      );
      expect(updates.length).toBe(0);
    });
  });

  describe('shutdown', () => {
    it('should clear state on shutdown', () => {
      deliveryOptimizationService.shutdown();
      const metrics = deliveryOptimizationService.getMetrics();
      expect(metrics.pendingCount).toBe(0);
      expect(metrics.inFlightCount).toBe(0);
    });

    it('should be safe to call shutdown without initialization', () => {
      deliveryOptimizationService.shutdown();
      expect(() => deliveryOptimizationService.shutdown()).not.toThrow();
    });
  });
});
