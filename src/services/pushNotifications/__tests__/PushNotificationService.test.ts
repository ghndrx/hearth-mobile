/**
 * Push Notification Service Tests
 * Tests for expo-notifications based implementation
 */

import { Platform } from 'react-native';
import PushNotificationService from '../PushNotificationService';

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  addPushTokenListener: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  dismissAllNotificationsAsync: jest.fn(),
  dismissNotificationAsync: jest.fn(),
  getPresentedNotificationsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  AndroidImportance: {
    MAX: 5,
    HIGH: 4,
    DEFAULT: 3,
    LOW: 2,
    MIN: 1,
    NONE: 0,
  },
  TriggerType: {
    DATE: 1,
    TIME_INTERVAL: 2,
    Push: 3,
  },
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      eas: {
        projectId: 'test-project-id',
      },
    },
  },
  manifest: {
    version: '1.0.0',
  },
}));

// Mock React Native Platform
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Platform: {
      OS: 'android',
      Version: 33,
    },
  };
});

describe('PushNotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset service state
    (PushNotificationService as any).isInitialized = false;
    (PushNotificationService as any).config = {};
    (PushNotificationService as any).notificationListeners = [];
    (PushNotificationService as any).tokenRefreshSubscription = undefined;
  });

  describe('Platform Detection', () => {
    test('should detect Android platform', () => {
      expect(PushNotificationService.getPlatform()).toBe('android');
    });

    test('should detect iOS platform', () => {
      (Platform as any).OS = 'ios';
      expect(PushNotificationService.getPlatform()).toBe('ios');
      (Platform as any).OS = 'android'; // Reset
    });

    test('should detect unknown platform', () => {
      (Platform as any).OS = 'web';
      expect(PushNotificationService.getPlatform()).toBe('unknown');
      (Platform as any).OS = 'android'; // Reset
    });
  });

  describe('Initialization', () => {
    test('should initialize successfully with granted permissions', async () => {
      const Notifications = require('expo-notifications');
      Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
      Notifications.addNotificationReceivedListener.mockReturnValue({ remove: jest.fn() });
      Notifications.addNotificationResponseReceivedListener.mockReturnValue({ remove: jest.fn() });
      Notifications.addPushTokenListener.mockReturnValue({ remove: jest.fn() });

      const result = await PushNotificationService.initialize();

      expect(result).toBe(true);
      expect(PushNotificationService.isServiceInitialized()).toBe(true);
    });

    test('should request permissions if not granted', async () => {
      const Notifications = require('expo-notifications');
      Notifications.getPermissionsAsync.mockResolvedValue({ status: 'denied' });
      Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
      Notifications.addNotificationReceivedListener.mockReturnValue({ remove: jest.fn() });
      Notifications.addNotificationResponseReceivedListener.mockReturnValue({ remove: jest.fn() });
      Notifications.addPushTokenListener.mockReturnValue({ remove: jest.fn() });

      const result = await PushNotificationService.initialize();

      expect(result).toBe(true);
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    test('should fail initialization if permissions denied', async () => {
      const Notifications = require('expo-notifications');
      Notifications.getPermissionsAsync.mockResolvedValue({ status: 'denied' });
      Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });

      const result = await PushNotificationService.initialize();

      expect(result).toBe(false);
      expect(PushNotificationService.isServiceInitialized()).toBe(false);
    });

    test('should call configuration callbacks on initialization', async () => {
      const Notifications = require('expo-notifications');
      Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
      Notifications.addNotificationReceivedListener.mockReturnValue({ remove: jest.fn() });
      Notifications.addNotificationResponseReceivedListener.mockReturnValue({ remove: jest.fn() });
      Notifications.addPushTokenListener.mockReturnValue({ remove: jest.fn() });

      const onTokenReceived = jest.fn();
      const onNotificationReceived = jest.fn();

      await PushNotificationService.initialize({
        onTokenReceived,
        onNotificationReceived,
      });

      expect(PushNotificationService.isServiceInitialized()).toBe(true);
    });
  });

  describe('Device Token', () => {
    test('should get device token successfully', async () => {
      const Notifications = require('expo-notifications');
      Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
      Notifications.addNotificationReceivedListener.mockReturnValue({ remove: jest.fn() });
      Notifications.addNotificationResponseReceivedListener.mockReturnValue({ remove: jest.fn() });
      Notifications.addPushTokenListener.mockReturnValue({ remove: jest.fn() });
      Notifications.getExpoPushTokenAsync.mockResolvedValue({ data: 'ExpoPushToken-test-token-12345' });

      await PushNotificationService.initialize();
      const token = await PushNotificationService.getDeviceToken();

      expect(token).toBe('ExpoPushToken-test-token-12345');
    });

    test('should return null when not initialized', async () => {
      const token = await PushNotificationService.getDeviceToken();
      expect(token).toBeNull();
    });

    test('should call token received callback when token obtained', async () => {
      const Notifications = require('expo-notifications');
      Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
      Notifications.addNotificationReceivedListener.mockReturnValue({ remove: jest.fn() });
      Notifications.addNotificationResponseReceivedListener.mockReturnValue({ remove: jest.fn() });
      Notifications.addPushTokenListener.mockReturnValue({ remove: jest.fn() });
      Notifications.getExpoPushTokenAsync.mockResolvedValue({ data: 'ExpoPushToken-test-token-12345' });

      const onTokenReceived = jest.fn();
      await PushNotificationService.initialize({ onTokenReceived });
      await PushNotificationService.getDeviceToken();

      expect(onTokenReceived).toHaveBeenCalledWith('ExpoPushToken-test-token-12345');
    });
  });

  describe('Device Registration', () => {
    test('should register device with backend (simulated)', async () => {
      const token = 'mock-token';
      const result = await PushNotificationService.registerDeviceWithBackend(token);
      expect(result).toBe(true);
    });

    test('should generate device ID', () => {
      const service = PushNotificationService as any;
      const deviceId1 = service.generateDeviceId();
      const deviceId2 = service.generateDeviceId();

      expect(typeof deviceId1).toBe('string');
      expect(typeof deviceId2).toBe('string');
      expect(deviceId1).not.toBe(deviceId2);
    });
  });

  describe('Local Notifications', () => {
    beforeEach(async () => {
      const Notifications = require('expo-notifications');
      Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
      Notifications.addNotificationReceivedListener.mockReturnValue({ remove: jest.fn() });
      Notifications.addNotificationResponseReceivedListener.mockReturnValue({ remove: jest.fn() });
      Notifications.addPushTokenListener.mockReturnValue({ remove: jest.fn() });
      await PushNotificationService.initialize();
    });

    test('should dismiss all notifications', async () => {
      const Notifications = require('expo-notifications');
      await PushNotificationService.dismissAllNotifications();
      expect(Notifications.dismissAllNotificationsAsync).toHaveBeenCalled();
    });

    test('should dismiss specific notification', async () => {
      const Notifications = require('expo-notifications');
      await PushNotificationService.dismissNotification('notification-id');
      expect(Notifications.dismissNotificationAsync).toHaveBeenCalledWith('notification-id');
    });

    test('should get delivered notifications', async () => {
      const Notifications = require('expo-notifications');
      const mockNotifications = [{ identifier: '1' }, { identifier: '2' }];
      Notifications.getPresentedNotificationsAsync.mockResolvedValue(mockNotifications);

      const notifications = await PushNotificationService.getDeliveredNotifications();
      expect(notifications).toEqual(mockNotifications);
    });

    test('should schedule local notification', async () => {
      const Notifications = require('expo-notifications');
      Notifications.scheduleNotificationAsync.mockResolvedValue('scheduled-id');

      const id = await PushNotificationService.scheduleLocalNotification(
        'Test Title',
        'Test Body',
        { type: Notifications.TriggerType.DATE, date: new Date() }
      );

      expect(id).toBe('scheduled-id');
    });

    test('should cancel scheduled notification', async () => {
      const Notifications = require('expo-notifications');
      await PushNotificationService.cancelScheduledNotification('scheduled-id');
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('scheduled-id');
    });

    test('should cancel all scheduled notifications', async () => {
      const Notifications = require('expo-notifications');
      await PushNotificationService.cancelAllScheduledNotifications();
      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    test('should clean up service properly', async () => {
      const Notifications = require('expo-notifications');
      Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });

      const removeMock1 = jest.fn();
      const removeMock2 = jest.fn();
      const removeMock3 = jest.fn();

      Notifications.addNotificationReceivedListener.mockReturnValue({ remove: removeMock1 });
      Notifications.addNotificationResponseReceivedListener.mockReturnValue({ remove: removeMock2 });
      Notifications.addPushTokenListener.mockReturnValue({ remove: removeMock3 });

      await PushNotificationService.initialize();
      await PushNotificationService.cleanup();

      expect(removeMock1).toHaveBeenCalled();
      expect(removeMock2).toHaveBeenCalled();
      expect(removeMock3).toHaveBeenCalled();
      expect(PushNotificationService.isServiceInitialized()).toBe(false);
    });
  });

  describe('Configuration Callbacks', () => {
    test('should call notification received callback', async () => {
      const Notifications = require('expo-notifications');
      Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });

      let capturedHandler: any;
      Notifications.addNotificationReceivedListener.mockImplementation((handler: any) => {
        capturedHandler = handler;
        return { remove: jest.fn() };
      });
      Notifications.addNotificationResponseReceivedListener.mockReturnValue({ remove: jest.fn() });
      Notifications.addPushTokenListener.mockReturnValue({ remove: jest.fn() });

      const onNotificationReceived = jest.fn();
      await PushNotificationService.initialize({ onNotificationReceived });

      const mockNotification = { title: 'Test', body: 'Test body' };
      capturedHandler(mockNotification);

      expect(onNotificationReceived).toHaveBeenCalledWith(mockNotification);
    });

    test('should call notification opened callback', async () => {
      const Notifications = require('expo-notifications');
      Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
      Notifications.addNotificationReceivedListener.mockReturnValue({ remove: jest.fn() });

      let capturedHandler: any;
      Notifications.addNotificationResponseReceivedListener.mockImplementation((handler: any) => {
        capturedHandler = handler;
        return { remove: jest.fn() };
      });
      Notifications.addPushTokenListener.mockReturnValue({ remove: jest.fn() });

      const onNotificationOpened = jest.fn();
      await PushNotificationService.initialize({ onNotificationOpened });

      const mockNotification = { title: 'Test', body: 'Test body' };
      capturedHandler({ notification: mockNotification });

      expect(onNotificationOpened).toHaveBeenCalledWith(mockNotification);
    });

    test('should call token refresh callback', async () => {
      const Notifications = require('expo-notifications');
      Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
      Notifications.addNotificationReceivedListener.mockReturnValue({ remove: jest.fn() });
      Notifications.addNotificationResponseReceivedListener.mockReturnValue({ remove: jest.fn() });

      let capturedHandler: any;
      Notifications.addPushTokenListener.mockImplementation((handler: any) => {
        capturedHandler = handler;
        return { remove: jest.fn() };
      });

      const onTokenRefresh = jest.fn();
      await PushNotificationService.initialize({ onTokenRefresh });

      capturedHandler({ data: 'new-token' });

      expect(onTokenRefresh).toHaveBeenCalledWith('new-token');
    });
  });
});
