/**
 * Cross-platform Push Notification Service for Expo
 * Unifies FCM (Android) and APNs (iOS) via expo-notifications
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { registerDevice } from '../../../lib/services/api';

// Configure notification handler for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushNotificationConfig {
  onTokenReceived?: (token: string) => void;
  onTokenRefresh?: (token: string) => void;
  onNativeTokenReceived?: (token: string) => void;
  onNotificationReceived?: (notification: Notifications.Notification) => void;
  onNotificationOpened?: (notification: Notifications.Notification) => void;
  /** Automatically re-register with backend when token refreshes */
  autoReregisterOnRefresh?: boolean;
}

export interface DeviceRegistration {
  token: string;
  platform: 'ios' | 'android';
  deviceId: string;
  appVersion: string;
}

export interface NotificationListenerSubscription {
  remove: () => void;
}

class PushNotificationService {
  private config: PushNotificationConfig = {};
  private isInitialized = false;
  private notificationListeners: Notifications.Subscription[] = [];
  private tokenRefreshSubscription?: Notifications.Subscription;

  /**
   * Initialize push notification service based on platform
   */
  async initialize(config: PushNotificationConfig = {}): Promise<boolean> {
    this.config = config;

    try {
      // Request permissions first
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permissions not granted');
        return false;
      }

      // Get Expo push token
      if (Platform.OS === 'android') {
        await this.setupAndroidChannel();
      }

      // Set up notification listeners
      this.setupNotificationListeners();

      // Set up token refresh listener
      this.setupTokenRefreshListener();

      this.isInitialized = true;
      console.log(`Push notification service initialized for ${Platform.OS}`);
      return true;
    } catch (error) {
      console.error('Failed to initialize push notification service:', error);
      return false;
    }
  }

  /**
   * Set up Android notification channel (required for Android 8+)
   */
  private async setupAndroidChannel(): Promise<void> {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      showBadge: true,
    });

    // Create a separate channel for high-priority notifications
    await Notifications.setNotificationChannelAsync('high-priority', {
      name: 'High Priority',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      showBadge: true,
    });
  }

  /**
   * Set up foreground notification listeners
   */
  private setupNotificationListeners(): void {
    // Handle notifications received while app is foregrounded
    const foregroundSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Foreground notification received:', notification);
        this.config.onNotificationReceived?.(notification);
      }
    );
    this.notificationListeners.push(foregroundSubscription);

    // Handle notification tap when app is in foreground
    const foregroundResponseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response received:', response);
        this.config.onNotificationOpened?.(response.notification);
      }
    );
    this.notificationListeners.push(foregroundResponseSubscription);
  }

  /**
   * Set up token refresh listener
   * Automatically re-registers with backend when token changes
   */
  private setupTokenRefreshListener(): void {
    this.tokenRefreshSubscription = Notifications.addPushTokenListener(
      async (tokenData) => {
        const token = tokenData.data;
        console.log('Push token refreshed:', String(token).substring(0, 20) + '...');
        this.config.onTokenRefresh?.(String(token));

        // Auto re-register with backend if configured
        if (this.config.autoReregisterOnRefresh !== false) {
          console.log('Auto re-registering device with backend after token refresh...');
          const success = await this.registerDeviceWithBackend(String(token));
          if (success) {
            console.log('Device re-registration after token refresh successful');
          } else {
            console.warn('Device re-registration after token refresh failed');
          }
        }
      }
    );
  }

  /**
   * Get device push token
   * Returns Expo push token which works for both FCM (Android) and APNs (iOS)
   */
  async getDeviceToken(): Promise<string | null> {
    if (!this.isInitialized) {
      console.error('Push notification service not initialized');
      return null;
    }

    try {
      const { data: token } = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      if (token) {
        console.log('Device push token obtained:', token.substring(0, 20) + '...');
        this.config.onTokenReceived?.(token);
        return token;
      }

      return null;
    } catch (error) {
      console.error('Failed to get device push token:', error);
      return null;
    }
  }

  /**
   * Get native device push token (FCM token on Android, APNs token on iOS)
   * Use this when the backend communicates directly with FCM/APNs
   * rather than through the Expo push notification service.
   */
  async getNativeDeviceToken(): Promise<string | null> {
    if (!this.isInitialized) {
      console.error('Push notification service not initialized');
      return null;
    }

    try {
      const { data: token } = await Notifications.getDevicePushTokenAsync();
      console.log(`Native ${Platform.OS} token obtained:`, String(token).substring(0, 20) + '...');
      this.config.onNativeTokenReceived?.(String(token));
      return String(token);
    } catch (error) {
      console.error('Failed to get native device push token:', error);
      return null;
    }
  }

  /**
   * Register device with backend API
   */
  async registerDeviceWithBackend(token: string): Promise<boolean> {
    const maxRetries = 3;
    let attempt = 1;

    while (attempt <= maxRetries) {
      try {
        console.log(`Device registration attempt ${attempt}/${maxRetries}`);

        // Gather device information
        const deviceId = Constants.sessionId || this.generateDeviceId();
        const platform = Platform.OS as 'ios' | 'android';
        const deviceName = Device.deviceName || `${Device.brand} ${Device.modelName}`;
        const osVersion = Device.osVersion || Platform.Version.toString();
        const appVersion = Constants.expoConfig?.version || '1.0.0';

        const registration = {
          token,
          platform,
          deviceId,
          deviceName,
          osVersion,
          appVersion,
        };

        // Register with backend API
        const response = await registerDevice(registration);

        console.log('Device registration successful:', response);
        return true;
      } catch (error) {
        console.error(`Device registration attempt ${attempt} failed:`, error);

        if (attempt === maxRetries) {
          console.error('Device registration failed after all retries');
          return false;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`Retrying device registration in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));

        attempt++;
      }
    }

    return false;
  }

  /**
   * Dismiss all notifications
   */
  async dismissAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }

  /**
   * Dismiss a specific notification by its identifier
   */
  async dismissNotification(notificationId: string): Promise<void> {
    await Notifications.dismissNotificationAsync(notificationId);
  }

  /**
   * Get all delivered notifications
   */
  async getDeliveredNotifications(): Promise<Notifications.Notification[]> {
    const notifications = await Notifications.getPresentedNotificationsAsync();
    return notifications;
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    trigger?: Notifications.NotificationTriggerInput | null
  ): Promise<string> {
    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: trigger ?? null,
    });
    return id;
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelScheduledNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllScheduledNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Check if service is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get current platform
   */
  getPlatform(): 'ios' | 'android' | 'unknown' {
    return Platform.OS === 'ios' || Platform.OS === 'android'
      ? Platform.OS
      : 'unknown';
  }

  /**
   * Clean up service and subscriptions
   */
  async cleanup(): Promise<void> {
    try {
      // Remove notification listeners
      this.notificationListeners.forEach((listener) => listener.remove());
      this.notificationListeners = [];

      // Remove token refresh subscription
      this.tokenRefreshSubscription?.remove();
      this.tokenRefreshSubscription = undefined;

      this.isInitialized = false;
      console.log('Push notification service cleaned up');
    } catch (error) {
      console.error('Failed to cleanup push notification service:', error);
    }
  }

  /**
   * Generate a unique device ID
   */
  private generateDeviceId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `${Platform.OS}-${timestamp}-${random}`;
  }
}

export default new PushNotificationService();
