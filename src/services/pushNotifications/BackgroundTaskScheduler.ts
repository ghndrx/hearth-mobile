/**
 * Background Task Scheduler
 *
 * Registers background fetch and processing tasks via expo-task-manager.
 * Handles iOS background modes and Android WorkManager scheduling.
 */

import { Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';

export const BACKGROUND_FETCH_TASK = 'hearth-background-fetch';
export const BACKGROUND_DELIVERY_TASK = 'hearth-background-delivery';

export type BackgroundTaskHandler = () => Promise<void>;

class BackgroundTaskScheduler {
  private isRegistered = false;
  private fetchHandler: BackgroundTaskHandler | null = null;
  private deliveryHandler: BackgroundTaskHandler | null = null;

  /**
   * Initialize background task scheduler and register all tasks.
   */
  async initialize(
    onFetch: BackgroundTaskHandler,
    onDelivery: BackgroundTaskHandler
  ): Promise<void> {
    this.fetchHandler = onFetch;
    this.deliveryHandler = onDelivery;

    this.defineBackgroundTasks();
    await this.registerBackgroundFetch();
    this.isRegistered = true;
    console.log('[BackgroundTaskScheduler] Initialized');
  }

  /**
   * Check if background tasks are registered.
   */
  isTaskRegistered(): boolean {
    return this.isRegistered;
  }

  /**
   * Check status of background fetch registration.
   */
  async getStatus(): Promise<BackgroundFetch.BackgroundFetchStatus> {
    return await BackgroundFetch.getStatusAsync();
  }

  /**
   * Unregister all background tasks.
   */
  async unregisterAll(): Promise<void> {
    try {
      const fetchRegistered = await TaskManager.isTaskRegisteredAsync(
        BACKGROUND_FETCH_TASK
      );
      if (fetchRegistered) {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
      }

      const deliveryRegistered = await TaskManager.isTaskRegisteredAsync(
        BACKGROUND_DELIVERY_TASK
      );
      if (deliveryRegistered) {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_DELIVERY_TASK);
      }

      this.isRegistered = false;
      console.log('[BackgroundTaskScheduler] All tasks unregistered');
    } catch (error) {
      console.error(
        '[BackgroundTaskScheduler] Failed to unregister tasks:',
        error
      );
    }
  }

  private defineBackgroundTasks(): void {
    TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
      try {
        console.log('[BackgroundTask] Fetch task running');
        await this.fetchHandler?.();
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch (error) {
        console.error('[BackgroundTask] Fetch task failed:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });

    TaskManager.defineTask(BACKGROUND_DELIVERY_TASK, async () => {
      try {
        console.log('[BackgroundTask] Delivery task running');
        await this.deliveryHandler?.();
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch (error) {
        console.error('[BackgroundTask] Delivery task failed:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });
  }

  private async registerBackgroundFetch(): Promise<void> {
    try {
      const status = await BackgroundFetch.getStatusAsync();

      if (
        status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
        status === BackgroundFetch.BackgroundFetchStatus.Denied
      ) {
        console.warn(
          '[BackgroundTaskScheduler] Background fetch is restricted or denied'
        );
        return;
      }

      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: 15 * 60, // 15 minutes minimum
        stopOnTerminate: false,
        startOnBoot: true,
      });

      await BackgroundFetch.registerTaskAsync(BACKGROUND_DELIVERY_TASK, {
        minimumInterval: 5 * 60, // 5 minutes for delivery retries
        stopOnTerminate: false,
        startOnBoot: true,
      });

      console.log('[BackgroundTaskScheduler] Background tasks registered');
    } catch (error) {
      console.error(
        '[BackgroundTaskScheduler] Failed to register background tasks:',
        error
      );
    }
  }
}

export default new BackgroundTaskScheduler();
