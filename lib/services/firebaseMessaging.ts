/**
 * Firebase Cloud Messaging (FCM) and Apple Push Notification Service (APNs) integration
 * This service works alongside the existing Expo notifications service
 */
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { registerPushToken } from './api';

// Type definitions for Firebase messaging
interface FirebaseMessaging {
  requestPermission(): Promise<number>;
  getToken(): Promise<string>;
  onTokenRefresh(listener: (token: string) => void): () => void;
  onMessage(listener: (message: any) => void): () => void;
  setBackgroundMessageHandler(handler: (message: any) => Promise<void>): void;
  getInitialNotification(): Promise<any>;
  onNotificationOpenedApp(listener: (message: any) => void): () => void;
  deleteToken(): Promise<void>;
  isSupported(): boolean;
  AuthorizationStatus: {
    AUTHORIZED: number;
    PROVISIONAL: number;
  };
}

// Lazy load Firebase messaging
let messaging: FirebaseMessaging | null = null;

async function getMessaging(): Promise<FirebaseMessaging | null> {
  if (messaging) return messaging;

  try {
    // Try to import Firebase messaging
    const firebaseMessaging = require('@react-native-firebase/messaging');
    messaging = firebaseMessaging.default;
    return messaging;
  } catch (error) {
    console.log('Firebase messaging not available:', error);
    return null;
  }
}

// Initialize Firebase messaging
export async function initializeFirebaseMessaging(): Promise<string | null> {
  try {
    // Check if running on physical device
    if (!Device.isDevice) {
      console.log('Firebase messaging requires a physical device');
      return null;
    }

    const firebaseMessaging = await getMessaging();
    if (!firebaseMessaging) {
      console.log('Firebase messaging not available');
      return null;
    }

    // Request permission for notifications
    const authStatus = await firebaseMessaging.requestPermission();
    const enabled =
      authStatus === firebaseMessaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === firebaseMessaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log('Firebase messaging permission denied');
      return null;
    }

    // Get the device token
    const token = await firebaseMessaging.getToken();
    console.log('Firebase token:', token);

    // Register token with backend
    if (token) {
      await registerPushToken(token);
    }

    return token;
  } catch (error) {
    console.error('Failed to initialize Firebase messaging:', error);
    return null;
  }
}

// Handle token refresh
export async function setupTokenRefreshListener(): Promise<(() => void) | null> {
  const firebaseMessaging = await getMessaging();
  if (!firebaseMessaging) return null;

  const unsubscribe = firebaseMessaging.onTokenRefresh(async (token: string) => {
    console.log('Firebase token refreshed:', token);
    // Register new token with backend
    await registerPushToken(token);
  });

  return unsubscribe;
}

// Handle foreground messages
export async function setupForegroundMessageHandler(): Promise<(() => void) | null> {
  const firebaseMessaging = await getMessaging();
  if (!firebaseMessaging) return null;

  const unsubscribe = firebaseMessaging.onMessage(async (remoteMessage: any) => {
    console.log('Foreground message received:', remoteMessage);

    // Handle the message - you can display a custom in-app notification
    // or update the UI accordingly
    if (remoteMessage.notification) {
      // Display notification using Expo notifications for consistency
      const { displayNotification } = require('./notifications');
      await displayNotification({
        title: remoteMessage.notification.title || 'Hearth',
        body: remoteMessage.notification.body || 'New message',
        data: remoteMessage.data || {},
      });
    }
  });

  return unsubscribe;
}

// Handle background messages (Android only - iOS handles this automatically)
export async function setupBackgroundMessageHandler(): Promise<void> {
  const firebaseMessaging = await getMessaging();
  if (!firebaseMessaging) return;

  firebaseMessaging.setBackgroundMessageHandler(async (remoteMessage: any) => {
    console.log('Background message received:', remoteMessage);

    // Process the message data
    // Update badge count, sync data, etc.
    if (remoteMessage.data?.badgeCount) {
      const { setBadgeCount } = require('./notifications');
      await setBadgeCount(parseInt(remoteMessage.data.badgeCount, 10));
    }
  });
}

// Get initial notification (when app is opened from notification)
export async function getInitialNotification(): Promise<any | null> {
  try {
    const firebaseMessaging = await getMessaging();
    if (!firebaseMessaging) return null;

    const remoteMessage = await firebaseMessaging.getInitialNotification();
    if (remoteMessage) {
      console.log('App opened from notification:', remoteMessage);
    }
    return remoteMessage;
  } catch (error) {
    console.error('Failed to get initial notification:', error);
    return null;
  }
}

// Handle notification tap when app is in background
export async function setupNotificationOpenedListener(): Promise<(() => void) | null> {
  const firebaseMessaging = await getMessaging();
  if (!firebaseMessaging) return null;

  const unsubscribe = firebaseMessaging.onNotificationOpenedApp((remoteMessage: any) => {
    console.log('Notification opened app from background:', remoteMessage);

    // Handle deep linking based on notification data
    handleNotificationNavigation(remoteMessage);
  });

  return unsubscribe;
}

// Handle navigation based on notification data
function handleNotificationNavigation(remoteMessage: any): void {
  const data = remoteMessage.data;

  if (!data) return;

  // Use require instead of dynamic import to avoid TypeScript issues
  const { router } = require('expo-router');

  if (data.type === 'message' || data.type === 'mention') {
    router.push(`/chat/${data.channelId}`);
  } else if (data.type === 'dm') {
    router.push(`/chat/${data.channelId}?isDm=true`);
  } else if (data.type === 'friend_request') {
    router.push('/(tabs)/friends');
  } else if (data.type === 'server_invite') {
    router.push('/(tabs)/invites');
  } else if (data.type === 'call') {
    router.push(`/voice/${data.serverId}`);
  } else {
    router.push('/(tabs)');
  }
}

// Check if Firebase messaging is supported
export async function isFirebaseMessagingSupported(): Promise<boolean> {
  try {
    const firebaseMessaging = await getMessaging();
    return firebaseMessaging ? true : false;
  } catch (error) {
    console.error('Failed to check Firebase messaging support:', error);
    return false;
  }
}

// Get current Firebase token
export async function getCurrentFirebaseToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;

    const firebaseMessaging = await getMessaging();
    if (!firebaseMessaging) return null;

    const token = await firebaseMessaging.getToken();
    return token;
  } catch (error) {
    console.error('Failed to get current Firebase token:', error);
    return null;
  }
}

// Delete Firebase token (for logout)
export async function deleteFirebaseToken(): Promise<void> {
  try {
    const firebaseMessaging = await getMessaging();
    if (!firebaseMessaging) return;

    await firebaseMessaging.deleteToken();
    console.log('Firebase token deleted');
  } catch (error) {
    console.error('Failed to delete Firebase token:', error);
  }
}