import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationPayload } from '../../../lib/services/notifications';

export interface BatchedNotification {
  id: string;
  groupKey: string;
  groupType: 'channel' | 'user' | 'type' | 'server';
  notifications: NotificationPayload[];
  count: number;
  latestTimestamp: number;
  summary: string;
  title: string;
  body: string;
}

export interface BatchingSettings {
  enabled: boolean;
  maxBatchSize: number;
  batchTimeWindow: number; // milliseconds
  groupByChannel: boolean;
  groupByUser: boolean;
  groupByType: boolean;
  autoCollapseThreshold: number;
}

const DEFAULT_BATCHING_SETTINGS: BatchingSettings = {
  enabled: true,
  maxBatchSize: 5,
  batchTimeWindow: 30000, // 30 seconds
  groupByChannel: true,
  groupByUser: true,
  groupByType: false,
  autoCollapseThreshold: 3,
};

export class NotificationBatcher {
  private static instance: NotificationBatcher;
  private batches: Map<string, BatchedNotification> = new Map();
  private settings: BatchingSettings = DEFAULT_BATCHING_SETTINGS;
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private listeners: Set<(batches: BatchedNotification[]) => void> = new Set();

  private constructor() {
    this.loadSettings();
  }

  public static getInstance(): NotificationBatcher {
    if (!NotificationBatcher.instance) {
      NotificationBatcher.instance = new NotificationBatcher();
    }
    return NotificationBatcher.instance;
  }

