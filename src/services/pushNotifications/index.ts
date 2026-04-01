/**
 * Push Notifications Service Exports
 * Cross-platform unified API using expo-notifications
 * 
 * Handles both FCM (Android) and APNs (iOS) through Expo's infrastructure.
 */

export { default as PushNotificationService } from './PushNotificationService';
import PushNotificationService from './PushNotificationService';
export { default as fcmService } from './fcmService';
export { default as fcmServiceAndroid } from './fcmServiceAndroid';
export { FCM_CHANNELS } from './fcmServiceAndroid';

// Re-export types
export type {
  PushNotificationConfig,
  DeviceRegistration,
  NotificationListenerSubscription,
} from './PushNotificationService';

export type {
  FCMConfig,
} from './fcmService';

// Platform detection helpers
export const isAndroid = (): boolean => {
  const { Platform } = require('react-native');
  return Platform.OS === 'android';
};

export const isIOS = (): boolean => {
  const { Platform } = require('react-native');
  return Platform.OS === 'ios';
};

/**
 * Initialize and wire into auth flow
 * 
 * @param onTokenReceived - Callback when push token is received
 * @param onNotificationReceived - Callback when notification is received
 * @returns Promise<boolean> - True if initialization successful
 */
export const initializePushNotifications = async (
  onTokenReceived?: (token: string) => void,
  onNotificationReceived?: (notification: any) => void
): Promise<boolean> => {
  return await PushNotificationService.initialize({
    onTokenReceived: async (token: string) => {
      console.log('Push token received, registering with backend...');

      // Register with backend
      const success = await PushNotificationService.registerDeviceWithBackend(token);

      if (success) {
        console.log('Device successfully registered with backend');
      } else {
        console.warn('Failed to register device with backend, but token is available');
      }

      // Call custom handler
      onTokenReceived?.(token);
    },
    onTokenRefresh: async (token: string) => {
      console.log('Push token refreshed, updating backend registration...');

      // Update backend registration
      const success = await PushNotificationService.registerDeviceWithBackend(token);

      if (success) {
        console.log('Device registration updated with backend');
      } else {
        console.warn('Failed to update device registration with backend');
      }

      // Call custom handler
      onTokenReceived?.(token);
    },
    onNotificationReceived,
    onNotificationOpened: onNotificationReceived,
  });
};
