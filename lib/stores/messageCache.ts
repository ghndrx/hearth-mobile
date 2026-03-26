/**
 * Message Cache Store
 * Caches received messages locally for offline reading using AsyncStorage
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Message } from "../types";

/** Maximum messages cached per channel */
const MAX_MESSAGES_PER_CHANNEL = 100;

/** Maximum number of channels to cache */
const MAX_CACHED_CHANNELS = 50;

interface ChannelCache {
  messages: Message[];
  lastFetchedAt: number;
}

interface MessageCacheState {
  /** Cached messages keyed by channel ID */
  channels: Record<string, ChannelCache>;

  /** Cache messages for a channel (merges with existing) */
  cacheMessages: (channelId: string, messages: Message[]) => void;
  /** Add a single message to a channel cache */
  addMessage: (channelId: string, message: Message) => void;
  /** Get cached messages for a channel */
  getMessages: (channelId: string) => Message[];
  /** Get the latest message timestamp for a channel (for sync) */
  getLastMessageTimestamp: (channelId: string) => string | null;
  /** Clear cache for a specific channel */
  clearChannel: (channelId: string) => void;
  /** Clear all cached messages */
  clearAll: () => void;
}

export const useMessageCacheStore = create<MessageCacheState>()(
  persist(
    (set, get) => ({
      channels: {},

      cacheMessages: (channelId, messages) => {
        set((state) => {
          const existing = state.channels[channelId]?.messages ?? [];

          // Merge: deduplicate by ID, keep newest
          const messageMap = new Map<string, Message>();
          for (const msg of existing) {
            messageMap.set(msg.id, msg);
          }
          for (const msg of messages) {
            messageMap.set(msg.id, msg);
          }

          // Sort by createdAt and trim to limit
          const merged = Array.from(messageMap.values())
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
            .slice(-MAX_MESSAGES_PER_CHANNEL);

          // Evict oldest channels if at capacity
          const channelIds = Object.keys(state.channels);
          const updatedChannels = { ...state.channels };
          if (
            !updatedChannels[channelId] &&
            channelIds.length >= MAX_CACHED_CHANNELS
          ) {
            // Remove least recently fetched channel
            let oldestId = channelIds[0];
            let oldestTime = Infinity;
            for (const id of channelIds) {
              const cache = updatedChannels[id];
              if (cache && cache.lastFetchedAt < oldestTime) {
                oldestTime = cache.lastFetchedAt;
                oldestId = id;
              }
            }
            delete updatedChannels[oldestId];
          }

          updatedChannels[channelId] = {
            messages: merged,
            lastFetchedAt: Date.now(),
          };

          return { channels: updatedChannels };
        });
      },

      addMessage: (channelId, message) => {
        set((state) => {
          const existing = state.channels[channelId]?.messages ?? [];

          // Don't add duplicate
          if (existing.some((m) => m.id === message.id)) {
            return state;
          }

          const updated = [...existing, message]
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
            .slice(-MAX_MESSAGES_PER_CHANNEL);

          return {
            channels: {
              ...state.channels,
              [channelId]: {
                messages: updated,
                lastFetchedAt:
                  state.channels[channelId]?.lastFetchedAt ?? Date.now(),
              },
            },
          };
        });
      },

      getMessages: (channelId) => {
        return get().channels[channelId]?.messages ?? [];
      },

      getLastMessageTimestamp: (channelId) => {
        const messages = get().channels[channelId]?.messages;
        if (!messages || messages.length === 0) return null;
        return messages[messages.length - 1].createdAt;
      },

      clearChannel: (channelId) => {
        set((state) => {
          const { [channelId]: _, ...rest } = state.channels;
          return { channels: rest };
        });
      },

      clearAll: () => {
        set({ channels: {} });
      },
    }),
    {
      name: "hearth-message-cache",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useMessageCacheStore;
