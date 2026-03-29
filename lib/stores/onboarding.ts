/**
 * Onboarding Store
 * 
 * State management for onboarding flow and progress tracking.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { analytics } from "../services/analytics";
import {
  OnboardingState,
  OnboardingFlow,
  OnboardingProgress,
  OnboardingStep,
  OnboardingStepType,
  UserType,
  ONBOARDING_STORAGE_KEYS,
} from "../types/onboarding";

// Default onboarding steps
const DEFAULT_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    type: "tutorial" as OnboardingStepType,
    title: "Welcome to Hearth",
    description: "Your community awaits",
    icon: "heart",
    iconColor: "#ed4245",
    content: "Hearth brings together communities, real-time chat, voice, and video in one seamless experience. Let's show you around!",
    skippable: false,
    required: true,
  },
  {
    id: "join-communities",
    type: "discovery" as OnboardingStepType,
    title: "Join Communities",
    description: "Find your people",
    icon: "people",
    iconColor: "#5865f2",
    content: "Browse servers by interest, join communities that match your passions, or create your own space.",
    actionLabel: "Explore Servers",
    skippable: true,
    required: false,
  },
  {
    id: "real-time-chat",
    type: "tutorial" as OnboardingStepType,
    title: "Real-time Chat",
    description: "Stay connected",
    icon: "chatbubbles",
    iconColor: "#3ba55c",
    content: "Send messages instantly with text, images, and reactions. Express yourself with custom emojis and GIFs.",
    skippable: true,
    required: false,
  },
  {
    id: "voice-video",
    type: "interaction" as OnboardingStepType,
    title: "Voice & Video",
    description: "Talk face-to-face",
    icon: "videocam",
    iconColor: "#eb459e",
    content: "Drop into voice channels to chat hands-free, or start a video call with friends and screen share.",
    skippable: true,
    required: false,
  },
  {
    id: "notifications",
    type: "setup" as OnboardingStepType,
    title: "Stay Updated",
    description: "Never miss out",
    icon: "notifications",
    iconColor: "#faa61a",
    content: "Get notified about messages that matter. Customize notifications per server and channel.",
    actionLabel: "Configure Notifications",
    skippable: true,
    required: false,
  },
  {
    id: "profile-setup",
    type: "setup" as OnboardingStepType,
    title: "Set Up Profile",
    description: "Make it yours",
    icon: "person",
    iconColor: "#5865f2",
    content: "Add a photo, set your display name, and let others know a bit about you.",
    actionLabel: "Edit Profile",
    skippable: true,
    required: false,
  },
];

export class OnboardingStore {
  private state: OnboardingState;
  private listeners: Set<(state: OnboardingState) => void> = new Set();

  constructor() {
    this.state = {
      isOnboardingComplete: false,
      hasSeenOnboarding: false,
      currentFlow: null,
      progress: null,
      interests: [],
      selectedServerCategories: [],
      profileSetupComplete: false,
      notificationSetupComplete: false,
    };
  }

  // Subscribe to state changes
  subscribe(listener: (state: OnboardingState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners
  private notify(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }

  // Get current state
  getState(): OnboardingState {
    return this.state;
  }

  // Initialize from storage
  async initialize(): Promise<void> {
    try {
      const [isComplete, flowData, progressData, interestsData, categoriesData, profileComplete, notifComplete] = await Promise.all([
        AsyncStorage.getItem(ONBOARDING_STORAGE_KEYS.IS_COMPLETE),
        AsyncStorage.getItem(ONBOARDING_STORAGE_KEYS.CURRENT_FLOW),
        AsyncStorage.getItem(ONBOARDING_STORAGE_KEYS.PROGRESS),
        AsyncStorage.getItem(ONBOARDING_STORAGE_KEYS.INTERESTS),
        AsyncStorage.getItem(ONBOARDING_STORAGE_KEYS.SERVER_CATEGORIES),
        AsyncStorage.getItem(ONBOARDING_STORAGE_KEYS.PROFILE_COMPLETE),
        AsyncStorage.getItem(ONBOARDING_STORAGE_KEYS.NOTIFICATION_COMPLETE),
      ]);

      this.state = {
        ...this.state,
        isOnboardingComplete: isComplete === "true",
        hasSeenOnboarding: isComplete !== null,
        currentFlow: flowData ? JSON.parse(flowData) : null,
        progress: progressData ? JSON.parse(progressData) : null,
        interests: interestsData ? JSON.parse(interestsData) : [],
        selectedServerCategories: categoriesData ? JSON.parse(categoriesData) : [],
        profileSetupComplete: profileComplete === "true",
        notificationSetupComplete: notifComplete === "true",
      };
    } catch (error) {
      console.error("Failed to initialize onboarding store:", error);
    }
  }

  // Start onboarding flow
  async startFlow(userType: UserType = "casual"): Promise<void> {
    const flow: OnboardingFlow = {
      id: `flow_${Date.now()}`,
      userType,
      steps: DEFAULT_STEPS,
      currentStepIndex: 0,
      completedStepIds: [],
      skippedStepIds: [],
      startedAt: new Date(),
    };

    const progress = this.calculateProgress(flow);

    this.state = {
      ...this.state,
      currentFlow: flow,
      progress,
      hasSeenOnboarding: true,
    };

    await this.persistFlow();
    analytics.logEvent("onboarding_flow_started", { userType });
  }

  // Navigate to specific step
  async goToStep(stepIndex: number): Promise<void> {
    if (!this.state.currentFlow) return;

    const flow = { ...this.state.currentFlow };
    flow.currentStepIndex = Math.max(0, Math.min(stepIndex, flow.steps.length - 1));
    const progress = this.calculateProgress(flow);

    this.state = { ...this.state, currentFlow: flow, progress };
    await this.persistFlow();

    analytics.logEvent("onboarding_step_viewed", {
      stepId: flow.steps[flow.currentStepIndex]?.id,
      stepIndex,
    });
  }

  // Complete current step
  async completeCurrentStep(): Promise<void> {
    if (!this.state.currentFlow) return;

    const flow = { ...this.state.currentFlow };
    const currentStep = flow.steps[flow.currentStepIndex];

    if (currentStep && !flow.completedStepIds.includes(currentStep.id)) {
      flow.completedStepIds.push(currentStep.id);
    }

    // Auto-advance if not last step
    if (flow.currentStepIndex < flow.steps.length - 1) {
      flow.currentStepIndex++;
    } else {
      // Flow complete
      flow.completedAt = new Date();
      this.state.isOnboardingComplete = true;
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEYS.IS_COMPLETE, "true");
      analytics.logEvent("onboarding_flow_completed", {
        flowId: flow.id,
        totalSteps: flow.steps.length,
        completedSteps: flow.completedStepIds.length,
      });
    }

    const progress = this.calculateProgress(flow);
    this.state = { ...this.state, currentFlow: flow, progress };
    await this.persistFlow();
  }

  // Skip current step
  async skipCurrentStep(): Promise<void> {
    if (!this.state.currentFlow) return;

    const flow = { ...this.state.currentFlow };
    const currentStep = flow.steps[flow.currentStepIndex];

    if (currentStep && !flow.skippedStepIds.includes(currentStep.id)) {
      flow.skippedStepIds.push(currentStep.id);
    }

    // Advance if not last step
    if (flow.currentStepIndex < flow.steps.length - 1) {
      flow.currentStepIndex++;
    } else {
      // Flow complete
      flow.completedAt = new Date();
      this.state.isOnboardingComplete = true;
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEYS.IS_COMPLETE, "true");
    }

    const progress = this.calculateProgress(flow);
    this.state = { ...this.state, currentFlow: flow, progress };
    await this.persistFlow();

    analytics.logEvent("onboarding_step_skipped", { stepId: currentStep?.id });
  }

  // Set user interests
  async setInterests(interests: string[]): Promise<void> {
    this.state = { ...this.state, interests };
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEYS.INTERESTS, JSON.stringify(interests));
  }

  // Set server categories
  async setServerCategories(categories: string[]): Promise<void> {
    this.state = { ...this.state, selectedServerCategories: categories };
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEYS.SERVER_CATEGORIES, JSON.stringify(categories));
  }

  // Mark profile setup complete
  async setProfileSetupComplete(complete: boolean = true): Promise<void> {
    this.state = { ...this.state, profileSetupComplete: complete };
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEYS.PROFILE_COMPLETE, complete.toString());
  }

  // Mark notification setup complete
  async setNotificationSetupComplete(complete: boolean = true): Promise<void> {
    this.state = { ...this.state, notificationSetupComplete: complete };
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEYS.NOTIFICATION_COMPLETE, complete.toString());
  }

  // Pause onboarding flow
  async pauseFlow(): Promise<void> {
    if (!this.state.currentFlow) return;

    const flow = { ...this.state.currentFlow };
    flow.pausedAt = new Date();
    this.state = { ...this.state, currentFlow: flow };
    await this.persistFlow();
  }

  // Reset onboarding (for testing or user request)
  async resetFlow(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(ONBOARDING_STORAGE_KEYS.IS_COMPLETE),
      AsyncStorage.removeItem(ONBOARDING_STORAGE_KEYS.CURRENT_FLOW),
      AsyncStorage.removeItem(ONBOARDING_STORAGE_KEYS.PROGRESS),
      AsyncStorage.removeItem(ONBOARDING_STORAGE_KEYS.INTERESTS),
      AsyncStorage.removeItem(ONBOARDING_STORAGE_KEYS.SERVER_CATEGORIES),
      AsyncStorage.removeItem(ONBOARDING_STORAGE_KEYS.PROFILE_COMPLETE),
      AsyncStorage.removeItem(ONBOARDING_STORAGE_KEYS.NOTIFICATION_COMPLETE),
    ]);

    this.state = {
      isOnboardingComplete: false,
      hasSeenOnboarding: false,
      currentFlow: null,
      progress: null,
      interests: [],
      selectedServerCategories: [],
      profileSetupComplete: false,
      notificationSetupComplete: false,
    };

    this.notify();
  }

  // Calculate progress
  private calculateProgress(flow: OnboardingFlow): OnboardingProgress {
    const completedCount = flow.completedStepIds.length;
    const totalSteps = flow.steps.length;
    const progressPercentage = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

    return {
      flowId: flow.id,
      currentStep: flow.steps[flow.currentStepIndex]?.id || "",
      completedSteps: flow.completedStepIds,
      totalSteps,
      progressPercentage,
      isComplete: flow.completedAt !== undefined,
      lastUpdated: new Date(),
    };
  }

  // Persist flow to storage
  private async persistFlow(): Promise<void> {
    try {
      if (this.state.currentFlow) {
        await AsyncStorage.setItem(
          ONBOARDING_STORAGE_KEYS.CURRENT_FLOW,
          JSON.stringify(this.state.currentFlow)
        );
      }
      if (this.state.progress) {
        await AsyncStorage.setItem(
          ONBOARDING_STORAGE_KEYS.PROGRESS,
          JSON.stringify(this.state.progress)
        );
      }
    } catch (error) {
      console.error("Failed to persist onboarding flow:", error);
    }
    this.notify();
  }
}

// Export singleton instance
export const onboardingStore = new OnboardingStore();
