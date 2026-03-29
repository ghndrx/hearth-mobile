/**
 * GestureTrainer Component
 *
 * Interactive gesture training component with haptic feedback for mobile gestures.
 * Teaches users how to perform common mobile gestures in the app.
 */

import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  Animated,
  PanResponder,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { haptic } from "../../lib/services/haptics";
import { GestureConfig, GestureType, SwipeDirection } from "../../lib/types/onboarding";

const { width, height } = Dimensions.get("window");

interface GestureTrainerProps {
  targetGesture: GestureConfig;
  onGestureCompleted: () => void;
  onGestureFailed: () => void;
  showHint?: boolean;
  practiceAreaStyle?: object;
}

export function GestureTrainer({
  targetGesture,
  onGestureCompleted,
  onGestureFailed,
  showHint = true,
  practiceAreaStyle,
}: GestureTrainerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [attempts, setAttempts] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');

  const animatedValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const feedbackOpacity = useRef(new Animated.Value(0)).current;

  const getGestureInstructions = useCallback((gesture: GestureConfig): string => {
    switch (gesture.type) {
      case "tap":
        return "Tap anywhere in the practice area";
      case "double_tap":
        return "Double-tap quickly in the practice area";
      case "long_press":
        return "Press and hold for 2 seconds";
      case "swipe":
        const direction = gesture.direction || "right";
        return `Swipe ${direction} across the practice area`;
      case "pinch":
        return "Use two fingers to pinch in or out";
      case "pull_to_refresh":
        return "Pull down from the top to refresh";
      default:
        return "Follow the gesture shown above";
    }
  }, []);

  const getGestureIcon = useCallback((gesture: GestureConfig): string => {
    switch (gesture.type) {
      case "tap":
        return "finger-print-outline";
      case "double_tap":
        return "hand-left-outline";
      case "long_press":
        return "hand-right-outline";
      case "swipe":
        const direction = gesture.direction || "right";
        return direction === "right" ? "arrow-forward-outline" :
               direction === "left" ? "arrow-back-outline" :
               direction === "up" ? "arrow-up-outline" : "arrow-down-outline";
      case "pinch":
        return "resize-outline";
      case "pull_to_refresh":
        return "refresh-outline";
      default:
        return "hand-left-outline";
    }
  }, []);

  const detectGesture = useCallback((gestureState: any) => {
    const { dx, dy, vx, vy } = gestureState;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const velocity = Math.sqrt(vx * vx + vy * vy);

    switch (targetGesture.type) {
      case "tap":
        // Simple tap detection - minimal movement
        return distance < 10;

      case "swipe":
        const minDistance = targetGesture.distance || 50;
        const direction = targetGesture.direction || "right";

        if (distance < minDistance) return false;

        switch (direction) {
          case "right":
            return dx > minDistance && Math.abs(dy) < Math.abs(dx);
          case "left":
            return dx < -minDistance && Math.abs(dy) < Math.abs(dx);
          case "up":
            return dy < -minDistance && Math.abs(dx) < Math.abs(dy);
          case "down":
            return dy > minDistance && Math.abs(dx) < Math.abs(dy);
        }
        return false;

      case "long_press":
        // Long press is handled by duration, not movement
        return distance < 15; // Allow minimal movement

      default:
        return false;
    }
  }, [targetGesture]);

  const showGestureFeedback = useCallback((success: boolean) => {
    setFeedbackType(success ? 'success' : 'error');
    setShowFeedback(true);

    Animated.sequence([
      Animated.timing(feedbackOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(1500),
      Animated.timing(feedbackOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      setShowFeedback(false);
    });
  }, [feedbackOpacity]);

  const handleGestureSuccess = useCallback(async () => {
    if (targetGesture.hapticFeedback) {
      await haptic.success();
    }
    showGestureFeedback(true);
    setTimeout(() => {
      onGestureCompleted();
    }, 1000);
  }, [targetGesture.hapticFeedback, onGestureCompleted, showGestureFeedback]);

  const handleGestureFailure = useCallback(async () => {
    if (targetGesture.hapticFeedback) {
      await haptic.error();
    }
    setAttempts(prev => prev + 1);
    showGestureFeedback(false);
    onGestureFailed();
  }, [targetGesture.hapticFeedback, onGestureFailed, showGestureFeedback]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,

    onPanResponderGrant: () => {
      setIsDetecting(true);
      if (targetGesture.hapticFeedback) {
        haptic.selection();
      }

      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    },

    onPanResponderMove: (_, gestureState) => {
      // Update visual feedback based on gesture progress
      if (targetGesture.type === "swipe") {
        const progress = Math.min(
          Math.sqrt(gestureState.dx ** 2 + gestureState.dy ** 2) / 100,
          1
        );
        animatedValue.setValue(progress);
      }
    },

    onPanResponderRelease: (_, gestureState) => {
      setIsDetecting(false);
      pulseValue.stopAnimation();
      pulseValue.setValue(1);

      // For tap gestures, check immediately
      if (targetGesture.type === "tap" || targetGesture.type === "double_tap") {
        if (detectGesture(gestureState)) {
          handleGestureSuccess();
        } else {
          handleGestureFailure();
        }
        return;
      }

      // For swipe gestures, check movement
      if (targetGesture.type === "swipe") {
        if (detectGesture(gestureState)) {
          handleGestureSuccess();
        } else {
          handleGestureFailure();
        }
        return;
      }
    },
  });

  // Handle long press separately
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const handleLongPressStart = useCallback(() => {
    if (targetGesture.type === "long_press") {
      setIsDetecting(true);
      if (targetGesture.hapticFeedback) {
        haptic.selection();
      }

      longPressTimer.current = setTimeout(() => {
        handleGestureSuccess();
      }, targetGesture.duration || 2000);
    }
  }, [targetGesture, handleGestureSuccess]);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      if (targetGesture.type === "long_press") {
        setIsDetecting(false);
        handleGestureFailure();
      }
    }
  }, [targetGesture.type, handleGestureFailure]);

  return (
    <View style={styles.container}>
      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <View style={[styles.iconContainer, { backgroundColor: isDark ? "#374151" : "#f3f4f6" }]}>
          <Ionicons
            name={getGestureIcon(targetGesture) as any}
            size={48}
            color={isDark ? "#60a5fa" : "#3b82f6"}
          />
        </View>
        <Text style={[styles.instructions, isDark ? styles.textDark : styles.textLight]}>
          {getGestureInstructions(targetGesture)}
        </Text>
        {showHint && (
          <Text style={[styles.hint, isDark ? styles.hintDark : styles.hintLight]}>
            Attempts: {attempts}
          </Text>
        )}
      </View>

      {/* Practice Area */}
      <Animated.View
        style={[
          styles.practiceArea,
          {
            backgroundColor: isDark ? "#1f2937" : "#ffffff",
            borderColor: isDetecting ? (isDark ? "#60a5fa" : "#3b82f6") : (isDark ? "#374151" : "#e5e7eb"),
            transform: [{ scale: pulseValue }]
          },
          practiceAreaStyle,
        ]}
        {...(targetGesture.type === "long_press" ? {
          onTouchStart: handleLongPressStart,
          onTouchEnd: handleLongPressEnd,
        } : panResponder.panHandlers)}
      >
        <View style={styles.practiceContent}>
          <Text style={[styles.practiceText, isDark ? styles.textDark : styles.textLight]}>
            Practice Area
          </Text>
          <Text style={[styles.practiceSubtext, isDark ? styles.hintDark : styles.hintLight]}>
            Try the gesture here
          </Text>
        </View>

        {/* Visual feedback for swipe */}
        {targetGesture.type === "swipe" && (
          <Animated.View
            style={[
              styles.swipeIndicator,
              {
                opacity: animatedValue,
                backgroundColor: isDark ? "#60a5fa" : "#3b82f6",
              }
            ]}
          />
        )}
      </Animated.View>

      {/* Feedback Overlay */}
      {showFeedback && (
        <Animated.View
          style={[
            styles.feedbackOverlay,
            { opacity: feedbackOpacity }
          ]}
        >
          <View style={[
            styles.feedbackContent,
            {
              backgroundColor: feedbackType === 'success' ?
                (isDark ? "#065f46" : "#d1fae5") :
                (isDark ? "#7f1d1d" : "#fecaca")
            }
          ]}>
            <Ionicons
              name={feedbackType === 'success' ? "checkmark-circle" : "close-circle"}
              size={48}
              color={feedbackType === 'success' ? "#10b981" : "#ef4444"}
            />
            <Text style={[
              styles.feedbackText,
              {
                color: feedbackType === 'success' ? "#10b981" : "#ef4444"
              }
            ]}>
              {feedbackType === 'success' ? "Great job!" : "Try again!"}
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  instructionsContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  instructions: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    textAlign: "center",
  },
  textLight: {
    color: "#111827",
  },
  textDark: {
    color: "#ffffff",
  },
  hintLight: {
    color: "#6b7280",
  },
  hintDark: {
    color: "#9ca3af",
  },
  practiceArea: {
    width: width - 40,
    height: 200,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  practiceContent: {
    alignItems: "center",
  },
  practiceText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  practiceSubtext: {
    fontSize: 14,
  },
  swipeIndicator: {
    position: "absolute",
    width: "100%",
    height: 4,
    bottom: 20,
    borderRadius: 2,
  },
  feedbackOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  feedbackContent: {
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
    minWidth: 200,
  },
  feedbackText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 12,
  },
});