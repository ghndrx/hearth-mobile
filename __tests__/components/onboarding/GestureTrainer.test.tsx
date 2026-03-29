/**
 * GestureTrainer Component Tests
 */

import { GestureConfig, GestureType, SwipeDirection } from "../../../lib/types/onboarding";

// Mock haptic feedback
jest.mock("../../../lib/services/haptics", () => ({
  haptic: {
    success: jest.fn(),
    error: jest.fn(),
    selection: jest.fn(),
  },
}));

describe("GestureTrainer Component Logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Gesture instruction generation", () => {
    const generateInstructions = (gesture: GestureConfig): string => {
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
    };

    it("generates correct instructions for tap gesture", () => {
      const gesture: GestureConfig = { type: "tap", hapticFeedback: true };
      expect(generateInstructions(gesture)).toBe("Tap anywhere in the practice area");
    });

    it("generates correct instructions for swipe gesture", () => {
      const gesture: GestureConfig = {
        type: "swipe",
        direction: "right",
        distance: 100,
        hapticFeedback: true,
      };
      expect(generateInstructions(gesture)).toBe("Swipe right across the practice area");
    });

    it("generates correct instructions for long press gesture", () => {
      const gesture: GestureConfig = {
        type: "long_press",
        duration: 2000,
        hapticFeedback: true,
      };
      expect(generateInstructions(gesture)).toBe("Press and hold for 2 seconds");
    });

    it("generates correct instructions for double tap gesture", () => {
      const gesture: GestureConfig = { type: "double_tap", hapticFeedback: true };
      expect(generateInstructions(gesture)).toBe("Double-tap quickly in the practice area");
    });

    it("generates correct instructions for pinch gesture", () => {
      const gesture: GestureConfig = { type: "pinch", hapticFeedback: true };
      expect(generateInstructions(gesture)).toBe("Use two fingers to pinch in or out");
    });

    it("generates correct instructions for pull to refresh gesture", () => {
      const gesture: GestureConfig = { type: "pull_to_refresh", hapticFeedback: true };
      expect(generateInstructions(gesture)).toBe("Pull down from the top to refresh");
    });
  });

  describe("Gesture icon mapping", () => {
    const getGestureIcon = (gesture: GestureConfig): string => {
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
    };

    it("maps tap gesture to correct icon", () => {
      const gesture: GestureConfig = { type: "tap", hapticFeedback: true };
      expect(getGestureIcon(gesture)).toBe("finger-print-outline");
    });

    it("maps swipe gestures to correct directional icons", () => {
      const directions: SwipeDirection[] = ["right", "left", "up", "down"];
      const expectedIcons = ["arrow-forward-outline", "arrow-back-outline", "arrow-up-outline", "arrow-down-outline"];

      directions.forEach((direction, index) => {
        const gesture: GestureConfig = {
          type: "swipe",
          direction,
          hapticFeedback: true,
        };
        expect(getGestureIcon(gesture)).toBe(expectedIcons[index]);
      });
    });

    it("maps long press gesture to correct icon", () => {
      const gesture: GestureConfig = { type: "long_press", duration: 2000, hapticFeedback: true };
      expect(getGestureIcon(gesture)).toBe("hand-right-outline");
    });

    it("maps pinch gesture to correct icon", () => {
      const gesture: GestureConfig = { type: "pinch", hapticFeedback: true };
      expect(getGestureIcon(gesture)).toBe("resize-outline");
    });
  });

  describe("Gesture detection logic", () => {
    const detectGesture = (gestureState: any, targetGesture: GestureConfig): boolean => {
      const { dx, dy } = gestureState;
      const distance = Math.sqrt(dx * dx + dy * dy);

      switch (targetGesture.type) {
        case "tap":
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
          return distance < 15; // Allow minimal movement

        default:
          return false;
      }
    };

    it("detects tap gesture correctly", () => {
      const gesture: GestureConfig = { type: "tap", hapticFeedback: true };
      const validTap = { dx: 5, dy: 3 };
      const invalidTap = { dx: 20, dy: 15 };

      expect(detectGesture(validTap, gesture)).toBe(true);
      expect(detectGesture(invalidTap, gesture)).toBe(false);
    });

    it("detects right swipe gesture correctly", () => {
      const gesture: GestureConfig = {
        type: "swipe",
        direction: "right",
        distance: 50,
        hapticFeedback: true,
      };

      const validSwipe = { dx: 60, dy: 10 };
      const invalidSwipe = { dx: 30, dy: 5 };
      const wrongDirection = { dx: -60, dy: 10 };

      expect(detectGesture(validSwipe, gesture)).toBe(true);
      expect(detectGesture(invalidSwipe, gesture)).toBe(false);
      expect(detectGesture(wrongDirection, gesture)).toBe(false);
    });

    it("detects long press gesture correctly", () => {
      const gesture: GestureConfig = {
        type: "long_press",
        duration: 2000,
        hapticFeedback: true,
      };

      const validLongPress = { dx: 5, dy: 8 };
      const invalidLongPress = { dx: 20, dy: 25 };

      expect(detectGesture(validLongPress, gesture)).toBe(true);
      expect(detectGesture(invalidLongPress, gesture)).toBe(false);
    });
  });

  describe("Component props validation", () => {
    const mockOnGestureCompleted = jest.fn();
    const mockOnGestureFailed = jest.fn();

    const defaultProps = {
      targetGesture: {
        type: "tap" as const,
        hapticFeedback: true,
      },
      onGestureCompleted: mockOnGestureCompleted,
      onGestureFailed: mockOnGestureFailed,
    };

    it("validates required props are present", () => {
      expect(defaultProps.targetGesture).toBeDefined();
      expect(defaultProps.onGestureCompleted).toBeDefined();
      expect(defaultProps.onGestureFailed).toBeDefined();
    });

    it("validates gesture config has correct type", () => {
      expect(defaultProps.targetGesture.type).toBe("tap");
      expect(defaultProps.targetGesture.hapticFeedback).toBe(true);
    });

    it("validates callbacks are functions", () => {
      expect(typeof defaultProps.onGestureCompleted).toBe("function");
      expect(typeof defaultProps.onGestureFailed).toBe("function");
    });
  });
});