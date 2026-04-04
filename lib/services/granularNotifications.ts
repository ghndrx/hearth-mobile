import AsyncStorage from "@react-native-async-storage/async-storage";

const GRANULAR_NOTIFICATION_SETTINGS_KEY = "@hearth/granular_notification_settings";
const MUTED_USERS_KEY = "@hearth/muted_users";
const KEYWORD_FILTERS_KEY = "@hearth/keyword_filters";

// Server-specific notification settings
export interface ServerNotificationSettings {
  serverId: string;
  enabled: boolean;
  messages: boolean;
  mentions: boolean;
  serverActivity: boolean;
  sounds: boolean;
  vibration: boolean;
  showPreviews: boolean;
  priority: 'low' | 'normal' | 'high';
  mutedChannels: string[];
  mutedRoles: string[];
  allowedRoles?: string[]; // Only these roles trigger notifications
}

// Channel-specific notification settings
export interface ChannelNotificationSettings {
  channelId: string;
  serverId: string;
  enabled: boolean;
  mentions: boolean;
  allMessages: boolean;
  sounds: boolean;
  vibration: boolean;
  showPreviews: boolean;
  priority: 'low' | 'normal' | 'high';
  keywordTriggers: string[];
}

// User-specific settings
export interface UserNotificationSettings {
  userId: string;
  isMuted: boolean;
  muteDuration?: number; // Unix timestamp when mute expires, undefined for permanent
  allowDMs: boolean;
  allowMentions: boolean;
  customSound?: string;
}

// Keyword filter settings
export interface KeywordFilter {
  id: string;
  keyword: string;
  action: 'notify' | 'suppress';
  priority: 'low' | 'normal' | 'high';
  enabled: boolean;
  contexts: ('dms' | 'channels' | 'mentions')[];
  excludeServers?: string[];
  includeServers?: string[];
}

// Main granular settings container
export interface GranularNotificationSettings {
  servers: Record<string, ServerNotificationSettings>;
  channels: Record<string, ChannelNotificationSettings>;
  users: Record<string, UserNotificationSettings>;
  keywordFilters: Record<string, KeywordFilter>;
  lastUpdated: number;
}

const DEFAULT_GRANULAR_SETTINGS: GranularNotificationSettings = {
  servers: {},
  channels: {},
  users: {},
  keywordFilters: {},
  lastUpdated: Date.now(),
};

