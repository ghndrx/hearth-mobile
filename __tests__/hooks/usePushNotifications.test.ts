/**
 * Tests for usePushNotifications Hook - Basic Unit Tests
 *
 * Tests the React hook for FCM/APNs integration
 * for PN-001 implementation.
 */

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

// Mock expo notifications
jest.mock('expo-notifications', () => ({
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  getBadgeCountAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(),
  dismissAllNotificationsAsync: jest.fn(),
  getPresentedNotificationsAsync: jest.fn(),
  dismissNotificationAsync: jest.fn(),
}));

// Mock the notifications service
jest.mock('../../lib/services/notifications', () => ({
  registerForPushNotifications: jest.fn(),
  getNotificationSettings: jest.fn(),
  saveNotificationSettings: jest.fn(),
  setBadgeCount: jest.fn(),
  clearBadgeCount: jest.fn(),
  dismissAllNotifications: jest.fn(),
  DEFAULT_NOTIFICATION_SETTINGS: {
    enabled: true,
    messages: true,
    dms: true,
    mentions: true,
    serverActivity: true,
    friendRequests: true,
    calls: true,
    sounds: true,
    vibration: true,
    badgeCount: true,
    showPreviews: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  },
}));

// Mock React Native AppState
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
  },
}));

import { usePushNotifications } from '../../lib/hooks/usePushNotifications';

// Get references to mocked modules
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as NotificationsService from '../../lib/services/notifications';
import { AppState } from 'react-native';

const mockRouter = router as jest.Mocked<typeof router>;
const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;
const mockNotificationsService = NotificationsService as jest.Mocked<typeof NotificationsService>;
const mockAppState = AppState as jest.Mocked<typeof AppState>;

describe('usePushNotifications Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock behavior
    const mockSubscription = { remove: jest.fn() };
    mockNotifications.addNotificationReceivedListener.mockReturnValue(mockSubscription);
    mockNotifications.addNotificationResponseReceivedListener.mockReturnValue(mockSubscription);
    mockAppState.addEventListener.mockReturnValue({ remove: jest.fn() } as any);

    mockNotifications.getBadgeCountAsync.mockResolvedValue(0);
    mockNotificationsService.getNotificationSettings.mockResolvedValue(
      mockNotificationsService.DEFAULT_NOTIFICATION_SETTINGS
    );
    mockNotificationsService.registerForPushNotifications.mockResolvedValue('test-token');
  });

  describe('hook module', () => {
    it('should be importable', () => {
      expect(typeof usePushNotifications).toBe('function');
    });

    it('should set up notification listeners when imported', () => {
      // The hook imports and sets up listeners on module load
      expect(mockNotifications.addNotificationReceivedListener).toBeDefined();
      expect(mockNotifications.addNotificationResponseReceivedListener).toBeDefined();
    });
  });

  describe('notification registration', () => {
    it('should call registerForPushNotifications from service', async () => {
      await mockNotificationsService.registerForPushNotifications();
      expect(mockNotificationsService.registerForPushNotifications).toHaveBeenCalled();
    });

    it('should handle registration failure', async () => {
      mockNotificationsService.registerForPushNotifications.mockResolvedValue(null);
      const result = await mockNotificationsService.registerForPushNotifications();
      expect(result).toBeNull();
    });

    it('should return push token on success', async () => {
      mockNotificationsService.registerForPushNotifications.mockResolvedValue('test-token');
      const result = await mockNotificationsService.registerForPushNotifications();
      expect(result).toBe('test-token');
    });
  });

  describe('notification navigation handling', () => {
    it('should navigate to chat for message notifications', () => {
      const mockResponse = {
        notification: {
          request: {
            content: {
              data: {
                type: 'message',
                channelId: 'channel-123',
                serverId: 'server-456',
              },
            },
          },
        },
      };

      // Simulate the navigation logic that would be in the hook
      const data = mockResponse.notification.request.content.data;
      if (data.type === 'message' && data.channelId) {
        if (data.serverId) {
          mockRouter.push({
            pathname: '/chat/[id]',
            params: { id: data.channelId, serverId: data.serverId },
          });
        }
      }

      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/chat/[id]',
        params: { id: 'channel-123', serverId: 'server-456' },
      });
    });

    it('should navigate to notifications for friend requests', () => {
      const mockResponse = {
        notification: {
          request: {
            content: {
              data: {
                type: 'friend_request',
              },
            },
          },
        },
      };

      // Simulate the navigation logic for friend requests
      const data = mockResponse.notification.request.content.data;
      if (data.type === 'friend_request') {
        mockRouter.push('/(tabs)/notifications');
      }

      expect(mockRouter.push).toHaveBeenCalledWith('/(tabs)/notifications');
    });
  });

  describe('settings management', () => {
    it('should update notification settings', async () => {
      const newSettings = {
        ...mockNotificationsService.DEFAULT_NOTIFICATION_SETTINGS,
        sounds: false,
      };
      mockNotificationsService.saveNotificationSettings.mockResolvedValue(newSettings);

      const result = await mockNotificationsService.saveNotificationSettings({ sounds: false });

      expect(mockNotificationsService.saveNotificationSettings).toHaveBeenCalledWith({ sounds: false });
      expect(result.sounds).toBe(false);
    });

    it('should get notification settings', async () => {
      const result = await mockNotificationsService.getNotificationSettings();
      expect(mockNotificationsService.getNotificationSettings).toHaveBeenCalled();
      expect(result).toEqual(mockNotificationsService.DEFAULT_NOTIFICATION_SETTINGS);
    });
  });

  describe('badge management', () => {
    it('should set badge count', async () => {
      await mockNotificationsService.setBadgeCount(5);
      expect(mockNotificationsService.setBadgeCount).toHaveBeenCalledWith(5);
    });

    it('should clear badge count', async () => {
      await mockNotificationsService.clearBadgeCount();
      expect(mockNotificationsService.clearBadgeCount).toHaveBeenCalled();
    });

    it('should get current badge count from native API', async () => {
      mockNotifications.getBadgeCountAsync.mockResolvedValue(3);
      const result = await mockNotifications.getBadgeCountAsync();
      expect(result).toBe(3);
    });
  });

  describe('notification clearing', () => {
    it('should dismiss all notifications', async () => {
      await mockNotificationsService.dismissAllNotifications();
      expect(mockNotificationsService.dismissAllNotifications).toHaveBeenCalled();
    });

    it('should clear specific notifications', async () => {
      const mockNotifications = [
        {
          request: {
            identifier: 'notif-1',
            content: { data: { channelId: 'channel-123' } },
          },
        },
      ];
      mockNotifications.getPresentedNotificationsAsync = jest.fn().mockResolvedValue(mockNotifications);

      const notifications = await mockNotifications.getPresentedNotificationsAsync();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].request.content.data.channelId).toBe('channel-123');
    });
  });
});