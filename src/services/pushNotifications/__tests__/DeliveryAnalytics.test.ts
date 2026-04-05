/**
 * Tests for DeliveryAnalytics
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

let analytics: typeof import('../DeliveryAnalytics').default;

beforeEach(() => {
  jest.clearAllMocks();
  jest.isolateModules(() => {
    analytics = require('../DeliveryAnalytics').default;
  });
});

describe('DeliveryAnalytics', () => {
  describe('trackSend', () => {
    it('should record a send event', async () => {
      await analytics.trackSend('notif-1');
      const event = await analytics.getEvent('notif-1');
      expect(event).toBeDefined();
      expect(event!.sentAt).toBeGreaterThan(0);
      expect(event!.deliveredAt).toBeUndefined();
    });
  });

  describe('trackDelivery', () => {
    it('should record delivery time', async () => {
      await analytics.trackSend('notif-2');
      await analytics.trackDelivery('notif-2');
      const event = await analytics.getEvent('notif-2');
      expect(event!.deliveredAt).toBeGreaterThan(0);
      expect(event!.deliveredAt! >= event!.sentAt).toBe(true);
    });

    it('should ignore delivery for untracked notification', async () => {
      await analytics.trackDelivery('unknown');
      const event = await analytics.getEvent('unknown');
      expect(event).toBeUndefined();
    });
  });

  describe('trackOpen', () => {
    it('should record open time', async () => {
      await analytics.trackSend('notif-3');
      await analytics.trackDelivery('notif-3');
      await analytics.trackOpen('notif-3');
      const event = await analytics.getEvent('notif-3');
      expect(event!.openedAt).toBeGreaterThan(0);
    });
  });

  describe('trackFailure', () => {
    it('should record failure with reason', async () => {
      await analytics.trackSend('notif-4');
      await analytics.trackFailure('notif-4', 'Network timeout');
      const event = await analytics.getEvent('notif-4');
      expect(event!.failedAt).toBeGreaterThan(0);
      expect(event!.failureReason).toBe('Network timeout');
    });

    it('should create event if not previously tracked', async () => {
      await analytics.trackFailure('new-fail', 'Server error');
      const event = await analytics.getEvent('new-fail');
      expect(event).toBeDefined();
      expect(event!.failureReason).toBe('Server error');
    });
  });

  describe('getDeliveryReport', () => {
    it('should return correct counts', async () => {
      await analytics.trackSend('r1');
      await analytics.trackSend('r2');
      await analytics.trackSend('r3');
      await analytics.trackSend('r4');

      await analytics.trackDelivery('r1');
      await analytics.trackDelivery('r2');
      await analytics.trackDelivery('r3');
      await analytics.trackFailure('r4', 'timeout');

      const report = await analytics.getDeliveryReport();
      expect(report.totalNotifications).toBe(4);
      expect(report.deliveredCount).toBe(3);
      expect(report.failedCount).toBe(1);
      expect(report.successRate).toBe(75);
    });

    it('should calculate average latency', async () => {
      const now = Date.now();
      await analytics.trackSend('lat-1');
      await analytics.trackDelivery('lat-1');

      const report = await analytics.getDeliveryReport();
      expect(report.averageDeliveryLatencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should track failure reasons', async () => {
      await analytics.trackSend('f1');
      await analytics.trackSend('f2');
      await analytics.trackFailure('f1', 'Network error');
      await analytics.trackFailure('f2', 'Network error');

      const report = await analytics.getDeliveryReport();
      expect(report.failureReasons['Network error']).toBe(2);
    });

    it('should calculate open rate', async () => {
      await analytics.trackSend('o1');
      await analytics.trackSend('o2');
      await analytics.trackDelivery('o1');
      await analytics.trackDelivery('o2');
      await analytics.trackOpen('o1');

      const report = await analytics.getDeliveryReport();
      expect(report.openRate).toBe(50);
      expect(report.openedCount).toBe(1);
    });

    it('should return 100% success rate when empty', async () => {
      const report = await analytics.getDeliveryReport();
      expect(report.successRate).toBe(100);
      expect(report.totalNotifications).toBe(0);
    });

    it('should filter by time period', async () => {
      await analytics.trackSend('period-1');
      await analytics.trackDelivery('period-1');

      // Report for future period should have no events
      const futureReport = await analytics.getDeliveryReport(Date.now() + 100000);
      expect(futureReport.totalNotifications).toBe(0);
    });
  });

  describe('clear', () => {
    it('should remove all analytics data', async () => {
      await analytics.trackSend('clear-1');
      await analytics.clear();
      const event = await analytics.getEvent('clear-1');
      expect(event).toBeUndefined();
    });
  });
});
