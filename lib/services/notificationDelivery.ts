/**
 * Notification Delivery Service - PN-002
 *
 * Backend service for delivering push notifications to FCM (Android) and APNs (iOS).
 * Handles notification formatting, delivery, error handling, and retry logic.
 *
 * This service is designed to run on a Node.js backend server and uses:
 * - Firebase Admin SDK for FCM (Android)
 * - node-apn for APNs (iOS)
 *
 * Usage:
 * ```typescript
 * import { NotificationDeliveryService } from './notificationDelivery';
 *
 * const deliveryService = new NotificationDeliveryService({
 *   fcm: { serviceAccount: ... },
 *   apns: { keyId: ..., teamId: ..., bundleId: ..., privateKey: ... }
 * });
 *
 * await deliveryService.send({
 *   token: 'device-token',
 *   platform: 'ios',
 *   notification: { title: 'Hello', body: 'World' }
 * });
 * ```
 */

import {
  type NotificationDeliveryRequest,
  type NotificationDeliveryResult,
  type BatchNotificationDeliveryRequest,
  type BatchNotificationDeliveryResult,
  type RetryConfig,
  type FCMMessagePayload,
  type DevicePlatform,
  DEFAULT_RETRY_CONFIG,
  RETRYABLE_ERROR_CODES,
} from '../types/notificationDelivery';

// Firebase Admin SDK types (lazy import to allow optional dependency)
interface FirebaseAdmin {
  messaging(): FirebaseMessaging;
}

interface FirebaseMessaging {
  send(message: FCMMessagePayload, dryRun?: boolean): Promise<string>;
  sendEach(messages: FCMMessagePayload[]): Promise<{ responses: Array<{ success: boolean; messageId?: string; error?: { code: string; message: string } }> }>;
}

// node-apn types (lazy import to allow optional dependency)
interface ApnProvider {
  send(notification: unknown, deviceToken: string): Promise<{ sent: string[]; failed: Array<{ device: string; response?: { reason: string } }> }>;
  shutdown(): Promise<void>;
}

interface ApnNotification {
  toString(): string;
}

interface ApnsConfig {
  keyId: string;
  teamId: string;
  bundleId: string;
  privateKey: string | Buffer;
  production: boolean;
}

/**
 * Configuration for the notification delivery service
 */
export interface NotificationDeliveryConfig {
  fcm?: {
    serviceAccount: Record<string, unknown>;
    projectId?: string;
  };
  apns?: ApnsConfig;
  retry?: Partial<RetryConfig>;
  logging?: boolean;
}

/**
 * Custom error class for notification delivery errors
 */
export class NotificationDeliveryError extends Error {
  public readonly code: string;
  public readonly retryable: boolean;
  public readonly platform: DevicePlatform;

  constructor(
    message: string,
    code: string,
    platform: DevicePlatform,
    retryable = false
  ) {
    super(message);
    this.name = 'NotificationDeliveryError';
    this.code = code;
    this.platform = platform;
    this.retryable = retryable;
  }
}

/**
 * Notification Delivery Service for FCM and APNs
 */
export class NotificationDeliveryService {
  private fcmMessaging: FirebaseMessaging | null = null;
  private apnProvider: ApnProvider | null = null;
  private retryConfig: RetryConfig;
  private logging: boolean;

