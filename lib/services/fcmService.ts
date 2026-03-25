/**
 * FCM/APNs Native Token Service
 *
 * Provides native push token management for direct FCM (Android) and APNs (iOS)
 * integration. Works alongside Expo push tokens for maximum compatibility.
 *
 * - Android: Returns FCM registration token
 * - iOS: Returns APNs device token
 */

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { api } from "./api";

const NATIVE_TOKEN_KEY = "hearth_native_push_token";
const TOKEN_METADATA_KEY = "hearth_token_metadata";

export type TokenType = "fcm" | "apns" | "expo";

export interface NativeTokenInfo {
  token: string;
  type: TokenType;
  platform: "ios" | "android";
  obtainedAt: number;
}

export interface TokenMetadata {
  nativeToken: string | null;
  expoToken: string | null;
  tokenType: TokenType;
  platform: "ios" | "android";
  deviceId: string;
  deviceName: string;
  osVersion: string;
  appVersion: string;
  lastRefreshedAt: number;
  registeredWithBackend: boolean;
}

type TokenRefreshCallback = (tokenInfo: NativeTokenInfo) => void;

let tokenRefreshSubscription: Notifications.EventSubscription | null = null;
const tokenRefreshCallbacks: Set<TokenRefreshCallback> = new Set();

/**
 * Get the native device push token (FCM for Android, APNs for iOS).
 * This bypasses the Expo push service and gets the raw platform token.
 */
export async function getNativeDeviceToken(): Promise<NativeTokenInfo | null> {
  if (!Device.isDevice) {
    console.warn("[FCM] Native push tokens require a physical device");
    return null;
  }

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    console.warn("[FCM] Notification permission not granted");
    return null;
  }

  try {
    const devicePushToken = await Notifications.getDevicePushTokenAsync();
    const tokenType: TokenType = Platform.OS === "ios" ? "apns" : "fcm";
    const platform = Platform.OS === "ios" ? "ios" : ("android" as const);

    const tokenInfo: NativeTokenInfo = {
      token:
        typeof devicePushToken.data === "string"
          ? devicePushToken.data
          : JSON.stringify(devicePushToken.data),
      type: tokenType,
      platform,
      obtainedAt: Date.now(),
    };

    // Store securely
    await SecureStore.setItemAsync(NATIVE_TOKEN_KEY, JSON.stringify(tokenInfo));

    console.log(`[FCM] Native ${tokenType} token obtained`);
    return tokenInfo;
  } catch (error) {
    console.error("[FCM] Failed to get native device token:", error);
    return null;
  }
}

/**
 * Retrieve the stored native token without making a new request.
 */
