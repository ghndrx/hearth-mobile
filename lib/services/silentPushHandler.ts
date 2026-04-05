/**
 * Silent Push Notification Handler (PN-006)
 * Handles data-only (silent) push notifications for background data sync,
 * delivery confirmations, and content pre-fetching.
 */

import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';
import NotificationDeliveryTrackingService from './notificationDeliveryTracking';

export type SilentPushType =
  | 'delivery_confirmation'
  | 'content_prefetch'
  | 'sync_trigger'
  | 'token_validation'
  | 'config_update'
  | 'badge_update';

export interface SilentPushPayload {
  _silent: true;
  type: SilentPushType;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface SilentPushMetrics {
  totalReceived: number;
  totalProcessed: number;
  totalFailed: number;
  byType: Record<SilentPushType, number>;
  lastReceivedAt: number | null;
}

type SilentPushHandler = (payload: SilentPushPayload) => Promise<void>;

const DEFAULT_METRICS: SilentPushMetrics = {
  totalReceived: 0,
  totalProcessed: 0,
  totalFailed: 0,
  byType: {
    delivery_confirmation: 0,
    content_prefetch: 0,
    sync_trigger: 0,
    token_validation: 0,
    config_update: 0,
    badge_update: 0,
  },
  lastReceivedAt: null,
};

class SilentPushNotificationHandler {
  private static instance: SilentPushNotificationHandler;
  private handlers: Map<SilentPushType, SilentPushHandler[]> = new Map();
  private metrics: SilentPushMetrics = { ...DEFAULT_METRICS };
  private notificationSubscription: Notifications.Subscription | null = null;
  private deliveryTracker: NotificationDeliveryTrackingService;

  private constructor() {
    this.deliveryTracker = NotificationDeliveryTrackingService.getInstance();
    this.setupDefaultHandlers();
  }

  static getInstance(): SilentPushNotificationHandler {
    if (!SilentPushNotificationHandler.instance) {
      SilentPushNotificationHandler.instance = new SilentPushNotificationHandler();
    }
    return SilentPushNotificationHandler.instance;
  }

  /**
   * Start listening for silent push notifications.
   * Should be called during app initialization.
   */
  initialize(): void {
    this.notificationSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data;
        if (this.isSilentPush(data)) {
          this.handleSilentPush(data as SilentPushPayload, notification);
        }
      }
    );
  }

  private isSilentPush(data: Record<string, unknown> | undefined): boolean {
    return !!data && data._silent === true && typeof data.type === 'string';
  }

  private setupDefaultHandlers(): void {
    // Handle delivery confirmations
    this.registerHandler('delivery_confirmation', async (payload) => {
      const { notificationId } = payload.data as { notificationId: string };
      if (notificationId) {
        this.deliveryTracker.confirmDelivery(notificationId);
      }
    });

    // Handle badge updates
    this.registerHandler('badge_update', async (payload) => {
      const { count } = payload.data as { count: number };
      if (typeof count === 'number') {
        await Notifications.setBadgeCountAsync(count);
      }
    });
  }

  private async handleSilentPush(
    payload: SilentPushPayload,
    notification: Notifications.Notification
  ): Promise<void> {
    this.metrics.totalReceived++;
    this.metrics.lastReceivedAt = Date.now();

    if (payload.type in this.metrics.byType) {
      this.metrics.byType[payload.type]++;
    }

    const handlers = this.handlers.get(payload.type) || [];

    if (handlers.length === 0) {
      console.warn(`No handlers registered for silent push type: ${payload.type}`);
      return;
    }

    for (const handler of handlers) {
      try {
        await handler(payload);
        this.metrics.totalProcessed++;
      } catch (error) {
        this.metrics.totalFailed++;
        console.error(`Silent push handler error for type ${payload.type}:`, error);
      }
    }
  }

  /**
   * Register a handler for a specific silent push type
   */
  registerHandler(type: SilentPushType, handler: SilentPushHandler): () => void {
    const existing = this.handlers.get(type) || [];
    existing.push(handler);
    this.handlers.set(type, existing);

    return () => {
      const current = this.handlers.get(type) || [];
      this.handlers.set(
        type,
        current.filter((h) => h !== handler)
      );
    };
  }

  /**
   * Manually process a silent push payload (for testing or direct invocation)
   */
  async processSilentPush(payload: SilentPushPayload): Promise<void> {
    await this.handleSilentPush(payload, {} as Notifications.Notification);
  }

  getMetrics(): SilentPushMetrics {
    return { ...this.metrics, byType: { ...this.metrics.byType } };
  }

  destroy(): void {
    if (this.notificationSubscription) {
      this.notificationSubscription.remove();
      this.notificationSubscription = null;
    }
    this.handlers.clear();
    this.metrics = { ...DEFAULT_METRICS };
  }
}

export default SilentPushNotificationHandler;
