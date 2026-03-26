/**
 * Quick Actions Service
 * Provides home screen shortcuts for iOS (3D Touch / Haptic Touch) and Android.
 *
 * Static shortcuts are defined in app config and available immediately.
 * Dynamic shortcuts are created based on user activity (recent chats, servers).
 */

/* eslint-disable no-undef */
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { triggerHaptic } from "./haptics";

// ============================================================================
// Types
// ============================================================================

export interface QuickAction {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  iconType?: "system" | "asset" | "shortcut";
  data?: Record<string, string>;
  order?: number;
}

export interface RecentChat {
  id: string;
  name: string;
  avatarUrl?: string;
  type: "dm" | "channel";
  serverId?: string;
  lastMessageAt: number;
}

export interface RecentServer {
  id: string;
  name: string;
  iconUrl?: string;
  lastVisitedAt: number;
}

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  RECENT_CHATS: "@hearth/quick_actions/recent_chats",
  RECENT_SERVERS: "@hearth/quick_actions/recent_servers",
  PINNED_SHORTCUTS: "@hearth/quick_actions/pinned",
};

// ============================================================================
// Static Shortcuts (defined in app config, always available)
// ============================================================================

export const STATIC_SHORTCUTS: QuickAction[] = [
  {
    id: "new_message",
    title: "New Message",
    subtitle: "Start a conversation",
    icon: "compose", // iOS SF Symbol / Android drawable
    iconType: "system",
    order: 0,
  },
  {
    id: "search",
    title: "Search",
    subtitle: "Find messages, servers, people",
    icon: "magnifyingglass",
    iconType: "system",
    order: 1,
  },
  {
    id: "join_server",
    title: "Join Server",
    subtitle: "Enter an invite code",
    icon: "plus.circle",
    iconType: "system",
    order: 2,
  },
];

// ============================================================================
// Maximum Dynamic Shortcuts
// iOS supports 4 total shortcuts, Android supports 4-5 depending on launcher
// ============================================================================

const MAX_DYNAMIC_SHORTCUTS = {
  ios: 4,
  android: 4,
  default: 4,
};

const MAX_RECENT_ITEMS = 3; // Reserve 1 slot for static action

// ============================================================================
// Quick Actions Service
// ============================================================================

class QuickActionsService {
  private recentChats: RecentChat[] = [];
  private recentServers: RecentServer[] = [];
  private pinnedShortcuts: QuickAction[] = [];
  private initialized = false;

  /**
   * Initialize the quick actions service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load persisted data
      const [chatsJson, serversJson, pinnedJson] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.RECENT_CHATS),
        AsyncStorage.getItem(STORAGE_KEYS.RECENT_SERVERS),
        AsyncStorage.getItem(STORAGE_KEYS.PINNED_SHORTCUTS),
      ]);

      if (chatsJson) {
        this.recentChats = JSON.parse(chatsJson);
      }
      if (serversJson) {
        this.recentServers = JSON.parse(serversJson);
      }
      if (pinnedJson) {
        this.pinnedShortcuts = JSON.parse(pinnedJson);
      }

      // Update native shortcuts
      await this.syncNativeShortcuts();

      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize quick actions:", error);
    }
  }

  /**
   * Track a chat visit for dynamic shortcuts
   */
  async trackChatVisit(chat: Omit<RecentChat, "lastMessageAt">): Promise<void> {
    const existingIndex = this.recentChats.findIndex((c) => c.id === chat.id);

    const updatedChat: RecentChat = {
      ...chat,
      lastMessageAt: Date.now(),
    };

    if (existingIndex >= 0) {
      // Move to front and update timestamp
      this.recentChats.splice(existingIndex, 1);
    }

    this.recentChats.unshift(updatedChat);

    // Keep only recent items
    this.recentChats = this.recentChats.slice(0, MAX_RECENT_ITEMS * 2);

    await this.persist();
    await this.syncNativeShortcuts();
  }

