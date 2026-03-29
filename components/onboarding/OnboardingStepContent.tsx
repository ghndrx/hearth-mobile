/**
 * OnboardingStepContent Component
 * 
 * Displays content for a single onboarding step.
 */

import React from "react";
import { StyleSheet, useColorScheme, Dimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
  FadeIn,
  FadeInUp,
  useSharedValue,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingStep } from "../../lib/types/onboarding";

const { width } = Dimensions.get("window");

interface OnboardingStepContentProps {
  step: OnboardingStep;
  stepIndex: number;
  scrollX: Animated.SharedValue<number>;
  isActive?: boolean;
}

export function OnboardingStepContent({
  step,
  stepIndex,
  scrollX,
  isActive = true,
}: OnboardingStepContentProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (stepIndex - 1) * width,
      stepIndex * width,
      (stepIndex + 1) * width,
    ];

    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.8, 1, 0.8],
      Extrapolate.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.5, 1, 0.5],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[styles.container, animatedStyle]}
      entering={FadeIn.duration(300)}
    >
      {/* Icon Container */}
      <Animated.View
        entering={FadeInUp.delay(100).springify()}
        style={[
          styles.iconContainer,
          { backgroundColor: step.iconColor + "20" },
        ]}
      >
        <Animated.View
          style={[
            styles.iconInner,
            { backgroundColor: step.iconColor },
          ]}
        >
          <Ionicons name={step.icon as any} size={48} color="white" />
        </Animated.View>
      </Animated.View>

      {/* Title */}
      <Animated.Text
        entering={FadeInUp.delay(200).springify()}
        style={[
          styles.title,
          isDark ? styles.titleDark : styles.titleLight,
        ]}
      >
        {step.title}
      </Animated.Text>

      {/* Description */}
      <Animated.Text
        entering={FadeInUp.delay(300).springify()}
        style={[
          styles.description,
          isDark ? styles.descriptionDark : styles.descriptionLight,
        ]}
      >
        {step.content}
      </Animated.Text>

      {/* Step Type Badge */}
      <Animated.View
        entering={FadeInUp.delay(400).springify()}
        style={[
          styles.badge,
          { backgroundColor: step.iconColor + "15" },
        ]}
      >
        <Animated.Text style={[styles.badgeText, { color: step.iconColor }]}>
          {step.type.charAt(0).toUpperCase() + step.type.slice(1)}
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}

interface OnboardingPaginationDotProps {
  index: number;
  totalSteps: number;
  scrollX: Animated.SharedValue<number>;
  isDark: boolean;
}

export function OnboardingPaginationDot({
  index,
  scrollX,
  isDark,
}: OnboardingPaginationDotProps) {
  const dotWidth = useSharedValue(8);

  React.useEffect(() => {
    dotWidth.value = withSpring(8, { damping: 15 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const widthValue = interpolate(
      scrollX.value,
      inputRange,
      [8, 24, 8],
      Extrapolate.CLAMP
    );

    return {
      width: widthValue,
    };
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        isDark ? styles.dotDark : styles.dotLight,
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  iconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  titleLight: {
    color: "#111827",
  },
  titleDark: {
    color: "#ffffff",
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 24,
  },
  descriptionLight: {
    color: "#6b7280",
  },
  descriptionDark: {
    color: "#9ca3af",
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotLight: {
    backgroundColor: "#d1d5db",
  },
  dotDark: {
    backgroundColor: "#4b5563",
  },
});
