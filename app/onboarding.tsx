/**
 * Onboarding Screen
 * 
 * Main onboarding entry point with step progression.
 */

import React, { useEffect } from "react";
import { View, StyleSheet, useColorScheme, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { OnboardingFlow } from "../components/onboarding";
import { useOnboarding } from "../lib/hooks/useOnboarding";

export default function OnboardingScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { startFlow, isOnboardingComplete, hasSeenOnboarding } = useOnboarding();

  useEffect(() => {
    // Start the onboarding flow if not already started
    if (!hasSeenOnboarding) {
      startFlow("casual");
    }

    // If already completed, redirect to welcome
    if (isOnboardingComplete) {
      router.replace("/welcome");
    }
  }, [hasSeenOnboarding, isOnboardingComplete, startFlow]);

  const handleComplete = () => {
    // Analytics or other cleanup can happen here
    router.replace("/welcome");
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        isDark ? styles.containerDark : styles.containerLight,
      ]}
      edges={["top"]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <OnboardingFlow onComplete={handleComplete} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerLight: {
    backgroundColor: "#ffffff",
  },
  containerDark: {
    backgroundColor: "#1f2937",
  },
});
