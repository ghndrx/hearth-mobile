import React from "react";
import {
  RefreshControl,
  RefreshControlProps,
  Platform,
  useColorScheme,
} from "react-native";

// ============================================================================
// Types
// ============================================================================

interface PlatformRefreshControlProps
  extends Omit<RefreshControlProps, "colors" | "tintColor" | "progressBackgroundColor"> {
  /** Override the brand color */
  brandColor?: string;
  /** Override the secondary brand color (Android only, multi-color spinner) */
  secondaryColor?: string;
}

// ============================================================================
// Constants
// ============================================================================

const BRAND_PRIMARY = "#5865f2"; // Discord-like brand blue
const BRAND_SECONDARY = "#7289da";
const BRAND_SUCCESS = "#3ba55c";

// ============================================================================
// Component
// ============================================================================

/**
 * Platform-aware RefreshControl with proper iOS/Android styling.
 * - iOS: Uses tintColor with native pull-to-refresh feel
 * - Android: Uses multi-color Material spinner with progress background
 */
export function PlatformRefreshControl({
  refreshing,
  onRefresh,
  brandColor = BRAND_PRIMARY,
  secondaryColor = BRAND_SECONDARY,
  ...props
}: PlatformRefreshControlProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Platform-specific props
  const platformProps =
    Platform.OS === "ios"
      ? {
          // iOS uses a simple tint color
          tintColor: brandColor,
        }
      : {
          // Android uses an array of colors for the spinning indicator
          // and a background color for the refresh indicator circle
          colors: [brandColor, secondaryColor, BRAND_SUCCESS],
          progressBackgroundColor: isDark ? "#2b2d31" : "#ffffff",
        };

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      {...platformProps}
      {...props}
    />
  );
}

// ============================================================================
// Export
// ============================================================================

export default PlatformRefreshControl;
