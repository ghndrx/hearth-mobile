/**
 * Offline Sync Service
 * Processes offline message queue and syncs with backend
 */

import { useOfflineQueueStore } from "../stores/offlineQueue";
import { sendMessage, uploadAttachment } from "./api";
import type { QueuedMessage } from "../types/offline";
import NetInfo from "@react-native-community/netinfo";

class OfflineSyncService {
  private processInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private readonly PROCESS_INTERVAL_MS = 5000; // Check every 5 seconds

  /**
   * Start the background sync process
   */
  start() {
    if (this.processInterval) {
      console.log("OfflineSyncService already running");
      return;
    }

    console.log("Starting OfflineSyncService");

    // Process queue immediately
    this.processQueue();

    // Set up interval processing
    this.processInterval = setInterval(() => {
      this.processQueue();
    }, this.PROCESS_INTERVAL_MS);

    // Listen for network changes
    this.setupNetworkListener();
  }

  /**
   * Stop the background sync process
   */
  stop() {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
      console.log("OfflineSyncService stopped");
    }
  }

  /**
   * Process messages in the queue
   */
  private async processQueue() {
    // Prevent concurrent processing
    if (this.isProcessing) return;

    const store = useOfflineQueueStore.getState();
    
    // Don't process if paused
    if (store.isPaused) return;

    const pendingMessages = store.getPendingMessages();
    if (pendingMessages.length === 0) {
      store.setSyncStatus({ isSyncing: false });
      return;
    }

    this.isProcessing = true;
    store.setSyncStatus({ isSyncing: true });

    try {
      // Check network connectivity
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        console.log("No network connection, skipping queue processing");
        store.setSyncStatus({
          isSyncing: false,
          error: "No network connection",
        });
        return;
      }

      // Process messages sequentially to maintain order
      for (const message of pendingMessages) {
        try {
          await this.processMessage(message);
        } catch (error) {
          console.error(`Failed to process message ${message.localId}:`, error);
          // Continue processing other messages
        }
      }

      store.setSyncStatus({
        isSyncing: false,
        lastSyncAt: Date.now(),
        error: undefined,
      });
    } catch (error) {
      console.error("Queue processing error:", error);
      store.setSyncStatus({
        isSyncing: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single message
   */
  private async processMessage(message: QueuedMessage) {
    const store = useOfflineQueueStore.getState();

    // Mark as sending
    store.updateStatus(message.localId, "sending", {
      lastAttemptAt: Date.now(),
    });

    try {
      // Upload attachments first if any
      if (message.attachments && message.attachments.length > 0) {
        for (const attachment of message.attachments) {
          if (!attachment.uploaded) {
            await this.uploadAttachment(message.localId, attachment);
          }
        }
      }

      // Send the message
      const response = await sendMessage({
        channelId: message.channelId,
        content: message.content,
        attachmentIds: message.attachments?.map((a) => a.uploaded?.id).filter(Boolean) as string[],
        replyToId: message.replyTo?.messageId,
      });

      // Mark as sent
      store.markSent(message.localId, response.id);
      console.log(`Message ${message.localId} sent successfully as ${response.id}`);
    } catch (error) {
      console.error(`Failed to send message ${message.localId}:`, error);

      // Determine failure reason
      let reason: QueuedMessage["failureReason"] = "unknown";
      let errorMessage = "Failed to send message";

      if (error instanceof Error) {
        errorMessage = error.message;
        
        if (error.message.includes("network") || error.message.includes("fetch")) {
          reason = "network_error";
        } else if (error.message.includes("timeout")) {
          reason = "timeout";
        } else if (error.message.includes("401") || error.message.includes("403")) {
          reason = "unauthorized";
        } else if (error.message.includes("429")) {
          reason = "rate_limited";
        } else if (error.message.includes("400")) {
          reason = "validation_error";
        } else if (error.message.includes("500") || error.message.includes("502") || error.message.includes("503")) {
          reason = "server_error";
        }
      }

      store.markFailed(message.localId, reason, errorMessage);
    }
  }

  /**
   * Upload an attachment
   */
  private async uploadAttachment(
    messageLocalId: string,
    attachment: NonNullable<QueuedMessage["attachments"]>[number]
  ) {
    const store = useOfflineQueueStore.getState();

    try {
      // Upload file with progress tracking
      const uploaded = await uploadAttachment(
        {
          uri: attachment.uri,
          name: attachment.filename,
          type: attachment.contentType,
        },
        (progress) => {
          store.updateAttachmentProgress(messageLocalId, attachment.id, progress);
        }
      );

      // Mark as uploaded
      store.markAttachmentUploaded(messageLocalId, attachment.id, uploaded);

      console.log(`Attachment ${attachment.id} uploaded successfully as ${uploaded.id}`);
    } catch (error) {
      console.error(`Failed to upload attachment ${attachment.id}:`, error);
      throw error;
    }
  }

  /**
   * Set up listener for network changes
   */
  private setupNetworkListener() {
    NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        console.log("Network connected, processing queue");
        // Trigger immediate processing when network becomes available
        this.processQueue();
      }
    });
  }

  /**
   * Manually trigger queue processing
   */
  async processNow() {
    return this.processQueue();
  }
}

// Singleton instance
export const offlineSyncService = new OfflineSyncService();

/**
 * Hook to use offline sync service
 */
export function useOfflineSync() {
  const store = useOfflineQueueStore();

  return {
    syncStatus: store.syncStatus,
    queueStats: store.getStats(),
    isPaused: store.isPaused,
    pause: store.pause,
    resume: store.resume,
    retryMessage: store.retryMessage,
    retryAllFailed: store.retryAllFailed,
    clearSent: store.clearSent,
  };
}
