/**
 * Tests for Notification Filtering and Scheduling - PN-005
 */

import {
  addKeywordAlert,
  checkKeywordAlerts,
  applyNotificationFilters,
  scheduleNotification,
  getFilterSettings,
  saveFilterSettings,
  DEFAULT_FILTER_SETTINGS,
} from "../../lib/services/notificationFiltering";

import type { NotificationPayload } from "../../lib/services/notifications";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock expo-notifications for scheduling
jest.mock("expo-notifications", () => ({
  scheduleNotificationAsync: jest.fn(),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;

describe("Notification Filtering", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Date.now to a fixed value for consistent testing
    jest.spyOn(Date, "now").mockReturnValue(1640000000000); // 2021-12-20T14:13:20.000Z
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Filter Settings", () => {
    it("should return default settings when none are stored", async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const settings = await getFilterSettings();

      expect(settings).toEqual(DEFAULT_FILTER_SETTINGS);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith("@hearth/notification_filters");
    });

    it("should merge stored settings with defaults", async () => {
      const storedSettings = {
        enabled: false,
        keywordAlertsEnabled: false,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedSettings));

      const settings = await getFilterSettings();

      expect(settings).toEqual({
        ...DEFAULT_FILTER_SETTINGS,
        enabled: false,
        keywordAlertsEnabled: false,
      });
    });

    it("should save filter settings", async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(DEFAULT_FILTER_SETTINGS));

      const updates = {
        rateLimitEnabled: false,
        rateLimitCount: 20,
      };

      const newSettings = await saveFilterSettings(updates);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        "@hearth/notification_filters",
        JSON.stringify({
          ...DEFAULT_FILTER_SETTINGS,
          ...updates,
        })
      );

      expect(newSettings).toEqual({
        ...DEFAULT_FILTER_SETTINGS,
        ...updates,
      });
    });
  });

  describe("Keyword Alerts", () => {
    beforeEach(() => {
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === "@hearth/keyword_alerts") {
          return Promise.resolve("[]"); // Empty alerts array
        }
        return Promise.resolve(null);
      });
    });

    it("should add keyword alert", async () => {
      const alertData = {
        keyword: "urgent",
        caseSensitive: false,
        wholeWord: true,
        enabled: true,
        priority: "high" as const,
      };

      const newAlert = await addKeywordAlert(alertData);

      expect(newAlert).toEqual({
        ...alertData,
        id: expect.stringMatching(/^kw_\d+_[a-z0-9]{9}$/),
        createdAt: 1640000000000,
      });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        "@hearth/keyword_alerts",
        expect.stringContaining('"urgent"')
      );
    });

    it("should check keyword alerts against notification content", async () => {
      const alerts = [
        {
          id: "alert1",
          keyword: "meeting",
          caseSensitive: false,
          wholeWord: true,
          enabled: true,
          priority: "high" as const,
          createdAt: Date.now(),
        },
        {
          id: "alert2",
          keyword: "URGENT",
          caseSensitive: true,
          wholeWord: false,
          enabled: true,
          priority: "urgent" as const,
          createdAt: Date.now(),
        },
        {
          id: "alert3",
          keyword: "disabled",
          caseSensitive: false,
          wholeWord: false,
          enabled: false,
          priority: "normal" as const,
          createdAt: Date.now(),
        },
      ];

      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === "@hearth/keyword_alerts") {
          return Promise.resolve(JSON.stringify(alerts));
        }
        if (key === "@hearth/notification_filters") {
          return Promise.resolve(JSON.stringify({ keywordAlertsEnabled: true }));
        }
        return Promise.resolve(null);
      });

      const payload: NotificationPayload = {
        type: "message",
        title: "Team Meeting",
        body: "Don't forget about the meeting tomorrow",
      };

      const matchedAlerts = await checkKeywordAlerts(payload);

      expect(matchedAlerts).toHaveLength(1);
      expect(matchedAlerts[0].id).toBe("alert1");
      expect(matchedAlerts[0].keyword).toBe("meeting");
    });

    it("should match case sensitive keywords", async () => {
      const alerts = [
        {
          id: "alert1",
          keyword: "URGENT",
          caseSensitive: true,
          wholeWord: false,
          enabled: true,
          priority: "urgent" as const,
          createdAt: Date.now(),
        },
      ];

      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === "@hearth/keyword_alerts") {
          return Promise.resolve(JSON.stringify(alerts));
        }
        if (key === "@hearth/notification_filters") {
          return Promise.resolve(JSON.stringify({ keywordAlertsEnabled: true }));
        }
        return Promise.resolve(null);
      });

      const payload: NotificationPayload = {
        type: "message",
        title: "URGENT: Action Required",
        body: "This is urgent",
      };

      const matchedAlerts = await checkKeywordAlerts(payload);

      expect(matchedAlerts).toHaveLength(1);
      expect(matchedAlerts[0].keyword).toBe("URGENT");

      // Test case sensitivity - should not match lowercase
      payload.title = "urgent: action required";
      const noMatch = await checkKeywordAlerts(payload);
      expect(noMatch).toHaveLength(0);
    });

    it("should respect channel filters", async () => {
      const alerts = [
        {
          id: "alert1",
          keyword: "meeting",
          caseSensitive: false,
          wholeWord: true,
          enabled: true,
          priority: "high" as const,
          channels: ["channel1", "channel2"],
          createdAt: Date.now(),
        },
      ];

      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === "@hearth/keyword_alerts") {
          return Promise.resolve(JSON.stringify(alerts));
        }
        if (key === "@hearth/notification_filters") {
          return Promise.resolve(JSON.stringify({ keywordAlertsEnabled: true }));
        }
        return Promise.resolve(null);
      });

      // Should match - in allowed channel
      const payload1: NotificationPayload = {
        type: "message",
        title: "Meeting",
        body: "Team meeting",
        channelId: "channel1",
      };

      const matches1 = await checkKeywordAlerts(payload1);
      expect(matches1).toHaveLength(1);

      // Should not match - not in allowed channels
      const payload2: NotificationPayload = {
        type: "message",
        title: "Meeting",
        body: "Team meeting",
        channelId: "channel3",
      };

      const matches2 = await checkKeywordAlerts(payload2);
      expect(matches2).toHaveLength(0);
    });

    it("should prioritize alerts correctly", async () => {
      const alerts = [
        {
          id: "alert1",
          keyword: "test",
          caseSensitive: false,
          wholeWord: false,
          enabled: true,
          priority: "normal" as const,
          createdAt: Date.now(),
        },
        {
          id: "alert2",
          keyword: "message",
          caseSensitive: false,
          wholeWord: false,
          enabled: true,
          priority: "urgent" as const,
          createdAt: Date.now(),
        },
        {
          id: "alert3",
          keyword: "notification",
          caseSensitive: false,
          wholeWord: false,
          enabled: true,
          priority: "high" as const,
          createdAt: Date.now(),
        },
      ];

      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === "@hearth/keyword_alerts") {
          return Promise.resolve(JSON.stringify(alerts));
        }
        if (key === "@hearth/notification_filters") {
          return Promise.resolve(JSON.stringify({ keywordAlertsEnabled: true }));
        }
        return Promise.resolve(null);
      });

      const payload: NotificationPayload = {
        type: "message",
        title: "Test Notification",
        body: "This is a test message notification",
      };

      const matchedAlerts = await checkKeywordAlerts(payload);

      // Should return alerts sorted by priority (urgent first)
      expect(matchedAlerts).toHaveLength(3);
      expect(matchedAlerts[0].priority).toBe("urgent");
      expect(matchedAlerts[1].priority).toBe("high");
      expect(matchedAlerts[2].priority).toBe("normal");
    });
  });

  describe("Notification Filtering", () => {
    beforeEach(() => {
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === "@hearth/notification_filters") {
          return Promise.resolve(JSON.stringify(DEFAULT_FILTER_SETTINGS));
        }
        if (key === "@hearth/keyword_alerts") {
          return Promise.resolve("[]");
        }
        return Promise.resolve(null);
      });
    });

    it("should allow notifications when filtering is disabled", async () => {
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === "@hearth/notification_filters") {
          return Promise.resolve(JSON.stringify({ ...DEFAULT_FILTER_SETTINGS, enabled: false }));
        }
        return Promise.resolve(null);
      });

      const payload: NotificationPayload = {
        type: "message",
        title: "Test",
        body: "Test message",
      };

      const result = await applyNotificationFilters(payload);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("should apply keyword alerts with highest priority", async () => {
      const alerts = [
        {
          id: "alert1",
          keyword: "urgent",
          caseSensitive: false,
          wholeWord: false,
          enabled: true,
          priority: "urgent" as const,
          customSound: "urgent_sound",
          customVibration: "urgent_vibration",
          createdAt: Date.now(),
        },
      ];

      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === "@hearth/notification_filters") {
          return Promise.resolve(JSON.stringify(DEFAULT_FILTER_SETTINGS));
        }
        if (key === "@hearth/keyword_alerts") {
          return Promise.resolve(JSON.stringify(alerts));
        }
        return Promise.resolve(null);
      });

      const payload: NotificationPayload = {
        type: "message",
        title: "Urgent Message",
        body: "This is urgent",
      };

      const result = await applyNotificationFilters(payload);

      expect(result.allowed).toBe(true);
      expect(result.modified).toEqual({
        ...payload,
        customSound: "urgent_sound",
        customVibration: "urgent_vibration",
      });
      expect(result.reason).toContain("urgent");
    });

    it("should handle rate limiting", async () => {
      // Mock rate limit data
      const rateLimitData = Array(10).fill(Date.now()); // 10 notifications in current window

      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === "@hearth/notification_filters") {
          return Promise.resolve(JSON.stringify({
            ...DEFAULT_FILTER_SETTINGS,
            rateLimitEnabled: true,
            rateLimitCount: 10,
            rateLimitWindow: 5,
          }));
        }
        if (key.startsWith("@hearth/rate_limit_")) {
          return Promise.resolve(JSON.stringify(rateLimitData));
        }
        return Promise.resolve(null);
      });

      const payload: NotificationPayload = {
        type: "message",
        title: "Test",
        body: "Rate limited message",
        channelId: "channel1",
      };

      const result = await applyNotificationFilters(payload);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Rate limit exceeded");
    });
  });

  describe("Scheduled Notifications", () => {
    beforeEach(() => {
      mockNotifications.scheduleNotificationAsync.mockResolvedValue("scheduled-id");
      mockAsyncStorage.getItem.mockResolvedValue("[]"); // Empty scheduled notifications
    });

    it("should schedule a notification", async () => {
      const notificationData = {
        title: "Reminder",
        body: "Don't forget your meeting",
        triggerAt: Date.now() + 60000, // 1 minute from now
        enabled: true,
        tags: ["reminder", "meeting"],
      };

      const scheduled = await scheduleNotification(notificationData);

      expect(scheduled.id).toMatch(/^sched_\d+_[a-z0-9]{9}$/);
      expect(scheduled.title).toBe("Reminder");
      expect(scheduled.createdAt).toBe(1640000000000);

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: "Reminder",
          body: "Don't forget your meeting",
          data: {
            scheduledNotificationId: scheduled.id,
            tags: ["reminder", "meeting"],
          },
        },
        trigger: { date: new Date(notificationData.triggerAt) },
      });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        "@hearth/scheduled_notifications",
        expect.stringContaining('"Reminder"')
      );
    });

    it("should create reminder notifications", async () => {
      const { createReminder } = await import("../../lib/services/notificationFiltering");

      const reminderDate = new Date(Date.now() + 3600000); // 1 hour from now

      const reminder = await createReminder(
        "Meeting Reminder",
        "Team standup in 30 minutes",
        reminderDate,
        ["work", "meeting"]
      );

      expect(reminder.title).toBe("Meeting Reminder");
      expect(reminder.triggerAt).toBe(reminderDate.getTime());
      expect(reminder.tags).toEqual(["work", "meeting", "reminder"]);
    });
  });

  describe("Smart Filtering", () => {
    beforeEach(() => {
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === "@hearth/notification_filters") {
          return Promise.resolve(JSON.stringify({
            ...DEFAULT_FILTER_SETTINGS,
            smartFiltering: true,
          }));
        }
        if (key === "@hearth/keyword_alerts") {
          return Promise.resolve("[]");
        }
        if (key === "@hearth/recent_notifications") {
          return Promise.resolve("[]");
        }
        return Promise.resolve(null);
      });
    });

    it("should block spam patterns", async () => {
      const spamPayload: NotificationPayload = {
        type: "message",
        title: "Amazing Offer!",
        body: "Click here now for free money!",
      };

      const result = await applyNotificationFilters(spamPayload);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("spam pattern");
    });

    it("should delay automated messages", async () => {
      const automatedPayload: NotificationPayload = {
        type: "system",
        title: "System Notification",
        body: "This is an automated message - do not reply",
      };

      const result = await applyNotificationFilters(automatedPayload);

      expect(result.allowed).toBe(true);
      expect(result.delay).toBe(5);
      expect(result.reason).toContain("Automated message");
    });

    it("should detect duplicate content", async () => {
      const recentNotifications = Array(4).fill({
        body: "duplicate message",
        timestamp: Date.now() - 60000, // 1 minute ago
      });

      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === "@hearth/notification_filters") {
          return Promise.resolve(JSON.stringify({
            ...DEFAULT_FILTER_SETTINGS,
            smartFiltering: true,
          }));
        }
        if (key === "@hearth/keyword_alerts") {
          return Promise.resolve("[]");
        }
        if (key === "@hearth/recent_notifications") {
          return Promise.resolve(JSON.stringify(recentNotifications));
        }
        return Promise.resolve(null);
      });

      const duplicatePayload: NotificationPayload = {
        type: "message",
        title: "User",
        body: "duplicate message",
      };

      const result = await applyNotificationFilters(duplicatePayload);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Duplicate content");
    });
  });

  describe("Error Handling", () => {
    it("should handle AsyncStorage errors gracefully", async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error("Storage error"));

      const settings = await getFilterSettings();

      expect(settings).toEqual(DEFAULT_FILTER_SETTINGS);
    });

    it("should handle keyword alert errors gracefully", async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error("Storage error"));

      const payload: NotificationPayload = {
        type: "message",
        title: "Test",
        body: "Test message",
      };

      const alerts = await checkKeywordAlerts(payload);

      expect(alerts).toEqual([]);
    });

    it("should allow notifications on filter error", async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error("Storage error"));

      const payload: NotificationPayload = {
        type: "message",
        title: "Test",
        body: "Test message",
      };

      const result = await applyNotificationFilters(payload);

      expect(result.allowed).toBe(true);
    });
  });
});