import * as Haptics from "expo-haptics";
import { Platform, Vibration } from "react-native";
import { getSettings } from "./settings";

// ============================================================================
// Types
// ============================================================================

export type HapticFeedback =
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "error"
  | "selection"
  | "buttonPress"
  | "swipeAction"
  | "longPress"
  | "toggle"
  | "notification";

// ============================================================================
// Haptic Feedback Engine
// ============================================================================

/**
 * Centralized haptic feedback with semantic types.
 * Respects user's haptic settings and handles platform differences.
 *
 * iOS: Uses Core Haptics / UIFeedbackGenerator via expo-haptics
 * Android: Uses VibrationEffect / HapticFeedback via expo-haptics
 */
export async function triggerHaptic(
  type: HapticFeedback = "selection"
): Promise<void> {
  // Check if haptics are enabled in user settings
  try {
    const settings = getSettings();
    if (settings.accessibility?.hapticsEnabled === false) {
      return;
    }
  } catch {
    // If we can't read settings, default to enabled
  }

  try {
    if (Platform.OS === "ios") {
      await triggerIOSHaptic(type);
    } else if (Platform.OS === "android") {
      await triggerAndroidHaptic(type);
    }
  } catch (error) {
    // Silently fail if haptics aren't available
    console.debug("Haptic feedback unavailable:", error);
  }
}

/**
 * iOS haptic feedback using Core Haptics / UIFeedbackGenerator
 */
async function triggerIOSHaptic(type: HapticFeedback): Promise<void> {
  switch (type) {
    // Impact feedback (physical interactions)
    case "light":
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case "medium":
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case "heavy":
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;

    // Notification feedback (outcomes)
    case "success":
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case "warning":
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
    case "error":
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      break;

    // Selection feedback (UI changes)
    case "selection":
      await Haptics.selectionAsync();
      break;

    // Semantic shortcuts
    case "buttonPress":
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case "swipeAction":
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case "longPress":
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case "toggle":
      await Haptics.selectionAsync();
      break;
    case "notification":
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;

    default:
      await Haptics.selectionAsync();
  }
}

/**
 * Android haptic feedback using VibrationEffect / HapticFeedback
 * Falls back to basic vibration for older devices.
 */
async function triggerAndroidHaptic(type: HapticFeedback): Promise<void> {
  // Android 10+ has VibrationEffect support via expo-haptics
  // For older versions, we fall back to basic Vibration

  switch (type) {
    // Impact feedback - map to appropriate vibration patterns
    case "light":
      // Short, light vibration
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case "medium":
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case "heavy":
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;

    // Notification feedback
    case "success":
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case "warning":
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
    case "error":
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      break;

    // Selection feedback
    case "selection":
      await Haptics.selectionAsync();
      break;

    // Semantic shortcuts
    case "buttonPress":
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case "swipeAction":
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case "longPress":
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case "toggle":
      await Haptics.selectionAsync();
      break;
    case "notification":
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;

    default:
      await Haptics.selectionAsync();
  }
}

/**
 * Create a haptic-enabled callback wrapper
 */
export function withHaptic<T extends (...args: unknown[]) => unknown>(
  callback: T,
  type: HapticFeedback = "buttonPress"
): T {
  return ((...args: Parameters<T>) => {
    triggerHaptic(type);
    return callback(...args);
  }) as T;
}

/**
 * Hook-style haptic trigger for use in event handlers
 */
export function useHapticCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  type: HapticFeedback = "buttonPress"
): T {
  return withHaptic(callback, type);
}

// ============================================================================
// Quick Access Functions
// ============================================================================

export const haptic = {
  light: () => triggerHaptic("light"),
  medium: () => triggerHaptic("medium"),
  heavy: () => triggerHaptic("heavy"),
  success: () => triggerHaptic("success"),
  warning: () => triggerHaptic("warning"),
  error: () => triggerHaptic("error"),
  selection: () => triggerHaptic("selection"),
  buttonPress: () => triggerHaptic("buttonPress"),
  swipeAction: () => triggerHaptic("swipeAction"),
  longPress: () => triggerHaptic("longPress"),
  toggle: () => triggerHaptic("toggle"),
  notification: () => triggerHaptic("notification"),
};

export default haptic;
