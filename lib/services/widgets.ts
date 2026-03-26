import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { api } from "./api";
import type {
  WidgetConfig,
  WidgetType,
  UnreadMessagesData,
  MentionsData,
  DirectMessagesData,
} from "../types/widgets";

const WIDGET_CONFIGS_KEY = "hearth_widget_configs";
const WIDGET_CACHE_PREFIX = "hearth_widget_cache_";

// Default refresh intervals per widget type (in minutes)
const DEFAULT_REFRESH_INTERVALS: Record<WidgetType, number> = {
  unread_messages: 5,
  mentions: 3,
  direct_messages: 5,
};

/**
 * Fetch unread messages summary for widget display
 */
export async function fetchUnreadMessages(): Promise<UnreadMessagesData> {
  const { data, error } = await api.get<UnreadMessagesData>(
    "/widgets/unread-messages",
    true
  );

  if (error || !data) {
    // Fall back to cached data
    const cached = await getCachedWidgetData<UnreadMessagesData>("unread_messages");
    if (cached) return cached;
    return { totalUnread: 0, channels: [] };
  }

  await cacheWidgetData("unread_messages", data);
  return data;
}

/**
 * Fetch mentions summary for widget display
 */
export async function fetchMentions(): Promise<MentionsData> {
  const { data, error } = await api.get<MentionsData>(
    "/widgets/mentions",
    true
  );

  if (error || !data) {
    const cached = await getCachedWidgetData<MentionsData>("mentions");
    if (cached) return cached;
    return { totalMentions: 0, mentions: [] };
  }

  await cacheWidgetData("mentions", data);
  return data;
}

/**
 * Fetch direct messages summary for widget display
 */
export async function fetchDirectMessages(): Promise<DirectMessagesData> {
  const { data, error } = await api.get<DirectMessagesData>(
    "/widgets/direct-messages",
    true
  );

  if (error || !data) {
    const cached = await getCachedWidgetData<DirectMessagesData>("direct_messages");
    if (cached) return cached;
    return { totalUnread: 0, conversations: [] };
  }

  await cacheWidgetData("direct_messages", data);
  return data;
}

/**
 * Fetch data for a specific widget type
 */
export async function fetchWidgetData(
  type: WidgetType
): Promise<UnreadMessagesData | MentionsData | DirectMessagesData> {
  switch (type) {
    case "unread_messages":
      return fetchUnreadMessages();
    case "mentions":
      return fetchMentions();
    case "direct_messages":
      return fetchDirectMessages();
  }
}

/**
 * Refresh all enabled widgets
 */
export async function refreshAllWidgets(): Promise<void> {
  const configs = await getWidgetConfigs();
  const enabled = configs.filter((c) => c.enabled);

  await Promise.allSettled(
    enabled.map(async (config) => {
      await fetchWidgetData(config.type);
      await saveWidgetConfig({
        ...config,
        lastUpdated: new Date().toISOString(),
      });
    })
  );

  // Notify native widget extension to reload
  notifyNativeWidgetReload();
}

// --- Widget config persistence ---

export async function getWidgetConfigs(): Promise<WidgetConfig[]> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_CONFIGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveWidgetConfig(config: WidgetConfig): Promise<void> {
  const configs = await getWidgetConfigs();
  const index = configs.findIndex((c) => c.id === config.id);
  if (index >= 0) {
    configs[index] = config;
  } else {
    configs.push(config);
  }
  await AsyncStorage.setItem(WIDGET_CONFIGS_KEY, JSON.stringify(configs));
}

export async function removeWidgetConfig(id: string): Promise<void> {
  const configs = await getWidgetConfigs();
  const filtered = configs.filter((c) => c.id !== id);
  await AsyncStorage.setItem(WIDGET_CONFIGS_KEY, JSON.stringify(filtered));
}

export function createDefaultWidgetConfig(
  type: WidgetType,
  id: string
): WidgetConfig {
  return {
    id,
    type,
    size: "medium",
    enabled: true,
    refreshInterval: DEFAULT_REFRESH_INTERVALS[type],
  };
}

// --- Cache layer ---

async function cacheWidgetData<T>(type: WidgetType, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(
      `${WIDGET_CACHE_PREFIX}${type}`,
      JSON.stringify({ data, cachedAt: Date.now() })
    );
  } catch {
    // Cache write failure is non-critical
  }
}

async function getCachedWidgetData<T>(type: WidgetType): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`${WIDGET_CACHE_PREFIX}${type}`);
    if (!raw) return null;
    const { data, cachedAt } = JSON.parse(raw);
    // Expire cache after 30 minutes
    if (Date.now() - cachedAt > 30 * 60 * 1000) return null;
    return data as T;
  } catch {
    return null;
  }
}

/**
 * Signal native widget extensions to reload their timelines.
 * On iOS this uses WidgetKit reloadAllTimelines; on Android it sends
 * a broadcast to AppWidgetManager. Both are called via native modules
 * when available, and silently no-op otherwise.
 */
function notifyNativeWidgetReload(): void {
  try {
    if (Platform.OS === "ios") {
      // expo-modules or native module bridge call
      const { NativeModules } = require("react-native");
      NativeModules.HearthWidgetModule?.reloadAllTimelines?.();
    } else if (Platform.OS === "android") {
      const { NativeModules } = require("react-native");
      NativeModules.HearthWidgetModule?.updateAllWidgets?.();
    }
  } catch {
    // Native module not available — widget extension not installed
  }
}
