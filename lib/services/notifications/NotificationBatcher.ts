import AsyncStorage from "@react-native-async-storage/async-storage";
import { NotificationPayload, NotificationType } from "../notifications";

const BATCHING_SETTINGS_KEY = "@hearth/batching_settings";

export interface BatchedNotification {
  id: string;
  groupKey: string;
  groupType: "channel" | "user" | "type" | "server";
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
  batchTimeWindow: number; // in milliseconds
  groupByChannel: boolean;
  groupByUser: boolean;
  groupByType: boolean;
  autoCollapseThreshold: number;
}

export const DEFAULT_BATCHING_SETTINGS: BatchingSettings = {
  enabled: true,
  maxBatchSize: 5,
  batchTimeWindow: 30000, // 30 seconds
  groupByChannel: true,
  groupByUser: true,
  groupByType: true,
  autoCollapseThreshold: 3,
};

export type BatchDensity = "all" | "summary" | "off";

type BatchListener = (batches: BatchedNotification[]) => void;

class NotificationBatcherService {
  private static instance: NotificationBatcherService;
  private batches: Map<string, BatchedNotification> = new Map();
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private settings: BatchingSettings = DEFAULT_BATCHING_SETTINGS;
  private listeners: Set<BatchListener> = new Set();
  private nextId = 1;

  // Notification types that should be batched
  private readonly batchableTypes: Set<NotificationType> = new Set([
    "message",
    "dm",
    "mention",
    "reply"
  ]);

  // Urgent types that should bypass batching
  private readonly urgentTypes: Set<NotificationType> = new Set([
    "call",
    "friend_request"
  ]);

  private constructor() {
    this.loadSettings();
  }

  public static getInstance(): NotificationBatcherService {
    if (!NotificationBatcherService.instance) {
      NotificationBatcherService.instance = new NotificationBatcherService();
    }
    return NotificationBatcherService.instance;
  }

  public async addNotification(payload: NotificationPayload): Promise<boolean> {
    if (!this.settings.enabled || !this.shouldBatch(payload)) {
      return false; // Don't batch - show immediately
    }

    const groupKey = this.generateGroupKey(payload);
    const existing = this.batches.get(groupKey);

    if (existing) {
      this.addToExistingBatch(existing, payload);
    } else {
      this.createNewBatch(groupKey, payload);
    }

    this.notifyListeners();
    return true; // Was batched
  }

  public shouldBatch(payload: NotificationPayload): boolean {
    if (!this.settings.enabled) {
      return false;
    }

    // Don't batch urgent notifications
    if (this.urgentTypes.has(payload.type)) {
      return false;
    }

    // Only batch specific types
    return this.batchableTypes.has(payload.type);
  }

  private generateGroupKey(payload: NotificationPayload): string {
    // Priority order for grouping:
    // 1. Channel (if enabled and channelId exists)
    // 2. User/sender (if enabled and userId exists)
    // 3. Type (if enabled)
    // 4. Server (if serverId exists)
    // 5. Type fallback

    if (this.settings.groupByChannel && payload.channelId) {
      return `channel:${payload.channelId}`;
    }

    if (this.settings.groupByUser && payload.userId) {
      return `user:${payload.userId}`;
    }

    if (this.settings.groupByType) {
      return `type:${payload.type}`;
    }

    if (payload.serverId) {
      return `server:${payload.serverId}`;
    }

    return `type:${payload.type}`;
  }

  private getGroupType(groupKey: string): BatchedNotification["groupType"] {
    if (groupKey.startsWith("channel:")) return "channel";
    if (groupKey.startsWith("user:")) return "user";
    if (groupKey.startsWith("server:")) return "server";
    return "type";
  }

  private createNewBatch(groupKey: string, payload: NotificationPayload): void {
    const batch: BatchedNotification = {
      id: `batch_${this.nextId++}`,
      groupKey,
      groupType: this.getGroupType(groupKey),
      notifications: [payload],
      count: 1,
      latestTimestamp: Date.now(),
      summary: this.generateSummary(groupKey, [payload], 1),
      title: payload.title,
      body: payload.body,
    };

    this.batches.set(groupKey, batch);
    this.scheduleDelivery(groupKey);
  }

  private addToExistingBatch(batch: BatchedNotification, payload: NotificationPayload): void {
    // Add to notifications array, trim if needed
    batch.notifications.push(payload);
    if (batch.notifications.length > this.settings.maxBatchSize) {
      batch.notifications = batch.notifications.slice(-this.settings.maxBatchSize);
    }

    batch.count++;
    batch.latestTimestamp = Date.now();

    // Update summary with new count
    const summary = this.generateSummary(batch.groupKey, batch.notifications, batch.count);
    batch.summary = summary;
    batch.title = summary;
    batch.body = `Latest: ${payload.body}`;

    // Reschedule delivery
    this.scheduleDelivery(batch.groupKey);
  }

