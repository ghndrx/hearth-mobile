/**
 * Shared Push Notification Types (PN-001)
 *
 * Re-exports types from lib/services/notifications and adds
 * additional types needed by the device registration service.
 */

export type {
  NotificationType,
  NotificationPayload,
  NotificationSettings,
  NotificationResponse,
  Notification,
} from '../../lib/services/notifications';

export {
  DEFAULT_NOTIFICATION_SETTINGS,
  NOTIFICATION_CHANNELS,
} from '../../lib/services/notifications';

export interface DeviceRegistrationParams {
  token: string;
  platform: 'ios' | 'android';
  deviceId: string;
  deviceName?: string;
  osVersion?: string;
  appVersion?: string;
}

export interface DeviceRegistration {
  id: string;
  token: string;
  platform: 'ios' | 'android';
  deviceId: string;
  registeredAt: number;
  lastActiveAt: number;
}

export interface StoredDeviceRegistration {
  id: string;
  deviceId: string;
  platform: string;
  registeredAt: number;
}