export async function getGranularNotificationSettings(): Promise<GranularNotificationSettings> {
  try {
    const stored = await AsyncStorage.getItem(GRANULAR_NOTIFICATION_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_GRANULAR_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error("Failed to get granular notification settings:", error);
  }
  return DEFAULT_GRANULAR_SETTINGS;
}

export async function saveGranularNotificationSettings(
  settings: Partial<GranularNotificationSettings>
): Promise<GranularNotificationSettings> {
  try {
    const current = await getGranularNotificationSettings();
    const updated = {
      ...current,
      ...settings,
      lastUpdated: Date.now()
    };

    await AsyncStorage.setItem(
      GRANULAR_NOTIFICATION_SETTINGS_KEY,
      JSON.stringify(updated)
    );

    return updated;
  } catch (error) {
    console.error("Failed to save granular notification settings:", error);
    throw error;
  }
}

// Server-specific settings management
export async function getServerNotificationSettings(
  serverId: string
): Promise<ServerNotificationSettings | null> {
  const settings = await getGranularNotificationSettings();
  return settings.servers[serverId] || null;
}

export async function updateServerNotificationSettings(
  serverId: string,
  updates: Partial<Omit<ServerNotificationSettings, 'serverId'>>
): Promise<ServerNotificationSettings> {
  const settings = await getGranularNotificationSettings();
  const current = settings.servers[serverId] || {
    serverId,
    enabled: true,
    messages: true,
    mentions: true,
    serverActivity: true,
    sounds: true,
    vibration: true,
    showPreviews: true,
    priority: 'normal' as const,
    mutedChannels: [],
    mutedRoles: [],
  };

  const updated = { ...current, ...updates };
  const newSettings = {
    ...settings,
    servers: {
      ...settings.servers,
      [serverId]: updated,
    },
  };

  await saveGranularNotificationSettings(newSettings);
  return updated;
}

// Channel-specific settings management
export async function getChannelNotificationSettings(
  channelId: string
): Promise<ChannelNotificationSettings | null> {
  const settings = await getGranularNotificationSettings();
  return settings.channels[channelId] || null;
}

export async function updateChannelNotificationSettings(
  channelId: string,
  serverId: string,
  updates: Partial<Omit<ChannelNotificationSettings, 'channelId' | 'serverId'>>
): Promise<ChannelNotificationSettings> {
  const settings = await getGranularNotificationSettings();
  const current = settings.channels[channelId] || {
    channelId,
    serverId,
    enabled: true,
    mentions: true,
    allMessages: false,
    sounds: true,
    vibration: true,
    showPreviews: true,
    priority: 'normal' as const,
    keywordTriggers: [],
  };

  const updated = { ...current, ...updates };
  const newSettings = {
    ...settings,
    channels: {
      ...settings.channels,
      [channelId]: updated,
    },
  };

  await saveGranularNotificationSettings(newSettings);
  return updated;
}

// User-specific settings management
export async function getUserNotificationSettings(
  userId: string
): Promise<UserNotificationSettings | null> {
  const settings = await getGranularNotificationSettings();
  return settings.users[userId] || null;
}

export async function updateUserNotificationSettings(
  userId: string,
  updates: Partial<Omit<UserNotificationSettings, 'userId'>>
): Promise<UserNotificationSettings> {
  const settings = await getGranularNotificationSettings();
  const current = settings.users[userId] || {
    userId,
    isMuted: false,
    allowDMs: true,
    allowMentions: true,
  };

  const updated = { ...current, ...updates };
  const newSettings = {
    ...settings,
    users: {
      ...settings.users,
      [userId]: updated,
    },
  };

  await saveGranularNotificationSettings(newSettings);
  return updated;
}

// Mute/unmute user helpers
export async function muteUser(
  userId: string,
  duration?: number
): Promise<void> {
  await updateUserNotificationSettings(userId, {
    isMuted: true,
    muteDuration: duration,
  });
}

export async function unmuteUser(userId: string): Promise<void> {
  await updateUserNotificationSettings(userId, {
    isMuted: false,
    muteDuration: undefined,
  });
}

export async function isUserMuted(userId: string): Promise<boolean> {
  const settings = await getUserNotificationSettings(userId);

  if (!settings?.isMuted) return false;

  // Check if mute has expired
  if (settings.muteDuration && Date.now() > settings.muteDuration) {
    await unmuteUser(userId);
    return false;
  }

  return true;
}

// Keyword filter management
export async function addKeywordFilter(filter: Omit<KeywordFilter, 'id'>): Promise<KeywordFilter> {
  const id = `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const fullFilter = { ...filter, id };

  const settings = await getGranularNotificationSettings();
  const newSettings = {
    ...settings,
    keywordFilters: {
      ...settings.keywordFilters,
      [id]: fullFilter,
    },
  };

  await saveGranularNotificationSettings(newSettings);
  return fullFilter;
}

export async function updateKeywordFilter(
  filterId: string,
  updates: Partial<Omit<KeywordFilter, 'id'>>
): Promise<KeywordFilter | null> {
  const settings = await getGranularNotificationSettings();
  const current = settings.keywordFilters[filterId];

  if (!current) return null;

  const updated = { ...current, ...updates };
  const newSettings = {
    ...settings,
    keywordFilters: {
      ...settings.keywordFilters,
      [filterId]: updated,
    },
  };

  await saveGranularNotificationSettings(newSettings);
  return updated;
}

export async function removeKeywordFilter(filterId: string): Promise<boolean> {
  const settings = await getGranularNotificationSettings();

  if (!settings.keywordFilters[filterId]) return false;

  const newFilters = { ...settings.keywordFilters };
  delete newFilters[filterId];

  const newSettings = {
    ...settings,
    keywordFilters: newFilters,
  };

  await saveGranularNotificationSettings(newSettings);
  return true;
}

export async function getKeywordFilters(): Promise<KeywordFilter[]> {
  const settings = await getGranularNotificationSettings();
  return Object.values(settings.keywordFilters);
}

// Channel muting helpers for servers
export async function muteChannelInServer(
  serverId: string,
  channelId: string
): Promise<void> {
  const serverSettings = await getServerNotificationSettings(serverId);
  const currentMuted = serverSettings?.mutedChannels || [];

  if (!currentMuted.includes(channelId)) {
    await updateServerNotificationSettings(serverId, {
      mutedChannels: [...currentMuted, channelId],
    });
  }
}

export async function unmuteChannelInServer(
  serverId: string,
  channelId: string
): Promise<void> {
  const serverSettings = await getServerNotificationSettings(serverId);
  const currentMuted = serverSettings?.mutedChannels || [];

  await updateServerNotificationSettings(serverId, {
    mutedChannels: currentMuted.filter(id => id !== channelId),
  });
}

export async function isChannelMutedInServer(
  serverId: string,
  channelId: string
): Promise<boolean> {
  const serverSettings = await getServerNotificationSettings(serverId);
  return serverSettings?.mutedChannels?.includes(channelId) || false;
}

// Permission checking helper
export async function shouldShowNotification(data: {
  type: string;
  serverId?: string;
  channelId?: string;
  userId?: string;
  content?: string;
  mentionsUser?: boolean;
  userRoles?: string[];
}): Promise<{
  allowed: boolean;
  priority: 'low' | 'normal' | 'high';
  reason?: string;
}> {
  const { type, serverId, channelId, userId, content, mentionsUser, userRoles } = data;

  // Check if user is muted
  if (userId && await isUserMuted(userId)) {
    return { allowed: false, priority: 'normal', reason: 'user_muted' };
  }

  // Check server-level settings
  if (serverId) {
    const serverSettings = await getServerNotificationSettings(serverId);
    if (serverSettings && !serverSettings.enabled) {
      return { allowed: false, priority: 'normal', reason: 'server_disabled' };
    }

    // Check if channel is muted at server level
    if (channelId && await isChannelMutedInServer(serverId, channelId)) {
      return { allowed: false, priority: 'normal', reason: 'channel_muted_in_server' };
    }

    // Check role-based restrictions
    if (serverSettings?.allowedRoles && userRoles) {
      const hasAllowedRole = userRoles.some(role =>
        serverSettings.allowedRoles!.includes(role)
      );
      if (!hasAllowedRole) {
        return { allowed: false, priority: 'normal', reason: 'role_not_allowed' };
      }
    }

    // Check muted roles
    if (serverSettings?.mutedRoles && userRoles) {
      const hasMutedRole = userRoles.some(role =>
        serverSettings.mutedRoles.includes(role)
      );
      if (hasMutedRole) {
        return { allowed: false, priority: 'normal', reason: 'role_muted' };
      }
    }
  }

  // Check channel-level settings
  if (channelId) {
    const channelSettings = await getChannelNotificationSettings(channelId);
    if (channelSettings && !channelSettings.enabled) {
      return { allowed: false, priority: 'normal', reason: 'channel_disabled' };
    }

    // Check mention-only settings
    if (channelSettings && !channelSettings.allMessages && !mentionsUser) {
      return { allowed: false, priority: 'normal', reason: 'mentions_only' };
    }
  }

  // Check keyword filters
  if (content) {
    const filters = await getKeywordFilters();
    for (const filter of filters) {
      if (!filter.enabled) continue;

      const matchesContext = (() => {
        switch (type) {
          case 'dm': return filter.contexts.includes('dms');
          case 'message': return filter.contexts.includes('channels');
          case 'mention': return filter.contexts.includes('mentions');
          default: return true;
        }
      })();

      if (!matchesContext) continue;

      // Check server include/exclude lists
      if (serverId) {
        if (filter.excludeServers?.includes(serverId)) continue;
        if (filter.includeServers && !filter.includeServers.includes(serverId)) continue;
      }

      // Check if content matches keyword
      const contentLower = content.toLowerCase();
      const keywordLower = filter.keyword.toLowerCase();

      if (contentLower.includes(keywordLower)) {
        if (filter.action === 'suppress') {
          return { allowed: false, priority: 'normal', reason: 'keyword_suppressed' };
        } else if (filter.action === 'notify') {
          return { allowed: true, priority: filter.priority, reason: 'keyword_triggered' };
        }
      }
    }
  }

  // Default: allow with normal priority
  return { allowed: true, priority: 'normal' };
}

// Cleanup expired mutes
export async function cleanupExpiredMutes(): Promise<void> {
  const settings = await getGranularNotificationSettings();
  const now = Date.now();
  let hasChanges = false;

  const updatedUsers = { ...settings.users };

  for (const [userId, userSettings] of Object.entries(updatedUsers)) {
    if (userSettings.isMuted && userSettings.muteDuration && now > userSettings.muteDuration) {
      updatedUsers[userId] = {
        ...userSettings,
        isMuted: false,
        muteDuration: undefined,
      };
      hasChanges = true;
    }
  }

  if (hasChanges) {
    await saveGranularNotificationSettings({
      ...settings,
      users: updatedUsers,
    });
  }
}

// Batch operations for better performance
export async function batchUpdateServerSettings(
  updates: Array<{ serverId: string; settings: Partial<Omit<ServerNotificationSettings, 'serverId'>> }>
): Promise<void> {
  const settings = await getGranularNotificationSettings();
  const updatedServers = { ...settings.servers };

  for (const { serverId, settings: serverUpdates } of updates) {
    const current = updatedServers[serverId] || {
      serverId,
      enabled: true,
      messages: true,
      mentions: true,
      serverActivity: true,
      sounds: true,
      vibration: true,
      showPreviews: true,
      priority: 'normal' as const,
      mutedChannels: [],
      mutedRoles: [],
    };

    updatedServers[serverId] = { ...current, ...serverUpdates };
  }

  await saveGranularNotificationSettings({
    ...settings,
    servers: updatedServers,
  });
}