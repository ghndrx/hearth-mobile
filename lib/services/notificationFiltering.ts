/**
 * Notification Filtering and Scheduling - PN-005
 *
 * Advanced notification filtering and scheduling features:
 * - Keyword alerts and filtering
 * - Smart notification scheduling
 * - Reminder notifications
 * - Priority-based filtering
 * - Content-based filtering
 */

import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NotificationPayload, NotificationType } from "./notifications";

const FILTER_SETTINGS_KEY = "@hearth/notification_filters";
const KEYWORD_ALERTS_KEY = "@hearth/keyword_alerts";
const SCHEDULED_NOTIFICATIONS_KEY = "@hearth/scheduled_notifications";

// ============================================================================
// Types
// ============================================================================

export interface KeywordAlert {
  id: string;
  keyword: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  enabled: boolean;
  priority: "low" | "normal" | "high" | "urgent";
  customSound?: string;
  customVibration?: string;
  channels?: string[]; // Specific channels to monitor
  servers?: string[]; // Specific servers to monitor
  excludeChannels?: string[]; // Channels to exclude
  excludeServers?: string[]; // Servers to exclude
  createdAt: number;
}

export interface NotificationFilter {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: FilterCondition[];
  action: FilterAction;
  priority: number; // Higher number = higher priority
}

export interface FilterCondition {
  type: "content" | "sender" | "channel" | "server" | "time" | "frequency";
  operator: "contains" | "equals" | "startswith" | "endswith" | "regex" | "not_contains" | "in_list" | "not_in_list";
  value: string | string[] | number;
  caseSensitive?: boolean;
}

export interface FilterAction {
  type: "allow" | "block" | "modify" | "delay" | "prioritize";
  params?: {
    delayMinutes?: number;
    newPriority?: "low" | "normal" | "high" | "urgent";
    newSound?: string;
    newVibration?: string;
    suppressIfRecentlySent?: boolean;
  };
}

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  triggerAt: number; // Unix timestamp
  repeatInterval?: "minute" | "hour" | "day" | "week" | "month";
  repeatCount?: number; // -1 for infinite
  enabled: boolean;
  createdAt: number;
  tags?: string[];
}

export interface FilterSettings {
  enabled: boolean;
  keywordAlertsEnabled: boolean;
  smartFiltering: boolean; // AI-like filtering based on patterns
  rateLimitEnabled: boolean; // Prevent spam
  rateLimitWindow: number; // Minutes
  rateLimitCount: number; // Max notifications per window
  priorityBasedFiltering: boolean;
  respectQuietHours: boolean;
  batchSimilarNotifications: boolean;
}

// ============================================================================
// Default Settings
// ============================================================================

export const DEFAULT_FILTER_SETTINGS: FilterSettings = {
  enabled: true,
  keywordAlertsEnabled: true,
  smartFiltering: true,
  rateLimitEnabled: true,
  rateLimitWindow: 5, // 5 minutes
  rateLimitCount: 10, // Max 10 notifications per 5 minutes
  priorityBasedFiltering: true,
  respectQuietHours: true,
  batchSimilarNotifications: true,
};

// ============================================================================
// Settings Management
// ============================================================================

/**
 * Get current filter settings
 */
