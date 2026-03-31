/**
 * usePushNotifications Hook
 *
 * React hook integrating the NotificationBatchingService for smart
 * notification batching, grouping, deep linking, and batch dismissal.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import NotificationBatchingService, {
  type IncomingNotification,
  type NotificationBatch,
  type NotificationDeepLink,
  type BatchingConfig,
} from '../services/pushNotifications/NotificationBatchingService';
import PushNotificationService from '../services/pushNotifications/PushNotificationService';

export interface UsePushNotificationsState {
  /** Batches that have been delivered (ready for display) */
  deliveredBatches: NotificationBatch[];
  /** Batches still accumulating notifications */
  activeBatchCount: number;
  /** Whether the service is initialized */
  isInitialized: boolean;
  /** Error from the last operation */
  error: string | null;
}

export interface UsePushNotificationsActions {
  /** Process an incoming notification through the batching system */
  processNotification: (notification: IncomingNotification) => boolean;
  /** Get a deep link for a specific batch/message tap */
  getDeepLink: (batchId: string, messageId?: string) => NotificationDeepLink | null;
  /** Dismiss a batch and mark all its messages as read; returns message IDs */
  dismissBatch: (batchId: string) => Promise<string[]>;
  /** Flush all pending batches immediately (e.g., on app background) */
  flushAll: () => void;
  /** Format batch display title */
  formatBatchTitle: (batch: NotificationBatch) => string;
  /** Format batch display body */
  formatBatchBody: (batch: NotificationBatch) => string;
  /** Update batching config at runtime */
  updateConfig: (config: Partial<BatchingConfig>) => void;
  /** Clear any error */
  clearError: () => void;
}

export interface UsePushNotificationsReturn {
  state: UsePushNotificationsState;
  actions: UsePushNotificationsActions;
}

export interface UsePushNotificationsOptions {
  /** Override default batching config */
  config?: Partial<BatchingConfig>;
  /** Callback when a batch is ready for display */
  onBatchReady?: (batch: NotificationBatch) => void;
}

export function usePushNotifications(
  options: UsePushNotificationsOptions = {},
): UsePushNotificationsReturn {
  const { config, onBatchReady } = options;

  const [deliveredBatches, setDeliveredBatches] = useState<NotificationBatch[]>([]);
  const [activeBatchCount, setActiveBatchCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onBatchReadyRef = useRef(onBatchReady);
  onBatchReadyRef.current = onBatchReady;

  // Initialize batching service
  useEffect(() => {
    const handleBatchReady = (batch: NotificationBatch) => {
      setDeliveredBatches((prev) => [...prev, batch]);
      setActiveBatchCount(NotificationBatchingService.getActiveBatches().length);
      onBatchReadyRef.current?.(batch);
    };

    NotificationBatchingService.initialize(config ?? {}, handleBatchReady);
    setIsInitialized(true);

    return () => {
      NotificationBatchingService.cleanup();
      setIsInitialized(false);
    };
    // Only re-initialize if config values change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    config?.batchWindowMs,
    config?.maxBatchSize,
    config?.prioritizeMentions,
    config?.prioritizeDirectMessages,
  ]);

  const processNotification = useCallback(
    (notification: IncomingNotification): boolean => {
      try {
        const immediate = NotificationBatchingService.processNotification(notification);
        setActiveBatchCount(NotificationBatchingService.getActiveBatches().length);
        return immediate;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to process notification';
        setError(message);
        return false;
      }
    },
    [],
  );

  const getDeepLink = useCallback(
    (batchId: string, messageId?: string): NotificationDeepLink | null => {
      return NotificationBatchingService.getDeepLink(batchId, messageId);
    },
    [],
  );

  const dismissBatch = useCallback(async (batchId: string): Promise<string[]> => {
    try {
      const messageIds = await NotificationBatchingService.dismissBatch(batchId);
      setDeliveredBatches((prev) => prev.filter((b) => b.batchId !== batchId));
      return messageIds;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to dismiss batch';
      setError(message);
      return [];
    }
  }, []);

  const flushAll = useCallback(() => {
    NotificationBatchingService.flushAll();
    setActiveBatchCount(0);
  }, []);

  const formatBatchTitle = useCallback((batch: NotificationBatch): string => {
    return NotificationBatchingService.formatBatchTitle(batch);
  }, []);

  const formatBatchBody = useCallback((batch: NotificationBatch): string => {
    return NotificationBatchingService.formatBatchBody(batch);
  }, []);

  const updateConfig = useCallback((newConfig: Partial<BatchingConfig>) => {
    NotificationBatchingService.updateConfig(newConfig);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    state: {
      deliveredBatches,
      activeBatchCount,
      isInitialized,
      error,
    },
    actions: {
      processNotification,
      getDeepLink,
      dismissBatch,
      flushAll,
      formatBatchTitle,
      formatBatchBody,
      updateConfig,
      clearError,
    },
  };
}

export default usePushNotifications;
