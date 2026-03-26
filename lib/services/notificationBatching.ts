/**
 * Notification Batching Service - PN-004
 *
 * Implements smart notification batching and grouping to prevent notification spam
 * while ensuring important messages reach users promptly. Groups notifications by
 * conversation, sender, and priority level with intelligent timing.
 *
 * Features:
 * - Time-based batching with configurable delays
 * - Priority-based routing (mentions/DMs bypass batching)
 * - Conversation and sender grouping
 * - Summary notifications for batched items
 * - Background processing with app state awareness
 */

import { AppState } from 'react-native';
import {
  scheduleLocalNotification,
  getNotificationSettings,
  setBadgeCount,
  type NotificationPayload,
  type NotificationType,
} from './notifications';
import type { IncomingMessage } from './notificationPipeline';

// Notification priority levels for batching decisions
export type NotificationPriority = 'immediate' | 'high' | 'normal' | 'low';

// Batching configuration
export interface BatchingConfig {
  // Time windows for different priority levels (ms)
  immediateDelay: number;    // For mentions, DMs - very short delay
  highPriorityDelay: number; // For friend requests, calls
  normalDelay: number;       // For regular messages
  lowDelay: number;          // For server activity, system notifications

  // Maximum batch sizes
  maxBatchSize: number;      // Max notifications per batch
  maxGroupSize: number;      // Max notifications per group

  // Grouping settings
  enableConversationGrouping: boolean;
  enableSenderGrouping: boolean;
  enableChannelGrouping: boolean;

  // Summary settings
  enableSummaryNotifications: boolean;
  summaryThreshold: number;  // Min notifications to create summary
}

// Default batching configuration
export const DEFAULT_BATCHING_CONFIG: BatchingConfig = {
  immediateDelay: 500,       // 0.5s for mentions/DMs
  highPriorityDelay: 2000,   // 2s for friend requests, calls
  normalDelay: 5000,         // 5s for regular messages
  lowDelay: 10000,           // 10s for server activity

  maxBatchSize: 10,
  maxGroupSize: 5,

  enableConversationGrouping: true,
  enableSenderGrouping: true,
  enableChannelGrouping: true,

  enableSummaryNotifications: true,
  summaryThreshold: 3,
};

// Pending notification item
interface PendingNotification {
  id: string;
  payload: NotificationPayload;
  message: IncomingMessage;
  priority: NotificationPriority;
  timestamp: number;
  groupKey: string;
}

// Notification group for batching
interface NotificationGroup {
  key: string;
  notifications: PendingNotification[];
  priority: NotificationPriority;
  scheduledAt: number;
  timeoutId?: NodeJS.Timeout;
}

// Summary notification data
interface SummaryNotification {
  title: string;
  body: string;
  payload: NotificationPayload;
  count: number;
  priority: NotificationPriority;
}

/**
 * Smart notification batching service
 */
export class NotificationBatchingService {
  private pendingGroups = new Map<string, NotificationGroup>();
  private config: BatchingConfig;
  private isAppActive = true;
  private badgeCount = 0;

  constructor(config: Partial<BatchingConfig> = {}) {
    this.config = { ...DEFAULT_BATCHING_CONFIG, ...config };
    this.setupAppStateListener();
  }

  /**
   * Add a notification to the batching queue
   */
  async addNotification(message: IncomingMessage, payload: NotificationPayload): Promise<void> {
    const settings = await getNotificationSettings();

    // Skip if notifications are disabled
    if (!settings.enabled) {
      return;
    }

    // Don't batch when app is active (user can see messages directly)
    if (this.isAppActive) {
      console.log('[NotificationBatching] Skipping - app is active');
      return;
    }

    const priority = this.determinePriority(message);
    const groupKey = this.generateGroupKey(message);
    const notification: PendingNotification = {
      id: `${message.id}-${Date.now()}`,
      payload,
      message,
      priority,
      timestamp: Date.now(),
      groupKey,
    };

    // Immediate priority notifications bypass batching
    if (priority === 'immediate') {
      await this.deliverImmediately(notification);
      return;
    }

    await this.addToGroup(notification);
  }

  /**
   * Determine notification priority based on message type and content
   */
  private determinePriority(message: IncomingMessage): NotificationPriority {
    switch (message.type) {
      case 'mention':
      case 'reply':
      case 'dm':
      case 'call': // Voice/video calls need immediate attention
        return 'immediate'; // High-priority messages bypass batching
      case 'friend_request':
        return 'high';
      case 'message':
        return 'normal';
      case 'server_invite':
      case 'system':
      default:
        return 'low';
    }
  }

