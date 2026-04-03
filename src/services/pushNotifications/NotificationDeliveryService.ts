/**
 * Notification Delivery Service
 *
 * Routes notifications through the delivery pipeline with receipt tracking,
 * retry queue integration, and delivery metrics logging.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import DeliveryReceiptService from './DeliveryReceiptService';
import NotificationRetryQueue, {
  RetryableNotification,
} from './NotificationRetryQueue';

export interface DeliveryPayload {
  id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority?: 'high' | 'normal' | 'low';
  channelId?: string;
}

class NotificationDeliveryService {
  private isInitialized = false;

  /**
   * Initialize delivery service with retry queue and receipt tracking.
   */
  async initialize(): Promise<void> {
    // Initialize receipt service with failure callback that enqueues retries
    await DeliveryReceiptService.initialize(
      async (notificationId: string, error: string) => {
        const receipt = DeliveryReceiptService.getReceipt(notificationId);
        if (receipt) {
          await NotificationRetryQueue.enqueue(
            notificationId,
            { notificationId },
            error
          );
        }
      }
    );

    // Initialize retry queue with a delivery function
    await NotificationRetryQueue.initialize(
      async (notification: RetryableNotification) => {
        return await this.attemptDelivery(notification.id, notification.payload);
      }
    );

    this.isInitialized = true;
    console.log('[DeliveryService] Initialized');
  }

  /**
   * Deliver a notification through the pipeline.
   * Tracks receipt, retries on failure.
   */
  async deliver(payload: DeliveryPayload): Promise<boolean> {
    const platform = Platform.OS as 'ios' | 'android';
    DeliveryReceiptService.trackSent(payload.id, platform);

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: payload.title,
          body: payload.body,
          data: payload.data,
        },
        trigger: null, // Immediate delivery
      });

      await DeliveryReceiptService.acknowledgeDelivery(payload.id);
      this.logDeliveryMetrics('delivered', payload.id);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await DeliveryReceiptService.recordFailure(payload.id, message);
      this.logDeliveryMetrics('failed', payload.id, message);

      // Enqueue for retry
      await NotificationRetryQueue.enqueue(
        payload.id,
        {
          title: payload.title,
          body: payload.body,
          data: payload.data,
          priority: payload.priority,
          channelId: payload.channelId,
        },
        message
      );

      return false;
    }
  }

  /**
   * Get current delivery metrics.
   */
  getMetrics() {
    return DeliveryReceiptService.getMetrics();
  }

  /**
   * Get current retry queue size.
   */
  getRetryQueueSize(): number {
    return NotificationRetryQueue.size;
  }

  /**
   * Clean up all sub-services.
   */
  cleanup(): void {
    NotificationRetryQueue.cleanup();
    this.isInitialized = false;
  }

  private async attemptDelivery(
    id: string,
    payload: Record<string, unknown>
  ): Promise<boolean> {
    try {
      DeliveryReceiptService.markRetrying(id);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: (payload.title as string) || '',
          body: (payload.body as string) || '',
          data: (payload.data as Record<string, unknown>) || {},
        },
        trigger: null,
      });

      await DeliveryReceiptService.acknowledgeDelivery(id);
      this.logDeliveryMetrics('retry-delivered', id);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logDeliveryMetrics('retry-failed', id, message);
      return false;
    }
  }

  private logDeliveryMetrics(
    event: string,
    notificationId: string,
    error?: string
  ): void {
    const metrics = DeliveryReceiptService.getMetrics();
    console.log(
      `[DeliveryService] ${event} id=${notificationId} ` +
        `rate=${(metrics.successRate * 100).toFixed(1)}% ` +
        `sent=${metrics.totalSent} delivered=${metrics.totalDelivered} ` +
        `failed=${metrics.totalFailed} retried=${metrics.totalRetried}` +
        (error ? ` error=${error}` : '')
    );
  }
}

export default new NotificationDeliveryService();