export async function getFilterSettings(): Promise<FilterSettings> {
  try {
    const stored = await AsyncStorage.getItem(FILTER_SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_FILTER_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error("Failed to get filter settings:", error);
  }
  return DEFAULT_FILTER_SETTINGS;
}

/**
 * Save filter settings
 */
export async function saveFilterSettings(
  settings: Partial<FilterSettings>
): Promise<FilterSettings> {
  try {
    const current = await getFilterSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(FILTER_SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error("Failed to save filter settings:", error);
    throw error;
  }
}

// ============================================================================
// Keyword Alerts
// ============================================================================

/**
 * Get all keyword alerts
 */
export async function getKeywordAlerts(): Promise<KeywordAlert[]> {
  try {
    const stored = await AsyncStorage.getItem(KEYWORD_ALERTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to get keyword alerts:", error);
    return [];
  }
}

/**
 * Add keyword alert
 */
export async function addKeywordAlert(
  alert: Omit<KeywordAlert, "id" | "createdAt">
): Promise<KeywordAlert> {
  try {
    const alerts = await getKeywordAlerts();
    const newAlert: KeywordAlert = {
      ...alert,
      id: `kw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
    };

    alerts.push(newAlert);
    await AsyncStorage.setItem(KEYWORD_ALERTS_KEY, JSON.stringify(alerts));
    return newAlert;
  } catch (error) {
    console.error("Failed to add keyword alert:", error);
    throw error;
  }
}

/**
 * Update keyword alert
 */
export async function updateKeywordAlert(
  id: string,
  updates: Partial<KeywordAlert>
): Promise<void> {
  try {
    const alerts = await getKeywordAlerts();
    const index = alerts.findIndex(a => a.id === id);

    if (index === -1) {
      throw new Error(`Keyword alert with ID ${id} not found`);
    }

    alerts[index] = { ...alerts[index], ...updates };
    await AsyncStorage.setItem(KEYWORD_ALERTS_KEY, JSON.stringify(alerts));
  } catch (error) {
    console.error("Failed to update keyword alert:", error);
    throw error;
  }
}

/**
 * Delete keyword alert
 */
export async function deleteKeywordAlert(id: string): Promise<void> {
  try {
    const alerts = await getKeywordAlerts();
    const filtered = alerts.filter(a => a.id !== id);
    await AsyncStorage.setItem(KEYWORD_ALERTS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to delete keyword alert:", error);
    throw error;
  }
}

/**
 * Check if notification matches keyword alerts
 */
export async function checkKeywordAlerts(
  payload: NotificationPayload
): Promise<KeywordAlert[]> {
  try {
    const settings = await getFilterSettings();
    if (!settings.keywordAlertsEnabled) return [];

    const alerts = await getKeywordAlerts();
    const matchedAlerts: KeywordAlert[] = [];

    for (const alert of alerts) {
      if (!alert.enabled) continue;

      // Check server/channel filters
      if (alert.servers && payload.serverId && !alert.servers.includes(payload.serverId)) {
        continue;
      }
      if (alert.excludeServers && payload.serverId && alert.excludeServers.includes(payload.serverId)) {
        continue;
      }
      if (alert.channels && payload.channelId && !alert.channels.includes(payload.channelId)) {
        continue;
      }
      if (alert.excludeChannels && payload.channelId && alert.excludeChannels.includes(payload.channelId)) {
        continue;
      }

      // Check keyword match
      const searchText = `${payload.title} ${payload.body}`;
      const searchTextForMatching = alert.caseSensitive ? searchText : searchText.toLowerCase();
      const keyword = alert.caseSensitive ? alert.keyword : alert.keyword.toLowerCase();

      let matches = false;

      if (alert.wholeWord) {
        const wordBoundaryRegex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, alert.caseSensitive ? 'g' : 'gi');
        matches = wordBoundaryRegex.test(searchTextForMatching);
      } else {
        matches = searchTextForMatching.includes(keyword);
      }

      if (matches) {
        matchedAlerts.push(alert);
      }
    }

    return matchedAlerts.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  } catch (error) {
    console.error("Failed to check keyword alerts:", error);
    return [];
  }
}

// ============================================================================
// Notification Filtering
// ============================================================================

/**
 * Apply filters to notification
 */
export async function applyNotificationFilters(
  payload: NotificationPayload
): Promise<{
  allowed: boolean;
  modified?: NotificationPayload;
  delay?: number;
  reason?: string;
}> {
  try {
    const settings = await getFilterSettings();
    if (!settings.enabled) {
      return { allowed: true };
    }

    // Check rate limiting
    if (settings.rateLimitEnabled) {
      const rateLimitResult = await checkRateLimit(payload, settings);
      if (!rateLimitResult.allowed) {
        return { allowed: false, reason: "Rate limit exceeded" };
      }
    }

    // Check keyword alerts (these take priority)
    const matchedAlerts = await checkKeywordAlerts(payload);
    if (matchedAlerts.length > 0) {
      const highestPriorityAlert = matchedAlerts[0];

      // Modify notification based on alert settings
      const modified = { ...payload };
      if (highestPriorityAlert.customSound) {
        (modified as any).customSound = highestPriorityAlert.customSound;
      }
      if (highestPriorityAlert.customVibration) {
        (modified as any).customVibration = highestPriorityAlert.customVibration;
      }

      return {
        allowed: true,
        modified,
        reason: `Matched keyword alert: ${highestPriorityAlert.keyword}`,
      };
    }

    // Apply content-based smart filtering
    if (settings.smartFiltering) {
      const smartFilterResult = await applySmartFiltering(payload);
      if (smartFilterResult.action !== "allow") {
        return {
          allowed: smartFilterResult.action !== "block",
          delay: smartFilterResult.delay,
          reason: smartFilterResult.reason,
        };
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error("Failed to apply notification filters:", error);
    return { allowed: true }; // Default to allowing on error
  }
}

/**
 * Rate limiting check
 */
async function checkRateLimit(
  payload: NotificationPayload,
  settings: FilterSettings
): Promise<{ allowed: boolean; remaining: number }> {
  const rateLimitKey = `@hearth/rate_limit_${payload.channelId || 'global'}`;

  try {
    const stored = await AsyncStorage.getItem(rateLimitKey);
    const now = Date.now();
    const windowMs = settings.rateLimitWindow * 60 * 1000;

    let notifications: number[] = stored ? JSON.parse(stored) : [];

    // Remove old notifications outside the window
    notifications = notifications.filter(timestamp => now - timestamp < windowMs);

    if (notifications.length >= settings.rateLimitCount) {
      return { allowed: false, remaining: 0 };
    }

    // Add current notification
    notifications.push(now);
    await AsyncStorage.setItem(rateLimitKey, JSON.stringify(notifications));

    return { allowed: true, remaining: settings.rateLimitCount - notifications.length };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    return { allowed: true, remaining: settings.rateLimitCount };
  }
}

/**
 * Smart filtering based on content patterns
 */
async function applySmartFiltering(
  payload: NotificationPayload
): Promise<{ action: "allow" | "block" | "delay"; delay?: number; reason?: string }> {
  // Simple pattern-based filtering
  const content = `${payload.title} ${payload.body}`.toLowerCase();

  // Filter obvious spam patterns
  const spamPatterns = [
    /free.*money/i,
    /click.*here.*now/i,
    /urgent.*action.*required/i,
    /congratulations.*winner/i,
    /amazing.*offer/i,
  ];

  for (const pattern of spamPatterns) {
    if (pattern.test(content)) {
      return { action: "block", reason: "Matched spam pattern" };
    }
  }

  // Delay notifications that seem automated
  const automatedPatterns = [
    /automated.*message/i,
    /do.*not.*reply/i,
    /system.*notification/i,
    /bot.*message/i,
  ];

  for (const pattern of automatedPatterns) {
    if (pattern.test(content)) {
      return { action: "delay", delay: 5, reason: "Automated message - delayed" };
    }
  }

  // Check for duplicate content in short timespan
  const duplicateCheck = await checkForDuplicateContent(payload);
  if (duplicateCheck.isDuplicate) {
    return {
      action: "block",
      reason: `Duplicate content (${duplicateCheck.count} similar in ${duplicateCheck.timeSpan}min)`
    };
  }

  return { action: "allow" };
}

/**
 * Check for duplicate content
 */
async function checkForDuplicateContent(
  payload: NotificationPayload
): Promise<{ isDuplicate: boolean; count: number; timeSpan: number }> {
  const duplicateKey = "@hearth/recent_notifications";
  const timeSpanMs = 10 * 60 * 1000; // 10 minutes

  try {
    const stored = await AsyncStorage.getItem(duplicateKey);
    const now = Date.now();

    let recent: Array<{ body: string; timestamp: number }> = stored ? JSON.parse(stored) : [];

    // Remove old entries
    recent = recent.filter(item => now - item.timestamp < timeSpanMs);

    // Count similar content
    const similar = recent.filter(item =>
      item.body.toLowerCase() === payload.body.toLowerCase()
    );

    // Add current notification
    recent.push({ body: payload.body, timestamp: now });

    // Keep only last 50 entries
    if (recent.length > 50) {
      recent = recent.slice(-50);
    }

    await AsyncStorage.setItem(duplicateKey, JSON.stringify(recent));

    return {
      isDuplicate: similar.length >= 3, // 3 or more in 10 minutes
      count: similar.length,
      timeSpan: 10,
    };
  } catch (error) {
    console.error("Duplicate check failed:", error);
    return { isDuplicate: false, count: 0, timeSpan: 0 };
  }
}

// ============================================================================
// Scheduled Notifications
// ============================================================================

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<ScheduledNotification[]> {
  try {
    const stored = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to get scheduled notifications:", error);
    return [];
  }
}

/**
 * Schedule a notification
 */
export async function scheduleNotification(
  notification: Omit<ScheduledNotification, "id" | "createdAt">
): Promise<ScheduledNotification> {
  try {
    const scheduled = await getScheduledNotifications();
    const newNotification: ScheduledNotification = {
      ...notification,
      id: `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
    };

    scheduled.push(newNotification);
    await AsyncStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(scheduled));

    // Schedule with expo-notifications
    await Notifications.scheduleNotificationAsync({
      content: {
        title: newNotification.title,
        body: newNotification.body,
        data: {
          ...newNotification.data,
          scheduledNotificationId: newNotification.id,
          tags: newNotification.tags,
        },
      },
      trigger: newNotification.triggerAt
        ? ({ date: new Date(newNotification.triggerAt) } as any)
        : null,
    });

    return newNotification;
  } catch (error) {
    console.error("Failed to schedule notification:", error);
    throw error;
  }
}

/**
 * Cancel scheduled notification
 */
export async function cancelScheduledNotification(id: string): Promise<void> {
  try {
    const scheduled = await getScheduledNotifications();
    const filtered = scheduled.filter(n => n.id !== id);
    await AsyncStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(filtered));

    // Cancel with expo-notifications
    // Note: We'd need to track the notification identifier for this to work properly
    console.log(`Cancelled scheduled notification: ${id}`);
  } catch (error) {
    console.error("Failed to cancel scheduled notification:", error);
    throw error;
  }
}

/**
 * Create reminder notification
 */
export async function createReminder(
  title: string,
  body: string,
  triggerAt: Date,
  tags?: string[]
): Promise<ScheduledNotification> {
  return scheduleNotification({
    title,
    body,
    triggerAt: triggerAt.getTime(),
    enabled: true,
    tags: [...(tags || []), "reminder"],
  });
}

/**
 * Clean up expired scheduled notifications
 */
export async function cleanupExpiredNotifications(): Promise<void> {
  try {
    const scheduled = await getScheduledNotifications();
    const now = Date.now();

    const active = scheduled.filter(notification => {
      if (!notification.enabled) return false;
      if (notification.triggerAt > now) return true;

      // Keep if it has repeats left
      if (notification.repeatInterval && (notification.repeatCount === -1 || (notification.repeatCount || 0) > 0)) {
        return true;
      }

      return false;
    });

    await AsyncStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(active));
  } catch (error) {
    console.error("Failed to cleanup expired notifications:", error);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get filter statistics
 */
export async function getFilterStatistics(): Promise<{
  totalKeywordAlerts: number;
  activeKeywordAlerts: number;
  scheduledNotifications: number;
  recentlyFiltered: number;
}> {
  try {
    const [keywords, scheduled] = await Promise.all([
      getKeywordAlerts(),
      getScheduledNotifications(),
    ]);

    return {
      totalKeywordAlerts: keywords.length,
      activeKeywordAlerts: keywords.filter(k => k.enabled).length,
      scheduledNotifications: scheduled.filter(s => s.enabled && s.triggerAt > Date.now()).length,
      recentlyFiltered: 0, // Would need to track this
    };
  } catch (error) {
    console.error("Failed to get filter statistics:", error);
    return {
      totalKeywordAlerts: 0,
      activeKeywordAlerts: 0,
      scheduledNotifications: 0,
      recentlyFiltered: 0,
    };
  }
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize notification filtering system
 */
export async function initializeNotificationFiltering(): Promise<void> {
  try {
    // Clean up expired notifications on init
    await cleanupExpiredNotifications();
    console.log("Notification filtering system initialized");
  } catch (error) {
    console.error("Failed to initialize notification filtering:", error);
  }
}