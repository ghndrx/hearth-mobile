import React, { useCallback, useRef } from "react";
import { View, Text, StyleSheet} from "react-native";
import { useColorScheme } from "../../lib/hooks/useColorScheme";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { MessageBubble, Message } from "./MessageBubble";

// ============================================================================
// Constants
// ============================================================================

const SWIPE_THRESHOLD = 70;
const MAX_SWIPE = 100;
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.5,
};

// ============================================================================
// Types
// ============================================================================

interface SwipeableMessageProps {
  message: Message;
  showAvatar?: boolean;
  consecutive?: boolean;
  onReply?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  onLongPress?: (message: Message) => void;
  onRetry?: (message: Message) => void;
  /** Disable delete swipe for non-current user messages */
  allowDelete?: boolean;
}

// ============================================================================
// SwipeableMessage Component
// ============================================================================

export function SwipeableMessage({
  message,
  showAvatar = true,
  consecutive = false,
  onReply,
  onDelete,
  onReaction,
  onLongPress,
  onRetry,
  allowDelete = true,
}: SwipeableMessageProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const translateX = useSharedValue(0);
  const hasTriggeredHaptic = useRef({ left: false, right: false });

  // Trigger haptic when crossing threshold
  const triggerHaptic = useCallback((direction: "left" | "right") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    hasTriggeredHaptic.current[direction] = true;
  }, []);

  // Reset haptic triggers
  const resetHapticTriggers = useCallback(() => {
    hasTriggeredHaptic.current = { left: false, right: false };
  }, []);

  // Handle reply action
  const handleReply = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onReply?.(message);
  }, [message, onReply]);

  // Handle delete action
  const handleDelete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDelete?.(message);
  }, [message, onDelete]);

  // Pan gesture for swipe actions
  const panGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      const clampedTranslation = Math.max(
        -MAX_SWIPE,
        Math.min(MAX_SWIPE, event.translationX)
      );

      // Only allow right swipe for delete on current user's messages
      if (clampedTranslation > 0 && (!message.isCurrentUser || !allowDelete)) {
        translateX.value = 0;
        return;
      }

      translateX.value = clampedTranslation;

      // Check for threshold crossing and trigger haptics
      if (
        clampedTranslation < -SWIPE_THRESHOLD &&
        !hasTriggeredHaptic.current.left
      ) {
        runOnJS(triggerHaptic)("left");
      } else if (
        clampedTranslation >= -SWIPE_THRESHOLD &&
        hasTriggeredHaptic.current.left
      ) {
        hasTriggeredHaptic.current.left = false;
      }

      if (
        clampedTranslation > SWIPE_THRESHOLD &&
        !hasTriggeredHaptic.current.right
      ) {
        runOnJS(triggerHaptic)("right");
      } else if (
        clampedTranslation <= SWIPE_THRESHOLD &&
        hasTriggeredHaptic.current.right
      ) {
        hasTriggeredHaptic.current.right = false;
      }
    })
    .onEnd((event) => {
      const clampedTranslation = Math.max(
        -MAX_SWIPE,
        Math.min(MAX_SWIPE, event.translationX)
      );

      // Trigger action if past threshold
      if (clampedTranslation < -SWIPE_THRESHOLD && onReply) {
        runOnJS(handleReply)();
      } else if (
        clampedTranslation > SWIPE_THRESHOLD &&
        message.isCurrentUser &&
        allowDelete &&
        onDelete
      ) {
        runOnJS(handleDelete)();
      }

      // Spring back to center
      translateX.value = withSpring(0, SPRING_CONFIG);
      runOnJS(resetHapticTriggers)();
    });

  // Animated style for message row
  const animatedRowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Animated style for left action (reply - revealed on left swipe)
  const animatedLeftActionStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD / 2, 0],
      [1, 0.5, 0],
      Extrapolation.CLAMP
    );

    const scale = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD / 2, 0],
      [1, 0.8, 0.5],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  // Animated style for right action (delete - revealed on right swipe)
  const animatedRightActionStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD / 2, SWIPE_THRESHOLD],
      [0, 0.5, 1],
      Extrapolation.CLAMP
    );

    const scale = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD / 2, SWIPE_THRESHOLD],
      [0.5, 0.8, 1],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  // Background colors based on swipe direction
  const leftActionBg = isDark ? "#5865f2" : "#5865f2"; // Brand/reply
  const rightActionBg = isDark ? "#ef4444" : "#ef4444"; // Red/delete

  return (
    <View style={styles.container}>
      {/* Left action indicator (Reply) - appears on right side when swiping left */}
      <Animated.View
        style={[
          styles.actionIndicator,
          styles.leftAction,
          { backgroundColor: leftActionBg },
          animatedLeftActionStyle,
        ]}
      >
        <Ionicons name="arrow-undo" size={20} color="#ffffff" />
        <Text style={styles.actionText}>Reply</Text>
      </Animated.View>

      {/* Right action indicator (Delete) - appears on left side when swiping right */}
      {message.isCurrentUser && allowDelete && (
        <Animated.View
          style={[
            styles.actionIndicator,
            styles.rightAction,
            { backgroundColor: rightActionBg },
            animatedRightActionStyle,
          ]}
        >
          <Ionicons name="trash-outline" size={20} color="#ffffff" />
          <Text style={styles.actionText}>Delete</Text>
        </Animated.View>
      )}

      {/* Swipeable message */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.messageRow, animatedRowStyle]}>
          <MessageBubble
            message={message}
            showAvatar={showAvatar}
            consecutive={consecutive}
            onReaction={onReaction}
            onLongPress={onLongPress}
            onRetry={onRetry}
            onDelete={onDelete}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// ============================================================================
// SwipeableMessageGroup Component
// ============================================================================

interface SwipeableMessageGroupProps {
  messages: Message[];
  onReply?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  onLongPress?: (message: Message) => void;
  onRetry?: (message: Message) => void;
}

export function SwipeableMessageGroup({
  messages,
  onReply,
  onDelete,
  onReaction,
  onLongPress,
  onRetry,
}: SwipeableMessageGroupProps) {
  return (
    <View>
      {messages.map((message, index) => {
        const prevMessage = index > 0 ? messages[index - 1] : null;
        const isConsecutive =
          prevMessage !== null &&
          prevMessage.senderId === message.senderId &&
          message.timestamp.getTime() - prevMessage.timestamp.getTime() <
            5 * 60 * 1000;

        return (
          <SwipeableMessage
            key={message.localId || message.id}
            message={message}
            showAvatar={!isConsecutive}
            consecutive={isConsecutive}
            onReply={onReply}
            onDelete={onDelete}
            onReaction={onReaction}
            onLongPress={onLongPress}
            onRetry={onRetry}
            allowDelete={message.isCurrentUser}
          />
        );
      })}
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  messageRow: {
    backgroundColor: "transparent",
  },
  actionIndicator: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  leftAction: {
    right: 8,
  },
  rightAction: {
    left: 8,
  },
  actionText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
});

export default SwipeableMessage;
