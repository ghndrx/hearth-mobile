import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
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
 */
export async function triggerHaptic(
  type: HapticFeedback = "selection"
): Promise<void> {
  // Only iOS has native haptics, Android uses vibration which we handle separately
  if (Platform.OS !== "ios") {
    return;
  }

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
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
        break;
      case "warning":
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning
        );
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
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
        break;

      default:
        await Haptics.selectionAsync();
    }
  } catch (error) {
    // Silently fail if haptics aren't available
    console.debug("Haptic feedback unavailable:", error);
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
