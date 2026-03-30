/**
 * Tests for NotificationService (PN-001)
 */

// Mock dependencies before imports
const mockNotifications = {
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  getBadgeCountAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
  dismissAllNotificationsAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  AndroidImportance: {
    MAX: 5,
    HIGH: 4,
    DEFAULT: 3,
    LOW: 2,
  },
};

const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
};

jest.mock('expo-notifications', () => mockNotifications);
jest.mock('expo-device', () => ({
  isDevice: true,
  brand: 'Apple',
  modelName: 'iPhone 15',
  deviceName: 'Test iPhone',
  osVersion: '17.0',
}));
jest.mock('expo-constants', () => ({
  sessionId: 'test-session-id',
  expoConfig: {
    version: '0.1.0',
    extra: { eas: { projectId: 'test-project-id' } },
  },
}));
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '17.0' },
}));

// Mock the api module that lib/services/notifications depends on
jest.mock('../../lib/services/api', () => ({
  registerDevice: jest.fn().mockResolvedValue({
    id: 'reg-1',
    token: 'test-token',
    platform: 'ios',
    deviceId: 'test-session-id',
    registeredAt: Date.now(),
    lastActiveAt: Date.now(),
  }),
  unregisterDevice: jest.fn().mockResolvedValue(undefined),
}));

// Mock the notifications service to prevent setNotificationHandler from being called
jest.mock('../../lib/services/notifications', () => ({
  registerForPushNotifications: jest.fn().mockResolvedValue('test-token'),
  getNotificationSettings: jest.fn().mockResolvedValue({
    enabled: true,
    sounds: true,
    badgeCount: true,
    quietHoursEnabled: false,
  }),
  saveNotificationSettings: jest.fn(),
  getStoredPushToken: jest.fn(),
  clearPushToken: jest.fn(),
  getStoredDeviceRegistration: jest.fn(),
  getPermissionStatus: jest.fn().mockResolvedValue('granted'),
  setBadgeCount: jest.fn(),
  clearBadgeCount: jest.fn(),
}));

import { NotificationService } from '../../src/services/NotificationService';

beforeEach(() => {
  jest.clearAllMocks();
  // Reset the service's internal state between tests
  NotificationService.teardown();
});

describe('NotificationService', () => {
  describe('registerDevice', () => {
    it('returns push token on successful registration', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });
      mockNotifications.getExpoPushTokenAsync.mockResolvedValue({
        data: 'ExponentPushToken[test-token-123]',
      });

      const token = await NotificationService.registerDevice();

      expect(token).toBe('ExponentPushToken[test-token-123]');
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@hearth/push_token',
        'ExponentPushToken[test-token-123]'
      );
    });

    it('returns null when permission denied', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: 'denied',
      });
      mockNotifications.requestPermissionsAsync.mockResolvedValue({
        status: 'denied',
      });

      const token = await NotificationService.registerDevice();
      expect(token).toBeNull();
    });
  });

  describe('requestPermissions', () => {
    it('returns true when already granted', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });

      expect(await NotificationService.requestPermissions()).toBe(true);
      expect(mockNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('requests and returns result', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: 'undetermined',
      });
      mockNotifications.requestPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });

      expect(await NotificationService.requestPermissions()).toBe(true);
    });

    it('returns false when denied', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: 'undetermined',
      });
      mockNotifications.requestPermissionsAsync.mockResolvedValue({
        status: 'denied',
      });

      expect(await NotificationService.requestPermissions()).toBe(false);
    });
  });

  describe('settings', () => {
    it('returns defaults when no stored settings', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const settings = await NotificationService.getSettings();
      expect(settings.enabled).toBe(true);
      expect(settings.sounds).toBe(true);
      expect(settings.quietHoursEnabled).toBe(false);
    });

    it('merges stored with defaults', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({ sounds: false })
      );

      const settings = await NotificationService.getSettings();
      expect(settings.sounds).toBe(false);
      expect(settings.enabled).toBe(true);
    });

    it('persists settings updates', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      await NotificationService.saveSettings({ sounds: false });
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@hearth/notification_settings',
        expect.any(String)
      );
    });
  });

  describe('badge management', () => {
    it('setBadgeCount respects settings', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({ badgeCount: true })
      );

      await NotificationService.setBadgeCount(5);
      expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalledWith(5);
    });

    it('setBadgeCount skips when disabled', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({ badgeCount: false })
      );

      await NotificationService.setBadgeCount(5);
      expect(mockNotifications.setBadgeCountAsync).not.toHaveBeenCalled();
    });

    it('clearBadgeCount always clears', async () => {
      await NotificationService.clearBadgeCount();
      expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
    });
  });

  describe('initialize / teardown', () => {
    it('sets up token refresh listener on initialize', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });
      mockNotifications.getExpoPushTokenAsync.mockResolvedValue({
        data: 'ExponentPushToken[init-token]',
      });

      await NotificationService.initialize();
      expect(mockNotifications.addPushTokenListener).toHaveBeenCalled();
    });

    it('removes listener on teardown', async () => {
      const removeFn = jest.fn();
      mockNotifications.addPushTokenListener.mockReturnValue({
        remove: removeFn,
      });
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });
      mockNotifications.getExpoPushTokenAsync.mockResolvedValue({
        data: 'ExponentPushToken[init-token]',
      });

      await NotificationService.initialize();
      NotificationService.teardown();

      expect(removeFn).toHaveBeenCalled();
    });

    it('only initializes once', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });
      mockNotifications.getExpoPushTokenAsync.mockResolvedValue({
        data: 'ExponentPushToken[init-token]',
      });

      await NotificationService.initialize();
      await NotificationService.initialize();

      // Should only call addPushTokenListener once
      expect(mockNotifications.addPushTokenListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('unregisterDevice', () => {
    it('clears tokens and tears down', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({ deviceId: 'dev-1' })
      );

      await NotificationService.unregisterDevice();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        '@hearth/push_token'
      );
    });
  });
});
