/**
 * Background Notification Handler
 * Handles background notification processing, retry queue, and delivery tracking.
 * Uses expo-background-fetch for periodic background task execution.
 */

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKGROUND_FETCH_TASK = 'BACKGROUND_NOTIFICATION_FETCH';
const STORAGE_KEYS = {
  RETRY_QUEUE: '@pn006/retry_queue',
  DELIVERY_STATE: '@pn006/delivery_state',
};

export interface RetryQueueItem {
  id: string;
  notificationId: string;
  payload: Record<string, unknown>;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: number;
  createdAt: number;
  lastError?: string;
}

export interface DeliveryRecord {
  notificationId: string;
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  sentAt: number;
  deliveredAt?: number;
  failedAt?: number;
  retryCount: number;
  error?: string;
}

export interface DeliveryStats {
  total: number;
  delivered: number;
  failed: number;
  pending: number;
  retrying: number;
  deliveryRate: number;
}

// Define the background fetch task
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    const handler = BackgroundNotificationHandler.getInstance();
    await handler.processRetryQueue();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background fetch task failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

class BackgroundNotificationHandler {
  private static instance: BackgroundNotificationHandler;
  private retryQueue: RetryQueueItem[] = [];
  private deliveryState: Map<string, DeliveryRecord> = new Map();
  private isProcessing = false;
  private deliveryListener?: Notifications.Subscription;

  static getInstance(): BackgroundNotificationHandler {
    if (!BackgroundNotificationHandler.instance) {
      BackgroundNotificationHandler.instance = new BackgroundNotificationHandler();
    }
    return BackgroundNotificationHandler.instance;
  }

  /**
   * Register the background fetch task with the system
   */
  async registerBackgroundFetch(): Promise<boolean> {
    try {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: 15 * 60, // 15 minutes minimum
        stopOnTerminate: false,
        startOnBoot: true,
      });

      // Restore persisted state
      await this.restoreState();

      // Set up delivery confirmation listener
      this.setupDeliveryListener();

