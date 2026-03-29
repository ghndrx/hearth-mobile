/**
 * Onboarding Types
 * 
 * Type definitions for the onboarding flow system.
 */

export type OnboardingStepType = "tutorial" | "interaction" | "setup" | "discovery" | "gesture_training" | "interactive_tutorial";
export type UserType = "gamer" | "professional" | "casual" | "creator";

export type GestureType = "tap" | "swipe" | "long_press" | "pinch" | "double_tap" | "pull_to_refresh";
export type SwipeDirection = "left" | "right" | "up" | "down";

export interface GestureConfig {
  type: GestureType;
  direction?: SwipeDirection;
  duration?: number;
  distance?: number;
  hapticFeedback?: boolean;
}

export interface InteractiveTutorialConfig {
  targetGesture: GestureConfig;
  successCriteria: {
    attempts?: number;
    accuracy?: number;
    timeLimit?: number;
  };
  hints: string[];
  demoVideo?: string;
  hapticPattern?: string;
}

export interface OnboardingStep {
  id: string;
  type: OnboardingStepType;
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  content: string;
  actionLabel?: string;
  actionPayload?: Record<string, unknown>;
  skippable: boolean;
  required: boolean;
  // Interactive tutorial specific fields
  interactiveConfig?: InteractiveTutorialConfig;
  gestureTraining?: {
    targetGestures: GestureConfig[];
    practiceArea: {
      width: number;
      height: number;
      backgroundColor?: string;
    };
    successMessage: string;
    retryMessage: string;
  };
}

export interface OnboardingFlow {
  id: string;
  userType: UserType;
  steps: OnboardingStep[];
  currentStepIndex: number;
  completedStepIds: string[];
  skippedStepIds: string[];
  startedAt?: Date;
  completedAt?: Date;
  pausedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface OnboardingProgress {
  flowId: string;
  currentStep: string;
  completedSteps: string[];
  totalSteps: number;
  progressPercentage: number;
  isComplete: boolean;
  lastUpdated: Date;
}

export interface OnboardingState {
  isOnboardingComplete: boolean;
  hasSeenOnboarding: boolean;
  currentFlow: OnboardingFlow | null;
  progress: OnboardingProgress | null;
  interests: string[];
  selectedServerCategories: string[];
  profileSetupComplete: boolean;
  notificationSetupComplete: boolean;
}

export interface OnboardingAnalytics {
  stepViewed: string;
  stepCompleted: string;
  stepSkipped: string;
  flowStarted: string;
  flowCompleted: string;
  flowAbandoned: string;
  // Interactive tutorial analytics
  gestureAttempted: string;
  gestureCompleted: string;
  gestureFailed: string;
  tutorialRetried: string;
  hintViewed: string;
}

export interface OnboardingFlowConfig {
  userType: UserType;
  steps: OnboardingStep[];
  description: string;
}

export const ONBOARDING_STORAGE_KEYS = {
  IS_COMPLETE: "@hearth/onboarding_complete",
  CURRENT_FLOW: "@hearth/onboarding_flow",
  PROGRESS: "@hearth/onboarding_progress",
  INTERESTS: "@hearth/onboarding_interests",
  SERVER_CATEGORIES: "@hearth/onboarding_server_categories",
  PROFILE_COMPLETE: "@hearth/onboarding_profile_complete",
  NOTIFICATION_COMPLETE: "@hearth/onboarding_notification_complete",
} as const;
