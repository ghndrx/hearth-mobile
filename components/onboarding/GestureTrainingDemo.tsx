/**
 * GestureTrainingDemo Component
 *
 * Comprehensive demo and testing component for all gesture training tutorials.
 * Showcases different types of gestures: swipe, tap, long-press, pinch, etc.
 * Useful for development, testing, and showcasing the gesture training system.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Button } from "../ui";
import { GestureTrainer } from "./GestureTrainer";
import { InteractiveTutorial } from "./InteractiveTutorial";
import { OnboardingStep, GestureConfig } from "../../lib/types/onboarding";

type DemoMode = "individual" | "tutorial" | "selection";

interface GestureDemo {
  id: string;
  name: string;
  description: string;
  gesture: GestureConfig;
  color: string;
}

const GESTURE_DEMOS: GestureDemo[] = [
  {
    id: "tap-demo",
    name: "Tap Gesture",
    description: "Learn to tap with precision",
    gesture: {
      type: "tap",
      hapticFeedback: true,
    },
    color: "#10b981",
  },
  {
    id: "double-tap-demo",
    name: "Double Tap",
    description: "Master the double tap for quick actions",
    gesture: {
      type: "double_tap",
      hapticFeedback: true,
    },
    color: "#3b82f6",
  },
  {
    id: "long-press-demo",
    name: "Long Press",
    description: "Hold and wait for context menus",
    gesture: {
      type: "long_press",
      duration: 2000,
      hapticFeedback: true,
    },
    color: "#8b5cf6",
  },
  {
    id: "swipe-right-demo",
    name: "Swipe Right",
    description: "Navigate back with right swipes",
    gesture: {
      type: "swipe",
      direction: "right",
      distance: 100,
      hapticFeedback: true,
    },
    color: "#f59e0b",
  },
  {
    id: "swipe-left-demo",
    name: "Swipe Left",
    description: "Quick reply with left swipes",
    gesture: {
      type: "swipe",
      direction: "left",
      distance: 80,
      hapticFeedback: true,
    },
    color: "#ef4444",
  },
  {
    id: "swipe-up-demo",
    name: "Swipe Up",
    description: "Minimize and navigate up",
    gesture: {
      type: "swipe",
      direction: "up",
      distance: 120,
      hapticFeedback: true,
    },
    color: "#06b6d4",
  },
  {
    id: "swipe-down-demo",
    name: "Pull to Refresh",
    description: "Pull down to refresh content",
    gesture: {
      type: "pull_to_refresh",
      hapticFeedback: true,
    },
    color: "#84cc16",
  },
  {
    id: "pinch-demo",
    name: "Pinch Gesture",
    description: "Zoom in and out with pinch",
    gesture: {
      type: "pinch",
      hapticFeedback: true,
    },
    color: "#ec4899",
  },
];

const TUTORIAL_STEPS: OnboardingStep[] = [
  {
    id: "basic-gestures-tutorial",
    type: "gesture_training",
    title: "Basic Mobile Gestures",
    description: "Essential interactions",
    icon: "hand-left",
    iconColor: "#10b981",
    content: "Master the fundamental gestures that power mobile interaction. These are the building blocks of great mobile experiences.",
    skippable: true,
    required: false,
    gestureTraining: {
      targetGestures: [
        { type: "tap", hapticFeedback: true },
        { type: "long_press", duration: 1500, hapticFeedback: true },
        { type: "double_tap", hapticFeedback: true },
      ],
      practiceArea: {
        width: 320,
        height: 200,
        backgroundColor: "#ecfdf5",
      },
      successMessage: "Excellent! You've mastered basic gestures!",
      retryMessage: "Practice makes perfect. Try again!",
    },
    interactiveConfig: {
      targetGesture: { type: "tap", hapticFeedback: true },
      successCriteria: { attempts: 3, accuracy: 85 },
      hints: [
        "Tap quickly and lightly on the screen",
        "For long press, hold your finger down until you feel a vibration",
        "Double tap requires two quick taps in succession",
      ],
    },
  },
  {
    id: "navigation-gestures-tutorial",
    type: "interactive_tutorial",
    title: "Navigation Gestures",
    description: "Move around like a pro",
    icon: "navigate",
    iconColor: "#3b82f6",
    content: "Learn the swipe gestures that make navigation fluid and intuitive. These gestures will save you time and make using the app feel natural.",
    skippable: true,
    required: false,
    gestureTraining: {
      targetGestures: [
        { type: "swipe", direction: "right", distance: 100, hapticFeedback: true },
        { type: "swipe", direction: "left", distance: 100, hapticFeedback: true },
        { type: "swipe", direction: "up", distance: 120, hapticFeedback: true },
        { type: "pull_to_refresh", hapticFeedback: true },
      ],
      practiceArea: {
        width: 340,
        height: 220,
        backgroundColor: "#dbeafe",
      },
      successMessage: "Amazing! You're now a navigation expert!",
      retryMessage: "Keep practicing! Navigation will become second nature.",
    },
    interactiveConfig: {
      targetGesture: { type: "swipe", direction: "right", distance: 100, hapticFeedback: true },
      successCriteria: { attempts: 5, accuracy: 80, timeLimit: 60000 },
      hints: [
        "Swipe right to go back to the previous screen",
        "Swipe left to access quick actions",
        "Swipe up to minimize or access more options",
        "Pull down from the top to refresh content",
        "Use smooth, consistent movements for best results",
      ],
    },
  },
  {
    id: "advanced-gestures-tutorial",
    type: "interactive_tutorial",
    title: "Advanced Gestures",
    description: "Power user techniques",
    icon: "star",
    iconColor: "#8b5cf6",
    content: "Master advanced gestures for power users. These techniques will make you incredibly efficient at using mobile interfaces.",
    skippable: true,
    required: false,
    gestureTraining: {
      targetGestures: [
        { type: "pinch", hapticFeedback: true },
        { type: "long_press", duration: 2500, hapticFeedback: true },
        { type: "swipe", direction: "right", distance: 150, hapticFeedback: true },
      ],
      practiceArea: {
        width: 350,
        height: 240,
        backgroundColor: "#f3e8ff",
      },
      successMessage: "Outstanding! You're a gesture master!",
      retryMessage: "Advanced gestures take practice. Keep going!",
    },
    interactiveConfig: {
      targetGesture: { type: "pinch", hapticFeedback: true },
      successCriteria: { attempts: 6, accuracy: 75, timeLimit: 90000 },
      hints: [
        "Use two fingers to pinch in or out for zooming",
        "Long press for 2-3 seconds to access context menus",
        "Longer swipes can trigger different actions",
        "These gestures often have multiple functions in different contexts",
      ],
    },
  },
];

export function GestureTrainingDemo() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [mode, setMode] = useState<DemoMode>("selection");
  const [selectedDemo, setSelectedDemo] = useState<GestureDemo | null>(null);
  const [selectedTutorial, setSelectedTutorial] = useState<OnboardingStep | null>(null);
  const [completedDemos, setCompletedDemos] = useState<Set<string>>(new Set());

  const handleDemoComplete = () => {
    if (selectedDemo) {
      setCompletedDemos(prev => new Set(prev).add(selectedDemo.id));
    }
    setTimeout(() => {
      setMode("selection");
      setSelectedDemo(null);
    }, 2000);
  };

  const handleDemoFailed = () => {
    console.log("Demo gesture failed, allowing retry");
  };

  const handleTutorialComplete = () => {
    if (selectedTutorial) {
      setCompletedDemos(prev => new Set(prev).add(selectedTutorial.id));
    }
    setTimeout(() => {
      setMode("selection");
      setSelectedTutorial(null);
    }, 2000);
  };

  const handleTutorialSkip = () => {
    setMode("selection");
    setSelectedTutorial(null);
  };

  const handleHintRequested = (gestureIndex: number) => {
    console.log(`Hint requested for gesture index: ${gestureIndex}`);
  };

  const renderSelection = () => (
    <ScrollView style={styles.selectionContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, isDark ? styles.textDark : styles.textLight]}>
          Individual Gesture Demos
        </Text>
        <Text style={[styles.sectionSubtitle, isDark ? styles.subtitleDark : styles.subtitleLight]}>
          Practice each gesture individually
        </Text>
      </View>

      <View style={styles.demoGrid}>
        {GESTURE_DEMOS.map((demo) => (
          <View
            key={demo.id}
            style={[
              styles.demoCard,
              {
                backgroundColor: isDark ? "#374151" : "#ffffff",
                borderColor: demo.color + "30",
              }
            ]}
          >
            <View style={[styles.demoIcon, { backgroundColor: demo.color + "20" }]}>
              <View style={[styles.demoIconInner, { backgroundColor: demo.color }]} />
            </View>
            <Text style={[styles.demoTitle, isDark ? styles.textDark : styles.textLight]}>
              {demo.name}
            </Text>
            <Text style={[styles.demoDescription, isDark ? styles.subtitleDark : styles.subtitleLight]}>
              {demo.description}
            </Text>
            <View style={styles.demoActions}>
              <Button
                title={completedDemos.has(demo.id) ? "Practice Again" : "Try It"}
                onPress={() => {
                  setSelectedDemo(demo);
                  setMode("individual");
                }}
                size="sm"
                variant={completedDemos.has(demo.id) ? "secondary" : "primary"}
              />
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.sectionHeader, { marginTop: 40 }]}>
        <Text style={[styles.sectionTitle, isDark ? styles.textDark : styles.textLight]}>
          Complete Tutorials
        </Text>
        <Text style={[styles.sectionSubtitle, isDark ? styles.subtitleDark : styles.subtitleLight]}>
          Full interactive learning experiences
        </Text>
      </View>

      <View style={styles.tutorialList}>
        {TUTORIAL_STEPS.map((tutorial) => (
          <View
            key={tutorial.id}
            style={[
              styles.tutorialCard,
              {
                backgroundColor: isDark ? "#374151" : "#ffffff",
                borderColor: tutorial.iconColor + "30",
              }
            ]}
          >
            <View style={styles.tutorialHeader}>
              <View style={[styles.tutorialIcon, { backgroundColor: tutorial.iconColor + "20" }]}>
                <View style={[styles.tutorialIconInner, { backgroundColor: tutorial.iconColor }]} />
              </View>
              <View style={styles.tutorialInfo}>
                <Text style={[styles.tutorialTitle, isDark ? styles.textDark : styles.textLight]}>
                  {tutorial.title}
                </Text>
                <Text style={[styles.tutorialSubtitle, isDark ? styles.subtitleDark : styles.subtitleLight]}>
                  {tutorial.description}
                </Text>
              </View>
            </View>
            <Text style={[styles.tutorialContent, isDark ? styles.subtitleDark : styles.subtitleLight]}>
              {tutorial.content}
            </Text>
            <View style={styles.tutorialActions}>
              <Button
                title={completedDemos.has(tutorial.id) ? "Replay Tutorial" : "Start Tutorial"}
                onPress={() => {
                  setSelectedTutorial(tutorial);
                  setMode("tutorial");
                }}
                fullWidth
                variant={completedDemos.has(tutorial.id) ? "secondary" : "primary"}
              />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderIndividualDemo = () => {
    if (!selectedDemo) return null;

    return (
      <View style={styles.demoContainer}>
        <View style={styles.demoHeader}>
          <Button
            title="← Back"
            variant="ghost"
            onPress={() => {
              setMode("selection");
              setSelectedDemo(null);
            }}
          />
          <Text style={[styles.demoHeaderTitle, isDark ? styles.textDark : styles.textLight]}>
            {selectedDemo.name}
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <GestureTrainer
          targetGesture={selectedDemo.gesture}
          onGestureCompleted={handleDemoComplete}
          onGestureFailed={handleDemoFailed}
          showHint={true}
          practiceAreaStyle={{
            backgroundColor: selectedDemo.color + "10",
            borderColor: selectedDemo.color,
          }}
        />

        <View style={styles.demoInfo}>
          <Text style={[styles.demoInfoText, isDark ? styles.subtitleDark : styles.subtitleLight]}>
            {selectedDemo.description}
          </Text>
        </View>
      </View>
    );
  };

  const renderTutorial = () => {
    if (!selectedTutorial) return null;

    return (
      <View style={styles.tutorialContainer}>
        <InteractiveTutorial
          step={selectedTutorial}
          onComplete={handleTutorialComplete}
          onSkip={handleTutorialSkip}
          onHintRequested={handleHintRequested}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, isDark ? styles.containerDark : styles.containerLight]}>
      <View style={styles.header}>
        <Text style={[styles.title, isDark ? styles.textDark : styles.textLight]}>
          Gesture Training Demo
        </Text>
        <Text style={[styles.subtitle, isDark ? styles.subtitleDark : styles.subtitleLight]}>
          Explore and practice mobile gestures
        </Text>
      </View>

      {mode === "selection" && renderSelection()}
      {mode === "individual" && renderIndividualDemo()}
      {mode === "tutorial" && renderTutorial()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerLight: {
    backgroundColor: "#f8fafc",
  },
  containerDark: {
    backgroundColor: "#1f2937",
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  textLight: {
    color: "#111827",
  },
  textDark: {
    color: "#ffffff",
  },
  subtitleLight: {
    color: "#6b7280",
  },
  subtitleDark: {
    color: "#9ca3af",
  },
  selectionContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  sectionHeader: {
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
  },
  demoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  demoCard: {
    flex: 1,
    minWidth: 150,
    maxWidth: "48%",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  demoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  demoIconInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  demoDescription: {
    fontSize: 12,
    marginBottom: 16,
    lineHeight: 18,
  },
  demoActions: {
    marginTop: "auto",
  },
  tutorialList: {
    gap: 16,
  },
  tutorialCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  tutorialHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  tutorialIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  tutorialIconInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  tutorialInfo: {
    flex: 1,
  },
  tutorialTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  tutorialSubtitle: {
    fontSize: 14,
  },
  tutorialContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  tutorialActions: {
    marginTop: 8,
  },
  demoContainer: {
    flex: 1,
  },
  demoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  demoHeaderTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  demoInfo: {
    padding: 24,
    alignItems: "center",
  },
  demoInfoText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  tutorialContainer: {
    flex: 1,
  },
});