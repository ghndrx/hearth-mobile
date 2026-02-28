/**
 * Settings Service with Persistence
 * Handles user preferences and app settings
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  showPreview: boolean;
  mentionsOnly: boolean;
  dmNotifications: boolean;
  serverNotifications: boolean;
  friendRequestNotifications: boolean;
}

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
  showAvatars: boolean;
  animationsEnabled: boolean;
  reducedMotion: boolean;
}

export interface PrivacySettings {
  showOnlineStatus: boolean;
  showReadReceipts: boolean;
  showTypingIndicators: boolean;
  allowDMsFromAnyone: boolean;
  allowFriendRequests: boolean;
  showActivityStatus: boolean;
}

export interface ChatSettings {
  sendOnEnter: boolean;
  showLinkPreviews: boolean;
  autoPlayGifs: boolean;
  autoPlayVideos: boolean;
  imageQuality: 'low' | 'medium' | 'high';
  messageGroupingInterval: number; // seconds
  showTimestamps: 'always' | 'hover' | 'never';
}

export interface VoiceSettings {
  inputDevice: string | null;
  outputDevice: string | null;
  inputVolume: number;
  outputVolume: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  automaticGainControl: boolean;
  pushToTalk: boolean;
  voiceActivityDetection: boolean;
  voiceActivityThreshold: number;
}

export interface AccessibilitySettings {
  screenReaderEnabled: boolean;
  highContrast: boolean;
  largeText: boolean;
  reduceTransparency: boolean;
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  hapticsEnabled: boolean;
}

export interface AppSettings {
  notifications: NotificationSettings;
  appearance: AppearanceSettings;
  privacy: PrivacySettings;
  chat: ChatSettings;
  voice: VoiceSettings;
  accessibility: AccessibilitySettings;
}

const DEFAULT_SETTINGS: AppSettings = {
  notifications: {
    enabled: true,
    sound: true,
    vibration: true,
    showPreview: true,
    mentionsOnly: false,
    dmNotifications: true,
    serverNotifications: true,
    friendRequestNotifications: true,
  },
  appearance: {
    theme: 'system',
    fontSize: 'medium',
    compactMode: false,
    showAvatars: true,
    animationsEnabled: true,
    reducedMotion: false,
  },
  privacy: {
    showOnlineStatus: true,
    showReadReceipts: true,
    showTypingIndicators: true,
    allowDMsFromAnyone: false,
    allowFriendRequests: true,
    showActivityStatus: true,
  },
  chat: {
    sendOnEnter: true,
    showLinkPreviews: true,
    autoPlayGifs: true,
    autoPlayVideos: false,
    imageQuality: 'high',
    messageGroupingInterval: 300,
    showTimestamps: 'hover',
  },
  voice: {
    inputDevice: null,
    outputDevice: null,
    inputVolume: 100,
    outputVolume: 100,
    echoCancellation: true,
    noiseSuppression: true,
    automaticGainControl: true,
    pushToTalk: false,
    voiceActivityDetection: true,
    voiceActivityThreshold: 50,
  },
  accessibility: {
    screenReaderEnabled: false,
    highContrast: false,
    largeText: false,
    reduceTransparency: false,
    colorBlindMode: 'none',
    hapticsEnabled: true,
  },
};

interface SettingsStore {
  settings: AppSettings;
  isLoaded: boolean;
  
  // Setters
  setNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  setAppearanceSettings: (settings: Partial<AppearanceSettings>) => void;
  setPrivacySettings: (settings: Partial<PrivacySettings>) => void;
  setChatSettings: (settings: Partial<ChatSettings>) => void;
  setVoiceSettings: (settings: Partial<VoiceSettings>) => void;
  setAccessibilitySettings: (settings: Partial<AccessibilitySettings>) => void;
  
  // Bulk operations
  setAllSettings: (settings: Partial<AppSettings>) => void;
  resetToDefaults: () => void;
  
  // Utilities
  exportSettings: () => string;
  importSettings: (json: string) => boolean;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      isLoaded: false,

      setNotificationSettings: (newSettings) =>
        set((state) => ({
          settings: {
            ...state.settings,
            notifications: { ...state.settings.notifications, ...newSettings },
          },
        })),

      setAppearanceSettings: (newSettings) =>
        set((state) => ({
          settings: {
            ...state.settings,
            appearance: { ...state.settings.appearance, ...newSettings },
          },
        })),

      setPrivacySettings: (newSettings) =>
        set((state) => ({
          settings: {
            ...state.settings,
            privacy: { ...state.settings.privacy, ...newSettings },
          },
        })),

      setChatSettings: (newSettings) =>
        set((state) => ({
          settings: {
            ...state.settings,
            chat: { ...state.settings.chat, ...newSettings },
          },
        })),

      setVoiceSettings: (newSettings) =>
        set((state) => ({
          settings: {
            ...state.settings,
            voice: { ...state.settings.voice, ...newSettings },
          },
        })),

      setAccessibilitySettings: (newSettings) =>
        set((state) => ({
          settings: {
            ...state.settings,
            accessibility: { ...state.settings.accessibility, ...newSettings },
          },
        })),

      setAllSettings: (newSettings) =>
        set((state) => ({
          settings: {
            notifications: { ...state.settings.notifications, ...newSettings.notifications },
            appearance: { ...state.settings.appearance, ...newSettings.appearance },
            privacy: { ...state.settings.privacy, ...newSettings.privacy },
            chat: { ...state.settings.chat, ...newSettings.chat },
            voice: { ...state.settings.voice, ...newSettings.voice },
            accessibility: { ...state.settings.accessibility, ...newSettings.accessibility },
          },
        })),

      resetToDefaults: () =>
        set({ settings: DEFAULT_SETTINGS }),

      exportSettings: () => {
        const { settings } = get();
        return JSON.stringify(settings, null, 2);
      },

      importSettings: (json: string) => {
        try {
          const imported = JSON.parse(json) as Partial<AppSettings>;
          get().setAllSettings(imported);
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'hearth-settings',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isLoaded = true;
        }
      },
    }
  )
);

// Selector hooks for convenience
export function useNotificationSettings() {
  return useSettingsStore((state) => state.settings.notifications);
}

export function useAppearanceSettings() {
  return useSettingsStore((state) => state.settings.appearance);
}

export function usePrivacySettings() {
  return useSettingsStore((state) => state.settings.privacy);
}

export function useChatSettings() {
  return useSettingsStore((state) => state.settings.chat);
}

export function useVoiceSettings() {
  return useSettingsStore((state) => state.settings.voice);
}

export function useAccessibilitySettings() {
  return useSettingsStore((state) => state.settings.accessibility);
}

// Helper to get current settings (for use in non-hook contexts)
export function getSettings(): AppSettings {
  return useSettingsStore.getState().settings;
}

// Helper to sync settings with server
export async function syncSettingsWithServer(): Promise<void> {
  const { settings } = useSettingsStore.getState();
  
  try {
    // In a real app, this would call the API
    console.log('[Settings] Syncing with server:', settings);
  } catch (error) {
    console.error('[Settings] Failed to sync with server:', error);
  }
}

// Helper to load settings from server
export async function loadSettingsFromServer(): Promise<void> {
  try {
    // In a real app, this would fetch from the API
    console.log('[Settings] Loading from server');
  } catch (error) {
    console.error('[Settings] Failed to load from server:', error);
  }
}

export default useSettingsStore;
