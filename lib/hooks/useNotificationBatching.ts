import { useState, useEffect, useCallback, useRef } from "react";
import {
  NotificationBatcher,
  BatchedNotification,
  BatchingSettings,
  BatchDensity,
  DEFAULT_BATCHING_SETTINGS
} from "../services/notifications/NotificationBatcher";
import { NotificationPayload } from "../services/notifications";

interface UseNotificationBatchingReturn {
  batches: BatchedNotification[];
  totalCount: number;
  settings: BatchingSettings;
  density: BatchDensity;
  addNotification: (payload: NotificationPayload) => Promise<boolean>;
  shouldBatch: (payload: NotificationPayload) => boolean;
  shouldShowImmediately: (payload: NotificationPayload) => boolean;
  dismissBatch: (groupKey: string) => void;
  dismissAll: () => void;
  getBatch: (groupKey: string) => BatchedNotification | undefined;
  updateSettings: (updates: Partial<BatchingSettings>) => Promise<BatchingSettings>;
  setDensity: (density: BatchDensity) => Promise<void>;
}

export function useNotificationBatching(): UseNotificationBatchingReturn {
  const [batches, setBatches] = useState<BatchedNotification[]>([]);
  const [settings, setSettings] = useState<BatchingSettings>(DEFAULT_BATCHING_SETTINGS);
  const [density, setDensityState] = useState<BatchDensity>("summary");

  // Keep track of mounted state to avoid setting state after unmount
  const isMountedRef = useRef(true);

  // Initialize and setup listeners
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const initialize = async () => {
      // Load initial settings
      const initialSettings = await NotificationBatcher.getSettings();
      const initialDensity = NotificationBatcher.getDensity();
      const initialBatches = NotificationBatcher.getBatches();

      if (isMountedRef.current) {
        setSettings(initialSettings);
        setDensityState(initialDensity);
        setBatches(initialBatches);
      }

      // Setup listener for batch updates
      cleanup = NotificationBatcher.addListener((updatedBatches) => {
        if (isMountedRef.current) {
          setBatches([...updatedBatches]);
        }
      });
    };

    initialize();

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  // Calculate total count
  const totalCount = batches.reduce((sum, batch) => sum + batch.count, 0);

  // Add notification to batcher
  const addNotification = useCallback(async (payload: NotificationPayload): Promise<boolean> => {
    return await NotificationBatcher.addNotification(payload);
  }, []);

  // Check if notification should be batched
  const shouldBatch = useCallback((payload: NotificationPayload): boolean => {
    return NotificationBatcher.shouldBatch(payload);
  }, []);

  // Check if notification should show immediately
  const shouldShowImmediately = useCallback((payload: NotificationPayload): boolean => {
    return NotificationBatcher.shouldShowImmediately(payload);
  }, []);

  // Dismiss specific batch
  const dismissBatch = useCallback((groupKey: string): void => {
    NotificationBatcher.dismissBatch(groupKey);
  }, []);

  // Dismiss all batches
  const dismissAll = useCallback((): void => {
    NotificationBatcher.dismissAll();
  }, []);

  // Get specific batch
  const getBatch = useCallback((groupKey: string): BatchedNotification | undefined => {
    return NotificationBatcher.getBatch(groupKey);
  }, []);

  // Update batching settings
  const updateSettings = useCallback(async (updates: Partial<BatchingSettings>): Promise<BatchingSettings> => {
    const newSettings = await NotificationBatcher.updateSettings(updates);
    if (isMountedRef.current) {
      setSettings(newSettings);
      setDensityState(NotificationBatcher.getDensity());
    }
    return newSettings;
  }, []);

  // Set density (convenience method)
  const setDensity = useCallback(async (newDensity: BatchDensity): Promise<void> => {
    await NotificationBatcher.setDensity(newDensity);
    if (isMountedRef.current) {
      setDensityState(newDensity);
      setSettings(await NotificationBatcher.getSettings());
    }
  }, []);

  return {
    batches,
    totalCount,
    settings,
    density,
    addNotification,
    shouldBatch,
    shouldShowImmediately,
    dismissBatch,
    dismissAll,
    getBatch,
    updateSettings,
    setDensity,
  };
}