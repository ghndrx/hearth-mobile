/**
 * Notification Delivery Service
 * Implements reliable notification delivery with tracking, retry logic, and analytics
 * Part of PN-006: Background processing and delivery optimization
 * 
 * Features:
 * - Background fetch and silent push notification handling
 * - Notification delivery confirmation and retry logic
 * - Background processing queue for pending notifications
 * - iOS: Background App Refresh + APNs silent pushes (content-available: 1)
 * - Android: FCM high-priority messages + WorkManager for reliable background processing
 * - Delivery rate analytics and monitoring
 * - Exponential backoff for failed deliveries
 * - Battery-efficient background strategies
 */

import { Platform, AppState, type AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { backgroundProcessingService } from './backgroundProcessing';
import { notificationPermissions, type NotificationPermissions } from './notificationPermissions';
import { processAndDeliverNotification } from './notifications';

// Optional expo-task-manager import - will use fallback if not available
let TaskManager: {
  defineTask: (taskName: string, taskExecutor: (data: any) => Promise<void>) => void;
} | null = null;

try {
  TaskManager = require('expo-task-manager');
} catch {
  console.warn('[NotificationDelivery] expo-task-manager not available, background tasks disabled');
}

// Background notification task name
const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';

// Optional expo-battery import - will use fallback if not available
let Battery: {
  getBatteryLevelAsync: () => Promise<number>;
  getBatteryStateAsync: () => Promise<number>;
  getPowerStateAsync: () => Promise<{ lowPowerMode: boolean }>;
  BatteryState: { UNKNOWN: number; CHARGING: number; DISCHARGING: number; NOT_CHARGING: number; FULL: number };
} | null = null;

try {
  Battery = require('expo-battery');
} catch {
  console.warn('[NotificationDelivery] expo-battery not available, using fallback values');
}

// Constants
const DELIVERY_QUEUE_KEY = '@hearth/notification_delivery_queue';
const DELIVERY_STATS_KEY = '@hearth/notification_delivery_stats';
const DELIVERY_SETTINGS_KEY = '@hearth/notification_delivery_settings';

// Delivery status for tracking
export type DeliveryStatus = 
  | 'pending'           // Queued for delivery
  | 'delivered'         // Successfully delivered to system
  | 'failed'            // Failed after all retries
  | 'expired'           // Notification expired
  | 'suppressed';       // Blocked by permissions/quiet hours

// Notification delivery record
export interface NotificationDeliveryRecord {
  id: string;
  notificationId?: string;      // Server-side notification ID
  localId: string;             // Client-generated local ID
  type: string;
  title: string;
  body: string;
  data: Record<string, any>;
  status: DeliveryStatus;
  createdAt: number;
  deliveredAt?: number;
  failedAt?: number;
  retryCount: number;
  lastAttemptAt?: number;
  nextRetryAt?: number;
  error?: string;
  priority: 'max' | 'high' | 'normal' | 'low';
  expiresAt?: number;           // Notifications can expire
}

// Delivery statistics
export interface DeliveryStats {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalSuppressed: number;
  totalExpired: number;
  byType: Record<string, {
    sent: number;
    delivered: number;
    failed: number;
  }>;
  averageRetryCount: number;
  successRate: number;         // Percentage
  lastDeliveryAt?: number;
  lastFailureAt?: number;
  streak: {
    current: number;           // Consecutive successful deliveries
    best: number;
  };
  hourlyBreakdown: Array<{
    hour: number;
    sent: number;
    delivered: number;
    failed: number;
  }>;
}

// Delivery settings
export interface DeliverySettings {
  maxRetries: number;
  baseRetryDelayMs: number;
  maxRetryDelayMs: number;
  notificationTTLMs: number;   // Time to live for notifications
  batchSize: number;
  batchDelayMs: number;
  enableAnalytics: boolean;
  enableSilentPushHandling: boolean;
  trackDeliveryReceipt: boolean;
  prioritizeHighImportance: boolean;
  batteryAwareRetry: boolean;   // Reduce retries when battery is low
  lowBatteryThreshold: number;
}

const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  maxRetries: 5,
  baseRetryDelayMs: 1000,       // 1 second
  maxRetryDelayMs: 300000,     // 5 minutes
  notificationTTLMs: 86400000, // 24 hours
  batchSize: 10,
  batchDelayMs: 500,
  enableAnalytics: true,
  enableSilentPushHandling: true,
  trackDeliveryReceipt: true,
  prioritizeHighImportance: true,
  batteryAwareRetry: true,
  lowBatteryThreshold: 15,     // 15% battery
};

