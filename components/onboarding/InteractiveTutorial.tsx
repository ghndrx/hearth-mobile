/**
 * InteractiveTutorial Component
 *
 * Complete interactive tutorial system for gesture-based learning.
 * Combines multiple gesture trainers and provides progress tracking.
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  SafeAreaView,
  ScrollView,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../ui";
import { GestureTrainer } from "./GestureTrainer";
import { haptic } from "../../lib/services/haptics";
import { InteractiveTutorialConfig, OnboardingStep } from "../../lib/types/onboarding";

interface InteractiveTutorialProps {
  step: OnboardingStep;
  onComplete: () => void;
  onSkip: () => void;
  onHintRequested: (gestureIndex: number) => void;
}

export function InteractiveTutorial({
  step,
  onComplete,
  onSkip,
  onHintRequested,
}: InteractiveTutorialProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [currentGestureIndex, setCurrentGestureIndex] = useState(0);
  const [completedGestures, setCompletedGestures] = useState<Set<number>>(new Set());
  const [showHints, setShowHints] = useState(false);
  const [attemptCounts, setAttemptCounts] = useState<Record<number, number>>({});

  const gestureTraining = step.gestureTraining;
  const interactiveConfig = step.interactiveConfig;

  useEffect(() => {
    // Initialize attempt counts
    if (gestureTraining) {
      const initialCounts: Record<number, number> = {};
      gestureTraining.targetGestures.forEach((_, index) => {
        initialCounts[index] = 0;
      });
      setAttemptCounts(initialCounts);
    }
  }, [gestureTraining]);

  const handleGestureCompleted = useCallback(async () => {
    if (!gestureTraining) return;

    const newCompleted = new Set(completedGestures);
    newCompleted.add(currentGestureIndex);
    setCompletedGestures(newCompleted);

    await haptic.success();

    // Check if all gestures are completed
    if (newCompleted.size === gestureTraining.targetGestures.length) {
      setTimeout(() => {
        onComplete();
      }, 1500);
      return;
    }

    // Move to next gesture
    setTimeout(() => {
      const nextIndex = currentGestureIndex + 1;
      if (nextIndex < gestureTraining.targetGestures.length) {
        setCurrentGestureIndex(nextIndex);
      }
    }, 1500);
  }, [currentGestureIndex, completedGestures, gestureTraining, onComplete]);

  const handleGestureFailed = useCallback(() => {
    setAttemptCounts(prev => ({
      ...prev,
      [currentGestureIndex]: (prev[currentGestureIndex] || 0) + 1,
    }));

    // Show hints after 3 failed attempts
    if ((attemptCounts[currentGestureIndex] || 0) >= 2) {
      setShowHints(true);
      onHintRequested(currentGestureIndex);
    }
  }, [currentGestureIndex, attemptCounts, onHintRequested]);

  const handleSkipGesture = useCallback(() => {
    if (!gestureTraining) return;

    if (currentGestureIndex < gestureTraining.targetGestures.length - 1) {
      setCurrentGestureIndex(prev => prev + 1);
    } else {
      onSkip();
    }
  }, [currentGestureIndex, gestureTraining, onSkip]);

  const handlePreviousGesture = useCallback(() => {
    if (currentGestureIndex > 0) {
      setCurrentGestureIndex(prev => prev - 1);
    }
  }, [currentGestureIndex]);

  const renderProgressIndicator = useCallback(() => {
    if (!gestureTraining) return null;

    const totalGestures = gestureTraining.targetGestures.length;
    const progressPercentage = (completedGestures.size / totalGestures) * 100;

    return (
      <View style={styles.progressContainer}>
        <View style={[styles.progressTrack, { backgroundColor: isDark ? "#374151" : "#e5e7eb" }]}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: `${progressPercentage}%`,
                backgroundColor: isDark ? "#60a5fa" : "#3b82f6",
              },
            ]}
          />
        </View>
        <Text style={[styles.progressText, isDark ? styles.textDark : styles.textLight]}>
          {completedGestures.size} of {totalGestures} gestures completed
        </Text>
      </View>
    );
  }, [gestureTraining, completedGestures.size, isDark]);

  const renderGestureList = useCallback(() => {
    if (!gestureTraining) return null;

    return (
      <View style={styles.gestureListContainer}>
        {gestureTraining.targetGestures.map((gesture, index) => {
          const isCompleted = completedGestures.has(index);
          const isCurrent = index === currentGestureIndex;

          return (
            <Animated.View
              key={index}
              style={[
                styles.gestureListItem,
                {
                  backgroundColor: isCurrent
                    ? (isDark ? "#1e40af" : "#dbeafe")
                    : (isDark ? "#374151" : "#f3f4f6"),
                  borderColor: isCurrent
                    ? (isDark ? "#3b82f6" : "#2563eb")
                    : "transparent",
                },
              ]}
              entering={FadeIn.delay(index * 100)}
            >
              <View style={styles.gestureListItemContent}>
                <Ionicons
                  name={isCompleted ? "checkmark-circle" : "ellipse-outline"}
                  size={20}
                  color={
                    isCompleted ? "#10b981" :
                    isCurrent ? (isDark ? "#60a5fa" : "#3b82f6") :
                    (isDark ? "#6b7280" : "#9ca3af")
                  }
                />
                <Text
                  style={[
                    styles.gestureListItemText,
                    {
                      color: isCurrent
                        ? (isDark ? "#ffffff" : "#1f2937")
                        : (isDark ? "#d1d5db" : "#6b7280"),
                      fontWeight: isCurrent ? "600" : "400",
                    },
                  ]}
                >
                  {gesture.type.charAt(0).toUpperCase() + gesture.type.slice(1).replace("_", " ")}
                </Text>
              </View>
            </Animated.View>
          );
        })}
      </View>
    );
  }, [gestureTraining, completedGestures, currentGestureIndex, isDark]);

  const renderHints = useCallback(() => {
    if (!showHints || !interactiveConfig || !interactiveConfig.hints) return null;

    return (
      <Animated.View
        entering={FadeInDown.delay(300)}
        exiting={FadeOut}
        style={[
          styles.hintsContainer,
          { backgroundColor: isDark ? "#374151" : "#f3f4f6" },
        ]}
      >
        <View style={styles.hintsHeader}>
          <Ionicons name="bulb-outline" size={20} color={isDark ? "#fbbf24" : "#f59e0b"} />
          <Text style={[styles.hintsTitle, isDark ? styles.textDark : styles.textLight]}>
            Need help?
          </Text>
        </View>
        {interactiveConfig.hints.map((hint, index) => (
          <Text
            key={index}
            style={[styles.hintText, isDark ? styles.hintDark : styles.hintLight]}
          >
            • {hint}
          </Text>
        ))}
        <Button
          title="Hide Hints"
          variant="ghost"
          size="sm"
          onPress={() => setShowHints(false)}
          style={styles.hideHintsButton}
        />
      </Animated.View>
    );
  }, [showHints, interactiveConfig, isDark]);

  if (!gestureTraining || gestureTraining.targetGestures.length === 0) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={[styles.errorText, isDark ? styles.textDark : styles.textLight]}>
          No gesture training configured for this step.
        </Text>
        <Button title="Continue" onPress={onComplete} />
      </View>
    );
  }

  const currentGesture = gestureTraining.targetGestures[currentGestureIndex];
  const isLastGesture = currentGestureIndex === gestureTraining.targetGestures.length - 1;
  const allGesturesCompleted = completedGestures.size === gestureTraining.targetGestures.length;

  return (
    <SafeAreaView style={[styles.container, isDark ? styles.containerDark : styles.containerLight]}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Header */}
        <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
          <Text style={[styles.title, isDark ? styles.textDark : styles.textLight]}>
            {step.title}
          </Text>
          <Text style={[styles.description, isDark ? styles.hintDark : styles.hintLight]}>
            {step.content}
          </Text>
        </Animated.View>

        {/* Progress */}
        {renderProgressIndicator()}

        {/* Gesture List */}
        {renderGestureList()}

        {/* Current Gesture Trainer */}
        {!allGesturesCompleted && (
          <Animated.View
            key={currentGestureIndex}
            entering={SlideInRight.duration(300)}
            exiting={SlideOutLeft.duration(200)}
            style={styles.trainerContainer}
          >
            <GestureTrainer
              targetGesture={currentGesture}
              onGestureCompleted={handleGestureCompleted}
              onGestureFailed={handleGestureFailed}
              showHint={attemptCounts[currentGestureIndex] > 0}
              practiceAreaStyle={gestureTraining.practiceArea}
            />
          </Animated.View>
        )}

        {/* Success Message */}
        {allGesturesCompleted && (
          <Animated.View
            entering={FadeIn.duration(600)}
            style={[
              styles.successContainer,
              { backgroundColor: isDark ? "#065f46" : "#d1fae5" },
            ]}
          >
            <Ionicons name="checkmark-circle" size={48} color="#10b981" />
            <Text style={[styles.successTitle, { color: "#10b981" }]}>
              {gestureTraining.successMessage}
            </Text>
            <Text style={[styles.successSubtext, { color: "#059669" }]}>
              You've mastered all the gestures! Great job!
            </Text>
          </Animated.View>
        )}

        {/* Hints */}
        {renderHints()}
      </ScrollView>

      {/* Bottom Actions */}
      <Animated.View
        entering={FadeInDown.delay(800)}
        style={styles.actionsContainer}
      >
        {currentGestureIndex > 0 && !allGesturesCompleted && (
          <Button
            title="Previous"
            variant="ghost"
            onPress={handlePreviousGesture}
            style={styles.actionButton}
          />
        )}

        {!allGesturesCompleted && (
          <>
            {!showHints && attemptCounts[currentGestureIndex] > 0 && (
              <Button
                title="Show Hints"
                variant="secondary"
                onPress={() => setShowHints(true)}
                style={styles.actionButton}
              />
            )}

            <Button
              title={isLastGesture ? "Skip Tutorial" : "Skip Gesture"}
              variant="ghost"
              onPress={handleSkipGesture}
              style={styles.actionButton}
            />
          </>
        )}

        {allGesturesCompleted && (
          <Button
            title="Continue"
            onPress={onComplete}
            fullWidth
            size="lg"
          />
        )}
      </Animated.View>
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
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
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
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    textAlign: "center",
  },
  gestureListContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  gestureListItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
  },
  gestureListItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  gestureListItemText: {
    fontSize: 16,
    marginLeft: 12,
  },
  trainerContainer: {
    flex: 1,
    minHeight: 300,
  },
  successContainer: {
    marginHorizontal: 24,
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 12,
  },
  successSubtext: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 8,
  },
  hintsContainer: {
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  hintsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  hintsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  hintText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  hideHintsButton: {
    marginTop: 12,
    alignSelf: "flex-start",
  },
  actionsContainer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
});