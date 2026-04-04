import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { NotificationPayload, NotificationType } from "./notifications";

const BATCHING_SETTINGS_KEY = "@hearth/notification_batching_settings";
const PENDING_BATCHES_KEY = "@hearth/pending_notification_batches";

// ============================================================================
// Types
// ============================================================================

export type GroupingStrategy = "conversation" | "server" | "type" | "sender";

export type BatchPriority = "low" | "normal" | "high" | "urgent";

export interface BatchingConfig {
  enabled: boolean;
  maxBatchSize: number; // Max notifications before forcing delivery
  timeWindowMs: number; // Time window for collecting notifications
  groupingStrategy: GroupingStrategy;
  smartTiming: boolean; // Adapt timing based on user activity
  collapseThreshold: number; // After this many in a group, collapse into summary
  priorityOverrides: Record<NotificationType, BatchPriority>;
}

export const DEFAULT_BATCHING_CONFIG: BatchingConfig = {
  enabled: true,
  maxBatchSize: 5,
  timeWindowMs: 3000, // 3 seconds
  groupingStrategy: "conversation",
  smartTiming: true,
  collapseThreshold: 3,
  priorityOverrides: {
    message: "normal",
    dm: "high",
    mention: "high",
    reply: "high",
    friend_request: "normal",
    server_invite: "normal",
    call: "urgent",
    system: "low",
  },
};

export interface NotificationGroup {
  groupKey: string;
  notifications: NotificationPayload[];
  strategy: GroupingStrategy;
  createdAt: number;
  lastUpdatedAt: number;
  // Metadata for display
  serverId?: string;
  channelId?: string;
  userId?: string;
  type?: NotificationType;
}

export interface BatchedNotification {
  groupKey: string;
  title: string;
  body: string;
  count: number;
  notifications: NotificationPayload[];
  priority: BatchPriority;
  channelId?: string; // Android notification channel
}

// ============================================================================
// Grouping Key Generation
// ============================================================================

export function getGroupKey(
  payload: NotificationPayload,
  strategy: GroupingStrategy
): string {
  switch (strategy) {
    case "conversation":
      // Group by channel (or DM user)
      if (payload.type === "dm" && payload.userId) {
        return `dm:${payload.userId}`;
      }
      if (payload.channelId && payload.serverId) {
        return `channel:${payload.serverId}:${payload.channelId}`;
      }
      if (payload.channelId) {
        return `channel:${payload.channelId}`;
      }
      return `type:${payload.type}`;

    case "server":
      if (payload.serverId) {
        return `server:${payload.serverId}`;
      }
      if (payload.type === "dm") {
        return "dm:all";
      }
      return `type:${payload.type}`;

    case "type":
      return `type:${payload.type}`;

    case "sender":
      if (payload.userId) {
        return `user:${payload.userId}`;
      }
      return `type:${payload.type}`;
  }
}

// ============================================================================
// Priority Resolution
// ============================================================================

const PRIORITY_ORDER: Record<BatchPriority, number> = {
  low: 0,
  normal: 1,
  high: 2,
  urgent: 3,
};

export function resolveBatchPriority(
  notifications: NotificationPayload[],
  config: BatchingConfig
): BatchPriority {
  let highest: BatchPriority = "low";
  for (const n of notifications) {
    const p = config.priorityOverrides[n.type] ?? "normal";
    if (PRIORITY_ORDER[p] > PRIORITY_ORDER[highest]) {
      highest = p;
    }
  }
  return highest;
}

function getAndroidChannel(priority: BatchPriority, type?: NotificationType): string {
  if (type === "call") return "calls";
  if (type === "dm") return "direct-messages";
  if (type === "mention") return "mentions";
  if (type === "friend_request") return "social";
  if (type === "system") return "system";
  if (priority === "urgent" || priority === "high") return "messages";
  return "default";
}

// ============================================================================
// Notification Collapsing
// ============================================================================

