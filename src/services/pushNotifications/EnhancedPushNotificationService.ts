/**
 * Enhanced Push Notification Service
 *
 * Integrates PN-006 background processing and delivery optimization
 * with the existing push notification system for improved reliability
 * and battery efficiency.
 *
 * Part of PN-006: Background processing and delivery optimization.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import pushNotificationService, {
  type PushNotificationConfig,
  type DeviceRegistration,
} from './PushNotificationService';
import {
  backgroundProcessingService,
  type ProcessingTask,
} from '../backgroundProcessing/BackgroundProcessingService';
import {
  deliveryOptimizationService,
  type DeliveryReceipt,
} from '../backgroundProcessing/DeliveryOptimizationService';
import {
  devicePerformanceMonitor,
  type DevicePerformanceState,
} from '../backgroundProcessing/DevicePerformanceMonitor';

export interface EnhancedNotificationConfig extends PushNotificationConfig {
  enableDeliveryOptimization?: boolean;
  enableBackgroundProcessing?: boolean;
  batchingEnabled?: boolean;
  priorityEscalationEnabled?: boolean;
  adaptiveDeliveryEnabled?: boolean;
}

export interface NotificationDeliveryOptions {
  priority?: 'critical' | 'high' | 'medium' | 'low';
  requireDeliveryReceipt?: boolean;
  maxRetries?: number;
  customRetryDelay?: number;
  batchable?: boolean;
  expirationTime?: number;
}

export interface EnhancedNotificationMetrics {
  deliveryRate: number;
  averageDeliveryTime: number;
  backgroundTasksQueued: number;
  backgroundTasksCompleted: number;
  batteryOptimizationScore: number;
  adaptiveProfileActive: string;
}

class EnhancedPushNotificationService {
  private baseService = pushNotificationService;
  private config: EnhancedNotificationConfig = {};
  private isInitialized = false;
  private performanceMonitorUnsubscribe?: () => void;
  private notificationQueue: Map<string, {
    notification: any;
    options: NotificationDeliveryOptions;
    attempts: number;
  }> = new Map();

  /**
   * Initialize the enhanced push notification service
   */
  async initialize(config: EnhancedNotificationConfig = {}): Promise<boolean> {
    this.config = {
      enableDeliveryOptimization: true,
      enableBackgroundProcessing: true,
      batchingEnabled: true,
      priorityEscalationEnabled: true,
      adaptiveDeliveryEnabled: true,
      ...config,
    };

    try {
      // Initialize background processing services first
      if (this.config.enableBackgroundProcessing) {
        await backgroundProcessingService.initialize();
      }

      if (this.config.enableDeliveryOptimization) {
        await deliveryOptimizationService.initialize();
      }

      await devicePerformanceMonitor.initialize();

      // Initialize base push notification service with enhanced config
      const baseInitialized = await this.baseService.initialize({
        ...config,
        onNotificationReceived: this.handleNotificationReceived.bind(this),
        onTokenReceived: this.handleTokenReceived.bind(this),
        onTokenRefresh: this.handleTokenRefresh.bind(this),
      });

      if (!baseInitialized) {
        return false;
      }

      // Subscribe to performance monitor for adaptive delivery
      if (this.config.adaptiveDeliveryEnabled) {
        this.performanceMonitorUnsubscribe = devicePerformanceMonitor.subscribe(
          this.handlePerformanceStateChange.bind(this)
        );
      }

      this.isInitialized = true;
      console.log('Enhanced push notification service initialized');

      return true;
    } catch (error) {
      console.error('Failed to initialize enhanced push notification service:', error);
      return false;
    }
  }

  /**
   * Shutdown the service
   */
  shutdown(): void {
    this.performanceMonitorUnsubscribe?.();
    this.notificationQueue.clear();
    this.isInitialized = false;
  }

  /**
   * Send a notification with enhanced delivery optimization
   */
  async sendNotification(
    to: string,
    notification: {
      title: string;
      body: string;
      data?: any;
      sound?: string;
      badge?: number;
    },
    options: NotificationDeliveryOptions = {}
  ): Promise<DeliveryReceipt | null> {
    if (!this.isInitialized) {
      throw new Error('Enhanced push notification service not initialized');
    }

    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const deliveryOptions: NotificationDeliveryOptions = {
      priority: 'medium',
      requireDeliveryReceipt: true,
      maxRetries: 3,
      batchable: true,
      expirationTime: 24 * 60 * 60 * 1000, // 24 hours
      ...options,
    };

    // Create delivery action
    const deliveryAction = async (): Promise<void> => {
      try {
        // Send via Expo push notifications
        await Notifications.scheduleNotificationAsync({
          content: {
            title: notification.title,
            body: notification.body,
            data: {
              ...notification.data,
              notificationId,
            },
            sound: notification.sound,
            badge: notification.badge,
          },
          trigger: null, // Send immediately
        });

        console.log(`Notification ${notificationId} sent successfully`);
      } catch (error) {
        console.error(`Failed to send notification ${notificationId}:`, error);
        throw error;
      }
    };

    // Track delivery with optimization service
    if (this.config.enableDeliveryOptimization && deliveryOptions.requireDeliveryReceipt) {
      return await deliveryOptimizationService.trackDelivery(
        notificationId,
        deliveryAction,
        {
          priority: deliveryOptions.priority,
          platform: Platform.OS as 'ios' | 'android',
        }
      );
    } else {
      // Fallback: queue as background task without tracking
      if (this.config.enableBackgroundProcessing) {
        backgroundProcessingService.addTask({
          id: `notification_${notificationId}`,
          priority: deliveryOptions.priority || 'medium',
          type: 'notification_delivery',
          action: deliveryAction,
          maxRetries: deliveryOptions.maxRetries,
          canDefer: deliveryOptions.batchable,
        });
      } else {
        await deliveryAction();
      }
      return null;
    }
  }

  /**
   * Send multiple notifications with intelligent batching
   */
  async sendBatchNotifications(
    notifications: Array<{
      to: string;
      notification: {
        title: string;
        body: string;
        data?: any;
        sound?: string;
        badge?: number;
      };
      options?: NotificationDeliveryOptions;
    }>
  ): Promise<DeliveryReceipt[]> {
    if (!this.config.batchingEnabled) {
      // Send individually if batching is disabled
      const receipts: DeliveryReceipt[] = [];
      for (const item of notifications) {
        const receipt = await this.sendNotification(item.to, item.notification, item.options);
        if (receipt) receipts.push(receipt);
      }
      return receipts;
    }

    // Group by priority for efficient batching
    const priorityGroups = new Map<string, typeof notifications>();
    for (const notif of notifications) {
      const priority = notif.options?.priority || 'medium';
      if (!priorityGroups.has(priority)) {
        priorityGroups.set(priority, []);
      }
      priorityGroups.get(priority)!.push(notif);
    }

    const allReceipts: DeliveryReceipt[] = [];

    // Process each priority group
    for (const [priority, group] of priorityGroups) {
      const batchReceipts = await Promise.all(
        group.map(item => this.sendNotification(item.to, item.notification, {
          ...item.options,
          priority: priority as 'critical' | 'high' | 'medium' | 'low',
          batchable: true,
        }))
      );

      const validReceipts = batchReceipts.filter((r): r is DeliveryReceipt => r !== null);
      allReceipts.push(...validReceipts);
    }

    return allReceipts;
  }

  /**
   * Get enhanced notification metrics
   */
  getMetrics(): EnhancedNotificationMetrics {
    const deliveryMetrics = this.config.enableDeliveryOptimization
      ? deliveryOptimizationService.getMetrics()
      : {
          totalSent: 0,
          totalDelivered: 0,
          deliveryRate: 100,
          averageDeliveryTimeMs: 0,
        };

    const processingStats = this.config.enableBackgroundProcessing
      ? backgroundProcessingService.getStats()
      : {
          queuedTasks: 0,
          totalProcessed: 0,
        };

    const deviceState = devicePerformanceMonitor.getState();
    const resourceMetrics = backgroundProcessingService.getMetrics();

    return {
      deliveryRate: deliveryMetrics.deliveryRate,
      averageDeliveryTime: deliveryMetrics.averageDeliveryTimeMs,
      backgroundTasksQueued: processingStats.queuedTasks,
      backgroundTasksCompleted: processingStats.totalProcessed,
      batteryOptimizationScore: resourceMetrics.batteryLevel,
      adaptiveProfileActive: deviceState?.activeProfile.name || 'Unknown',
    };
  }

  /**
   * Retry failed notifications
   */
  async retryFailedNotifications(): Promise<number> {
    if (!this.config.enableDeliveryOptimization) {
      return 0;
    }

    return await deliveryOptimizationService.retryFailedDeliveries((notificationId: string) => {
      return async () => {
        // Re-send the notification
        const queuedNotification = this.notificationQueue.get(notificationId);
        if (queuedNotification) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Retry: ' + (queuedNotification.notification.title || 'Notification'),
              body: queuedNotification.notification.body,
              data: {
                ...queuedNotification.notification.data,
                notificationId,
                isRetry: true,
              },
            },
            trigger: null,
          });
        }
      };
    });
  }

  /**
   * Get delivery receipt for a notification
   */
  getDeliveryReceipt(notificationId: string): DeliveryReceipt | undefined {
    if (!this.config.enableDeliveryOptimization) {
      return undefined;
    }
    return deliveryOptimizationService.getReceipt(notificationId);
  }

  /**
   * Subscribe to delivery receipt updates
   */
  onDeliveryUpdate(callback: (receipt: DeliveryReceipt) => void): () => void {
    if (!this.config.enableDeliveryOptimization) {
      return () => {}; // No-op
    }
    return deliveryOptimizationService.onReceiptUpdate(callback);
  }

  // Private methods

  private async handleNotificationReceived(notification: Notifications.Notification): Promise<void> {
    // Confirm delivery if tracking is enabled
    const notificationId = notification.request.content.data?.notificationId;
    if (notificationId && this.config.enableDeliveryOptimization) {
      deliveryOptimizationService.confirmDelivery(notificationId);
    }

    // Queue processing task for notification handling
    if (this.config.enableBackgroundProcessing) {
      backgroundProcessingService.addTask({
        id: `process_notification_${notificationId || Date.now()}`,
        priority: 'high',
        type: 'other',
        action: async () => {
          // Process notification in background
          this.config.onNotificationReceived?.(notification);
        },
      });
    } else {
      // Process immediately
      this.config.onNotificationReceived?.(notification);
    }
  }

  private async handleTokenReceived(token: string): Promise<void> {
    // Queue token registration as background task
    if (this.config.enableBackgroundProcessing) {
      backgroundProcessingService.addTask({
        id: `token_registration_${Date.now()}`,
        priority: 'high',
        type: 'other',
        canDefer: false,
        action: async () => {
          this.config.onTokenReceived?.(token);
        },
      });
    } else {
      this.config.onTokenReceived?.(token);
    }
  }

  private async handleTokenRefresh(token: string): Promise<void> {
    // Queue token refresh as background task
    if (this.config.enableBackgroundProcessing) {
      backgroundProcessingService.addTask({
        id: `token_refresh_${Date.now()}`,
        priority: 'high',
        type: 'other',
        canDefer: false,
        action: async () => {
          this.config.onTokenRefresh?.(token);
        },
      });
    } else {
      this.config.onTokenRefresh?.(token);
    }
  }

  private handlePerformanceStateChange(state: DevicePerformanceState): void {
    if (!this.config.adaptiveDeliveryEnabled) return;

    // Adapt notification delivery based on device performance
    const profile = state.activeProfile;
    const batteryLevel = state.powerState.batteryLevel;
    const isCharging = state.powerState.isCharging;
    const memoryPressure = state.memoryState.memoryPressure;

    // Update delivery optimization config based on device state
    if (this.config.enableDeliveryOptimization) {
      let maxRetries = 3;
      let baseRetryDelay = 1000;

      if (profile.id === 'battery_saver' || (!isCharging && batteryLevel < 30)) {
        // Reduce retries in battery saver mode
        maxRetries = 2;
        baseRetryDelay = 5000; // Longer delay to conserve battery
      } else if (profile.id === 'high_performance' && memoryPressure === 'low') {
        // More aggressive retries in high performance mode
        maxRetries = 5;
        baseRetryDelay = 500;
      }

      // Note: deliveryOptimizationService doesn't have updateConfig method in the current implementation
      // This would need to be added to make this fully functional
    }

    // Update background processing config
    if (this.config.enableBackgroundProcessing) {
      backgroundProcessingService.updateConfig({
        maxConcurrentTasks: profile.maxConcurrentTasks,
        respectLowPowerMode: !profile.backgroundProcessingEnabled,
        minBatteryLevel: profile.id === 'battery_saver' ? 25 : 15,
      });
    }

    console.log(
      `Adaptive delivery: ${profile.name}, battery: ${batteryLevel}%, ` +
      `memory: ${memoryPressure}, charging: ${isCharging}`
    );
  }
}

// Export singleton instance
export const enhancedPushNotificationService = new EnhancedPushNotificationService();

/**
 * Enhanced hook for push notifications with PN-006 optimizations
 */
export function useEnhancedPushNotifications(config?: EnhancedNotificationConfig) {
  // This would need to be implemented as a React hook
  // For now, providing the service instance
  return enhancedPushNotificationService;
}

export default enhancedPushNotificationService;