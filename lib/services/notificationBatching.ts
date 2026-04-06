/**
 * Notification Batching Service (PN-004)
 *
 * Provides intelligent notification batching to group multiple notifications
 * together rather than showing them individually.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { nanoid } from 'nanoid';

// ============================================================================
// Types
// ============================================================================

export type GroupingKeyType = 'sender' | 'conversation' | 'time_window' | 'channel';

export interface NotificationGroup {
  key: string;
  type: GroupingKeyType;
  notifications: QueuedNotification[];
  firstReceivedAt: number;
  lastReceivedAt: number;
  title: string;
  summary: string;
  channelId?: string;
  serverId?: string;
  userId?: string;
}

export interface QueuedNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  receivedAt: number;
  senderId?: string;
  senderName?: string;
  channelId?: string;
  serverId?: string;
  threadId?: string;
}

export interface BatchingConfig {
  enabled: boolean;
  batchWindowMs: number; // Time window to group notifications (default: 5000ms)
  maxGroupSize: number; // Maximum notifications per group (default: 10)
  maxPendingNotifications: number; // Maximum pending before flush (default: 50)
  groupingStrategy: GroupingKeyType;
  showGroupSummary: boolean;
}

export interface NotificationGroupingSettings {
  bySender: boolean;
  byConversation: boolean;
  byChannel: boolean;
  timeWindowSeconds: number;
}

const DEFAULT_BATCHING_CONFIG: BatchingConfig = {
  enabled: true,
  batchWindowMs: 5000,
  maxGroupSize: 10,
  maxPendingNotifications: 50,
  groupingStrategy: 'conversation',
  showGroupSummary: true,
};

const DEFAULT_GROUPING_SETTINGS: NotificationGroupingSettings = {
  bySender: true,
  byConversation: true,
  byChannel: true,
  timeWindowSeconds: 5,
};

// ============================================================================
// Storage Keys
// ============================================================================

const BATCHING_CONFIG_KEY = '@hearth/notification_batching_config';
const GROUPING_SETTINGS_KEY = '@hearth/notification_grouping_settings';

// ============================================================================
// In-Memory State
// ============================================================================

let pendingGroups: Map<string, NotificationGroup> = new Map();
let flushTimers: Map<string, NodeJS.Timeout> = new Map();
let isInitialized = false;

// ============================================================================
// Configuration Management
// ============================================================================

export async function getBatchingConfig(): Promise<BatchingConfig> {
  try {
    const stored = await AsyncStorage.getItem(BATCHING_CONFIG_KEY);
    if (stored) {
      return { ...DEFAULT_BATCHING_CONFIG, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Failed to get batching config:', error);
  }
  return DEFAULT_BATCHING_CONFIG;
}

export async function saveBatchingConfig(
  config: Partial<BatchingConfig>
): Promise<BatchingConfig> {
  try {
    const current = await getBatchingConfig();
    const updated = { ...current, ...config };
    await AsyncStorage.setItem(BATCHING_CONFIG_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Failed to save batching config:', error);
    throw error;
  }
}

export async function getGroupingSettings(): Promise<NotificationGroupingSettings> {
  try {
    const stored = await AsyncStorage.getItem(GROUPING_SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_GROUPING_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Failed to get grouping settings:', error);
  }
  return DEFAULT_GROUPING_SETTINGS;
}

export async function saveGroupingSettings(
  settings: Partial<NotificationGroupingSettings>
): Promise<NotificationGroupingSettings> {
  try {
    const current = await getGroupingSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(GROUPING_SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Failed to save grouping settings:', error);
    throw error;
  }
}

// ============================================================================
// Grouping Key Generation
// ============================================================================

/**
 * Generate a unique grouping key for a notification
 */
function generateGroupingKey(
  notification: QueuedNotification,
  strategy: GroupingKeyType
): string {
  switch (strategy) {
    case 'sender':
      return `sender:${notification.senderId || 'unknown'}`;

    case 'conversation':
      // Group by conversation: sender + channel
      return `conv:${notification.senderId || 'unknown'}:${notification.channelId || 'unknown'}`;

    case 'channel':
      return `channel:${notification.channelId || 'unknown'}`;

    case 'time_window':
      // Group by channel + time window
      const windowStart = Math.floor(
        Date.now() / (DEFAULT_BATCHING_CONFIG.batchWindowMs)
      );
      return `window:${notification.channelId || 'unknown'}:${windowStart}`;

    default:
      return `default:${notification.channelId || nanoid(8)}`;
  }
}

