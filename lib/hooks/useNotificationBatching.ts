import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import {
  getBatchManager,
  getBatchingConfig,
  deliverBatchedNotification,
  type BatchingConfig,
  type BatchedNotification,
  type NotificationBatchManager,
} from "../services/notificationBatching";
import type { NotificationPayload } from "../services/notifications";

interface UseNotificationBatchingReturn {
  config: BatchingConfig | null;
  isReady: boolean;
  pendingCount: number;
  // Actions
  addNotification: (payload: NotificationPayload) => void;
  updateConfig: (updates: Partial<BatchingConfig>) => Promise<void>;
  flushAll: () => void;
  getPendingCount: () => number;
}

export function useNotificationBatching(): UseNotificationBatchingReturn {
  const [config, setConfig] = useState<BatchingConfig | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const managerRef = useRef<NotificationBatchManager | null>(null);
  const appStateRef = useRef<ReturnType<typeof AppState.addEventListener>>();

  // Initialize
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const savedConfig = await getBatchingConfig();
      if (cancelled) return;

      const manager = getBatchManager(savedConfig);
      managerRef.current = manager;

      // Set up flush callback to deliver notifications
      manager.setFlushCallback(async (batched: BatchedNotification[]) => {
        for (const notification of batched) {
          try {
            await deliverBatchedNotification(notification);
          } catch (error) {
            console.error("Failed to deliver batched notification:", error);
          }
        }
        setPendingCount(manager.getPendingCount());
      });

      setConfig(savedConfig);
      setIsReady(true);
    };

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  // Track app state for smart timing
  useEffect(() => {
    appStateRef.current = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        const manager = managerRef.current;
        if (!manager) return;

        if (nextState === "active") {
          manager.setUserActive(true);
        } else if (nextState === "background" || nextState === "inactive") {
          manager.setUserActive(false);
          // Flush pending notifications when going to background
          manager.flushAll();
          setPendingCount(0);
        }
      }
    );

    return () => {
      appStateRef.current?.remove();
    };
  }, []);

  const addNotification = useCallback(
    (payload: NotificationPayload) => {
      const manager = managerRef.current;
      if (!manager) return;

      const immediate = manager.addNotification(payload);
      if (immediate) {
        // Urgent/unbatched notification — deliver now
        deliverBatchedNotification(immediate).catch((err) =>
          console.error("Failed to deliver immediate notification:", err)
        );
      }
      setPendingCount(manager.getPendingCount());
    },
    []
  );

  const handleUpdateConfig = useCallback(
    async (updates: Partial<BatchingConfig>) => {
      const manager = managerRef.current;
      if (!manager) return;

      const updated = await manager.updateConfig(updates);
      setConfig(updated);
    },
    []
  );

  const flushAll = useCallback(() => {
    const manager = managerRef.current;
    if (!manager) return;

    const flushed = manager.flushAll();
    for (const notification of flushed) {
      deliverBatchedNotification(notification).catch((err) =>
        console.error("Failed to deliver flushed notification:", err)
      );
    }
    setPendingCount(0);
  }, []);

  const getPendingCount = useCallback(() => {
    return managerRef.current?.getPendingCount() ?? 0;
  }, []);

  return {
    config,
    isReady,
    pendingCount,
    addNotification,
    updateConfig: handleUpdateConfig,
    flushAll,
    getPendingCount,
  };
}

export default useNotificationBatching;
