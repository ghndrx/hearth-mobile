import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  PixelRatio,
  Platform} from "react-native";
import { useColorScheme } from "../hooks/useColorScheme";

// ============================================================================
// Types
// ============================================================================

export interface AccessibilityState {
  isScreenReaderEnabled: boolean;
  isReduceMotionEnabled: boolean;
  isBoldTextEnabled: boolean;
  isGrayscaleEnabled: boolean;
  isInvertColorsEnabled: boolean;
  isReduceTransparencyEnabled: boolean;
  prefersCrossFadeTransitions: boolean;
  fontScale: number;
  colorScheme: "light" | "dark" | null;
}

export type DynamicTypeSize =
  | "xSmall"
  | "small"
  | "medium"
  | "large"
  | "xLarge"
  | "xxLarge"
  | "xxxLarge"
  | "accessibility";

// ============================================================================
// Font Scale Utilities
// ============================================================================

/**
 * Get the current font scale (1.0 = default, >1.0 = larger, <1.0 = smaller)
 */
export function getFontScale(): number {
  return PixelRatio.getFontScale();
}

/**
 * Check if large text is enabled (font scale >= 1.3)
 */
export function isLargeTextEnabled(): boolean {
  return getFontScale() >= 1.3;
}

/**
 * Check if accessibility text sizes are enabled (font scale >= 2.0)
 */
export function isAccessibilityTextEnabled(): boolean {
  return getFontScale() >= 2.0;
}

/**
 * Get dynamic type size category based on font scale
 */
export function getDynamicTypeSize(): DynamicTypeSize {
  const scale = getFontScale();
  if (scale >= 2.0) return "accessibility";
  if (scale >= 1.6) return "xxxLarge";
  if (scale >= 1.4) return "xxLarge";
  if (scale >= 1.2) return "xLarge";
  if (scale >= 1.0) return "large";
  if (scale >= 0.9) return "medium";
  if (scale >= 0.8) return "small";
  return "xSmall";
}

/**
 * Scale a font size based on system font scale, with min/max bounds
 */
export function scaleFontSize(
  baseSize: number,
  options?: { min?: number; max?: number; allowScaling?: boolean }
): number {
  const { min = baseSize * 0.75, max = baseSize * 2, allowScaling = true } = options ?? {};
  
  if (!allowScaling) return baseSize;
  
  const scaled = baseSize * getFontScale();
  return Math.max(min, Math.min(max, scaled));
}

// ============================================================================
// Accessibility State Hook
// ============================================================================

/**
 * Hook to track all accessibility settings
 */
export function useAccessibilityState(): AccessibilityState {
  const colorScheme = useColorScheme();
  const [state, setState] = useState<Omit<AccessibilityState, "colorScheme" | "fontScale">>({
    isScreenReaderEnabled: false,
    isReduceMotionEnabled: false,
    isBoldTextEnabled: false,
    isGrayscaleEnabled: false,
    isInvertColorsEnabled: false,
    isReduceTransparencyEnabled: false,
    prefersCrossFadeTransitions: false,
  });

  useEffect(() => {
    // Initial checks
    const checkState = async () => {
      const [
        screenReader,
        reduceMotion,
        boldText,
        grayscale,
        invertColors,
        reduceTransparency,
      ] = await Promise.all([
        AccessibilityInfo.isScreenReaderEnabled(),
        AccessibilityInfo.isReduceMotionEnabled(),
        Platform.OS === "ios"
          ? AccessibilityInfo.isBoldTextEnabled?.() ?? Promise.resolve(false)
          : Promise.resolve(false),
        Platform.OS === "ios"
          ? AccessibilityInfo.isGrayscaleEnabled?.() ?? Promise.resolve(false)
          : Promise.resolve(false),
        Platform.OS === "ios"
          ? AccessibilityInfo.isInvertColorsEnabled?.() ?? Promise.resolve(false)
          : Promise.resolve(false),
        Platform.OS === "ios"
          ? AccessibilityInfo.isReduceTransparencyEnabled?.() ?? Promise.resolve(false)
          : Promise.resolve(false),
      ]);

      setState({
        isScreenReaderEnabled: screenReader,
        isReduceMotionEnabled: reduceMotion,
        isBoldTextEnabled: boldText,
        isGrayscaleEnabled: grayscale,
        isInvertColorsEnabled: invertColors,
        isReduceTransparencyEnabled: reduceTransparency,
        prefersCrossFadeTransitions: reduceMotion,
      });
    };

    checkState();

    // Subscribe to changes
    const subscriptions = [
      AccessibilityInfo.addEventListener("screenReaderChanged", (enabled) => {
        setState((s) => ({ ...s, isScreenReaderEnabled: enabled }));
      }),
      AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled) => {
        setState((s) => ({
          ...s,
          isReduceMotionEnabled: enabled,
          prefersCrossFadeTransitions: enabled,
        }));
      }),
    ];

    // iOS-specific listeners
    if (Platform.OS === "ios") {
      subscriptions.push(
        AccessibilityInfo.addEventListener("boldTextChanged", (enabled) => {
          setState((s) => ({ ...s, isBoldTextEnabled: enabled }));
        }),
        AccessibilityInfo.addEventListener("grayscaleChanged", (enabled) => {
          setState((s) => ({ ...s, isGrayscaleEnabled: enabled }));
        }),
        AccessibilityInfo.addEventListener("invertColorsChanged", (enabled) => {
          setState((s) => ({ ...s, isInvertColorsEnabled: enabled }));
        }),
        AccessibilityInfo.addEventListener(
          "reduceTransparencyChanged",
          (enabled) => {
            setState((s) => ({ ...s, isReduceTransparencyEnabled: enabled }));
          }
        )
      );
    }

    return () => {
      subscriptions.forEach((sub) => sub.remove());
    };
  }, []);

  return {
    ...state,
    fontScale: getFontScale(),
    colorScheme: colorScheme ?? null,
  };
}

