import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BatteryOptimizationService from '../battery/BatteryOptimizationService';

export interface NotificationRequest {
  id: string;
  title: string;
  body: string;
  data?: any;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'message' | 'voice_call' | 'system' | 'social' | 'marketing';
  scheduleAfter?: number; // Timestamp
  batteryOptimized?: boolean;
  allowInLowPower?: boolean;
  groupKey?: string; // For notification grouping
  sound?: boolean;
  vibration?: boolean;
  createdAt: number;
  expiresAt?: number;
}

export interface NotificationSettings {
  batteryAwareEnabled: boolean;
  criticalAlwaysAllowed: boolean;
  lowPowerModeSettings: {
    allowMessages: boolean;
    allowVoiceCalls: boolean;
    allowSystem: boolean;
    allowSocial: boolean;
    allowMarketing: boolean;
  };
  batteryThresholds: {
    disableNonCritical: number; // e.g., 0.15 (15%)
    disableLowPriority: number; // e.g., 0.30 (30%)
    enableQuietHours: number; // e.g., 0.20 (20%)
  };
  groupingSettings: {
    enabled: boolean;
    maxGroupSize: number;
    groupTimeWindowMs: number;
  };
  chargingBehavior: {
    resumeAllNotifications: boolean;
    catchUpMissed: boolean;
    maxCatchUpNotifications: number;
  };
}

export interface NotificationMetrics {
  totalSent: number;
  batteryOptimized: number;
  grouped: number;
  delayed: number;
  suppressed: number;
  batterySavings: number; // Estimated battery savings in percentage
}

export class BatteryAwareNotificationService {
  private static instance: BatteryAwareNotificationService;
  private pendingNotifications: NotificationRequest[] = [];
  private groupedNotifications: Map<string, NotificationRequest[]> = new Map();
  private batteryService!: typeof BatteryOptimizationService;
  private processingTimer: NodeJS.Timeout | null = null;

  private settings: NotificationSettings = {
    batteryAwareEnabled: true,
    criticalAlwaysAllowed: true,
    lowPowerModeSettings: {
      allowMessages: true,
      allowVoiceCalls: true,
      allowSystem: true,
      allowSocial: false,
      allowMarketing: false,
    },
    batteryThresholds: {
      disableNonCritical: 0.15,
      disableLowPriority: 0.30,
      enableQuietHours: 0.20,
    },
    groupingSettings: {
      enabled: true,
      maxGroupSize: 5,
      groupTimeWindowMs: 300000, // 5 minutes
    },
    chargingBehavior: {
      resumeAllNotifications: true,
      catchUpMissed: true,
      maxCatchUpNotifications: 10,
    },
  };

  private metrics: NotificationMetrics = {
    totalSent: 0,
    batteryOptimized: 0,
    grouped: 0,
    delayed: 0,
    suppressed: 0,
    batterySavings: 0,
  };

  static getInstance(): BatteryAwareNotificationService {
    if (!BatteryAwareNotificationService.instance) {
      BatteryAwareNotificationService.instance = new BatteryAwareNotificationService();
    }
    return BatteryAwareNotificationService.instance;
  }

