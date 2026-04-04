import { useCallback, useEffect, useState } from 'react';
import {
  getGranularNotificationSettings,
  saveGranularNotificationSettings,
  getServerNotificationSettings,
  updateServerNotificationSettings,
  getChannelNotificationSettings,
  updateChannelNotificationSettings,
  getUserNotificationSettings,
  updateUserNotificationSettings,
  muteUser,
  unmuteUser,
  isUserMuted,
  addKeywordFilter,
  updateKeywordFilter,
  removeKeywordFilter,
  getKeywordFilters,
  muteChannelInServer,
  unmuteChannelInServer,
  isChannelMutedInServer,
  shouldShowNotification,
  cleanupExpiredMutes,
  type GranularNotificationSettings,
  type ServerNotificationSettings,
  type ChannelNotificationSettings,
  type UserNotificationSettings,
  type KeywordFilter,
} from '../services/granularNotifications';

interface UseGranularNotificationsReturn {
  // State
  settings: GranularNotificationSettings | null;
  isLoading: boolean;
  error: string | null;

  // Server operations
  getServerSettings: (serverId: string) => Promise<ServerNotificationSettings | null>;
  updateServerSettings: (
    serverId: string,
    updates: Partial<Omit<ServerNotificationSettings, 'serverId'>>
  ) => Promise<void>;

  // Channel operations
  getChannelSettings: (channelId: string) => Promise<ChannelNotificationSettings | null>;
  updateChannelSettings: (
    channelId: string,
    serverId: string,
    updates: Partial<Omit<ChannelNotificationSettings, 'channelId' | 'serverId'>>
  ) => Promise<void>;
  muteChannel: (serverId: string, channelId: string) => Promise<void>;
  unmuteChannel: (serverId: string, channelId: string) => Promise<void>;
  isChannelMuted: (serverId: string, channelId: string) => Promise<boolean>;

  // User operations
  getUserSettings: (userId: string) => Promise<UserNotificationSettings | null>;
  updateUserSettings: (
    userId: string,
    updates: Partial<Omit<UserNotificationSettings, 'userId'>>
  ) => Promise<void>;
  muteUserTemp: (userId: string, duration?: number) => Promise<void>;
  unmuteUserPerm: (userId: string) => Promise<void>;
  checkUserMuted: (userId: string) => Promise<boolean>;

  // Keyword filter operations
  keywordFilters: KeywordFilter[];
  addFilter: (filter: Omit<KeywordFilter, 'id'>) => Promise<void>;
  updateFilter: (filterId: string, updates: Partial<Omit<KeywordFilter, 'id'>>) => Promise<void>;
  removeFilter: (filterId: string) => Promise<void>;
  refreshFilters: () => Promise<void>;

  // Notification permission checking
  checkNotificationPermission: (data: {
    type: string;
    serverId?: string;
    channelId?: string;
    userId?: string;
    content?: string;
    mentionsUser?: boolean;
    userRoles?: string[];
  }) => Promise<{
    allowed: boolean;
    priority: 'low' | 'normal' | 'high';
    reason?: string;
  }>;

  // Utility functions
  refresh: () => Promise<void>;
  cleanup: () => Promise<void>;
}