/**
 * Generate summary text for a notification group
 */
function generateGroupSummary(group: NotificationGroup): string {
  const count = group.notifications.length;

  if (count === 1) {
    return group.notifications[0].body;
  }

  const uniqueSenders = new Set(
    group.notifications
      .map((n) => n.senderName)
      .filter(Boolean)
  );

  if (uniqueSenders.size === 1) {
    const senderName = group.notifications[0].senderName || 'Someone';
    if (count === 2) {
      return `${senderName}: ${group.notifications[0].body.substring(0, 30)}... and 1 more`;
    }
    return `${senderName}: ${group.notifications[0].body.substring(0, 30)}... and ${count - 1} more`;
  }

  // Multiple senders
  const senderNames = Array.from(uniqueSenders).slice(0, 2).join(', ');
  if (count > uniqueSenders.size) {
    return `${senderNames} and ${count - uniqueSenders.size} more messaged`;
  }
  return `${senderNames} sent messages`;
}

// ============================================================================
// Core Batching Logic
// ============================================================================

/**
 * Queue a notification for potential batching
 */
export async function queueNotification(
  notification: Omit<QueuedNotification, 'id' | 'receivedAt'>
): Promise<NotificationGroup | null> {
  const config = await getBatchingConfig();

  if (!config.enabled) {
    // If batching disabled, return null to indicate immediate display
    return null;
  }

  const queuedNotification: QueuedNotification = {
    ...notification,
    id: nanoid(),
    receivedAt: Date.now(),
  };

  const groupingKey = generateGroupingKey(
    queuedNotification,
    config.groupingStrategy
  );

  const existingGroup = pendingGroups.get(groupingKey);

  if (existingGroup) {
    // Add to existing group
    existingGroup.notifications.push(queuedNotification);
    existingGroup.lastReceivedAt = Date.now();

    // Update summary
    existingGroup.summary = generateGroupSummary(existingGroup);

    // Check if we've hit max group size
    if (existingGroup.notifications.length >= config.maxGroupSize) {
      return await flushGroup(groupingKey);
    }

    // Reset the flush timer
    resetFlushTimer(groupingKey, config.batchWindowMs);

    return null; // Notification batched, don't display yet
  }

  // Create new group
  const newGroup: NotificationGroup = {
    key: groupingKey,
    type: config.groupingStrategy,
    notifications: [queuedNotification],
    firstReceivedAt: Date.now(),
    lastReceivedAt: Date.now(),
    title: notification.title,
    summary: notification.body,
    channelId: notification.channelId,
    serverId: notification.serverId,
    userId: notification.senderId,
  };

  pendingGroups.set(groupingKey, newGroup);

  // Set flush timer
  setFlushTimer(groupingKey, config.batchWindowMs);

  return null; // Notification batched, don't display yet
}

/**
 * Set a timer to flush a notification group
 */
function setFlushTimer(groupingKey: string, delayMs: number): void {
  // Clear any existing timer
  const existingTimer = flushTimers.get(groupingKey);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(async () => {
    await flushGroup(groupingKey);
  }, delayMs);

  flushTimers.set(groupingKey, timer);
}

/**
 * Reset the flush timer for a group
 */
function resetFlushTimer(groupingKey: string, delayMs: number): void {
  setFlushTimer(groupingKey, delayMs);
}

/**
 * Flush a specific notification group - display the grouped notification
 */
export async function flushGroup(
  groupingKey: string
): Promise<NotificationGroup | null> {
  const group = pendingGroups.get(groupingKey);
  if (!group) {
    return null;
  }

  // Clear the timer
  const timer = flushTimers.get(groupingKey);
  if (timer) {
    clearTimeout(timer);
    flushTimers.delete(groupingKey);
  }

  // Remove from pending
  pendingGroups.delete(groupingKey);

  // If only one notification, treat as regular
  if (group.notifications.length === 1) {
    const single = group.notifications[0];
    await displayNotification({
      title: single.title,
      body: single.body,
      data: single.data,
      tag: groupingKey,
    });
    return null;
  }

  // Display grouped notification
  await displayGroupedNotification(group);

  return group;
}

/**
 * Flush all pending notification groups
 */
export async function flushAllGroups(): Promise<NotificationGroup[]> {
  const groups: NotificationGroup[] = [];
  const keys = Array.from(pendingGroups.keys());

  for (const key of keys) {
    const group = await flushGroup(key);
    if (group) {
      groups.push(group);
    }
  }

  return groups;
}

