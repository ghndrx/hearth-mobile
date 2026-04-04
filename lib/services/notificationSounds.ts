/**
 * Notification Sounds and Vibration Patterns - PN-005
 *
 * Manages custom notification sounds and vibration patterns:
 * - Built-in sound library
 * - Custom sound uploads
 * - Vibration pattern customization
 * - Per-channel/user sound settings
 * - Sound previewing
 */

import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NotificationType } from "./notifications";

const SOUND_SETTINGS_KEY = "@hearth/notification_sound_settings";
const CUSTOM_SOUNDS_KEY = "@hearth/custom_notification_sounds";

// ============================================================================
// Types
// ============================================================================

export interface VibrationPattern {
  id: string;
  name: string;
  description: string;
  pattern: number[]; // Array of durations in milliseconds [wait, vibrate, wait, vibrate, ...]
  intensity?: "light" | "medium" | "heavy";
}

export interface NotificationSound {
  id: string;
  name: string;
  description: string;
  file: string; // Local file path or built-in sound ID
  isBuiltIn: boolean;
  category: "tone" | "chime" | "alert" | "musical" | "nature" | "custom";
  duration: number; // Duration in seconds
  preview?: string; // Preview file path (shorter version)
}

export interface SoundSettings {
  enabled: boolean;
  globalSound: string; // Default sound ID
  perTypeSettings: Record<NotificationType, {
    soundId?: string;
    vibrationId?: string;
    volume?: number; // 0.0 to 1.0
  }>;
  perChannelSettings: Record<string, { // channelId -> settings
    soundId?: string;
    vibrationId?: string;
    volume?: number;
  }>;
  perUserSettings: Record<string, { // userId -> settings
    soundId?: string;
    vibrationId?: string;
    volume?: number;
  }>;
  vibrationEnabled: boolean;
  globalVibration: string; // Default vibration pattern ID
  respectSystemVolume: boolean;
}

// ============================================================================
// Built-in Sounds
// ============================================================================

export const BUILT_IN_SOUNDS: NotificationSound[] = [
  {
    id: "default",
    name: "Default",
    description: "System default notification sound",
    file: "default",
    isBuiltIn: true,
    category: "tone",
    duration: 1.5,
  },
  {
    id: "discord_notification",
    name: "Discord Classic",
    description: "Classic Discord notification sound",
    file: "discord_notification.mp3",
    isBuiltIn: true,
    category: "tone",
    duration: 0.8,
  },
  {
    id: "soft_chime",
    name: "Soft Chime",
    description: "Gentle chime sound",
    file: "soft_chime.mp3",
    isBuiltIn: true,
    category: "chime",
    duration: 1.2,
  },
  {
    id: "digital_beep",
    name: "Digital Beep",
    description: "Modern digital beep",
    file: "digital_beep.mp3",
    isBuiltIn: true,
    category: "tone",
    duration: 0.5,
  },
  {
    id: "message_pop",
    name: "Message Pop",
    description: "Quick message pop sound",
    file: "message_pop.mp3",
    isBuiltIn: true,
    category: "tone",
    duration: 0.3,
  },
  {
    id: "gentle_bell",
    name: "Gentle Bell",
    description: "Soft bell tone",
    file: "gentle_bell.mp3",
    isBuiltIn: true,
    category: "chime",
    duration: 2.0,
  },
  {
    id: "alert_tone",
    name: "Alert Tone",
    description: "Attention-grabbing alert",
    file: "alert_tone.mp3",
    isBuiltIn: true,
    category: "alert",
    duration: 1.5,
  },
  {
    id: "piano_note",
    name: "Piano Note",
    description: "Single piano note",
    file: "piano_note.mp3",
    isBuiltIn: true,
    category: "musical",
    duration: 1.8,
  },
  {
    id: "water_drop",
    name: "Water Drop",
    description: "Gentle water drop sound",
    file: "water_drop.mp3",
    isBuiltIn: true,
    category: "nature",
    duration: 1.0,
  },
  {
    id: "bird_chirp",
    name: "Bird Chirp",
    description: "Pleasant bird chirp",
    file: "bird_chirp.mp3",
    isBuiltIn: true,
    category: "nature",
    duration: 1.5,
  },
  {
    id: "crystal_chime",
    name: "Crystal Chime",
    description: "Clear crystal chime",
    file: "crystal_chime.mp3",
    isBuiltIn: true,
    category: "chime",
    duration: 2.5,
  },
  {
    id: "subtle_ping",
    name: "Subtle Ping",
    description: "Very quiet ping sound",
    file: "subtle_ping.mp3",
    isBuiltIn: true,
    category: "tone",
    duration: 0.4,
  },
];

