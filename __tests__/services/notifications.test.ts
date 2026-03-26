/**
 * Tests for Push Notifications Service
 *
 * Tests the FCM/APNs integration and device registration functionality
 * for PN-001 implementation, plus PN-003 granular notification controls.
 */

// Mock expo modules - use var for jest.mock hoisting compatibility
var mockNotifications = {
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
};

var mockDevice = {
  isDevice: true,
  brand: 'Apple',
  modelName: 'iPhone 14',
  deviceName: 'John\'s iPhone',
  osVersion: '17.0',
};

var mockConstants = {
  sessionId: 'test-session-id',
  expoConfig: {
    version: '1.0.0',
    extra: {
      eas: {
        projectId: 'test-project-id',
      },
    },
  },
};

var mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

const mockApi = {
  registerDevice: jest.fn(),
  unregisterDevice: jest.fn(),
};

const mockPlatform = {
  OS: 'ios',
  Version: '17.0',
};

jest.mock('expo-notifications', () => mockNotifications);
jest.mock('expo-device', () => mockDevice);
jest.mock('expo-constants', () => mockConstants);
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('../../lib/services/api', () => mockApi);
jest.mock('react-native', () => ({ Platform: mockPlatform }));

// Import the service after mocking
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
  getChannelNotificationLevel,
  saveChannelOverride,
  removeChannelOverride,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_CATEGORY_ALERTS,
  type NotificationSettings,
  type ChannelNotificationOverride,
  type NotificationLevel,
} from '../../lib/services/notifications';