// Exponential backoff calculator
function calculateBackoffDelay(
  retryCount: number,
  baseDelayMs: number,
  maxDelayMs: number,
  settings: DeliverySettings
): number {
  // Exponential backoff: baseDelay * 2^retryCount, with jitter
  const exponentialDelay = Math.min(
    baseDelayMs * Math.pow(2, retryCount),
    maxDelayMs
  );
  
  // Add jitter (±25%) to prevent thundering herd
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
  
  // Reduce delay when battery is low (if enabled)
  let batteryFactor = 1;
  if (settings.batteryAwareRetry) {
    // Will be calculated at runtime with actual battery level
    batteryFactor = 1; // Placeholder - actual calculation happens in delivery logic
  }
  
  return Math.round(Math.min(exponentialDelay + jitter, maxDelayMs));
}

// Main delivery service class
class NotificationDeliveryService {
  private deliveryQueue: Map<string, NotificationDeliveryRecord> = new Map();
  private settings: DeliverySettings = DEFAULT_DELIVERY_SETTINGS;
  private stats: DeliveryStats;
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private batteryLevel: number = 100;
  private batteryState: number = Battery?.BatteryState?.UNKNOWN ?? 0;
  private isLowPowerMode: boolean = false;
  
  // Silent push handling
  private silentPushHandler: ((data: Record<string, any>) => Promise<void>) | null = null;
  
  // App state tracking
  private appState: AppStateStatus = 'active';
  private lastActiveAt: number = Date.now();

  constructor() {
    this.stats = this.createEmptyStats();
    this.setupAppStateListener();
    this.setupBatteryMonitoring();
  }

