/**
 * Cross-platform Push Notification Service for Expo
 * Unifies FCM (Android) and APNs (iOS) via expo-notifications
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import {
  registerRichNotificationCategories,
  extractReplyText,
  isReplyAction,
  parseNotificationReplyData,
  NotificationReplyData,
  NOTIFICATION_ACTION,
} from './richNotificationCategories';

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
  onNotificationReceived?: (notification: Notifications.Notification) => void;
  onNotificationOpened?: (notification: Notifications.Notification) => void;
  /**
   * Callback for inline notification replies
   * Called when user replies directly from the notification
   */
  onNotificationReply?: (replyData: NotificationReplyData, replyText: string) => void;
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
   */
  private setupTokenRefreshListener(): void {
    this.tokenRefreshSubscription = Notifications.addPushTokenListener(
      (tokenData) => {
        console.log('Push token refreshed:', tokenData.data.substring(0, 20) + '...');
        this.config.onTokenRefresh?.(tokenData.data);
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
   * Register device with backend API
   */
  async registerDeviceWithBackend(token: string): Promise<boolean> {
    const maxRetries = 3;
    let attempt = 1;

    while (attempt <= maxRetries) {
      try {
        console.log(`Device registration attempt ${attempt}/${maxRetries}`);

        const registration: DeviceRegistration = {
          token,
          platform: Platform.OS as 'ios' | 'android',
          deviceId: this.generateDeviceId(),
          appVersion: Constants.expoConfig?.version || '1.0.0',
        };

        // TODO: Replace with actual API endpoint
        // const response = await fetch('/api/notifications/register', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(registration),
        // });
        //
        // if (!response.ok) {
        //   throw new Error(`Registration failed: ${response.status}`);
        // }

        console.log('Device registration successful (simulated):', registration);
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
   * Initialize rich notification support (inline replies)
   * Call this after initialize() to enable rich notification categories
   * and reply handling on both iOS and Android.
   */
  async initializeRichNotifications(): Promise<boolean> {
    if (!this.isInitialized) {
      console.error('Push notification service must be initialized first');
      return false;
    }

    try {
      // Register rich notification categories with actions
      await registerRichNotificationCategories();

      // Set up notification response listener for replies
      this.setupRichNotificationResponseListener();

      console.log('Rich notification support initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize rich notifications:', error);
      return false;
    }
  }

  /**
   * Set up notification response listener for inline replies
   * Handles both reply actions and other action types
   */
  private setupRichNotificationResponseListener(): void {
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        console.log('Notification response received (rich):', response.actionIdentifier);

        // Check if this is a reply action
        if (isReplyAction(response)) {
          const replyText = extractReplyText(response);

          if (replyText && replyText.length > 0) {
            console.log('Inline reply received:', replyText);

            // Parse the original notification data
            const replyData = parseNotificationReplyData(response.notification);

            if (replyData) {
              // Add the reply text to the data
              const replyDataWithText: NotificationReplyData = {
                ...replyData,
                text: replyText,
              };

              // Call the reply callback if provided
              this.config.onNotificationReply?.(replyDataWithText, replyText);

              // Also call the general notification opened callback
              this.config.onNotificationOpened?.(response.notification);
            } else {
              console.warn('Could not parse notification reply data');
            }
          } else {
            console.warn('Reply action but no text provided');
          }
        } else {
          // Not a reply action, treat as regular notification opened
          this.config.onNotificationOpened?.(response.notification);
        }
      }
    );

    this.notificationListeners.push(responseSubscription);
  }

  /**
   * Handle a notification reply by sending the message via existing service.
   * This method can be used as the onNotificationReply callback or called directly.
   * 
   * @param replyData - Parsed notification data including conversation and sender info
   * @param replyText - The text the user typed as a reply
   * @returns Promise<boolean> - True if message was sent successfully
   */
  async handleNotificationReply(
    replyData: NotificationReplyData,
    replyText: string
  ): Promise<boolean> {
    try {
      console.log('Handling notification reply:', {
        conversationId: replyData.conversationId,
        senderId: replyData.senderId,
        textLength: replyText.length,
      });

      // TODO: Integrate with actual message service
      // For now, this is a placeholder that logs the reply
      // The actual implementation would call:
      // await messageService.sendMessage(replyData.conversationId, replyText);

      console.log('Notification reply would be sent to conversation:', replyData.conversationId);
      console.log('Reply text:', replyText);

      return true;
    } catch (error) {
      console.error('Failed to handle notification reply:', error);
      return false;
    }
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
