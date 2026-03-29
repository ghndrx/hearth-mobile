/**
 * Tests for Onboarding Store
 *
 * Tests the onboarding state management and progress tracking
 * for ONB-001 implementation.
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../../lib/services/analytics', () => ({
  analytics: {
    logEvent: jest.fn(),
    initialize: jest.fn(),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingStore, onboardingStore } from '../../lib/stores/onboarding';
import { ONBOARDING_STORAGE_KEYS } from '../../lib/types/onboarding';

const mockAsyncStorage = jest.mocked(AsyncStorage);

describe('OnboardingStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
  });

  describe('initialization', () => {
    it('should create store with default state', () => {
      const store = new OnboardingStore();
      const state = store.getState();

      expect(state.isOnboardingComplete).toBe(false);
      expect(state.hasSeenOnboarding).toBe(false);
      expect(state.currentFlow).toBe(null);
      expect(state.progress).toBe(null);
      expect(state.interests).toEqual([]);
      expect(state.selectedServerCategories).toEqual([]);
      expect(state.profileSetupComplete).toBe(false);
      expect(state.notificationSetupComplete).toBe(false);
    });

    it('should initialize from storage', async () => {
      const mockFlow = {
        id: 'flow_123',
        userType: 'casual' as const,
        steps: [],
        currentStepIndex: 0,
        completedStepIds: ['welcome'],
        skippedStepIds: [],
        startedAt: '2026-03-29T07:50:22.313Z',
      };

      mockAsyncStorage.getItem
        .mockResolvedValueOnce('true') // IS_COMPLETE
        .mockResolvedValueOnce(JSON.stringify(mockFlow)) // CURRENT_FLOW
        .mockResolvedValueOnce(JSON.stringify({ completedSteps: ['welcome'] })) // PROGRESS
        .mockResolvedValueOnce(JSON.stringify(['gaming', 'music'])) // INTERESTS
        .mockResolvedValueOnce(JSON.stringify(['tech', 'art'])) // SERVER_CATEGORIES
        .mockResolvedValueOnce('true') // PROFILE_COMPLETE
        .mockResolvedValueOnce('true'); // NOTIFICATION_COMPLETE

      const store = new OnboardingStore();
      await store.initialize();

      const state = store.getState();
      expect(state.isOnboardingComplete).toBe(true);
      expect(state.hasSeenOnboarding).toBe(true);
      expect(state.currentFlow).toEqual(mockFlow);
      expect(state.interests).toEqual(['gaming', 'music']);
      expect(state.selectedServerCategories).toEqual(['tech', 'art']);
      expect(state.profileSetupComplete).toBe(true);
      expect(state.notificationSetupComplete).toBe(true);
    });
  });

  describe('startFlow', () => {
    it('should start a new onboarding flow', async () => {
      const store = new OnboardingStore();
      await store.initialize();
      await store.startFlow('gamer');

      const state = store.getState();
      expect(state.currentFlow).not.toBeNull();
      expect(state.currentFlow?.userType).toBe('gamer');
      expect(state.currentFlow?.steps.length).toBeGreaterThan(0);
      expect(state.currentFlow?.currentStepIndex).toBe(0);
      expect(state.hasSeenOnboarding).toBe(true);
    });

    it('should default to casual user type', async () => {
      const store = new OnboardingStore();
      await store.initialize();
      await store.startFlow();

      const state = store.getState();
      expect(state.currentFlow?.userType).toBe('casual');
    });

    it('should set startedAt timestamp', async () => {
      const store = new OnboardingStore();
      await store.initialize();
      const before = new Date();
      await store.startFlow();
      const after = new Date();

      const state = store.getState();
      expect(state.currentFlow?.startedAt).toBeDefined();
      const startedAt = new Date(state.currentFlow!.startedAt!);
      expect(startedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(startedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('goToStep', () => {
    it('should navigate to specific step', async () => {
      const store = new OnboardingStore();
      await store.initialize();
      await store.startFlow();

      await store.goToStep(2);

      const state = store.getState();
      expect(state.currentFlow?.currentStepIndex).toBe(2);
    });

    it('should clamp step index to valid range', async () => {
      const store = new OnboardingStore();
      await store.initialize();
      await store.startFlow();

      // Should not go below 0
      await store.goToStep(-1);
      let state = store.getState();
      expect(state.currentFlow?.currentStepIndex).toBe(0);

      // Should not exceed max index
      await store.goToStep(999);
      state = store.getState();
      expect(state.currentFlow?.currentStepIndex).toBeLessThan(
        state.currentFlow!.steps.length
      );
    });
  });

  describe('completeCurrentStep', () => {
    it('should mark current step as completed', async () => {
      const store = new OnboardingStore();
      await store.initialize();
      await store.startFlow();

      const initialStep = store.getState().currentFlow?.steps[0];
      await store.completeCurrentStep();

      const state = store.getState();
      expect(state.currentFlow?.completedStepIds).toContain(initialStep?.id);
    });

    it('should advance to next step', async () => {
      const store = new OnboardingStore();
      await store.initialize();
      await store.startFlow();

      const initialIndex = store.getState().currentFlow?.currentStepIndex;
      await store.completeCurrentStep();

      const state = store.getState();
      expect(state.currentFlow?.currentStepIndex).toBe(initialIndex! + 1);
    });

    it('should mark flow as complete on last step', async () => {
      const store = new OnboardingStore();
      await store.initialize();
      await store.startFlow();

      // Navigate to last step
      const lastIndex = store.getState().currentFlow!.steps.length - 1;
      await store.goToStep(lastIndex);
      await store.completeCurrentStep();

      const state = store.getState();
      expect(state.isOnboardingComplete).toBe(true);
      expect(state.currentFlow?.completedAt).toBeDefined();
    });
  });

  describe('skipCurrentStep', () => {
    it('should mark current step as skipped', async () => {
      const store = new OnboardingStore();
      await store.initialize();
      await store.startFlow();

      const initialStep = store.getState().currentFlow?.steps[0];
      await store.skipCurrentStep();

      const state = store.getState();
      expect(state.currentFlow?.skippedStepIds).toContain(initialStep?.id);
    });

    it('should advance to next step', async () => {
      const store = new OnboardingStore();
      await store.initialize();
      await store.startFlow();

      const initialIndex = store.getState().currentFlow?.currentStepIndex;
      await store.skipCurrentStep();

      const state = store.getState();
      expect(state.currentFlow?.currentStepIndex).toBe(initialIndex! + 1);
    });

    it('should mark flow as complete when skipping last step', async () => {
      const store = new OnboardingStore();
      await store.initialize();
      await store.startFlow();

      // Navigate to last step
      const lastIndex = store.getState().currentFlow!.steps.length - 1;
      await store.goToStep(lastIndex);
      await store.skipCurrentStep();

      const state = store.getState();
      expect(state.isOnboardingComplete).toBe(true);
    });
  });

  describe('interests and categories', () => {
    it('should set interests', async () => {
      const store = new OnboardingStore();
      await store.initialize();

      await store.setInterests(['gaming', 'music', 'tech']);

      const state = store.getState();
      expect(state.interests).toEqual(['gaming', 'music', 'tech']);
    });

    it('should set server categories', async () => {
      const store = new OnboardingStore();
      await store.initialize();

      await store.setServerCategories(['gaming', 'music']);

      const state = store.getState();
      expect(state.selectedServerCategories).toEqual(['gaming', 'music']);
    });
  });

  describe('profile and notification setup', () => {
    it('should mark profile setup as complete', async () => {
      const store = new OnboardingStore();
      await store.initialize();

      await store.setProfileSetupComplete(true);

      const state = store.getState();
      expect(state.profileSetupComplete).toBe(true);
    });

    it('should mark notification setup as complete', async () => {
      const store = new OnboardingStore();
      await store.initialize();

      await store.setNotificationSetupComplete(true);

      const state = store.getState();
      expect(state.notificationSetupComplete).toBe(true);
    });
  });

  describe('resetFlow', () => {
    it('should reset all onboarding state', async () => {
      const store = new OnboardingStore();
      await store.initialize();
      await store.startFlow();
      await store.setInterests(['gaming']);
      await store.setServerCategories(['tech']);
      await store.setProfileSetupComplete(true);

      await store.resetFlow();

      const state = store.getState();
      expect(state.isOnboardingComplete).toBe(false);
      expect(state.hasSeenOnboarding).toBe(false);
      expect(state.currentFlow).toBeNull();
      expect(state.progress).toBeNull();
      expect(state.interests).toEqual([]);
      expect(state.selectedServerCategories).toEqual([]);
      expect(state.profileSetupComplete).toBe(false);
      expect(state.notificationSetupComplete).toBe(false);
    });

    it('should clear all storage', async () => {
      const store = new OnboardingStore();
      await store.resetFlow();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        ONBOARDING_STORAGE_KEYS.IS_COMPLETE
      );
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        ONBOARDING_STORAGE_KEYS.CURRENT_FLOW
      );
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        ONBOARDING_STORAGE_KEYS.PROGRESS
      );
    });
  });

  describe('progress calculation', () => {
    it('should calculate progress correctly', async () => {
      const store = new OnboardingStore();
      await store.initialize();
      await store.startFlow();

      // Complete first step
      await store.completeCurrentStep();

      const state = store.getState();
      expect(state.progress).not.toBeNull();
      expect(state.progress?.completedSteps.length).toBe(1);
      expect(state.progress?.totalSteps).toBe(state.currentFlow?.steps.length);
      expect(state.progress?.progressPercentage).toBeGreaterThan(0);
      expect(state.progress?.isComplete).toBe(false);
    });
  });

  describe('subscriber notifications', () => {
    it('should notify subscribers on state change', async () => {
      const store = new OnboardingStore();
      await store.initialize();

      const listener = jest.fn();
      store.subscribe(listener);

      await store.startFlow();

      expect(listener).toHaveBeenCalled();
    });

    it('should return unsubscribe function', async () => {
      const store = new OnboardingStore();
      await store.initialize();

      const listener = jest.fn();
      const unsubscribe = store.subscribe(listener);

      unsubscribe();
      await store.startFlow();

      // Listener should not be called after unsubscribe
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