  /**
   * Generate grouping key for batching related notifications
   */
  private generateGroupKey(message: IncomingMessage): string {
    const { config } = this;
    const parts: string[] = [];

    // Group by conversation (DM or channel)
    if (config.enableConversationGrouping) {
      if (message.channel.type === 'dm') {
        parts.push(`dm:${message.author.id}`);
      } else {
        parts.push(`channel:${message.channel.id}`);
      }
    }

    // Group by sender for rapid-fire messages
    if (config.enableSenderGrouping && message.channel.type !== 'dm') {
      parts.push(`sender:${message.author.id}`);
    }

    // Group by server/channel for server activity
    if (config.enableChannelGrouping && message.server) {
      parts.push(`server:${message.server.id}`);
    }

    return parts.join('|') || `fallback:${message.channel.id}`;
  }

  /**
   * Add notification to appropriate group or create new group
   */
  private async addToGroup(notification: PendingNotification): Promise<void> {
    const { groupKey, priority } = notification;
    let group = this.pendingGroups.get(groupKey);

    if (!group) {
      // Create new group
      group = {
        key: groupKey,
        notifications: [],
        priority,
        scheduledAt: Date.now() + this.getDelayForPriority(priority),
      };
      this.pendingGroups.set(groupKey, group);
    } else {
      // Update group priority to highest priority in group
      if (this.isPriorityHigher(priority, group.priority)) {
        group.priority = priority;
        // Reschedule with shorter delay for higher priority
        if (group.timeoutId) {
          clearTimeout(group.timeoutId);
        }
        group.scheduledAt = Date.now() + this.getDelayForPriority(priority);
      }
    }

    // Add notification to group
    group.notifications.push(notification);

    // Check if group should be delivered immediately
    if (group.notifications.length >= this.config.maxGroupSize) {
      await this.deliverGroup(group);
      return;
    }

    // Schedule group delivery
    if (group.timeoutId) {
      clearTimeout(group.timeoutId);
    }

    const delay = Math.max(0, group.scheduledAt - Date.now());
    group.timeoutId = setTimeout(() => {
      this.deliverGroup(group);
    }, delay);

    console.log(`[NotificationBatching] Added to group "${groupKey}", ${group.notifications.length} notifications, delivering in ${delay}ms`);
  }

  /**
   * Get delay in milliseconds for priority level
   */
  private getDelayForPriority(priority: NotificationPriority): number {
    switch (priority) {
      case 'immediate': return this.config.immediateDelay;
      case 'high': return this.config.highPriorityDelay;
      case 'normal': return this.config.normalDelay;
      case 'low': return this.config.lowDelay;
      default: return this.config.normalDelay;
    }
  }

  /**
   * Check if priority A is higher than priority B
   */
  private isPriorityHigher(a: NotificationPriority, b: NotificationPriority): boolean {
    const priorities = { immediate: 4, high: 3, normal: 2, low: 1 };
    return priorities[a] > priorities[b];
  }

  /**
   * Deliver notification immediately without batching
   */
  private async deliverImmediately(notification: PendingNotification): Promise<void> {
    try {
      await scheduleLocalNotification(
        notification.payload.title,
        notification.payload.body,
        notification.payload
      );
      await this.incrementBadgeCount();

      console.log(`[NotificationBatching] Delivered immediate notification: ${notification.payload.title}`);
    } catch (error) {
      console.error('[NotificationBatching] Failed to deliver immediate notification:', error);
    }
  }

  /**
   * Deliver a group of notifications
   */
  private async deliverGroup(group: NotificationGroup): Promise<void> {
    if (!group || group.notifications.length === 0) {
      return;
    }

    try {
      // Remove group from pending
      this.pendingGroups.delete(group.key);

      // Clear timeout if it exists
      if (group.timeoutId) {
        clearTimeout(group.timeoutId);
      }

      // Sort notifications by timestamp (oldest first)
      const notifications = group.notifications.sort((a, b) => a.timestamp - b.timestamp);

      if (this.config.enableSummaryNotifications && notifications.length >= this.config.summaryThreshold) {
        // Create summary notification
        await this.deliverSummaryNotification(notifications, group);
      } else {
        // Deliver individual notifications
        for (const notification of notifications) {
          await this.deliverImmediately(notification);
        }
      }

      console.log(`[NotificationBatching] Delivered group "${group.key}" with ${notifications.length} notifications`);
    } catch (error) {
      console.error(`[NotificationBatching] Failed to deliver group "${group.key}":`, error);
    }
  }

  /**
   * Create and deliver a summary notification for a group
   */
  private async deliverSummaryNotification(
    notifications: PendingNotification[],
    group: NotificationGroup
  ): Promise<void> {
    const summary = this.createSummaryNotification(notifications, group);

    try {
      await scheduleLocalNotification(summary.title, summary.body, summary.payload);
      await this.incrementBadgeCount(notifications.length);

      console.log(`[NotificationBatching] Delivered summary: ${summary.title} (${summary.count} messages)`);
    } catch (error) {
      console.error('[NotificationBatching] Failed to deliver summary notification:', error);
    }
  }

