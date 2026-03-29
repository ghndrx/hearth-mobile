/**
 * Tests for Onboarding Analytics Service
 */

jest.mock('../../lib/services/analytics', () => ({
  analytics: {
    logEvent: jest.fn(),
    initialize: jest.fn(),
  },
}));

import { analytics } from '../../lib/services/analytics';
import { onboardingAnalytics } from '../../lib/services/onboardingAnalytics';
import { OnboardingStep } from '../../lib/types/onboarding';

const mockLogEvent = jest.mocked(analytics.logEvent);

const mockStep: OnboardingStep = {
  id: 'test-step',
  type: 'tutorial',
  title: 'Test Step',
  description: 'A test step',
  icon: 'heart',
  iconColor: '#ff0000',
  content: 'Test content',
  skippable: true,
  required: false,
};

describe('OnboardingAnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should track flow started', () => {
    onboardingAnalytics.trackFlowStarted('flow_1', 'casual', 6);

    expect(mockLogEvent).toHaveBeenCalledWith('onboarding_flow_started', {
      flow_id: 'flow_1',
      user_type: 'casual',
      total_steps: 6,
    });
  });

  it('should track flow completed with duration and completion rate', () => {
    onboardingAnalytics.trackFlowCompleted('flow_1', 'gamer', 5, 1, 6, 120000);

    expect(mockLogEvent).toHaveBeenCalledWith('onboarding_flow_completed', {
      flow_id: 'flow_1',
      user_type: 'gamer',
      completed_steps: 5,
      skipped_steps: 1,
      total_steps: 6,
      duration_ms: 120000,
      completion_rate: 83,
    });
  });

  it('should track flow abandoned with drop-off percentage', () => {
    onboardingAnalytics.trackFlowAbandoned('flow_1', 'casual', 'step-3', 2, 6);

    expect(mockLogEvent).toHaveBeenCalledWith('onboarding_flow_abandoned', {
      flow_id: 'flow_1',
      user_type: 'casual',
      last_step_id: 'step-3',
      completed_steps: 2,
      total_steps: 6,
      drop_off_percentage: 33,
    });
  });

  it('should track step viewed', () => {
    onboardingAnalytics.trackStepViewed(mockStep, 2, 6);

    expect(mockLogEvent).toHaveBeenCalledWith('onboarding_step_viewed', {
      step_id: 'test-step',
      step_type: 'tutorial',
      step_index: 2,
      total_steps: 6,
      is_required: false,
    });
  });

  it('should track step completed with duration', () => {
    // Simulate viewing then completing a step
    onboardingAnalytics.trackStepViewed(mockStep, 0, 6);
    onboardingAnalytics.trackStepCompleted(mockStep, 0);

    expect(mockLogEvent).toHaveBeenCalledWith('onboarding_step_completed', expect.objectContaining({
      step_id: 'test-step',
      step_type: 'tutorial',
      step_index: 0,
    }));
  });

  it('should track step skipped', () => {
    onboardingAnalytics.trackStepViewed(mockStep, 1, 6);
    onboardingAnalytics.trackStepSkipped(mockStep, 1);

    expect(mockLogEvent).toHaveBeenCalledWith('onboarding_step_skipped', expect.objectContaining({
      step_id: 'test-step',
      step_type: 'tutorial',
      step_index: 1,
    }));
  });

  it('should track interests selected', () => {
    onboardingAnalytics.trackInterestsSelected(['gaming', 'music']);

    expect(mockLogEvent).toHaveBeenCalledWith('onboarding_interests_selected', {
      interests: ['gaming', 'music'],
      count: 2,
    });
  });

  it('should track server categories selected', () => {
    onboardingAnalytics.trackServerCategoriesSelected(['tech', 'art']);

    expect(mockLogEvent).toHaveBeenCalledWith('onboarding_server_categories_selected', {
      categories: ['tech', 'art'],
      count: 2,
    });
  });

  it('should track flow resumed', () => {
    onboardingAnalytics.trackFlowResumed('flow_1', 'step-3', 2);

    expect(mockLogEvent).toHaveBeenCalledWith('onboarding_flow_resumed', {
      flow_id: 'flow_1',
      resumed_step_id: 'step-3',
      resumed_step_index: 2,
    });
  });
});
