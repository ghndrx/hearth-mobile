/**
 * NotificationService (PN-001)
 *
 * Unified notification service class wrapping the FCM/APNs integration.
 * Delegates to lib/services/notifications for core functionality and adds:
 * - Class-based API for cleaner consumption
 * - Token refresh handling with automatic re-registration
 * - Lifecycle management (initialize/teardown)
 */

import * as Notifications from 'expo-notifications';
import {
  registerForPushNotifications,
  getNotificationSettings,
  saveNotificationSettings,
  getStoredPushToken,
  clearPushToken,
  getStoredDeviceRegistration,
  getPermissionStatus,
  setBadgeCount,
  clearBadgeCount,
  dismissAllNotifications,
  cancelAllNotifications,
  scheduleLocalNotification,
  cancelNotification,
  type NotificationSettings,
} from '../../lib/services/notifications';
import type { StoredDeviceRegistration } from '../types/notifications';

class NotificationServiceClass {
  private tokenRefreshSubscription: Notifications.EventSubscription | null =
    null;
  private initialized = false;

  /**
   * Initialize the notification service.
   * Registers for push notifications and sets up token refresh listening.
   * Call this once during app startup (after auth is available).
   */
  async initialize(): Promise<string | null> {
    if (this.initialized) {
      return this.getStoredToken();
    }

    const token = await this.registerDevice();

    // Listen for token refreshes (e.g., FCM token rotation)
    this.tokenRefreshSubscription = Notifications.addPushTokenListener(
      async (tokenData) => {
        const oldToken = await getStoredPushToken();
        if (oldToken !== tokenData.data) {
          // Re-register with the new token
          await registerForPushNotifications();
        }
      }
    );

    this.initialized = true;
    return token;
  }

  /**
   * Tear down the notification service.
   * Call on logout or app shutdown to clean up listeners.
   */
  teardown(): void {
    this.tokenRefreshSubscription?.remove();
    this.tokenRefreshSubscription = null;
    this.initialized = false;
  }

  /**
   * Register the device for push notifications.
   * Handles permission request, token retrieval (FCM on Android, APNs on iOS),
   * Android channel setup, and backend registration.
   */
  async registerDevice(): Promise<string | null> {
    return registerForPushNotifications();
  }

  /**
   * Request notification permissions from the user.
   */
  async requestPermissions(): Promise<boolean> {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Get the current permission status.
   */
  async getPermissionStatus(): Promise<Notifications.PermissionStatus> {
    return getPermissionStatus();
  }

  /**
   * Get the stored push token without triggering registration.
   */
  async getStoredToken(): Promise<string | null> {
    return getStoredPushToken();
  }

  /**
   * Unregister the device (e.g., on logout).
   * Clears the push token and backend registration.
   */
  async unregisterDevice(): Promise<void> {
    this.teardown();
    return clearPushToken();
  }

  /**
   * Get stored device registration details.
   */
  async getDeviceRegistration(): Promise<StoredDeviceRegistration | null> {
    return getStoredDeviceRegistration();
  }

  // --- Settings ---

  async getSettings(): Promise<NotificationSettings> {
    return getNotificationSettings();
  }

  async saveSettings(
    updates: Partial<NotificationSettings>
  ): Promise<NotificationSettings> {
    return saveNotificationSettings(updates);
  }

  // --- Badge ---

  async setBadgeCount(count: number): Promise<void> {
    return setBadgeCount(count);
  }

  async clearBadgeCount(): Promise<void> {
    return clearBadgeCount();
  }

  async getBadgeCount(): Promise<number> {
    return Notifications.getBadgeCountAsync();
  }

  // --- Notifications ---

  async dismissAll(): Promise<void> {
    return dismissAllNotifications();
  }

  async cancelAll(): Promise<void> {
    return cancelAllNotifications();
  }

  async scheduleLocal(
    title: string,
    body: string,
    data?: Record<string, unknown>,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string> {
    return scheduleLocalNotification(title, body, data, trigger);
  }

  async cancel(id: string): Promise<void> {
    return cancelNotification(id);
  }
}

/** Singleton instance of the notification service. */
export const NotificationService = new NotificationServiceClass();
export default NotificationService;