export function useGranularNotifications(): UseGranularNotificationsReturn {
  const [settings, setSettings] = useState<GranularNotificationSettings | null>(null);
  const [keywordFilters, setKeywordFilters] = useState<KeywordFilter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial settings
  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [granularSettings, filters] = await Promise.all([
        getGranularNotificationSettings(),
        getKeywordFilters(),
      ]);

      setSettings(granularSettings);
      setKeywordFilters(filters);

      // Cleanup expired mutes on load
      await cleanupExpiredMutes();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load notification settings';
      setError(errorMessage);
      console.error('Failed to load granular notification settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Server operations
  const getServerSettings = useCallback(async (serverId: string) => {
    try {
      return await getServerNotificationSettings(serverId);
    } catch (err) {
      console.error('Failed to get server settings:', err);
      throw err;
    }
  }, []);

  const updateServerSettings = useCallback(
    async (serverId: string, updates: Partial<Omit<ServerNotificationSettings, 'serverId'>>) => {
      try {
        await updateServerNotificationSettings(serverId, updates);
        await loadSettings(); // Refresh settings after update
      } catch (err) {
        console.error('Failed to update server settings:', err);
        throw err;
      }
    },
    [loadSettings]
  );

  // Channel operations
  const getChannelSettings = useCallback(async (channelId: string) => {
    try {
      return await getChannelNotificationSettings(channelId);
    } catch (err) {
      console.error('Failed to get channel settings:', err);
      throw err;
    }
  }, []);

  const updateChannelSettings = useCallback(
    async (
      channelId: string,
      serverId: string,
      updates: Partial<Omit<ChannelNotificationSettings, 'channelId' | 'serverId'>>
    ) => {
      try {
        await updateChannelNotificationSettings(channelId, serverId, updates);
        await loadSettings(); // Refresh settings after update
      } catch (err) {
        console.error('Failed to update channel settings:', err);
        throw err;
      }
    },
    [loadSettings]
  );

  const muteChannel = useCallback(
    async (serverId: string, channelId: string) => {
      try {
        await muteChannelInServer(serverId, channelId);
        await loadSettings();
      } catch (err) {
        console.error('Failed to mute channel:', err);
        throw err;
      }
    },
    [loadSettings]
  );

  const unmuteChannel = useCallback(
    async (serverId: string, channelId: string) => {
      try {
        await unmuteChannelInServer(serverId, channelId);
        await loadSettings();
      } catch (err) {
        console.error('Failed to unmute channel:', err);
        throw err;
      }
    },
    [loadSettings]
  );

  const isChannelMuted = useCallback(async (serverId: string, channelId: string) => {
    try {
      return await isChannelMutedInServer(serverId, channelId);
    } catch (err) {
      console.error('Failed to check channel mute status:', err);
      return false;
    }
  }, []);

  // User operations
  const getUserSettings = useCallback(async (userId: string) => {
    try {
      return await getUserNotificationSettings(userId);
    } catch (err) {
      console.error('Failed to get user settings:', err);
      throw err;
    }
  }, []);

  const updateUserSettings = useCallback(
    async (userId: string, updates: Partial<Omit<UserNotificationSettings, 'userId'>>) => {
      try {
        await updateUserNotificationSettings(userId, updates);
        await loadSettings();
      } catch (err) {
        console.error('Failed to update user settings:', err);
        throw err;
      }
    },
    [loadSettings]
  );

  const muteUserTemp = useCallback(
    async (userId: string, duration?: number) => {
      try {
        await muteUser(userId, duration);
        await loadSettings();
      } catch (err) {
        console.error('Failed to mute user:', err);
        throw err;
      }
    },
    [loadSettings]
  );

  const unmuteUserPerm = useCallback(
    async (userId: string) => {
      try {
        await unmuteUser(userId);
        await loadSettings();
      } catch (err) {
        console.error('Failed to unmute user:', err);
        throw err;
      }
    },
    [loadSettings]
  );

  const checkUserMuted = useCallback(async (userId: string) => {
    try {
      return await isUserMuted(userId);
    } catch (err) {
      console.error('Failed to check user mute status:', err);
      return false;
    }
  }, []);

  // Keyword filter operations
  const addFilter = useCallback(
    async (filter: Omit<KeywordFilter, 'id'>) => {
      try {
        await addKeywordFilter(filter);
        await refreshFilters();
      } catch (err) {
        console.error('Failed to add keyword filter:', err);
        throw err;
      }
    },
    []
  );

  const updateFilter = useCallback(
    async (filterId: string, updates: Partial<Omit<KeywordFilter, 'id'>>) => {
      try {
        await updateKeywordFilter(filterId, updates);
        await refreshFilters();
      } catch (err) {
        console.error('Failed to update keyword filter:', err);
        throw err;
      }
    },
    []
  );

  const removeFilter = useCallback(async (filterId: string) => {
    try {
      await removeKeywordFilter(filterId);
      await refreshFilters();
    } catch (err) {
      console.error('Failed to remove keyword filter:', err);
      throw err;
    }
  }, []);

  const refreshFilters = useCallback(async () => {
    try {
      const filters = await getKeywordFilters();
      setKeywordFilters(filters);
    } catch (err) {
      console.error('Failed to refresh keyword filters:', err);
    }
  }, []);

  // Notification permission checking
  const checkNotificationPermission = useCallback(
    async (data: {
      type: string;
      serverId?: string;
      channelId?: string;
      userId?: string;
      content?: string;
      mentionsUser?: boolean;
      userRoles?: string[];
    }) => {
      try {
        return await shouldShowNotification(data);
      } catch (err) {
        console.error('Failed to check notification permission:', err);
        return { allowed: true, priority: 'normal' as const };
      }
    },
    []
  );

  // Utility functions
  const refresh = useCallback(async () => {
    await loadSettings();
  }, [loadSettings]);

  const cleanup = useCallback(async () => {
    try {
      await cleanupExpiredMutes();
      await loadSettings();
    } catch (err) {
      console.error('Failed to cleanup expired mutes:', err);
    }
  }, [loadSettings]);

  return {
    // State
    settings,
    isLoading,
    error,

    // Server operations
    getServerSettings,
    updateServerSettings,

    // Channel operations
    getChannelSettings,
    updateChannelSettings,
    muteChannel,
    unmuteChannel,
    isChannelMuted,

    // User operations
    getUserSettings,
    updateUserSettings,
    muteUserTemp,
    unmuteUserPerm,
    checkUserMuted,

    // Keyword filter operations
    keywordFilters,
    addFilter,
    updateFilter,
    removeFilter,
    refreshFilters,

    // Notification permission checking
    checkNotificationPermission,

    // Utility functions
    refresh,
    cleanup,
  };
}

export default useGranularNotifications;