  /**
   * Track a server visit for dynamic shortcuts
   */
  async trackServerVisit(server: Omit<RecentServer, "lastVisitedAt">): Promise<void> {
    const existingIndex = this.recentServers.findIndex((s) => s.id === server.id);

    const updatedServer: RecentServer = {
      ...server,
      lastVisitedAt: Date.now(),
    };

    if (existingIndex >= 0) {
      this.recentServers.splice(existingIndex, 1);
    }

    this.recentServers.unshift(updatedServer);
    this.recentServers = this.recentServers.slice(0, MAX_RECENT_ITEMS * 2);

    await this.persist();
    await this.syncNativeShortcuts();
  }

  /**
   * Pin a shortcut to always appear in quick actions
   */
  async pinShortcut(shortcut: QuickAction): Promise<void> {
    const existingIndex = this.pinnedShortcuts.findIndex((s) => s.id === shortcut.id);

    if (existingIndex >= 0) {
      this.pinnedShortcuts[existingIndex] = shortcut;
    } else {
      this.pinnedShortcuts.push(shortcut);
    }

    // Limit pinned shortcuts
    this.pinnedShortcuts = this.pinnedShortcuts.slice(0, 2);

    await this.persist();
    await this.syncNativeShortcuts();
  }

  /**
   * Unpin a shortcut
   */
  async unpinShortcut(shortcutId: string): Promise<void> {
    this.pinnedShortcuts = this.pinnedShortcuts.filter((s) => s.id !== shortcutId);

    await this.persist();
    await this.syncNativeShortcuts();
  }

  /**
   * Handle a quick action being triggered
   */
  async handleQuickAction(actionId: string, data?: Record<string, string>): Promise<void> {
    // Trigger haptic feedback
    await triggerHaptic("selection");

    // Handle static actions
    switch (actionId) {
      case "new_message":
        router.push("/(tabs)/dms");
        // Could open a compose modal
        return;

      case "search":
        router.push("/search");
        return;

      case "join_server":
        router.push("/server/create");
        return;
    }

    // Handle dynamic actions (recent chats/servers)
    if (actionId.startsWith("chat_") && data?.chatId) {
      router.push({
        pathname: "/chat/[id]",
        params: { id: data.chatId },
      });
      return;
    }

    if (actionId.startsWith("server_") && data?.serverId) {
      router.push({
        pathname: "/server/[serverId]/activity",
        params: { serverId: data.serverId },
      });
      return;
    }

    console.warn("Unknown quick action:", actionId);
  }

  /**
   * Get all current shortcuts (for debugging/display)
   */
  getCurrentShortcuts(): QuickAction[] {
    return this.buildShortcutList();
  }