export async function getStoredNativeToken(): Promise<NativeTokenInfo | null> {
  try {
    const stored = await SecureStore.getItemAsync(NATIVE_TOKEN_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Start listening for token refresh events.
 * FCM/APNs tokens can be rotated by the platform at any time.
 * When that happens, we need to re-register with the backend.
 */
export function startTokenRefreshListener(): void {
  if (tokenRefreshSubscription) {
    return; // Already listening
  }

  tokenRefreshSubscription =
    Notifications.addPushTokenListener(async (newToken) => {
      const tokenType: TokenType = Platform.OS === "ios" ? "apns" : "fcm";
      const platform = Platform.OS === "ios" ? "ios" : ("android" as const);

      const tokenInfo: NativeTokenInfo = {
        token:
          typeof newToken.data === "string"
            ? newToken.data
            : JSON.stringify(newToken.data),
        type: tokenType,
        platform,
        obtainedAt: Date.now(),
      };

      console.log(`[FCM] Token refreshed for ${tokenType}`);

      // Store the new token securely
      await SecureStore.setItemAsync(
        NATIVE_TOKEN_KEY,
        JSON.stringify(tokenInfo)
      );

      // Re-register with backend
      await registerNativeTokenWithBackend(tokenInfo);

      // Notify all registered callbacks
      for (const callback of tokenRefreshCallbacks) {
        try {
          callback(tokenInfo);
        } catch (err) {
          console.error("[FCM] Token refresh callback error:", err);
        }
      }
    });

  console.log("[FCM] Token refresh listener started");
}

/**
 * Stop listening for token refresh events.
 */
export function stopTokenRefreshListener(): void {
  if (tokenRefreshSubscription) {
    tokenRefreshSubscription.remove();
    tokenRefreshSubscription = null;
    console.log("[FCM] Token refresh listener stopped");
  }
}

/**
 * Register a callback to be called when the native token is refreshed.
 * Returns a cleanup function to unregister the callback.
 */
export function onTokenRefresh(callback: TokenRefreshCallback): () => void {
  tokenRefreshCallbacks.add(callback);
  return () => {
    tokenRefreshCallbacks.delete(callback);
  };
}

/**
 * Register the native token with the backend API.
 * Sends device metadata alongside the token for server-side push delivery.
 */
export async function registerNativeTokenWithBackend(
  tokenInfo: NativeTokenInfo
): Promise<boolean> {
  try {
    const deviceId = await getDeviceId();
    const deviceName =
      Device.deviceName || `${Device.brand || "Unknown"} ${Device.modelName || "Device"}`;
    const osVersion = Device.osVersion || Platform.Version.toString();
    const appVersion = Constants.expoConfig?.version || "1.0.0";

    const { error } = await api.post(
      "/devices/register",
      {
        token: tokenInfo.token,
        tokenType: tokenInfo.type,
        platform: tokenInfo.platform,
        deviceId,
        deviceName,
        osVersion,
        appVersion,
      },
      true // requireAuth
    );

    if (error) {
      console.error("[FCM] Backend registration failed:", error.message);
      await updateTokenMetadata({ registeredWithBackend: false });
      return false;
    }

    await updateTokenMetadata({
      nativeToken: tokenInfo.token,
      tokenType: tokenInfo.type,
      platform: tokenInfo.platform,
      deviceId,
      deviceName,
      osVersion,
      appVersion,
      lastRefreshedAt: Date.now(),
      registeredWithBackend: true,
    });

    console.log("[FCM] Registered with backend successfully");
    return true;
  } catch (error) {
    console.error("[FCM] Backend registration error:", error);
    return false;
  }
}

/**
 * Full registration flow: get native token, get Expo token, register both with backend.
 */
export async function registerDeviceTokens(): Promise<{
  nativeToken: NativeTokenInfo | null;
  expoToken: string | null;
}> {
  // Get native FCM/APNs token
  const nativeToken = await getNativeDeviceToken();

  // Get Expo push token
  let expoToken: string | null = null;
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const expoPushToken = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    expoToken = expoPushToken.data;
  } catch (error) {
    console.warn("[FCM] Failed to get Expo push token:", error);
  }

  // Register native token with backend
  if (nativeToken) {
    await registerNativeTokenWithBackend(nativeToken);
  }

  // Start listening for token refresh
  startTokenRefreshListener();

  return { nativeToken, expoToken };
}

/**
 * Unregister the device from the backend and clear stored tokens.
 * Should be called on logout.
 */
export async function unregisterDeviceTokens(): Promise<void> {
  try {
    const deviceId = await getDeviceId();

    // Unregister from backend
    const { error } = await api.delete(`/devices/${deviceId}`, true);
    if (error) {
      console.warn("[FCM] Backend unregistration failed:", error.message);
    }
  } catch (error) {
    console.warn("[FCM] Backend unregistration error:", error);
  }

  // Stop token refresh listener
  stopTokenRefreshListener();

  // Clear stored tokens
  await clearStoredTokens();
}

/**
 * Clear all stored token data.
 */
export async function clearStoredTokens(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(NATIVE_TOKEN_KEY);
    await SecureStore.deleteItemAsync(TOKEN_METADATA_KEY);
  } catch (error) {
    console.error("[FCM] Failed to clear stored tokens:", error);
  }
}

/**
 * Get token metadata for debugging/display.
 */
export async function getTokenMetadata(): Promise<TokenMetadata | null> {
  try {
    const stored = await SecureStore.getItemAsync(TOKEN_METADATA_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Generate a stable device identifier.
 */
async function getDeviceId(): Promise<string> {
  // Try to use a stored device ID for consistency across sessions
  const storedMeta = await getTokenMetadata();
  if (storedMeta?.deviceId) {
    return storedMeta.deviceId;
  }

  // Generate a new one based on device properties
  const brand = Device.brand || "unknown";
  const model = Device.modelName || "device";
  const installId =
    Constants.installationId || Constants.sessionId || String(Date.now());
  return `${brand}-${model}-${installId}`.toLowerCase().replace(/\s+/g, "-");
}

async function updateTokenMetadata(
  updates: Partial<TokenMetadata>
): Promise<void> {
  try {
    const existing = await getTokenMetadata();
    const updated = { ...existing, ...updates };
    await SecureStore.setItemAsync(TOKEN_METADATA_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("[FCM] Failed to update token metadata:", error);
  }
}