  async initialize(): Promise<void> {
    this.batteryService = BatteryOptimizationService;

    // Load settings and metrics
    await this.loadSettings();
    await this.loadMetrics();

    // Configure notification handler
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const shouldShow = await this.shouldShowNotification(notification);
        return {
          shouldShowAlert: shouldShow,
          shouldPlaySound: shouldShow && this.shouldPlaySound(),
          shouldSetBadge: shouldShow,
        };
      },
    });

    // Start periodic processing
    this.startPeriodicProcessing();

    // Listen to battery changes
    this.batteryService.subscribe((batteryMetrics) => {
      this.handleBatteryStateChange(batteryMetrics);
    });

    console.log('Battery-aware notification service initialized');
  }

  // Schedule a notification with battery optimization
  async scheduleNotification(request: Omit<NotificationRequest, 'id' | 'createdAt'>): Promise<string> {
    const notificationRequest: NotificationRequest = {
      ...request,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      batteryOptimized: request.batteryOptimized !== false, // Default to true
    };

    // Apply battery optimizations if enabled
    if (this.settings.batteryAwareEnabled && notificationRequest.batteryOptimized) {
      const optimizedRequest = this.applyBatteryOptimizations(notificationRequest);

      if (!optimizedRequest) {
        // Notification was suppressed
        this.metrics.suppressed++;
        this.saveMetrics();
        return notificationRequest.id;
      }

      notificationRequest.scheduleAfter = optimizedRequest.scheduleAfter;
      notificationRequest.sound = optimizedRequest.sound;
      notificationRequest.vibration = optimizedRequest.vibration;
    }

    // Handle grouping
    if (this.settings.groupingSettings.enabled && notificationRequest.groupKey) {
      this.addToGroup(notificationRequest);
      return notificationRequest.id;
    }

    // Schedule immediately or add to pending queue
    if (notificationRequest.scheduleAfter && notificationRequest.scheduleAfter > Date.now()) {
      this.pendingNotifications.push(notificationRequest);
      this.metrics.delayed++;
    } else {
      await this.sendNotificationNow(notificationRequest);
    }

    this.saveMetrics();
    return notificationRequest.id;
  }

  private applyBatteryOptimizations(request: NotificationRequest): NotificationRequest | null {
    const batteryMetrics = this.batteryService.getBatteryMetrics();
    const { level, isCharging, lowPowerMode } = batteryMetrics;

    // Check if notification should be suppressed
    if (this.shouldSuppressNotification(request, level, isCharging, lowPowerMode)) {
      return null;
    }

    const optimizedRequest = { ...request };

    // Apply low power mode restrictions
    if (lowPowerMode) {
      const category = request.category;
      const lowPowerSettings = this.settings.lowPowerModeSettings;

      if (!this.isCategoryAllowedInLowPower(category, lowPowerSettings)) {
        return null; // Suppress notification
      }

      // Reduce notification impact in low power mode
      optimizedRequest.sound = false;
      optimizedRequest.vibration = false;
    }

    // Apply battery level-based optimizations
    if (level < this.settings.batteryThresholds.disableNonCritical && !isCharging) {
      if (request.priority !== 'critical') {
        // Delay non-critical notifications until charging
        optimizedRequest.scheduleAfter = this.getNextChargingOpportunity();
        this.metrics.batteryOptimized++;
      }
    } else if (level < this.settings.batteryThresholds.disableLowPriority && !isCharging) {
      if (request.priority === 'low') {
        // Delay low priority notifications
        optimizedRequest.scheduleAfter = Date.now() + 30 * 60 * 1000; // 30 minutes
        this.metrics.batteryOptimized++;
      }

      // Disable sound/vibration for medium priority
      if (request.priority === 'medium') {
        optimizedRequest.sound = false;
        optimizedRequest.vibration = false;
      }
    }

    // Enable quiet hours for very low battery
    if (level < this.settings.batteryThresholds.enableQuietHours && !isCharging) {
      optimizedRequest.sound = false;
      optimizedRequest.vibration = false;
    }

    return optimizedRequest;
  }

  private shouldSuppressNotification(
    request: NotificationRequest,
    batteryLevel: number,
    isCharging: boolean,
    lowPowerMode: boolean
  ): boolean {
    // Never suppress critical notifications
    if (request.priority === 'critical' && this.settings.criticalAlwaysAllowed) {
      return false;
    }

    // Suppress marketing notifications in low power situations
    if (request.category === 'marketing') {
      if (lowPowerMode || (batteryLevel < 0.3 && !isCharging)) {
        return true;
      }
    }

    // Suppress expired notifications
    if (request.expiresAt && Date.now() > request.expiresAt) {
      return true;
    }

    return false;
  }

  private isCategoryAllowedInLowPower(
    category: NotificationRequest['category'],
    settings: NotificationSettings['lowPowerModeSettings']
  ): boolean {
    switch (category) {
      case 'message': return settings.allowMessages;
      case 'voice_call': return settings.allowVoiceCalls;
      case 'system': return settings.allowSystem;
      case 'social': return settings.allowSocial;
      case 'marketing': return settings.allowMarketing;
      default: return false;
    }
  }

  private getNextChargingOpportunity(): number {
    // Estimate next charging time based on usage patterns
    // For simplicity, assume charging typically happens in the evening
    const now = new Date();
    const evening = new Date();
    evening.setHours(20, 0, 0, 0); // 8 PM

    if (now.getTime() > evening.getTime()) {
      // After 8 PM today, schedule for 8 PM tomorrow
      evening.setDate(evening.getDate() + 1);
    }

    return evening.getTime();
  }

  private addToGroup(request: NotificationRequest): void {
    const groupKey = request.groupKey!;

    if (!this.groupedNotifications.has(groupKey)) {
      this.groupedNotifications.set(groupKey, []);
    }

    const group = this.groupedNotifications.get(groupKey)!;
    group.push(request);

    const { maxGroupSize, groupTimeWindowMs } = this.settings.groupingSettings;

    // Check if group should be sent
    if (group.length >= maxGroupSize) {
      this.sendGroupedNotification(groupKey);
    } else {
      // Schedule group to be sent after time window
      setTimeout(() => {
        if (this.groupedNotifications.has(groupKey)) {
          this.sendGroupedNotification(groupKey);
        }
      }, groupTimeWindowMs);
    }
  }

  private async sendGroupedNotification(groupKey: string): Promise<void> {
    const group = this.groupedNotifications.get(groupKey);
    if (!group || group.length === 0) return;

    // Remove group from pending
    this.groupedNotifications.delete(groupKey);

    if (group.length === 1) {
      // Single notification, send normally
      await this.sendNotificationNow(group[0]);
      return;
    }

    // Create grouped notification
    const highestPriorityNotif = group.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    })[0];

    const groupedNotification: NotificationRequest = {
      id: `group_${groupKey}_${Date.now()}`,
      title: this.createGroupTitle(group),
      body: this.createGroupBody(group),
      priority: highestPriorityNotif.priority,
      category: highestPriorityNotif.category,
      data: {
        isGrouped: true,
        notifications: group.map(n => ({ id: n.id, title: n.title, body: n.body })),
      },
      createdAt: Date.now(),
      sound: highestPriorityNotif.sound,
      vibration: highestPriorityNotif.vibration,
    };

    await this.sendNotificationNow(groupedNotification);
    this.metrics.grouped += group.length;
  }

  private createGroupTitle(group: NotificationRequest[]): string {
    const categories = [...new Set(group.map(n => n.category))];

    if (categories.length === 1) {
      switch (categories[0]) {
        case 'message': return `${group.length} new messages`;
        case 'social': return `${group.length} social updates`;
        case 'system': return `${group.length} system notifications`;
        default: return `${group.length} notifications`;
      }
    }

    return `${group.length} new notifications`;
  }

  private createGroupBody(group: NotificationRequest[]): string {
    if (group.length <= 3) {
      return group.map(n => n.title).join(', ');
    }

    const firstTwo = group.slice(0, 2).map(n => n.title).join(', ');
    return `${firstTwo} and ${group.length - 2} more`;
  }

  private async sendNotificationNow(request: NotificationRequest): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: request.title,
          body: request.body,
          data: request.data,
          sound: request.sound !== false ? 'default' : undefined,
        },
        trigger: null, // Send immediately
      });

      this.metrics.totalSent++;
      this.updateBatterySavings();
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  private async shouldShowNotification(notification: Notifications.Notification): Promise<boolean> {
    if (!this.settings.batteryAwareEnabled) {
      return true;
    }

    const batteryMetrics = this.batteryService.getBatteryMetrics();

    // Always show critical notifications
    const notificationData = notification.request.content.data as any;
    if (notificationData?.priority === 'critical') {
      return true;
    }

    // Apply battery-based filtering
    if (batteryMetrics.lowPowerMode && !notificationData?.allowInLowPower) {
      return false;
    }

    return true;
  }

  private shouldPlaySound(): boolean {
    const batteryMetrics = this.batteryService.getBatteryMetrics();
    const { level, lowPowerMode } = batteryMetrics;

    // No sound in low power mode or very low battery
    if (lowPowerMode || level < 0.15) {
      return false;
    }

    return true;
  }

  private handleBatteryStateChange(batteryMetrics: any): void {
    // When device starts charging, process catch-up notifications
    if (batteryMetrics.isCharging && this.settings.chargingBehavior.resumeAllNotifications) {
      this.processCatchUpNotifications();
    }
  }

  private async processCatchUpNotifications(): Promise<void> {
    if (!this.settings.chargingBehavior.catchUpMissed) return;

    const now = Date.now();
    const { maxCatchUpNotifications } = this.settings.chargingBehavior;

    // Get delayed notifications that should be sent
    const toSend = this.pendingNotifications
      .filter(n => (n.scheduleAfter || 0) <= now)
      .slice(0, maxCatchUpNotifications)
      .sort((a, b) => {
        // Sort by priority then by age
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.createdAt - b.createdAt;
      });

    // Remove from pending
    this.pendingNotifications = this.pendingNotifications.filter(
      n => !toSend.some(s => s.id === n.id)
    );

    // Send notifications with delays to avoid overwhelming
    for (let i = 0; i < toSend.length; i++) {
      setTimeout(() => {
        this.sendNotificationNow(toSend[i]);
      }, i * 2000); // 2-second intervals
    }
  }

  private startPeriodicProcessing(): void {
    this.processingTimer = setInterval(() => {
      this.processPendingNotifications();
      this.cleanupExpiredNotifications();
    }, 60000); // Check every minute
  }

  private async processPendingNotifications(): Promise<void> {
    const now = Date.now();
    const toProcess = this.pendingNotifications.filter(n => (n.scheduleAfter || 0) <= now);

    if (toProcess.length === 0) return;

    // Remove processed notifications from pending
    this.pendingNotifications = this.pendingNotifications.filter(
      n => !toProcess.some(p => p.id === n.id)
    );

    // Send notifications
    for (const notification of toProcess) {
      await this.sendNotificationNow(notification);
    }
  }

  private cleanupExpiredNotifications(): void {
    const now = Date.now();

    // Remove expired pending notifications
    this.pendingNotifications = this.pendingNotifications.filter(
      n => !n.expiresAt || n.expiresAt > now
    );

    // Clean up old grouped notifications
    this.groupedNotifications.forEach((group, key) => {
      const validNotifications = group.filter(n => !n.expiresAt || n.expiresAt > now);
      if (validNotifications.length === 0) {
        this.groupedNotifications.delete(key);
      } else {
        this.groupedNotifications.set(key, validNotifications);
      }
    });
  }

  private updateBatterySavings(): void {
    // Estimate battery savings based on optimizations
    const totalOptimizations = this.metrics.batteryOptimized + this.metrics.grouped + this.metrics.suppressed;
    const estimatedSavingsPerOptimization = 0.01; // 0.01% per optimization
    this.metrics.batterySavings = totalOptimizations * estimatedSavingsPerOptimization;
  }

  // Public API methods
  async updateSettings(newSettings: Partial<NotificationSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();
  }

  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  getMetrics(): NotificationMetrics {
    return { ...this.metrics };
  }

  getPendingNotificationsCount(): number {
    return this.pendingNotifications.length +
           Array.from(this.groupedNotifications.values()).reduce((sum, group) => sum + group.length, 0);
  }

  async cancelNotification(id: string): Promise<boolean> {
    // Remove from pending
    const pendingIndex = this.pendingNotifications.findIndex(n => n.id === id);
    if (pendingIndex > -1) {
      this.pendingNotifications.splice(pendingIndex, 1);
      return true;
    }

    // Remove from grouped
    for (const [key, group] of this.groupedNotifications.entries()) {
      const groupIndex = group.findIndex(n => n.id === id);
      if (groupIndex > -1) {
        group.splice(groupIndex, 1);
        if (group.length === 0) {
          this.groupedNotifications.delete(key);
        }
        return true;
      }
    }

    // Cancel scheduled notification
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
      return true;
    } catch {
      return false;
    }
  }

  // Persistence
  private async loadSettings(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('notification_settings');
      if (stored) {
        this.settings = { ...this.settings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load notification settings:', error);
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem('notification_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save notification settings:', error);
    }
  }

  private async loadMetrics(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('notification_metrics');
      if (stored) {
        this.metrics = { ...this.metrics, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load notification metrics:', error);
    }
  }

  private async saveMetrics(): Promise<void> {
    try {
      await AsyncStorage.setItem('notification_metrics', JSON.stringify(this.metrics));
    } catch (error) {
      console.warn('Failed to save notification metrics:', error);
    }
  }

  // Cleanup
  dispose(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }

    this.saveSettings();
    this.saveMetrics();
  }
}

export default BatteryAwareNotificationService.getInstance();