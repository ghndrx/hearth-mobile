import React, { useEffect } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  Text} from "react-native";
import { useColorScheme } from "../../lib/hooks/useColorScheme";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

// ============================================================================
// Types
// ============================================================================

interface ScrollToBottomFabProps {
  /** Whether the FAB should be visible */
  visible: boolean;
  /** Number of new messages since scroll position */
  newMessageCount?: number;
  /** Callback when FAB is pressed */
  onPress: () => void;
  /** Position from bottom edge */
  bottomOffset?: number;
  /** Position from right edge */
  rightOffset?: number;
}

// ============================================================================
// ScrollToBottomFab Component
// ============================================================================

export function ScrollToBottomFab({
  visible,
  newMessageCount = 0,
  onPress,
  bottomOffset = 80, // Above composer
  rightOffset = 16,
}: ScrollToBottomFabProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Animation values
  const scale = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 15, stiffness: 200 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
    } else {
      scale.value = withTiming(0, { duration: 150 });
      translateY.value = withTiming(20, { duration: 150 });
    }
  }, [visible, scale, translateY]);

  // Badge pulse when new messages arrive
  const badgeScale = useSharedValue(1);
  const prevCount = useSharedValue(newMessageCount);

  useEffect(() => {
    if (newMessageCount > prevCount.value && newMessageCount > 0) {
      badgeScale.value = withSpring(1.2, { damping: 8, stiffness: 300 });
      setTimeout(() => {
        badgeScale.value = withSpring(1, { damping: 12, stiffness: 200 });
      }, 100);
    }
    prevCount.value = newMessageCount;
  }, [newMessageCount, badgeScale, prevCount]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
    opacity: interpolate(scale.value, [0, 0.5, 1], [0, 1, 1], Extrapolation.CLAMP),
  }));

  const animatedBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const backgroundColor = isDark ? "#2b2d31" : "#ffffff";
  const borderColor = isDark ? "#3f4147" : "#e5e7eb";
  const iconColor = isDark ? "#b5bac1" : "#6b7280";
  const shadowColor = isDark ? "#000000" : "#000000";

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: bottomOffset,
          right: rightOffset,
        },
        animatedContainerStyle,
      ]}
      pointerEvents={visible ? "auto" : "none"}
    >
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        style={[
          styles.fab,
          {
            backgroundColor,
            borderColor,
            shadowColor,
          },
        ]}
      >
        <Ionicons name="chevron-down" size={24} color={iconColor} />
      </TouchableOpacity>

      {/* New message count badge */}
      {newMessageCount > 0 && (
        <Animated.View style={[styles.badge, animatedBadgeStyle]}>
          <Text style={styles.badgeText}>
            {newMessageCount > 99 ? "99+" : newMessageCount}
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

// ============================================================================
// Hook for scroll tracking
// ============================================================================

interface UseScrollToBottomOptions {
  /** Threshold in pixels from bottom to consider "at bottom" */
  threshold?: number;
}

interface UseScrollToBottomReturn {
  /** Whether user has scrolled away from bottom */
  showFab: boolean;
  /** Handler for scroll events - call with content offset and content size */
  handleScroll: (offsetY: number, contentHeight: number, layoutHeight: number) => void;
  /** Mark as scrolled to bottom (call when auto-scrolling) */
  markAtBottom: () => void;
}

export function useScrollToBottom(
  options: UseScrollToBottomOptions = {}
): UseScrollToBottomReturn {
  const { threshold = 100 } = options;
  const [showFab, setShowFab] = React.useState(false);

  const handleScroll = React.useCallback(
    (offsetY: number, contentHeight: number, layoutHeight: number) => {
      const distanceFromBottom = contentHeight - offsetY - layoutHeight;
      const isAtBottom = distanceFromBottom < threshold;
      setShowFab(!isAtBottom);
    },
    [threshold]
  );

  const markAtBottom = React.useCallback(() => {
    setShowFab(false);
  }, []);

  return { showFab, handleScroll, markAtBottom };
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  badge: {
    position: "absolute",
    top: -8,
    right: -8,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#5865f2",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
});

export default ScrollToBottomFab;
