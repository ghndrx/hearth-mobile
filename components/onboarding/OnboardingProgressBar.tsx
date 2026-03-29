/**
 * OnboardingProgressBar Component
 * 
 * Shows progress through the onboarding flow.
 */

import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

interface OnboardingProgressBarProps {
  currentStep: number;
  totalSteps: number;
  completedSteps?: string[];
}

export function OnboardingProgressBar({
  currentStep,
  totalSteps,
  completedSteps = [],
}: OnboardingProgressBarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const progress = totalSteps > 0 ? ((currentStep + (completedSteps.length > currentStep ? 1 : 0)) / totalSteps) * 100 : 0;

  const progressWidth = useSharedValue(0);

  React.useEffect(() => {
    progressWidth.value = withSpring(progress, {
      damping: 15,
      stiffness: 100,
    });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.track,
          isDark ? styles.trackDark : styles.trackLight,
        ]}
      >
        <Animated.View
          style={[
            styles.fill,
            isDark ? styles.fillDark : styles.fillLight,
            animatedStyle,
          ]}
        />
      </View>
      <Text
        style={[
          styles.label,
          isDark ? styles.labelDark : styles.labelLight,
        ]}
      >
        Step {currentStep + 1} of {totalSteps}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 20,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  trackLight: {
    backgroundColor: "#e5e7eb",
  },
  trackDark: {
    backgroundColor: "#374151",
  },
  fill: {
    height: "100%",
    borderRadius: 2,
  },
  fillLight: {
    backgroundColor: "#5865f2",
  },
  fillDark: {
    backgroundColor: "#7289da",
  },
  label: {
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  labelLight: {
    color: "#6b7280",
  },
  labelDark: {
    color: "#9ca3af",
  },
});
