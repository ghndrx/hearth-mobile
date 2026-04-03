/**
 * Delivery Receipt Service
 *
 * Tracks notification delivery receipts, detects failures,
 * triggers retries, and reports delivery metrics.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const METRICS_KEY = '@hearth/delivery_metrics';

export type DeliveryStatus = 'pending' | 'delivered' | 'failed' | 'retrying';

export interface DeliveryReceipt {
  notificationId: string;
  status: DeliveryStatus;
  timestamp: number;
  platform: 'ios' | 'android';
  error?: string;
  retryCount: number;
}

export interface DeliveryMetrics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalRetried: number;
  successRate: number;
  lastUpdated: number;
}

export type OnDeliveryFailure = (
  notificationId: string,
  error: string
) => void;

class DeliveryReceiptService {
  private receipts: Map<string, DeliveryReceipt> = new Map();
  private metrics: DeliveryMetrics = {
    totalSent: 0,
    totalDelivered: 0,
    totalFailed: 0,
    totalRetried: 0,
    successRate: 1,
    lastUpdated: Date.now(),
  };
  private onFailureCallback: OnDeliveryFailure | null = null;

  /**
   * Initialize service and restore persisted metrics.
   */
  async initialize(
    onFailure?: OnDeliveryFailure
  ): Promise<void> {
    this.onFailureCallback = onFailure ?? null;
    await this.loadMetrics();
    console.log('[DeliveryReceipt] Initialized');
  }

  /**
   * Register that a notification was sent and is pending delivery.
   */
  trackSent(
    notificationId: string,
    platform: 'ios' | 'android'
  ): void {
    const receipt: DeliveryReceipt = {
      notificationId,
      status: 'pending',
      timestamp: Date.now(),
      platform,
      retryCount: 0,
    };
    this.receipts.set(notificationId, receipt);
    this.metrics.totalSent++;
    this.updateSuccessRate();
  }

  /**
   * Acknowledge successful delivery of a notification.
   */
  async acknowledgeDelivery(notificationId: string): Promise<void> {
    const receipt = this.receipts.get(notificationId);
    if (receipt) {
      receipt.status = 'delivered';
      receipt.timestamp = Date.now();
      this.metrics.totalDelivered++;
      this.updateSuccessRate();
      await this.persistMetrics();
    }
  }

  /**
   * Record a delivery failure and trigger retry callback.
   */
  async recordFailure(
    notificationId: string,
    error: string
  ): Promise<void> {
    const receipt = this.receipts.get(notificationId);
    if (receipt) {
      receipt.status = 'failed';
      receipt.error = error;
      receipt.timestamp = Date.now();
    }

    this.metrics.totalFailed++;
    this.updateSuccessRate();
    await this.persistMetrics();

    console.warn(
      `[DeliveryReceipt] Notification ${notificationId} failed: ${error}`
    );
    this.onFailureCallback?.(notificationId, error);
  }

  /**
   * Mark a notification as being retried.
   */
  markRetrying(notificationId: string): void {
    const receipt = this.receipts.get(notificationId);
    if (receipt) {
      receipt.status = 'retrying';
      receipt.retryCount++;
      receipt.timestamp = Date.now();
      this.metrics.totalRetried++;
    }
  }

  /**
   * Get the delivery receipt for a notification.
   */
  getReceipt(notificationId: string): DeliveryReceipt | undefined {
    return this.receipts.get(notificationId);
  }

  /**
   * Get current delivery metrics.
   */
  getMetrics(): Readonly<DeliveryMetrics> {
    return { ...this.metrics };
  }

  /**
   * Get current delivery success rate (0-1).
   */
  getSuccessRate(): number {
    return this.metrics.successRate;
  }

  /**
   * Check if a specific notification was delivered.
   */
  isDelivered(notificationId: string): boolean {
    return this.receipts.get(notificationId)?.status === 'delivered';
  }

  /**
   * Get all pending (unacknowledged) notification IDs.
   */
  getPendingIds(): string[] {
    const pending: string[] = [];
    for (const [id, receipt] of this.receipts) {
      if (receipt.status === 'pending' || receipt.status === 'retrying') {
        pending.push(id);
      }
    }
    return pending;
  }

  /**
   * Reset metrics counters.
   */
  async resetMetrics(): Promise<void> {
    this.metrics = {
      totalSent: 0,
      totalDelivered: 0,
      totalFailed: 0,
      totalRetried: 0,
      successRate: 1,
      lastUpdated: Date.now(),
    };
    this.receipts.clear();
    await this.persistMetrics();
  }

  private updateSuccessRate(): void {
    if (this.metrics.totalSent === 0) {
      this.metrics.successRate = 1;
    } else {
      this.metrics.successRate =
        this.metrics.totalDelivered / this.metrics.totalSent;
    }
    this.metrics.lastUpdated = Date.now();
  }

  private async loadMetrics(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(METRICS_KEY);
      if (raw) {
        this.metrics = JSON.parse(raw);
      }
    } catch (error) {
      console.error('[DeliveryReceipt] Failed to load metrics:', error);
    }
  }

  private async persistMetrics(): Promise<void> {
    try {
      await AsyncStorage.setItem(METRICS_KEY, JSON.stringify(this.metrics));
    } catch (error) {
      console.error('[DeliveryReceipt] Failed to persist metrics:', error);
    }
  }
}

export default new DeliveryReceiptService();
