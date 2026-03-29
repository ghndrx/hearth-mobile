/**
 * OnboardingFlow Component
 * 
 * Main onboarding carousel component with step progression.
 */

import React, { useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  Dimensions,
  FlatList,
  ViewToken,
} from "react-native";
import { router } from "expo-router";
import Animated, {
  useSharedValue,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../ui";
import { OnboardingProgressBar } from "./OnboardingProgressBar";
import { OnboardingStepContent, OnboardingPaginationDot } from "./OnboardingStepContent";
import { useOnboarding } from "../../lib/hooks/useOnboarding";
import { OnboardingStep } from "../../lib/types/onboarding";

const { width } = Dimensions.get("window");

interface OnboardingFlowProps {
  onComplete?: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const flatListRef = useRef<FlatList>(null);

  const {
    currentFlow,
    currentStepIndex,
    isLastStep,
    completeCurrentStep,
    skipCurrentStep,
    goToStep,
  } = useOnboarding();

  const scrollX = useSharedValue(0);

  const steps = currentFlow?.steps || [];
  const completedSteps = currentFlow?.completedStepIds || [];

  const handleViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        const newIndex = viewableItems[0].index;
        if (newIndex !== currentStepIndex) {
          goToStep(newIndex);
        }
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      scrollX.value = event.nativeEvent.contentOffset.x;
    },
    []
  );

  const handleNext = async () => {
    if (isLastStep) {
      await completeCurrentStep();
      onComplete?.();
      router.replace("/welcome");
    } else {
      const nextIndex = currentStepIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      await goToStep(nextIndex);
    }
  };

  const handleSkip = async () => {
    await skipCurrentStep();
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }
    // If after skipping we're at the last step and skip it, complete
    const flow = currentFlow;
    if (flow && flow.currentStepIndex >= flow.steps.length - 1) {
      onComplete?.();
      router.replace("/welcome");
    }
  };

  const handleComplete = async () => {
    await completeCurrentStep();
    onComplete?.();
    router.replace("/welcome");
  };

  const handleInteractiveTutorialComplete = useCallback(async () => {
    await completeCurrentStep();
  }, [completeCurrentStep]);

  const handleInteractiveTutorialSkip = useCallback(async () => {
    await skipCurrentStep();
  }, [skipCurrentStep]);

  const handleInteractiveTutorialHintRequested = useCallback((gestureIndex: number) => {
    // Could track analytics or show additional guidance
    console.log(`Hint requested for gesture index: ${gestureIndex}`);
  }, []);

  const renderStep = useCallback(
    ({ item, index }: { item: OnboardingStep; index: number }) => (
      <OnboardingStepContent
        step={item}
        stepIndex={index}
        scrollX={scrollX}
        isActive={index === currentStepIndex}
        onInteractiveTutorialComplete={handleInteractiveTutorialComplete}
        onInteractiveTutorialSkip={handleInteractiveTutorialSkip}
        onInteractiveTutorialHintRequested={handleInteractiveTutorialHintRequested}
      />
    ),
    [currentStepIndex, scrollX, handleInteractiveTutorialComplete, handleInteractiveTutorialSkip, handleInteractiveTutorialHintRequested]
  );

  const keyExtractor = useCallback((item: OnboardingStep) => item.id, []);

  const currentStep = steps[currentStepIndex];

  if (!currentFlow || steps.length === 0) {
    return (
      <View style={[styles.container, isDark ? styles.containerDark : styles.containerLight]}>
        <Text style={[styles.errorText, isDark ? styles.errorTextDark : styles.errorTextLight]}>
          No onboarding flow available
        </Text>
        <Button title="Start Onboarding" onPress={() => router.replace("/onboarding")} />
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark ? styles.containerDark : styles.containerLight]}>
      {/* Skip Button */}
      {currentStep?.skippable && (
        <Animated.View
          entering={FadeInDown.delay(200).duration(400)}
          style={styles.skipContainer}
        >
          <Button
            title="Skip"
            variant="ghost"
            size="sm"
            onPress={handleSkip}
          />
        </Animated.View>
      )}

      {/* Progress Bar */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.progressContainer}>
        <OnboardingProgressBar
          currentStep={currentStepIndex}
          totalSteps={steps.length}
          completedSteps={completedSteps}
        />
      </Animated.View>

      {/* Steps Carousel */}
      <FlatList
        ref={flatListRef}
        data={steps}
        renderItem={renderStep}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        initialScrollIndex={currentStepIndex}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />

      {/* Pagination Dots */}
      <View style={styles.paginationContainer}>
        {steps.map((step, index) => (
          <OnboardingPaginationDot
            key={step.id}
            index={index}
            totalSteps={steps.length}
            scrollX={scrollX}
            isDark={isDark}
          />
        ))}
      </View>

      {/* Bottom Actions */}
      <Animated.View
        entering={FadeInUp.delay(400).springify()}
        style={styles.actionsContainer}
      >
        {currentStep?.actionLabel && (
          <Button
            title={currentStep.actionLabel}
            variant="secondary"
            onPress={handleNext}
            fullWidth
            size="lg"
          />
        )}
        <Button
          title={isLastStep ? "Get Started" : "Continue"}
          onPress={isLastStep ? handleComplete : handleNext}
          fullWidth
          size="lg"
          style={!currentStep?.actionLabel ? {} : { marginTop: 12 }}
        />
      </Animated.View>
    </View>
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
  skipContainer: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
  },
  progressContainer: {
    marginTop: 60,
    marginBottom: 20,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  actionsContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  errorTextLight: {
    color: "#6b7280",
  },
  errorTextDark: {
    color: "#9ca3af",
  },
});
