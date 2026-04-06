/**
 * useNotificationBatching Hook
 *
 * Provides React integration for the NotificationBatcher service.
 * Manages batched notification state, settings, and user interactions.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  notificationBatcher,
  NotificationBatcher,
  type BatchedNotification,
  type BatchingSettings,
} from '../services/notifications/NotificationBatcher';
import {
  getNotificationSettings,
  saveNotificationSettings,
  type NotificationPayload,
  type NotificationSettings,
} from '../../lib/services/notifications';

export type NotificationDensity = 'all' | 'summary' | 'off';

interface UseNotificationBatchingOptions {
  /** Called when a new batch is created or updated */
  onBatchUpdate?: (batch: BatchedNotification) => void;
  /** Called when a batch is delivered (time window elapsed) */
  onBatchDelivered?: (batch: BatchedNotification) => void;
}

interface UseNotificationBatchingReturn {
  /** All active batched notification groups */
  batches: BatchedNotification[];
  /** Total count of notifications across all batches */
  totalCount: number;
  /** Current batching settings */
  settings: BatchingSettings;
  /** Whether batching is enabled */
  isEnabled: boolean;
  /** Add a notification to be batched */
  addNotification: (notification: NotificationPayload) => Promise<BatchedNotification | null>;
  /** Check if a notification should be batched vs delivered immediately */
  shouldBatch: (notification: NotificationPayload) => boolean;
  /** Dismiss a specific batch by group key */
  dismissBatch: (groupKey: string) => void;
  /** Dismiss all batches */
  dismissAll: () => void;
  /** Get a specific batch by group key */
  getBatch: (groupKey: string) => BatchedNotification | undefined;
  /** Update batching settings */
  updateSettings: (updates: Partial<BatchingSettings>) => Promise<void>;
  /** Toggle batching on/off */
  toggleBatching: (enabled: boolean) => Promise<void>;
  /** Set notification density (all, summary, off) */
  setDensity: (density: NotificationDensity) => Promise<void>;
  /** Current density setting */
  density: NotificationDensity;
}

function deriveDensity(settings: BatchingSettings): NotificationDensity {
  if (!settings.enabled) return 'off';
  if (settings.autoCollapseThreshold <= 1) return 'all';
  return 'summary';
}

export function useNotificationBatching(
  options: UseNotificationBatchingOptions = {}
): UseNotificationBatchingReturn {
  const { onBatchUpdate, onBatchDelivered } = options;

  const [batches, setBatches] = useState<BatchedNotification[]>(
    notificationBatcher.getBatches()
  );
  const [settings, setSettings] = useState<BatchingSettings>(
    notificationBatcher.getSettings()
  );
  const [density, setDensityState] = useState<NotificationDensity>(
    deriveDensity(notificationBatcher.getSettings())
  );

  const prevBatchesRef = useRef<Map<string, number>>(new Map());

  // Subscribe to batcher updates
  useEffect(() => {
    const unsubscribe = notificationBatcher.addListener((updatedBatches) => {
      setBatches(updatedBatches);

      // Detect new/updated batches for callbacks
      const prevMap = prevBatchesRef.current;
      for (const batch of updatedBatches) {
        const prevCount = prevMap.get(batch.groupKey) ?? 0;
        if (batch.count > prevCount) {
          onBatchUpdate?.(batch);
        }
      }

      // Update previous state
      const newMap = new Map<string, number>();
      for (const batch of updatedBatches) {
        newMap.set(batch.groupKey, batch.count);
      }
      prevBatchesRef.current = newMap;
    });

    return unsubscribe;
  }, [onBatchUpdate, onBatchDelivered]);

  // Sync settings from NotificationSettings on mount
  useEffect(() => {
    const syncSettings = async () => {
      const notifSettings = await getNotificationSettings();
      const batchSettings: Partial<BatchingSettings> = {
        enabled: notifSettings.batchingEnabled,
        batchTimeWindow: notifSettings.batchTimeWindow,
        maxBatchSize: notifSettings.maxBatchSize,
        groupByChannel: notifSettings.groupByChannel,
        groupByUser: notifSettings.groupByUser,
        groupByType: notifSettings.groupByType,
        autoCollapseThreshold: notifSettings.autoCollapseThreshold,
      };
      await notificationBatcher.updateSettings(batchSettings);
      setSettings(notificationBatcher.getSettings());
      setDensityState(deriveDensity(notificationBatcher.getSettings()));
    };
    syncSettings();
  }, []);

  const totalCount = notificationBatcher.getNotificationCount();

  const addNotification = useCallback(
    async (notification: NotificationPayload) => {
      return notificationBatcher.addNotification(notification);
    },
    []
  );

  const shouldBatch = useCallback(
    (notification: NotificationPayload) => {
      return notificationBatcher.shouldBatchNotification(notification);
    },
    []
  );

  const dismissBatch = useCallback((groupKey: string) => {
    notificationBatcher.dismissBatch(groupKey);
  }, []);

  const dismissAll = useCallback(() => {
    notificationBatcher.dismissAllBatches();
  }, []);

  const getBatch = useCallback((groupKey: string) => {
    return notificationBatcher.getBatch(groupKey);
  }, []);

  const updateSettings = useCallback(
    async (updates: Partial<BatchingSettings>) => {
      await notificationBatcher.updateSettings(updates);
      const updated = notificationBatcher.getSettings();
      setSettings(updated);
      setDensityState(deriveDensity(updated));

      // Sync back to NotificationSettings
      const settingsMap: Partial<NotificationSettings> = {};
      if ('enabled' in updates) settingsMap.batchingEnabled = updates.enabled;
      if ('batchTimeWindow' in updates) settingsMap.batchTimeWindow = updates.batchTimeWindow;
      if ('maxBatchSize' in updates) settingsMap.maxBatchSize = updates.maxBatchSize;
      if ('groupByChannel' in updates) settingsMap.groupByChannel = updates.groupByChannel;
      if ('groupByUser' in updates) settingsMap.groupByUser = updates.groupByUser;
      if ('groupByType' in updates) settingsMap.groupByType = updates.groupByType;
      if ('autoCollapseThreshold' in updates) settingsMap.autoCollapseThreshold = updates.autoCollapseThreshold;

      if (Object.keys(settingsMap).length > 0) {
        await saveNotificationSettings(settingsMap);
      }
    },
    []
  );

  const toggleBatching = useCallback(
    async (enabled: boolean) => {
      await updateSettings({ enabled });
      if (!enabled) {
        notificationBatcher.dismissAllBatches();
      }
    },
    [updateSettings]
  );

  const setDensity = useCallback(
    async (newDensity: NotificationDensity) => {
      switch (newDensity) {
        case 'all':
          await updateSettings({ enabled: true, autoCollapseThreshold: 1 });
          break;
        case 'summary':
          await updateSettings({ enabled: true, autoCollapseThreshold: 3 });
          break;
        case 'off':
          await updateSettings({ enabled: false });
          break;
      }
      setDensityState(newDensity);
    },
    [updateSettings]
  );

  return {
    batches,
    totalCount,
    settings,
    isEnabled: settings.enabled,
    addNotification,
    shouldBatch,
    dismissBatch,
    dismissAll,
    getBatch,
    updateSettings,
    toggleBatching,
    setDensity,
    density,
  };
}

export default useNotificationBatching;
