/**
 * Message Queue Service
 * Handles message sending, retry logic, and queue processing
 */

import { useEffect, useRef, useCallback } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useOfflineQueueStore } from "../stores/offlineQueue";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import type {
  QueuedMessage,
  FailureReason,
  LocalAttachment,
} from "../types/offline";
import type { Attachment } from "../types";
import { apiClient } from "./api";

/** Interval between queue processing runs (ms) */
const PROCESS_INTERVAL = 3000;

/** Maximum concurrent sends */
const MAX_CONCURRENT_SENDS = 3;

/** Message send result */
interface SendResult {
  success: boolean;
  serverId?: string;
  error?: {
    reason: FailureReason;
    message: string;
  };
}

/** Attachment upload result */
interface UploadResult {
  success: boolean;
  attachment?: Attachment;
  error?: string;
}

/**
 * Upload a single attachment
 */
async function uploadAttachment(
  attachment: LocalAttachment,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  try {
    // Create form data
    const formData = new FormData();
    formData.append("file", {
      uri: attachment.uri,
      name: attachment.filename,
      type: attachment.contentType,
    } as any);

    // Upload with progress tracking
    const response = await apiClient.upload<{ attachment: Attachment }>(
      "/attachments/upload",
      formData,
      {
        onProgress: (event) => {
          if (event.total) {
            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress?.(progress);
          }
        },
      }
    );

    if (response.data?.attachment) {
      return { success: true, attachment: response.data.attachment };
    }

    return { success: false, error: response.error?.message || "Upload failed" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Send a single message to the server
 */
async function sendMessage(message: QueuedMessage): Promise<SendResult> {
  try {
    // Upload attachments first if any
    let uploadedAttachments: Attachment[] | undefined;

    if (message.attachments && message.attachments.length > 0) {
      uploadedAttachments = [];

      for (const attachment of message.attachments) {
        // Skip if already uploaded
        if (attachment.uploaded) {
          uploadedAttachments.push(attachment.uploaded);
          continue;
        }

        const result = await uploadAttachment(attachment);
        if (!result.success || !result.attachment) {
          return {
            success: false,
            error: {
              reason: "server_error",
              message: `Failed to upload ${attachment.filename}: ${result.error}`,
            },
          };
        }
        uploadedAttachments.push(result.attachment);
      }
    }

    // Send the message
    const payload = {
      content: message.content,
      channelId: message.channelId,
      attachments: uploadedAttachments?.map((a) => a.id),
      replyTo: message.replyTo?.messageId,
    };

    const response = await apiClient.post<{ message: { id: string } }>(
      `/channels/${message.channelId}/messages`,
      payload
    );

    if (response.data?.message) {
      return { success: true, serverId: response.data.message.id };
    }

    // Handle specific error codes
    const errorCode = response.error?.code;
    let reason: FailureReason = "unknown";

    if (errorCode === 401 || errorCode === 403) {
      reason = "unauthorized";
    } else if (errorCode === 400) {
      reason = "validation_error";
    } else if (errorCode === 429) {
      reason = "rate_limited";
    } else if (errorCode && errorCode >= 500) {
      reason = "server_error";
    }

    return {
      success: false,
      error: {
        reason,
        message: response.error?.message || "Failed to send message",
      },
    };
  } catch (error) {
    // Network errors
    if (error instanceof TypeError && error.message.includes("Network")) {
      return {
        success: false,
        error: {
          reason: "network_error",
          message: "Network connection lost",
        },
      };
    }

    return {
      success: false,
      error: {
        reason: "unknown",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

/**
 * Hook to manage the message queue processing
 * Should be mounted at app root level
 */
export function useMessageQueueProcessor() {
  const { isConnected, refresh: refreshNetwork } = useNetworkStatus({
    onConnectivityChange: (connected) => {
      console.log("[MessageQueue] Connectivity changed:", connected);
      if (connected) {
        // Immediately process queue when connection restored
        processQueue();
      }
    },
  });

  const {
    getPendingMessages,
    updateStatus,
    markSent,
    markFailed,
    setSyncStatus,
    isPaused,
    getStats,
    updateAttachmentProgress,
    markAttachmentUploaded,
  } = useOfflineQueueStore();

  const isProcessingRef = useRef(false);
  const activeCountRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Process a single message
   */
  const processMessage = useCallback(
    async (message: QueuedMessage) => {
      // Mark as sending
      updateStatus(message.localId, "sending", {
        lastAttemptAt: Date.now(),
      });

      // Handle attachment uploads with progress
      if (message.attachments) {
        for (const attachment of message.attachments) {
          if (!attachment.uploaded) {
            const result = await uploadAttachment(attachment, (progress) => {
              updateAttachmentProgress(message.localId, attachment.id, progress);
            });

            if (result.success && result.attachment) {
              markAttachmentUploaded(
                message.localId,
                attachment.id,
                result.attachment
              );
            }
          }
        }
      }

      // Send the message
      const result = await sendMessage(message);

      if (result.success) {
        markSent(message.localId, result.serverId);
      } else if (result.error) {
        markFailed(message.localId, result.error.reason, result.error.message);
      }

      return result;
    },
    [updateStatus, markSent, markFailed, updateAttachmentProgress, markAttachmentUploaded]
  );

  /**
   * Process the queue
   */
  const processQueue = useCallback(async () => {
    // Skip if already processing, paused, or offline
    if (isProcessingRef.current || isPaused || !isConnected) {
      return;
    }

    const pendingMessages = getPendingMessages();
    if (pendingMessages.length === 0) {
      setSyncStatus({ isSyncing: false });
      return;
    }

    isProcessingRef.current = true;
    setSyncStatus({ isSyncing: true, progress: 0 });

    try {
      // Process messages with concurrency limit
      const total = pendingMessages.length;
      let completed = 0;

      const processBatch = async () => {
        while (completed < total) {
          // Wait if at max concurrent
          while (activeCountRef.current >= MAX_CONCURRENT_SENDS) {
            await new Promise((r) => setTimeout(r, 100));
          }

          // Check if still connected
          if (!isConnected) {
            console.log("[MessageQueue] Lost connection, stopping batch");
            break;
          }

          const message = pendingMessages[completed];
          if (!message) break;

          activeCountRef.current++;

          processMessage(message)
            .finally(() => {
              activeCountRef.current--;
              completed++;
              const progress = Math.round((completed / total) * 100);
              setSyncStatus({ progress });
            });
        }

        // Wait for all active to complete
        while (activeCountRef.current > 0) {
          await new Promise((r) => setTimeout(r, 100));
        }
      };

      await processBatch();

      setSyncStatus({
        isSyncing: false,
        lastSyncAt: Date.now(),
        progress: 100,
        error: undefined,
      });
    } catch (error) {
      console.error("[MessageQueue] Process error:", error);
      setSyncStatus({
        isSyncing: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      isProcessingRef.current = false;
    }
  }, [
    isConnected,
    isPaused,
    getPendingMessages,
    processMessage,
    setSyncStatus,
  ]);

  // Start/stop processing based on app state
  useEffect(() => {
    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === "active") {
        // Refresh network and process queue when app becomes active
        refreshNetwork();
        processQueue();
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);

    // Initial process
    processQueue();

    // Set up interval for continuous processing
    intervalRef.current = setInterval(processQueue, PROCESS_INTERVAL);

    return () => {
      subscription.remove();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [processQueue, refreshNetwork]);

  // Re-process when network comes back
  useEffect(() => {
    if (isConnected) {
      processQueue();
    }
  }, [isConnected, processQueue]);

  return {
    isProcessing: isProcessingRef.current,
    stats: getStats(),
    isConnected,
    processQueue,
  };
}

/**
 * Hook to queue and send a message
 * Returns the enqueue function and current queue status
 */
export function useQueueMessage() {
  const {
    enqueue,
    getChannelMessages,
    remove,
    retryMessage,
    getStats,
    syncStatus,
  } = useOfflineQueueStore();

  const { isConnected } = useNetworkStatus();

  const queueMessage = useCallback(
    (
      content: string,
      channelId: string,
      authorId: string,
      options?: {
        serverId?: string;
        attachments?: LocalAttachment[];
        replyTo?: QueuedMessage["replyTo"];
      }
    ) => {
      return enqueue({
        content,
        channelId,
        authorId,
        serverId: options?.serverId,
        attachments: options?.attachments,
        replyTo: options?.replyTo,
      });
    },
    [enqueue]
  );

  return {
    queueMessage,
    getChannelMessages,
    removeMessage: remove,
    retryMessage,
    stats: getStats(),
    syncStatus,
    isOnline: isConnected,
  };
}

export { sendMessage, uploadAttachment };