export function collapseGroup(group: NotificationGroup): BatchedNotification {
  const { notifications, groupKey } = group;
  const count = notifications.length;
  const first = notifications[0];
  const last = notifications[count - 1];

  let title: string;
  let body: string;

  if (count === 1) {
    title = first.title;
    body = first.body;
  } else if (group.strategy === "conversation") {
    // "3 new messages in #general"
    const channelName = first.title.includes("#")
      ? first.title
      : first.title;
    title = channelName;
    body = `${count} new messages`;
    if (last.body) {
      body += ` — ${last.body}`;
    }
  } else if (group.strategy === "server") {
    title = first.title.split(" ").slice(0, 3).join(" ");
    body = `${count} new notifications`;
  } else if (group.strategy === "sender") {
    title = first.title;
    body = `${count} messages from this user`;
  } else {
    title = `${count} notifications`;
    body = last.body;
  }

  const priority = resolveBatchPriority(notifications, DEFAULT_BATCHING_CONFIG);

  return {
    groupKey,
    title,
    body,
    count,
    notifications,
    priority,
    channelId: getAndroidChannel(priority, first.type),
  };
}

// ============================================================================
// Batch Manager
// ============================================================================

type FlushCallback = (batched: BatchedNotification[]) => void;

export class NotificationBatchManager {
  private groups: Map<string, NotificationGroup> = new Map();
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private config: BatchingConfig;
  private onFlush: FlushCallback | null = null;
  private userActive = true;
  private lastActivityAt = Date.now();

  constructor(config?: Partial<BatchingConfig>) {
    this.config = { ...DEFAULT_BATCHING_CONFIG, ...config };
  }

  setFlushCallback(cb: FlushCallback): void {
    this.onFlush = cb;
  }

  getConfig(): BatchingConfig {
    return { ...this.config };
  }

  async updateConfig(updates: Partial<BatchingConfig>): Promise<BatchingConfig> {
    this.config = { ...this.config, ...updates };
    await saveBatchingConfig(this.config);
    return { ...this.config };
  }

  setUserActive(active: boolean): void {
    this.userActive = active;
    this.lastActivityAt = Date.now();
  }

  /**
   * Add a notification to the batch queue.
   * Returns immediately-deliverable notifications (urgent/bypass) or null if batched.
   */
  addNotification(payload: NotificationPayload): BatchedNotification | null {
    if (!this.config.enabled) {
      return collapseGroup({
        groupKey: "immediate",
        notifications: [payload],
        strategy: this.config.groupingStrategy,
        createdAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });
    }

    const priority = this.config.priorityOverrides[payload.type] ?? "normal";

    // Urgent notifications bypass batching entirely (calls, etc.)
    if (priority === "urgent") {
      return collapseGroup({
        groupKey: "urgent",
        notifications: [payload],
        strategy: this.config.groupingStrategy,
        createdAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });
    }

    const groupKey = getGroupKey(payload, this.config.groupingStrategy);
    const now = Date.now();

    const existing = this.groups.get(groupKey);

    if (existing) {
      existing.notifications.push(payload);
      existing.lastUpdatedAt = now;

      // If we've hit the max batch size, flush immediately
      if (existing.notifications.length >= this.config.maxBatchSize) {
        this.flushGroup(groupKey);
        return null; // flush callback handles delivery
      }
    } else {
      this.groups.set(groupKey, {
        groupKey,
        notifications: [payload],
        strategy: this.config.groupingStrategy,
        createdAt: now,
        lastUpdatedAt: now,
        serverId: payload.serverId,
        channelId: payload.channelId,
        userId: payload.userId,
        type: payload.type,
      });
    }

    // Reset or start the timer for this group
    this.resetTimer(groupKey);

    return null;
  }

  private getEffectiveTimeWindow(): number {
    if (!this.config.smartTiming) {
      return this.config.timeWindowMs;
    }

    // If user is actively using the app, use shorter window
    const timeSinceActivity = Date.now() - this.lastActivityAt;
    if (this.userActive && timeSinceActivity < 5000) {
      return Math.max(1000, this.config.timeWindowMs / 2);
    }

    // If user has been idle for a while, allow longer batching
    if (timeSinceActivity > 60000) {
      return this.config.timeWindowMs * 2;
    }

    return this.config.timeWindowMs;
  }

  private resetTimer(groupKey: string): void {
    const existing = this.timers.get(groupKey);
    if (existing) {
      clearTimeout(existing);
    }

    const window = this.getEffectiveTimeWindow();
    const timer = setTimeout(() => {
      this.flushGroup(groupKey);
    }, window);

    this.timers.set(groupKey, timer);
  }

