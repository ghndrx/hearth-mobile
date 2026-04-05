/**
 * Delivery Analytics Service
 * Tracks notification delivery metrics including send time, delivery time,
 * open time, delivery rates, and failure analysis.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@pn006/delivery_analytics';
const MAX_EVENTS = 1000; // Cap stored events to prevent unbounded growth

export interface NotificationEvent {
  notificationId: string;
  sentAt: number;
  deliveredAt?: number;
  openedAt?: number;
  failedAt?: number;
  failureReason?: string;
}

export interface DeliveryReport {
  totalNotifications: number;
  deliveredCount: number;
  failedCount: number;
  pendingCount: number;
  openedCount: number;
  successRate: number;
  openRate: number;
  averageDeliveryLatencyMs: number;
  averageTimeToOpenMs: number;
  failureReasons: Record<string, number>;
  periodStart: number;
  periodEnd: number;
}

class DeliveryAnalytics {
  private events: Map<string, NotificationEvent> = new Map();
  private loaded = false;

  /**
   * Load persisted analytics from storage
   */
  async load(): Promise<void> {
    if (this.loaded) return;

    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const entries: [string, NotificationEvent][] = JSON.parse(data);
        this.events = new Map(entries);
      }
      this.loaded = true;
    } catch (error) {
      console.error('Failed to load delivery analytics:', error);
      this.loaded = true;
    }
  }

  /**
   * Record that a notification was sent
   */
  async trackSend(notificationId: string): Promise<void> {
    await this.load();
    this.events.set(notificationId, {
      notificationId,
      sentAt: Date.now(),
    });
    await this.pruneAndPersist();
  }

  /**
   * Record that a notification was delivered
   */
  async trackDelivery(notificationId: string): Promise<void> {
    await this.load();
    const event = this.events.get(notificationId);
    if (event) {
      event.deliveredAt = Date.now();
      this.events.set(notificationId, event);
      await this.persist();
    }
  }

  /**
   * Record that a notification was opened by the user
   */
  async trackOpen(notificationId: string): Promise<void> {
    await this.load();
    const event = this.events.get(notificationId);
    if (event) {
      event.openedAt = Date.now();
      this.events.set(notificationId, event);
      await this.persist();
    }
  }

  /**
   * Record that a notification delivery failed
   */
  async trackFailure(notificationId: string, reason: string): Promise<void> {
    await this.load();
    const event = this.events.get(notificationId) || {
      notificationId,
      sentAt: Date.now(),
    };
    event.failedAt = Date.now();
    event.failureReason = reason;
    this.events.set(notificationId, event);
    await this.persist();
  }

  /**
   * Generate a delivery report for a given time period
   * @param since - Start of period (timestamp). Defaults to 24 hours ago.
   */
  async getDeliveryReport(since?: number): Promise<DeliveryReport> {
    await this.load();

    const periodStart = since ?? Date.now() - 24 * 60 * 60 * 1000;
    const periodEnd = Date.now();

    let deliveredCount = 0;
    let failedCount = 0;
    let pendingCount = 0;
    let openedCount = 0;
    let totalLatency = 0;
    let latencyCount = 0;
    let totalTimeToOpen = 0;
    let openCount = 0;
    const failureReasons: Record<string, number> = {};
    let totalInPeriod = 0;

    for (const event of this.events.values()) {
      if (event.sentAt < periodStart || event.sentAt > periodEnd) continue;

      totalInPeriod++;

      if (event.deliveredAt) {
        deliveredCount++;
        totalLatency += event.deliveredAt - event.sentAt;
        latencyCount++;
      } else if (event.failedAt) {
        failedCount++;
        if (event.failureReason) {
          failureReasons[event.failureReason] = (failureReasons[event.failureReason] || 0) + 1;
        }
      } else {
        pendingCount++;
      }

      if (event.openedAt) {
        openedCount++;
        if (event.deliveredAt) {
          totalTimeToOpen += event.openedAt - event.deliveredAt;
          openCount++;
        }
      }
    }

    const successRate = totalInPeriod > 0 ? (deliveredCount / totalInPeriod) * 100 : 100;
    const openRate = deliveredCount > 0 ? (openedCount / deliveredCount) * 100 : 0;
    const averageDeliveryLatencyMs = latencyCount > 0 ? totalLatency / latencyCount : 0;
    const averageTimeToOpenMs = openCount > 0 ? totalTimeToOpen / openCount : 0;

    return {
      totalNotifications: totalInPeriod,
      deliveredCount,
      failedCount,
      pendingCount,
      openedCount,
      successRate,
      openRate,
      averageDeliveryLatencyMs,
      averageTimeToOpenMs,
      failureReasons,
      periodStart,
      periodEnd,
    };
  }

  /**
   * Get a single notification event
   */
  async getEvent(notificationId: string): Promise<NotificationEvent | undefined> {
    await this.load();
    return this.events.get(notificationId);
  }

  /**
   * Clear all analytics data
   */
  async clear(): Promise<void> {
    this.events.clear();
    await AsyncStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Prune old events if over the cap, then persist
   */
  private async pruneAndPersist(): Promise<void> {
    if (this.events.size > MAX_EVENTS) {
      // Remove oldest events
      const sortedEntries = Array.from(this.events.entries()).sort(
        (a, b) => a[1].sentAt - b[1].sentAt
      );
      const toRemove = sortedEntries.slice(0, this.events.size - MAX_EVENTS);
      for (const [key] of toRemove) {
        this.events.delete(key);
      }
    }
    await this.persist();
  }

  /**
   * Persist analytics to AsyncStorage
   */
  private async persist(): Promise<void> {
    try {
      const entries = Array.from(this.events.entries());
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error('Failed to persist delivery analytics:', error);
    }
  }
}

export default new DeliveryAnalytics();
