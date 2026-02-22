/**
 * Offline Message Queue Store
 * Manages message queue with persistence, retry logic, and sync status
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { nanoid } from "nanoid";
import type {
  QueuedMessage,
  MessageStatus,
  FailureReason,
  QueueStats,
  SyncStatus,
  QueueMessageOptions,
  LocalAttachment,
  RetryConfig,
} from "../types/offline";
import { calculateRetryDelay, DEFAULT_RETRY_CONFIG } from "../types/offline";

interface OfflineQueueState {
  /** All queued messages */
  queue: QueuedMessage[];
  /** Current sync status */
  syncStatus: SyncStatus;
  /** Whether queue processing is paused */
  isPaused: boolean;
  /** Retry configuration */
  retryConfig: RetryConfig;

  // Actions
  /** Add a new message to the queue */
  enqueue: (options: QueueMessageOptions) => QueuedMessage;
  /** Update message status */
  updateStatus: (
    localId: string,
    status: MessageStatus,
    updates?: Partial<QueuedMessage>
  ) => void;
  /** Mark message as sent successfully */
  markSent: (localId: string, serverId?: string) => void;
  /** Mark message as failed */
  markFailed: (
    localId: string,
    reason: FailureReason,
    errorMessage?: string
  ) => void;
  /** Retry a failed message */
  retryMessage: (localId: string) => void;
  /** Retry all failed messages */
  retryAllFailed: () => void;
  /** Remove a message from queue */
  remove: (localId: string) => void;
  /** Remove all sent messages */
  clearSent: () => void;
  /** Clear all messages (use with caution) */
  clearAll: () => void;
  /** Pause queue processing */
  pause: () => void;
  /** Resume queue processing */
  resume: () => void;
  /** Update sync status */
  setSyncStatus: (status: Partial<SyncStatus>) => void;
  /** Get messages ready to send */
  getPendingMessages: () => QueuedMessage[];
  /** Get messages for a specific channel */
  getChannelMessages: (channelId: string) => QueuedMessage[];
  /** Get queue statistics */
  getStats: () => QueueStats;
  /** Update attachment upload progress */
  updateAttachmentProgress: (
    localId: string,
    attachmentId: string,
    progress: number
  ) => void;
  /** Mark attachment as uploaded */
  markAttachmentUploaded: (
    localId: string,
    attachmentId: string,
    uploaded: LocalAttachment["uploaded"]
  ) => void;
}

export const useOfflineQueueStore = create<OfflineQueueState>()(
  persist(
    (set, get) => ({
      queue: [],
      syncStatus: {
        isSyncing: false,
      },
      isPaused: false,
      retryConfig: DEFAULT_RETRY_CONFIG,

      enqueue: (options) => {
        const message: QueuedMessage = {
          localId: nanoid(),
          content: options.content,
          channelId: options.channelId,
          serverId_target: options.serverId,
          attachments: options.attachments,
          replyTo: options.replyTo,
          authorId: options.authorId,
          status: "pending",
          retryCount: 0,
          maxRetries: get().retryConfig.maxRetries,
          queuedAt: Date.now(),
        };

        set((state) => ({
          queue: [...state.queue, message],
        }));

        return message;
      },

      updateStatus: (localId, status, updates = {}) => {
        set((state) => ({
          queue: state.queue.map((msg) =>
            msg.localId === localId
              ? { ...msg, status, ...updates }
              : msg
          ),
        }));
      },

      markSent: (localId, serverId) => {
        set((state) => ({
          queue: state.queue.map((msg) =>
            msg.localId === localId
              ? {
                  ...msg,
                  status: "sent" as MessageStatus,
                  serverId,
                  failureReason: undefined,
                  errorMessage: undefined,
                }
              : msg
          ),
        }));
      },

      markFailed: (localId, reason, errorMessage) => {
        const { retryConfig } = get();

        set((state) => ({
          queue: state.queue.map((msg) => {
            if (msg.localId !== localId) return msg;

            const newRetryCount = msg.retryCount + 1;
            const shouldRetry = newRetryCount < msg.maxRetries;

            return {
              ...msg,
              status: "failed" as MessageStatus,
              retryCount: newRetryCount,
              lastAttemptAt: Date.now(),
              nextRetryAt: shouldRetry
                ? Date.now() + calculateRetryDelay(newRetryCount, retryConfig)
                : undefined,
              failureReason: reason,
              errorMessage,
            };
          }),
        }));
      },

      retryMessage: (localId) => {
        set((state) => ({
          queue: state.queue.map((msg) =>
            msg.localId === localId && msg.status === "failed"
              ? {
                  ...msg,
                  status: "pending" as MessageStatus,
                  nextRetryAt: undefined,
                  failureReason: undefined,
                  errorMessage: undefined,
                }
              : msg
          ),
        }));
      },

      retryAllFailed: () => {
        set((state) => ({
          queue: state.queue.map((msg) =>
            msg.status === "failed"
              ? {
                  ...msg,
                  status: "pending" as MessageStatus,
                  nextRetryAt: undefined,
                  failureReason: undefined,
                  errorMessage: undefined,
                }
              : msg
          ),
        }));
      },

      remove: (localId) => {
        set((state) => ({
          queue: state.queue.filter((msg) => msg.localId !== localId),
        }));
      },

      clearSent: () => {
        set((state) => ({
          queue: state.queue.filter((msg) => msg.status !== "sent"),
        }));
      },

      clearAll: () => {
        set({ queue: [] });
      },

      pause: () => {
        set({ isPaused: true });
      },

      resume: () => {
        set({ isPaused: false });
      },

      setSyncStatus: (status) => {
        set((state) => ({
          syncStatus: { ...state.syncStatus, ...status },
        }));
      },

      getPendingMessages: () => {
        const { queue, isPaused } = get();
        if (isPaused) return [];

        const now = Date.now();
        return queue.filter(
          (msg) =>
            msg.status === "pending" ||
            (msg.status === "failed" &&
              msg.nextRetryAt &&
              msg.nextRetryAt <= now)
        );
      },

      getChannelMessages: (channelId) => {
        return get().queue.filter((msg) => msg.channelId === channelId);
      },

      getStats: () => {
        const { queue } = get();
        return {
          total: queue.length,
          pending: queue.filter((m) => m.status === "pending").length,
          sending: queue.filter((m) => m.status === "sending").length,
          failed: queue.filter((m) => m.status === "failed").length,
        };
      },

      updateAttachmentProgress: (localId, attachmentId, progress) => {
        set((state) => ({
          queue: state.queue.map((msg) => {
            if (msg.localId !== localId || !msg.attachments) return msg;
            return {
              ...msg,
              attachments: msg.attachments.map((att) =>
                att.id === attachmentId
                  ? { ...att, uploadProgress: progress }
                  : att
              ),
            };
          }),
        }));
      },

      markAttachmentUploaded: (localId, attachmentId, uploaded) => {
        set((state) => ({
          queue: state.queue.map((msg) => {
            if (msg.localId !== localId || !msg.attachments) return msg;
            return {
              ...msg,
              attachments: msg.attachments.map((att) =>
                att.id === attachmentId
                  ? { ...att, uploadProgress: 100, uploaded }
                  : att
              ),
            };
          }),
        }));
      },
    }),
    {
      name: "hearth-offline-queue",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist essential fields
      partialize: (state) => ({
        queue: state.queue.filter((msg) => msg.status !== "sent"),
        retryConfig: state.retryConfig,
      }),
    }
  )
);

export default useOfflineQueueStore;
