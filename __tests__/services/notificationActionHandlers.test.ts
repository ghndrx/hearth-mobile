/**
 * Tests for Notification Action Handlers (PN-005)
 */

jest.mock('../../lib/services/richNotifications', () => ({
  richNotifications: {
    registerActionHandler: jest.fn(),
  },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: jest.fn((options) => options.ios || options.default) },
}));

jest.mock('../../lib/services/notifications', () => ({
  getNotificationSettings: jest.fn(() => Promise.resolve({ enabled: true })),
  scheduleLocalNotification: jest.fn(),
}));

jest.mock('../../lib/services/websocket', () => ({
  websocketService: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
  WebSocketMessageType: {
    MESSAGE_NEW: 'MESSAGE_NEW',
    DM_NEW: 'DM_NEW',
  },
}));

import { notificationActionHandlers } from '../../lib/services/notificationActionHandlers';

describe('NotificationActionHandlersService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    notificationActionHandlers.shutdown();
  });

  afterEach(() => {
    notificationActionHandlers.shutdown();
  });

  describe('initialization', () => {
    it('should initialize and register action handlers', async () => {
      await notificationActionHandlers.initialize();
      expect(notificationActionHandlers.isInitialized()).toBe(true);
    });

    it('should not initialize twice', async () => {
      await notificationActionHandlers.initialize();
      await notificationActionHandlers.initialize();
      expect(notificationActionHandlers.isInitialized()).toBe(true);
    });
  });

  describe('shutdown', () => {
    it('should shutdown properly', async () => {
      await notificationActionHandlers.initialize();
      notificationActionHandlers.shutdown();
      expect(notificationActionHandlers.isInitialized()).toBe(false);
    });
  });
});
