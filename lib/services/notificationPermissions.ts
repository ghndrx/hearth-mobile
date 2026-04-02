import AsyncStorage from "@react-native-async-storage/async-storage";
import { NotificationType, Server, User } from "../types";

const PERMISSION_SETTINGS_KEY = "@hearth/notification_permissions";
const SERVER_SETTINGS_KEY = "@hearth/server_notification_settings";
const PRIORITY_CONTACTS_KEY = "@hearth/priority_contacts";
const CUSTOM_SOUNDS_KEY = "@hearth/custom_notification_sounds";

// Granular permission levels for different notification types
export type PermissionLevel = "all" | "mentions_only" | "dm_only" | "none";

// Custom notification sound options
export interface NotificationSound {
  id: string;
  name: string;
  filename: string;
  duration: number; // in milliseconds
  isDefault?: boolean;
}

// Custom vibration patterns
export interface VibrationPattern {
  id: string;
  name: string;
  pattern: number[]; // [wait, vibrate, wait, vibrate, ...]
  isDefault?: boolean;
}

// Per-server notification settings
export interface ServerNotificationSettings {
  serverId: string;
  serverName: string;
  enabled: boolean;
  messagePermission: PermissionLevel;
  mentionPermission: PermissionLevel;
  voiceChannelNotifications: boolean;
  serverEventNotifications: boolean;
  customSound?: string; // sound ID
  customVibration?: string; // vibration pattern ID
  quietHoursOverride: boolean; // Can override global quiet hours
  lastUpdated: number;
}

// Priority contact configuration
export interface PriorityContact {
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  priority: "high" | "urgent"; // urgent can bypass DND/quiet hours
  notificationOverrides: {
    alwaysNotify: boolean;
    customSound?: string;
    customVibration?: string;
    bypassQuietHours: boolean;
    bypassDoNotDisturb: boolean;
  };
  addedAt: number;
}

// Enhanced notification permissions
export interface NotificationPermissions {
  // Global permission levels
  directMessagePermission: PermissionLevel;
  serverMessagePermission: PermissionLevel;
  mentionPermission: PermissionLevel;
  replyPermission: PermissionLevel;
  friendRequestPermission: PermissionLevel;
  callPermission: PermissionLevel;
  systemPermission: PermissionLevel;

  // Content filtering
  showSenderNames: boolean;
  showMessagePreviews: boolean;
  showServerNames: boolean;
  showChannelNames: boolean;
  maxPreviewLength: number;

  // Smart notification features
  intelligentFiltering: boolean;
  smartBatching: boolean;
  contextAwareDelivery: boolean;
  adaptiveScheduling: boolean;

  // Advanced permission controls
  allowNotificationActions: boolean; // Quick reply, mark as read, etc.
  allowRichMedia: boolean; // Images, videos in notifications
  allowInlineReplies: boolean;
  allowNotificationHistory: boolean;

  // Privacy settings
  hideContentInLockScreen: boolean;
  hideNotificationsFromOtherApps: boolean; // When Hearth is active
  requireBiometricForSensitive: boolean;

  lastUpdated: number;
}

// Default sound and vibration patterns
export const DEFAULT_SOUNDS: NotificationSound[] = [
  { id: "default", name: "Default", filename: "default", duration: 2000, isDefault: true },
  { id: "soft", name: "Soft Chime", filename: "soft_chime", duration: 1500 },
  { id: "ping", name: "Ping", filename: "ping", duration: 500 },
  { id: "notification", name: "Notification", filename: "notification", duration: 1000 },
  { id: "message", name: "Message", filename: "message", duration: 800 },
  { id: "mention", name: "Mention", filename: "mention", duration: 1200 },
  { id: "call", name: "Call", filename: "call", duration: 3000 },
  { id: "urgent", name: "Urgent", filename: "urgent", duration: 2500 },
  { id: "whistle", name: "Whistle", filename: "whistle", duration: 1800 },
  { id: "bell", name: "Bell", filename: "bell", duration: 2200 },
  { id: "chime", name: "Chime", filename: "chime", duration: 1600 },
  { id: "alert", name: "Alert", filename: "alert", duration: 2800 },
];

