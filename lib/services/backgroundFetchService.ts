/**
 * Background Fetch Service (PN-006)
 * Registers and manages background fetch tasks for periodic notification
 * processing, delivery retry, token validation, and data sync.
 */

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { AppState, Platform } from 'react-native';
import NotificationDeliveryTrackingService from './notificationDeliveryTracking';
import TokenRefreshManager from './tokenRefreshManager';
import BackgroundTaskManager from './backgroundTaskManager';

// Task identifiers
export const BACKGROUND_FETCH_TASK = 'hearth-background-fetch';
export const DELIVERY_RETRY_TASK = 'hearth-delivery-retry';
export const TOKEN_VALIDATION_TASK = 'hearth-token-validation';

export interface BackgroundFetchConfig {
  minimumInterval: number; // seconds
  stopOnTerminate: boolean;
  startOnBoot: boolean;
  enableHeadless: boolean;
}

export interface BackgroundFetchMetrics {
  totalFetches: number;
  successfulFetches: number;
  failedFetches: number;
  noDataFetches: number;
  lastFetchAt: number | null;
  lastFetchResult: 'new_data' | 'no_data' | 'failed' | null;
  averageFetchDuration: number;
  isRegistered: boolean;
}

const DEFAULT_CONFIG: BackgroundFetchConfig = {
  minimumInterval: 15 * 60, // 15 minutes (iOS minimum)
  stopOnTerminate: false,
  startOnBoot: true,
  enableHeadless: true,
};

const DEFAULT_METRICS: BackgroundFetchMetrics = {
  totalFetches: 0,
  successfulFetches: 0,
  failedFetches: 0,
  noDataFetches: 0,
  lastFetchAt: null,
  lastFetchResult: null,
  averageFetchDuration: 0,
  isRegistered: false,
};

class BackgroundFetchService {
  private static instance: BackgroundFetchService;
  private config: BackgroundFetchConfig = { ...DEFAULT_CONFIG };
  private metrics: BackgroundFetchMetrics = { ...DEFAULT_METRICS };
  private isInitialized = false;

  private constructor() {}

  static getInstance(): BackgroundFetchService {
    if (!BackgroundFetchService.instance) {
      BackgroundFetchService.instance = new BackgroundFetchService();
    }
    return BackgroundFetchService.instance;
  }

  /**
   * Initialize and register background fetch tasks
   */
  async initialize(config?: Partial<BackgroundFetchConfig>): Promise<boolean> {
    if (this.isInitialized) return true;

    if (config) {
      this.config = { ...DEFAULT_CONFIG, ...config };
    }

    try {
      await this.registerBackgroundFetchTask();
      this.isInitialized = true;
      this.metrics.isRegistered = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize background fetch:', error);
      return false;
    }
  }

  private async registerBackgroundFetchTask(): Promise<void> {
    // Define the background fetch task
    if (!TaskManager.isTaskDefined(BACKGROUND_FETCH_TASK)) {
      TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
        return await this.executeBackgroundFetch();
      });
    }

    // Check current status
    const status = await BackgroundFetch.getStatusAsync();

    if (status === BackgroundFetch.BackgroundFetchStatus.Denied) {
      console.warn('Background fetch permission denied');
      return;
    }

    if (status === BackgroundFetch.BackgroundFetchStatus.Restricted) {
      console.warn('Background fetch restricted by system');
    }

    // Register the task
    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: this.config.minimumInterval,
      stopOnTerminate: this.config.stopOnTerminate,
      startOnBoot: this.config.startOnBoot,
    });

    console.log('Background fetch task registered');
  }

  private async executeBackgroundFetch(): Promise<BackgroundFetch.BackgroundFetchResult> {
    const startTime = Date.now();
    this.metrics.totalFetches++;
    this.metrics.lastFetchAt = startTime;

    try {
      let hasNewData = false;

      // 1. Process delivery retry queue
      const deliveryTracker = NotificationDeliveryTrackingService.getInstance();
      const pendingDeliveries = deliveryTracker.getPendingDeliveries();
      if (pendingDeliveries.length > 0) {
        await deliveryTracker.processRetryQueue();
        hasNewData = true;
      }

      // 2. Validate and refresh token if needed
      const tokenManager = TokenRefreshManager.getInstance();
      const tokenValid = await tokenManager.validateToken();
      if (!tokenValid) {
        await tokenManager.forceRefresh();
      }

      // 3. Prune old delivery records
      const pruned = await deliveryTracker.pruneOldRecords();
      if (pruned > 0) {
        hasNewData = true;
      }

      // 4. Schedule pending background tasks
      const taskManager = BackgroundTaskManager.getInstance();
      const queueStatus = taskManager.getQueueStatus();
      if (queueStatus.queued > 0) {
        taskManager.resumeProcessing();
        hasNewData = true;
      }

      // Update metrics
      const duration = Date.now() - startTime;
      this.updateMetrics(duration, hasNewData);

      if (hasNewData) {
        this.metrics.lastFetchResult = 'new_data';
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } else {
        this.metrics.lastFetchResult = 'no_data';
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }
    } catch (error) {
      console.error('Background fetch execution failed:', error);
      this.metrics.failedFetches++;
      this.metrics.lastFetchResult = 'failed';
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  }

  private updateMetrics(duration: number, hasNewData: boolean): void {
    if (hasNewData) {
      this.metrics.successfulFetches++;
    } else {
      this.metrics.noDataFetches++;
    }

    // Update average duration
    const totalCompleted = this.metrics.successfulFetches + this.metrics.noDataFetches;
    this.metrics.averageFetchDuration =
      (this.metrics.averageFetchDuration * (totalCompleted - 1) + duration) / totalCompleted;
  }

  /**
   * Check if background fetch is available on this device
   */
  async getStatus(): Promise<BackgroundFetch.BackgroundFetchStatus | null> {
    return await BackgroundFetch.getStatusAsync();
  }

  /**
   * Unregister background fetch tasks
   */
  async unregister(): Promise<void> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
      if (isRegistered) {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
      }
      this.metrics.isRegistered = false;
      this.isInitialized = false;
    } catch (error) {
      console.error('Failed to unregister background fetch:', error);
    }
  }

  getMetrics(): BackgroundFetchMetrics {
    return { ...this.metrics };
  }

  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  destroy(): void {
    this.unregister();
    this.metrics = { ...DEFAULT_METRICS };
    this.isInitialized = false;
  }
}

export default BackgroundFetchService;
