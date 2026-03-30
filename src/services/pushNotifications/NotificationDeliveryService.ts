/**
 * Notification Delivery Service (PN-002)
 *
 * Unified abstraction layer for push notification delivery pipeline.
 * Sits on top of PN-001's PushNotificationService and provides:
 * - getPushToken() / requestPermission()
 * - onNotificationReceived() / onNotificationOpened()
 * - Data vs notification payload handling
 * - Background/quit state initial notification handling
 * - Notification routing by type
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../../lib/services/api';
import {
  type NotificationType,
  type NotificationPayload,
  NOTIFICATION_CHANNELS,
} from '../../../lib/services/notifications';

// Storage keys
const TOKEN_STORAGE_KEY = '@hearth/delivery_push_token';
const TOKEN_SENT_KEY = '@hearth/token_sent_to_backend';

/**
 * Notification content after parsing - distinguishes data-only from display notifications
 */
export interface ParsedNotification {
  /** Unique identifier for this notification */
  id: string;
  /** The notification payload data */
  payload: NotificationPayload;
  /** Whether this is a data-only notification (no visible UI) */
  isDataOnly: boolean;
  /** Whether the notification was received while app was in foreground */
  isForeground: boolean;
  /** The raw expo notification object */
  raw: Notifications.Notification;
  /** Timestamp when the notification was received */
  receivedAt: number;
}

/**
 * Callback types for notification events
 */
export interface DeliveryCallbacks {
  /** Called when a notification is received (foreground or background) */
  onReceived?: (notification: ParsedNotification) => void;
  /** Called when user taps/opens a notification */
  onOpened?: (notification: ParsedNotification) => void;
  /** Called when push token changes */
  onTokenChanged?: (token: string) => void;
  /** Called when a data-only notification arrives (silent push) */
  onDataMessage?: (payload: NotificationPayload) => void;
}

/**
 * Permission state
 */
export type PermissionState = 'granted' | 'denied' | 'undetermined';

class NotificationDeliveryService {
  private callbacks: DeliveryCallbacks = {};
  private subscriptions: Notifications.Subscription[] = [];
  private isRunning = false;
  private currentToken: string | null = null;

  /**
   * Start the delivery pipeline with the given callbacks.
   * Sets up all listeners for foreground, background, and quit-state notifications.
   */
  async start(callbacks: DeliveryCallbacks = {}): Promise<void> {
    if (this.isRunning) {
      console.warn('NotificationDeliveryService is already running');
      return;
    }

    this.callbacks = callbacks;

    // Set up foreground notification handler
    this.setupForegroundHandler();

    // Set up notification received listener (foreground)
    const receivedSub = Notifications.addNotificationReceivedListener(
      (notification) => this.handleNotificationReceived(notification, true)
    );
    this.subscriptions.push(receivedSub);

    // Set up notification response listener (tap/open)
    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => this.handleNotificationOpened(response)
    );
    this.subscriptions.push(responseSub);

    // Set up token refresh listener
    const tokenSub = Notifications.addPushTokenListener((tokenData) => {
      this.handleTokenRefresh(tokenData.data);
    });
    this.subscriptions.push(tokenSub);

    // Check for notification that launched the app (quit state)
    await this.handleInitialNotification();

