/**
 * Token Refresh Manager (PN-006)
 * Handles push notification token lifecycle: refresh detection,
 * automatic re-registration with backend, and token validation.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { registerDevice } from './api';

const TOKEN_KEY = '@hearth/push_token';
const TOKEN_METADATA_KEY = '@hearth/push_token_metadata';
const DEVICE_REGISTRATION_KEY = '@hearth/device_registration';

export interface TokenMetadata {
  token: string;
  obtainedAt: number;
  lastValidatedAt: number;
  lastRefreshedAt?: number;
  refreshCount: number;
  platform: 'ios' | 'android';
  registeredWithBackend: boolean;
}

export interface TokenRefreshEvent {
  oldToken: string | null;
  newToken: string;
  timestamp: number;
  reason: 'initial' | 'refresh' | 'expired' | 'manual';
}

type TokenRefreshCallback = (event: TokenRefreshEvent) => void;

const TOKEN_VALIDATION_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const MAX_REGISTRATION_RETRIES = 5;
const REGISTRATION_BASE_BACKOFF_MS = 2000;

class TokenRefreshManager {
  private static instance: TokenRefreshManager;
  private tokenMetadata: TokenMetadata | null = null;
  private refreshSubscription: Notifications.Subscription | null = null;
  private validationInterval: NodeJS.Timeout | null = null;
  private refreshCallbacks: TokenRefreshCallback[] = [];
  private isRegistering = false;

  private constructor() {}

  static getInstance(): TokenRefreshManager {
    if (!TokenRefreshManager.instance) {
      TokenRefreshManager.instance = new TokenRefreshManager();
    }
    return TokenRefreshManager.instance;
  }

  /**
   * Initialize the token refresh manager.
   * Should be called after push notification permissions are granted.
   */
  async initialize(): Promise<void> {
    await this.loadTokenMetadata();
    this.setupTokenRefreshListener();
    this.startTokenValidation();
  }

  private async loadTokenMetadata(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(TOKEN_METADATA_KEY);
      if (data) {
        this.tokenMetadata = JSON.parse(data);
      }
    } catch (error) {
      console.warn('Failed to load token metadata:', error);
    }
  }

  private async saveTokenMetadata(): Promise<void> {
    if (!this.tokenMetadata) return;
    try {
      await AsyncStorage.setItem(TOKEN_METADATA_KEY, JSON.stringify(this.tokenMetadata));
    } catch (error) {
      console.warn('Failed to save token metadata:', error);
    }
  }

  private setupTokenRefreshListener(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.remove();
    }

    this.refreshSubscription = Notifications.addPushTokenListener(async (tokenData) => {
      const newToken = tokenData.data;
      const oldToken = this.tokenMetadata?.token ?? null;

      if (newToken === oldToken) return; // No actual change

      console.log('Push token refreshed, updating registration...');

      const event: TokenRefreshEvent = {
        oldToken,
        newToken,
        timestamp: Date.now(),
        reason: oldToken ? 'refresh' : 'initial',
      };

      await this.handleTokenUpdate(newToken, event);
    });
  }

  private async handleTokenUpdate(newToken: string, event: TokenRefreshEvent): Promise<void> {
    const oldMetadata = this.tokenMetadata;

    this.tokenMetadata = {
      token: newToken,
      obtainedAt: Date.now(),
      lastValidatedAt: Date.now(),
      lastRefreshedAt: oldMetadata ? Date.now() : undefined,
      refreshCount: (oldMetadata?.refreshCount ?? 0) + (event.reason === 'refresh' ? 1 : 0),
      platform: Platform.OS as 'ios' | 'android',
      registeredWithBackend: false,
    };

    // Store token locally
    await AsyncStorage.setItem(TOKEN_KEY, newToken);
    await this.saveTokenMetadata();

    // Register with backend using retry logic
    const registered = await this.registerTokenWithBackend(newToken);
    if (registered) {
      this.tokenMetadata.registeredWithBackend = true;
      await this.saveTokenMetadata();
    }

    // Notify callbacks
    for (const callback of this.refreshCallbacks) {
      try {
        callback(event);
      } catch (error) {
        console.warn('Token refresh callback error:', error);
      }
    }
  }

  private async registerTokenWithBackend(token: string): Promise<boolean> {
    if (this.isRegistering) return false;
    this.isRegistering = true;

    try {
      for (let attempt = 0; attempt < MAX_REGISTRATION_RETRIES; attempt++) {
        try {
          const deviceId = Constants.sessionId ||
            `${Device.brand}-${Device.modelName}-${Date.now()}`;
          const platform = Platform.OS === 'ios' ? 'ios' : 'android' as const;
          const deviceName = Device.deviceName || `${Device.brand} ${Device.modelName}`;
          const osVersion = Device.osVersion || Platform.Version.toString();
          const appVersion = Constants.expoConfig?.version || '1.0.0';

          const registration = await registerDevice({
            token,
            platform,
            deviceId,
            deviceName,
            osVersion,
            appVersion,
          });

          await AsyncStorage.setItem(
            DEVICE_REGISTRATION_KEY,
            JSON.stringify({
              id: registration.id,
              deviceId,
              platform,
              registeredAt: registration.registeredAt,
            })
          );

          console.log('Token registered with backend successfully');
          return true;
        } catch (error) {
          console.warn(`Token registration attempt ${attempt + 1} failed:`, error);

          if (attempt < MAX_REGISTRATION_RETRIES - 1) {
            const backoff = REGISTRATION_BASE_BACKOFF_MS * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, backoff));
          }
        }
      }

      console.error('Token registration failed after all retries');
      return false;
    } finally {
      this.isRegistering = false;
    }
  }

  private startTokenValidation(): void {
    if (this.validationInterval) return;

    this.validationInterval = setInterval(() => {
      this.validateToken();
    }, TOKEN_VALIDATION_INTERVAL_MS);
  }

  /**
   * Validate the current token is still valid and refresh if needed
   */
  async validateToken(): Promise<boolean> {
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const { data: currentToken } = await Notifications.getExpoPushTokenAsync({ projectId });

      if (!currentToken) {
        console.warn('Token validation: no token available');
        return false;
      }

      if (this.tokenMetadata && currentToken !== this.tokenMetadata.token) {
        // Token has changed - handle refresh
        const event: TokenRefreshEvent = {
          oldToken: this.tokenMetadata.token,
          newToken: currentToken,
          timestamp: Date.now(),
          reason: 'expired',
        };
        await this.handleTokenUpdate(currentToken, event);
      } else if (this.tokenMetadata) {
        this.tokenMetadata.lastValidatedAt = Date.now();
        await this.saveTokenMetadata();
      } else {
        // First time - initialize metadata
        const event: TokenRefreshEvent = {
          oldToken: null,
          newToken: currentToken,
          timestamp: Date.now(),
          reason: 'initial',
        };
        await this.handleTokenUpdate(currentToken, event);
      }

      // Re-register if not yet registered with backend
      if (this.tokenMetadata && !this.tokenMetadata.registeredWithBackend) {
        const registered = await this.registerTokenWithBackend(currentToken);
        if (registered && this.tokenMetadata) {
          this.tokenMetadata.registeredWithBackend = true;
          await this.saveTokenMetadata();
        }
      }

      return true;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  /**
   * Force a token refresh
   */
  async forceRefresh(): Promise<string | null> {
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

      if (token) {
        const event: TokenRefreshEvent = {
          oldToken: this.tokenMetadata?.token ?? null,
          newToken: token,
          timestamp: Date.now(),
          reason: 'manual',
        };
        await this.handleTokenUpdate(token, event);
        return token;
      }

      return null;
    } catch (error) {
      console.error('Force token refresh failed:', error);
      return null;
    }
  }

  /**
   * Register a callback for token refresh events
   */
  onTokenRefresh(callback: TokenRefreshCallback): () => void {
    this.refreshCallbacks.push(callback);
    return () => {
      this.refreshCallbacks = this.refreshCallbacks.filter((cb) => cb !== callback);
    };
  }

  getCurrentToken(): string | null {
    return this.tokenMetadata?.token ?? null;
  }

  getTokenMetadata(): TokenMetadata | null {
    return this.tokenMetadata ? { ...this.tokenMetadata } : null;
  }

  isTokenRegistered(): boolean {
    return this.tokenMetadata?.registeredWithBackend ?? false;
  }

  destroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.remove();
      this.refreshSubscription = null;
    }
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
      this.validationInterval = null;
    }
    this.refreshCallbacks = [];
    this.tokenMetadata = null;
  }
}

export default TokenRefreshManager;