  /**
   * Initialize the delivery service
   */
  async initialize(): Promise<void> {
    console.log('[NotificationDelivery] Initializing service...');
    
    try {
      // Load persisted state
      await this.loadPersistedState();
      
      // Start background processing via backgroundProcessingService
      await this.registerBackgroundTasks();
      
      // Set up silent push handlers
      this.setupSilentPushHandling();
      
      console.log('[NotificationDelivery] Service initialized successfully');
    } catch (error) {
      console.error('[NotificationDelivery] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Start the delivery service
   */
  async start(): Promise<void> {
    console.log('[NotificationDelivery] Starting service...');
    
    // Start periodic queue processing
    this.startPeriodicProcessing();
    
    // Process any pending notifications immediately
    await this.processQueue();
    
    console.log('[NotificationDelivery] Service started');
  }

  /**
   * Stop the delivery service
   */
  stop(): void {
    console.log('[NotificationDelivery] Stopping service...');
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    
    this.isProcessing = false;
    console.log('[NotificationDelivery] Service stopped');
  }

  /**
   * Queue a notification for delivery
   */
  async queueNotification(params: {
    type: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    priority?: 'max' | 'high' | 'normal' | 'low';
    expiresInMs?: number;
    silent?: boolean;  // For silent/background notifications
  }): Promise<string> {
    const localId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const record: NotificationDeliveryRecord = {
      id: localId,
      localId,
      type: params.type,
      title: params.title,
      body: params.body,
      data: params.data || {},
      status: 'pending',
      createdAt: Date.now(),
      retryCount: 0,
      priority: params.priority || 'normal',
      expiresAt: params.expiresInMs 
        ? Date.now() + params.expiresInMs 
        : Date.now() + this.settings.notificationTTLMs,
    };

    this.deliveryQueue.set(localId, record);
    await this.persistQueue();
    
    console.log(`[NotificationDelivery] Queued notification ${localId} of type ${params.type}`);
    
    // Process immediately for high-priority
    if (params.priority === 'max' || params.priority === 'high') {
      setTimeout(() => this.processQueue(), 0);
    }
    
    return localId;
  }

  /**
   * Cancel a queued notification
   */
  async cancelNotification(localId: string): Promise<boolean> {
    const record = this.deliveryQueue.get(localId);
    
    if (!record) {
      return false;
    }
    
    // Can only cancel pending notifications
    if (record.status !== 'pending') {
      return false;
    }
    
    this.deliveryQueue.delete(localId);
    await this.persistQueue();
    
    console.log(`[NotificationDelivery] Cancelled notification ${localId}`);
    return true;
  }

  /**
   * Get delivery statistics
   */
  getStats(): DeliveryStats {
    return { ...this.stats };
  }

  /**
   * Get pending notification count
   */
  getPendingCount(): number {
    return Array.from(this.deliveryQueue.values())
      .filter(r => r.status === 'pending').length;
  }

  /**
   * Get delivery record by ID
   */
  getDeliveryRecord(localId: string): NotificationDeliveryRecord | undefined {
    return this.deliveryQueue.get(localId);
  }

  /**
   * Update delivery settings
   */
  async updateSettings(updates: Partial<DeliverySettings>): Promise<void> {
    this.settings = { ...this.settings, ...updates };
    await AsyncStorage.setItem(DELIVERY_SETTINGS_KEY, JSON.stringify(this.settings));
    console.log('[NotificationDelivery] Settings updated');
  }

  /**
   * Set silent push handler (for background notification processing)
   */
  setSilentPushHandler(handler: (data: Record<string, any>) => Promise<void>): void {
    this.silentPushHandler = handler;
  }

  /**
   * Handle received silent push notification
   * Called when a content-available: 1 notification is received
   */
  async handleSilentPush(data: Record<string, any>): Promise<void> {
    if (!this.settings.enableSilentPushHandling) {
      console.log('[NotificationDelivery] Silent push handling disabled');
      return;
    }

    console.log('[NotificationDelivery] Handling silent push:', data);

    try {
      // Call registered handler if present
      if (this.silentPushHandler) {
        await this.silentPushHandler(data);
        return;
      }

      // Default handling: fetch pending data from server
      // This would typically trigger a sync with the backend
      const syncType = data.syncType || data.type;
      
      switch (syncType) {
        case 'messages':
          await this.syncMessages();
          break;
        case 'notifications':
          await this.syncNotifications();
          break;
        case 'sync_all':
          await this.syncAll();
          break;
        default:
          console.log('[NotificationDelivery] Unknown silent push type:', syncType);
      }
    } catch (error) {
      console.error('[NotificationDelivery] Silent push handling failed:', error);
      throw error;
    }
  }

  /**
   * Confirm delivery receipt (called when notification is shown to user)
   */
  async confirmDelivery(localId: string, notificationId?: string): Promise<void> {
    const record = this.deliveryQueue.get(localId);
    
    if (!record) {
      console.warn(`[NotificationDelivery] Record not found: ${localId}`);
      return;
    }

    const now = Date.now();
    record.status = 'delivered';
    record.deliveredAt = now;
    record.notificationId = notificationId;

    // Update stats
    this.stats.totalDelivered++;
    this.stats.lastDeliveryAt = now;
    this.stats.streak.current++;
    if (this.stats.streak.current > this.stats.streak.best) {
      this.stats.streak.best = this.stats.streak.current;
    }

    // Update type-specific stats
    if (!this.stats.byType[record.type]) {
      this.stats.byType[record.type] = { sent: 0, delivered: 0, failed: 0 };
    }
    this.stats.byType[record.type].delivered++;

    // Update hourly breakdown
    this.updateHourlyBreakdown(now, 'delivered');

    // Recalculate success rate
    this.recalculateSuccessRate();

    // Persist updated stats
    await this.persistStats();

    // Remove from queue (no need to keep delivered notifications)
    this.deliveryQueue.delete(localId);
    await this.persistQueue();

    console.log(`[NotificationDelivery] Confirmed delivery for ${localId}`);
  }

  /**
   * Register delivery failure (called when notification fails)
   */
  async registerFailure(
    localId: string, 
    error: string, 
    shouldRetry: boolean = true
  ): Promise<void> {
    const record = this.deliveryQueue.get(localId);
    
    if (!record) {
      console.warn(`[NotificationDelivery] Record not found for failure: ${localId}`);
      return;
    }

    record.lastAttemptAt = Date.now();
    record.error = error;
    record.retryCount++;

    if (!shouldRetry || record.retryCount >= this.settings.maxRetries) {
      // Max retries reached or non-retryable error
      record.status = 'failed';
      record.failedAt = Date.now();

      // Update stats
      this.stats.totalFailed++;
      this.stats.lastFailureAt = Date.now();
      this.stats.streak.current = 0; // Reset streak

      if (!this.stats.byType[record.type]) {
        this.stats.byType[record.type] = { sent: 0, delivered: 0, failed: 0 };
      }
      this.stats.byType[record.type].failed++;

      this.updateHourlyBreakdown(Date.now(), 'failed');

      console.log(`[NotificationDelivery] Notification ${localId} failed permanently: ${error}`);
    } else {
      // Schedule retry with exponential backoff
      const delay = calculateBackoffDelay(
        record.retryCount,
        this.settings.baseRetryDelayMs,
        this.settings.maxRetryDelayMs,
        this.settings
      );
      
      record.nextRetryAt = Date.now() + delay;
      console.log(`[NotificationDelivery] Scheduling retry for ${localId} in ${delay}ms (attempt ${record.retryCount + 1}/${this.settings.maxRetries})`);
    }

    // Recalculate success rate
    this.recalculateSuccessRate();

    // Persist updated state
    await this.persistQueue();
    await this.persistStats();
  }

  /**
   * Check if battery is low and we should reduce retry frequency
   */
  private async isBatteryLow(): Promise<boolean> {
    if (!this.settings.batteryAwareRetry) {
      return false;
    }

    try {
      if (!Battery) return false;
      const level = await Battery.getBatteryLevelAsync();
      return level * 100 < this.settings.lowBatteryThreshold;
    } catch {
      return false;
    }
  }

  /**
   * Process the delivery queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    const pendingRecords = this.getPendingRecords();
    
    if (pendingRecords.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Sort by priority (max > high > normal > low), then by createdAt
      pendingRecords.sort((a, b) => {
        const priorityOrder = { max: 0, high: 1, normal: 2, low: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.createdAt - b.createdAt;
      });

      // Check battery state for adaptive processing
      const isLowBattery = await this.isBatteryLow();
      
      // Process records with batching
      const batchSize = isLowBattery 
        ? Math.ceil(this.settings.batchSize / 2)  // Reduce batch size when low battery
        : this.settings.batchSize;

      for (let i = 0; i < pendingRecords.length; i += batchSize) {
        const batch = pendingRecords.slice(i, i + batchSize);
        await this.processBatch(batch, isLowBattery);
        
        // Delay between batches to preserve battery
        if (i + batchSize < pendingRecords.length) {
          const batchDelay = isLowBattery 
            ? this.settings.batchDelayMs * 2  // Double delay when low battery
            : this.settings.batchDelayMs;
          await this.delay(batchDelay);
        }
      }
    } catch (error) {
      console.error('[NotificationDelivery] Queue processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a batch of notification records
   */
  private async processBatch(
    records: NotificationDeliveryRecord[],
    isLowBattery: boolean
  ): Promise<void> {
    // Skip processing if app is backgrounded and battery is low
    if (isLowBattery && this.appState !== 'active') {
      console.log('[NotificationDelivery] Skipping batch processing - low battery and backgrounded');
      return;
    }

    // Skip if in critical thermal state
    const metrics = backgroundProcessingService.getPerformanceMetrics();
    if (metrics?.thermalState === 'critical') {
      console.log('[NotificationDelivery] Skipping batch - critical thermal state');
      return;
    }

    // Process notifications in parallel with controlled concurrency
    const concurrency = isLowBattery ? 2 : 5;
    
    for (let i = 0; i < records.length; i += concurrency) {
      const chunk = records.slice(i, i + concurrency);
      await Promise.all(chunk.map(record => this.deliverNotification(record)));
    }
  }

  /**
   * Deliver a single notification
   */
  private async deliverNotification(record: NotificationDeliveryRecord): Promise<void> {
    // Skip if expired
    if (record.expiresAt && Date.now() > record.expiresAt) {
      record.status = 'expired';
      this.stats.totalExpired++;
      this.deliveryQueue.delete(record.localId);
      console.log(`[NotificationDelivery] Notification ${record.localId} expired`);
      return;
    }

    // Skip if not yet time to retry
    if (record.nextRetryAt && Date.now() < record.nextRetryAt) {
      return;
    }

    // Skip if battery is low and we're throttling
    if (await this.isBatteryLow() && record.priority === 'low') {
      console.log(`[NotificationDelivery] Skipping low-priority ${record.localId} due to low battery`);
      return;
    }

    console.log(`[NotificationDelivery] Delivering notification ${record.localId}`);

    try {
      // Update attempt stats
      record.lastAttemptAt = Date.now();
      
      // Check permissions before delivering
      const permissions = await notificationPermissions.getPermissionSettings();
      
      // Deliver via the notification service
      const result = await processAndDeliverNotification({
        type: record.type as any,
        title: record.title,
        body: record.body,
        data: record.data,
        senderId: record.data.senderId || record.data.userId,
        serverId: record.data.serverId,
        channelId: record.data.channelId,
      });

      if (result.delivered) {
        await this.confirmDelivery(record.localId, result.notificationId);
      } else {
        // Blocked by permissions or settings
        record.status = 'suppressed';
        record.failedAt = Date.now();
        this.stats.totalSuppressed++;
        this.stats.streak.current = 0;
        
        if (!this.stats.byType[record.type]) {
          this.stats.byType[record.type] = { sent: 0, delivered: 0, failed: 0 };
        }
        
        console.log(`[NotificationDelivery] Notification ${record.localId} suppressed: ${result.reason}`);
        
        // Remove suppressed notifications from queue
        this.deliveryQueue.delete(record.localId);
        await this.persistQueue();
        await this.persistStats();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[NotificationDelivery] Delivery failed for ${record.localId}:`, errorMessage);
      
      await this.registerFailure(record.localId, errorMessage, true);
    }
  }

  /**
   * Get all pending records that are ready for delivery
   */
  private getPendingRecords(): NotificationDeliveryRecord[] {
    const now = Date.now();
    
    return Array.from(this.deliveryQueue.values())
      .filter(record => {
        if (record.status !== 'pending') {
          return false;
        }
        
        // Check if it's time for the next retry
        if (record.nextRetryAt && now < record.nextRetryAt) {
          return false;
        }
        
        return true;
      });
  }

  /**
   * Start periodic queue processing
   */
  private startPeriodicProcessing(): void {
    if (this.processingInterval) {
      return;
    }

    const intervalMs = 30000; // 30 seconds

    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, intervalMs);

    console.log(`[NotificationDelivery] Started periodic processing (interval: ${intervalMs}ms)`);
  }

  /**
   * Set up app state listener
   */
  private setupAppStateListener(): void {
    AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      console.log(`[NotificationDelivery] App state changed: ${this.appState} -> ${nextAppState}`);
      
      const previousState = this.appState;
      this.appState = nextAppState;

      if (nextAppState === 'active') {
        // App became active - process queue immediately
        this.lastActiveAt = Date.now();
        this.processQueue();
      } else if (nextAppState === 'background') {
        // App went to background - persist state
        this.persistQueue();
        this.persistStats();
      }
    });
  }

  /**
   * Set up battery monitoring
   */
  private setupBatteryMonitoring(): void {
    // Initial battery check
    this.updateBatteryState();

    // Periodic battery updates
    setInterval(() => {
      this.updateBatteryState();
    }, 60000); // Every minute
  }

  /**
   * Update battery state
   */
  private async updateBatteryState(): Promise<void> {
    try {
      if (!Battery) {
        console.log('[NotificationDelivery] Battery API not available');
        return;
      }

      const [level, state] = await Promise.all([
        Battery.getBatteryLevelAsync(),
        Battery.getBatteryStateAsync(),
      ]);
      
      this.batteryLevel = Math.round(level * 100);
      this.batteryState = state;

      const powerState = await Battery.getPowerStateAsync();
      this.isLowPowerMode = powerState.lowPowerMode;

      console.log(`[NotificationDelivery] Battery: ${this.batteryLevel}%, state: ${state}, low power: ${this.isLowPowerMode}`);
    } catch (error) {
      console.error('[NotificationDelivery] Failed to get battery state:', error);
    }
  }

  /**
   * Register background tasks for iOS/Android
   */
  private async registerBackgroundTasks(): Promise<void> {
    if (!TaskManager) {
      console.warn('[NotificationDelivery] expo-task-manager not available, skipping background task registration');
      return;
    }

    try {
      // Define the background notification task
      TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }: { data?: any; error?: any }) => {
        if (error) {
          console.error('[NotificationDelivery] Background task error:', error);
          return;
        }

        if (data) {
          // Handle the background notification data
          const notificationData = data as Record<string, any>;
          console.log('[NotificationDelivery] Received background notification:', notificationData);
          
          // Process silent push via the delivery service
          await this.handleSilentPush(notificationData);
        }
      });

      // Register the background task with Expo
      await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
      
      console.log('[NotificationDelivery] Background tasks registered');
    } catch (error) {
      console.error('[NotificationDelivery] Failed to register background tasks:', error);
    }
  }

  /**
   * Set up silent push notification handling
   */
  private setupSilentPushHandling(): void {
    // For iOS: Handle content-available notifications
    // For Android: Handle high-priority FCM messages
    
    if (Platform.OS === 'ios') {
      // iOS silent push handling is automatic when properly configured
      // The notification response handler will receive content-available pushes
      console.log('[NotificationDelivery] iOS silent push handling enabled');
    } else {
      // Android FCM high-priority handling
      console.log('[NotificationDelivery] Android FCM handling enabled');
    }
  }

  /**
   * Sync messages from server (triggered by silent push)
   */
  private async syncMessages(): Promise<void> {
    console.log('[NotificationDelivery] Syncing messages...');
    // This would typically call an API endpoint to fetch pending messages
    // The actual implementation would integrate with the message store
  }

  /**
   * Sync notifications from server (triggered by silent push)
   */
  private async syncNotifications(): Promise<void> {
    console.log('[NotificationDelivery] Syncing notifications...');
    // This would typically call an API endpoint to fetch pending notifications
  }

  /**
   * Full sync (triggered by silent push)
   */
  private async syncAll(): Promise<void> {
    console.log('[NotificationDelivery] Performing full sync...');
    await Promise.all([
      this.syncMessages(),
      this.syncNotifications(),
    ]);
  }

  /**
   * Create empty stats object
   */
  private createEmptyStats(): DeliveryStats {
    return {
      totalSent: 0,
      totalDelivered: 0,
      totalFailed: 0,
      totalSuppressed: 0,
      totalExpired: 0,
      byType: {},
      averageRetryCount: 0,
      successRate: 100,
      streak: {
        current: 0,
        best: 0,
      },
      hourlyBreakdown: this.createHourlyBreakdown(),
    };
  }

  /**
   * Create hourly breakdown structure
   */
  private createHourlyBreakdown(): DeliveryStats['hourlyBreakdown'] {
    const breakdown = [];
    for (let i = 0; i < 24; i++) {
      breakdown.push({ hour: i, sent: 0, delivered: 0, failed: 0 });
    }
    return breakdown;
  }

  /**
   * Update hourly breakdown
   */
  private updateHourlyBreakdown(timestamp: number, event: 'sent' | 'delivered' | 'failed'): void {
    const hour = new Date(timestamp).getHours();
    const entry = this.stats.hourlyBreakdown.find(h => h.hour === hour);
    if (entry) {
      entry[event]++;
    }
  }

  /**
   * Recalculate success rate
   */
  private recalculateSuccessRate(): void {
    const total = this.stats.totalDelivered + this.stats.totalFailed + this.stats.totalSuppressed;
    if (total === 0) {
      this.stats.successRate = 100;
    } else {
      this.stats.successRate = Math.round((this.stats.totalDelivered / total) * 100);
    }
  }

  /**
   * Persist delivery queue to storage
   */
  private async persistQueue(): Promise<void> {
    try {
      const records = Array.from(this.deliveryQueue.values());
      await AsyncStorage.setItem(DELIVERY_QUEUE_KEY, JSON.stringify(records));
    } catch (error) {
      console.error('[NotificationDelivery] Failed to persist queue:', error);
    }
  }

  /**
   * Persist delivery stats to storage
   */
  private async persistStats(): Promise<void> {
    try {
      await AsyncStorage.setItem(DELIVERY_STATS_KEY, JSON.stringify(this.stats));
    } catch (error) {
      console.error('[NotificationDelivery] Failed to persist stats:', error);
    }
  }

  /**
   * Load persisted state from storage
   */
  private async loadPersistedState(): Promise<void> {
    try {
      // Load queue
      const queueData = await AsyncStorage.getItem(DELIVERY_QUEUE_KEY);
      if (queueData) {
        const records: NotificationDeliveryRecord[] = JSON.parse(queueData);
        this.deliveryQueue.clear();
        records.forEach(record => {
          // Only restore pending records that haven't expired
          if (record.status === 'pending' && (!record.expiresAt || Date.now() < record.expiresAt)) {
            this.deliveryQueue.set(record.localId, record);
          }
        });
        console.log(`[NotificationDelivery] Restored ${this.deliveryQueue.size} pending notifications`);
      }

      // Load stats
      const statsData = await AsyncStorage.getItem(DELIVERY_STATS_KEY);
      if (statsData) {
        this.stats = JSON.parse(statsData);
      }

      // Load settings
      const settingsData = await AsyncStorage.getItem(DELIVERY_SETTINGS_KEY);
      if (settingsData) {
        this.settings = { ...DEFAULT_DELIVERY_SETTINGS, ...JSON.parse(settingsData) };
      }

      // Initialize background processing service
      await backgroundProcessingService.start();
    } catch (error) {
      console.error('[NotificationDelivery] Failed to load persisted state:', error);
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear all delivery data (for testing/reset)
   */
  async clearAllData(): Promise<void> {
    this.deliveryQueue.clear();
    this.stats = this.createEmptyStats();
    await Promise.all([
      AsyncStorage.removeItem(DELIVERY_QUEUE_KEY),
      AsyncStorage.removeItem(DELIVERY_STATS_KEY),
    ]);
    console.log('[NotificationDelivery] All data cleared');
  }

  /**
   * Get delivery rate (percentage of notifications successfully delivered)
   */
  getDeliveryRate(): number {
    return this.stats.successRate;
  }

  /**
   * Check if we're meeting the 99% delivery target
   */
  isMeetingDeliveryTarget(): boolean {
    return this.stats.successRate >= 99;
  }
}

// Export singleton instance
export const notificationDeliveryService = new NotificationDeliveryService();

// React hook for using the notification delivery service
export function useNotificationDelivery() {
  return {
    queueNotification: notificationDeliveryService.queueNotification.bind(notificationDeliveryService),
    cancelNotification: notificationDeliveryService.cancelNotification.bind(notificationDeliveryService),
    confirmDelivery: notificationDeliveryService.confirmDelivery.bind(notificationDeliveryService),
    registerFailure: notificationDeliveryService.registerFailure.bind(notificationDeliveryService),
    handleSilentPush: notificationDeliveryService.handleSilentPush.bind(notificationDeliveryService),
    setSilentPushHandler: notificationDeliveryService.setSilentPushHandler.bind(notificationDeliveryService),
    getStats: notificationDeliveryService.getStats.bind(notificationDeliveryService),
    getPendingCount: notificationDeliveryService.getPendingCount.bind(notificationDeliveryService),
    getDeliveryRecord: notificationDeliveryService.getDeliveryRecord.bind(notificationDeliveryService),
    updateSettings: notificationDeliveryService.updateSettings.bind(notificationDeliveryService),
    getDeliveryRate: notificationDeliveryService.getDeliveryRate.bind(notificationDeliveryService),
    isMeetingDeliveryTarget: notificationDeliveryService.isMeetingDeliveryTarget.bind(notificationDeliveryService),
    initialize: notificationDeliveryService.initialize.bind(notificationDeliveryService),
    start: notificationDeliveryService.start.bind(notificationDeliveryService),
    stop: notificationDeliveryService.stop.bind(notificationDeliveryService),
  };
}

export default notificationDeliveryService;
