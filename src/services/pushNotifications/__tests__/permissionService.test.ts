/**
 * Permission Service Tests
 * Tests for notification permission handling
 */

import { Platform, Alert, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  NotificationPermissionStatus,
  getPermissionStatus,
  requestPermission,
  openSettings,
  areNotificationsEnabled,
  getPermissionDescription,
} from '../permissionService';

// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
  Alert: {
    alert: jest.fn(),
  },
  Linking: {
    openURL: jest.fn(),
    openSettings: jest.fn(),
  },
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
}));

// Mock console methods to suppress logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('Permission Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPermissionStatus', () => {
    it('should return GRANTED when permission is granted', async () => {
      const mockGetPermissions = jest.mocked(Notifications.getPermissionsAsync);
      mockGetPermissions.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
      });

      const result = await getPermissionStatus();
      expect(result).toBe(NotificationPermissionStatus.GRANTED);
    });

    it('should return DENIED when permission is denied and can ask again', async () => {
      const mockGetPermissions = jest.mocked(Notifications.getPermissionsAsync);
      mockGetPermissions.mockResolvedValue({
        status: 'denied',
        canAskAgain: true,
        granted: false,
      });

      const result = await getPermissionStatus();
      expect(result).toBe(NotificationPermissionStatus.DENIED);
    });

    it('should return BLOCKED when permission is denied and cannot ask again', async () => {
      const mockGetPermissions = jest.mocked(Notifications.getPermissionsAsync);
      mockGetPermissions.mockResolvedValue({
        status: 'denied',
        canAskAgain: false,
        granted: false,
      });

      const result = await getPermissionStatus();
      expect(result).toBe(NotificationPermissionStatus.BLOCKED);
    });

    it('should return UNDETERMINED when permission is undetermined', async () => {
      const mockGetPermissions = jest.mocked(Notifications.getPermissionsAsync);
      mockGetPermissions.mockResolvedValue({
        status: 'undetermined',
        canAskAgain: true,
        granted: false,
      });

      const result = await getPermissionStatus();
      expect(result).toBe(NotificationPermissionStatus.UNDETERMINED);
    });

    it('should return UNKNOWN when permission check fails', async () => {
      const mockGetPermissions = jest.mocked(Notifications.getPermissionsAsync);
      mockGetPermissions.mockRejectedValue(new Error('Permission check failed'));

      const result = await getPermissionStatus();
      expect(result).toBe(NotificationPermissionStatus.UNKNOWN);
    });

    it('should return UNKNOWN for unexpected permission status', async () => {
      const mockGetPermissions = jest.mocked(Notifications.getPermissionsAsync);
      mockGetPermissions.mockResolvedValue({
        status: 'unexpected' as any,
        canAskAgain: true,
        granted: false,
      });

      const result = await getPermissionStatus();
      expect(result).toBe(NotificationPermissionStatus.UNKNOWN);
    });
  });

  describe('requestPermission', () => {
    it('should return current status if already granted', async () => {
      const mockGetPermissions = jest.mocked(Notifications.getPermissionsAsync);
      mockGetPermissions.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
      });

      const result = await requestPermission();
      expect(result).toBe(NotificationPermissionStatus.GRANTED);
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('should show alert and return current status if blocked', async () => {
      const mockGetPermissions = jest.mocked(Notifications.getPermissionsAsync);
      mockGetPermissions.mockResolvedValue({
        status: 'denied',
        canAskAgain: false,
        granted: false,
      });

      const mockAlert = jest.mocked(Alert.alert);

      const result = await requestPermission();
      expect(result).toBe(NotificationPermissionStatus.BLOCKED);
      expect(mockAlert).toHaveBeenCalledWith(
        'Notifications Blocked',
        'Notification permissions have been permanently denied. Please enable them in your device settings.',
        expect.any(Array)
      );
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('should request permission when undetermined', async () => {
      const mockGetPermissions = jest.mocked(Notifications.getPermissionsAsync);
      mockGetPermissions.mockResolvedValue({
        status: 'undetermined',
        canAskAgain: true,
        granted: false,
      });

      const mockRequestPermissions = jest.mocked(Notifications.requestPermissionsAsync);
      mockRequestPermissions.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
      });

      const result = await requestPermission();
      expect(result).toBe(NotificationPermissionStatus.GRANTED);
      expect(mockRequestPermissions).toHaveBeenCalledWith({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowDisplayInCarPlay: true,
          allowCriticalAlerts: false,
          provideAppNotificationSettings: true,
          allowProvisional: false,
        },
        android: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
    });

    it('should return DENIED when permission request is denied', async () => {
      const mockGetPermissions = jest.mocked(Notifications.getPermissionsAsync);
      mockGetPermissions.mockResolvedValue({
        status: 'undetermined',
        canAskAgain: true,
        granted: false,
      });

      const mockRequestPermissions = jest.mocked(Notifications.requestPermissionsAsync);
      mockRequestPermissions.mockResolvedValue({
        status: 'denied',
        canAskAgain: true,
        granted: false,
      });

      const result = await requestPermission();
      expect(result).toBe(NotificationPermissionStatus.DENIED);
    });

    it('should return BLOCKED when permission request is denied with canAskAgain false', async () => {
      const mockGetPermissions = jest.mocked(Notifications.getPermissionsAsync);
      mockGetPermissions.mockResolvedValue({
        status: 'undetermined',
        canAskAgain: true,
        granted: false,
      });

      const mockRequestPermissions = jest.mocked(Notifications.requestPermissionsAsync);
      mockRequestPermissions.mockResolvedValue({
        status: 'denied',
        canAskAgain: false,
        granted: false,
      });

      const result = await requestPermission();
      expect(result).toBe(NotificationPermissionStatus.BLOCKED);
    });

    it('should return UNKNOWN when request fails', async () => {
      const mockGetPermissions = jest.mocked(Notifications.getPermissionsAsync);
      mockGetPermissions.mockResolvedValue({
        status: 'undetermined',
        canAskAgain: true,
        granted: false,
      });

      const mockRequestPermissions = jest.mocked(Notifications.requestPermissionsAsync);
      mockRequestPermissions.mockRejectedValue(new Error('Request failed'));

      const result = await requestPermission();
      expect(result).toBe(NotificationPermissionStatus.UNKNOWN);
    });
  });

  describe('openSettings', () => {
    beforeEach(() => {
      // Reset Platform.OS for each test
      Object.defineProperty(Platform, 'OS', {
        writable: true,
        value: 'ios',
      });
    });

    it('should open iOS app settings', async () => {
      Platform.OS = 'ios';
      const mockLinkingOpenURL = jest.mocked(Linking.openURL);

      await openSettings();
      expect(mockLinkingOpenURL).toHaveBeenCalledWith('app-settings:');
    });

    it('should open Android settings', async () => {
      Platform.OS = 'android';
      const mockLinkingOpenSettings = jest.mocked(Linking.openSettings);

      await openSettings();
      expect(mockLinkingOpenSettings).toHaveBeenCalled();
    });

    it('should handle iOS settings error', async () => {
      Platform.OS = 'ios';
      const mockLinkingOpenURL = jest.mocked(Linking.openURL);
      const mockAlert = jest.mocked(Alert.alert);
      mockLinkingOpenURL.mockRejectedValue(new Error('Failed to open'));

      await openSettings();
      expect(mockAlert).toHaveBeenCalledWith(
        'Settings Error',
        'Unable to open notification settings. Please open your device settings manually and navigate to notifications for this app.',
        [{ text: 'OK' }]
      );
    });

    it('should handle Android settings error', async () => {
      Platform.OS = 'android';
      const mockLinkingOpenSettings = jest.mocked(Linking.openSettings);
      const mockAlert = jest.mocked(Alert.alert);
      mockLinkingOpenSettings.mockRejectedValue(new Error('Failed to open'));

      await openSettings();
      expect(mockAlert).toHaveBeenCalledWith(
        'Settings Error',
        'Unable to open notification settings. Please open your device settings manually and navigate to notifications for this app.',
        [{ text: 'OK' }]
      );
    });

    it('should handle unsupported platform', async () => {
      Platform.OS = 'web' as any;
      const mockLinkingOpenSettings = jest.mocked(Linking.openSettings);

      await openSettings();
      expect(mockLinkingOpenSettings).toHaveBeenCalled();
    });
  });

  describe('areNotificationsEnabled', () => {
    it('should return true when permissions are granted', async () => {
      const mockGetPermissions = jest.mocked(Notifications.getPermissionsAsync);
      mockGetPermissions.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
      });

      const result = await areNotificationsEnabled();
      expect(result).toBe(true);
    });

    it('should return false when permissions are not granted', async () => {
      const mockGetPermissions = jest.mocked(Notifications.getPermissionsAsync);
      mockGetPermissions.mockResolvedValue({
        status: 'denied',
        canAskAgain: true,
        granted: false,
      });

      const result = await areNotificationsEnabled();
      expect(result).toBe(false);
    });
  });

  describe('getPermissionDescription', () => {
    it('should return correct description for GRANTED status', () => {
      const description = getPermissionDescription(NotificationPermissionStatus.GRANTED);
      expect(description).toBe('Notifications are enabled and you will receive alerts for messages, mentions, and important updates.');
    });

    it('should return correct description for DENIED status', () => {
      const description = getPermissionDescription(NotificationPermissionStatus.DENIED);
      expect(description).toBe('Notifications are currently disabled. You can enable them in this screen.');
    });

    it('should return correct description for UNDETERMINED status', () => {
      const description = getPermissionDescription(NotificationPermissionStatus.UNDETERMINED);
      expect(description).toBe('Notification permissions have not been set. Tap below to enable notifications.');
    });

    it('should return correct description for BLOCKED status', () => {
      const description = getPermissionDescription(NotificationPermissionStatus.BLOCKED);
      expect(description).toBe('Notifications are permanently disabled. You need to enable them in your device settings.');
    });

    it('should return correct description for UNKNOWN status', () => {
      const description = getPermissionDescription(NotificationPermissionStatus.UNKNOWN);
      expect(description).toBe('Unable to determine notification status. Please check your device settings.');
    });

    it('should return default description for unknown status', () => {
      const description = getPermissionDescription('invalid' as any);
      expect(description).toBe('Unknown notification status.');
    });
  });
});