/**
 * Onboarding Analytics Service
 *
 * Dedicated analytics tracking for onboarding flow events,
 * step timing, and funnel analysis.
 */

import { analytics } from "./analytics";
import { OnboardingStep, UserType, GestureType } from "../types/onboarding";

interface StepTiming {
  stepId: string;
  startedAt: number;
}

class OnboardingAnalyticsService {
  private currentStepTiming: StepTiming | null = null;

  trackFlowStarted(flowId: string, userType: UserType, totalSteps: number): void {
    analytics.logEvent("onboarding_flow_started", {
      flow_id: flowId,
      user_type: userType,
      total_steps: totalSteps,
    });
  }

  trackFlowCompleted(
    flowId: string,
    userType: UserType,
    completedSteps: number,
    skippedSteps: number,
    totalSteps: number,
    durationMs: number
  ): void {
    analytics.logEvent("onboarding_flow_completed", {
      flow_id: flowId,
      user_type: userType,
      completed_steps: completedSteps,
      skipped_steps: skippedSteps,
      total_steps: totalSteps,
      duration_ms: durationMs,
      completion_rate: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
    });
  }

  trackFlowAbandoned(
    flowId: string,
    userType: UserType,
    lastStepId: string,
    completedSteps: number,
    totalSteps: number
  ): void {
    this.endStepTiming();
    analytics.logEvent("onboarding_flow_abandoned", {
      flow_id: flowId,
      user_type: userType,
      last_step_id: lastStepId,
      completed_steps: completedSteps,
      total_steps: totalSteps,
      drop_off_percentage: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
    });
  }

  trackStepViewed(step: OnboardingStep, stepIndex: number, totalSteps: number): void {
    this.endStepTiming();
    this.currentStepTiming = { stepId: step.id, startedAt: Date.now() };

    analytics.logEvent("onboarding_step_viewed", {
      step_id: step.id,
      step_type: step.type,
      step_index: stepIndex,
      total_steps: totalSteps,
      is_required: step.required,
    });
  }

  trackStepCompleted(step: OnboardingStep, stepIndex: number): void {
    const durationMs = this.getStepDuration(step.id);
    analytics.logEvent("onboarding_step_completed", {
      step_id: step.id,
      step_type: step.type,
      step_index: stepIndex,
      duration_ms: durationMs,
    });
    this.currentStepTiming = null;
  }

  trackStepSkipped(step: OnboardingStep, stepIndex: number): void {
    const durationMs = this.getStepDuration(step.id);
    analytics.logEvent("onboarding_step_skipped", {
      step_id: step.id,
      step_type: step.type,
      step_index: stepIndex,
      duration_ms: durationMs,
    });
    this.currentStepTiming = null;
  }

  trackInterestsSelected(interests: string[]): void {
    analytics.logEvent("onboarding_interests_selected", {
      interests,
      count: interests.length,
    });
  }

  trackServerCategoriesSelected(categories: string[]): void {
    analytics.logEvent("onboarding_server_categories_selected", {
      categories,
      count: categories.length,
    });
  }

  trackFlowResumed(flowId: string, stepId: string, stepIndex: number): void {
    analytics.logEvent("onboarding_flow_resumed", {
      flow_id: flowId,
      resumed_step_id: stepId,
      resumed_step_index: stepIndex,
    });
  }

  // Interactive tutorial and gesture training analytics
  trackGestureAttempted(
    stepId: string,
    gestureType: string,
    gestureIndex: number,
    attemptCount: number
  ): void {
    analytics.logEvent("onboarding_gesture_attempted", {
      step_id: stepId,
      gesture_type: gestureType,
      gesture_index: gestureIndex,
      attempt_count: attemptCount,
    });
  }

  trackGestureCompleted(
    stepId: string,
    gestureType: string,
    gestureIndex: number,
    attemptCount: number,
    durationMs: number
  ): void {
    analytics.logEvent("onboarding_gesture_completed", {
      step_id: stepId,
      gesture_type: gestureType,
      gesture_index: gestureIndex,
      attempt_count: attemptCount,
      duration_ms: durationMs,
      success_on_first_try: attemptCount === 1,
    });
  }

  trackGestureFailed(
    stepId: string,
    gestureType: string,
    gestureIndex: number,
    attemptCount: number,
    failureReason?: string
  ): void {
    analytics.logEvent("onboarding_gesture_failed", {
      step_id: stepId,
      gesture_type: gestureType,
      gesture_index: gestureIndex,
      attempt_count: attemptCount,
      failure_reason: failureReason,
    });
  }

  trackTutorialRetried(stepId: string, gestureIndex: number, totalAttempts: number): void {
    analytics.logEvent("onboarding_tutorial_retried", {
      step_id: stepId,
      gesture_index: gestureIndex,
      total_attempts: totalAttempts,
    });
  }

  trackHintViewed(
    stepId: string,
    gestureIndex: number,
    hintIndex: number,
    triggerReason: "manual" | "auto_after_attempts"
  ): void {
    analytics.logEvent("onboarding_hint_viewed", {
      step_id: stepId,
      gesture_index: gestureIndex,
      hint_index: hintIndex,
      trigger_reason: triggerReason,
    });
  }

  trackInteractiveTutorialCompleted(
    stepId: string,
    totalGestures: number,
    completedGestures: number,
    totalAttempts: number,
    durationMs: number
  ): void {
    analytics.logEvent("onboarding_interactive_tutorial_completed", {
      step_id: stepId,
      total_gestures: totalGestures,
      completed_gestures: completedGestures,
      total_attempts: totalAttempts,
      duration_ms: durationMs,
      completion_rate: Math.round((completedGestures / totalGestures) * 100),
    });
  }

  trackInteractiveTutorialSkipped(
    stepId: string,
    gestureIndex: number,
    totalGestures: number,
    completedGestures: number
  ): void {
    analytics.logEvent("onboarding_interactive_tutorial_skipped", {
      step_id: stepId,
      skipped_at_gesture: gestureIndex,
      total_gestures: totalGestures,
      completed_gestures: completedGestures,
      completion_rate: Math.round((completedGestures / totalGestures) * 100),
    });
  }

  private getStepDuration(stepId: string): number | undefined {
    if (this.currentStepTiming?.stepId === stepId) {
      return Date.now() - this.currentStepTiming.startedAt;
    }
    return undefined;
  }

  private endStepTiming(): void {
    this.currentStepTiming = null;
  }
}

export const onboardingAnalytics = new OnboardingAnalyticsService();
