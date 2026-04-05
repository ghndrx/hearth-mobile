/**
 * Notification Delivery Tracking Service (PN-006)
 * Tracks delivery confirmations, maintains delivery rate metrics,
 * and manages a retry queue with exponential backoff for failed deliveries.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';

const DELIVERY_LOG_KEY = '@hearth/notification_delivery_log';
const DELIVERY_METRICS_KEY = '@hearth/notification_delivery_metrics';
const PENDING_CONFIRMATIONS_KEY = '@hearth/pending_delivery_confirmations';

export type DeliveryStatus = 'pending' | 'delivered' | 'failed' | 'expired' | 'retrying';

export interface DeliveryRecord {
  notificationId: string;
  messageId?: string;
  channelId?: string;
  serverId?: string;
  status: DeliveryStatus;
  sentAt: number;
  deliveredAt?: number;
  failedAt?: number;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: number;
  expiresAt: number;
  platform: 'ios' | 'android';
}

export interface DeliveryMetrics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalExpired: number;
  deliveryRate: number; // 0-100 percentage
  averageDeliveryTime: number; // ms
  lastUpdated: number;
  // Rolling window metrics (last 24h)
  recentSent: number;
  recentDelivered: number;
  recentDeliveryRate: number;
}

export interface RetryQueueEntry {
  record: DeliveryRecord;
  backoffMs: number;
  scheduledAt: number;
}

const DEFAULT_METRICS: DeliveryMetrics = {
  totalSent: 0,
  totalDelivered: 0,
  totalFailed: 0,
  totalExpired: 0,
  deliveryRate: 100,
  averageDeliveryTime: 0,
  lastUpdated: Date.now(),
  recentSent: 0,
  recentDelivered: 0,
  recentDeliveryRate: 100,
};

const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 300000; // 5 minutes
const NOTIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RETRY_PROCESS_INTERVAL_MS = 10000; // 10 seconds
const MAX_DELIVERY_LOG_SIZE = 500;

class NotificationDeliveryTrackingService {
  private static instance: NotificationDeliveryTrackingService;
  private deliveryLog: Map<string, DeliveryRecord> = new Map();
  private retryQueue: RetryQueueEntry[] = [];
  private metrics: DeliveryMetrics = { ...DEFAULT_METRICS };
  private retryInterval: NodeJS.Timeout | null = null;
  private isProcessingRetries = false;
  private onDeliveryAttempt?: (record: DeliveryRecord) => Promise<boolean>;

  private constructor() {
    this.initialize();
  }

  static getInstance(): NotificationDeliveryTrackingService {
    if (!NotificationDeliveryTrackingService.instance) {
      NotificationDeliveryTrackingService.instance = new NotificationDeliveryTrackingService();
    }
    return NotificationDeliveryTrackingService.instance;
  }

  private async initialize(): Promise<void> {
    await this.loadPersistedState();
    this.startRetryProcessing();

    AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        this.processRetryQueue();
      }
    });
  }

  private async loadPersistedState(): Promise<void> {
    try {
      const [logData, metricsData, pendingData] = await Promise.all([
        AsyncStorage.getItem(DELIVERY_LOG_KEY),
        AsyncStorage.getItem(DELIVERY_METRICS_KEY),
        AsyncStorage.getItem(PENDING_CONFIRMATIONS_KEY),
      ]);

      if (logData) {
        const entries: DeliveryRecord[] = JSON.parse(logData);
        for (const entry of entries) {
          this.deliveryLog.set(entry.notificationId, entry);
        }
      }

      if (metricsData) {
        this.metrics = { ...DEFAULT_METRICS, ...JSON.parse(metricsData) };
      }

      if (pendingData) {
        const pending: RetryQueueEntry[] = JSON.parse(pendingData);
        this.retryQueue = pending.filter(
          (entry) => entry.record.expiresAt > Date.now()
        );
      }
    } catch (error) {
      console.warn('Failed to load delivery tracking state:', error);
    }
  }

  private async persistState(): Promise<void> {
    try {
      const logEntries = Array.from(this.deliveryLog.values())
        .sort((a, b) => b.sentAt - a.sentAt)
        .slice(0, MAX_DELIVERY_LOG_SIZE);

      await Promise.all([
        AsyncStorage.setItem(DELIVERY_LOG_KEY, JSON.stringify(logEntries)),
        AsyncStorage.setItem(DELIVERY_METRICS_KEY, JSON.stringify(this.metrics)),
        AsyncStorage.setItem(PENDING_CONFIRMATIONS_KEY, JSON.stringify(this.retryQueue)),
      ]);
    } catch (error) {
      console.warn('Failed to persist delivery tracking state:', error);
    }
  }

  /**
   * Register a callback for delivery retry attempts.
   * The callback should return true if delivery succeeded, false otherwise.
   */
  setDeliveryAttemptHandler(handler: (record: DeliveryRecord) => Promise<boolean>): void {
    this.onDeliveryAttempt = handler;
  }

  /**
   * Track a new notification being sent
   */
  trackNotificationSent(
    notificationId: string,
    platform: 'ios' | 'android',
    metadata?: { messageId?: string; channelId?: string; serverId?: string }
  ): DeliveryRecord {
    const record: DeliveryRecord = {
      notificationId,
      messageId: metadata?.messageId,
      channelId: metadata?.channelId,
      serverId: metadata?.serverId,
      status: 'pending',
      sentAt: Date.now(),
      retryCount: 0,
      maxRetries: MAX_RETRIES,
      expiresAt: Date.now() + NOTIFICATION_TTL_MS,
      platform,
    };

    this.deliveryLog.set(notificationId, record);
    this.metrics.totalSent++;
    this.metrics.recentSent++;
    this.updateDeliveryRate();
    this.persistState();

    return record;
  }

  /**
   * Confirm a notification was successfully delivered
   */
  confirmDelivery(notificationId: string): void {
    const record = this.deliveryLog.get(notificationId);
    if (!record) return;

    record.status = 'delivered';
    record.deliveredAt = Date.now();

    this.metrics.totalDelivered++;
    this.metrics.recentDelivered++;

    // Update average delivery time
    const deliveryTime = record.deliveredAt - record.sentAt;
    this.metrics.averageDeliveryTime =
      (this.metrics.averageDeliveryTime * (this.metrics.totalDelivered - 1) + deliveryTime) /
      this.metrics.totalDelivered;

    this.updateDeliveryRate();

    // Remove from retry queue if present
    this.retryQueue = this.retryQueue.filter(
      (entry) => entry.record.notificationId !== notificationId
    );

    this.persistState();
  }

  /**
   * Report a delivery failure and enqueue for retry
   */
  reportFailure(notificationId: string, reason: string): void {
    const record = this.deliveryLog.get(notificationId);
    if (!record) return;

    record.failedAt = Date.now();
    record.failureReason = reason;

    if (record.retryCount < record.maxRetries && record.expiresAt > Date.now()) {
      record.status = 'retrying';
      record.retryCount++;
      const backoffMs = this.calculateBackoff(record.retryCount);
      record.nextRetryAt = Date.now() + backoffMs;

      this.retryQueue.push({
        record,
        backoffMs,
        scheduledAt: record.nextRetryAt,
      });
    } else {
      record.status = record.expiresAt <= Date.now() ? 'expired' : 'failed';

      if (record.status === 'failed') {
        this.metrics.totalFailed++;
      } else {
        this.metrics.totalExpired++;
      }

      this.updateDeliveryRate();
    }

    this.persistState();
  }

  private calculateBackoff(retryCount: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = BASE_BACKOFF_MS * Math.pow(2, retryCount - 1);
    const jitter = exponentialDelay * 0.1 * Math.random();
    return Math.min(exponentialDelay + jitter, MAX_BACKOFF_MS);
  }

  private startRetryProcessing(): void {
    if (this.retryInterval) return;

    this.retryInterval = setInterval(() => {
      this.processRetryQueue();
    }, RETRY_PROCESS_INTERVAL_MS);
  }

  private stopRetryProcessing(): void {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }
  }

  async processRetryQueue(): Promise<void> {
    if (this.isProcessingRetries || this.retryQueue.length === 0) return;

    // Check network
    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) return;

    this.isProcessingRetries = true;

    try {
      const now = Date.now();
      const readyEntries = this.retryQueue.filter(
        (entry) => entry.scheduledAt <= now && entry.record.expiresAt > now
      );

      // Remove expired entries
      this.retryQueue = this.retryQueue.filter(
        (entry) => entry.record.expiresAt > now
      );

      for (const entry of readyEntries) {
        const { record } = entry;

        if (this.onDeliveryAttempt) {
          try {
            const success = await this.onDeliveryAttempt(record);
            if (success) {
              this.confirmDelivery(record.notificationId);
            } else {
              // Re-enqueue if not at max retries
              this.reportFailure(record.notificationId, 'Retry delivery failed');
            }
          } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            this.reportFailure(record.notificationId, msg);
          }
        } else {
          // No handler registered - mark as failed
          record.status = 'failed';
          this.metrics.totalFailed++;
          this.updateDeliveryRate();
        }

        // Remove from retry queue (reportFailure will re-add if needed)
        this.retryQueue = this.retryQueue.filter(
          (e) => e.record.notificationId !== record.notificationId
        );
      }

      this.persistState();
    } finally {
      this.isProcessingRetries = false;
    }
  }

  private updateDeliveryRate(): void {
    if (this.metrics.totalSent > 0) {
      this.metrics.deliveryRate =
        (this.metrics.totalDelivered / this.metrics.totalSent) * 100;
    }

    if (this.metrics.recentSent > 0) {
      this.metrics.recentDeliveryRate =
        (this.metrics.recentDelivered / this.metrics.recentSent) * 100;
    }

    this.metrics.lastUpdated = Date.now();
  }

  // Public API

  getDeliveryRecord(notificationId: string): DeliveryRecord | undefined {
    return this.deliveryLog.get(notificationId);
  }

  getMetrics(): DeliveryMetrics {
    return { ...this.metrics };
  }

  getRetryQueueSize(): number {
    return this.retryQueue.length;
  }

  getPendingDeliveries(): DeliveryRecord[] {
    return Array.from(this.deliveryLog.values()).filter(
      (r) => r.status === 'pending' || r.status === 'retrying'
    );
  }

  /**
   * Reset rolling window metrics (call periodically, e.g., every 24h)
   */
  resetRecentMetrics(): void {
    this.metrics.recentSent = 0;
    this.metrics.recentDelivered = 0;
    this.metrics.recentDeliveryRate = 100;
    this.persistState();
  }

  /**
   * Clean up old delivery records beyond retention window
   */
  async pruneOldRecords(retentionMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    const cutoff = Date.now() - retentionMs;
    let pruned = 0;

    for (const [id, record] of this.deliveryLog.entries()) {
      if (record.sentAt < cutoff) {
        this.deliveryLog.delete(id);
        pruned++;
      }
    }

    if (pruned > 0) {
      await this.persistState();
    }

    return pruned;
  }

  destroy(): void {
    this.stopRetryProcessing();
    this.deliveryLog.clear();
    this.retryQueue = [];
    this.metrics = { ...DEFAULT_METRICS };
  }
}

export default NotificationDeliveryTrackingService;