  /**
   * Clear all dynamic shortcuts
   */
  async clearDynamicShortcuts(): Promise<void> {
    this.recentChats = [];
    this.recentServers = [];
    this.pinnedShortcuts = [];

    await this.persist();
    await this.syncNativeShortcuts();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Build the list of shortcuts to display
   */
  private buildShortcutList(): QuickAction[] {
    const maxShortcuts =
      MAX_DYNAMIC_SHORTCUTS[Platform.OS as keyof typeof MAX_DYNAMIC_SHORTCUTS] ||
      MAX_DYNAMIC_SHORTCUTS.default;

    const shortcuts: QuickAction[] = [];

    // 1. Add pinned shortcuts first
    shortcuts.push(...this.pinnedShortcuts.slice(0, 1));

    // 2. Add recent chats
    const recentChatShortcuts = this.recentChats
      .slice(0, MAX_RECENT_ITEMS - shortcuts.length)
      .map(
        (chat, index): QuickAction => ({
          id: `chat_${chat.id}`,
          title: chat.name,
          subtitle: chat.type === "dm" ? "Direct Message" : "Channel",
          icon: chat.type === "dm" ? "person.fill" : "number",
          iconType: "system",
          data: { chatId: chat.id, serverId: chat.serverId || "" },
          order: 10 + index,
        })
      );

    shortcuts.push(...recentChatShortcuts);

    // 3. Add one static action if there's room
    if (shortcuts.length < maxShortcuts) {
      shortcuts.push(STATIC_SHORTCUTS[0]); // "New Message"
    }

    // Ensure we don't exceed max
    return shortcuts.slice(0, maxShortcuts);
  }

  /**
   * Sync shortcuts to native layer
   */
  private async syncNativeShortcuts(): Promise<void> {
    const shortcuts = this.buildShortcutList();

    // Note: This requires a native module. In a real implementation,
    // you would use a library like react-native-quick-actions or
    // implement a native module for expo-quick-actions.
    //
    // For Expo managed workflow, this would need expo-quick-actions
    // (not yet available) or a config plugin.

    if (__DEV__) {
      console.log("Quick Actions updated:", shortcuts);
    }

    // Platform-specific implementations would go here:
    if (Platform.OS === "ios") {
      await this.syncIOSShortcuts(shortcuts);
    } else if (Platform.OS === "android") {
      await this.syncAndroidShortcuts(shortcuts);
    }
  }

  /**
   * Sync shortcuts on iOS
   */
  private async syncIOSShortcuts(shortcuts: QuickAction[]): Promise<void> {
    // iOS implementation using UIApplicationShortcutItem
    // This requires a native module or config plugin

    // In a real implementation:
    // const { QuickActionsModule } = NativeModules;
    // await QuickActionsModule?.setShortcuts(shortcuts);

    // For now, we'll just log in dev
    if (__DEV__) {
      console.log("iOS shortcuts:", shortcuts.map((s) => s.title).join(", "));
    }
  }

  /**
   * Sync shortcuts on Android
   */
  private async syncAndroidShortcuts(shortcuts: QuickAction[]): Promise<void> {
    // Android implementation using ShortcutManager
    // This requires a native module or config plugin

    // In a real implementation:
    // const { QuickActionsModule } = NativeModules;
    // await QuickActionsModule?.setDynamicShortcuts(shortcuts);

    if (__DEV__) {
      console.log("Android shortcuts:", shortcuts.map((s) => s.title).join(", "));
    }
  }

  /**
   * Persist state to storage
   */
  private async persist(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(
          STORAGE_KEYS.RECENT_CHATS,
          JSON.stringify(this.recentChats)
        ),
        AsyncStorage.setItem(
          STORAGE_KEYS.RECENT_SERVERS,
          JSON.stringify(this.recentServers)
        ),
        AsyncStorage.setItem(
          STORAGE_KEYS.PINNED_SHORTCUTS,
          JSON.stringify(this.pinnedShortcuts)
        ),
      ]);
    } catch (error) {
      console.error("Failed to persist quick actions:", error);
    }
  }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const quickActionsService = new QuickActionsService();

// ============================================================================
// Expo Config Plugin Shortcuts (for static shortcuts in app.json)
// ============================================================================

/**
 * Static shortcuts configuration for app.json/app.config.js
 * These are compiled into the native app and always available.
 */
export const staticShortcutsConfig = {
  ios: {
    UIApplicationShortcutItems: [
      {
        UIApplicationShortcutItemType: "io.hearth.mobile.new_message",
        UIApplicationShortcutItemTitle: "New Message",
        UIApplicationShortcutItemSubtitle: "Start a conversation",
        UIApplicationShortcutItemIconType: "UIApplicationShortcutIconTypeCompose",
      },
      {
        UIApplicationShortcutItemType: "io.hearth.mobile.search",
        UIApplicationShortcutItemTitle: "Search",
        UIApplicationShortcutItemSubtitle: "Find messages & people",
        UIApplicationShortcutItemIconType: "UIApplicationShortcutIconTypeSearch",
      },
    ],
  },
  android: {
    shortcuts: [
      {
        id: "new_message",
        shortLabel: "New Message",
        longLabel: "Start a conversation",
        icon: "compose",
        data: { action: "new_message" },
      },
      {
        id: "search",
        shortLabel: "Search",
        longLabel: "Find messages & people",
        icon: "search",
        data: { action: "search" },
      },
    ],
  },
};
