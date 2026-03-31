/**
 * Smart Notification Batching and Grouping Service
 *
 * Batches rapid notifications from the same sender within a configurable time window,
 * groups by conversation/channel, and applies prioritization logic for @mentions and DMs.
 */

import PushNotificationService from './PushNotificationService';

/**
 * Types of incoming notification messages
 */
export enum NotificationType {
  MESSAGE = 'message',
  MENTION = 'mention',
  DIRECT_MESSAGE = 'direct_message',
  REPLY = 'reply',
  SYSTEM = 'system',
}

/**
 * Represents an individual incoming notification before batching
 */
export interface IncomingNotification {
  id: string;
  channelId: string;
  channelName: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string;
  messageId: string;
  messagePreview: string;
  type: NotificationType;
  timestamp: number;
}

/**
 * A batched group of notifications
 */
export interface NotificationBatch {
  batchId: string;
  channelId: string;
  channelName: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string;
  notifications: IncomingNotification[];
  firstMessagePreview: string;
  count: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Deep link target for a tapped notification
 */
export interface NotificationDeepLink {
  channelId: string;
  messageId: string;
}

/**
 * Configuration for the batching service
 */
export interface BatchingConfig {
  /** Time window in ms to batch notifications from the same sender (default: 5 minutes) */
  batchWindowMs: number;
  /** Maximum notifications in a single batch before forcing delivery (default: 50) */
  maxBatchSize: number;
  /** Whether @mentions bypass batching (default: true) */
  prioritizeMentions: boolean;
  /** Whether DMs bypass batching (default: true) */
  prioritizeDirectMessages: boolean;
}

const DEFAULT_CONFIG: BatchingConfig = {
  batchWindowMs: 5 * 60 * 1000, // 5 minutes
  maxBatchSize: 50,
  prioritizeMentions: true,
  prioritizeDirectMessages: true,
};

class NotificationBatchingService {
  private config: BatchingConfig = { ...DEFAULT_CONFIG };
  private activeBatches: Map<string, NotificationBatch> = new Map();
  private batchTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private deliveredBatches: Map<string, NotificationBatch> = new Map();
  private onBatchReady?: (batch: NotificationBatch) => void;

  /**
   * Initialize the batching service with optional configuration
   */
  initialize(
    config: Partial<BatchingConfig> = {},
    onBatchReady?: (batch: NotificationBatch) => void,
  ): void {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.onBatchReady = onBatchReady;
    console.log('Notification batching service initialized', this.config);
  }

  /**
   * Update batching configuration at runtime
   */
  updateConfig(config: Partial<BatchingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): BatchingConfig {
    return { ...this.config };
  }

  /**
   * Process an incoming notification — either batch it or deliver immediately
   * Returns true if the notification was delivered immediately (priority),
   * false if it was added to a batch.
   */
  processNotification(notification: IncomingNotification): boolean {
    if (this.shouldDeliverImmediately(notification)) {
      this.deliverIndividualNotification(notification);
      return true;
    }

    this.addToBatch(notification);
    return false;
  }

  /**
   * Determine if a notification should bypass batching
   */
  private shouldDeliverImmediately(notification: IncomingNotification): boolean {
    if (this.config.prioritizeMentions && notification.type === NotificationType.MENTION) {
      return true;
    }
    if (this.config.prioritizeDirectMessages && notification.type === NotificationType.DIRECT_MESSAGE) {
      return true;
    }
    return false;
  }

  /**
   * Add a notification to the appropriate batch (keyed by channelId + senderId)
   */
  private addToBatch(notification: IncomingNotification): void {
    const batchKey = this.getBatchKey(notification.channelId, notification.senderId);

    let batch = this.activeBatches.get(batchKey);
    if (batch) {
      batch.notifications.push(notification);
      batch.count = batch.notifications.length;
      batch.updatedAt = notification.timestamp;

      // Force delivery if batch exceeds max size
      if (batch.count >= this.config.maxBatchSize) {
        this.flushBatch(batchKey);
      }
    } else {
      batch = {
        batchId: `batch-${notification.channelId}-${notification.senderId}-${notification.timestamp}`,
        channelId: notification.channelId,
        channelName: notification.channelName,
        senderId: notification.senderId,
        senderName: notification.senderName,
        senderAvatarUrl: notification.senderAvatarUrl,
        notifications: [notification],
        firstMessagePreview: notification.messagePreview,
        count: 1,
        createdAt: notification.timestamp,
        updatedAt: notification.timestamp,
      };
      this.activeBatches.set(batchKey, batch);

      // Start the batch window timer
      const timer = setTimeout(() => {
        this.flushBatch(batchKey);
      }, this.config.batchWindowMs);
      this.batchTimers.set(batchKey, timer);
    }
  }

