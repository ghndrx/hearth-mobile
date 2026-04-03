/**
 * Background Delivery Optimizer
 *
 * Battery-aware and network-aware delivery scheduling.
 * Batches low-priority notifications and prioritizes high-priority ones.
 */

import { Platform } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import * as Battery from 'expo-battery';

export type NotificationPriority = 'high' | 'normal' | 'low';

export interface QueuedDelivery {
  id: string;
  payload: Record<string, unknown>;
  priority: NotificationPriority;
  queuedAt: number;
}

export type DeliverBatchFn = (items: QueuedDelivery[]) => Promise<void>;

const LOW_BATTERY_THRESHOLD = 0.15;
const BATCH_INTERVAL_MS = 30_000; // 30 seconds for low-priority batching
const MAX_BATCH_SIZE = 10;

class BackgroundDeliveryOptimizer {
  private lowPriorityQueue: QueuedDelivery[] = [];
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  private deliverBatchFn: DeliverBatchFn | null = null;
  private isOnWifi = false;
  private batteryLevel = 1;
  private isBatteryCharging = false;
  private netInfoUnsubscribe: (() => void) | null = null;
  private batterySubscription: { remove: () => void } | null = null;

  /**
   * Initialize the optimizer with network and battery monitoring.
   */
  async initialize(deliverBatch: DeliverBatchFn): Promise<void> {
    this.deliverBatchFn = deliverBatch;

    // Get initial network state
    const netState = await NetInfo.fetch();
    this.isOnWifi = netState.type === 'wifi';

    // Monitor network changes
    this.netInfoUnsubscribe = NetInfo.addEventListener(
      (state: NetInfoState) => {
        this.isOnWifi = state.type === 'wifi';
      }
    );

    // Get initial battery state
    try {
      this.batteryLevel = await Battery.getBatteryLevelAsync();
      const batteryState = await Battery.getBatteryStateAsync();
      this.isBatteryCharging =
        batteryState === Battery.BatteryState.CHARGING ||
        batteryState === Battery.BatteryState.FULL;

      // Monitor battery changes
      this.batterySubscription = Battery.addBatteryLevelListener(
        ({ batteryLevel }) => {
          this.batteryLevel = batteryLevel;
        }
      );
    } catch {
      // Battery API may not be available in all environments
      console.log('[DeliveryOptimizer] Battery monitoring unavailable');
    }

    console.log('[DeliveryOptimizer] Initialized');
  }

  /**
   * Determine whether a notification should be delivered immediately
   * based on priority, battery, and network conditions.
   */
  shouldDeliverImmediately(priority: NotificationPriority): boolean {
    // High priority always delivers immediately
    if (priority === 'high') {
      return true;
    }

    // Low battery and not charging: defer non-high-priority
    if (this.isLowBattery() && !this.isBatteryCharging) {
      return false;
    }

    // Normal priority on cellular: deliver immediately
    if (priority === 'normal') {
      return true;
    }

    // Low priority on WiFi: batch them
    // Low priority on cellular: also batch
    return false;
  }

  /**
   * Schedule a notification for optimized delivery.
   * High/normal priority items are delivered immediately (returned as-is).
   * Low-priority items are batched.
   *
   * @returns true if the item was queued for batching, false if it should be sent now
   */
  enqueueForOptimizedDelivery(item: QueuedDelivery): boolean {
    if (this.shouldDeliverImmediately(item.priority)) {
      return false; // Caller should send immediately
    }

    this.lowPriorityQueue.push(item);
    this.scheduleBatchFlush();
    return true; // Queued for batch delivery
  }

  /**
   * Flush all queued low-priority notifications immediately.
   */
  async flushQueue(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.lowPriorityQueue.length === 0 || !this.deliverBatchFn) {
      return;
    }

    const batch = this.lowPriorityQueue.splice(0, MAX_BATCH_SIZE);
    console.log(`[DeliveryOptimizer] Flushing batch of ${batch.length}`);

    try {
      await this.deliverBatchFn(batch);
    } catch (error) {
      console.error('[DeliveryOptimizer] Batch delivery failed:', error);
      // Re-queue failed items at the front
      this.lowPriorityQueue.unshift(...batch);
    }

    // If more items remain, schedule another flush
    if (this.lowPriorityQueue.length > 0) {
      this.scheduleBatchFlush();
    }
  }

  /**
   * Get current battery level (0-1).
   */
  getBatteryLevel(): number {
    return this.batteryLevel;
  }

  /**
   * Check if device is in low battery state.
   */
  isLowBattery(): boolean {
    return this.batteryLevel < LOW_BATTERY_THRESHOLD;
  }

  /**
   * Check if device is on WiFi.
   */
  isWifi(): boolean {
    return this.isOnWifi;
  }

  /**
   * Get the number of items waiting in the low-priority queue.
   */
  get pendingCount(): number {
    return this.lowPriorityQueue.length;
  }

  /**
   * Clean up all subscriptions and timers.
   */
  cleanup(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.netInfoUnsubscribe?.();
    this.netInfoUnsubscribe = null;
    this.batterySubscription?.remove();
    this.batterySubscription = null;
    this.lowPriorityQueue = [];
  }

  private scheduleBatchFlush(): void {
    if (this.batchTimer) {
      return; // Already scheduled
    }

    // On WiFi, batch more aggressively (shorter interval)
    const interval = this.isOnWifi ? BATCH_INTERVAL_MS / 2 : BATCH_INTERVAL_MS;

    this.batchTimer = setTimeout(() => {
      this.batchTimer = null;
      this.flushQueue();
    }, interval);
  }
}

export default new BackgroundDeliveryOptimizer();
