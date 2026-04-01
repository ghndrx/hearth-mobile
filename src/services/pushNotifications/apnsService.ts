/**
 * APNs Service - iOS Push Notification Helpers
 *
 * With expo-notifications, APNs is handled automatically on iOS.
 * This module provides iOS-specific helper functions that work with
 * the Expo push notification service.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export interface APNsConfig {
  onTokenReceived?: (token: string) => void;
  onTokenRefresh?: (token: string) => void;
  onNotificationReceived?: (notification: Notifications.Notification) => void;
  onNotificationOpened?: (notification: Notifications.Notification) => void;
}

class APNsService {
  private config: APNsConfig = {};
  private isInitialized = false;

  /**
   * Initialize APNs service (Expo handles this automatically on iOS)
   */
  async initialize(config: APNsConfig): Promise<void> {
    if (Platform.OS !== 'ios') {
      console.log('APNs service is for iOS only');
      return;
    }

    this.config = config;

    try {
      const granted = await this.requestPermission();
      if (!granted) {
        console.warn('APNs: notification permission not granted');
        return;
      }

      this.isInitialized = true;
      console.log('APNs service (Expo) initialized successfully');
    } catch (error) {
      console.error('Failed to initialize APNs service:', error);
      throw error;
    }
  }

  /**
   * Request notification permissions (iOS-specific options)
   */
  async requestPermission(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();

      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowProvisional: false,
          },
        });
        return newStatus === 'granted';
      }

      return true;
    } catch (error) {
      console.error('Failed to request APNs permission:', error);
      return false;
    }
  }

  /**
   * Get native APNs device token
   * Returns the raw APNs token (not Expo push token)
   */
  async getDeviceToken(): Promise<string | null> {
    if (Platform.OS !== 'ios') {
      return null;
    }

    try {
      const { data: token } = await Notifications.getDevicePushTokenAsync();
      console.log('APNs device token obtained:', String(token).substring(0, 20) + '...');
      this.config.onTokenReceived?.(String(token));
      return String(token);
    } catch (error) {
      console.error('Failed to get APNs device token:', error);
      return null;
    }
  }

  /**
   * Set badge count on the app icon
   */
  async setBadgeCount(count: number): Promise<void> {
    if (Platform.OS !== 'ios') return;
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Get current badge count
   */
  async getBadgeCount(): Promise<number> {
    if (Platform.OS !== 'ios') return 0;
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Check if service is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }
}

export default new APNsService();
