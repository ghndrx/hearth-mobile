/**
 * FCM Service - Expo Wrapper
 * 
 * With expo-notifications, FCM (Android) and APNs (iOS) are handled automatically.
 * The Expo push token infrastructure manages platform-specific details.
 * 
 * This module provides Android-specific helper functions that work with
 * the Expo push notification service.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export interface FCMConfig {
  onTokenReceived?: (token: string) => void;
  onTokenRefresh?: (token: string) => void;
  onMessageReceived?: (message: any) => void;
  onNotificationOpened?: (message: any) => void;
}

class FCMService {
  private config: FCMConfig = {};
  private isInitialized = false;

  /**
   * Initialize FCM service (Expo handles this automatically)
   */
  async initialize(config: FCMConfig): Promise<void> {
    if (Platform.OS !== 'android') {
      console.log('FCM service is for Android only, but using expo-notifications for cross-platform');
      return;
    }

    this.config = config;

    try {
      // Request permissions
      await this.requestPermission();

      // Set up notification channel
      await this.setupNotificationChannel();

      this.isInitialized = true;
      console.log('FCM service (Expo) initialized successfully');
    } catch (error) {
      console.error('Failed to initialize FCM service:', error);
      throw error;
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermission(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();

      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        return newStatus === 'granted';
      }

      return true;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  /**
   * Set up Android notification channel
   */
  private async setupNotificationChannel(): Promise<void> {
    await Notifications.setNotificationChannelAsync('fcm-high-priority', {
      name: 'High Priority Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      showBadge: true,
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('fcm-default', {
      name: 'Default Messages',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      showBadge: true,
      sound: 'default',
    });
  }

  /**
   * Get FCM token via Expo (simplified - Expo handles FCM internally for Android)
   */
  async registerDevice(): Promise<string | null> {
    try {
      const { data: token } = await Notifications.getExpoPushTokenAsync();
      console.log('FCM token obtained via Expo:', token.substring(0, 20) + '...');
      this.config.onTokenReceived?.(token);
      return token;
    } catch (error) {
      console.error('Failed to get FCM token:', error);
      return null;
    }
  }

  /**
   * Subscribe to a topic (via Expo - simplified implementation)
   * Note: Topic subscription requires Firebase Cloud Messaging directly.
   * For Expo, this is a no-op as Expo Push Notifications don't support topics directly.
   */
  async subscribeToTopic(topic: string): Promise<void> {
    console.log(`Topic subscription requested for: ${topic}`);
    console.log('Note: Expo Push Notifications does not support topic subscription.');
    console.log('For topic-based notifications, use Firebase Cloud Messaging directly.');
    // No-op for Expo - topics require FCM directly
  }

  /**
   * Unsubscribe from a topic
   */
  async unsubscribeFromTopic(topic: string): Promise<void> {
    console.log(`Topic unsubscription requested for: ${topic}`);
    console.log('Note: Expo Push Notifications does not support topic subscription.');
    // No-op for Expo
  }

  /**
   * Delete FCM token
   * Note: Expo doesn't expose direct token deletion; cleanup is handled by the service.
   */
  async deleteToken(): Promise<void> {
    console.log('Token cleanup handled by PushNotificationService');
  }

  /**
   * Check if service is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }
}

export default new FCMService();