      console.log('Background notification fetch registered');
      return true;
    } catch (error) {
      console.error('Failed to register background fetch:', error);
      return false;
    }
  }

  /**
   * Unregister the background fetch task
   */
  async unregisterBackgroundFetch(): Promise<void> {
    try {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
      this.deliveryListener?.remove();
      this.deliveryListener = undefined;
      console.log('Background notification fetch unregistered');
    } catch (error) {
      console.error('Failed to unregister background fetch:', error);
    }
  }

  /**
   * Track a notification that was sent, adding it to the delivery state
   */
  async trackNotificationSent(notificationId: string, payload: Record<string, unknown> = {}): Promise<void> {
    const record: DeliveryRecord = {
      notificationId,
      status: 'pending',
      sentAt: Date.now(),
      retryCount: 0,
    };

    this.deliveryState.set(notificationId, record);
    await this.persistState();
  }

  /**
   * Confirm that a notification was delivered
   */
  async confirmDelivery(notificationId: string): Promise<void> {
    const record = this.deliveryState.get(notificationId);
    if (record) {
      record.status = 'delivered';
      record.deliveredAt = Date.now();
      this.deliveryState.set(notificationId, record);
      await this.persistState();
    }
  }

  /**
   * Record a delivery failure and add to retry queue if retries remain
   */
  async recordFailure(
    notificationId: string,
    payload: Record<string, unknown>,
    error: string,
    maxRetries = 5
  ): Promise<void> {
    const record = this.deliveryState.get(notificationId) || {
      notificationId,
      status: 'pending' as const,
      sentAt: Date.now(),
      retryCount: 0,
    };

    record.retryCount += 1;

    if (record.retryCount >= maxRetries) {
      record.status = 'failed';
      record.failedAt = Date.now();
      record.error = error;
      this.deliveryState.set(notificationId, record);
      // Remove from retry queue if present
      this.retryQueue = this.retryQueue.filter((item) => item.notificationId !== notificationId);
    } else {
      record.status = 'retrying';
      record.error = error;
      this.deliveryState.set(notificationId, record);

      // Add or update retry queue entry
      const existingIndex = this.retryQueue.findIndex((item) => item.notificationId === notificationId);
      const retryItem: RetryQueueItem = {
        id: `retry-${notificationId}-${record.retryCount}`,
        notificationId,
        payload,
        retryCount: record.retryCount,
        maxRetries,
        nextRetryAt: Date.now() + this.calculateBackoff(record.retryCount),
        createdAt: existingIndex >= 0 ? this.retryQueue[existingIndex].createdAt : Date.now(),
        lastError: error,
      };

      if (existingIndex >= 0) {
        this.retryQueue[existingIndex] = retryItem;
      } else {
        this.retryQueue.push(retryItem);
      }
    }

    await this.persistState();
  }

  /**
   * Process all items in the retry queue that are due
   */
  async processRetryQueue(): Promise<number> {
    if (this.isProcessing) return 0;
    this.isProcessing = true;

    let processed = 0;
    const now = Date.now();

    try {
      const dueItems = this.retryQueue.filter((item) => item.nextRetryAt <= now);

      for (const item of dueItems) {
        try {
          // Attempt redelivery via local notification as a fallback
          await Notifications.scheduleNotificationAsync({
            content: {
              title: (item.payload.title as string) || 'Notification',
              body: (item.payload.body as string) || '',
              data: item.payload,
            },
            trigger: null,
          });

          // Mark as delivered
          await this.confirmDelivery(item.notificationId);

          // Remove from retry queue
          this.retryQueue = this.retryQueue.filter((q) => q.notificationId !== item.notificationId);
          processed++;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          await this.recordFailure(item.notificationId, item.payload, errorMsg, item.maxRetries);
        }
      }

      await this.persistState();
    } finally {
      this.isProcessing = false;
    }

    return processed;
  }

  /**
   * Manually retry all failed deliveries
   */
  async retryFailedDeliveries(): Promise<number> {
    // Reset failed items to retrying status and add back to queue
    let resetCount = 0;
    for (const [id, record] of this.deliveryState.entries()) {
      if (record.status === 'failed') {
        record.status = 'retrying';
        record.retryCount = 0;
        record.failedAt = undefined;
        record.error = undefined;
        this.deliveryState.set(id, record);

        this.retryQueue.push({
          id: `retry-${id}-manual`,
          notificationId: id,
          payload: {},
          retryCount: 0,
          maxRetries: 3,
          nextRetryAt: Date.now(),
          createdAt: Date.now(),
        });
        resetCount++;
      }
    }

    if (resetCount > 0) {
      await this.persistState();
      return this.processRetryQueue();
    }

    return 0;
  }

  /**
   * Get current delivery statistics
   */
  getDeliveryStats(): DeliveryStats {
    let delivered = 0;
    let failed = 0;
    let pending = 0;
    let retrying = 0;

    for (const record of this.deliveryState.values()) {
      switch (record.status) {
        case 'delivered':
          delivered++;
          break;
        case 'failed':
          failed++;
          break;
        case 'pending':
          pending++;
          break;
        case 'retrying':
          retrying++;
          break;
      }
    }

    const total = delivered + failed + pending + retrying;
    const deliveryRate = total > 0 ? (delivered / total) * 100 : 100;

    return { total, delivered, failed, pending, retrying, deliveryRate };
  }

  /**
   * Get the current retry queue
   */
  getRetryQueue(): RetryQueueItem[] {
    return [...this.retryQueue];
  }

  /**
   * Clear all delivery state and retry queue
   */
  async clearState(): Promise<void> {
    this.retryQueue = [];
    this.deliveryState.clear();
    await AsyncStorage.multiRemove([STORAGE_KEYS.RETRY_QUEUE, STORAGE_KEYS.DELIVERY_STATE]);
  }

  /**
   * Set up listener to auto-confirm delivery when notifications are presented
   */
  private setupDeliveryListener(): void {
    this.deliveryListener = Notifications.addNotificationReceivedListener((notification) => {
      const notificationId = notification.request.identifier;
      if (this.deliveryState.has(notificationId)) {
        this.confirmDelivery(notificationId);
      }
    });
  }

  /**
   * Calculate exponential backoff delay
   * Delays: 1s, 2s, 4s, 8s, 16s (capped at 5 minutes)
   */
  private calculateBackoff(retryCount: number): number {
    const baseDelay = 1000;
    const maxDelay = 5 * 60 * 1000;
    return Math.min(maxDelay, baseDelay * Math.pow(2, retryCount));
  }

  /**
   * Persist delivery state and retry queue to AsyncStorage
   */
  private async persistState(): Promise<void> {
    try {
      const deliveryEntries = Array.from(this.deliveryState.entries());
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.RETRY_QUEUE, JSON.stringify(this.retryQueue)],
        [STORAGE_KEYS.DELIVERY_STATE, JSON.stringify(deliveryEntries)],
      ]);
    } catch (error) {
      console.error('Failed to persist delivery state:', error);
    }
  }

  /**
   * Restore delivery state and retry queue from AsyncStorage
   */
  private async restoreState(): Promise<void> {
    try {
      const results = await AsyncStorage.multiGet([
        STORAGE_KEYS.RETRY_QUEUE,
        STORAGE_KEYS.DELIVERY_STATE,
      ]);

      const retryQueueData = results[0][1];
      const deliveryStateData = results[1][1];

      if (retryQueueData) {
        this.retryQueue = JSON.parse(retryQueueData);
      }

      if (deliveryStateData) {
        const entries: [string, DeliveryRecord][] = JSON.parse(deliveryStateData);
        this.deliveryState = new Map(entries);
      }
    } catch (error) {
      console.error('Failed to restore delivery state:', error);
    }
  }
}

export default BackgroundNotificationHandler.getInstance();
