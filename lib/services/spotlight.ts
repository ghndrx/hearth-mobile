/**
 * Spotlight & Siri Shortcuts Service
 * Provides iOS Spotlight search indexing and Siri Shortcut donations.
 *
 * Features:
 * - Index servers, channels, and contacts for Spotlight search
 * - Donate user activities for Siri Shortcut suggestions
 * - Voice command integration via Siri
 * - Handoff support between devices
 */

/* eslint-disable no-undef */
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ============================================================================
// Types
// ============================================================================

/**
 * Searchable item for Spotlight indexing
 */
export interface SpotlightItem {
  uniqueIdentifier: string;
  domainIdentifier: string;
  title: string;
  contentDescription?: string;
  thumbnailUri?: string;
  keywords: string[];
  displayType?: "server" | "channel" | "contact" | "message";
  expirationDate?: Date;
  userActivityType?: string;
  userInfo?: Record<string, string>;
}

/**
 * User activity for Siri Shortcuts
 */
export interface UserActivity {
  activityType: string;
  title: string;
  invocationPhrase?: string;
  isEligibleForSearch?: boolean;
  isEligibleForPrediction?: boolean;
  isEligibleForHandoff?: boolean;
  userInfo?: Record<string, string>;
  keywords?: string[];
  contentAttributeSet?: SpotlightItem;
  webpageURL?: string;
}

/**
 * Siri Shortcut definition
 */
export interface SiriShortcut {
  activityType: string;
  title: string;
  invocationPhrase: string;
  persistentIdentifier: string;
  suggestedInvocationPhrase?: string;
}

// ============================================================================
// Domain Identifiers (for organizing Spotlight results)
// ============================================================================

export const DOMAIN_IDS = {
  SERVERS: "io.hearth.servers",
  CHANNELS: "io.hearth.channels",
  CONTACTS: "io.hearth.contacts",
  MESSAGES: "io.hearth.messages",
  DMS: "io.hearth.dms",
} as const;

// ============================================================================
// Activity Types (for Siri Shortcuts)
// ============================================================================

export const ACTIVITY_TYPES = {
  VIEW_SERVER: "io.hearth.mobile.view-server",
  VIEW_CHANNEL: "io.hearth.mobile.view-channel",
  SEND_MESSAGE: "io.hearth.mobile.send-message",
  START_CALL: "io.hearth.mobile.start-call",
  JOIN_VOICE: "io.hearth.mobile.join-voice",
  SEARCH: "io.hearth.mobile.search",
  VIEW_PROFILE: "io.hearth.mobile.view-profile",
} as const;

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  INDEXED_ITEMS: "@hearth/spotlight/indexed",
  DONATED_ACTIVITIES: "@hearth/spotlight/donated",
  SHORTCUT_PHRASES: "@hearth/spotlight/phrases",
};

// ============================================================================
// Spotlight Service
// ============================================================================

class SpotlightService {
  private indexedItems: Map<string, SpotlightItem> = new Map();
  private donatedActivities: Map<string, UserActivity> = new Map();
  private initialized = false;