export const DEFAULT_VIBRATION_PATTERNS: VibrationPattern[] = [
  { id: "default", name: "Default", pattern: [0, 250, 250, 250], isDefault: true },
  { id: "short", name: "Short", pattern: [0, 100] },
  { id: "double", name: "Double Tap", pattern: [0, 100, 100, 100] },
  { id: "triple", name: "Triple Tap", pattern: [0, 100, 100, 100, 100, 100] },
  { id: "long", name: "Long", pattern: [0, 500] },
  { id: "urgent", name: "Urgent", pattern: [0, 100, 50, 100, 50, 100, 50, 500] },
  { id: "heartbeat", name: "Heartbeat", pattern: [0, 100, 100, 100, 100, 500] },
  { id: "sos", name: "SOS", pattern: [0, 100, 100, 100, 100, 100, 200, 500, 200, 500, 200, 500, 200, 100, 100, 100, 100, 100] },
];

export const DEFAULT_PERMISSION_SETTINGS: NotificationPermissions = {
  directMessagePermission: "all",
  serverMessagePermission: "mentions_only",
  mentionPermission: "all",
  replyPermission: "all",
  friendRequestPermission: "all",
  callPermission: "all",
  systemPermission: "all",

  showSenderNames: true,
  showMessagePreviews: true,
  showServerNames: true,
  showChannelNames: true,
  maxPreviewLength: 100,

  intelligentFiltering: false, // Will be enabled in future PRD
  smartBatching: true,
  contextAwareDelivery: false, // Will be enabled in future PRD
  adaptiveScheduling: false, // Will be enabled in future PRD

  allowNotificationActions: true,
  allowRichMedia: true,
  allowInlineReplies: true,
  allowNotificationHistory: true,

  hideContentInLockScreen: false,
  hideNotificationsFromOtherApps: false,
  requireBiometricForSensitive: false,

  lastUpdated: Date.now(),
};

/**
 * Enhanced notification permissions service
 * Provides granular control over notification types, per-server settings,
 * priority contacts, and custom sounds/vibrations
 */
export class NotificationPermissionsService {

  // === Permission Management ===

