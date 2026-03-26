/**
 * Notification Delivery Types - PN-002
 *
 * Type definitions for the push notification delivery pipeline.
 * These types are used by the backend service to send notifications
 * to FCM (Android) and APNs (iOS).
 */

// Device platform types
export type DevicePlatform = 'ios' | 'android';

// Notification priority levels
export type NotificationPriority = 'high' | 'normal' | 'low';

// Notification category for iOS actions
export interface NotificationCategory {
  id: string;
  actions: NotificationAction[];
}

// Notification action for iOS
export interface NotificationAction {
  id: string;
  title: string;
  options?: {
    foreground?: boolean;
    destructive?: boolean;
    authenticationRequired?: boolean;
  };
}

// Base notification content
export interface NotificationContent {
  title: string;
  body: string;
  subtitle?: string;
  badge?: number;
  sound?: string | null;
  launchImageName?: string;
  titleLocKey?: string;
  titleLocArgs?: string[];
  bodyLocKey?: string;
  bodyLocArgs?: string[];
  categoryId?: string;
  threadId?: string;
  mutableContent?: number;
  contentAvailability?: number;
}

// Android-specific notification data (FCM)
export interface AndroidNotificationOptions {
  channelId?: string;
  channelIdDelimiter?: string;
  notification?: {
    channelId?: string;
    icon?: string;
    color?: string;
    sound?: string;
    tag?: string;
    clickAction?: string;
    priority?: 'PRI' | 'HIGH' | 'NORMAL' | 'LOW' | 'MIN';
    titleLocKey?: string;
    titleLocArgs?: string[];
    bodyLocKey?: string;
    bodyLocArgs?: string[];
    defaultVibrateSettings?: boolean;
    defaultSound?: boolean;
    defaultLightSettings?: boolean;
    lightSettings?: {
      color: {
        alpha: number;
        red: number;
        green: number;
        blue: number;
      };
      lightOnDuration: string;
      lightOffDuration: string;
    };
    vibrateTimings?: string[];
    visibility?: 'PRIVATE' | 'PUBLIC' | 'SECRET';
    notificationCount?: number;
    staleDate?: string;
    localOnly?: boolean;
    qos?: 'DEFAULT' | 'HIGH' | 'BALANCED';
    exclusionSensitive?: boolean;
  };
}

// iOS-specific notification data (APNs)
export interface iOSNotificationOptions {
  interruptionLevel?: 'active' | 'inactive' | 'passive' | 'critical';
  relevanceScore?: number;
  filterCriteria?: string;
  staleDate?: string;
  createdDate?: string;
  contentState?: Record<string, unknown>;
  alarms?: Array<{
    dateKind: 'FIXED' | 'FLOATING';
    date: string;
    relativeDate?: number;
    uuid: string;
    identifier: string;
  }>;
}

// Raw notification payload sent to FCM
export interface FCMMessagePayload {
  message: {
    name?: string;
    token?: string;
    topic?: string;
    condition?: string;
    android?: {
      priority?: 'high' | 'normal' | 'min';
      collapseKey?: string;
      restrictedPackageName?: string;
      notification?: {
        channelId?: string;
        icon?: string;
        color?: string;
        sound?: string;
        tag?: string;
        clickAction?: string;
        bodyLocKey?: string;
        bodyLocArgs?: string[];
        titleLocKey?: string;
        titleLocArgs?: string[];
        channelIdMismatch?: boolean;
        defaultVibrateSettings?: boolean;
        defaultSound?: boolean;
        defaultLightSettings?: boolean;
        lightSettings?: {
          color: { alpha: number; red: number; green: number; blue: number };
          lightOnDuration: string;
          lightOffDuration: string;
        };
        vibrateTimings?: string[];
        visibility?: 'PRIVATE' | 'PUBLIC' | 'SECRET';
        notificationCount?: number;
        staleDate?: string;
        localOnly?: boolean;
        qos?: 'DEFAULT' | 'HIGH' | 'BALANCED';
        exclusionSensitive?: boolean;
      };
      fcmOptions?: {
        analyticsLabel?: string;
        label?: string;
        image?: string;
      };
      data?: Record<string, string>;
    };
    apns?: {
      payload?: {
        aps?: {
          alert?: {
            title?: string;
            subtitle?: string;
            body?: string;
            'title-loc-key'?: string;
            'title-loc-args'?: string[];
            'loc-key'?: string;
            'loc-args'?: string[];
            'launch-image'?: string;
          };
          badge?: number;
          sound?: string | null;
          'thread-id'?: string;
          'category'?: string;
          'mutable-content'?: number;
          'content-available'?: number;
          'interruption-level'?: 'active' | 'inactive' | 'passive' | 'critical';
          'relevance-score'?: number;
          'filter-criteria'?: string;
          'stale-date'?: string;
          'created-date'?: string;
          'content-state'?: Record<string, unknown>;
          'alarms'?: Array<{
            dateKind: 'FIXED' | 'FLOATING';
            date: string;
            relativeDate?: number;
            uuid: string;
            identifier: string;
          }>;
        };
        data?: Record<string, string>;
      };
      headers?: {
        'apns-id'?: string;
        'apns-topic'?: string;
        'apns-expiration'?: string;
        'apns-priority'?: string;
        'apns-collapse-id'?: string;
        'apns-focus'?: string;
        'apns-authorization'?: string;
      };
      fcmOptions?: {
        analyticsLabel?: string;
        label?: string;
        image?: string;
      };
    };
    webpush?: {
      headers?: Record<string, string>;
      data?: Record<string, string>;
      notification?: Record<string, unknown>;
      fcmOptions?: {
        link?: string;
        analyticsLabel?: string;
      };
    };
    data?: Record<string, string>;
  };
}