  constructor(config: NotificationDeliveryConfig = {}) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config.retry };
    this.logging = config.logging ?? true;

    if (config.fcm) {
      this.initializeFCM(config.fcm);
    }

    if (config.apns) {
      this.initializeAPNs(config.apns);
    }
  }

  /**
   * Initialize Firebase Admin SDK for FCM
   */
  private initializeFCM(config: { serviceAccount: Record<string, unknown>; projectId?: string }): void {
    try {
      // Dynamic import to make Firebase optional
      const admin = require('firebase-admin');

      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(config.serviceAccount as Record<string, string>),
          projectId: config.projectId,
        });
      }

      this.fcmMessaging = admin.messaging();
      this.log('FCM initialized successfully');
    } catch (error) {
      this.log('Failed to initialize FCM:', error);
      throw new Error('Firebase Admin SDK initialization failed. Install firebase-admin package.');
    }
  }

  /**
   * Initialize APNs provider using node-apn
   */
  private initializeAPNs(config: ApnsConfig): void {
    try {
      // Dynamic import to make node-apn optional
      const apn = require('apn');

      const providerConfig: Record<string, unknown> = {
        key: config.privateKey,
        keyId: config.keyId,
        teamId: config.teamId,
        bundleId: config.bundleId,
        production: config.production,
      };

      this.apnProvider = new apn.Provider(providerConfig);
      this.log('APNs initialized successfully');
    } catch (error) {
      this.log('Failed to initialize APNs:', error);
      throw new Error('APNs provider initialization failed. Install apn package.');
    }
  }

  /**
   * Check if FCM is initialized
   */
  isFCMEnabled(): boolean {
    return this.fcmMessaging !== null;
  }

  /**
   * Check if APNs is initialized
   */
  isAPNsEnabled(): boolean {
    return this.apnProvider !== null;
  }

  /**
   * Send a notification to a single device
   */
  async send(request: NotificationDeliveryRequest): Promise<NotificationDeliveryResult> {
    const timestamp = Date.now();
    const platform = request.platform;

    try {
      let messageId: string;

      if (platform === 'android') {
        messageId = await this.sendToFCM(request);
      } else if (platform === 'ios') {
        messageId = await this.sendToAPNs(request);
      } else {
        throw new NotificationDeliveryError(
          `Unsupported platform: ${platform}`,
          'UNSUPPORTED_PLATFORM',
          platform as DevicePlatform,
          false
        );
      }

      this.log(`Notification sent successfully to ${platform}:`, messageId);

      return {
        success: true,
        messageId,
        platform,
        token: request.token,
        timestamp,
      };
    } catch (error) {
      const deliveryError = this.normalizeError(error, platform);

      this.log(`Notification delivery failed for ${platform}:`, deliveryError.message);

      return {
        success: false,
        error: {
          code: deliveryError.code,
          message: deliveryError.message,
          retryable: deliveryError.retryable,
        },
        platform,
        token: request.token,
        timestamp,
      };
    }
  }

  /**
   * Send notification to FCM (Android)
   */
  private async sendToFCM(request: NotificationDeliveryRequest): Promise<string> {
    if (!this.fcmMessaging) {
      throw new NotificationDeliveryError(
        'FCM is not initialized. Call constructor with fcm config.',
        'FCM_NOT_INITIALIZED',
        'android',
        false
      );
    }

    const message = this.buildFCMMessage(request);

    try {
      const messageId = await this.fcmMessaging.send(message);
      return messageId;
    } catch (error) {
      throw this.normalizeError(error, 'android');
    }
  }

  /**
   * Build FCM message payload from request
   */
  private buildFCMMessage(request: NotificationDeliveryRequest): FCMMessagePayload {
    const androidNotification = request.android?.notification;
    const androidOptions = request.android;

    return {
      message: {
        token: request.token,
        android: {
          priority: request.priority === 'high' ? 'high' : request.priority === 'low' ? 'min' : 'normal',
          collapseKey: request.collapseKey,
          notification: {
            channelId: androidNotification?.channelId || androidOptions?.channelId || 'default',
            icon: androidNotification?.icon || 'ic_notification',
            color: androidNotification?.color || '#5865F2',
            sound: androidNotification?.sound || 'default',
            tag: androidNotification?.tag,
            clickAction: androidNotification?.clickAction || 'FLUTTER_NOTIFICATION_CLICK',
            titleLocKey: androidNotification?.titleLocKey,
            titleLocArgs: androidNotification?.titleLocArgs,
            bodyLocKey: androidNotification?.bodyLocKey,
            bodyLocArgs: androidNotification?.bodyLocArgs,
            visibility: androidNotification?.visibility,
            notificationCount: androidNotification?.notificationCount,
            defaultVibrateSettings: androidNotification?.defaultVibrateSettings,
            defaultSound: androidNotification?.defaultSound,
            defaultLightSettings: androidNotification?.defaultLightSettings,
            lightSettings: androidNotification?.lightSettings,
            vibrateTimings: androidNotification?.vibrateTimings,
            staleDate: androidNotification?.staleDate,
            localOnly: androidNotification?.localOnly,
            qos: androidNotification?.qos,
            exclusionSensitive: androidNotification?.exclusionSensitive,
          },
          fcmOptions: {
            analyticsLabel: 'notification',
            image: request.data?.imageUrl,
          },
          data: {
            ...this.convertDataToStrings(request.data),
            type: request.data?.type || 'notification',
          },
        },
        apns: this.buildAPNsPayload(request),
        data: this.convertDataToStrings(request.data),
      },
    };
  }

  /**
   * Build APNs payload from request
   */
  private buildAPNsPayload(request: NotificationDeliveryRequest): FCMMessagePayload['message']['apns'] {
    const iosOptions = request.ios;

    const alert: Record<string, unknown> = {
      title: request.notification.title,
      body: request.notification.body,
    };

    if (request.notification.subtitle) {
      alert.subtitle = request.notification.subtitle;
    }

    if (request.notification.titleLocKey) {
      alert['title-loc-key'] = request.notification.titleLocKey;
      if (request.notification.titleLocArgs) {
        alert['title-loc-args'] = request.notification.titleLocArgs;
      }
    }

    if (request.notification.bodyLocKey) {
      alert['loc-key'] = request.notification.bodyLocKey;
      if (request.notification.bodyLocArgs) {
        alert['loc-args'] = request.notification.bodyLocArgs;
      }
    }

    if (request.notification.launchImageName) {
      alert['launch-image'] = request.notification.launchImageName;
    }

    const aps: Record<string, unknown> = {
      alert,
      'thread-id': request.notification.threadId,
      'category': request.notification.categoryId,
      'mutable-content': request.notification.mutableContent || 1,
    };

    if (request.notification.badge !== undefined) {
      aps.badge = request.notification.badge;
    }

    if (request.notification.sound !== undefined) {
      aps.sound = request.notification.sound;
    }

    if (iosOptions?.interruptionLevel) {
      aps['interruption-level'] = iosOptions.interruptionLevel;
    }

    if (iosOptions?.relevanceScore !== undefined) {
      aps['relevance-score'] = iosOptions.relevanceScore;
    }

    if (iosOptions?.filterCriteria) {
      aps['filter-criteria'] = iosOptions.filterCriteria;
    }

    if (iosOptions?.staleDate) {
      aps['stale-date'] = iosOptions.staleDate;
    }

    if (iosOptions?.createdDate) {
      aps['created-date'] = iosOptions.createdDate;
    }

    if (iosOptions?.contentState) {
      aps['content-state'] = iosOptions.contentState;
    }

    if (iosOptions?.alarms) {
      aps['alarms'] = iosOptions.alarms;
    }

    // Check if this is a background notification
    const isBackground = !request.notification.title && !request.notification.body;
    if (isBackground) {
      aps['content-available'] = 1;
    }

    const headers: Record<string, string> = {};

    if (request.priority === 'high') {
      headers['apns-priority'] = '10';
    } else if (request.priority === 'low') {
      headers['apns-priority'] = '5';
    } else {
      headers['apns-priority'] = '10';
    }

    if (request.collapseKey) {
      headers['apns-collapse-id'] = request.collapseKey;
    }

    return {
      payload: {
        aps,
        data: this.convertDataToStrings(request.data),
      },
      headers,
      fcmOptions: {
        analyticsLabel: 'notification',
        image: request.data?.imageUrl,
      },
    };
  }

  /**
   * Send notification to APNs (iOS)
   */
  private async sendToAPNs(request: NotificationDeliveryRequest): Promise<string> {
    if (!this.apnProvider) {
      throw new NotificationDeliveryError(
        'APNs is not initialized. Call constructor with apns config.',
        'APNS_NOT_INITIALIZED',
        'ios',
        false
      );
    }

    try {
      // Dynamic import to make node-apn optional
      const apn = require('apn');

      const notification = new apn.Notification();

      // Set notification content
      notification.alert = {
        title: request.notification.title,
        body: request.notification.body,
        ...(request.notification.subtitle && { subtitle: request.notification.subtitle }),
        ...(request.notification.titleLocKey && { 'title-loc-key': request.notification.titleLocKey }),
        ...(request.notification.titleLocArgs && { 'title-loc-args': request.notification.titleLocArgs }),
        ...(request.notification.bodyLocKey && { 'loc-key': request.notification.bodyLocKey }),
        ...(request.notification.bodyLocArgs && { 'loc-args': request.notification.bodyLocArgs }),
        ...(request.notification.launchImageName && { 'launch-image': request.notification.launchImageName }),
      };

      // Set other notification properties
      if (request.notification.badge !== undefined) {
        notification.badge = request.notification.badge;
      }

      if (request.notification.sound !== undefined) {
        notification.sound = request.notification.sound;
      }

      notification.category = request.notification.categoryId || 'default';
      notification.threadId = request.notification.threadId;
      notification.mutableContent = request.notification.mutableContent || 1;

      // Set iOS-specific options
      if (request.ios?.interruptionLevel) {
        notification.interruptionLevel = request.ios.interruptionLevel;
      }

      if (request.ios?.contentState) {
        notification.contentState = request.ios.contentState;
      }

      // Set priority
      if (request.priority === 'high') {
        notification.priority = 10;
      } else if (request.priority === 'low') {
        notification.priority = 5;
      } else {
        notification.priority = 10;
      }

      // Add custom data
      if (request.data) {
        notification.data = request.data;
      }

      const result = await this.apnProvider.send(notification, request.token) as { sent: string[]; failed: Array<{ device: string; response?: { reason: string } }> };

      if (result.failed && result.failed.length > 0) {
        const failure = result.failed[0];
        throw new NotificationDeliveryError(
          failure.response?.reason || 'APNs delivery failed',
          failure.response?.reason || 'APNS_ERROR',
          'ios',
          this.isRetryableAPNsError(failure.response?.reason)
        );
      }

      if (result.sent && result.sent.length > 0) {
        return result.sent[0];
      }

      throw new NotificationDeliveryError(
        'APNs returned no response',
        'APNS_NO_RESPONSE',
        'ios',
        true
      );
    } catch (error) {
      if (error instanceof NotificationDeliveryError) {
        throw error;
      }
      throw this.normalizeError(error, 'ios');
    }
  }

  /**
   * Send notification with retry logic
   */
  async sendWithRetry(request: NotificationDeliveryRequest): Promise<NotificationDeliveryResult> {
    let lastError: NotificationDeliveryError | null = null;
    const maxRetries = this.retryConfig.maxRetries;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = this.calculateBackoffDelay(attempt);
        this.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`);
        await this.sleep(delay);
      }

      const result = await this.send(request);

      if (result.success) {
        if (attempt > 0) {
          this.log(`Notification delivered after ${attempt} retries`);
        }
        return result;
      }

      // Check if error is retryable
      if (result.error && !result.error.retryable) {
        this.log(`Non-retryable error, not retrying:`, result.error.code);
        return result;
      }

      lastError = new NotificationDeliveryError(
        result.error?.message || 'Unknown error',
        result.error?.code || 'UNKNOWN',
        request.platform,
        true
      );
    }

    return {
      success: false,
      error: {
        code: lastError?.code || 'MAX_RETRIES_EXCEEDED',
        message: lastError?.message || 'Max retries exceeded',
        retryable: false,
      },
      platform: request.platform,
      token: request.token,
      timestamp: Date.now(),
    };
  }

  /**
   * Send batch notifications
   */
  async sendBatch(request: BatchNotificationDeliveryRequest): Promise<BatchNotificationDeliveryResult> {
    const startTime = Date.now();
    const notifications = request.notifications;
    const batchSize = request.batchSize || 100;

    this.log(`Starting batch delivery of ${notifications.length} notifications`);

    const results: NotificationDeliveryResult[] = [];
    let successful = 0;
    let failed = 0;

    // Process in batches
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      this.log(`Processing batch ${Math.floor(i / batchSize) + 1}, size: ${batch.length}`);

      const batchResults = await Promise.all(
        batch.map(notification => this.sendWithRetry(notification))
      );

      results.push(...batchResults);

      batchResults.forEach(result => {
        if (result.success) {
          successful++;
        } else {
          failed++;
        }
      });
    }

    const durationMs = Date.now() - startTime;

    this.log(`Batch delivery complete: ${successful} successful, ${failed} failed, ${durationMs}ms`);

    return {
      total: notifications.length,
      successful,
      failed,
      results,
      durationMs,
    };
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
    return Math.min(delay, this.retryConfig.maxDelayMs);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Normalize error to NotificationDeliveryError
   */
  private normalizeError(error: unknown, platform: DevicePlatform): NotificationDeliveryError {
    if (error instanceof NotificationDeliveryError) {
      return error;
    }

    let code = 'UNKNOWN_ERROR';
    let message = 'An unknown error occurred';
    let retryable = false;

    if (error instanceof Error) {
      message = error.message;

      // Try to extract error code from Firebase error
      if ('code' in error) {
        const errorCode = (error as { code: string }).code;
        if (errorCode.startsWith('messaging/')) {
          code = errorCode.replace('messaging/', '').toUpperCase();
        } else {
          code = errorCode;
        }
      }

      retryable = this.isRetryableError(code);
    }

    return new NotificationDeliveryError(message, code, platform, retryable);
  }

  /**
   * Check if an error code is retryable
   */
  private isRetryableError(code: string): boolean {
    return RETRYABLE_ERROR_CODES.includes(code);
  }

  /**
   * Check if an APNs error is retryable
   */
  private isRetryableAPNsError(reason?: string): boolean {
    if (!reason) return true;

    const retryableReasons = [
      'Shutdown',
      'Internal',
      'ExpiredProviderToken',
    ];

    return retryableReasons.some(r => reason.includes(r));
  }

  /**
   * Convert data object to string key-value pairs
   */
  private convertDataToStrings(data?: Record<string, unknown>): Record<string, string> {
    if (!data) return {};

    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        result[key] = typeof value === 'string' ? value : JSON.stringify(value);
      }
    }
    return result;
  }

  /**
   * Log message if logging is enabled
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.logging) {
      console.log(`[NotificationDelivery] ${message}`, ...args);
    }
  }

  /**
   * Shutdown the service and cleanup resources
   */
  async shutdown(): Promise<void> {
    this.log('Shutting down notification delivery service');

    if (this.apnProvider) {
      try {
        await this.apnProvider.shutdown();
        this.log('APNs provider shut down');
      } catch (error) {
        this.log('Error shutting down APNs provider:', error);
      }
    }
  }
}

// Default export for convenience
export default NotificationDeliveryService;
