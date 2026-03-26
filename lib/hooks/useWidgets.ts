import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchUnreadMessages,
  fetchMentions,
  fetchDirectMessages,
  refreshAllWidgets,
  getWidgetConfigs,
} from "../services/widgets";
import type {
  WidgetConfig,
  UnreadMessagesData,
  MentionsData,
  DirectMessagesData,
} from "../types/widgets";

interface WidgetState {
  unreadMessages: UnreadMessagesData | null;
  mentions: MentionsData | null;
  directMessages: DirectMessagesData | null;
  configs: WidgetConfig[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
}

export function useWidgets() {
  const [state, setState] = useState<WidgetState>({
    unreadMessages: null,
    mentions: null,
    directMessages: null,
    configs: [],
    isLoading: true,
    isRefreshing: false,
    error: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [unread, mentions, dms, configs] = await Promise.all([
        fetchUnreadMessages(),
        fetchMentions(),
        fetchDirectMessages(),
        getWidgetConfigs(),
      ]);

      setState((prev) => ({
        ...prev,
        unreadMessages: unread,
        mentions,
        directMessages: dms,
        configs,
        isLoading: false,
        error: null,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to load widgets",
      }));
    }
  }, []);

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, isRefreshing: true }));
    try {
      await refreshAllWidgets();
      await loadData();
    } finally {
      setState((prev) => ({ ...prev, isRefreshing: false }));
    }
  }, [loadData]);

  const refreshSingle = useCallback(
    async (type: "unread_messages" | "mentions" | "direct_messages") => {
      try {
        switch (type) {
          case "unread_messages": {
            const data = await fetchUnreadMessages();
            setState((prev) => ({ ...prev, unreadMessages: data }));
            break;
          }
          case "mentions": {
            const data = await fetchMentions();
            setState((prev) => ({ ...prev, mentions: data }));
            break;
          }
          case "direct_messages": {
            const data = await fetchDirectMessages();
            setState((prev) => ({ ...prev, directMessages: data }));
            break;
          }
        }
      } catch {
        // Individual widget refresh failure is non-critical
      }
    },
    []
  );

  useEffect(() => {
    loadData();

    // Auto-refresh every 5 minutes
    intervalRef.current = setInterval(loadData, 5 * 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadData]);

  return {
    ...state,
    refresh,
    refreshSingle,
  };
}
