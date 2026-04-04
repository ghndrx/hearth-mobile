/**
 * Notification Action Handlers - PN-005
 *
 * Handles responses from notification actions and integrates with backend:
 * - Quick reply handling
 * - Emoji reaction processing
 * - Voice channel actions
 * - Friend request responses
 * - Backend API integration
 * - Offline action queuing
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  registerActionHandler,
  executeActionHandler,
  type ActionResponse,
  type NotificationActionType,
} from "./richNotificationActions";
import { handleAndroidActionResponse } from "./androidRichNotifications";

const PENDING_ACTIONS_KEY = "@hearth/pending_notification_actions";
const ACTION_HISTORY_KEY = "@hearth/notification_action_history";

// ============================================================================
// Types
// ============================================================================

export interface PendingAction extends ActionResponse {
  retryCount: number;
  lastAttempt: number;
  maxRetries: number;
  backoffMs: number;
}

export interface ActionHistoryItem {
  actionId: string;
  categoryId: string;
  timestamp: number;
  success: boolean;
  error?: string;
  userText?: string;
}

export interface BackendActionRequest {
  action: NotificationActionType;
  notificationId: string;
  data: {
    type?: string;
    channelId?: string;
    serverId?: string;
    messageId?: string;
    userId?: string;
    userText?: string;
    emoji?: string;
  };
}

export interface BackendActionResponse {
  success: boolean;
  message?: string;
  data?: any;
}

// ============================================================================
// Backend API Integration
// ============================================================================

/**
 * Send action to backend API
 */
