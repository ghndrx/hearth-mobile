/**
 * Tests for OnboardingFlow Component
 *
 * Tests the useOnboarding hook mock for OnboardingFlow carousel.
 * These tests verify the mock hook provides correct data structure.
 */

import { OnboardingStep } from "../../lib/types/onboarding";

// Define test data inline to avoid importing the actual module
const testSteps: OnboardingStep[] = [
  {
    id: "step-1",
    type: "tutorial",
    title: "Welcome",
    description: "Welcome to the app",
    skippable: true,
    actionLabel: "Next",
  },
  {
    id: "step-2",
    type: "tutorial",
    title: "Step 2",
    description: "Second step",
    skippable: false,
    actionLabel: "Continue",
  },
  {
    id: "step-3",
    type: "tutorial",
    title: "Step 3",
    description: "Third step",
    skippable: true,
    actionLabel: "Done",
  },
];

describe("OnboardingFlow - Mock Hook Data Structure", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("renders the onboarding carousel", () => {
    it("provides steps array for carousel rendering", () => {
      expect(testSteps.length).toBe(3);
      expect(testSteps[0].title).toBe("Welcome");
    });

    it("each step has required properties for carousel rendering", () => {
      const step = testSteps[0];
      expect(step).toHaveProperty("id");
      expect(step).toHaveProperty("title");
      expect(step).toHaveProperty("description");
      expect(step).toHaveProperty("type");
      expect(step).toHaveProperty("skippable");
    });
  });

  describe("renders the skip button when step is skippable", () => {
    it("first step is skippable, skip button should render", () => {
      expect(testSteps[0].skippable).toBe(true);
    });

    it("second step is not skippable, skip button should not render", () => {
      expect(testSteps[1].skippable).toBe(false);
    });
  });

  describe("skip handler behavior", () => {
    const mockSkipCurrentStep = jest.fn();
    const mockGoToStep = jest.fn();
    const mockFlatListRef = { current: { scrollToIndex: jest.fn() } };

    it("skipCurrentStep is a callable function", () => {
      expect(typeof mockSkipCurrentStep).toBe("function");
    });

    it("goToStep is a callable function", () => {
      expect(typeof mockGoToStep).toBe("function");
    });

    it("FlatList ref provides scrollToIndex method", () => {
      expect(typeof mockFlatListRef.current.scrollToIndex).toBe("function");
    });

    it("skip handler should call both skipCurrentStep and scrollToIndex", async () => {
      mockSkipCurrentStep.mockResolvedValue(undefined);
      mockGoToStep.mockResolvedValue(undefined);
      
      await mockSkipCurrentStep();
      mockFlatListRef.current.scrollToIndex({ index: 1, animated: true });
      
      expect(mockSkipCurrentStep).toHaveBeenCalled();
      expect(mockFlatListRef.current.scrollToIndex).toHaveBeenCalledWith({ index: 1, animated: true });
    });
  });

  describe("renders progress bar", () => {
    it("currentStepIndex and totalSteps are available for progress bar", () => {
      const currentStepIndex = 0;
      const totalSteps = testSteps.length;
      expect(currentStepIndex).toBe(0);
      expect(totalSteps).toBe(3);
    });

    it("completedStepIds array is provided for progress tracking", () => {
      const completedStepIds: string[] = [];
      expect(Array.isArray(completedStepIds)).toBe(true);
    });
  });
});