    this.isRunning = true;
    console.log('NotificationDeliveryService started');
  }

  /**
   * Stop the delivery pipeline and clean up all listeners.
   */
  stop(): void {
    this.subscriptions.forEach((sub) => sub.remove());
    this.subscriptions = [];
    this.callbacks = {};
    this.isRunning = false;
    console.log('NotificationDeliveryService stopped');
  }

  /**
   * Request notification permission from the user.
   * Returns the resulting permission state.
   */
  async requestPermission(): Promise<PermissionState> {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return 'denied';
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    if (existingStatus === 'granted') {
      return 'granted';
    }

    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowProvisional: false,
      },
    });

    return status === 'granted' ? 'granted' : 'denied';
  }

  /**
   * Get the current permission state without prompting.
   */
  async getPermissionState(): Promise<PermissionState> {
    const { status } = await Notifications.getPermissionsAsync();

    switch (status) {
      case 'granted':
        return 'granted';
      case 'denied':
        return 'denied';
      default:
        return 'undetermined';
    }
  }

  /**
   * Get the current push token. Requests permission if needed.
   * Sends the token to the backend if it hasn't been sent yet.
   */
  async getPushToken(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      return null;
    }

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const { data: token } = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      this.currentToken = token;
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);

      // Send to backend if changed
      await this.syncTokenWithBackend(token);

      return token;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  /**
   * Get the last known push token without requesting a new one.
   */
  async getStoredToken(): Promise<string | null> {
    if (this.currentToken) return this.currentToken;
    try {
      return await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Send the device token to the backend API.
   * Only sends if the token has changed since last sync.
   */
  async syncTokenWithBackend(token: string): Promise<boolean> {
    try {
      const lastSentToken = await AsyncStorage.getItem(TOKEN_SENT_KEY);
      if (lastSentToken === token) {
        return true; // Already synced
      }

      const deviceInfo = {
        token,
        platform: Platform.OS as 'ios' | 'android',
        deviceId: Constants.sessionId || `${Device.brand}-${Device.modelName}-${Date.now()}`,
        deviceName: Device.deviceName || `${Device.brand} ${Device.modelName}`,
        osVersion: Device.osVersion || Platform.Version.toString(),
        appVersion: Constants.expoConfig?.version || '1.0.0',
      };

      const { error } = await api.post('/devices/register', deviceInfo, true);

      if (error) {
        console.warn('Failed to sync token with backend:', error.message);
        return false;
      }

      await AsyncStorage.setItem(TOKEN_SENT_KEY, token);
      console.log('Push token synced with backend');
      return true;
    } catch (error) {
      console.warn('Failed to sync token with backend:', error);
      return false;
    }
  }

  /**
   * Unregister the device token from the backend (e.g., on logout).
   */
  async unregisterFromBackend(): Promise<void> {
    try {
      const token = await this.getStoredToken();
      if (token) {
        await api.delete(`/devices/token/${encodeURIComponent(token)}`, true);
        await AsyncStorage.removeItem(TOKEN_SENT_KEY);
        await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
        this.currentToken = null;
      }
    } catch (error) {
      console.warn('Failed to unregister from backend:', error);
    }
  }

  /**
   * Check if the delivery service is currently running.
   */
  isActive(): boolean {
    return this.isRunning;
  }

  // --- Private methods ---

  /**
   * Configure how foreground notifications are displayed.
   * Maps notification type to the appropriate Android channel.
   */
  private setupForegroundHandler(): void {
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const data = notification.request.content.data as Partial<NotificationPayload> | undefined;

        // Data-only notifications should not show UI
        if (data && !notification.request.content.title && !notification.request.content.body) {
          return {
            shouldShowAlert: false,
            shouldPlaySound: false,
            shouldSetBadge: false,
            shouldShowBanner: false,
            shouldShowList: false,
          };
        }

        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        };
      },
    });
  }

  /**
   * Handle a notification received while the app is in the foreground.
   */
  private handleNotificationReceived(
    notification: Notifications.Notification,
    isForeground: boolean
  ): void {
    const parsed = this.parseNotification(notification, isForeground);

    if (parsed.isDataOnly) {
      this.callbacks.onDataMessage?.(parsed.payload);
    } else {
      this.callbacks.onReceived?.(parsed);
    }
  }

  /**
   * Handle when the user taps/opens a notification.
   */
  private handleNotificationOpened(
    response: Notifications.NotificationResponse
  ): void {
    const parsed = this.parseNotification(response.notification, false);
    this.callbacks.onOpened?.(parsed);
  }

  /**
   * Check if the app was launched by tapping a notification (quit state).
   */
  private async handleInitialNotification(): Promise<void> {
    try {
      const response = await Notifications.getLastNotificationResponseAsync();
      if (response) {
        const parsed = this.parseNotification(response.notification, false);
        // Small delay to let the app finish initializing before navigating
        setTimeout(() => {
          this.callbacks.onOpened?.(parsed);
        }, 500);
      }
    } catch (error) {
      console.warn('Failed to get initial notification:', error);
    }
  }

  /**
   * Handle push token refresh (e.g., after app reinstall or token rotation).
   */
  private async handleTokenRefresh(newToken: string): Promise<void> {
    const previousToken = this.currentToken;
    this.currentToken = newToken;
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, newToken);

    if (previousToken !== newToken) {
      // Token changed - sync with backend
      await this.syncTokenWithBackend(newToken);
      this.callbacks.onTokenChanged?.(newToken);
    }
  }

  /**
   * Parse a raw Expo notification into our structured format.
   */
  private parseNotification(
    notification: Notifications.Notification,
    isForeground: boolean
  ): ParsedNotification {
    const content = notification.request.content;
    const data = (content.data || {}) as Partial<NotificationPayload>;

    const isDataOnly = !content.title && !content.body;

    const payload: NotificationPayload = {
      type: (data.type || 'system') as NotificationType,
      title: content.title || data.title || '',
      body: content.body || data.body || '',
      serverId: data.serverId,
      channelId: data.channelId,
      messageId: data.messageId,
      threadId: data.threadId,
      userId: data.userId,
      imageUrl: data.imageUrl,
    };

    return {
      id: notification.request.identifier,
      payload,
      isDataOnly,
      isForeground,
      raw: notification,
      receivedAt: notification.date,
    };
  }

  /**
   * Get the Android notification channel ID for a given notification type.
   */
  getChannelForType(type: NotificationType): string {
    switch (type) {
      case 'message':
      case 'reply':
        return NOTIFICATION_CHANNELS.MESSAGES;
      case 'dm':
        return NOTIFICATION_CHANNELS.DIRECT_MESSAGES;
      case 'mention':
        return NOTIFICATION_CHANNELS.MENTIONS;
      case 'call':
        return NOTIFICATION_CHANNELS.CALLS;
      case 'friend_request':
      case 'server_invite':
        return NOTIFICATION_CHANNELS.SOCIAL;
      case 'system':
        return NOTIFICATION_CHANNELS.SYSTEM;
      default:
        return NOTIFICATION_CHANNELS.DEFAULT;
    }
  }
}

export default new NotificationDeliveryService();
