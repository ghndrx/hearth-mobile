import NotificationDeliveryTrackingService, {
  DeliveryRecord,
  DeliveryMetrics,
} from '../notificationDeliveryTracking';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
  addEventListener: jest.fn(() => jest.fn()),
}));

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
    currentState: 'active',
  },
  Platform: { OS: 'ios' },
}));

jest.useFakeTimers();

describe('NotificationDeliveryTrackingService', () => {
  let service: NotificationDeliveryTrackingService;

  beforeEach(() => {
    (NotificationDeliveryTrackingService as any).instance = null;
    service = NotificationDeliveryTrackingService.getInstance();
  });

  afterEach(() => {
    service.destroy();
    jest.clearAllMocks();
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const a = NotificationDeliveryTrackingService.getInstance();
      const b = NotificationDeliveryTrackingService.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('tracking notifications', () => {
    it('should track a sent notification', () => {
      const record = service.trackNotificationSent('notif-1', 'ios', {
        messageId: 'msg-1',
        channelId: 'ch-1',
      });

      expect(record.notificationId).toBe('notif-1');
      expect(record.status).toBe('pending');
      expect(record.retryCount).toBe(0);
      expect(record.platform).toBe('ios');

      const metrics = service.getMetrics();
      expect(metrics.totalSent).toBe(1);
    });

    it('should confirm delivery', () => {
      service.trackNotificationSent('notif-2', 'android');
      service.confirmDelivery('notif-2');

      const record = service.getDeliveryRecord('notif-2');
      expect(record?.status).toBe('delivered');
      expect(record?.deliveredAt).toBeDefined();

      const metrics = service.getMetrics();
      expect(metrics.totalDelivered).toBe(1);
      expect(metrics.deliveryRate).toBe(100);
    });

    it('should track average delivery time', () => {
      const now = Date.now();
      service.trackNotificationSent('notif-3', 'ios');

      // Advance time 500ms
      jest.advanceTimersByTime(500);
      service.confirmDelivery('notif-3');

      const metrics = service.getMetrics();
      expect(metrics.averageDeliveryTime).toBeGreaterThan(0);
    });
  });

  describe('failure handling and retry', () => {
    it('should enqueue for retry on failure', () => {
      service.trackNotificationSent('notif-fail', 'ios');
      service.reportFailure('notif-fail', 'Network error');

      const record = service.getDeliveryRecord('notif-fail');
      expect(record?.status).toBe('retrying');
      expect(record?.retryCount).toBe(1);
      expect(record?.nextRetryAt).toBeDefined();
      expect(service.getRetryQueueSize()).toBe(1);
    });

    it('should mark as failed after max retries', () => {
      service.trackNotificationSent('notif-maxfail', 'android');

      // Exhaust all retries (maxRetries=5, so need 6 failures: retryCount goes 1..5 retrying, 6 fails)
      for (let i = 0; i < 6; i++) {
        service.reportFailure('notif-maxfail', 'Persistent failure');
      }

      const record = service.getDeliveryRecord('notif-maxfail');
      expect(record?.status).toBe('failed');

      const metrics = service.getMetrics();
      expect(metrics.totalFailed).toBe(1);
    });

    it('should use exponential backoff for retries', () => {
      service.trackNotificationSent('notif-backoff', 'ios');

      service.reportFailure('notif-backoff', 'Error 1');
      const record1 = service.getDeliveryRecord('notif-backoff');
      const firstRetryDelay = record1!.nextRetryAt! - Date.now();

      // Re-fail to get second backoff
      service.reportFailure('notif-backoff', 'Error 2');
      const record2 = service.getDeliveryRecord('notif-backoff');
      const secondRetryDelay = record2!.nextRetryAt! - Date.now();

      // Second backoff should be roughly double the first (with jitter)
      expect(secondRetryDelay).toBeGreaterThan(firstRetryDelay * 1.5);
    });
  });

  describe('delivery metrics', () => {
    it('should calculate delivery rate correctly', () => {
      service.trackNotificationSent('n1', 'ios');
      service.trackNotificationSent('n2', 'ios');
      service.trackNotificationSent('n3', 'ios');
      service.trackNotificationSent('n4', 'ios');

      service.confirmDelivery('n1');
      service.confirmDelivery('n2');
      service.confirmDelivery('n3');

      const metrics = service.getMetrics();
      expect(metrics.deliveryRate).toBe(75);
      expect(metrics.totalSent).toBe(4);
      expect(metrics.totalDelivered).toBe(3);
    });

    it('should report pending deliveries', () => {
      service.trackNotificationSent('p1', 'ios');
      service.trackNotificationSent('p2', 'android');
      service.confirmDelivery('p1');

      const pending = service.getPendingDeliveries();
      expect(pending.length).toBe(1);
      expect(pending[0].notificationId).toBe('p2');
    });

    it('should reset recent metrics', () => {
      service.trackNotificationSent('r1', 'ios');
      service.confirmDelivery('r1');

      service.resetRecentMetrics();
      const metrics = service.getMetrics();
      expect(metrics.recentSent).toBe(0);
      expect(metrics.recentDelivered).toBe(0);
      expect(metrics.recentDeliveryRate).toBe(100);
    });
  });

  describe('retry queue processing', () => {
    it('should process retry queue and call delivery handler', async () => {
      const mockHandler = jest.fn().mockResolvedValue(true);
      service.setDeliveryAttemptHandler(mockHandler);

      service.trackNotificationSent('retry-1', 'ios');
      service.reportFailure('retry-1', 'First failure');

      // Advance past the backoff period
      jest.advanceTimersByTime(5000);

      await service.processRetryQueue();

      expect(mockHandler).toHaveBeenCalled();
      const record = service.getDeliveryRecord('retry-1');
      expect(record?.status).toBe('delivered');
    });

    it('should re-enqueue on failed retry', async () => {
      const mockHandler = jest.fn().mockResolvedValue(false);
      service.setDeliveryAttemptHandler(mockHandler);

      service.trackNotificationSent('retry-fail', 'android');
      service.reportFailure('retry-fail', 'First failure');

      jest.advanceTimersByTime(5000);
      await service.processRetryQueue();

      const record = service.getDeliveryRecord('retry-fail');
      expect(record?.status).toBe('retrying');
      expect(record!.retryCount).toBeGreaterThan(1);
    });
  });

  describe('pruning', () => {
    it('should prune old records', async () => {
      service.trackNotificationSent('old-1', 'ios');

      // Make the record old
      const record = service.getDeliveryRecord('old-1');
      if (record) {
        record.sentAt = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 days ago
      }

      const pruned = await service.pruneOldRecords();
      expect(pruned).toBe(1);
    });
  });

  describe('cleanup', () => {
    it('should reset state on destroy', () => {
      service.trackNotificationSent('d1', 'ios');
      service.destroy();

      expect(service.getRetryQueueSize()).toBe(0);
      const metrics = service.getMetrics();
      expect(metrics.totalSent).toBe(0);
    });
  });
});
