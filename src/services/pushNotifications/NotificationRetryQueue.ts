/**
 * Notification Retry Queue
 *
 * Persists failed notifications and retries with exponential backoff.
 * Network-aware: pauses when offline, resumes when connectivity returns.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

const RETRY_QUEUE_KEY = '@hearth/notification_retry_queue';
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

export interface RetryableNotification {
  id: string;
  payload: Record<string, unknown>;
  retryCount: number;
  nextRetryAt: number;
  createdAt: number;
  lastError?: string;
}

export type DeliveryFunction = (
  notification: RetryableNotification
) => Promise<boolean>;

class NotificationRetryQueue {
  private queue: RetryableNotification[] = [];
  private isProcessing = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private isOnline = true;
  private netInfoUnsubscribe: (() => void) | null = null;
  private deliveryFn: DeliveryFunction | null = null;

  /**
   * Initialize the retry queue, restoring persisted entries and subscribing to network state.
   */
  async initialize(deliveryFn: DeliveryFunction): Promise<void> {
    this.deliveryFn = deliveryFn;
    await this.loadQueue();

    this.netInfoUnsubscribe = NetInfo.addEventListener(
      (state: NetInfoState) => {
        const wasOffline = !this.isOnline;
        this.isOnline = !!state.isConnected;

        if (wasOffline && this.isOnline) {
          console.log('[RetryQueue] Back online, processing queue');
          this.processQueue();
        }
      }
    );

    // Start processing any persisted items
    if (this.queue.length > 0) {
      this.processQueue();
    }
  }

  /**
   * Enqueue a failed notification for retry.
   */
  async enqueue(
    id: string,
    payload: Record<string, unknown>,
    error?: string
  ): Promise<void> {
    const existing = this.queue.find((n) => n.id === id);
    if (existing) {
      return; // Already queued
    }

    const entry: RetryableNotification = {
      id,
      payload,
      retryCount: 0,
      nextRetryAt: Date.now() + BASE_DELAY_MS,
      createdAt: Date.now(),
      lastError: error,
    };

    this.queue.push(entry);
    await this.persistQueue();
    console.log(`[RetryQueue] Enqueued notification ${id}`);
    this.scheduleNextRetry();
  }

  /**
   * Remove a notification from the queue (e.g. on successful delivery).
   */
  async dequeue(id: string): Promise<void> {
    this.queue = this.queue.filter((n) => n.id !== id);
    await this.persistQueue();
  }

  /**
   * Get the current queue contents.
   */
  getQueue(): ReadonlyArray<RetryableNotification> {
    return this.queue;
  }

  /**
   * Get the number of items in the queue.
   */
  get size(): number {
    return this.queue.length;
  }

  /**
   * Process all due items in the queue.
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || !this.isOnline || !this.deliveryFn) {
      return;
    }

    this.isProcessing = true;

    try {
      const now = Date.now();
      const dueItems = this.queue.filter((n) => n.nextRetryAt <= now);

      for (const item of dueItems) {
        if (!this.isOnline) {
          break;
        }

        try {
          const success = await this.deliveryFn(item);

          if (success) {
            console.log(
              `[RetryQueue] Notification ${item.id} delivered on retry ${item.retryCount + 1}`
            );
            await this.dequeue(item.id);
          } else {
            await this.handleRetryFailure(item, 'Delivery returned false');
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          await this.handleRetryFailure(item, message);
        }
      }
    } finally {
      this.isProcessing = false;
      this.scheduleNextRetry();
    }
  }

  /**
   * Clear all items from the queue.
   */
  async clear(): Promise<void> {
    this.queue = [];
    await this.persistQueue();
  }

  /**
   * Clean up resources.
   */
  cleanup(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.netInfoUnsubscribe?.();
    this.netInfoUnsubscribe = null;
  }

  private async handleRetryFailure(
    item: RetryableNotification,
    error: string
  ): Promise<void> {
    item.retryCount += 1;
    item.lastError = error;

    if (item.retryCount >= MAX_RETRIES) {
      console.warn(
        `[RetryQueue] Notification ${item.id} exhausted ${MAX_RETRIES} retries, removing`
      );
      await this.dequeue(item.id);
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = BASE_DELAY_MS * Math.pow(2, item.retryCount - 1);
    item.nextRetryAt = Date.now() + delay;
    await this.persistQueue();
    console.log(
      `[RetryQueue] Notification ${item.id} retry ${item.retryCount}/${MAX_RETRIES} in ${delay}ms`
    );
  }

  private scheduleNextRetry(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    if (this.queue.length === 0 || !this.isOnline) {
      return;
    }

    const nextDue = Math.min(...this.queue.map((n) => n.nextRetryAt));
    const delay = Math.max(0, nextDue - Date.now());

    this.retryTimer = setTimeout(() => {
      this.processQueue();
    }, delay);
  }

  private async loadQueue(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(RETRY_QUEUE_KEY);
      this.queue = raw ? JSON.parse(raw) : [];
      console.log(`[RetryQueue] Loaded ${this.queue.length} persisted items`);
    } catch (error) {
      console.error('[RetryQueue] Failed to load queue:', error);
      this.queue = [];
    }
  }

  private async persistQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(RETRY_QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('[RetryQueue] Failed to persist queue:', error);
    }
  }
}

export default new NotificationRetryQueue();
