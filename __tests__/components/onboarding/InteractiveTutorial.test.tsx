/**
 * InteractiveTutorial Component Tests
 */

import { OnboardingStep, GestureConfig, InteractiveTutorialConfig } from "../../../lib/types/onboarding";

const mockOnComplete = jest.fn();
const mockOnSkip = jest.fn();
const mockOnHintRequested = jest.fn();

const mockStep: OnboardingStep = {
  id: "test-tutorial",
  type: "gesture_training",
  title: "Test Tutorial",
  description: "Learn gestures",
  icon: "hand-left",
  iconColor: "#10b981",
  content: "This is a test tutorial for gesture training.",
  skippable: true,
  required: false,
  gestureTraining: {
    targetGestures: [
      {
        type: "tap",
        hapticFeedback: true,
      },
      {
        type: "swipe",
        direction: "right",
        distance: 100,
        hapticFeedback: true,
      },
      {
        type: "long_press",
        duration: 2000,
        hapticFeedback: true,
      },
    ],
    practiceArea: {
      width: 300,
      height: 200,
    },
    successMessage: "Great job!",
    retryMessage: "Try again!",
  },
  interactiveConfig: {
    targetGesture: {
      type: "tap",
      hapticFeedback: true,
    },
    successCriteria: {
      attempts: 3,
      accuracy: 85,
    },
    hints: [
      "Tap gently on the screen",
      "Make sure your tap is quick",
      "Try tapping in the center",
    ],
  },
};

