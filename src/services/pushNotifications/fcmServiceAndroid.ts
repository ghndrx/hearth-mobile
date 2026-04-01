/**
 * FCM Service for Android - Native Integration
 * 
 * This service handles Android-specific Firebase Cloud Messaging (FCM) integration.
 * For Expo managed workflow, expo-notifications handles most of this automatically,
 * but native FCM service registration is required for background push handling.
 * 
 * After running `npx expo prebuild`, the Android project will be generated with
 * this service properly registered in AndroidManifest.xml.
 */

import { Platform, PackageManager } from 'react-native';
import { Notifications } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// FCM notification channel names for Android
export const FCM_CHANNELS = {
  HIGH_PRIORITY: 'fcm-high-priority',
  DEFAULT: 'fcm-default',
  MESSAGES: 'fcm-messages',
  SOCIAL: 'fcm-social',
  URGENT: 'fcm-urgent',
} as const;

// Device registration storage keys
const FCM_TOKEN_KEY = '@hearth/fcm_token';
const DEVICE_INFO_KEY = '@hearth/device_info';

export interface FCMTokenData {
  token: string;
  deviceId: string;
  platform: 'android';
  appVersion: string;
  registeredAt: number;
}

class FCMServiceAndroid {
  private isInitialized = false;

  /**
   * Initialize FCM for Android
   * Note: In Expo managed workflow, FCM initialization is handled by expo-notifications
   * This method sets up Android-specific notification channels
   */
  async initialize(): Promise<void> {
    if (Platform.OS !== 'android') {
      console.log('[FCMService] Not Android platform, skipping native FCM');
      return;
    }

    try {
      // Set up notification channels for Android 8+
      await this.setupNotificationChannels();
      
      this.isInitialized = true;
      console.log('[FCMService] Android FCM service initialized');
    } catch (error) {
      console.error('[FCMService] Failed to initialize Android FCM:', error);
      throw error;
    }
  }

  /**
   * Set up Android notification channels (required for Android 8+)
   * These channels categorize notifications by importance
   */
  private async setupNotificationChannels(): Promise<void> {
    // High priority channel for direct messages and mentions
    await Notifications.setNotificationChannelAsync(FCM_CHANNELS.HIGH_PRIORITY, {
      name: 'High Priority',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#5865F2',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    // Default channel for general notifications
    await Notifications.setNotificationChannelAsync(FCM_CHANNELS.DEFAULT, {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#5865F2',
      sound: 'default',
      showBadge: true,
    });

    // Messages channel
    await Notifications.setNotificationChannelAsync(FCM_CHANNELS.MESSAGES, {
      name: 'Messages',
      description: 'Channel and direct messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#5865F2',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    // Social channel for friend requests and social updates
    await Notifications.setNotificationChannelAsync(FCM_CHANNELS.SOCIAL, {
      name: 'Social',
      description: 'Friend requests and social notifications',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#57F287',
      sound: 'default',
      showBadge: true,
    });

    // Urgent channel for calls and critical notifications
    await Notifications.setNotificationChannelAsync(FCM_CHANNELS.URGENT, {
      name: 'Urgent',
      description: 'Calls and critical notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: '#ED4245',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
      bypassDnd: true,
    });
  }

  /**
   * Get FCM token via Expo
   * In managed workflow, expo-notifications handles FCM token retrieval
   */
  async getFCMToken(projectId?: string): Promise<string | null> {
    if (Platform.OS !== 'android') {
      return null;
    }

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });

      const token = tokenData.data;

      // Store token locally
      await AsyncStorage.setItem(FCM_TOKEN_KEY, token);

      console.log('[FCMService] FCM token obtained:', token.substring(0, 20) + '...');
      return token;
    } catch (error) {
      console.error('[FCMService] Failed to get FCM token:', error);
      return null;
    }
  }

  /**
   * Get stored FCM token
   */
  async getStoredFCMToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(FCM_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Clear FCM token from storage
   */
  async clearFCMToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(FCM_TOKEN_KEY);
      await AsyncStorage.removeItem(DEVICE_INFO_KEY);
    } catch (error) {
      console.error('[FCMService] Failed to clear FCM token:', error);
    }
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const fcmServiceAndroid = new FCMServiceAndroid();

export default fcmServiceAndroid;
