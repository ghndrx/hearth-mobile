import React, { useEffect } from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";

// ============================================================================
// Types
// ============================================================================

interface UnreadBadgeProps {
  /** Number of unread messages */
  count: number;
  /** Whether there's a mention (@you) in unread messages */
  hasMention?: boolean;
  /** Maximum number to display (shows "99+" for higher) */
  maxCount?: number;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Animate on count change */
  animated?: boolean;
  /** Custom className for NativeWind styling */
  className?: string;
}

interface UnreadDotProps {
  /** Show the dot */
  visible: boolean;
  /** Whether there's a mention */
  hasMention?: boolean;
  /** Dot size */
  size?: "sm" | "md" | "lg";
  /** Pulse animation for new messages */
  pulse?: boolean;
}

interface UnreadBarProps {
  /** Number of new messages since last read */
  newCount: number;
  /** Callback when "Jump to new" is pressed */
  onPress?: () => void;
  /** Timestamp of first unread */
  timestamp?: Date;
}

// ============================================================================
// Size configurations
// ============================================================================

const SIZES = {
  sm: {
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    fontSize: 10,
    dotSize: 8,
  },
  md: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    fontSize: 12,
    dotSize: 10,
  },
  lg: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 8,
    fontSize: 14,
    dotSize: 12,
  },
};

// ============================================================================
// UnreadBadge Component
// ============================================================================

export function UnreadBadge({
  count,
  hasMention = false,
  maxCount = 99,
  size = "md",
  animated = true,
}: UnreadBadgeProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const config = SIZES[size];

  // Animation values
  const scale = useSharedValue(0);
  const previousCount = useSharedValue(count);

  useEffect(() => {
    if (count > 0 && previousCount.value === 0) {
      // Badge appearing
      scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    } else if (count === 0 && previousCount.value > 0) {
      // Badge disappearing
      scale.value = withTiming(0, { duration: 150 });
    } else if (count !== previousCount.value && animated) {
      // Count changed - bounce effect
      scale.value = withSequence(
        withSpring(1.2, { damping: 8, stiffness: 300 }),
        withSpring(1, { damping: 12, stiffness: 200 })
      );
    }
    previousCount.value = count;
  }, [count, animated, scale, previousCount]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: interpolate(scale.value, [0, 0.5, 1], [0, 1, 1]),
  }));

  if (count === 0) {
    return null;
  }

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();
  const backgroundColor = hasMention
    ? "#f04747" // Red for mentions
    : isDark
      ? "#5865f2" // Brand purple for dark
      : "#5865f2"; // Brand purple for light

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          minWidth: config.minWidth,
          height: config.height,
          paddingHorizontal: config.paddingHorizontal,
          backgroundColor,
        },
        animatedStyle,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          {
            fontSize: config.fontSize,
          },
        ]}
      >
        {displayCount}
      </Text>
    </Animated.View>
  );
}

// ============================================================================
// UnreadDot Component (simple indicator without count)
// ============================================================================

export function UnreadDot({
  visible,
  hasMention = false,
  size = "md",
  pulse = false,
}: UnreadDotProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const config = SIZES[size];

  // Animation values
  const scale = useSharedValue(visible ? 1 : 0);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(visible ? 1 : 0, {
      damping: 15,
      stiffness: 200,
    });
  }, [visible, scale]);

  useEffect(() => {
    if (pulse && visible) {
      // Continuous pulse effect
      const runPulse = () => {
        pulseScale.value = withSequence(
          withTiming(1.3, { duration: 600 }),
          withTiming(1, { duration: 600 })
        );
      };
      runPulse();
      const interval = setInterval(runPulse, 1200);
      return () => clearInterval(interval);
    } else {
      pulseScale.value = 1;
    }
    return undefined;
  }, [pulse, visible, pulseScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * pulseScale.value }],
    opacity: interpolate(scale.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const backgroundColor = hasMention
    ? "#f04747"
    : isDark
      ? "#ffffff"
      : "#5865f2";

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width: config.dotSize,
          height: config.dotSize,
          borderRadius: config.dotSize / 2,
          backgroundColor,
        },
        animatedStyle,
      ]}
    />
  );
}

// ============================================================================
// UnreadBar Component (divider in message list)
// ============================================================================

export function UnreadBar({
  newCount,
  onPress,
  timestamp,
}: UnreadBarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Entrance animation
  const translateY = useSharedValue(-20);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    opacity.value = withTiming(1, { duration: 300 });
  }, [translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Animated.View style={[styles.unreadBarContainer, animatedStyle]}>
      <View
        style={[
          styles.unreadBarLine,
          { backgroundColor: "#f04747" },
        ]}
      />
      <View
        style={[
          styles.unreadBarContent,
          {
            backgroundColor: isDark ? "#2b2d31" : "#f3f4f6",
          },
        ]}
        onTouchEnd={onPress}
      >
        <Text style={[styles.unreadBarText, { color: "#f04747" }]}>
          {newCount} new {newCount === 1 ? "message" : "messages"}
          {timestamp && ` • ${formatTime(timestamp)}`}
        </Text>
      </View>
      <View
        style={[
          styles.unreadBarLine,
          { backgroundColor: "#f04747" },
        ]}
      />
    </Animated.View>
  );
}

// ============================================================================
// Server Unread Pill (for server list sidebar)
// ============================================================================

interface ServerUnreadPillProps {
  /** Total unread messages across all channels */
  unreadCount: number;
  /** Number of mentions (@you, @role, @everyone) */
  mentionCount: number;
  /** Server has any unread content */
  hasUnread: boolean;
}

export function ServerUnreadPill({
  unreadCount: _unreadCount,
  mentionCount,
  hasUnread,
}: ServerUnreadPillProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Animation for pill appearance
  const width = useSharedValue(hasUnread ? 8 : 0);
  const opacity = useSharedValue(hasUnread ? 1 : 0);

  useEffect(() => {
    width.value = withSpring(hasUnread ? 8 : 0, {
      damping: 15,
      stiffness: 200,
    });
    opacity.value = withTiming(hasUnread ? 1 : 0, { duration: 200 });
  }, [hasUnread, width, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: width.value,
    opacity: opacity.value,
  }));

  // Determine pill color
  const backgroundColor = mentionCount > 0
    ? "#f04747" // Red for mentions
    : isDark
      ? "#ffffff" // White indicator in dark mode
      : "#5865f2"; // Brand in light mode

  return (
    <Animated.View
      style={[
        styles.serverPill,
        { backgroundColor },
        animatedStyle,
      ]}
    />
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "#ffffff",
    fontWeight: "700",
    textAlign: "center",
  },
  dot: {
    // Size set dynamically
  },
  unreadBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  unreadBarLine: {
    flex: 1,
    height: 1,
  },
  unreadBarContent: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  unreadBarText: {
    fontSize: 12,
    fontWeight: "600",
  },
  serverPill: {
    height: 40,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    position: "absolute",
    left: 0,
  },
});

export default UnreadBadge;