  private flushGroup(groupKey: string): void {
    const group = this.groups.get(groupKey);
    if (!group || group.notifications.length === 0) {
      this.groups.delete(groupKey);
      this.clearTimer(groupKey);
      return;
    }

    const shouldCollapse =
      group.notifications.length >= this.config.collapseThreshold;

    let batched: BatchedNotification[];

    if (shouldCollapse) {
      batched = [collapseGroup(group)];
    } else {
      // Deliver each notification individually but grouped
      batched = group.notifications.map((n) =>
        collapseGroup({
          ...group,
          notifications: [n],
        })
      );
    }

    this.groups.delete(groupKey);
    this.clearTimer(groupKey);

    if (this.onFlush) {
      this.onFlush(batched);
    }
  }

  private clearTimer(groupKey: string): void {
    const timer = this.timers.get(groupKey);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(groupKey);
    }
  }

  /** Flush all pending groups immediately */
  flushAll(): BatchedNotification[] {
    const results: BatchedNotification[] = [];

    for (const [groupKey, group] of this.groups.entries()) {
      if (group.notifications.length === 0) continue;

      const shouldCollapse =
        group.notifications.length >= this.config.collapseThreshold;

      if (shouldCollapse) {
        results.push(collapseGroup(group));
      } else {
        for (const n of group.notifications) {
          results.push(
            collapseGroup({
              ...group,
              notifications: [n],
            })
          );
        }
      }
    }

    // Clear all state
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.groups.clear();
    this.timers.clear();

    if (this.onFlush && results.length > 0) {
      this.onFlush(results);
    }

    return results;
  }

  /** Get count of pending (unbatched) notifications */
  getPendingCount(): number {
    let count = 0;
    for (const group of this.groups.values()) {
      count += group.notifications.length;
    }
    return count;
  }

  /** Get all current group keys */
  getGroupKeys(): string[] {
    return Array.from(this.groups.keys());
  }

  /** Get pending notifications for a specific group */
  getGroupNotifications(groupKey: string): NotificationPayload[] {
    return this.groups.get(groupKey)?.notifications ?? [];
  }

  destroy(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.groups.clear();
    this.timers.clear();
    this.onFlush = null;
  }
}

// ============================================================================
// Platform Notification Delivery
// ============================================================================

export async function deliverBatchedNotification(
  batched: BatchedNotification
): Promise<string> {
  const content: Notifications.NotificationContentInput = {
    title: batched.title,
    body: batched.body,
    data: {
      ...batched.notifications[0],
      batchCount: batched.count,
      groupKey: batched.groupKey,
    },
    sound: true,
  };

  // Android: use notification channel and group
  if (Platform.OS === "android") {
    return await Notifications.scheduleNotificationAsync({
      content: {
        ...content,
        // Android grouping via threadIdentifier
        ...(batched.count > 1 && {
          title: content.title,
          body: content.body,
        }),
      },
      trigger: null,
    });
  }

  // iOS: use threadIdentifier for grouping
  return await Notifications.scheduleNotificationAsync({
    content: {
      ...content,
      ...(batched.groupKey && {
        // expo-notifications uses categoryIdentifier for iOS grouping
        data: {
          ...content.data,
          threadId: batched.groupKey,
        },
      }),
    },
    trigger: null,
  });
}

// ============================================================================
// Config Persistence
// ============================================================================

export async function getBatchingConfig(): Promise<BatchingConfig> {
  try {
    const stored = await AsyncStorage.getItem(BATCHING_SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_BATCHING_CONFIG, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error("Failed to get batching config:", error);
  }
  return { ...DEFAULT_BATCHING_CONFIG };
}

export async function saveBatchingConfig(
  config: Partial<BatchingConfig>
): Promise<BatchingConfig> {
  try {
    const current = await getBatchingConfig();
    const updated = { ...current, ...config };
    await AsyncStorage.setItem(
      BATCHING_SETTINGS_KEY,
      JSON.stringify(updated)
    );
    return updated;
  } catch (error) {
    console.error("Failed to save batching config:", error);
    throw error;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let batchManagerInstance: NotificationBatchManager | null = null;

export function getBatchManager(
  config?: Partial<BatchingConfig>
): NotificationBatchManager {
  if (!batchManagerInstance) {
    batchManagerInstance = new NotificationBatchManager(config);
  }
  return batchManagerInstance;
}

export function resetBatchManager(): void {
  if (batchManagerInstance) {
    batchManagerInstance.destroy();
    batchManagerInstance = null;
  }
}