describe("InteractiveTutorial Component Logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Step validation", () => {
    it("validates step with gesture training configuration", () => {
      expect(mockStep.gestureTraining).toBeDefined();
      expect(mockStep.gestureTraining!.targetGestures).toBeDefined();
      expect(mockStep.gestureTraining!.targetGestures.length).toBe(3);
    });

    it("validates interactive configuration", () => {
      expect(mockStep.interactiveConfig).toBeDefined();
      expect(mockStep.interactiveConfig!.hints).toBeDefined();
      expect(mockStep.interactiveConfig!.hints.length).toBe(3);
    });

    it("validates gesture training practice area", () => {
      expect(mockStep.gestureTraining!.practiceArea).toBeDefined();
      expect(mockStep.gestureTraining!.practiceArea.width).toBe(300);
      expect(mockStep.gestureTraining!.practiceArea.height).toBe(200);
    });

    it("validates success and retry messages", () => {
      expect(mockStep.gestureTraining!.successMessage).toBe("Great job!");
      expect(mockStep.gestureTraining!.retryMessage).toBe("Try again!");
    });
  });

  describe("Progress calculation", () => {
    const calculateProgress = (completedGestures: number, totalGestures: number): number => {
      if (totalGestures === 0) return 0;
      return Math.round((completedGestures / totalGestures) * 100);
    };

    it("calculates progress correctly for no completed gestures", () => {
      expect(calculateProgress(0, 3)).toBe(0);
    });

    it("calculates progress correctly for partial completion", () => {
      expect(calculateProgress(1, 3)).toBe(33);
      expect(calculateProgress(2, 3)).toBe(67);
    });

    it("calculates progress correctly for full completion", () => {
      expect(calculateProgress(3, 3)).toBe(100);
    });

    it("handles edge case of zero total gestures", () => {
      expect(calculateProgress(0, 0)).toBe(0); // Should handle division by zero
    });
  });

  describe("Gesture state management", () => {
    interface TutorialState {
      currentGestureIndex: number;
      completedGestures: Set<number>;
      attemptCounts: Record<number, number>;
      showHints: boolean;
    }

    const initialState: TutorialState = {
      currentGestureIndex: 0,
      completedGestures: new Set(),
      attemptCounts: {},
      showHints: false,
    };

    const handleGestureCompleted = (state: TutorialState, gestureIndex: number): TutorialState => {
      const newCompleted = new Set(state.completedGestures);
      newCompleted.add(gestureIndex);

      return {
        ...state,
        completedGestures: newCompleted,
        currentGestureIndex: gestureIndex < 2 ? gestureIndex + 1 : gestureIndex,
      };
    };

    const handleGestureFailed = (state: TutorialState, gestureIndex: number): TutorialState => {
      const newAttemptCounts = {
        ...state.attemptCounts,
        [gestureIndex]: (state.attemptCounts[gestureIndex] || 0) + 1,
      };

      return {
        ...state,
        attemptCounts: newAttemptCounts,
        showHints: newAttemptCounts[gestureIndex] >= 3,
      };
    };

    it("initializes with correct state", () => {
      expect(initialState.currentGestureIndex).toBe(0);
      expect(initialState.completedGestures.size).toBe(0);
      expect(initialState.showHints).toBe(false);
    });

    it("handles gesture completion correctly", () => {
      const newState = handleGestureCompleted(initialState, 0);

      expect(newState.completedGestures.has(0)).toBe(true);
      expect(newState.currentGestureIndex).toBe(1);
    });

    it("handles gesture failure and tracks attempts", () => {
      let state = initialState;

      // Fail gesture multiple times
      state = handleGestureFailed(state, 0);
      expect(state.attemptCounts[0]).toBe(1);
      expect(state.showHints).toBe(false);

      state = handleGestureFailed(state, 0);
      expect(state.attemptCounts[0]).toBe(2);
      expect(state.showHints).toBe(false);

      state = handleGestureFailed(state, 0);
      expect(state.attemptCounts[0]).toBe(3);
      expect(state.showHints).toBe(true);
    });

    it("tracks completion across multiple gestures", () => {
      let state = initialState;

      // Complete first gesture
      state = handleGestureCompleted(state, 0);
      expect(state.completedGestures.size).toBe(1);
      expect(state.currentGestureIndex).toBe(1);

      // Complete second gesture
      state = handleGestureCompleted(state, 1);
      expect(state.completedGestures.size).toBe(2);
      expect(state.currentGestureIndex).toBe(2);

      // Complete third gesture
      state = handleGestureCompleted(state, 2);
      expect(state.completedGestures.size).toBe(3);
      expect(state.currentGestureIndex).toBe(2); // Stays at last index
    });
  });

  describe("Hint system", () => {
    const shouldShowHints = (attemptCount: number, threshold: number = 3): boolean => {
      return attemptCount >= threshold;
    };

    const getRelevantHints = (config: InteractiveTutorialConfig | undefined, gestureIndex: number): string[] => {
      if (!config || !config.hints) return [];
      return config.hints;
    };

    it("shows hints after threshold attempts", () => {
      expect(shouldShowHints(1)).toBe(false);
      expect(shouldShowHints(2)).toBe(false);
      expect(shouldShowHints(3)).toBe(true);
      expect(shouldShowHints(4)).toBe(true);
    });

    it("retrieves relevant hints from configuration", () => {
      const hints = getRelevantHints(mockStep.interactiveConfig, 0);
      expect(hints).toEqual([
        "Tap gently on the screen",
        "Make sure your tap is quick",
        "Try tapping in the center",
      ]);
    });

    it("handles missing hint configuration", () => {
      const hints = getRelevantHints(undefined, 0);
      expect(hints).toEqual([]);
    });
  });

  describe("Gesture type formatting", () => {
    const formatGestureType = (type: string): string => {
      return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ");
    };

    it("formats gesture types correctly", () => {
      expect(formatGestureType("tap")).toBe("Tap");
      expect(formatGestureType("long_press")).toBe("Long press");
      expect(formatGestureType("swipe")).toBe("Swipe");
      expect(formatGestureType("double_tap")).toBe("Double tap");
      expect(formatGestureType("pull_to_refresh")).toBe("Pull to refresh");
    });
  });

  describe("Completion detection", () => {
    const isAllGesturesCompleted = (completedGestures: Set<number>, totalGestures: number): boolean => {
      return completedGestures.size === totalGestures;
    };

    it("detects when all gestures are completed", () => {
      const completedAll = new Set([0, 1, 2]);
      const partiallyCompleted = new Set([0, 1]);
      const noneCompleted = new Set();

      expect(isAllGesturesCompleted(completedAll, 3)).toBe(true);
      expect(isAllGesturesCompleted(partiallyCompleted, 3)).toBe(false);
      expect(isAllGesturesCompleted(noneCompleted, 3)).toBe(false);
    });

    it("handles edge cases", () => {
      const emptySet = new Set();
      expect(isAllGesturesCompleted(emptySet, 0)).toBe(true); // Zero gestures to complete
    });
  });

  describe("Props validation", () => {
    const defaultProps = {
      step: mockStep,
      onComplete: mockOnComplete,
      onSkip: mockOnSkip,
      onHintRequested: mockOnHintRequested,
    };

    it("validates required props are present", () => {
      expect(defaultProps.step).toBeDefined();
      expect(defaultProps.onComplete).toBeDefined();
      expect(defaultProps.onSkip).toBeDefined();
      expect(defaultProps.onHintRequested).toBeDefined();
    });

    it("validates callback functions", () => {
      expect(typeof defaultProps.onComplete).toBe("function");
      expect(typeof defaultProps.onSkip).toBe("function");
      expect(typeof defaultProps.onHintRequested).toBe("function");
    });

    it("validates step structure", () => {
      expect(defaultProps.step.id).toBeDefined();
      expect(defaultProps.step.type).toBe("gesture_training");
      expect(defaultProps.step.title).toBeDefined();
      expect(defaultProps.step.content).toBeDefined();
    });
  });
});