  private async loadSettings(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('@hearth/batching_settings');
      if (stored) {
        this.settings = { ...DEFAULT_BATCHING_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load batching settings:', error);
    }
  }

  public async updateSettings(updates: Partial<BatchingSettings>): Promise<void> {
    this.settings = { ...this.settings, ...updates };
    try {
      await AsyncStorage.setItem('@hearth/batching_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save batching settings:', error);
    }
  }

  public getSettings(): BatchingSettings {
    return { ...this.settings };
  }

  public addListener(listener: (batches: BatchedNotification[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const batches = Array.from(this.batches.values());
    this.listeners.forEach(listener => listener(batches));
  }

  private generateGroupKey(notification: NotificationPayload): string {
    const parts: string[] = [];

    if (this.settings.groupByChannel && notification.channelId) {
      parts.push(`ch:${notification.channelId}`);
    }

    if (this.settings.groupByUser && notification.userId) {
      parts.push(`u:${notification.userId}`);
    }

    if (this.settings.groupByType) {
      parts.push(`t:${notification.type}`);
    }

    // Fallback to server grouping for server-level notifications
    if (parts.length === 0 && notification.serverId) {
      parts.push(`s:${notification.serverId}`);
    }

    // Ultimate fallback to type grouping
    if (parts.length === 0) {
      parts.push(`t:${notification.type}`);
    }

    return parts.join('|');
  }

  private determineGroupType(groupKey: string): 'channel' | 'user' | 'type' | 'server' {
    if (groupKey.includes('ch:')) return 'channel';
    if (groupKey.includes('u:')) return 'user';
    if (groupKey.includes('s:')) return 'server';
    return 'type';
  }

  private generateBatchSummary(batch: BatchedNotification): void {
    const { notifications, groupType, count } = batch;
    const latest = notifications[notifications.length - 1];

    switch (groupType) {
      case 'channel':
        if (count === 1) {
          batch.title = latest.title;
          batch.body = latest.body;
        } else {
          batch.title = `${count} new messages`;
          batch.body = `Latest: ${latest.body}`;
        }
        batch.summary = `${count} message${count > 1 ? 's' : ''} in channel`;
        break;

      case 'user':
        if (count === 1) {
          batch.title = latest.title;
          batch.body = latest.body;
        } else {
          batch.title = `${count} messages from ${latest.title.split(':')[0] || 'someone'}`;
          batch.body = `Latest: ${latest.body}`;
        }
        batch.summary = `${count} message${count > 1 ? 's' : ''} from user`;
        break;

      case 'server':
        batch.title = `${count} server notifications`;
        batch.body = `Latest: ${latest.body}`;
        batch.summary = `${count} server notification${count > 1 ? 's' : ''}`;
        break;

      case 'type':
        const typeLabel = this.getTypeLabel(latest.type);
        batch.title = count === 1 ? latest.title : `${count} ${typeLabel}s`;
        batch.body = `Latest: ${latest.body}`;
        batch.summary = `${count} ${typeLabel}${count > 1 ? 's' : ''}`;
        break;
    }
  }

  private getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      message: 'message',
      dm: 'direct message',
      mention: 'mention',
      reply: 'reply',
      friend_request: 'friend request',
      server_invite: 'server invite',
      call: 'call',
      system: 'system notification',
    };
    return labels[type] || type;
  }

  public async addNotification(notification: NotificationPayload): Promise<BatchedNotification | null> {
    if (!this.settings.enabled) {
      return null; // No batching, handle notification normally
    }

    const groupKey = this.generateGroupKey(notification);
    const now = Date.now();

    // Clear existing timeout for this group
    const existingTimeout = this.timeouts.get(groupKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    let batch = this.batches.get(groupKey);

    if (!batch) {
      // Create new batch
      batch = {
        id: `batch_${groupKey}_${now}`,
        groupKey,
        groupType: this.determineGroupType(groupKey),
        notifications: [],
        count: 0,
        latestTimestamp: now,
        summary: '',
        title: '',
        body: '',
      };
      this.batches.set(groupKey, batch);
    }

    // Add notification to batch
    batch.notifications.push(notification);
    batch.count = batch.notifications.length;
    batch.latestTimestamp = now;

    // Keep only the most recent notifications up to maxBatchSize
    if (batch.notifications.length > this.settings.maxBatchSize) {
      batch.notifications = batch.notifications.slice(-this.settings.maxBatchSize);
    }

    this.generateBatchSummary(batch);

    // Schedule batch delivery
    const timeout = setTimeout(() => {
      this.deliverBatch(groupKey);
    }, this.settings.batchTimeWindow);

    this.timeouts.set(groupKey, timeout);
    this.notifyListeners();

    // Return batch if it should be displayed immediately (first notification or reached threshold)
    const shouldDisplayNow = batch.count === 1 || batch.count >= this.settings.autoCollapseThreshold;
    return shouldDisplayNow ? batch : null;
  }

  private deliverBatch(groupKey: string): void {
    const batch = this.batches.get(groupKey);
    if (!batch) return;

    // Clear timeout
    this.timeouts.delete(groupKey);

    // Batch is ready for final delivery
    // The usePushNotifications hook will handle the actual display
    this.notifyListeners();
  }

  public getBatches(): BatchedNotification[] {
    return Array.from(this.batches.values());
  }

  public getBatch(groupKey: string): BatchedNotification | undefined {
    return this.batches.get(groupKey);
  }

  public dismissBatch(groupKey: string): void {
    const timeout = this.timeouts.get(groupKey);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(groupKey);
    }
    this.batches.delete(groupKey);
    this.notifyListeners();
  }

  public dismissAllBatches(): void {
    // Clear all timeouts
    this.timeouts.forEach((timeout) => clearTimeout(timeout));
    this.timeouts.clear();
    this.batches.clear();
    this.notifyListeners();
  }

  public getNotificationCount(): number {
    return Array.from(this.batches.values()).reduce((total, batch) => total + batch.count, 0);
  }

  // Method to check if a notification should be batched or displayed immediately
  public shouldBatchNotification(notification: NotificationPayload): boolean {
    if (!this.settings.enabled) return false;

    // Always batch messages, mentions, and replies
    const batchableTypes = ['message', 'dm', 'mention', 'reply'];
    if (batchableTypes.includes(notification.type)) return true;

    // Don't batch urgent notifications
    const urgentTypes = ['call', 'friend_request'];
    if (urgentTypes.includes(notification.type)) return false;

    return true;
  }
}

export const notificationBatcher = NotificationBatcher.getInstance();