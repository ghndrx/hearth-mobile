/**
 * Notification Permission Service
 * Handles notification permission status, requests, and settings navigation
 */

import { Platform, Linking, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

/**
 * Unified notification permission status across platforms
 */
export enum NotificationPermissionStatus {
  /** Permission has been granted */
  GRANTED = 'granted',
  /** Permission has been explicitly denied */
  DENIED = 'denied',
  /** Permission request has not been made yet */
  UNDETERMINED = 'undetermined',
  /** Permission was denied and user selected "Don't ask again" (Android) or permanently denied (iOS) */
  BLOCKED = 'blocked',
  /** Permission status could not be determined */
  UNKNOWN = 'unknown',
}

/**
 * Get current notification permission status
 * Maps platform-specific permission states to unified enum
 */
export const getPermissionStatus = async (): Promise<NotificationPermissionStatus> => {
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();

    switch (status) {
      case 'granted':
        return NotificationPermissionStatus.GRANTED;
      case 'denied':
        // On Android, canAskAgain=false means "Don't ask again" was selected
        // On iOS, canAskAgain=false means permission was permanently denied
        return canAskAgain === false
          ? NotificationPermissionStatus.BLOCKED
          : NotificationPermissionStatus.DENIED;
      case 'undetermined':
        return NotificationPermissionStatus.UNDETERMINED;
      default:
        console.warn('Unknown permission status:', status);
        return NotificationPermissionStatus.UNKNOWN;
    }
  } catch (error) {
    console.error('Failed to get notification permission status:', error);
    return NotificationPermissionStatus.UNKNOWN;
  }
};

/**
 * Request notification permissions from the user
 * Returns the new permission status after the request
 */
export const requestPermission = async (): Promise<NotificationPermissionStatus> => {
  try {
    const currentStatus = await getPermissionStatus();

    // If already granted, return current status
    if (currentStatus === NotificationPermissionStatus.GRANTED) {
      return currentStatus;
    }

    // If blocked, we cannot request again - direct user to settings
    if (currentStatus === NotificationPermissionStatus.BLOCKED) {
      Alert.alert(
        'Notifications Blocked',
        'Notification permissions have been permanently denied. Please enable them in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => openSettings() }
        ]
      );
      return currentStatus;
    }

    // Request permission
    const { status, canAskAgain } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowDisplayInCarPlay: true,
        allowCriticalAlerts: false,
        provideAppNotificationSettings: true,
        allowProvisional: false,
      },
      android: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    switch (status) {
      case 'granted':
        console.log('Notification permission granted');
        return NotificationPermissionStatus.GRANTED;
      case 'denied':
        console.log('Notification permission denied, canAskAgain:', canAskAgain);
        return canAskAgain === false
          ? NotificationPermissionStatus.BLOCKED
          : NotificationPermissionStatus.DENIED;
      default:
        console.warn('Unexpected permission status after request:', status);
        return NotificationPermissionStatus.UNKNOWN;
    }
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return NotificationPermissionStatus.UNKNOWN;
  }
};

/**
 * Open device notification settings for the app
 * Platform-specific implementation using React Native Linking
 */
export const openSettings = async (): Promise<void> => {
  try {
    if (Platform.OS === 'ios') {
      // On iOS, open the app's notification settings
      await Linking.openURL('app-settings:');
    } else if (Platform.OS === 'android') {
      // On Android, try to open app settings (will show general app settings)
      // User can navigate to notifications from there
      try {
        await Linking.openSettings();
      } catch (androidError) {
        console.warn('Failed to open Android settings:', androidError);
        throw androidError;
      }
    } else {
      console.warn('Platform not supported for opening notification settings:', Platform.OS);
      // Fallback to general settings for other platforms
      await Linking.openSettings();
    }
  } catch (error) {
    console.error('Failed to open notification settings:', error);

    // Show error to user
    Alert.alert(
      'Settings Error',
      'Unable to open notification settings. Please open your device settings manually and navigate to notifications for this app.',
      [{ text: 'OK' }]
    );
  }
};

/**
 * Check if notifications are fully enabled and configured
 * Returns true if permissions are granted AND notifications are properly set up
 */
export const areNotificationsEnabled = async (): Promise<boolean> => {
  const status = await getPermissionStatus();
  return status === NotificationPermissionStatus.GRANTED;
};

/**
 * Get a human-readable description of the current permission status
 */
export const getPermissionDescription = (status: NotificationPermissionStatus): string => {
  switch (status) {
    case NotificationPermissionStatus.GRANTED:
      return 'Notifications are enabled and you will receive alerts for messages, mentions, and important updates.';
    case NotificationPermissionStatus.DENIED:
      return 'Notifications are currently disabled. You can enable them in this screen.';
    case NotificationPermissionStatus.UNDETERMINED:
      return 'Notification permissions have not been set. Tap below to enable notifications.';
    case NotificationPermissionStatus.BLOCKED:
      return 'Notifications are permanently disabled. You need to enable them in your device settings.';
    case NotificationPermissionStatus.UNKNOWN:
      return 'Unable to determine notification status. Please check your device settings.';
    default:
      return 'Unknown notification status.';
  }
};