/**
 * Simple hook for screen reader status
 */
export function useScreenReader(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setEnabled);
    const subscription = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      setEnabled
    );
    return () => subscription.remove();
  }, []);

  return enabled;
}

/**
 * Simple hook for reduce motion preference
 */
export function useReduceMotion(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setEnabled);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setEnabled
    );
    return () => subscription.remove();
  }, []);

  return enabled;
}

// ============================================================================
// Accessibility Announcements
// ============================================================================

/**
 * Announce a message to VoiceOver/TalkBack
 */
export function announceForAccessibility(message: string): void {
  AccessibilityInfo.announceForAccessibility(message);
}

/**
 * Announce a message with a priority/politeness level
 * On iOS, this uses setAccessibilityFocus after a delay
 */
export function announceWithPriority(
  message: string,
  options?: { delay?: number; interruptCurrent?: boolean }
): void {
  const { delay = 0, interruptCurrent = false } = options ?? {};

  if (interruptCurrent && Platform.OS === "ios") {
    // Force announcement by setting accessibility focus
    setTimeout(() => {
      announceForAccessibility(message);
    }, delay);
  } else {
    if (delay > 0) {
      setTimeout(() => announceForAccessibility(message), delay);
    } else {
      announceForAccessibility(message);
    }
  }
}

// ============================================================================
// Accessibility Props Helpers
// ============================================================================

/**
 * Create standard accessibility props for a button
 */
export function createButtonA11yProps(
  label: string,
  options?: {
    hint?: string;
    state?: "disabled" | "selected" | "checked" | "busy";
    role?: "button" | "link" | "tab" | "switch" | "checkbox" | "radio";
  }
) {
  const { hint, state, role = "button" } = options ?? {};

  return {
    accessible: true,
    accessibilityRole: role,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityState: state
      ? {
          disabled: state === "disabled",
          selected: state === "selected",
          checked: state === "checked" ? true : undefined,
          busy: state === "busy",
        }
      : undefined,
  };
}

/**
 * Create accessibility props for a text input
 */
export function createInputA11yProps(
  label: string,
  options?: {
    hint?: string;
    value?: string;
    error?: string;
    required?: boolean;
  }
) {
  const { hint, error, required } = options ?? {};

  const combinedHint = [hint, required && "Required", error && `Error: ${error}`]
    .filter(Boolean)
    .join(". ");

  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: combinedHint || undefined,
    accessibilityState: {
      disabled: false,
    },
  };
}

/**
 * Create accessibility props for a list item
 */
export function createListItemA11yProps(
  label: string,
  options?: {
    position?: number;
    total?: number;
    hint?: string;
    selected?: boolean;
  }
) {
  const { position, total, hint, selected } = options ?? {};

  const positionInfo =
    position !== undefined && total !== undefined
      ? `${position} of ${total}`
      : undefined;

  return {
    accessible: true,
    accessibilityLabel: [label, positionInfo].filter(Boolean).join(", "),
    accessibilityHint: hint,
    accessibilityState: selected !== undefined ? { selected } : undefined,
  };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  useAccessibilityState,
  useScreenReader,
  useReduceMotion,
  announceForAccessibility,
  announceWithPriority,
  getFontScale,
  getDynamicTypeSize,
  scaleFontSize,
  isLargeTextEnabled,
  isAccessibilityTextEnabled,
  createButtonA11yProps,
  createInputA11yProps,
  createListItemA11yProps,
};
