/**
 * Tests for useRichNotifications Hook - PN-005
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { useRichNotifications } from "../../lib/hooks/useRichNotifications";

// Mock all the dependencies
jest.mock("expo-notifications", () => ({
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  dismissAllNotificationsAsync: jest.fn(),
  dismissNotificationAsync: jest.fn(),
}));

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock("react-native", () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

// Mock all the rich notification services
jest.mock("../../lib/services/richNotificationActions", () => ({
  initializeRichNotificationActions: jest.fn(),
  createRichNotification: jest.fn(),
}));

jest.mock("../../lib/services/notificationMedia", () => ({
  processNotificationMedia: jest.fn(),
}));

jest.mock("../../lib/services/notificationSounds", () => ({
  initializeNotificationSounds: jest.fn(),
  getAvailableSounds: jest.fn(),
  getAvailableVibrations: jest.fn(),
  playNotificationSound: jest.fn(),
  triggerNotificationVibration: jest.fn(),
  getSoundForNotification: jest.fn(),
}));

jest.mock("../../lib/services/notificationFiltering", () => ({
  initializeNotificationFiltering: jest.fn(),
  getKeywordAlerts: jest.fn(),
  getFilterStatistics: jest.fn(),
  addKeywordAlert: jest.fn(),
  deleteKeywordAlert: jest.fn(),
  applyNotificationFilters: jest.fn(),
}));

jest.mock("../../lib/services/notificationActionHandlers", () => ({
  initializeNotificationActionHandlers: jest.fn(),
  processNotificationAction: jest.fn(),
  retryPendingActions: jest.fn(),
  getActionHistory: jest.fn(),
}));

jest.mock("../../lib/services/notifications", () => ({
  registerForPushNotifications: jest.fn(),
  getNotificationSettings: jest.fn(),
  saveNotificationSettings: jest.fn(),
  clearBadgeCount: jest.fn(),
}));

import * as Notifications from "expo-notifications";
import { AppState } from "react-native";
import { router } from "expo-router";

// Import mocked services
import {
  initializeRichNotificationActions,
  createRichNotification,
} from "../../lib/services/richNotificationActions";
import { processNotificationMedia } from "../../lib/services/notificationMedia";
import {
  initializeNotificationSounds,
  getAvailableSounds,
  getAvailableVibrations,
  playNotificationSound,
  triggerNotificationVibration,
  getSoundForNotification,
} from "../../lib/services/notificationSounds";
import {
  initializeNotificationFiltering,
  getKeywordAlerts,
  getFilterStatistics,
  addKeywordAlert,
  deleteKeywordAlert,
  applyNotificationFilters,
} from "../../lib/services/notificationFiltering";
import {
  initializeNotificationActionHandlers,
  processNotificationAction,
  retryPendingActions,
  getActionHistory,
} from "../../lib/services/notificationActionHandlers";
import {
  registerForPushNotifications,
  getNotificationSettings,
  saveNotificationSettings,
  clearBadgeCount,
} from "../../lib/services/notifications";

// Type the mocks
const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;
const mockAppState = AppState as jest.Mocked<typeof AppState>;
const mockRouter = router as jest.Mocked<typeof router>;

const mockInitializeRichNotificationActions = initializeRichNotificationActions as jest.MockedFunction<typeof initializeRichNotificationActions>;
const mockCreateRichNotification = createRichNotification as jest.MockedFunction<typeof createRichNotification>;
const mockProcessNotificationMedia = processNotificationMedia as jest.MockedFunction<typeof processNotificationMedia>;
const mockInitializeNotificationSounds = initializeNotificationSounds as jest.MockedFunction<typeof initializeNotificationSounds>;
const mockGetAvailableSounds = getAvailableSounds as jest.MockedFunction<typeof getAvailableSounds>;
const mockGetAvailableVibrations = getAvailableVibrations as jest.MockedFunction<typeof getAvailableVibrations>;
const mockPlayNotificationSound = playNotificationSound as jest.MockedFunction<typeof playNotificationSound>;
const mockTriggerNotificationVibration = triggerNotificationVibration as jest.MockedFunction<typeof triggerNotificationVibration>;
const mockGetSoundForNotification = getSoundForNotification as jest.MockedFunction<typeof getSoundForNotification>;
const mockInitializeNotificationFiltering = initializeNotificationFiltering as jest.MockedFunction<typeof initializeNotificationFiltering>;
const mockGetKeywordAlerts = getKeywordAlerts as jest.MockedFunction<typeof getKeywordAlerts>;
const mockGetFilterStatistics = getFilterStatistics as jest.MockedFunction<typeof getFilterStatistics>;
const mockAddKeywordAlert = addKeywordAlert as jest.MockedFunction<typeof addKeywordAlert>;
const mockDeleteKeywordAlert = deleteKeywordAlert as jest.MockedFunction<typeof deleteKeywordAlert>;
const mockApplyNotificationFilters = applyNotificationFilters as jest.MockedFunction<typeof applyNotificationFilters>;
const mockInitializeNotificationActionHandlers = initializeNotificationActionHandlers as jest.MockedFunction<typeof initializeNotificationActionHandlers>;
const mockProcessNotificationAction = processNotificationAction as jest.MockedFunction<typeof processNotificationAction>;
const mockRetryPendingActions = retryPendingActions as jest.MockedFunction<typeof retryPendingActions>;
const mockGetActionHistory = getActionHistory as jest.MockedFunction<typeof getActionHistory>;
const mockRegisterForPushNotifications = registerForPushNotifications as jest.MockedFunction<typeof registerForPushNotifications>;
const mockGetNotificationSettings = getNotificationSettings as jest.MockedFunction<typeof getNotificationSettings>;
const mockSaveNotificationSettings = saveNotificationSettings as jest.MockedFunction<typeof saveNotificationSettings>;
const mockClearBadgeCount = clearBadgeCount as jest.MockedFunction<typeof clearBadgeCount>;

describe("useRichNotifications Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    mockInitializeRichNotificationActions.mockResolvedValue();
    mockInitializeNotificationSounds.mockResolvedValue();
    mockInitializeNotificationFiltering.mockResolvedValue();
    mockInitializeNotificationActionHandlers.mockResolvedValue();

    mockGetNotificationSettings.mockResolvedValue({
      enabled: true,
      messages: true,
      dms: true,
      mentions: true,
      serverActivity: true,
      friendRequests: true,
      calls: true,
      sounds: true,
      vibration: true,
      badgeCount: true,
      showPreviews: true,
      quietHoursEnabled: false,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
    });

    mockGetAvailableSounds.mockResolvedValue([
      {
        id: "default",
        name: "Default",
        description: "System default",
        file: "default",
        isBuiltIn: true,
        category: "tone",
        duration: 1.5,
      },
    ]);

    mockGetAvailableVibrations.mockReturnValue([
      {
        id: "default",
        name: "Default",
        description: "System default vibration",
        pattern: [0, 250, 250, 250],
        intensity: "medium",
      },
    ]);

    mockGetKeywordAlerts.mockResolvedValue([]);
    mockGetFilterStatistics.mockResolvedValue({
      totalKeywordAlerts: 0,
      activeKeywordAlerts: 0,
      scheduledNotifications: 0,
      recentlyFiltered: 0,
    });

    mockGetActionHistory.mockResolvedValue([]);

    // Mock notification listeners
    mockNotifications.addNotificationReceivedListener.mockReturnValue({
      remove: jest.fn(),
    } as any);

    mockNotifications.addNotificationResponseReceivedListener.mockReturnValue({
      remove: jest.fn(),
    } as any);

    mockAppState.addEventListener.mockReturnValue({
      remove: jest.fn(),
    } as any);
  });

  describe("Initialization", () => {
    it("should initialize all rich notification systems", async () => {
      const { result } = renderHook(() => useRichNotifications());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockInitializeRichNotificationActions).toHaveBeenCalled();
      expect(mockInitializeNotificationSounds).toHaveBeenCalled();
      expect(mockInitializeNotificationFiltering).toHaveBeenCalled();
      expect(mockInitializeNotificationActionHandlers).toHaveBeenCalled();
    });

    it("should load initial data after initialization", async () => {
      const { result } = renderHook(() => useRichNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetNotificationSettings).toHaveBeenCalled();
      expect(mockGetAvailableSounds).toHaveBeenCalled();
      expect(mockGetAvailableVibrations).toHaveBeenCalled();
      expect(mockGetKeywordAlerts).toHaveBeenCalled();
      expect(mockGetFilterStatistics).toHaveBeenCalled();
    });

    it("should handle initialization errors", async () => {
      mockInitializeRichNotificationActions.mockRejectedValue(new Error("Init failed"));

      const { result } = renderHook(() => useRichNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("Init failed");
    });

    it("should setup notification listeners", async () => {
      renderHook(() => useRichNotifications());

      expect(mockNotifications.addNotificationReceivedListener).toHaveBeenCalled();
      expect(mockNotifications.addNotificationResponseReceivedListener).toHaveBeenCalled();
      expect(mockAppState.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    });
  });

  describe("Registration", () => {
    it("should register for push notifications", async () => {
      mockRegisterForPushNotifications.mockResolvedValue("expo-push-token");

      const { result } = renderHook(() => useRichNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let registrationResult: boolean;
      await act(async () => {
        registrationResult = await result.current.register();
      });

      expect(registrationResult!).toBe(true);
      expect(result.current.expoPushToken).toBe("expo-push-token");
      expect(mockRegisterForPushNotifications).toHaveBeenCalled();
    });

    it("should handle registration failure", async () => {
      mockRegisterForPushNotifications.mockResolvedValue(null);

      const { result } = renderHook(() => useRichNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let registrationResult: boolean;
      await act(async () => {
        registrationResult = await result.current.register();
      });

      expect(registrationResult!).toBe(false);
      expect(result.current.error).toBe("Failed to get push token");
    });
  });

  describe("Rich Notification Creation", () => {
    it("should create rich notification", async () => {
      mockProcessNotificationMedia.mockResolvedValue({
        attachments: [],
        primaryImage: "processed-image-url",
      });

      mockGetSoundForNotification.mockResolvedValue({
        soundId: "default",
        vibrationId: "default",
        volume: 0.8,
      });

      mockCreateRichNotification.mockResolvedValue("notification-id");

      const { result } = renderHook(() => useRichNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const payload = {
        type: "message" as const,
        title: "Test User",
        body: "Hello world",
        serverId: "server1",
        channelId: "channel1",
      };

      let notificationId: string;
      await act(async () => {
        notificationId = await result.current.createNotification(payload, {
          media: {
            userAvatar: "https://example.com/avatar.jpg",
          },
        });
      });

      expect(notificationId!).toBe("notification-id");
      expect(mockProcessNotificationMedia).toHaveBeenCalledWith({
        userAvatar: "https://example.com/avatar.jpg",
      });
      expect(mockCreateRichNotification).toHaveBeenCalledWith(payload, {
        imageUrl: "processed-image-url",
      });
    });
  });

  describe("Sound and Vibration", () => {
    it("should preview sound", async () => {
      const { result } = renderHook(() => useRichNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.previewSound("default", 0.8);
      });

      expect(mockPlayNotificationSound).toHaveBeenCalledWith("default", 0.8);
    });

    it("should preview vibration", async () => {
      const { result } = renderHook(() => useRichNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.previewVibration("default");
      });

      expect(mockTriggerNotificationVibration).toHaveBeenCalledWith("default");
    });

    it("should preview sound and vibration together", async () => {
      const { result } = renderHook(() => useRichNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.previewSoundAndVibration("sound1", "vibration1", 0.9);
      });

      expect(mockTriggerNotificationVibration).toHaveBeenCalledWith("vibration1");
      // Sound should be played after a delay, but we can't easily test the setTimeout
      expect(mockPlayNotificationSound).toHaveBeenCalled();
    });
  });

  describe("Keyword Alerts", () => {
    it("should add keyword alert", async () => {
      const newAlert = {
        id: "alert1",
        keyword: "urgent",
        caseSensitive: false,
        wholeWord: true,
        enabled: true,
        priority: "high" as const,
        createdAt: Date.now(),
      };

      mockAddKeywordAlert.mockResolvedValue(newAlert);

      const { result } = renderHook(() => useRichNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const alertData = {
        keyword: "urgent",
        caseSensitive: false,
        wholeWord: true,
        enabled: true,
        priority: "high" as const,
      };

      let addedAlert;
      await act(async () => {
        addedAlert = await result.current.addKeywordAlert(alertData);
      });

      expect(addedAlert).toEqual(newAlert);
      expect(mockAddKeywordAlert).toHaveBeenCalledWith(alertData);
    });

    it("should remove keyword alert", async () => {
      const { result } = renderHook(() => useRichNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.removeKeywordAlert("alert1");
      });

      expect(mockDeleteKeywordAlert).toHaveBeenCalledWith("alert1");
    });

    it("should test filters", async () => {
      mockApplyNotificationFilters.mockResolvedValue({
        allowed: false,
        reason: "Matched spam pattern",
      });

      const { result } = renderHook(() => useRichNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const payload = {
        type: "message" as const,
        title: "Spam",
        body: "Click here for free money!",
      };

      let filterResult;
      await act(async () => {
        filterResult = await result.current.testFilter(payload);
      });

      expect(filterResult).toEqual({
        allowed: false,
        reason: "Matched spam pattern",
      });
      expect(mockApplyNotificationFilters).toHaveBeenCalledWith(payload);
    });
  });

  describe("Action Management", () => {
    it("should retry failed actions", async () => {
      const { result } = renderHook(() => useRichNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.retryFailedActions();
      });

      expect(mockRetryPendingActions).toHaveBeenCalled();
    });

    it("should clear action history", async () => {
      const { result } = renderHook(() => useRichNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.clearActionHistory();
      });

      expect(result.current.actionHistory).toEqual([]);
    });

    it("should auto-retry actions when enabled", async () => {
      jest.useFakeTimers();

      renderHook(() => useRichNotifications({
        enableAutoRetry: true,
      }));

      // Fast-forward 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      expect(mockRetryPendingActions).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe("Settings Management", () => {
    it("should update notification settings", async () => {
      const updatedSettings = {
        enabled: true,
        messages: false,
        dms: true,
        mentions: true,
        serverActivity: true,
        friendRequests: true,
        calls: true,
        sounds: false,
        vibration: true,
        badgeCount: true,
        showPreviews: true,
        quietHoursEnabled: true,
        quietHoursStart: "22:00",
        quietHoursEnd: "07:00",
      };

      mockSaveNotificationSettings.mockResolvedValue(updatedSettings);

      const { result } = renderHook(() => useRichNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const updates = {
        messages: false,
        sounds: false,
        quietHoursEnabled: true,
      };

      await act(async () => {
        await result.current.updateSettings(updates);
      });

      expect(mockSaveNotificationSettings).toHaveBeenCalledWith(updates);
      expect(result.current.settings).toEqual(updatedSettings);
    });
  });

  describe("Notification Listeners", () => {
    it("should handle received notifications with filtering", async () => {
      let notificationListener: Function | undefined;

      mockNotifications.addNotificationReceivedListener.mockImplementation((listener) => {
        notificationListener = listener;
        return { remove: jest.fn() } as any;
      });

      mockApplyNotificationFilters.mockResolvedValue({
        allowed: false,
        reason: "Filtered out",
      });

      mockNotifications.dismissNotificationAsync.mockResolvedValue();

      const onFilterApplied = jest.fn();

      renderHook(() => useRichNotifications({
        onFilterApplied,
      }));

      const mockNotification = {
        request: {
          identifier: "notification-id",
          content: {
            data: {
              type: "message",
              title: "Test",
              body: "Filtered message",
            },
          },
        },
      };

      await act(async () => {
        if (notificationListener) {
          await notificationListener(mockNotification);
        }
      });

      expect(mockApplyNotificationFilters).toHaveBeenCalled();
      expect(mockNotifications.dismissNotificationAsync).toHaveBeenCalledWith("notification-id");
      expect(onFilterApplied).toHaveBeenCalledWith(false, "Filtered out");
    });

    it("should handle notification action responses", async () => {
      let responseListener: Function | undefined;

      mockNotifications.addNotificationResponseReceivedListener.mockImplementation((listener) => {
        responseListener = listener;
        return { remove: jest.fn() } as any;
      });

      const onActionExecuted = jest.fn();

      renderHook(() => useRichNotifications({
        onActionExecuted,
      }));

      const mockResponse = {
        notification: {
          request: {
            identifier: "notification-id",
            content: {
              data: {
                type: "message",
                channelId: "channel1",
              },
            },
          },
        },
        actionIdentifier: "quick_reply",
        userText: "Test reply",
      };

      await act(async () => {
        if (responseListener) {
          await responseListener(mockResponse);
        }
      });

      expect(mockProcessNotificationAction).toHaveBeenCalledWith(mockResponse);
      expect(onActionExecuted).toHaveBeenCalledWith("quick_reply", true);
    });
  });

  describe("Utility Functions", () => {
    it("should refresh data", async () => {
      const { result } = renderHook(() => useRichNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshData();
      });

      // Verify that all data loading functions were called again
      expect(mockGetNotificationSettings).toHaveBeenCalledTimes(2); // Once on init, once on refresh
      expect(mockGetAvailableSounds).toHaveBeenCalledTimes(2);
      expect(mockGetKeywordAlerts).toHaveBeenCalledTimes(2);
    });

    it("should clear all notifications", async () => {
      mockNotifications.dismissAllNotificationsAsync.mockResolvedValue();

      const { result } = renderHook(() => useRichNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.clearAllNotifications();
      });

      expect(mockNotifications.dismissAllNotificationsAsync).toHaveBeenCalled();
      expect(mockClearBadgeCount).toHaveBeenCalled();
    });
  });

  describe("Cleanup", () => {
    it("should cleanup listeners on unmount", () => {
      const removeNotificationListener = jest.fn();
      const removeResponseListener = jest.fn();
      const removeAppStateListener = jest.fn();

      mockNotifications.addNotificationReceivedListener.mockReturnValue({
        remove: removeNotificationListener,
      } as any);

      mockNotifications.addNotificationResponseReceivedListener.mockReturnValue({
        remove: removeResponseListener,
      } as any);

      mockAppState.addEventListener.mockReturnValue({
        remove: removeAppStateListener,
      } as any);

      const { unmount } = renderHook(() => useRichNotifications());

      unmount();

      expect(removeNotificationListener).toHaveBeenCalled();
      expect(removeResponseListener).toHaveBeenCalled();
      expect(removeAppStateListener).toHaveBeenCalled();
    });
  });
});