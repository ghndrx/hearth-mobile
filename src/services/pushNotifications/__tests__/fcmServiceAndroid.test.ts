/**
 * Tests for FCM Service Android
 *
 * Tests the Android-specific FCM implementation for PN-001.
 */

// Mock expo modules
jest.mock('expo-notifications', () => ({
  setNotificationChannelAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  AndroidImportance: {
    MAX: 'max',
    HIGH: 'high',
    DEFAULT: 'default',
    LOW: 'low',
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
  },
}));

// Import after mocking
import { fcmServiceAndroid, FCM_CHANNELS } from '../../src/services/pushNotifications/fcmServiceAndroid';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('FCM Service Android', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should set up notification channels on Android', async () => {
      await fcmServiceAndroid.initialize();
      
      expect(mockNotifications.setNotificationChannelAsync).toHaveBeenCalledTimes(5);
    });

    it('should create high priority channel', async () => {
      await fcmServiceAndroid.initialize();
      
      expect(mockNotifications.setNotificationChannelAsync).toHaveBeenCalledWith(
        FCM_CHANNELS.HIGH_PRIORITY,
        expect.objectContaining({
          name: 'High Priority',
          importance: 'high',
        })
      );
    });

    it('should create messages channel', async () => {
      await fcmServiceAndroid.initialize();
      
      expect(mockNotifications.setNotificationChannelAsync).toHaveBeenCalledWith(
        FCM_CHANNELS.MESSAGES,
        expect.objectContaining({
          name: 'Messages',
          importance: 'high',
        })
      );
    });

    it('should mark service as initialized', async () => {
      await fcmServiceAndroid.initialize();
      
      expect(fcmServiceAndroid.isInitialized()).toBe(true);
    });
  });

  describe('getFCMToken', () => {
    it('should return null on iOS (not Android)', async () => {
      // Reset module to test Platform check
      jest.resetModules();
      
      jest.doMock('react-native', () => ({
        Platform: { OS: 'ios' },
      }));
      
      // Re-import to get fresh instance
      const { fcmServiceAndroid: fcmService } = require('../../src/services/pushNotifications/fcmServiceAndroid');
      const result = await fcmService.getFCMToken();
      
      expect(result).toBeNull();
    });
  });

  describe('getStoredFCMToken', () => {
    it('should return stored token from AsyncStorage', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('stored-fcm-token');
      
      const token = await fcmServiceAndroid.getStoredFCMToken();
      
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('@hearth/fcm_token');
      expect(token).toBe('stored-fcm-token');
    });

    it('should return null when no token stored', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      
      const token = await fcmServiceAndroid.getStoredFCMToken();
      
      expect(token).toBeNull();
    });

    it('should return null on AsyncStorage error', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      
      const token = await fcmServiceAndroid.getStoredFCMToken();
      
      expect(token).toBeNull();
    });
  });

  describe('clearFCMToken', () => {
    it('should remove token and device info from storage', async () => {
      await fcmServiceAndroid.clearFCMToken();
      
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@hearth/fcm_token');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@hearth/device_info');
    });
  });

  describe('FCM_CHANNELS', () => {
    it('should export correct channel constants', () => {
      expect(FCM_CHANNELS.HIGH_PRIORITY).toBe('fcm-high-priority');
      expect(FCM_CHANNELS.DEFAULT).toBe('fcm-default');
      expect(FCM_CHANNELS.MESSAGES).toBe('fcm-messages');
      expect(FCM_CHANNELS.SOCIAL).toBe('fcm-social');
      expect(FCM_CHANNELS.URGENT).toBe('fcm-urgent');
    });
  });
});
