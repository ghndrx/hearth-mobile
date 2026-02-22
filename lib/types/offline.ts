/**
 * Offline Message Queue Types
 * Defines types for message queueing, status tracking, and offline support
 */

import type { Attachment } from "./index";

/** Message delivery status */
export type MessageStatus = "pending" | "sending" | "sent" | "failed";

/** Failure reason for debugging and UI display */
export type FailureReason =
  | "network_error"
  | "timeout"
  | "server_error"
  | "rate_limited"
  | "unauthorized"
  | "validation_error"
  | "unknown";

/** A message queued for sending */
export interface QueuedMessage {
  /** Unique local ID (generated on queue) */
  localId: string;
  /** Server-assigned ID (after successful send) */
  serverId?: string;
  /** Message content */
  content: string;
  /** Attachments to send */
  attachments?: LocalAttachment[];
  /** Target channel ID */
  channelId: string;
  /** Target server ID (optional for DMs) */
  serverId_target?: string;
  /** Reply context */
  replyTo?: {
    messageId: string;
    content: string;
    authorName: string;
  };
  /** Current delivery status */
  status: MessageStatus;
  /** Number of retry attempts */
  retryCount: number;
  /** Maximum retry attempts before marking as failed */
  maxRetries: number;
  /** Timestamp when queued */
  queuedAt: number;
  /** Timestamp of last send attempt */
  lastAttemptAt?: number;
  /** Next scheduled retry timestamp */
  nextRetryAt?: number;
  /** Failure reason if status is 'failed' */
  failureReason?: FailureReason;
  /** Error message for display */
  errorMessage?: string;
  /** User ID who sent this */
  authorId: string;
}

/** Local attachment (with local URI before upload) */
export interface LocalAttachment {
  /** Local unique ID */
  id: string;
  /** Local file URI */
  uri: string;
  /** Original filename */
  filename: string;
  /** MIME type */
  contentType: string;
  /** File size in bytes */
  size: number;
  /** Upload progress (0-100) */
  uploadProgress?: number;
  /** Uploaded attachment (after successful upload) */
  uploaded?: Attachment;
  /** Upload error if failed */
  uploadError?: string;
}

/** Network connectivity status */
export interface NetworkStatus {
  /** Whether device has network connectivity */
  isConnected: boolean;
  /** Connection type (wifi, cellular, etc.) */
  type: string | null;
  /** Whether connection is metered (mobile data) */
  isMetered: boolean;
  /** Last connectivity check timestamp */
  lastChecked: number;
}

/** Queue statistics */
export interface QueueStats {
  /** Total messages in queue */
  total: number;
  /** Messages currently pending */
  pending: number;
  /** Messages currently being sent */
  sending: number;
  /** Failed messages awaiting retry/action */
  failed: number;
}

/** Sync status for UI display */
export interface SyncStatus {
  /** Whether queue is actively processing */
  isSyncing: boolean;
  /** Last successful sync timestamp */
  lastSyncAt?: number;
  /** Current sync progress (0-100) */
  progress?: number;
  /** Error during sync if any */
  error?: string;
}

/** Options for queueing a message */
export interface QueueMessageOptions {
  content: string;
  channelId: string;
  serverId?: string;
  attachments?: LocalAttachment[];
  replyTo?: QueuedMessage["replyTo"];
  authorId: string;
}

/** Retry strategy configuration */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial retry delay in milliseconds */
  initialDelayMs: number;
  /** Maximum retry delay in milliseconds */
  maxDelayMs: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  initialDelayMs: 1000,
  maxDelayMs: 60000, // 1 minute max
  backoffMultiplier: 2,
};

/**
 * Calculate next retry delay using exponential backoff with jitter
 */
export function calculateRetryDelay(
  retryCount: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const exponentialDelay =
    config.initialDelayMs * Math.pow(config.backoffMultiplier, retryCount);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  // Add jitter (±25%) to prevent thundering herd
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.round(cappedDelay + jitter);
}