// ============================================================================
// Built-in Vibration Patterns
// ============================================================================

export const BUILT_IN_VIBRATIONS: VibrationPattern[] = [
  {
    id: "default",
    name: "Default",
    description: "System default vibration",
    pattern: [0, 250, 250, 250],
    intensity: "medium",
  },
  {
    id: "single_pulse",
    name: "Single Pulse",
    description: "One quick pulse",
    pattern: [0, 200],
    intensity: "medium",
  },
  {
    id: "double_pulse",
    name: "Double Pulse",
    description: "Two quick pulses",
    pattern: [0, 150, 100, 150],
    intensity: "medium",
  },
  {
    id: "triple_pulse",
    name: "Triple Pulse",
    description: "Three quick pulses",
    pattern: [0, 150, 100, 150, 100, 150],
    intensity: "medium",
  },
  {
    id: "long_pulse",
    name: "Long Pulse",
    description: "One long vibration",
    pattern: [0, 800],
    intensity: "medium",
  },
  {
    id: "heartbeat",
    name: "Heartbeat",
    description: "Heartbeat-like rhythm",
    pattern: [0, 200, 100, 250, 300, 200, 100, 250],
    intensity: "light",
  },
  {
    id: "urgent",
    name: "Urgent",
    description: "Strong urgent pattern",
    pattern: [0, 500, 200, 500],
    intensity: "heavy",
  },
  {
    id: "morse_sos",
    name: "SOS",
    description: "Morse code SOS pattern",
    pattern: [0, 150, 100, 150, 100, 150, 300, 500, 100, 500, 100, 500, 300, 150, 100, 150, 100, 150],
    intensity: "medium",
  },
  {
    id: "gentle_wave",
    name: "Gentle Wave",
    description: "Soft wave-like pattern",
    pattern: [0, 100, 50, 150, 50, 200, 50, 150, 50, 100],
    intensity: "light",
  },
  {
    id: "notification_tap",
    name: "Notification Tap",
    description: "Light notification tap",
    pattern: [0, 50, 50, 50],
    intensity: "light",
  },
];

// ============================================================================
// Default Settings
// ============================================================================

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  enabled: true,
  globalSound: "discord_notification",
  perTypeSettings: {
    message: { soundId: "discord_notification", vibrationId: "double_pulse", volume: 0.8 },
    dm: { soundId: "message_pop", vibrationId: "default", volume: 1.0 },
    mention: { soundId: "alert_tone", vibrationId: "urgent", volume: 1.0 },
    reply: { soundId: "soft_chime", vibrationId: "double_pulse", volume: 0.8 },
    friend_request: { soundId: "gentle_bell", vibrationId: "heartbeat", volume: 0.7 },
    server_invite: { soundId: "crystal_chime", vibrationId: "triple_pulse", volume: 0.7 },
    call: { soundId: "piano_note", vibrationId: "urgent", volume: 1.0 },
    system: { soundId: "subtle_ping", vibrationId: "notification_tap", volume: 0.5 },
  },
  perChannelSettings: {},
  perUserSettings: {},
  vibrationEnabled: true,
  globalVibration: "default",
  respectSystemVolume: true,
};

// ============================================================================
// Sound Management
// ============================================================================

/**
 * Get current sound settings
 */