// Notification delivery result
export interface NotificationDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: {
    code: string;
    message: string;
    retryable?: boolean;
  };
  platform: DevicePlatform;
  token: string;
  timestamp: number;
}

// Retry configuration for failed deliveries
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

// Default retry configuration
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

// Notification delivery request
export interface NotificationDeliveryRequest {
  token: string;
  platform: DevicePlatform;
  notification: NotificationContent;
  data?: Record<string, string>;
  android?: AndroidNotificationOptions;
  ios?: iOSNotificationOptions;
  priority?: NotificationPriority;
  collapseKey?: string;
  topic?: string;
  condition?: string;
}

// Batch notification delivery request
export interface BatchNotificationDeliveryRequest {
  notifications: NotificationDeliveryRequest[];
  batchSize?: number;
}

// Batch notification delivery result
export interface BatchNotificationDeliveryResult {
  total: number;
  successful: number;
  failed: number;
  results: NotificationDeliveryResult[];
  durationMs: number;
}

// Device registration info (from PN-001)
export interface DeviceRegistration {
  id: string;
  token: string;
  platform: DevicePlatform;
  deviceId: string;
  deviceName?: string;
  osVersion?: string;
  appVersion?: string;
  registeredAt: number;
  lastActiveAt: number;
  isActive: boolean;
}

// Notification types for categorization
export type NotificationType =
  | 'message'
  | 'dm'
  | 'mention'
  | 'reply'
  | 'friend_request'
  | 'server_invite'
  | 'call'
  | 'system';

// Notification payload with routing info
export interface NotificationPayload {
  type: NotificationType;
  serverId?: string;
  channelId?: string;
  messageId?: string;
  threadId?: string;
  userId?: string;
  title: string;
  body: string;
  imageUrl?: string;
}

// FCM error codes mapping to retry decisions
export const FCM_ERROR_CODES = {
  UNSPECIFIED: 'UNSPECIFIED',
  SENDER_ID_MISMATCH: 'SENDER_ID_MISMATCH',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  UNAVAILABLE: 'UNAVAILABLE',
  INTERNAL: 'INTERNAL',
  INVALID_ARGUMENT: 'INVALID_ARGUMENT',
  THIRD_PARTY_AUTH_ERROR: 'THIRD_PARTY_AUTH_ERROR',
} as const;

// APNs error codes mapping to retry decisions
export const APNS_ERROR_CODES = {
  UNPROCESSABLE: 'UNPROCESSABLE',
  SHUTDOWN: 'SHUTDOWN',
  BAD_DEVICE_TOKEN: 'BAD_DEVICE_TOKEN',
  DUPLICATE: 'DUPLICATE',
  TOPIC: 'TOPIC',
  BAD_MESSAGE_ID: 'BAD_MESSAGE_ID',
  BAD_EXPIRATION_DATE: 'BAD_EXPIRATION_DATE',
  BAD_PRIORITY: 'BAD_PRIORITY',
  MISSING_DEVICE_TOKEN: 'MISSING_DEVICE_TOKEN',
  MISSING_TOPIC: 'MISSING_TOPIC',
  PAYLOAD_EMPTY: 'PAYLOAD_EMPTY',
  BAD_CERTIFICATE: 'BAD_CERTIFICATE',
  BAD_CERT_ENV: 'BAD_CERT_ENV',
  EXPIRED_PROVIDER_TOKEN: 'EXPIRED_PROVIDER_TOKEN',
  BAD_PROVIDER_TOKEN: 'BAD_PROVIDER_TOKEN',
  MISSING_PROVIDER_TOKEN: 'MISSING_PROVIDER_TOKEN',
  INVALID_PROVIDER_TOKEN: 'INVALID_PROVIDER_TOKEN',
  INTERNAL: 'INTERNAL',
} as const;

// Error types that are retryable
export const RETRYABLE_ERROR_CODES: string[] = [
  FCM_ERROR_CODES.QUOTA_EXCEEDED,
  FCM_ERROR_CODES.UNAVAILABLE,
  FCM_ERROR_CODES.INTERNAL,
  FCM_ERROR_CODES.THIRD_PARTY_AUTH_ERROR,
  APNS_ERROR_CODES.SHUTDOWN,
  APNS_ERROR_CODES.INTERNAL,
  APNS_ERROR_CODES.EXPIRED_PROVIDER_TOKEN,
];
