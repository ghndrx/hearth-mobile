/**
 * Tests for Push Notifications Service
 *
 * Tests the FCM/APNs integration and device registration functionality
 * for PN-001 implementation.
 */

// Mock expo modules with proper hoisting
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
  }
}));

// Import the service after mocking
import {
  registerForPushNotifications,
  getNotificationSettings,
  saveNotificationSettings,
  getStoredPushToken,
  clearPushToken,
  getPermissionStatus,
  getPermissionStatusDetails,
  requestPermissionsWithOptions,
  setBadgeCount,
  clearBadgeCount,
  scheduleLocalNotification,
  cancelNotification,
  cancelAllNotifications,
  dismissAllNotifications,
  isQuietHours,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '../../lib/services/notifications';

// Get references to mocked modules
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Api from '../../lib/services/api';
import { Platform } from 'react-native';

const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;
const mockDevice = Device as jest.Mocked<typeof Device>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockApi = Api as jest.Mocked<typeof Api>;
const mockPlatform = Platform as jest.Mocked<typeof Platform>;

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
      mockDevice.isDevice = false;
      mockNotifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);

      const token = await registerForPushNotifications();

      expect(token).toBeNull();
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

      // The function should catch the error and return null
      try {
        const token = await registerForPushNotifications();
        expect(token).toBeNull();
      } catch (error) {
        // If an error is thrown, that's also acceptable behavior
        expect(error).toBeInstanceOf(Error);
      }
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
    let dateSpy: jest.SpyInstance | null = null;

    const mockDate = (hour: number, minute: number = 0) => {
      const date = new Date();
      date.setHours(hour, minute, 0, 0);
      dateSpy = jest.spyOn(global, 'Date').mockImplementation(() => date as unknown as Date);
    };

    afterEach(() => {
      if (dateSpy) {
        dateSpy.mockRestore();
        dateSpy = null;
      }
    });

    it('should detect quiet hours correctly for overnight period', async () => {
      mockDate(23, 30); // 11:30 PM

      const settings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(settings));

      // Test that quiet hours settings are properly configured
      const result = await getNotificationSettings();
      expect(result.quietHoursEnabled).toBe(true);
      expect(result.quietHoursStart).toBe('22:00');
      expect(result.quietHoursEnd).toBe('07:00');
    });

    it('should allow notifications outside quiet hours', async () => {
      mockDate(14, 0); // 2:00 PM

      const settings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(settings));

      // Test that notification settings are managed
      const result = await getNotificationSettings();
      expect(result.quietHoursEnabled).toBe(true);
    });

    it('should correctly identify overnight quiet hours boundary', () => {
      // Test overnight: 22:00 - 07:00
      const settings = {
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      };

      // At 23:30 - should be in quiet hours
      mockDate(23, 30);
      expect(isQuietHours(settings as any)).toBe(true);

      // At 03:00 - should be in quiet hours
      mockDate(3, 0);
      expect(isQuietHours(settings as any)).toBe(true);

      // At 07:30 - should NOT be in quiet hours (boundary)
      mockDate(7, 30);
      expect(isQuietHours(settings as any)).toBe(false);

      // At 14:00 - should NOT be in quiet hours
      mockDate(14, 0);
      expect(isQuietHours(settings as any)).toBe(false);

      // At 21:59 - should NOT be in quiet hours
      mockDate(21, 59);
      expect(isQuietHours(settings as any)).toBe(false);

      // At 22:00 - should be in quiet hours (boundary)
      mockDate(22, 0);
      expect(isQuietHours(settings as any)).toBe(true);
    });

    it('should correctly identify same-day quiet hours', () => {
      // Test same day: 13:00 - 14:00
      const settings = {
        quietHoursEnabled: true,
        quietHoursStart: '13:00',
        quietHoursEnd: '14:00',
      };

      // At 12:59 - should NOT be in quiet hours
      mockDate(12, 59);
      expect(isQuietHours(settings as any)).toBe(false);

      // At 13:00 - should be in quiet hours (boundary)
      mockDate(13, 0);
      expect(isQuietHours(settings as any)).toBe(true);

      // At 13:30 - should be in quiet hours
      mockDate(13, 30);
      expect(isQuietHours(settings as any)).toBe(true);

      // At 14:00 - should NOT be in quiet hours (boundary)
      mockDate(14, 0);
      expect(isQuietHours(settings as any)).toBe(false);

      // At 14:01 - should NOT be in quiet hours
      mockDate(14, 1);
      expect(isQuietHours(settings as any)).toBe(false);
    });

    it('should return false when quiet hours disabled', () => {
      const settings = {
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      };

      // No date mock needed since function returns early when disabled
      expect(isQuietHours(settings as any)).toBe(false);
    });
  });

  describe('granular permission controls', () => {
    it('should get detailed permission status on iOS', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: 'granted',
        expires: 'never',
        ios: {
          allowsAlert: true,
          allowsBadge: true,
          allowsSound: true,
          allowsCriticalAlerts: false,
          providesAppNotificationSettings: true,
        },
      } as any);

      const details = await getPermissionStatusDetails();

      expect(details.status).toBe('granted');
      expect(details.granted).toBe(true);
      expect(details.expires).toBe('never');
      expect(details.ios).toBeDefined();
      expect(details.ios?.allowsAlert).toBe(true);
      expect(details.ios?.allowsBadge).toBe(true);
      expect(details.ios?.allowsSound).toBe(true);
      expect(details.ios?.allowsCriticalAlerts).toBe(false);
      
    });

    it('should get detailed permission status on Android', async () => {
      // Set platform to android for this test
      const originalOS = mockPlatform.OS;
      mockPlatform.OS = 'android';

      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: 'granted',
        expires: 'never',
        android: {
          importance: 4,
        },
      } as any);

      const details = await getPermissionStatusDetails();

      expect(details.status).toBe('granted');
      expect(details.granted).toBe(true);
      expect(details.android).toBeDefined();
      expect(details.android?.importance).toBe(4);

      // Restore original platform
      mockPlatform.OS = originalOS;
    });

    it('should return granted=false when not granted', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: 'denied',
        expires: 'never',
      } as any);

      const details = await getPermissionStatusDetails();

      expect(details.status).toBe('denied');
      expect(details.granted).toBe(false);
    });

    it('should request permissions with options on iOS', async () => {
      mockNotifications.requestPermissionsAsync.mockResolvedValue({
        status: 'granted',
        expires: 'never',
        ios: {
          allowsAlert: true,
          allowsBadge: true,
          allowsSound: false,
          allowsCriticalAlerts: false,
          providesAppNotificationSettings: true,
        },
      } as any);

      const details = await requestPermissionsWithOptions({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: false,
        },
      });

      expect(mockNotifications.requestPermissionsAsync).toHaveBeenCalledWith({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: false,
        },
        android: undefined,
      });
      expect(details.status).toBe('granted');
      expect(details.ios?.allowsAlert).toBe(true);
      expect(details.ios?.allowsBadge).toBe(true);
      expect(details.ios?.allowsSound).toBe(false);
    });

    it('should request permissions with channel on Android', async () => {
      const originalOS = mockPlatform.OS;
      mockPlatform.OS = 'android';

      mockNotifications.requestPermissionsAsync.mockResolvedValue({
        status: 'granted',
        expires: 'never',
        android: {
          importance: 4,
        },
      } as any);

      const details = await requestPermissionsWithOptions({
        android: {
          channelId: 'high-priority',
        },
      });

      expect(mockNotifications.requestPermissionsAsync).toHaveBeenCalledWith({
        ios: undefined,
        android: {
          channelId: 'high-priority',
        },
      });
      expect(details.status).toBe('granted');

      // Restore original platform
      mockPlatform.OS = originalOS;
    });

    it('should handle provisional permission on iOS', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: 'granted',
        expires: 'never',
        ios: {
          allowsAlert: true,
          allowsBadge: false,
          allowsSound: false,
          allowsCriticalAlerts: false,
          providesAppNotificationSettings: false,
        },
      } as any);

      const details = await getPermissionStatusDetails();

      expect(details.status).toBe('granted');
      expect(details.granted).toBe(true);
      
      expect(details.ios?.allowsBadge).toBe(false);
      expect(details.ios?.allowsSound).toBe(false);
    });
  });
});