  /**
   * Deliver a single high-priority notification immediately
   */
  private deliverIndividualNotification(notification: IncomingNotification): void {
    const batch: NotificationBatch = {
      batchId: `individual-${notification.id}`,
      channelId: notification.channelId,
      channelName: notification.channelName,
      senderId: notification.senderId,
      senderName: notification.senderName,
      senderAvatarUrl: notification.senderAvatarUrl,
      notifications: [notification],
      firstMessagePreview: notification.messagePreview,
      count: 1,
      createdAt: notification.timestamp,
      updatedAt: notification.timestamp,
    };

    this.deliveredBatches.set(batch.batchId, batch);
    this.onBatchReady?.(batch);
  }

  /**
   * Flush a batch — deliver it and clean up
   */
  private flushBatch(batchKey: string): void {
    const batch = this.activeBatches.get(batchKey);
    if (!batch) return;

    this.activeBatches.delete(batchKey);

    const timer = this.batchTimers.get(batchKey);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(batchKey);
    }

    this.deliveredBatches.set(batch.batchId, batch);
    this.onBatchReady?.(batch);
  }

  /**
   * Flush all active batches immediately (e.g., when app goes to background)
   */
  flushAll(): void {
    const keys = Array.from(this.activeBatches.keys());
    for (const key of keys) {
      this.flushBatch(key);
    }
  }

  /**
   * Format the notification display text for a batch
   */
  formatBatchTitle(batch: NotificationBatch): string {
    if (batch.count === 1) {
      return batch.senderName;
    }
    return `${batch.count} messages from ${batch.senderName}`;
  }

  /**
   * Format the notification body for a batch
   */
  formatBatchBody(batch: NotificationBatch): string {
    if (batch.count === 1) {
      return batch.firstMessagePreview;
    }
    return `${batch.firstMessagePreview}\n…and ${batch.count - 1} more in #${batch.channelName}`;
  }

  /**
   * Get the deep link target for a specific notification within a batch
   */
  getDeepLink(batchId: string, messageId?: string): NotificationDeepLink | null {
    const batch = this.deliveredBatches.get(batchId) || this.findBatchById(batchId);
    if (!batch) return null;

    // If a specific messageId is given, link to that message
    if (messageId) {
      const notification = batch.notifications.find((n) => n.messageId === messageId);
      if (notification) {
        return { channelId: batch.channelId, messageId: notification.messageId };
      }
    }

    // Default to the most recent message in the batch
    const lastNotification = batch.notifications[batch.notifications.length - 1];
    return { channelId: batch.channelId, messageId: lastNotification.messageId };
  }

  /**
   * Dismiss a batch and mark all messages in it as read.
   * Returns the list of message IDs that were marked as read.
   */
  async dismissBatch(batchId: string): Promise<string[]> {
    const batch = this.deliveredBatches.get(batchId) || this.findBatchById(batchId);
    if (!batch) return [];

    const messageIds = batch.notifications.map((n) => n.messageId);

    // Dismiss the OS-level notification for the batch
    try {
      await PushNotificationService.dismissNotification(batchId);
    } catch {
      // Notification may already be dismissed
    }

    this.deliveredBatches.delete(batchId);
    return messageIds;
  }

  /**
   * Get all currently active (not yet delivered) batches
   */
  getActiveBatches(): NotificationBatch[] {
    return Array.from(this.activeBatches.values());
  }

  /**
   * Get all delivered batches still tracked
   */
  getDeliveredBatches(): NotificationBatch[] {
    return Array.from(this.deliveredBatches.values());
  }

  /**
   * Get a specific batch by its ID from any collection
   */
  private findBatchById(batchId: string): NotificationBatch | undefined {
    for (const batch of this.activeBatches.values()) {
      if (batch.batchId === batchId) return batch;
    }
    return undefined;
  }

  /**
   * Generate a batch key for grouping
   */
  private getBatchKey(channelId: string, senderId: string): string {
    return `${channelId}:${senderId}`;
  }

  /**
   * Clean up all timers and state
   */
  cleanup(): void {
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    this.batchTimers.clear();
    this.activeBatches.clear();
    this.deliveredBatches.clear();
    this.onBatchReady = undefined;
    console.log('Notification batching service cleaned up');
  }
}

export default new NotificationBatchingService();
