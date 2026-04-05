import SilentPushNotificationHandler, {
  SilentPushPayload,
} from '../silentPushHandler';

jest.mock('expo-notifications', () => ({
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  setBadgeCountAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
    currentState: 'active',
  },
  Platform: { OS: 'ios' },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
  addEventListener: jest.fn(() => jest.fn()),
}));

jest.mock('../notificationDeliveryTracking', () => {
  const mockInstance = {
    confirmDelivery: jest.fn(),
    trackNotificationSent: jest.fn(),
    reportFailure: jest.fn(),
    getMetrics: jest.fn().mockReturnValue({}),
    getRetryQueueSize: jest.fn().mockReturnValue(0),
    getPendingDeliveries: jest.fn().mockReturnValue([]),
    processRetryQueue: jest.fn(),
    setDeliveryAttemptHandler: jest.fn(),
    resetRecentMetrics: jest.fn(),
    pruneOldRecords: jest.fn(),
    getDeliveryRecord: jest.fn(),
    destroy: jest.fn(),
  };
  return {
    __esModule: true,
    default: {
      getInstance: jest.fn(() => mockInstance),
    },
  };
});

import * as Notifications from 'expo-notifications';
import NotificationDeliveryTrackingService from '../notificationDeliveryTracking';

describe('SilentPushNotificationHandler', () => {
  let handler: SilentPushNotificationHandler;

  beforeEach(() => {
    (SilentPushNotificationHandler as any).instance = null;
    handler = SilentPushNotificationHandler.getInstance();
  });

  afterEach(() => {
    handler.destroy();
    jest.clearAllMocks();
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const a = SilentPushNotificationHandler.getInstance();
      const b = SilentPushNotificationHandler.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('initialization', () => {
    it('should set up notification listener', () => {
      handler.initialize();
      expect(Notifications.addNotificationReceivedListener).toHaveBeenCalled();
    });
  });

  describe('handler registration', () => {
    it('should register and invoke custom handler', async () => {
      const mockHandler = jest.fn().mockResolvedValue(undefined);
      handler.registerHandler('sync_trigger', mockHandler);

      const payload: SilentPushPayload = {
        _silent: true,
        type: 'sync_trigger',
        data: { channels: ['ch-1', 'ch-2'] },
        timestamp: Date.now(),
      };

      await handler.processSilentPush(payload);

      expect(mockHandler).toHaveBeenCalledWith(payload);
      const metrics = handler.getMetrics();
      expect(metrics.totalReceived).toBe(1);
      expect(metrics.totalProcessed).toBe(1);
    });

    it('should unregister handler', async () => {
      const mockHandler = jest.fn().mockResolvedValue(undefined);
      const unregister = handler.registerHandler('config_update', mockHandler);
      unregister();

      const payload: SilentPushPayload = {
        _silent: true,
        type: 'config_update',
        data: {},
        timestamp: Date.now(),
      };

      await handler.processSilentPush(payload);

      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should support multiple handlers for same type', async () => {
      const handler1 = jest.fn().mockResolvedValue(undefined);
      const handler2 = jest.fn().mockResolvedValue(undefined);

      handler.registerHandler('sync_trigger', handler1);
      handler.registerHandler('sync_trigger', handler2);

      await handler.processSilentPush({
        _silent: true,
        type: 'sync_trigger',
        data: {},
        timestamp: Date.now(),
      });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('default handlers', () => {
    it('should handle delivery confirmations', async () => {
      const deliveryTracker = NotificationDeliveryTrackingService.getInstance();

      await handler.processSilentPush({
        _silent: true,
        type: 'delivery_confirmation',
        data: { notificationId: 'notif-42' },
        timestamp: Date.now(),
      });

      expect(deliveryTracker.confirmDelivery).toHaveBeenCalledWith('notif-42');
    });

    it('should handle badge updates', async () => {
      await handler.processSilentPush({
        _silent: true,
        type: 'badge_update',
        data: { count: 5 },
        timestamp: Date.now(),
      });

      expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(5);
    });
  });

  describe('error handling', () => {
    it('should track failed handler execution', async () => {
      handler.registerHandler('content_prefetch', async () => {
        throw new Error('Prefetch failed');
      });

      await handler.processSilentPush({
        _silent: true,
        type: 'content_prefetch',
        data: {},
        timestamp: Date.now(),
      });

      const metrics = handler.getMetrics();
      expect(metrics.totalFailed).toBe(1);
    });
  });

  describe('metrics', () => {
    it('should track metrics by type', async () => {
      await handler.processSilentPush({
        _silent: true,
        type: 'delivery_confirmation',
        data: { notificationId: 'n1' },
        timestamp: Date.now(),
      });

      await handler.processSilentPush({
        _silent: true,
        type: 'delivery_confirmation',
        data: { notificationId: 'n2' },
        timestamp: Date.now(),
      });

      const metrics = handler.getMetrics();
      expect(metrics.byType.delivery_confirmation).toBe(2);
      expect(metrics.totalReceived).toBe(2);
      expect(metrics.lastReceivedAt).not.toBeNull();
    });
  });

  describe('cleanup', () => {
    it('should reset state on destroy', () => {
      handler.destroy();
      const metrics = handler.getMetrics();
      expect(metrics.totalReceived).toBe(0);
    });
  });
});