  private generateSummary(
    groupKey: string,
    notifications: NotificationPayload[],
    totalCount: number
  ): string {
    const groupType = this.getGroupType(groupKey);
    const latest = notifications[notifications.length - 1];

    switch (groupType) {
      case "channel":
        return `${totalCount} new message${totalCount > 1 ? "s" : ""}`;

      case "user":
        const userName = groupKey.split(":")[1] || "Someone";
        return `${totalCount} message${totalCount > 1 ? "s" : ""} from ${userName}`;

      case "server":
        return `${totalCount} server notification${totalCount > 1 ? "s" : ""}`;

      case "type":
        const type = groupKey.split(":")[1] || latest.type;
        switch (type) {
          case "mention":
            return `${totalCount} mention${totalCount > 1 ? "s" : ""}`;
          case "dm":
            return `${totalCount} direct message${totalCount > 1 ? "s" : ""}`;
          case "reply":
            return `${totalCount} repl${totalCount > 1 ? "ies" : "y"}`;
          default:
            return `${totalCount} ${type}${totalCount > 1 ? "s" : ""}`;
        }

      default:
        return `${totalCount} notification${totalCount > 1 ? "s" : ""}`;
    }
  }

  private scheduleDelivery(groupKey: string): void {
    // Clear existing timeout
    const existingTimeout = this.timeouts.get(groupKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Schedule new timeout
    const timeout = setTimeout(() => {
      this.deliverBatch(groupKey);
    }, this.settings.batchTimeWindow);

    this.timeouts.set(groupKey, timeout);
  }

  private deliverBatch(groupKey: string): void {
    const batch = this.batches.get(groupKey);
    if (!batch) return;

    // Clean up
    this.timeouts.delete(groupKey);
    this.batches.delete(groupKey);

    // Notify listeners of batch delivery
    this.notifyListeners();
  }

  public getBatches(): BatchedNotification[] {
    return Array.from(this.batches.values()).sort(
      (a, b) => b.latestTimestamp - a.latestTimestamp
    );
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

  public dismissAll(): void {
    // Clear all timeouts
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout);
    }

    this.timeouts.clear();
    this.batches.clear();
    this.notifyListeners();
  }

  public getTotalCount(): number {
    return Array.from(this.batches.values()).reduce((sum, batch) => sum + batch.count, 0);
  }

  // Settings management
  public async getSettings(): Promise<BatchingSettings> {
    return this.settings;
  }

  public async updateSettings(updates: Partial<BatchingSettings>): Promise<BatchingSettings> {
    this.settings = { ...this.settings, ...updates };
    await this.saveSettings();
    return this.settings;
  }

  public async setDensity(density: BatchDensity): Promise<void> {
    switch (density) {
      case "all":
        await this.updateSettings({
          enabled: true,
          autoCollapseThreshold: 1, // Show every message immediately
        });
        break;
      case "summary":
        await this.updateSettings({
          enabled: true,
          autoCollapseThreshold: 3, // Show batches of 3+
        });
        break;
      case "off":
        await this.updateSettings({
          enabled: false,
        });
        break;
    }
  }

  public getDensity(): BatchDensity {
    if (!this.settings.enabled) return "off";
    if (this.settings.autoCollapseThreshold <= 1) return "all";
    return "summary";
  }

  private async loadSettings(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(BATCHING_SETTINGS_KEY);
      if (stored) {
        this.settings = { ...DEFAULT_BATCHING_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error("Failed to load batching settings:", error);
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem(BATCHING_SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error("Failed to save batching settings:", error);
    }
  }

  // Listener management
  public addListener(listener: BatchListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const batches = this.getBatches();
    for (const listener of this.listeners) {
      try {
        listener(batches);
      } catch (error) {
        console.error("Error in batch listener:", error);
      }
    }
  }

  // Public method to check if notification should show immediately
  public shouldShowImmediately(payload: NotificationPayload): boolean {
    if (!this.shouldBatch(payload)) {
      return true; // Urgent or non-batchable types show immediately
    }

    const groupKey = this.generateGroupKey(payload);
    const existing = this.batches.get(groupKey);

    if (!existing) {
      return true; // First notification in a group shows immediately
    }

    // Show immediately if under auto-collapse threshold
    return existing.count < this.settings.autoCollapseThreshold;
  }
}

// Export singleton instance
export const NotificationBatcher = NotificationBatcherService.getInstance();