export async function getSoundSettings(): Promise<SoundSettings> {
  try {
    const stored = await AsyncStorage.getItem(SOUND_SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_SOUND_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error("Failed to get sound settings:", error);
  }
  return DEFAULT_SOUND_SETTINGS;
}

/**
 * Save sound settings
 */
export async function saveSoundSettings(
  settings: Partial<SoundSettings>
): Promise<SoundSettings> {
  try {
    const current = await getSoundSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(SOUND_SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error("Failed to save sound settings:", error);
    throw error;
  }
}

/**
 * Get sound for notification type/channel/user
 */
export async function getSoundForNotification(
  type: NotificationType,
  channelId?: string,
  userId?: string
): Promise<{ soundId: string; vibrationId: string; volume: number }> {
  const settings = await getSoundSettings();

  // Check user-specific settings first (for DMs)
  if (userId && settings.perUserSettings[userId]) {
    const userSettings = settings.perUserSettings[userId];
    return {
      soundId: userSettings.soundId || settings.globalSound,
      vibrationId: userSettings.vibrationId || settings.globalVibration,
      volume: userSettings.volume ?? 0.8,
    };
  }

  // Check channel-specific settings
  if (channelId && settings.perChannelSettings[channelId]) {
    const channelSettings = settings.perChannelSettings[channelId];
    return {
      soundId: channelSettings.soundId || settings.globalSound,
      vibrationId: channelSettings.vibrationId || settings.globalVibration,
      volume: channelSettings.volume ?? 0.8,
    };
  }

  // Check type-specific settings
  const typeSettings = settings.perTypeSettings[type];
  if (typeSettings) {
    return {
      soundId: typeSettings.soundId || settings.globalSound,
      vibrationId: typeSettings.vibrationId || settings.globalVibration,
      volume: typeSettings.volume ?? 0.8,
    };
  }

  // Fallback to global settings
  return {
    soundId: settings.globalSound,
    vibrationId: settings.globalVibration,
    volume: 0.8,
  };
}

/**
 * Get all available sounds
 */
export async function getAvailableSounds(): Promise<NotificationSound[]> {
  try {
    const customSounds = await getCustomSounds();
    return [...BUILT_IN_SOUNDS, ...customSounds];
  } catch (error) {
    console.error("Failed to get available sounds:", error);
    return BUILT_IN_SOUNDS;
  }
}

/**
 * Get sound by ID
 */
export async function getSoundById(soundId: string): Promise<NotificationSound | null> {
  const sounds = await getAvailableSounds();
  return sounds.find(s => s.id === soundId) || null;
}

/**
 * Get all available vibration patterns
 */
export function getAvailableVibrations(): VibrationPattern[] {
  return BUILT_IN_VIBRATIONS;
}

/**
 * Get vibration pattern by ID
 */
export function getVibrationById(vibrationId: string): VibrationPattern | null {
  return BUILT_IN_VIBRATIONS.find(v => v.id === vibrationId) || null;
}

// ============================================================================
// Custom Sounds
// ============================================================================

/**
 * Get custom sounds
 */
async function getCustomSounds(): Promise<NotificationSound[]> {
  try {
    const stored = await AsyncStorage.getItem(CUSTOM_SOUNDS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to get custom sounds:", error);
    return [];
  }
}

/**
 * Add custom sound
 */
export async function addCustomSound(sound: Omit<NotificationSound, "isBuiltIn">): Promise<void> {
  try {
    const customSounds = await getCustomSounds();
    const newSound: NotificationSound = { ...sound, isBuiltIn: false };

    // Check for duplicate IDs
    if (customSounds.find(s => s.id === sound.id)) {
      throw new Error(`Sound with ID '${sound.id}' already exists`);
    }

    customSounds.push(newSound);
    await AsyncStorage.setItem(CUSTOM_SOUNDS_KEY, JSON.stringify(customSounds));
  } catch (error) {
    console.error("Failed to add custom sound:", error);
    throw error;
  }
}

/**
 * Remove custom sound
 */
export async function removeCustomSound(soundId: string): Promise<void> {
  try {
    const customSounds = await getCustomSounds();
    const filtered = customSounds.filter(s => s.id !== soundId);
    await AsyncStorage.setItem(CUSTOM_SOUNDS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to remove custom sound:", error);
    throw error;
  }
}

// ============================================================================
// Sound and Vibration Playback
// ============================================================================

/**
 * Play notification sound
 */
export async function playNotificationSound(
  soundId: string,
  volume: number = 0.8
): Promise<void> {
  try {
    const settings = await getSoundSettings();
    if (!settings.enabled) return;

    const sound = await getSoundById(soundId);
    if (!sound) {
      console.warn(`Sound not found: ${soundId}`);
      return;
    }

    if (sound.isBuiltIn && sound.file === "default") {
      // Use system default sound
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Sound Test",
          body: "Testing notification sound",
          sound: true,
        },
        trigger: null,
      });
    } else {
      // Play custom sound file
      const { sound: audioSound } = await Audio.Sound.createAsync(
        { uri: sound.file },
        {
          shouldPlay: true,
          volume: settings.respectSystemVolume ? volume : 1.0,
        }
      );

      // Unload sound after playing
      setTimeout(async () => {
        try {
          await audioSound.unloadAsync();
        } catch (error) {
          console.warn("Failed to unload sound:", error);
        }
      }, sound.duration * 1000 + 500);
    }
  } catch (error) {
    console.error("Failed to play notification sound:", error);
  }
}

/**
 * Trigger notification vibration
 */
export async function triggerNotificationVibration(
  vibrationId: string
): Promise<void> {
  try {
    const settings = await getSoundSettings();
    if (!settings.vibrationEnabled) return;

    const pattern = getVibrationById(vibrationId);
    if (!pattern) {
      console.warn(`Vibration pattern not found: ${vibrationId}`);
      return;
    }

    if (Platform.OS === "ios") {
      // iOS haptic feedback
      switch (pattern.intensity) {
        case "light":
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case "heavy":
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        default:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // For complex patterns, trigger multiple times
      if (pattern.pattern.length > 2) {
        for (let i = 2; i < pattern.pattern.length; i += 2) {
          setTimeout(async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }, pattern.pattern.slice(0, i + 1).reduce((sum, val, idx) => idx % 2 === 0 ? sum + val : sum, 0));
        }
      }
    } else {
      // Android vibration patterns are handled by the notification system
      // This is for preview/testing purposes
      console.log(`Would vibrate with pattern: ${pattern.pattern}`);
    }
  } catch (error) {
    console.error("Failed to trigger vibration:", error);
  }
}

/**
 * Preview sound and vibration combination
 */
export async function previewNotificationSoundAndVibration(
  soundId: string,
  vibrationId: string,
  volume: number = 0.8
): Promise<void> {
  try {
    // Trigger vibration first
    triggerNotificationVibration(vibrationId);

    // Play sound after a short delay
    setTimeout(() => {
      playNotificationSound(soundId, volume);
    }, 100);
  } catch (error) {
    console.error("Failed to preview sound and vibration:", error);
  }
}

// ============================================================================
// Settings Helpers
// ============================================================================

/**
 * Set sound for notification type
 */
export async function setSoundForType(
  type: NotificationType,
  soundId: string,
  vibrationId?: string,
  volume?: number
): Promise<void> {
  const settings = await getSoundSettings();

  if (!settings.perTypeSettings[type]) {
    settings.perTypeSettings[type] = {};
  }

  settings.perTypeSettings[type].soundId = soundId;
  if (vibrationId) {
    settings.perTypeSettings[type].vibrationId = vibrationId;
  }
  if (volume !== undefined) {
    settings.perTypeSettings[type].volume = volume;
  }

  await saveSoundSettings(settings);
}

/**
 * Set sound for specific channel
 */
export async function setSoundForChannel(
  channelId: string,
  soundId: string,
  vibrationId?: string,
  volume?: number
): Promise<void> {
  const settings = await getSoundSettings();

  if (!settings.perChannelSettings[channelId]) {
    settings.perChannelSettings[channelId] = {};
  }

  settings.perChannelSettings[channelId].soundId = soundId;
  if (vibrationId) {
    settings.perChannelSettings[channelId].vibrationId = vibrationId;
  }
  if (volume !== undefined) {
    settings.perChannelSettings[channelId].volume = volume;
  }

  await saveSoundSettings(settings);
}

/**
 * Set sound for specific user (DMs)
 */
export async function setSoundForUser(
  userId: string,
  soundId: string,
  vibrationId?: string,
  volume?: number
): Promise<void> {
  const settings = await getSoundSettings();

  if (!settings.perUserSettings[userId]) {
    settings.perUserSettings[userId] = {};
  }

  settings.perUserSettings[userId].soundId = soundId;
  if (vibrationId) {
    settings.perUserSettings[userId].vibrationId = vibrationId;
  }
  if (volume !== undefined) {
    settings.perUserSettings[userId].volume = volume;
  }

  await saveSoundSettings(settings);
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize notification sounds system
 */
export async function initializeNotificationSounds(): Promise<void> {
  try {
    // Set up audio session for iOS
    if (Platform.OS === "ios") {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    }

    console.log("Notification sounds system initialized");
  } catch (error) {
    console.error("Failed to initialize notification sounds:", error);
  }
}