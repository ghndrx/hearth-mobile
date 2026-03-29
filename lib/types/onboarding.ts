/**
 * Onboarding Types
 * 
 * Type definitions for the onboarding flow system.
 */

export type OnboardingStepType = "tutorial" | "interaction" | "setup" | "discovery";
export type UserType = "gamer" | "professional" | "casual" | "creator";

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