/**
 * Display a grouped notification summary
 */
async function displayGroupedNotification(group: NotificationGroup): Promise<void> {
  const config = await getBatchingConfig();
  const count = group.notifications.length;

  let title: string;
  let body: string;

  if (count === 2) {
    const [first, second] = group.notifications;
    const firstName = first.senderName || 'Someone';
    const secondName = second.senderName || 'Someone';
    title = group.title;
    body = `${firstName}: ${truncate(first.body, 40)} and ${secondName}: ${truncate(second.body, 40)}`;
  } else {
    const uniqueSenders = new Set(
      group.notifications.map((n) => n.senderName).filter(Boolean)
    );

    if (uniqueSenders.size === 1) {
      title = group.title;
      body = `You have ${count} messages`;
    } else {
      title = group.title;
      body = `${uniqueSenders.size} people sent ${count} messages`;
    }
  }

  // Build data payload with all notification data
  const data = {
    ...group.notifications[0].data,
    _grouped: true,
    _groupKey: group.key,
    _groupCount: count,
    _groupChannelId: group.channelId,
    _groupServerId: group.serverId,
    _notificationTypes: group.notifications.map((n) => n.type),
  };

  await displayNotification({
    title,
    body,
    data,
    tag: group.key,
  });
}

/**
 * Display a single notification
 */
async function displayNotification(notification: {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  tag?: string;
}): Promise<void> {
  const androidChannelId = getAndroidChannelId(notification.data);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      sound: true,
      ...(Platform.OS === 'android' && {
        style: 'inbox',
      }),
    },
    trigger: null,
  });
}

/**
 * Get appropriate Android channel ID for notification type
 */
function getAndroidChannelId(data?: Record<string, unknown>): string {
  if (!data) return 'default';

  const type = data.type as string;
  switch (type) {
    case 'message':
      return 'messages';
    case 'dm':
      return 'direct-messages';
    case 'mention':
      return 'mentions';
    case 'call':
      return 'calls';
    case 'friend_request':
      return 'social';
    default:
      return 'default';
  }
}

/**
 * Truncate a string to a maximum length
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

// ============================================================================
// iOS Notification Grouping (Native Configuration)
// ============================================================================

/**
 * Configure iOS notification grouping (this is called from React Native side)
 * The actual iOS native configuration is in PushNotifications.swift
 */
export async function configureIOSNotificationGrouping(): Promise<void> {
  if (Platform.OS !== 'ios') return;

  // iOS handles grouping through UNNotificationCategory and UNNotificationContent
  // The native code (PushNotifications.swift) already sets up the notification center delegate
  // This function can be used to configure threading identifiers for iOS notification groups

  console.log('iOS notification grouping configuration loaded');
}

// ============================================================================
// Android Notification Grouping
// ============================================================================

/**
 * Configure Android notification channels with grouping support
 */
export async function configureAndroidNotificationGrouping(): Promise<void> {
  if (Platform.OS !== 'android') return;

  // Android supports notification grouping natively through:
  // 1. NotificationChannelGroup - groups channels together
  // 2. setGroup() on individual notifications
  // 3. InboxStyle for message grouping

  // Configure group for messages
  await Notifications.setNotificationChannelAsync('messages-group', {
    name: 'Message Groups',
    description: 'Grouped message notifications',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#5865f2',
    sound: 'default',
    enableVibrate: true,
    showBadge: true,
  });

  console.log('Android notification grouping configuration loaded');
}

// ============================================================================
// Statistics and Debugging
// ============================================================================

export function getPendingGroupCount(): number {
  return pendingGroups.size;
}

export function getPendingNotificationCount(): number {
  let count = 0;
  for (const group of pendingGroups.values()) {
    count += group.notifications.length;
  }
  return count;
}

export async function clearPendingNotifications(): Promise<void> {
  // Clear all timers
  for (const timer of flushTimers.values()) {
    clearTimeout(timer);
  }
  flushTimers.clear();
  pendingGroups.clear();
}

// ============================================================================
// Initialization
// ============================================================================

export async function initializeBatchingService(): Promise<void> {
  if (isInitialized) return;

  const config = await getBatchingConfig();

  if (config.enabled) {
    if (Platform.OS === 'android') {
      await configureAndroidNotificationGrouping();
    } else if (Platform.OS === 'ios') {
      await configureIOSNotificationGrouping();
    }
  }

  isInitialized = true;
  console.log('Notification batching service initialized');
}