  /**
   * Create summary notification from a group of notifications
   */
  private createSummaryNotification(
    notifications: PendingNotification[],
    group: NotificationGroup
  ): SummaryNotification {
    const count = notifications.length;
    const firstNotification = notifications[0];
    const lastNotification = notifications[notifications.length - 1];

    // Determine summary type based on group key
    const groupKey = group.key;
    let title: string;
    let body: string;

    if (groupKey.includes('dm:')) {
      // DM summary
      const senderName = firstNotification.message.author.username;
      title = senderName;
      body = `${count} new messages`;
    } else if (groupKey.includes('channel:')) {
      // Channel summary
      const channelName = firstNotification.message.channel.name;
      const serverName = firstNotification.message.server?.name;
      title = serverName ? `#${channelName} • ${serverName}` : `#${channelName}`;

      // Check if all messages are from the same sender
      const senders = new Set(notifications.map(n => n.message.author.id));
      if (senders.size === 1) {
        body = `${count} new messages from ${firstNotification.message.author.username}`;
      } else {
        body = `${count} new messages from ${senders.size} people`;
      }
    } else if (groupKey.includes('sender:')) {
      // Sender summary
      const senderName = firstNotification.message.author.username;
      const channelName = firstNotification.message.channel.name;
      title = `${senderName} in #${channelName}`;
      body = `${count} new messages`;
    } else {
      // Fallback summary
      title = 'New Messages';
      body = `${count} new notifications`;
    }

    // Create payload with summary data
    const payload: NotificationPayload = {
      type: 'message',
      serverId: firstNotification.message.server?.id,
      channelId: firstNotification.message.channel.id,
      messageId: lastNotification.message.id,
      userId: firstNotification.message.author.id,
      title,
      body,
      imageUrl: firstNotification.message.author.avatar,
    };

    return {
      title,
      body,
      payload,
      count,
      priority: group.priority,
    };
  }

  /**
   * Increment badge count by specified amount
   */
  private async incrementBadgeCount(increment = 1): Promise<void> {
    this.badgeCount += increment;
    await setBadgeCount(this.badgeCount);
  }

  /**
   * Set up app state listener to track foreground/background
   */
  private setupAppStateListener(): void {
    const handleAppStateChange = (nextAppState: string) => {
      const wasActive = this.isAppActive;
      this.isAppActive = nextAppState === 'active';

      // If app becomes active, deliver all pending notifications immediately
      if (!wasActive && this.isAppActive) {
        this.deliverAllPendingNotifications();
      }

      console.log(`[NotificationBatching] App state changed: ${nextAppState}`);
    };

    AppState.addEventListener('change', handleAppStateChange);
    this.isAppActive = AppState.currentState === 'active';
  }

  /**
   * Deliver all pending notifications when app becomes active
   */
  private async deliverAllPendingNotifications(): Promise<void> {
    console.log(`[NotificationBatching] App became active, delivering ${this.pendingGroups.size} pending groups`);

    for (const group of Array.from(this.pendingGroups.values())) {
      await this.deliverGroup(group);
    }
  }

  /**
   * Get current batching statistics
   */
  getStats(): {
    pendingGroups: number;
    totalPendingNotifications: number;
    isAppActive: boolean;
    badgeCount: number;
  } {
    let totalPending = 0;
    for (const group of Array.from(this.pendingGroups.values())) {
      totalPending += group.notifications.length;
    }

    return {
      pendingGroups: this.pendingGroups.size,
      totalPendingNotifications: totalPending,
      isAppActive: this.isAppActive,
      badgeCount: this.badgeCount,
    };
  }

  /**
   * Clear all pending notifications (useful for testing or reset)
   */
  clearPendingNotifications(): void {
    for (const group of Array.from(this.pendingGroups.values())) {
      if (group.timeoutId) {
        clearTimeout(group.timeoutId);
      }
    }
    this.pendingGroups.clear();
    console.log('[NotificationBatching] Cleared all pending notifications');
  }

  /**
   * Update batching configuration
   */
  updateConfig(newConfig: Partial<BatchingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('[NotificationBatching] Updated configuration:', newConfig);
  }

  /**
   * Shutdown service and clean up resources
   */
  shutdown(): void {
    console.log('[NotificationBatching] Shutting down...');
    this.clearPendingNotifications();
  }
}

// Singleton instance
export const notificationBatching = new NotificationBatchingService();

export default notificationBatching;