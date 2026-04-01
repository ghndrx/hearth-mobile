/**
 * Haptic Feedback Service Exports
 * Cross-platform unified API using expo-haptics
 *
 * Provides platform-specific haptic feedback for iOS (Taptic Engine) and Android (VibrationEffect).
 * Supports various haptic patterns for common user interactions.
 */

export { default as HapticService } from './hapticService';
import HapticService from './hapticService';

// Re-export types and enums
export type { HapticConfig } from './hapticService';
export { HapticPattern, HapticImpact } from './hapticService';

// Platform detection is available from pushNotifications service

/**
 * Initialize haptic feedback service with default configuration
 *
 * @param enabled - Whether to enable haptic feedback (default: true)
 * @returns Promise<boolean> - True if initialization successful
 */
export const initializeHaptics = async (enabled: boolean = true): Promise<boolean> => {
  return await HapticService.initialize({
    enabled,
    ios: {
      respectSystemSettings: true,
    },
    android: {
      minApiLevel: 21, // Android 5.0+
    },
  });
};

/**
 * Quick haptic feedback helpers for common use cases
 */
export const hapticFeedback = {
  /** Light selection feedback for UI interactions */
  selection: () => HapticService.selection(),

  /** Impact feedback with different intensities */
  light: () => HapticService.light(),
  medium: () => HapticService.medium(),
  heavy: () => HapticService.heavy(),

  /** Semantic feedback for user actions */
  success: () => HapticService.success(),
  warning: () => HapticService.warning(),
  error: () => HapticService.error(),

  /** Generic impact with intensity parameter */
  impact: (intensity?: import('./hapticService').HapticImpact) => HapticService.impact(intensity),

  /** Generic pattern trigger */
  trigger: (pattern: import('./hapticService').HapticPattern) => HapticService.trigger(pattern),
};