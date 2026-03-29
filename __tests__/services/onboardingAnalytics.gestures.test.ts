/**
 * Onboarding Analytics Gesture Tracking Tests
 */

import { onboardingAnalytics } from "../../lib/services/onboardingAnalytics";
import { analytics } from "../../lib/services/analytics";

// Mock the analytics service
jest.mock("../../lib/services/analytics", () => ({
  analytics: {
    logEvent: jest.fn(),
  },
}));

const mockAnalytics = analytics as jest.Mocked<typeof analytics>;

describe("OnboardingAnalytics - Gesture Tracking", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("trackGestureAttempted", () => {
    it("should track gesture attempt with correct parameters", () => {
      onboardingAnalytics.trackGestureAttempted(
        "mobile-gestures",
        "tap",
        0,
        1
      );

      expect(mockAnalytics.logEvent).toHaveBeenCalledWith(
        "onboarding_gesture_attempted",
        {
          step_id: "mobile-gestures",
          gesture_type: "tap",
          gesture_index: 0,
          attempt_count: 1,
        }
      );
    });

    it("should track multiple gesture attempts", () => {
      onboardingAnalytics.trackGestureAttempted(
        "mobile-gestures",
        "swipe",
        1,
        3
      );

      expect(mockAnalytics.logEvent).toHaveBeenCalledWith(
        "onboarding_gesture_attempted",
        {
          step_id: "mobile-gestures",
          gesture_type: "swipe",
          gesture_index: 1,
          attempt_count: 3,
        }
      );
    });
  });

  describe("trackGestureCompleted", () => {
    it("should track successful gesture completion", () => {
      onboardingAnalytics.trackGestureCompleted(
        "mobile-gestures",
        "tap",
        0,
        1,
        2500
      );

      expect(mockAnalytics.logEvent).toHaveBeenCalledWith(
        "onboarding_gesture_completed",
        {
          step_id: "mobile-gestures",
          gesture_type: "tap",
          gesture_index: 0,
          attempt_count: 1,
          duration_ms: 2500,
          success_on_first_try: true,
        }
      );
    });

    it("should track gesture completion after multiple attempts", () => {
      onboardingAnalytics.trackGestureCompleted(
        "chat-gestures",
        "long_press",
        2,
        4,
        8000
      );

      expect(mockAnalytics.logEvent).toHaveBeenCalledWith(
        "onboarding_gesture_completed",
        {
          step_id: "chat-gestures",
          gesture_type: "long_press",
          gesture_index: 2,
          attempt_count: 4,
          duration_ms: 8000,
          success_on_first_try: false,
        }
      );
    });
  });

  describe("trackGestureFailed", () => {
    it("should track gesture failure with basic parameters", () => {
      onboardingAnalytics.trackGestureFailed(
        "navigation-gestures",
        "swipe",
        1,
        2
      );

      expect(mockAnalytics.logEvent).toHaveBeenCalledWith(
        "onboarding_gesture_failed",
        {
          step_id: "navigation-gestures",
          gesture_type: "swipe",
          gesture_index: 1,
          attempt_count: 2,
          failure_reason: undefined,
        }
      );
    });

    it("should track gesture failure with failure reason", () => {
      onboardingAnalytics.trackGestureFailed(
        "navigation-gestures",
        "pinch",
        3,
        1,
        "insufficient_distance"
      );

      expect(mockAnalytics.logEvent).toHaveBeenCalledWith(
        "onboarding_gesture_failed",
        {
          step_id: "navigation-gestures",
          gesture_type: "pinch",
          gesture_index: 3,
          attempt_count: 1,
          failure_reason: "insufficient_distance",
        }
      );
    });
  });

  describe("trackTutorialRetried", () => {
    it("should track tutorial retry attempts", () => {
      onboardingAnalytics.trackTutorialRetried("mobile-gestures", 1, 5);

      expect(mockAnalytics.logEvent).toHaveBeenCalledWith(
        "onboarding_tutorial_retried",
        {
          step_id: "mobile-gestures",
          gesture_index: 1,
          total_attempts: 5,
        }
      );
    });
  });

  describe("trackHintViewed", () => {
    it("should track manual hint viewing", () => {
      onboardingAnalytics.trackHintViewed(
        "chat-gestures",
        0,
        1,
        "manual"
      );

      expect(mockAnalytics.logEvent).toHaveBeenCalledWith(
        "onboarding_hint_viewed",
        {
          step_id: "chat-gestures",
          gesture_index: 0,
          hint_index: 1,
          trigger_reason: "manual",
        }
      );
    });

    it("should track automatic hint viewing after failed attempts", () => {
      onboardingAnalytics.trackHintViewed(
        "navigation-gestures",
        2,
        0,
        "auto_after_attempts"
      );

      expect(mockAnalytics.logEvent).toHaveBeenCalledWith(
        "onboarding_hint_viewed",
        {
          step_id: "navigation-gestures",
          gesture_index: 2,
          hint_index: 0,
          trigger_reason: "auto_after_attempts",
        }
      );
    });
  });

  describe("trackInteractiveTutorialCompleted", () => {
    it("should track successful tutorial completion", () => {
      onboardingAnalytics.trackInteractiveTutorialCompleted(
        "mobile-gestures",
        3,
        3,
        5,
        45000
      );

      expect(mockAnalytics.logEvent).toHaveBeenCalledWith(
        "onboarding_interactive_tutorial_completed",
        {
          step_id: "mobile-gestures",
          total_gestures: 3,
          completed_gestures: 3,
          total_attempts: 5,
          duration_ms: 45000,
          completion_rate: 100,
        }
      );
    });

    it("should track partial tutorial completion", () => {
      onboardingAnalytics.trackInteractiveTutorialCompleted(
        "chat-gestures",
        4,
        2,
        8,
        30000
      );

      expect(mockAnalytics.logEvent).toHaveBeenCalledWith(
        "onboarding_interactive_tutorial_completed",
        {
          step_id: "chat-gestures",
          total_gestures: 4,
          completed_gestures: 2,
          total_attempts: 8,
          duration_ms: 30000,
          completion_rate: 50,
        }
      );
    });
  });

  describe("trackInteractiveTutorialSkipped", () => {
    it("should track tutorial skip with no completed gestures", () => {
      onboardingAnalytics.trackInteractiveTutorialSkipped(
        "navigation-gestures",
        0,
        3,
        0
      );

      expect(mockAnalytics.logEvent).toHaveBeenCalledWith(
        "onboarding_interactive_tutorial_skipped",
        {
          step_id: "navigation-gestures",
          skipped_at_gesture: 0,
          total_gestures: 3,
          completed_gestures: 0,
          completion_rate: 0,
        }
      );
    });

    it("should track tutorial skip after partial completion", () => {
      onboardingAnalytics.trackInteractiveTutorialSkipped(
        "mobile-gestures",
        2,
        3,
        2
      );

      expect(mockAnalytics.logEvent).toHaveBeenCalledWith(
        "onboarding_interactive_tutorial_skipped",
        {
          step_id: "mobile-gestures",
          skipped_at_gesture: 2,
          total_gestures: 3,
          completed_gestures: 2,
          completion_rate: 67, // Math.round((2/3) * 100)
        }
      );
    });
  });

  describe("Integration scenarios", () => {
    it("should track complete gesture learning flow", () => {
      const stepId = "mobile-gestures";
      const gestureType = "tap";
      const gestureIndex = 0;

      // User attempts gesture multiple times
      onboardingAnalytics.trackGestureAttempted(stepId, gestureType, gestureIndex, 1);
      onboardingAnalytics.trackGestureFailed(stepId, gestureType, gestureIndex, 1);

      onboardingAnalytics.trackGestureAttempted(stepId, gestureType, gestureIndex, 2);
      onboardingAnalytics.trackGestureFailed(stepId, gestureType, gestureIndex, 2);

      // User views hint after failures
      onboardingAnalytics.trackHintViewed(stepId, gestureIndex, 0, "auto_after_attempts");

      // User finally succeeds
      onboardingAnalytics.trackGestureAttempted(stepId, gestureType, gestureIndex, 3);
      onboardingAnalytics.trackGestureCompleted(stepId, gestureType, gestureIndex, 3, 5000);

      // Verify all events were tracked (2 attempts + 2 failures + 1 hint + 1 completion = 6, but there might be an extra attempt)
      expect(mockAnalytics.logEvent).toHaveBeenCalledTimes(7);
      expect(mockAnalytics.logEvent).toHaveBeenCalledWith("onboarding_gesture_attempted", expect.any(Object));
      expect(mockAnalytics.logEvent).toHaveBeenCalledWith("onboarding_gesture_failed", expect.any(Object));
      expect(mockAnalytics.logEvent).toHaveBeenCalledWith("onboarding_hint_viewed", expect.any(Object));
      expect(mockAnalytics.logEvent).toHaveBeenCalledWith("onboarding_gesture_completed", expect.any(Object));
    });
  });
});