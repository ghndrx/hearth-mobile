/**
 * useOnboarding Hook
 * 
 * React hook for accessing and managing onboarding state.
 */

import { useState, useEffect, useCallback } from "react";
import { onboardingStore } from "../stores/onboarding";
import { OnboardingState, OnboardingFlow, OnboardingProgress, UserType } from "../types/onboarding";

export interface UseOnboardingReturn {
  // State
  isOnboardingComplete: boolean;
  hasSeenOnboarding: boolean;
  currentFlow: OnboardingFlow | null;
  progress: OnboardingProgress | null;
  interests: string[];
  selectedServerCategories: string[];
  profileSetupComplete: boolean;
  notificationSetupComplete: boolean;
  currentStepIndex: number;
  currentStep: OnboardingFlow["steps"][number] | null;
  isFirstStep: boolean;
  isLastStep: boolean;
  stepsRemaining: number;
  hasPausedFlow: boolean;

  // Actions
  startFlow: (userType?: UserType) => Promise<void>;
  goToStep: (stepIndex: number) => Promise<void>;
  nextStep: () => Promise<void>;
  previousStep: () => Promise<void>;
  completeCurrentStep: () => Promise<void>;
  skipCurrentStep: () => Promise<void>;
  pauseFlow: () => Promise<void>;
  resumeFlow: () => Promise<void>;
  setInterests: (interests: string[]) => Promise<void>;
  setServerCategories: (categories: string[]) => Promise<void>;
  setProfileSetupComplete: (complete?: boolean) => Promise<void>;
  setNotificationSetupComplete: (complete?: boolean) => Promise<void>;
  resetFlow: () => Promise<void>;
}

export function useOnboarding(): UseOnboardingReturn {
  const [state, setState] = useState<OnboardingState>(() => onboardingStore.getState());

  useEffect(() => {
    // Initialize from storage
    onboardingStore.initialize().then(() => {
      setState(onboardingStore.getState());
    });

    // Subscribe to changes
    const unsubscribe = onboardingStore.subscribe(setState);
    return unsubscribe;
  }, []);

  const startFlow = useCallback(async (userType: UserType = "casual") => {
    await onboardingStore.startFlow(userType);
  }, []);

  const goToStep = useCallback(async (stepIndex: number) => {
    await onboardingStore.goToStep(stepIndex);
  }, []);

  const nextStep = useCallback(async () => {
    const currentState = onboardingStore.getState();
    const stepIndex = currentState.currentFlow?.currentStepIndex ?? 0;
    if (currentState.currentFlow && stepIndex < currentState.currentFlow.steps.length - 1) {
      await onboardingStore.goToStep(stepIndex + 1);
    }
  }, []);

  const previousStep = useCallback(async () => {
    const currentState = onboardingStore.getState();
    const stepIndex = currentState.currentFlow?.currentStepIndex ?? 0;
    if (currentState.currentFlow && stepIndex > 0) {
      await onboardingStore.goToStep(stepIndex - 1);
    }
  }, []);

  const completeCurrentStep = useCallback(async () => {
    await onboardingStore.completeCurrentStep();
  }, []);

  const skipCurrentStep = useCallback(async () => {
    await onboardingStore.skipCurrentStep();
  }, []);

  const pauseFlow = useCallback(async () => {
    await onboardingStore.pauseFlow();
  }, []);

  const setInterests = useCallback(async (interests: string[]) => {
    await onboardingStore.setInterests(interests);
  }, []);

  const setServerCategories = useCallback(async (categories: string[]) => {
    await onboardingStore.setServerCategories(categories);
  }, []);

  const setProfileSetupComplete = useCallback(async (complete: boolean = true) => {
    await onboardingStore.setProfileSetupComplete(complete);
  }, []);

  const setNotificationSetupComplete = useCallback(async (complete: boolean = true) => {
    await onboardingStore.setNotificationSetupComplete(complete);
  }, []);

  const resumeFlow = useCallback(async () => {
    await onboardingStore.resumeFlow();
  }, []);

  const resetFlow = useCallback(async () => {
    await onboardingStore.resetFlow();
  }, []);

  const currentFlow = state.currentFlow;
  const currentStepIndex = currentFlow?.currentStepIndex ?? 0;
  const currentStep = currentFlow?.steps[currentStepIndex] ?? null;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentFlow ? currentStepIndex === currentFlow.steps.length - 1 : false;
  const stepsRemaining = currentFlow ? currentFlow.steps.length - currentStepIndex - 1 : 0;
  const hasPausedFlow = onboardingStore.hasPausedFlow();

  return {
    // State
    isOnboardingComplete: state.isOnboardingComplete,
    hasSeenOnboarding: state.hasSeenOnboarding,
    currentFlow,
    progress: state.progress,
    interests: state.interests,
    selectedServerCategories: state.selectedServerCategories,
    profileSetupComplete: state.profileSetupComplete,
    notificationSetupComplete: state.notificationSetupComplete,
    currentStepIndex,
    currentStep,
    isFirstStep,
    isLastStep,
    stepsRemaining,
    hasPausedFlow,

    // Actions
    startFlow,
    goToStep,
    nextStep,
    previousStep,
    completeCurrentStep,
    skipCurrentStep,
    pauseFlow,
    resumeFlow,
    setInterests,
    setServerCategories,
    setProfileSetupComplete,
    setNotificationSetupComplete,
    resetFlow,
  };
}