async function sendActionToBackend(
  request: BackendActionRequest,
  authToken?: string
): Promise<BackendActionResponse> {
  try {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    if (!apiUrl) {
      throw new Error("API URL not configured");
    }

    const response = await fetch(`${apiUrl}/notifications/actions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to send action to backend:", error);
    throw error;
  }
}

// ============================================================================
// Action Handlers
// ============================================================================

/**
 * Handle quick reply action
 */
async function handleQuickReply(response: ActionResponse): Promise<void> {
  if (!response.userText) {
    throw new Error("No reply text provided");
  }

  const request: BackendActionRequest = {
    action: "quick_reply",
    notificationId: response.notificationId,
    data: {
      type: response.data.type,
      channelId: response.data.channelId,
      serverId: response.data.serverId,
      messageId: response.data.messageId,
      userText: response.userText,
    },
  };

  const authToken = await getAuthToken();
  await sendActionToBackend(request, authToken);

  // Show success feedback
  await showActionFeedback("Reply sent successfully", "success");
}

/**
 * Handle emoji reaction action
 */
async function handleEmojiReaction(response: ActionResponse): Promise<void> {
  const emoji = (response.data as any).emoji || extractEmojiFromAction(response.actionId);
  if (!emoji) {
    throw new Error("No emoji specified for reaction");
  }

  const request: BackendActionRequest = {
    action: "emoji_reaction",
    notificationId: response.notificationId,
    data: {
      type: response.data.type,
      channelId: response.data.channelId,
      serverId: response.data.serverId,
      messageId: response.data.messageId,
      emoji,
    },
  };

  const authToken = await getAuthToken();
  await sendActionToBackend(request, authToken);

  await showActionFeedback(`Reacted with ${emoji}`, "success");
}

/**
 * Handle mark as read action
 */
async function handleMarkRead(response: ActionResponse): Promise<void> {
  const request: BackendActionRequest = {
    action: "mark_read",
    notificationId: response.notificationId,
    data: {
      type: response.data.type,
      channelId: response.data.channelId,
      serverId: response.data.serverId,
      messageId: response.data.messageId,
    },
  };

  const authToken = await getAuthToken();
  await sendActionToBackend(request, authToken);

  // Clear the notification locally
  await Notifications.dismissNotificationAsync(response.notificationId);
  await showActionFeedback("Marked as read", "success");
}

/**
 * Handle mute/unmute action
 */
async function handleMute(response: ActionResponse): Promise<void> {
  const isMute = response.actionId === "mute";

  const request: BackendActionRequest = {
    action: isMute ? "mute" : "unmute",
    notificationId: response.notificationId,
    data: {
      type: response.data.type,
      channelId: response.data.channelId,
      serverId: response.data.serverId,
      userId: response.data.userId,
    },
  };

  const authToken = await getAuthToken();
  await sendActionToBackend(request, authToken);

  await showActionFeedback(
    isMute ? "Muted successfully" : "Unmuted successfully",
    "success"
  );
}

/**
 * Handle join voice channel action
 */
async function handleJoinVoice(response: ActionResponse): Promise<void> {
  const request: BackendActionRequest = {
    action: "join_voice",
    notificationId: response.notificationId,
    data: {
      type: response.data.type,
      channelId: response.data.channelId,
      serverId: response.data.serverId,
    },
  };

  const authToken = await getAuthToken();
  await sendActionToBackend(request, authToken);

  await showActionFeedback("Joining voice channel...", "success");

  // Could trigger app to open voice channel view
  // This would typically navigate the user to the voice interface
}

/**
 * Handle leave voice channel action
 */
async function handleLeaveVoice(response: ActionResponse): Promise<void> {
  const request: BackendActionRequest = {
    action: "leave_voice",
    notificationId: response.notificationId,
    data: {
      type: response.data.type,
      channelId: response.data.channelId,
      serverId: response.data.serverId,
    },
  };

  const authToken = await getAuthToken();
  await sendActionToBackend(request, authToken);

  await showActionFeedback("Left voice channel", "success");
}

/**
 * Handle accept friend request/invite
 */
async function handleAcceptInvite(response: ActionResponse): Promise<void> {
  const request: BackendActionRequest = {
    action: "accept_invite",
    notificationId: response.notificationId,
    data: {
      type: response.data.type,
      userId: response.data.userId,
      serverId: response.data.serverId,
    },
  };

  const authToken = await getAuthToken();
  await sendActionToBackend(request, authToken);

  // Clear the notification
  await Notifications.dismissNotificationAsync(response.notificationId);
  await showActionFeedback("Invite accepted", "success");
}

/**
 * Handle decline friend request/invite
 */
async function handleDeclineInvite(response: ActionResponse): Promise<void> {
  const request: BackendActionRequest = {
    action: "decline_invite",
    notificationId: response.notificationId,
    data: {
      type: response.data.type,
      userId: response.data.userId,
      serverId: response.data.serverId,
    },
  };

  const authToken = await getAuthToken();
  await sendActionToBackend(request, authToken);

  // Clear the notification
  await Notifications.dismissNotificationAsync(response.notificationId);
  await showActionFeedback("Invite declined", "success");
}

/**
 * Handle view thread/content action
 */
async function handleViewThread(response: ActionResponse): Promise<void> {
  // This action typically opens the app to show the content
  // The backend doesn't need to be notified, but we track the interaction

  await logActionHistory({
    actionId: response.actionId,
    categoryId: response.categoryId,
    timestamp: response.timestamp,
    success: true,
  });

  // The app navigation is handled by the notification response listener
  // in the main notification hook
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract emoji from action ID
 */
function extractEmojiFromAction(actionId: string): string | null {
  const emojiMatch = actionId.match(/emoji_react_(.+)$/);
  if (emojiMatch) {
    // Convert emoji names to actual emojis
    const emojiMap: Record<string, string> = {
      thumbs_up: "👍",
      heart: "❤️",
      laughing: "😂",
      wow: "😮",
      sad: "😢",
      angry: "😡",
    };
    return emojiMap[emojiMatch[1]] || emojiMatch[1];
  }
  return null;
}

/**
 * Get authentication token for API requests
 */
async function getAuthToken(): Promise<string | undefined> {
  try {
    // In a real app, this would get the token from secure storage
    return await AsyncStorage.getItem("@hearth/auth_token") || undefined;
  } catch (error) {
    console.warn("Failed to get auth token:", error);
    return undefined;
  }
}

/**
 * Show action feedback to user
 */
async function showActionFeedback(
  message: string,
  type: "success" | "error" | "info"
): Promise<void> {
  try {
    // Create a local feedback notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: type === "error" ? "Action Failed" : "Action Complete",
        body: message,
        data: { feedback: true, type },
        sound: type === "error",
      },
      trigger: null,
    });

    // Auto-dismiss after a few seconds
    setTimeout(async () => {
      const notifications = await Notifications.getPresentedNotificationsAsync();
      for (const notif of notifications) {
        const data = notif.request.content.data as any;
        if (data?.feedback && data?.type === type) {
          await Notifications.dismissNotificationAsync(notif.request.identifier);
        }
      }
    }, 3000);
  } catch (error) {
    console.error("Failed to show action feedback:", error);
  }
}

// ============================================================================
// Pending Actions Management
// ============================================================================

/**
 * Queue action for retry if it fails
 */
async function queuePendingAction(response: ActionResponse): Promise<void> {
  try {
    const pending = await getPendingActions();
    const pendingAction: PendingAction = {
      ...response,
      retryCount: 0,
      lastAttempt: Date.now(),
      maxRetries: 3,
      backoffMs: 5000, // 5 seconds initial backoff
    };

    pending.push(pendingAction);
    await AsyncStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(pending));
  } catch (error) {
    console.error("Failed to queue pending action:", error);
  }
}

/**
 * Get pending actions
 */
async function getPendingActions(): Promise<PendingAction[]> {
  try {
    const stored = await AsyncStorage.getItem(PENDING_ACTIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to get pending actions:", error);
    return [];
  }
}

/**
 * Retry pending actions
 */
export async function retryPendingActions(): Promise<void> {
  try {
    const pending = await getPendingActions();
    const now = Date.now();
    const remaining: PendingAction[] = [];

    for (const action of pending) {
      // Check if enough time has passed for retry
      const timeSinceLastAttempt = now - action.lastAttempt;
      const shouldRetry = timeSinceLastAttempt >= action.backoffMs;

      if (!shouldRetry || action.retryCount >= action.maxRetries) {
        if (action.retryCount >= action.maxRetries) {
          // Log failed action
          await logActionHistory({
            actionId: action.actionId,
            categoryId: action.categoryId,
            timestamp: action.timestamp,
            success: false,
            error: "Max retries exceeded",
            userText: action.userText,
          });
        } else {
          remaining.push(action);
        }
        continue;
      }

      try {
        await executeActionHandler(action);

        // Success - log it
        await logActionHistory({
          actionId: action.actionId,
          categoryId: action.categoryId,
          timestamp: action.timestamp,
          success: true,
          userText: action.userText,
        });
      } catch (error) {
        // Failed - update retry info
        action.retryCount++;
        action.lastAttempt = now;
        action.backoffMs = Math.min(action.backoffMs * 2, 60000); // Max 1 minute backoff
        remaining.push(action);
      }
    }

    await AsyncStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(remaining));
  } catch (error) {
    console.error("Failed to retry pending actions:", error);
  }
}

// ============================================================================
// Action History
// ============================================================================

/**
 * Log action to history
 */
async function logActionHistory(item: ActionHistoryItem): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(ACTION_HISTORY_KEY);
    const history: ActionHistoryItem[] = stored ? JSON.parse(stored) : [];

    history.push(item);

    // Keep only last 100 actions
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }

    await AsyncStorage.setItem(ACTION_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Failed to log action history:", error);
  }
}

/**
 * Get action history
 */
export async function getActionHistory(): Promise<ActionHistoryItem[]> {
  try {
    const stored = await AsyncStorage.getItem(ACTION_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to get action history:", error);
    return [];
  }
}

// ============================================================================
// Main Action Handler
// ============================================================================

/**
 * Process notification action response
 */
export async function processNotificationAction(
  notificationResponse: Notifications.NotificationResponse
): Promise<void> {
  try {
    let actionResponse: ActionResponse | null = null;

    // Handle platform-specific response format
    if (Platform.OS === "android") {
      actionResponse = await handleAndroidActionResponse(notificationResponse);
    } else {
      // iOS - construct action response from notification data
      const actionId = notificationResponse.actionIdentifier;
      if (actionId && actionId !== "default") {
        const data = notificationResponse.notification.request.content.data;
        actionResponse = {
          actionId,
          categoryId: data.categoryUsed || "unknown",
          notificationId: notificationResponse.notification.request.identifier,
          userText: notificationResponse.userText,
          timestamp: Date.now(),
          data: data as any,
        };
      }
    }

    if (!actionResponse) {
      // No action to process (probably just tapped the notification)
      return;
    }

    try {
      // Try to execute the action
      const success = await executeActionHandler(actionResponse);

      if (success) {
        await logActionHistory({
          actionId: actionResponse.actionId,
          categoryId: actionResponse.categoryId,
          timestamp: actionResponse.timestamp,
          success: true,
          userText: actionResponse.userText,
        });
      } else {
        throw new Error("No handler found for action");
      }
    } catch (error) {
      console.error("Action execution failed:", error);

      // Queue for retry
      await queuePendingAction(actionResponse);

      // Log the failure
      await logActionHistory({
        actionId: actionResponse.actionId,
        categoryId: actionResponse.categoryId,
        timestamp: actionResponse.timestamp,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        userText: actionResponse.userText,
      });

      // Show error feedback
      await showActionFeedback(
        `Failed to ${actionResponse.actionId.replace(/_/g, ' ')}. Will retry later.`,
        "error"
      );
    }
  } catch (error) {
    console.error("Failed to process notification action:", error);
  }
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize notification action handlers
 */
export async function initializeNotificationActionHandlers(): Promise<void> {
  try {
    // Register all action handlers
    registerActionHandler("quick_reply", handleQuickReply);
    registerActionHandler("emoji_reaction", handleEmojiReaction);
    registerActionHandler("mark_read", handleMarkRead);
    registerActionHandler("mute", handleMute);
    registerActionHandler("unmute", handleMute); // Same handler
    registerActionHandler("join_voice", handleJoinVoice);
    registerActionHandler("leave_voice", handleLeaveVoice);
    registerActionHandler("accept_invite", handleAcceptInvite);
    registerActionHandler("decline_invite", handleDeclineInvite);
    registerActionHandler("view_thread", handleViewThread);

    // Start background retry process
    setInterval(retryPendingActions, 30000); // Retry every 30 seconds

    console.log("Notification action handlers initialized");
  } catch (error) {
    console.error("Failed to initialize notification action handlers:", error);
  }
}

// Export utility functions for testing and debugging
export {
  queuePendingAction,
  getPendingActions,
  showActionFeedback,
};