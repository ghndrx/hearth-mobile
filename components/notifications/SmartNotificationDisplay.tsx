import React, { useEffect, useState } from 'react';
import { NotificationBanner } from './NotificationBanner';
import { usePushNotifications } from '../../lib/hooks/usePushNotifications';
import { BatchedNotification } from '../../src/services/notifications/NotificationBatcher';

interface SmartNotificationDisplayProps {
  authToken?: string;
}

export function SmartNotificationDisplay({ authToken }: SmartNotificationDisplayProps) {
  const [currentBatch, setCurrentBatch] = useState<BatchedNotification | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  const {
    batchedNotifications,
    clearBatch,
    clearAllBatches,
  } = usePushNotifications({
    authToken,
    onNotificationReceived: (notification, batch) => {
      // Show banner for batched notifications that should be displayed immediately
      if (batch) {
        setCurrentBatch(batch);
        setShowBanner(true);

        // Auto-hide after a delay if it's the first notification in a batch
        if (batch.count === 1) {
          setTimeout(() => {
            setShowBanner(false);
            setCurrentBatch(null);
          }, 5000);
        }
      }
    },
    onBatchUpdated: (batches) => {
      // Update the current batch being displayed if it's been updated
      if (currentBatch) {
        const updatedBatch = batches.find(b => b.groupKey === currentBatch.groupKey);
        if (updatedBatch) {
          setCurrentBatch(updatedBatch);
        } else {
          // Batch was dismissed
          setShowBanner(false);
          setCurrentBatch(null);
        }
      } else if (batches.length > 0) {
        // Show the most recent batch that should be displayed
        const displayBatch = batches
          .filter(b => b.count >= 3) // Show batches that have reached the collapse threshold
          .sort((a, b) => b.latestTimestamp - a.latestTimestamp)[0];

        if (displayBatch) {
          setCurrentBatch(displayBatch);
          setShowBanner(true);
        }
      }
    },
  });

  const handleBatchDismiss = (groupKey: string) => {
    clearBatch(groupKey);
    setShowBanner(false);
    setCurrentBatch(null);
  };

  // Hide banner when there are no more batches
  useEffect(() => {
    if (batchedNotifications.length === 0) {
      setShowBanner(false);
      setCurrentBatch(null);
    }
  }, [batchedNotifications]);

  if (!showBanner || !currentBatch) {
    return null;
  }

  return (
    <NotificationBanner
      batchedNotification={currentBatch}
      onBatchDismiss={handleBatchDismiss}
    />
  );
}