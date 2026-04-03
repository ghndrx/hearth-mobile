/**
 * DeliveryReceiptService Tests
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import DeliveryReceiptService from '../DeliveryReceiptService';

describe('DeliveryReceiptService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    await DeliveryReceiptService.resetMetrics();
  });

  describe('initialize', () => {
    test('should initialize and load persisted metrics', async () => {
      const persisted = JSON.stringify({
        totalSent: 10,
        totalDelivered: 9,
        totalFailed: 1,
        totalRetried: 1,
        successRate: 0.9,
        lastUpdated: Date.now(),
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(persisted);

      await DeliveryReceiptService.initialize();

      const metrics = DeliveryReceiptService.getMetrics();
      expect(metrics.totalSent).toBe(10);
      expect(metrics.totalDelivered).toBe(9);
    });

    test('should use default metrics when nothing persisted', async () => {
      await DeliveryReceiptService.initialize();

      const metrics = DeliveryReceiptService.getMetrics();
      expect(metrics.totalSent).toBe(0);
      expect(metrics.successRate).toBe(1);
    });
  });

  describe('trackSent', () => {
    beforeEach(async () => {
      await DeliveryReceiptService.initialize();
    });

    test('should track a sent notification', () => {
      DeliveryReceiptService.trackSent('n1', 'ios');

      const receipt = DeliveryReceiptService.getReceipt('n1');
      expect(receipt).toBeDefined();
      expect(receipt!.status).toBe('pending');
      expect(receipt!.platform).toBe('ios');
    });

    test('should increment totalSent', () => {
      DeliveryReceiptService.trackSent('n1', 'android');
      DeliveryReceiptService.trackSent('n2', 'android');

      expect(DeliveryReceiptService.getMetrics().totalSent).toBe(2);
    });
  });

  describe('acknowledgeDelivery', () => {
    beforeEach(async () => {
      await DeliveryReceiptService.initialize();
    });

    test('should mark notification as delivered', async () => {
      DeliveryReceiptService.trackSent('n1', 'ios');
      await DeliveryReceiptService.acknowledgeDelivery('n1');

      expect(DeliveryReceiptService.isDelivered('n1')).toBe(true);
    });

    test('should update success rate', async () => {
      DeliveryReceiptService.trackSent('n1', 'ios');
      DeliveryReceiptService.trackSent('n2', 'ios');
      await DeliveryReceiptService.acknowledgeDelivery('n1');

      expect(DeliveryReceiptService.getSuccessRate()).toBe(0.5);

      await DeliveryReceiptService.acknowledgeDelivery('n2');
      expect(DeliveryReceiptService.getSuccessRate()).toBe(1);
    });

    test('should persist metrics', async () => {
      DeliveryReceiptService.trackSent('n1', 'ios');
      await DeliveryReceiptService.acknowledgeDelivery('n1');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@hearth/delivery_metrics',
        expect.any(String)
      );
    });
  });

  describe('recordFailure', () => {
    let onFailure: jest.Mock;

    beforeEach(async () => {
      onFailure = jest.fn();
      await DeliveryReceiptService.initialize(onFailure);
    });

    test('should mark notification as failed', async () => {
      DeliveryReceiptService.trackSent('n1', 'android');
      await DeliveryReceiptService.recordFailure('n1', 'Network error');

      const receipt = DeliveryReceiptService.getReceipt('n1');
      expect(receipt!.status).toBe('failed');
      expect(receipt!.error).toBe('Network error');
    });

    test('should increment totalFailed', async () => {
      DeliveryReceiptService.trackSent('n1', 'android');
      await DeliveryReceiptService.recordFailure('n1', 'error');

      expect(DeliveryReceiptService.getMetrics().totalFailed).toBe(1);
    });

    test('should call onFailure callback', async () => {
      DeliveryReceiptService.trackSent('n1', 'android');
      await DeliveryReceiptService.recordFailure('n1', 'timeout');

      expect(onFailure).toHaveBeenCalledWith('n1', 'timeout');
    });

    test('should update success rate on failure', async () => {
      DeliveryReceiptService.trackSent('n1', 'ios');
      await DeliveryReceiptService.recordFailure('n1', 'error');

      // 0 delivered out of 1 sent
      expect(DeliveryReceiptService.getSuccessRate()).toBe(0);
    });
  });

  describe('markRetrying', () => {
    beforeEach(async () => {
      await DeliveryReceiptService.initialize();
    });

    test('should mark notification as retrying', () => {
      DeliveryReceiptService.trackSent('n1', 'ios');
      DeliveryReceiptService.markRetrying('n1');

      const receipt = DeliveryReceiptService.getReceipt('n1');
      expect(receipt!.status).toBe('retrying');
      expect(receipt!.retryCount).toBe(1);
    });

    test('should increment totalRetried', () => {
      DeliveryReceiptService.trackSent('n1', 'ios');
      DeliveryReceiptService.markRetrying('n1');

      expect(DeliveryReceiptService.getMetrics().totalRetried).toBe(1);
    });
  });

  describe('getPendingIds', () => {
    beforeEach(async () => {
      await DeliveryReceiptService.initialize();
    });

    test('should return pending and retrying notification IDs', async () => {
      DeliveryReceiptService.trackSent('n1', 'ios');
      DeliveryReceiptService.trackSent('n2', 'ios');
      DeliveryReceiptService.trackSent('n3', 'ios');

      await DeliveryReceiptService.acknowledgeDelivery('n2');
      DeliveryReceiptService.markRetrying('n3');

      const pending = DeliveryReceiptService.getPendingIds();
      expect(pending).toEqual(['n1', 'n3']);
    });
  });

  describe('resetMetrics', () => {
    test('should reset all metrics to defaults', async () => {
      await DeliveryReceiptService.initialize();
      DeliveryReceiptService.trackSent('n1', 'ios');
      await DeliveryReceiptService.acknowledgeDelivery('n1');

      await DeliveryReceiptService.resetMetrics();

      const metrics = DeliveryReceiptService.getMetrics();
      expect(metrics.totalSent).toBe(0);
      expect(metrics.totalDelivered).toBe(0);
      expect(metrics.totalFailed).toBe(0);
      expect(metrics.successRate).toBe(1);
    });
  });
});
