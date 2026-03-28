/**
 * Tests for Push Notifications Service
 *
 * Tests the FCM/APNs integration and device registration functionality
 * for PN-001 implementation.
 */

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(),
  getBadgeCountAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  dismissAllNotificationsAsync: jest.fn(),
  AndroidImportance: {
    MAX: 'max',
    HIGH: 'high',
    DEFAULT: 'default',
    LOW: 'low',
  },
}));

jest.mock('expo-device', () => ({
  isDevice: true,
  brand: 'Apple',
  modelName: 'iPhone 14',
  deviceName: 'John\'s iPhone',
  osVersion: '17.0',
}));

jest.mock('expo-constants', () => ({
  sessionId: 'test-session-id',
  expoConfig: {
    version: '1.0.0',
    extra: {
      eas: {
        projectId: 'test-project-id',
      },
    },
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../../lib/services/api', () => ({
  registerDevice: jest.fn(),
  unregisterDevice: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: '17.0',
  },
}));

// Import modules first for typed mocking
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Api from '../../lib/services/api';
import { Platform } from 'react-native';

// Import the service after mocking - this triggers the setNotificationHandler call
import {
  registerForPushNotifications,
  getNotificationSettings,
  saveNotificationSettings,
  getStoredPushToken,
  clearPushToken,
  getPermissionStatus,
  setBadgeCount,
  clearBadgeCount,
  scheduleLocalNotification,
  cancelNotification,
  cancelAllNotifications,
  dismissAllNotifications,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '../../lib/services/notifications';

// Get mock instances
const mockNotifications = jest.mocked(Notifications);
const mockDevice = jest.mocked(Device);
const mockConstants = jest.mocked(Constants);
const mockAsyncStorage = jest.mocked(AsyncStorage);
const mockApi = jest.mocked(Api);
const mockPlatform = jest.mocked(Platform);

type NotificationSettings = {
  enabled: boolean;
  messages: boolean;
  dms: boolean;
  mentions: boolean;
  serverActivity: boolean;
  friendRequests: boolean;
  calls: boolean;
  sounds: boolean;
  vibration: boolean;
  badgeCount: boolean;
  showPreviews: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
};

describe('Notifications Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerForPushNotifications', () => {
    it('should return null if not running on physical device', async () => {
      // Mock Device.isDevice to return false for this test
      Object.defineProperty(Device, 'isDevice', {
        get: () => false,
        configurable: true,
      });

      // Set up basic mocks even though they shouldn't be called
      mockNotifications.getPermissionsAsync.mockResolvedValue({ status: 'denied' } as any);

      const token = await registerForPushNotifications();

      expect(token).toBeNull();

      // Reset for other tests
      Object.defineProperty(Device, 'isDevice', {
        get: () => true,
        configurable: true,
      });
    });

    it('should request permissions and get push token on physical device', async () => {
      mockDevice.isDevice = true;
      mockNotifications.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' } as any);
      mockNotifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
      mockNotifications.getExpoPushTokenAsync.mockResolvedValue({ data: 'test-push-token' } as any);
      mockApi.registerDevice.mockResolvedValue({
        id: 'device-123',
        token: 'test-push-token',
        platform: 'ios',
        deviceId: 'test-session-id',
        registeredAt: Date.now(),
        lastActiveAt: Date.now(),
      });

      const token = await registerForPushNotifications();

      expect(mockNotifications.getPermissionsAsync).toHaveBeenCalled();
      expect(mockNotifications.requestPermissionsAsync).toHaveBeenCalled();
      expect(mockNotifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
        projectId: 'test-project-id',
      });
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('@hearth/push_token', 'test-push-token');
      expect(mockApi.registerDevice).toHaveBeenCalledWith({
        token: 'test-push-token',
        platform: 'ios',
        deviceId: expect.any(String),
        deviceName: 'John\'s iPhone',
        osVersion: '17.0',
        appVersion: '1.0.0',
      });
      expect(token).toBe('test-push-token');
    });

    it('should return null if permission denied', async () => {
      mockDevice.isDevice = true;
      mockNotifications.getPermissionsAsync.mockResolvedValue({ status: 'denied' } as any);
      mockNotifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' } as any);

      const token = await registerForPushNotifications();

      expect(token).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockDevice.isDevice = true;
      mockNotifications.getPermissionsAsync.mockRejectedValue(new Error('Permission error'));

      const token = await registerForPushNotifications();

      expect(token).toBeNull();
    });
  });

  describe('notification settings', () => {
    it('should return default settings if none stored', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const settings = await getNotificationSettings();

      expect(settings).toEqual(DEFAULT_NOTIFICATION_SETTINGS);
    });

    it('should merge stored settings with defaults', async () => {
      const storedSettings = {
        enabled: false,
        sounds: false,
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedSettings));

      const settings = await getNotificationSettings();

      expect(settings).toEqual({
        ...DEFAULT_NOTIFICATION_SETTINGS,
        enabled: false,
        sounds: false,
      });
    });

    it('should save settings correctly', async () => {
      const currentSettings = DEFAULT_NOTIFICATION_SETTINGS;
      const updates: Partial<NotificationSettings> = {
        sounds: false,
        quietHoursEnabled: true,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(currentSettings));

      const newSettings = await saveNotificationSettings(updates);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@hearth/notification_settings',
        JSON.stringify({ ...currentSettings, ...updates })
      );
      expect(newSettings).toEqual({ ...currentSettings, ...updates });
    });
  });

  describe('push token management', () => {
    it('should get stored push token', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('stored-token');

      const token = await getStoredPushToken();

      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('@hearth/push_token');
      expect(token).toBe('stored-token');
    });

    it('should clear push token and unregister device', async () => {
      const storedRegistration = {
        id: 'device-123',
        deviceId: 'test-device',
        platform: 'ios',
        registeredAt: Date.now(),
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedRegistration));

      await clearPushToken();

      expect(mockApi.unregisterDevice).toHaveBeenCalledWith('test-device');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@hearth/push_token');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@hearth/device_registration');
    });
  });

  describe('permission management', () => {
    it('should get permission status', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);

      const status = await getPermissionStatus();

      expect(status).toBe('granted');
    });
  });

  describe('badge management', () => {
    it('should set badge count when enabled in settings', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        ...DEFAULT_NOTIFICATION_SETTINGS,
        badgeCount: true,
      }));

      await setBadgeCount(5);

      expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalledWith(5);
    });

    it('should not set badge count when disabled in settings', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        ...DEFAULT_NOTIFICATION_SETTINGS,
        badgeCount: false,
      }));

      await setBadgeCount(5);

      expect(mockNotifications.setBadgeCountAsync).not.toHaveBeenCalled();
    });

    it('should clear badge count', async () => {
      await clearBadgeCount();

      expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
    });
  });

  describe('local notifications', () => {
    it('should schedule local notification', async () => {
      mockNotifications.scheduleNotificationAsync.mockResolvedValue('notification-id');

      const id = await scheduleLocalNotification(
        'Test Title',
        'Test Body',
        { customData: 'test' }
      );

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Test Title',
          body: 'Test Body',
          data: { customData: 'test' },
          sound: true,
        },
        trigger: null,
      });
      expect(id).toBe('notification-id');
    });

    it('should cancel notification', async () => {
      await cancelNotification('test-id');

      expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('test-id');
    });

    it('should cancel all notifications', async () => {
      await cancelAllNotifications();

      expect(mockNotifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    });

    it('should dismiss all notifications', async () => {
      await dismissAllNotifications();

      expect(mockNotifications.dismissAllNotificationsAsync).toHaveBeenCalled();
    });
  });

  describe('quiet hours functionality', () => {
    // Mock the current date/time for consistent testing
    const mockDate = (hour: number, minute: number = 0) => {
      const date = new Date();
      date.setHours(hour, minute, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => date);
    };

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should detect quiet hours correctly for overnight period', async () => {
      mockDate(23, 30); // 11:30 PM

      const settings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      };

      // Access the isQuietHours function indirectly through notification handler
      const handler = mockNotifications.setNotificationHandler.mock.calls[0]?.[0];
      expect(handler).toBeDefined();

      if (handler && 'handleNotification' in handler) {
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(settings));

        const result = await handler.handleNotification({} as any);

        expect(result).toEqual({
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: false,
          shouldShowList: true,
        });
      }
    });

    it('should allow notifications outside quiet hours', async () => {
      mockDate(14, 0); // 2:00 PM

      const settings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      };

      const handler = mockNotifications.setNotificationHandler.mock.calls[0]?.[0];

      if (handler && 'handleNotification' in handler) {
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(settings));

        const result = await handler.handleNotification({} as any);

        expect(result).toEqual({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        });
      }
    });
  });
});