describe('Notifications Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerForPushNotifications', () => {
    it('should return null if not running on physical device', async () => {
      mockDevice.isDevice = false;

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

    it('should save server announcements and voice channel events toggles', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(DEFAULT_NOTIFICATION_SETTINGS));

      const updated = await saveNotificationSettings({
        serverAnnouncements: false,
        voiceChannelEvents: false,
      });

      expect(updated.serverAnnouncements).toBe(false);
      expect(updated.voiceChannelEvents).toBe(false);
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

    it('should respect day-of-week schedule', async () => {
      // Simulate a Monday at 23:00
      const monday = new Date('2026-03-30T23:00:00'); // Monday
      jest.spyOn(global, 'Date').mockImplementation(() => monday);

      const settings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        quietHoursEnabled: false,
        quietHoursSchedule: {
          enabled: true,
          startTime: '22:00',
          endTime: '07:00',
          days: [1, 5], // Monday and Friday only
        },
      };

      const handler = mockNotifications.setNotificationHandler.mock.calls[0]?.[0];

      if (handler && 'handleNotification' in handler) {
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(settings));

        const result = await handler.handleNotification({} as any);

        // Should be quiet (Monday is in the days list)
        expect(result.shouldShowAlert).toBe(false);
        expect(result.shouldPlaySound).toBe(false);
      }
    });
  });

  describe('per-channel notification overrides (PN-003)', () => {
    it('should return default level when no overrides exist', () => {
      const settings = { ...DEFAULT_NOTIFICATION_SETTINGS, channelOverrides: [] };
      const level = getChannelNotificationLevel(settings, 'channel-1', 'server-1');
      expect(level).toBe('default');
    });

    it('should return channel-specific override', () => {
      const settings: NotificationSettings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        channelOverrides: [
          { id: 'channel-1', type: 'channel', name: 'general', level: 'mentions' },
        ],
      };
      const level = getChannelNotificationLevel(settings, 'channel-1', 'server-1');
      expect(level).toBe('mentions');
    });

    it('should return server-level override when no channel override exists', () => {
      const settings: NotificationSettings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        channelOverrides: [
          { id: 'server-1', type: 'server', name: 'My Server', level: 'nothing' },
        ],
      };
      const level = getChannelNotificationLevel(settings, 'channel-1', 'server-1');
      expect(level).toBe('nothing');
    });

    it('should prefer channel override over server override', () => {
      const settings: NotificationSettings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        channelOverrides: [
          { id: 'server-1', type: 'server', name: 'My Server', level: 'nothing' },
          { id: 'channel-1', type: 'channel', name: 'general', level: 'all' },
        ],
      };
      const level = getChannelNotificationLevel(settings, 'channel-1', 'server-1');
      expect(level).toBe('all');
    });

    it('should fall through to server override when channel override is default', () => {
      const settings: NotificationSettings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        channelOverrides: [
          { id: 'server-1', type: 'server', name: 'My Server', level: 'mentions' },
          { id: 'channel-1', type: 'channel', name: 'general', level: 'default' },
        ],
      };
      const level = getChannelNotificationLevel(settings, 'channel-1', 'server-1');
      expect(level).toBe('mentions');
    });

    it('should save a new channel override', async () => {
      const existingSettings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        channelOverrides: [],
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingSettings));

      const override: ChannelNotificationOverride = {
        id: 'channel-1',
        type: 'channel',
        name: 'general',
        level: 'mentions',
      };

      const result = await saveChannelOverride(override);

      expect(result.channelOverrides).toHaveLength(1);
      expect(result.channelOverrides[0]).toEqual(override);
    });

    it('should update existing channel override', async () => {
      const existingSettings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        channelOverrides: [
          { id: 'channel-1', type: 'channel', name: 'general', level: 'mentions' },
        ],
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingSettings));

      const override: ChannelNotificationOverride = {
        id: 'channel-1',
        type: 'channel',
        name: 'general',
        level: 'nothing',
      };

      const result = await saveChannelOverride(override);

      expect(result.channelOverrides).toHaveLength(1);
      expect(result.channelOverrides[0].level).toBe('nothing');
    });

    it('should remove override when set to default', async () => {
      const existingSettings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        channelOverrides: [
          { id: 'channel-1', type: 'channel', name: 'general', level: 'mentions' },
        ],
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingSettings));

      const override: ChannelNotificationOverride = {
        id: 'channel-1',
        type: 'channel',
        name: 'general',
        level: 'default',
      };

      const result = await saveChannelOverride(override);

      expect(result.channelOverrides).toHaveLength(0);
    });

    it('should remove a channel override', async () => {
      const existingSettings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        channelOverrides: [
          { id: 'channel-1', type: 'channel', name: 'general', level: 'mentions' },
          { id: 'channel-2', type: 'channel', name: 'dev', level: 'nothing' },
        ],
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingSettings));

      const result = await removeChannelOverride('channel-1', 'channel');

      expect(result.channelOverrides).toHaveLength(1);
      expect(result.channelOverrides[0].id).toBe('channel-2');
    });
  });

  describe('per-category sound/vibration customization (PN-003)', () => {
    it('should have default category alerts', () => {
      expect(DEFAULT_CATEGORY_ALERTS).toBeDefined();
      expect(DEFAULT_CATEGORY_ALERTS.dms).toEqual({ sound: true, vibration: true });
      expect(DEFAULT_CATEGORY_ALERTS.mentions).toEqual({ sound: true, vibration: true });
      expect(DEFAULT_CATEGORY_ALERTS.messages).toEqual({ sound: true, vibration: false });
      expect(DEFAULT_CATEGORY_ALERTS.calls).toEqual({ sound: true, vibration: true });
      expect(DEFAULT_CATEGORY_ALERTS.serverActivity).toEqual({ sound: false, vibration: false });
      expect(DEFAULT_CATEGORY_ALERTS.serverAnnouncements).toEqual({ sound: true, vibration: false });
      expect(DEFAULT_CATEGORY_ALERTS.friendRequests).toEqual({ sound: true, vibration: false });
      expect(DEFAULT_CATEGORY_ALERTS.voiceChannelEvents).toEqual({ sound: true, vibration: false });
    });

    it('should save category alert customizations', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(DEFAULT_NOTIFICATION_SETTINGS));

      const customAlerts = {
        ...DEFAULT_CATEGORY_ALERTS,
        dms: { sound: false, vibration: true },
      };

      const result = await saveNotificationSettings({ categoryAlerts: customAlerts });

      expect(result.categoryAlerts.dms).toEqual({ sound: false, vibration: true });
    });

    it('should use category alerts in notification handler', async () => {
      const mockDateFn = (hour: number, minute: number = 0) => {
        const date = new Date();
        date.setHours(hour, minute, 0, 0);
        jest.spyOn(global, 'Date').mockImplementation(() => date);
      };
      mockDateFn(14, 0); // daytime, not quiet hours

      const settings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        enabled: true,
        sounds: true,
        vibration: true,
        categoryAlerts: {
          ...DEFAULT_CATEGORY_ALERTS,
          dms: { sound: false, vibration: false },
        },
      };

      const handler = mockNotifications.setNotificationHandler.mock.calls[0]?.[0];

      if (handler && 'handleNotification' in handler) {
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(settings));

        const result = await handler.handleNotification({
          request: {
            content: {
              data: { type: 'dm', channelId: 'ch-1', title: 'Test', body: 'Hello' },
            },
          },
        } as any);

        // DM category has sound: false, vibration: false
        expect(result.shouldPlaySound).toBe(false);
      }

      jest.restoreAllMocks();
    });

    it('should mute channel notifications when override is nothing', async () => {
      const mockDateFn = (hour: number, minute: number = 0) => {
        const date = new Date();
        date.setHours(hour, minute, 0, 0);
        jest.spyOn(global, 'Date').mockImplementation(() => date);
      };
      mockDateFn(14, 0);

      const settings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        enabled: true,
        channelOverrides: [
          { id: 'ch-muted', type: 'channel', name: 'muted-channel', level: 'nothing' },
        ],
      };

      const handler = mockNotifications.setNotificationHandler.mock.calls[0]?.[0];

      if (handler && 'handleNotification' in handler) {
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(settings));

        const result = await handler.handleNotification({
          request: {
            content: {
              data: { type: 'message', channelId: 'ch-muted', title: 'Test', body: 'Hello' },
            },
          },
        } as any);

        expect(result.shouldShowAlert).toBe(false);
        expect(result.shouldPlaySound).toBe(false);
        expect(result.shouldShowList).toBe(false);
      }

      jest.restoreAllMocks();
    });
  });

  describe('notification settings defaults (PN-003)', () => {
    it('should include all PN-003 fields in defaults', () => {
      expect(DEFAULT_NOTIFICATION_SETTINGS.serverAnnouncements).toBe(true);
      expect(DEFAULT_NOTIFICATION_SETTINGS.voiceChannelEvents).toBe(true);
      expect(DEFAULT_NOTIFICATION_SETTINGS.quietHoursSchedule).toBeDefined();
      expect(DEFAULT_NOTIFICATION_SETTINGS.quietHoursSchedule.enabled).toBe(false);
      expect(DEFAULT_NOTIFICATION_SETTINGS.quietHoursSchedule.startTime).toBe('22:00');
      expect(DEFAULT_NOTIFICATION_SETTINGS.quietHoursSchedule.endTime).toBe('07:00');
      expect(DEFAULT_NOTIFICATION_SETTINGS.quietHoursSchedule.days).toEqual([]);
      expect(DEFAULT_NOTIFICATION_SETTINGS.categoryAlerts).toBeDefined();
      expect(DEFAULT_NOTIFICATION_SETTINGS.channelOverrides).toEqual([]);
    });
  });
});