  /**
   * Initialize the Spotlight service
   */
  async initialize(): Promise<void> {
    if (!this.isSupported() || this.initialized) return;

    try {
      const [itemsJson, activitiesJson] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.INDEXED_ITEMS),
        AsyncStorage.getItem(STORAGE_KEYS.DONATED_ACTIVITIES),
      ]);

      if (itemsJson) {
        const items = JSON.parse(itemsJson);
        this.indexedItems = new Map(Object.entries(items));
      }

      if (activitiesJson) {
        const activities = JSON.parse(activitiesJson);
        this.donatedActivities = new Map(Object.entries(activities));
      }

      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize Spotlight service:", error);
    }
  }

  /**
   * Check if Spotlight is supported (iOS only)
   */
  isSupported(): boolean {
    return Platform.OS === "ios";
  }

  // ============================================================================
  // Spotlight Indexing
  // ============================================================================

  /**
   * Index a server for Spotlight search
   */
  async indexServer(server: {
    id: string;
    name: string;
    description?: string;
    iconUrl?: string;
    memberCount?: number;
  }): Promise<void> {
    const item: SpotlightItem = {
      uniqueIdentifier: `server_${server.id}`,
      domainIdentifier: DOMAIN_IDS.SERVERS,
      title: server.name,
      contentDescription: server.description || `Hearth server with ${server.memberCount || 0} members`,
      thumbnailUri: server.iconUrl,
      keywords: [
        server.name,
        "server",
        "hearth",
        "chat",
        ...server.name.toLowerCase().split(/\s+/),
      ],
      displayType: "server",
      userActivityType: ACTIVITY_TYPES.VIEW_SERVER,
      userInfo: { serverId: server.id },
    };

    await this.indexItem(item);
  }

  /**
   * Index a channel for Spotlight search
   */
  async indexChannel(channel: {
    id: string;
    name: string;
    serverId: string;
    serverName: string;
    type: "text" | "voice" | "announcement";
    topic?: string;
  }): Promise<void> {
    const item: SpotlightItem = {
      uniqueIdentifier: `channel_${channel.id}`,
      domainIdentifier: DOMAIN_IDS.CHANNELS,
      title: `#${channel.name}`,
      contentDescription: channel.topic || `${channel.type} channel in ${channel.serverName}`,
      keywords: [
        channel.name,
        channel.serverName,
        channel.type,
        "channel",
        "hearth",
      ],
      displayType: "channel",
      userActivityType: ACTIVITY_TYPES.VIEW_CHANNEL,
      userInfo: {
        channelId: channel.id,
        serverId: channel.serverId,
      },
    };

    await this.indexItem(item);
  }

  /**
   * Index a contact (user) for Spotlight search
   */
  async indexContact(contact: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    status?: string;
  }): Promise<void> {
    const name = contact.displayName || contact.username;

    const item: SpotlightItem = {
      uniqueIdentifier: `contact_${contact.id}`,
      domainIdentifier: DOMAIN_IDS.CONTACTS,
      title: name,
      contentDescription: `@${contact.username}${contact.status ? ` • ${contact.status}` : ""}`,
      thumbnailUri: contact.avatarUrl,
      keywords: [
        name,
        contact.username,
        "contact",
        "friend",
        "user",
        "hearth",
      ],
      displayType: "contact",
      userActivityType: ACTIVITY_TYPES.VIEW_PROFILE,
      userInfo: { userId: contact.id },
    };

    await this.indexItem(item);
  }

  /**
   * Index a DM conversation for Spotlight search
   */
  async indexDM(dm: {
    id: string;
    participantName: string;
    participantAvatar?: string;
    lastMessage?: string;
  }): Promise<void> {
    const item: SpotlightItem = {
      uniqueIdentifier: `dm_${dm.id}`,
      domainIdentifier: DOMAIN_IDS.DMS,
      title: dm.participantName,
      contentDescription: dm.lastMessage || "Direct message",
      thumbnailUri: dm.participantAvatar,
      keywords: [
        dm.participantName,
        "message",
        "dm",
        "direct",
        "chat",
        "hearth",
      ],
      displayType: "contact",
      userActivityType: ACTIVITY_TYPES.SEND_MESSAGE,
      userInfo: { dmId: dm.id },
    };

    await this.indexItem(item);
  }

  /**
   * Index a single item
   */
  private async indexItem(item: SpotlightItem): Promise<void> {
    if (!this.isSupported()) return;

    this.indexedItems.set(item.uniqueIdentifier, item);
    await this.persistIndexedItems();

    // In a real implementation, call the native module:
    // await NativeModules.SpotlightModule?.indexItem(item);

    if (__DEV__) {
      console.log("Spotlight indexed:", item.title);
    }
  }

  /**
   * Remove an item from the index
   */
  async removeFromIndex(uniqueIdentifier: string): Promise<void> {
    if (!this.isSupported()) return;

    this.indexedItems.delete(uniqueIdentifier);
    await this.persistIndexedItems();

    // await NativeModules.SpotlightModule?.removeItem(uniqueIdentifier);
  }

  /**
   * Remove all items in a domain
   */
  async removeAllInDomain(domainIdentifier: string): Promise<void> {
    if (!this.isSupported()) return;

    Array.from(this.indexedItems.entries()).forEach(([id, item]) => {
      if (item.domainIdentifier === domainIdentifier) {
        this.indexedItems.delete(id);
      }
    });

    await this.persistIndexedItems();
    // await NativeModules.SpotlightModule?.removeAllInDomain(domainIdentifier);
  }

  /**
   * Clear entire Spotlight index
   */
  async clearIndex(): Promise<void> {
    if (!this.isSupported()) return;

    this.indexedItems.clear();
    await this.persistIndexedItems();
    // await NativeModules.SpotlightModule?.clearIndex();
  }

  // ============================================================================
  // Siri Shortcuts / User Activities
  // ============================================================================

  /**
   * Donate a user activity for Siri Shortcut suggestions
   */
  async donateActivity(activity: UserActivity): Promise<void> {
    if (!this.isSupported()) return;

    this.donatedActivities.set(activity.activityType, activity);
    await this.persistDonatedActivities();

    // In a real implementation:
    // await NativeModules.SiriShortcutsModule?.donateActivity(activity);

    if (__DEV__) {
      console.log("Siri activity donated:", activity.title);
    }
  }

  /**
   * Donate viewing a server
   */
  async donateViewServer(server: {
    id: string;
    name: string;
  }): Promise<void> {
    await this.donateActivity({
      activityType: ACTIVITY_TYPES.VIEW_SERVER,
      title: `Open ${server.name}`,
      invocationPhrase: `Open ${server.name}`,
      isEligibleForSearch: true,
      isEligibleForPrediction: true,
      isEligibleForHandoff: true,
      userInfo: { serverId: server.id },
      keywords: [server.name, "server", "open"],
    });
  }

  /**
   * Donate sending a message
   */
  async donateSendMessage(recipient: {
    id: string;
    name: string;
    type: "user" | "channel";
  }): Promise<void> {
    const title = recipient.type === "user"
      ? `Message ${recipient.name}`
      : `Send to ${recipient.name}`;

    await this.donateActivity({
      activityType: ACTIVITY_TYPES.SEND_MESSAGE,
      title,
      invocationPhrase: title,
      isEligibleForSearch: true,
      isEligibleForPrediction: true,
      userInfo: {
        recipientId: recipient.id,
        recipientType: recipient.type,
      },
      keywords: [recipient.name, "message", "send", "chat"],
    });
  }

  /**
   * Donate joining a voice channel
   */
  async donateJoinVoice(channel: {
    id: string;
    name: string;
    serverName: string;
  }): Promise<void> {
    await this.donateActivity({
      activityType: ACTIVITY_TYPES.JOIN_VOICE,
      title: `Join ${channel.name} voice`,
      invocationPhrase: `Join ${channel.name} voice chat`,
      isEligibleForSearch: true,
      isEligibleForPrediction: true,
      userInfo: {
        channelId: channel.id,
      },
      keywords: [channel.name, channel.serverName, "voice", "call", "join"],
    });
  }

  /**
   * Get suggested invocation phrases for a shortcut
   */
  getSuggestedPhrases(activityType: string, context: { name?: string }): string[] {
    const phrases: string[] = [];
    const name = context.name || "";

    switch (activityType) {
      case ACTIVITY_TYPES.VIEW_SERVER:
        phrases.push(`Open ${name}`, `Go to ${name}`, `Show me ${name}`);
        break;
      case ACTIVITY_TYPES.SEND_MESSAGE:
        phrases.push(`Message ${name}`, `Text ${name}`, `Send to ${name}`);
        break;
      case ACTIVITY_TYPES.JOIN_VOICE:
        phrases.push(`Join ${name} voice`, `Call ${name}`, `Start voice in ${name}`);
        break;
      case ACTIVITY_TYPES.SEARCH:
        phrases.push("Search Hearth", "Find messages", "Look up");
        break;
    }

    return phrases;
  }

  /**
   * Add a shortcut to Siri
   */
  async addSiriShortcut(shortcut: SiriShortcut): Promise<void> {
    if (!this.isSupported()) return;

    // In a real implementation, this would present the Siri shortcut
    // addition UI using INUIAddVoiceShortcutViewController

    // await NativeModules.SiriShortcutsModule?.presentAddShortcut(shortcut);

    if (__DEV__) {
      console.log("Add Siri shortcut:", shortcut.title, "->", shortcut.invocationPhrase);
    }
  }

  // ============================================================================
  // Handoff Support
  // ============================================================================

  /**
   * Begin a Handoff activity
   */
  async beginHandoff(_activity: {
    type: string;
    title: string;
    userInfo: Record<string, string>;
    webpageURL?: string;
  }): Promise<void> {
    if (!this.isSupported()) return;

    // TODO: Implement native module
    // await NativeModules.HandoffModule?.beginActivity({
    //   activityType: _activity.type,
    //   title: _activity.title,
    //   userInfo: _activity.userInfo,
    //   webpageURL: activity.webpageURL,
    //   isEligibleForHandoff: true,
    // });
  }

  /**
   * End the current Handoff activity
   */
  async endHandoff(): Promise<void> {
    if (!this.isSupported()) return;
    // await NativeModules.HandoffModule?.endCurrentActivity();
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  private async persistIndexedItems(): Promise<void> {
    try {
      const obj = Object.fromEntries(this.indexedItems);
      await AsyncStorage.setItem(STORAGE_KEYS.INDEXED_ITEMS, JSON.stringify(obj));
    } catch (error) {
      console.error("Failed to persist indexed items:", error);
    }
  }

  private async persistDonatedActivities(): Promise<void> {
    try {
      const obj = Object.fromEntries(this.donatedActivities);
      await AsyncStorage.setItem(STORAGE_KEYS.DONATED_ACTIVITIES, JSON.stringify(obj));
    } catch (error) {
      console.error("Failed to persist donated activities:", error);
    }
  }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const spotlightService = new SpotlightService();

// ============================================================================
// React Hook
// ============================================================================

import { useEffect } from "react";

/**
 * Hook to donate a user activity when a screen is viewed
 */
export function useSpotlightActivity(
  activityType: string,
  options: {
    title: string;
    userInfo?: Record<string, string>;
    enabled?: boolean;
  }
): void {
  useEffect(() => {
    if (options.enabled === false) return;
    if (!spotlightService.isSupported()) return;

    spotlightService.donateActivity({
      activityType,
      title: options.title,
      isEligibleForSearch: true,
      isEligibleForPrediction: true,
      userInfo: options.userInfo,
    });
  }, [activityType, options.title, options.enabled]);
}
