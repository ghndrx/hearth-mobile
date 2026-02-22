/**
 * Message Queue Context
 * Provides queue status and controls throughout the app
 */

import React, { createContext, useContext, type ReactNode } from "react";
import {
  useMessageQueueProcessor,
  useQueueMessage,
} from "../services/messageQueue";
import type { QueueStats, SyncStatus, QueuedMessage, LocalAttachment } from "../types/offline";

interface MessageQueueContextValue {
  /** Whether queue is currently processing */
  isProcessing: boolean;
  /** Queue statistics */
  stats: QueueStats;
  /** Sync status */
  syncStatus: SyncStatus;
  /** Whether device is online */
  isOnline: boolean;
  /** Queue a new message */
  queueMessage: (
    content: string,
    channelId: string,
    authorId: string,
    options?: {
      serverId?: string;
      attachments?: LocalAttachment[];
      replyTo?: QueuedMessage["replyTo"];
    }
  ) => QueuedMessage;
  /** Get queued messages for a channel */
  getChannelMessages: (channelId: string) => QueuedMessage[];
  /** Remove a message from queue */
  removeMessage: (localId: string) => void;
  /** Retry a failed message */
  retryMessage: (localId: string) => void;
  /** Manually trigger queue processing */
  processQueue: () => Promise<void>;
}

const MessageQueueContext = createContext<MessageQueueContextValue | null>(null);

interface MessageQueueProviderProps {
  children: ReactNode;
}

/**
 * Provider component that sets up queue processing
 * Mount at app root level
 */
export function MessageQueueProvider({ children }: MessageQueueProviderProps) {
  // Set up the queue processor
  const processor = useMessageQueueProcessor();
  const queue = useQueueMessage();

  const value: MessageQueueContextValue = {
    isProcessing: processor.isProcessing,
    stats: queue.stats,
    syncStatus: queue.syncStatus,
    isOnline: processor.isConnected,
    queueMessage: queue.queueMessage,
    getChannelMessages: queue.getChannelMessages,
    removeMessage: queue.removeMessage,
    retryMessage: queue.retryMessage,
    processQueue: processor.processQueue,
  };

  return (
    <MessageQueueContext.Provider value={value}>
      {children}
    </MessageQueueContext.Provider>
  );
}

/**
 * Hook to access message queue context
 * Must be used within MessageQueueProvider
 */
export function useMessageQueue(): MessageQueueContextValue {
  const context = useContext(MessageQueueContext);
  if (!context) {
    throw new Error("useMessageQueue must be used within MessageQueueProvider");
  }
  return context;
}

/**
 * Hook for components that just need offline status indicator
 */
export function useOfflineIndicator() {
  const { isOnline, stats, syncStatus } = useMessageQueue();

  return {
    isOnline,
    hasPendingMessages: stats.pending > 0 || stats.sending > 0,
    hasFailedMessages: stats.failed > 0,
    isSyncing: syncStatus.isSyncing,
    pendingCount: stats.pending + stats.sending,
    failedCount: stats.failed,
  };
}

export default MessageQueueProvider;