  async getPermissionSettings(): Promise<NotificationPermissions> {
    try {
      const stored = await AsyncStorage.getItem(PERMISSION_SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_PERMISSION_SETTINGS, ...parsed };
      }
    } catch (error) {
      console.error("Failed to get permission settings:", error);
    }
    return DEFAULT_PERMISSION_SETTINGS;
  }

  async updatePermissionSettings(
    updates: Partial<NotificationPermissions>
  ): Promise<NotificationPermissions> {
    try {
      const current = await this.getPermissionSettings();
      const updated = {
        ...current,
        ...updates,
        lastUpdated: Date.now()
      };

      await AsyncStorage.setItem(
        PERMISSION_SETTINGS_KEY,
        JSON.stringify(updated)
      );

      return updated;
    } catch (error) {
      console.error("Failed to update permission settings:", error);
      throw error;
    }
  }

  // === Server-Specific Settings ===

  async getServerSettings(): Promise<ServerNotificationSettings[]> {
    try {
      const stored = await AsyncStorage.getItem(SERVER_SETTINGS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to get server settings:", error);
    }
    return [];
  }

  async getServerSetting(serverId: string): Promise<ServerNotificationSettings | null> {
    const settings = await this.getServerSettings();
    return settings.find(s => s.serverId === serverId) || null;
  }

  async updateServerSetting(
    serverId: string,
    serverName: string,
    updates: Partial<Omit<ServerNotificationSettings, 'serverId' | 'serverName'>>
  ): Promise<ServerNotificationSettings> {
    try {
      const settings = await this.getServerSettings();
      const existingIndex = settings.findIndex(s => s.serverId === serverId);

      const defaultSetting: ServerNotificationSettings = {
        serverId,
        serverName,
        enabled: true,
        messagePermission: "mentions_only",
        mentionPermission: "all",
        voiceChannelNotifications: true,
        serverEventNotifications: false,
        quietHoursOverride: false,
        lastUpdated: Date.now(),
      };

      const updated = {
        ...defaultSetting,
        ...(existingIndex !== -1 ? settings[existingIndex] : {}),
        ...updates,
        lastUpdated: Date.now(),
      };

      if (existingIndex !== -1) {
        settings[existingIndex] = updated;
      } else {
        settings.push(updated);
      }

      await AsyncStorage.setItem(SERVER_SETTINGS_KEY, JSON.stringify(settings));
      return updated;
    } catch (error) {
      console.error("Failed to update server setting:", error);
      throw error;
    }
  }

  async removeServerSetting(serverId: string): Promise<void> {
    try {
      const settings = await this.getServerSettings();
      const filtered = settings.filter(s => s.serverId !== serverId);
      await AsyncStorage.setItem(SERVER_SETTINGS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error("Failed to remove server setting:", error);
      throw error;
    }
  }

  // === Priority Contacts ===

  async getPriorityContacts(): Promise<PriorityContact[]> {
    try {
      const stored = await AsyncStorage.getItem(PRIORITY_CONTACTS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to get priority contacts:", error);
    }
    return [];
  }

  async addPriorityContact(
    user: User,
    priority: PriorityContact['priority'] = 'high',
    overrides?: Partial<PriorityContact['notificationOverrides']>
  ): Promise<void> {
    try {
      const contacts = await this.getPriorityContacts();

      // Remove existing entry if present
      const filtered = contacts.filter(c => c.userId !== user.id);

      const newContact: PriorityContact = {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        priority,
        notificationOverrides: {
          alwaysNotify: true,
          bypassQuietHours: priority === 'urgent',
          bypassDoNotDisturb: priority === 'urgent',
          ...overrides,
        },
        addedAt: Date.now(),
      };

      filtered.push(newContact);
      await AsyncStorage.setItem(PRIORITY_CONTACTS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error("Failed to add priority contact:", error);
      throw error;
    }
  }

  async removePriorityContact(userId: string): Promise<void> {
    try {
      const contacts = await this.getPriorityContacts();
      const filtered = contacts.filter(c => c.userId !== userId);
      await AsyncStorage.setItem(PRIORITY_CONTACTS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error("Failed to remove priority contact:", error);
      throw error;
    }
  }

  async isPriorityContact(userId: string): Promise<PriorityContact | null> {
    const contacts = await this.getPriorityContacts();
    return contacts.find(c => c.userId === userId) || null;
  }

  // === Custom Sounds & Vibrations ===

  async getCustomSounds(): Promise<NotificationSound[]> {
    try {
      const stored = await AsyncStorage.getItem(CUSTOM_SOUNDS_KEY);
      const custom = stored ? JSON.parse(stored) : [];
      return [...DEFAULT_SOUNDS, ...custom];
    } catch (error) {
      console.error("Failed to get custom sounds:", error);
      return DEFAULT_SOUNDS;
    }
  }

  async addCustomSound(sound: Omit<NotificationSound, 'id'>): Promise<string> {
    try {
      const stored = await AsyncStorage.getItem(CUSTOM_SOUNDS_KEY);
      const custom = stored ? JSON.parse(stored) : [];

      const newSound: NotificationSound = {
        ...sound,
        id: `custom_${Date.now()}`,
        isDefault: false,
      };

      custom.push(newSound);
      await AsyncStorage.setItem(CUSTOM_SOUNDS_KEY, JSON.stringify(custom));
      return newSound.id;
    } catch (error) {
      console.error("Failed to add custom sound:", error);
      throw error;
    }
  }

  async removeCustomSound(soundId: string): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(CUSTOM_SOUNDS_KEY);
      if (stored) {
        const custom = JSON.parse(stored);
        const filtered = custom.filter((s: NotificationSound) => s.id !== soundId);
        await AsyncStorage.setItem(CUSTOM_SOUNDS_KEY, JSON.stringify(filtered));
      }
    } catch (error) {
      console.error("Failed to remove custom sound:", error);
      throw error;
    }
  }

  getDefaultVibrationPatterns(): VibrationPattern[] {
    return DEFAULT_VIBRATION_PATTERNS;
  }

  // === Permission Checking Logic ===

  /**
   * Check if a notification should be delivered based on permission settings
   */
  async shouldDeliverNotification(
    type: NotificationType,
    senderId?: string,
    serverId?: string,
    channelId?: string,
    content?: string
  ): Promise<{
    shouldDeliver: boolean;
    reason?: string;
    customizations?: {
      sound?: string;
      vibrationPattern?: string;
      priority?: 'low' | 'default' | 'high' | 'max';
    };
  }> {
    try {
      const permissions = await this.getPermissionSettings();

      // Check if sender is a priority contact
      let priorityContact: PriorityContact | null = null;
      if (senderId) {
        priorityContact = await this.isPriorityContact(senderId);

        // Priority contacts with "always notify" override most restrictions
        if (priorityContact?.notificationOverrides.alwaysNotify) {
          return {
            shouldDeliver: true,
            reason: "Priority contact",
            customizations: {
              sound: priorityContact.notificationOverrides.customSound,
              vibrationPattern: priorityContact.notificationOverrides.customVibration,
              priority: priorityContact.priority === 'urgent' ? 'max' : 'high',
            },
          };
        }
      }

      // Check permission level based on notification type
      let permissionLevel: PermissionLevel = "none";

      switch (type) {
        case "dm":
          permissionLevel = permissions.directMessagePermission;
          break;
        case "message":
          permissionLevel = serverId
            ? await this.getServerMessagePermission(serverId)
            : permissions.serverMessagePermission;
          break;
        case "mention":
          permissionLevel = serverId
            ? await this.getServerMentionPermission(serverId)
            : permissions.mentionPermission;
          break;
        case "reply":
          permissionLevel = permissions.replyPermission;
          break;
        case "friend_request":
          permissionLevel = permissions.friendRequestPermission;
          break;
        case "call":
          permissionLevel = permissions.callPermission;
          break;
        case "system":
          permissionLevel = permissions.systemPermission;
          break;
        default:
          permissionLevel = "none";
      }

      // Apply permission level logic
      if (permissionLevel === "none") {
        return { shouldDeliver: false, reason: "Notifications disabled for this type" };
      }

      if (permissionLevel === "dm_only" && type !== "dm") {
        return { shouldDeliver: false, reason: "Only DMs allowed" };
      }

      if (permissionLevel === "mentions_only" && type !== "mention" && type !== "dm") {
        return { shouldDeliver: false, reason: "Only mentions allowed" };
      }

      // Get server-specific customizations
      let customizations: any = {};
      if (serverId) {
        const serverSettings = await this.getServerSetting(serverId);
        if (serverSettings) {
          customizations = {
            sound: serverSettings.customSound,
            vibrationPattern: serverSettings.customVibration,
            priority: 'default',
          };
        }
      }

      return {
        shouldDeliver: true,
        customizations: Object.keys(customizations).length > 0 ? customizations : undefined
      };

    } catch (error) {
      console.error("Failed to check notification permissions:", error);
      // Default to allowing notifications on error
      return { shouldDeliver: true, reason: "Error checking permissions - defaulting to allow" };
    }
  }

  // === Helper Methods ===

  private async getServerMessagePermission(serverId: string): Promise<PermissionLevel> {
    const serverSettings = await this.getServerSetting(serverId);
    if (serverSettings && !serverSettings.enabled) {
      return "none";
    }
    return serverSettings?.messagePermission || (await this.getPermissionSettings()).serverMessagePermission;
  }

  private async getServerMentionPermission(serverId: string): Promise<PermissionLevel> {
    const serverSettings = await this.getServerSetting(serverId);
    if (serverSettings && !serverSettings.enabled) {
      return "none";
    }
    return serverSettings?.mentionPermission || (await this.getPermissionSettings()).mentionPermission;
  }

  /**
   * Reset all notification permissions to defaults
   */
  async resetAllSettings(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        PERMISSION_SETTINGS_KEY,
        SERVER_SETTINGS_KEY,
        PRIORITY_CONTACTS_KEY,
        CUSTOM_SOUNDS_KEY,
      ]);
    } catch (error) {
      console.error("Failed to reset all settings:", error);
      throw error;
    }
  }

  /**
   * Export all notification settings for backup/sync
   */
  async exportSettings(): Promise<{
    permissions: NotificationPermissions;
    serverSettings: ServerNotificationSettings[];
    priorityContacts: PriorityContact[];
    customSounds: NotificationSound[];
  }> {
    const [permissions, serverSettings, priorityContacts, customSounds] = await Promise.all([
      this.getPermissionSettings(),
      this.getServerSettings(),
      this.getPriorityContacts(),
      this.getCustomSounds(),
    ]);

    return {
      permissions,
      serverSettings,
      priorityContacts,
      customSounds: customSounds.filter(s => !s.isDefault), // Only export custom sounds
    };
  }
}

// Export singleton instance
export const notificationPermissions = new NotificationPermissionsService();