/**
 * Onboarding Store
 *
 * State management for onboarding flow and progress tracking.
 * Supports user-type-specific flows, pause/resume, and analytics integration.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { onboardingAnalytics } from "../services/onboardingAnalytics";
import {
  OnboardingState,
  OnboardingFlow,
  OnboardingProgress,
  OnboardingStep,
  OnboardingStepType,
  OnboardingFlowConfig,
  UserType,
  ONBOARDING_STORAGE_KEYS,
} from "../types/onboarding";

// Shared steps used across all flow types
const WELCOME_STEP: OnboardingStep = {
  id: "welcome",
  type: "tutorial" as OnboardingStepType,
  title: "Welcome to Hearth",
  description: "Your community awaits",
  icon: "heart",
  iconColor: "#ed4245",
  content: "Hearth brings together communities, real-time chat, voice, and video in one seamless experience. Let's show you around!",
  skippable: false,
  required: true,
};

const JOIN_COMMUNITIES_STEP: OnboardingStep = {
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
};

const REAL_TIME_CHAT_STEP: OnboardingStep = {
  id: "real-time-chat",
  type: "tutorial" as OnboardingStepType,
  title: "Real-time Chat",
  description: "Stay connected",
  icon: "chatbubbles",
  iconColor: "#3ba55c",
  content: "Send messages instantly with text, images, and reactions. Express yourself with custom emojis and GIFs.",
  skippable: true,
  required: false,
};

const VOICE_VIDEO_STEP: OnboardingStep = {
  id: "voice-video",
  type: "interaction" as OnboardingStepType,
  title: "Voice & Video",
  description: "Talk face-to-face",
  icon: "videocam",
  iconColor: "#eb459e",
  content: "Drop into voice channels to chat hands-free, or start a video call with friends and screen share.",
  skippable: true,
  required: false,
};

const NOTIFICATIONS_STEP: OnboardingStep = {
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
};

const PROFILE_SETUP_STEP: OnboardingStep = {
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
};

// Interactive tutorial steps for mobile gestures
const MOBILE_GESTURES_STEP: OnboardingStep = {
  id: "mobile-gestures",
  type: "gesture_training" as OnboardingStepType,
  title: "Master Mobile Gestures",
  description: "Learn essential gestures",
  icon: "hand-right",
  iconColor: "#8b5cf6",
  content: "Learn the essential mobile gestures that make navigating Hearth fast and intuitive. Practice each gesture and get instant feedback!",
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
      backgroundColor: "#f8fafc",
    },
    successMessage: "Great job! You've mastered the basic gestures!",
    retryMessage: "Try again! Remember to follow the instructions carefully.",
  },
  interactiveConfig: {
    targetGesture: {
      type: "tap",
      hapticFeedback: true,
    },
    successCriteria: {
      attempts: 3,
      accuracy: 80,
      timeLimit: 30000,
    },
    hints: [
      "Tap gently with one finger",
      "Make sure your tap is quick and precise",
      "Try tapping in the center of the practice area",
    ],
  },
};

const CHAT_GESTURES_STEP: OnboardingStep = {
  id: "chat-gestures",
  type: "interactive_tutorial" as OnboardingStepType,
  title: "Chat Interactions",
  description: "Message gestures",
  icon: "chatbubbles",
  iconColor: "#10b981",
  content: "Learn how to interact with messages using gestures. Swipe to reply, long-press for options, and double-tap to react!",
  skippable: true,
  required: false,
  gestureTraining: {
    targetGestures: [
      {
        type: "swipe",
        direction: "left",
        distance: 80,
        hapticFeedback: true,
      },
      {
        type: "long_press",
        duration: 1500,
        hapticFeedback: true,
      },
      {
        type: "double_tap",
        hapticFeedback: true,
      },
    ],
    practiceArea: {
      width: 320,
      height: 180,
      backgroundColor: "#ecfdf5",
    },
    successMessage: "Perfect! You can now interact with messages like a pro!",
    retryMessage: "Keep practicing! These gestures will become second nature.",
  },
  interactiveConfig: {
    targetGesture: {
      type: "swipe",
      direction: "left",
      distance: 80,
      hapticFeedback: true,
    },
    successCriteria: {
      attempts: 5,
      accuracy: 75,
      timeLimit: 45000,
    },
    hints: [
      "Swipe left on a message to quickly reply",
      "Long-press a message to see all options",
      "Double-tap to add a heart reaction",
      "Swipe with consistent speed for best results",
    ],
  },
};

const NAVIGATION_GESTURES_STEP: OnboardingStep = {
  id: "navigation-gestures",
  type: "interactive_tutorial" as OnboardingStepType,
  title: "Quick Navigation",
  description: "Navigate like a pro",
  icon: "navigate",
  iconColor: "#f59e0b",
  content: "Master navigation gestures to move around Hearth quickly. Swipe between channels, pull to refresh, and use pinch to zoom!",
  skippable: true,
  required: false,
  gestureTraining: {
    targetGestures: [
      {
        type: "swipe",
        direction: "right",
        distance: 120,
        hapticFeedback: true,
      },
      {
        type: "pull_to_refresh",
        hapticFeedback: true,
      },
      {
        type: "pinch",
        hapticFeedback: true,
      },
    ],
    practiceArea: {
      width: 340,
      height: 220,
      backgroundColor: "#fef3c7",
    },
    successMessage: "Excellent! You're now a navigation expert!",
    retryMessage: "Practice makes perfect! Try the gesture again.",
  },
  interactiveConfig: {
    targetGesture: {
      type: "swipe",
      direction: "right",
      distance: 120,
      hapticFeedback: true,
    },
    successCriteria: {
      attempts: 4,
      accuracy: 85,
      timeLimit: 60000,
    },
    hints: [
      "Swipe right to go back to previous channel",
      "Pull down from the top to refresh content",
      "Use two fingers to pinch and zoom text",
      "Navigation gestures work throughout the app",
    ],
  },
};

// User-type-specific flow configurations
const FLOW_CONFIGS: Record<UserType, OnboardingFlowConfig> = {
  casual: {
    userType: "casual",
    description: "Standard onboarding flow for casual users with interactive tutorials",
    steps: [
      WELCOME_STEP,
      MOBILE_GESTURES_STEP,
      JOIN_COMMUNITIES_STEP,
      REAL_TIME_CHAT_STEP,
      CHAT_GESTURES_STEP,
      VOICE_VIDEO_STEP,
      NAVIGATION_GESTURES_STEP,
      NOTIFICATIONS_STEP,
      PROFILE_SETUP_STEP,
    ],
  },
  gamer: {
    userType: "gamer",
    description: "Gaming-focused onboarding with voice chat emphasis and gesture training",
    steps: [
      WELCOME_STEP,
      MOBILE_GESTURES_STEP,
      { ...JOIN_COMMUNITIES_STEP, content: "Find gaming communities, esports teams, and LFG groups. Join servers for your favorite games." },
      VOICE_VIDEO_STEP,
      REAL_TIME_CHAT_STEP,
      CHAT_GESTURES_STEP,
      NAVIGATION_GESTURES_STEP,
      NOTIFICATIONS_STEP,
      PROFILE_SETUP_STEP,
    ],
  },
  professional: {
    userType: "professional",
    description: "Professional onboarding with workspace focus and essential gestures",
    steps: [
      WELCOME_STEP,
      MOBILE_GESTURES_STEP,
      { ...JOIN_COMMUNITIES_STEP, title: "Join Workspaces", content: "Connect with professional communities, industry groups, and team workspaces." },
      REAL_TIME_CHAT_STEP,
      CHAT_GESTURES_STEP,
      NAVIGATION_GESTURES_STEP,
      NOTIFICATIONS_STEP,
      PROFILE_SETUP_STEP,
    ],
  },
  creator: {
    userType: "creator",
    description: "Creator-focused onboarding with community building emphasis and full gesture training",
    steps: [
      WELCOME_STEP,
      MOBILE_GESTURES_STEP,
      { ...JOIN_COMMUNITIES_STEP, content: "Discover creator communities, fan servers, and collaboration spaces. Share your content with the world." },
      REAL_TIME_CHAT_STEP,
      CHAT_GESTURES_STEP,
      VOICE_VIDEO_STEP,
      NAVIGATION_GESTURES_STEP,
      NOTIFICATIONS_STEP,
      PROFILE_SETUP_STEP,
    ],
  },
};

// Default steps (casual flow) for backward compatibility
const DEFAULT_STEPS: OnboardingStep[] = FLOW_CONFIGS.casual.steps;

export function getFlowConfig(userType: UserType): OnboardingFlowConfig {
  return FLOW_CONFIGS[userType] ?? FLOW_CONFIGS.casual;
}

export function getAvailableUserTypes(): UserType[] {
  return Object.keys(FLOW_CONFIGS) as UserType[];
}

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

  // Start onboarding flow with user-type-specific steps
  async startFlow(userType: UserType = "casual"): Promise<void> {
    const config = getFlowConfig(userType);
    const flow: OnboardingFlow = {
      id: `flow_${Date.now()}`,
      userType,
      steps: config.steps,
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
    onboardingAnalytics.trackFlowStarted(flow.id, userType, flow.steps.length);
    onboardingAnalytics.trackStepViewed(flow.steps[0], 0, flow.steps.length);
  }

  // Navigate to specific step
  async goToStep(stepIndex: number): Promise<void> {
    if (!this.state.currentFlow) return;

    const flow = { ...this.state.currentFlow };
    flow.currentStepIndex = Math.max(0, Math.min(stepIndex, flow.steps.length - 1));
    const progress = this.calculateProgress(flow);

    this.state = { ...this.state, currentFlow: flow, progress };
    await this.persistFlow();

    const step = flow.steps[flow.currentStepIndex];
    if (step) {
      onboardingAnalytics.trackStepViewed(step, flow.currentStepIndex, flow.steps.length);
    }
  }

  // Complete current step
  async completeCurrentStep(): Promise<void> {
    if (!this.state.currentFlow) return;

    const flow = { ...this.state.currentFlow };
    const currentStep = flow.steps[flow.currentStepIndex];

    if (currentStep && !flow.completedStepIds.includes(currentStep.id)) {
      flow.completedStepIds.push(currentStep.id);
      onboardingAnalytics.trackStepCompleted(currentStep, flow.currentStepIndex);
    }

    // Auto-advance if not last step
    if (flow.currentStepIndex < flow.steps.length - 1) {
      flow.currentStepIndex++;
      const nextStep = flow.steps[flow.currentStepIndex];
      if (nextStep) {
        onboardingAnalytics.trackStepViewed(nextStep, flow.currentStepIndex, flow.steps.length);
      }
    } else {
      // Flow complete
      flow.completedAt = new Date();
      this.state.isOnboardingComplete = true;
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEYS.IS_COMPLETE, "true");

      const durationMs = flow.startedAt
        ? Date.now() - new Date(flow.startedAt).getTime()
        : 0;
      onboardingAnalytics.trackFlowCompleted(
        flow.id,
        flow.userType,
        flow.completedStepIds.length,
        flow.skippedStepIds.length,
        flow.steps.length,
        durationMs
      );
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
      onboardingAnalytics.trackStepSkipped(currentStep, flow.currentStepIndex);
    }

    // Advance if not last step
    if (flow.currentStepIndex < flow.steps.length - 1) {
      flow.currentStepIndex++;
      const nextStep = flow.steps[flow.currentStepIndex];
      if (nextStep) {
        onboardingAnalytics.trackStepViewed(nextStep, flow.currentStepIndex, flow.steps.length);
      }
    } else {
      // Flow complete
      flow.completedAt = new Date();
      this.state.isOnboardingComplete = true;
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEYS.IS_COMPLETE, "true");
    }

    const progress = this.calculateProgress(flow);
    this.state = { ...this.state, currentFlow: flow, progress };
    await this.persistFlow();
  }

  // Set user interests
  async setInterests(interests: string[]): Promise<void> {
    this.state = { ...this.state, interests };
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEYS.INTERESTS, JSON.stringify(interests));
    onboardingAnalytics.trackInterestsSelected(interests);
  }

  // Set server categories
  async setServerCategories(categories: string[]): Promise<void> {
    this.state = { ...this.state, selectedServerCategories: categories };
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEYS.SERVER_CATEGORIES, JSON.stringify(categories));
    onboardingAnalytics.trackServerCategoriesSelected(categories);
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

  // Resume a previously paused flow
  async resumeFlow(): Promise<void> {
    if (!this.state.currentFlow) return;
    if (!this.state.currentFlow.pausedAt) return;

    const flow = { ...this.state.currentFlow };
    flow.pausedAt = undefined;
    this.state = { ...this.state, currentFlow: flow };
    await this.persistFlow();

    const currentStep = flow.steps[flow.currentStepIndex];
    if (currentStep) {
      onboardingAnalytics.trackFlowResumed(flow.id, currentStep.id, flow.currentStepIndex);
      onboardingAnalytics.trackStepViewed(currentStep, flow.currentStepIndex, flow.steps.length);
    }
  }

  // Check if there is a paused flow that can be resumed
  hasPausedFlow(): boolean {
    return this.state.currentFlow?.pausedAt !== undefined && !this.state.isOnboardingComplete;
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
