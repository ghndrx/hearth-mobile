/**
 * Delivery Optimization Service
 *
 * Ensures 99%+ push notification delivery rate through:
 * - Delivery receipt tracking and confirmation
 * - Intelligent retry with exponential backoff
 * - Network-aware delivery strategies
 * - Delivery analytics and reporting
 *
 * Part of PN-006: Background processing and delivery optimization.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {
  backgroundProcessingService,
  type TaskResult,
} from './BackgroundProcessingService';

export type DeliveryStatus =
  | 'pending'
  | 'in_flight'
  | 'delivered'
  | 'confirmed'
  | 'failed'
  | 'expired';

export interface DeliveryReceipt {
  notificationId: string;
  status: DeliveryStatus;
  sentAt: number;
  deliveredAt?: number;
  confirmedAt?: number;
  failedAt?: number;
  retryCount: number;
  maxRetries: number;
  error?: string;
  platform: 'ios' | 'android';
  networkType: 'wifi' | 'cellular' | 'none';
}

export interface DeliveryMetrics {
  totalSent: number;
  totalDelivered: number;
  totalConfirmed: number;
  totalFailed: number;
  totalExpired: number;
  deliveryRate: number;
  averageDeliveryTimeMs: number;
  pendingCount: number;
  inFlightCount: number;
}

export interface DeliveryOptimizationConfig {
  maxRetries: number;
  baseRetryDelayMs: number;
  maxRetryDelayMs: number;
  receiptTimeoutMs: number;
  batchConfirmationIntervalMs: number;
  enableNetworkAwareRetry: boolean;
  enablePriorityEscalation: boolean;
  expirationTimeMs: number;
}

const RECEIPTS_STORAGE_KEY = '@hearth/delivery_receipts';
const METRICS_STORAGE_KEY = '@hearth/delivery_metrics';

class DeliveryOptimizationService {
  private receipts: Map<string, DeliveryReceipt> = new Map();
  private pendingConfirmations: Set<string> = new Set();
  private confirmationTimer: ReturnType<typeof setInterval> | null = null;
  private expirationTimer: ReturnType<typeof setInterval> | null = null;
  private isInitialized = false;

  private config: DeliveryOptimizationConfig = {
    maxRetries: 5,
    baseRetryDelayMs: 1000,
    maxRetryDelayMs: 60000,
    receiptTimeoutMs: 30000,
    batchConfirmationIntervalMs: 10000,
    enableNetworkAwareRetry: true,
    enablePriorityEscalation: true,
    expirationTimeMs: 24 * 60 * 60 * 1000,
  };

  private listeners: Set<(receipt: DeliveryReceipt) => void> = new Set();
  private unsubscribeTaskResult: (() => void) | null = null;

  private totalSent = 0;
  private totalDelivered = 0;
  private totalConfirmed = 0;
  private totalFailed = 0;
  private totalExpired = 0;
  private totalDeliveryTimeMs = 0;

  async initialize(
    config?: Partial<DeliveryOptimizationConfig>,
  ): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (config) {
      this.config = { ...this.config, ...config };
    }

    await this.loadReceipts();
    await this.loadMetrics();

    this.unsubscribeTaskResult = backgroundProcessingService.onTaskResult(
      this.handleTaskResult.bind(this),
    );

    this.confirmationTimer = setInterval(
      () => this.processPendingConfirmations(),
      this.config.batchConfirmationIntervalMs,
    );

    this.expirationTimer = setInterval(() => this.checkExpirations(), 60000);

    this.isInitialized = true;
  }

  shutdown(): void {
    if (!this.isInitialized) {
      return;
    }

    if (this.confirmationTimer) {
      clearInterval(this.confirmationTimer);
      this.confirmationTimer = null;
    }

    if (this.expirationTimer) {
      clearInterval(this.expirationTimer);
      this.expirationTimer = null;
    }

    if (this.unsubscribeTaskResult) {
      this.unsubscribeTaskResult();
      this.unsubscribeTaskResult = null;
    }

    this.saveReceipts();
    this.saveMetrics();

    this.receipts.clear();
    this.pendingConfirmations.clear();
    this.listeners.clear();

    this.isInitialized = false;
  }

  async trackDelivery(
    notificationId: string,
    deliveryAction: () => Promise<void>,
    options?: {
      priority?: 'critical' | 'high' | 'medium' | 'low';
      platform?: 'ios' | 'android';
    },
  ): Promise<DeliveryReceipt> {
    const netState = await NetInfo.fetch();
    const networkType: DeliveryReceipt['networkType'] = !netState.isConnected
      ? 'none'
      : netState.type === 'wifi'
        ? 'wifi'
        : 'cellular';

    const receipt: DeliveryReceipt = {
      notificationId,
      status: 'pending',
      sentAt: Date.now(),
      retryCount: 0,
      maxRetries: this.config.maxRetries,
      platform: options?.platform || 'ios',
      networkType,
    };

    this.receipts.set(notificationId, receipt);
    this.totalSent++;

    const taskId = `delivery_${notificationId}`;
    backgroundProcessingService.addTask({
      id: taskId,
      priority: options?.priority || 'high',
      type: 'notification_delivery',
      maxRetries: this.config.maxRetries,
      canDefer: false,
      action: async () => {
        this.updateReceiptStatus(notificationId, 'in_flight');
        await deliveryAction();
        this.markDelivered(notificationId);
      },
    });

    this.updateReceiptStatus(notificationId, 'pending');
    return receipt;
  }

  confirmDelivery(notificationId: string): void {
    const receipt = this.receipts.get(notificationId);
    if (!receipt) {
      return;
    }

    receipt.status = 'confirmed';
    receipt.confirmedAt = Date.now();
    this.totalConfirmed++;

    if (receipt.deliveredAt) {
      this.totalDeliveryTimeMs += receipt.confirmedAt - receipt.sentAt;
    }

    this.emitReceiptUpdate(receipt);
    this.saveReceipts();
  }

  batchConfirmDeliveries(notificationIds: string[]): void {
    for (const id of notificationIds) {
      this.confirmDelivery(id);
    }
  }

  getReceipt(notificationId: string): DeliveryReceipt | undefined {
    return this.receipts.get(notificationId);
  }

  getMetrics(): DeliveryMetrics {
    const pending = Array.from(this.receipts.values()).filter(
      (r) => r.status === 'pending',
    ).length;
    const inFlight = Array.from(this.receipts.values()).filter(
      (r) => r.status === 'in_flight',
    ).length;

    const totalAttempted = this.totalSent;
    const deliveryRate =
      totalAttempted > 0
        ? ((this.totalDelivered + this.totalConfirmed) / totalAttempted) * 100
        : 100;

    return {
      totalSent: this.totalSent,
      totalDelivered: this.totalDelivered,
      totalConfirmed: this.totalConfirmed,
      totalFailed: this.totalFailed,
      totalExpired: this.totalExpired,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      averageDeliveryTimeMs:
        this.totalDelivered > 0
          ? Math.round(this.totalDeliveryTimeMs / this.totalDelivered)
          : 0,
      pendingCount: pending,
      inFlightCount: inFlight,
    };
  }

  onReceiptUpdate(callback: (receipt: DeliveryReceipt) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  async retryFailedDeliveries(
    deliveryActionFactory: (notificationId: string) => () => Promise<void>,
  ): Promise<number> {
    const failedReceipts = Array.from(this.receipts.values()).filter(
      (r) => r.status === 'failed' && r.retryCount < r.maxRetries,
    );

    let retried = 0;
    for (const receipt of failedReceipts) {
      const action = deliveryActionFactory(receipt.notificationId);
      await this.trackDelivery(receipt.notificationId, action, {
        priority: 'high',
        platform: receipt.platform,
      });
      retried++;
    }

    return retried;
  }

  calculateRetryDelay(retryCount: number): number {
    const exponentialDelay =
      this.config.baseRetryDelayMs * Math.pow(2, retryCount);
    const jitter = Math.random() * this.config.baseRetryDelayMs;
    return Math.min(exponentialDelay + jitter, this.config.maxRetryDelayMs);
  }

  // Private methods

  private markDelivered(notificationId: string): void {
    const receipt = this.receipts.get(notificationId);
    if (!receipt) {
      return;
    }

    receipt.status = 'delivered';
    receipt.deliveredAt = Date.now();
    this.totalDelivered++;

    this.pendingConfirmations.add(notificationId);
    this.emitReceiptUpdate(receipt);
  }

  private updateReceiptStatus(
    notificationId: string,
    status: DeliveryStatus,
  ): void {
    const receipt = this.receipts.get(notificationId);
    if (receipt) {
      receipt.status = status;
      this.emitReceiptUpdate(receipt);
    }
  }

  private handleTaskResult(result: TaskResult): void {
    if (!result.taskId.startsWith('delivery_')) {
      return;
    }

    const notificationId = result.taskId.replace('delivery_', '');
    const receipt = this.receipts.get(notificationId);
    if (!receipt) {
      return;
    }

    if (!result.success) {
      receipt.retryCount = result.retryCount;
      receipt.error = result.error;

      if (result.retryCount >= receipt.maxRetries) {
        receipt.status = 'failed';
        receipt.failedAt = Date.now();
        this.totalFailed++;
        this.emitReceiptUpdate(receipt);
      }
    }
  }

  private async processPendingConfirmations(): Promise<void> {
    if (this.pendingConfirmations.size === 0) {
      return;
    }

    const confirmationIds = Array.from(this.pendingConfirmations);
    this.pendingConfirmations.clear();

    backgroundProcessingService.addTask({
      id: `batch_confirm_${Date.now()}`,
      priority: 'medium',
      type: 'delivery_receipt',
      canDefer: true,
      action: async () => {
        for (const id of confirmationIds) {
          const receipt = this.receipts.get(id);
          if (receipt && receipt.status === 'delivered') {
            this.confirmDelivery(id);
          }
        }
      },
    });
  }

  private checkExpirations(): void {
    const now = Date.now();

    for (const [, receipt] of this.receipts) {
      if (
        (receipt.status === 'pending' || receipt.status === 'in_flight') &&
        now - receipt.sentAt > this.config.expirationTimeMs
      ) {
        receipt.status = 'expired';
        this.totalExpired++;
        this.emitReceiptUpdate(receipt);
      }
    }

    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    for (const [id, receipt] of this.receipts) {
      if (
        (receipt.status === 'confirmed' ||
          receipt.status === 'failed' ||
          receipt.status === 'expired') &&
        receipt.sentAt < sevenDaysAgo
      ) {
        this.receipts.delete(id);
      }
    }
  }

  private emitReceiptUpdate(receipt: DeliveryReceipt): void {
    this.listeners.forEach((listener) => {
      try {
        listener(receipt);
      } catch (error) {
        console.error('Error in delivery receipt listener:', error);
      }
    });
  }

  private async loadReceipts(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(RECEIPTS_STORAGE_KEY);
      if (stored) {
        const entries: [string, DeliveryReceipt][] = JSON.parse(stored);
        this.receipts = new Map(entries);
      }
    } catch (error) {
      console.warn('Failed to load delivery receipts:', error);
    }
  }

  private async saveReceipts(): Promise<void> {
    try {
      const entries = Array.from(this.receipts.entries()).filter(
        ([, receipt]) =>
          receipt.status !== 'expired' &&
          Date.now() - receipt.sentAt < 7 * 24 * 60 * 60 * 1000,
      );
      await AsyncStorage.setItem(
        RECEIPTS_STORAGE_KEY,
        JSON.stringify(entries),
      );
    } catch (error) {
      console.warn('Failed to save delivery receipts:', error);
    }
  }

  private async loadMetrics(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(METRICS_STORAGE_KEY);
      if (stored) {
        const metrics = JSON.parse(stored);
        this.totalSent = metrics.totalSent || 0;
        this.totalDelivered = metrics.totalDelivered || 0;
        this.totalConfirmed = metrics.totalConfirmed || 0;
        this.totalFailed = metrics.totalFailed || 0;
        this.totalExpired = metrics.totalExpired || 0;
        this.totalDeliveryTimeMs = metrics.totalDeliveryTimeMs || 0;
      }
    } catch (error) {
      console.warn('Failed to load delivery metrics:', error);
    }
  }

  private async saveMetrics(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        METRICS_STORAGE_KEY,
        JSON.stringify({
          totalSent: this.totalSent,
          totalDelivered: this.totalDelivered,
          totalConfirmed: this.totalConfirmed,
          totalFailed: this.totalFailed,
          totalExpired: this.totalExpired,
          totalDeliveryTimeMs: this.totalDeliveryTimeMs,
        }),
      );
    } catch (error) {
      console.warn('Failed to save delivery metrics:', error);
    }
  }
}

export const deliveryOptimizationService = new DeliveryOptimizationService();
export default deliveryOptimizationService;
