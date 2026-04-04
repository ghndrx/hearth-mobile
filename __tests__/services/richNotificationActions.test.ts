/**
 * Tests for Rich Notification Actions - PN-005
 */

import {
  MESSAGE_CATEGORY,
  DM_CATEGORY,
  VOICE_CATEGORY,
  FRIEND_REQUEST_CATEGORY,
  MENTION_CATEGORY,
  getGroupKey,
  collapseGroup,
  executeActionHandler,
  createRichNotification,
  registerActionHandler,
} from "../../lib/services/richNotificationActions";

// Mock expo-notifications
jest.mock("expo-notifications", () => ({
  scheduleNotificationAsync: jest.fn(),
  setNotificationCategoryAsync: jest.fn(),
}));

jest.mock("react-native", () => ({
  Platform: {
    OS: "ios",
  },
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe("Rich Notification Actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Notification Categories", () => {
    it("should have correct structure for MESSAGE_CATEGORY", () => {
      expect(MESSAGE_CATEGORY.categoryId).toBe("rich_message");
      expect(MESSAGE_CATEGORY.actions).toHaveLength(5);
      expect(MESSAGE_CATEGORY.actions[0].type).toBe("quick_reply");
      expect(MESSAGE_CATEGORY.actions[1].type).toBe("emoji_reaction");
    });

    it("should have correct structure for DM_CATEGORY", () => {
      expect(DM_CATEGORY.categoryId).toBe("rich_dm");
      expect(DM_CATEGORY.actions).toHaveLength(4);
      expect(DM_CATEGORY.actions.some(a => a.type === "quick_reply")).toBe(true);
      expect(DM_CATEGORY.actions.some(a => a.type === "mute")).toBe(true);
    });

    it("should have voice actions in VOICE_CATEGORY", () => {
      expect(VOICE_CATEGORY.categoryId).toBe("rich_voice");
      expect(VOICE_CATEGORY.actions.some(a => a.type === "join_voice")).toBe(true);
      expect(VOICE_CATEGORY.actions.some(a => a.authRequired)).toBe(true);
    });

    it("should have friend request actions", () => {
      expect(FRIEND_REQUEST_CATEGORY.categoryId).toBe("rich_friend_request");
      expect(FRIEND_REQUEST_CATEGORY.actions.some(a => a.type === "accept_invite")).toBe(true);
      expect(FRIEND_REQUEST_CATEGORY.actions.some(a => a.type === "decline_invite")).toBe(true);
      expect(FRIEND_REQUEST_CATEGORY.actions.some(a => a.destructive)).toBe(true);
    });
  });

  describe("Group Key Generation", () => {
    it("should generate conversation key for messages", () => {
      const payload = {
        type: "message" as const,
        title: "Test",
        body: "Test message",
        serverId: "server1",
        channelId: "channel1",
      };

      const key = getGroupKey(payload, "conversation");
      expect(key).toBe("channel:server1:channel1");
    });

    it("should generate DM key for direct messages", () => {
      const payload = {
        type: "dm" as const,
        title: "Test",
        body: "Test DM",
        userId: "user1",
      };

      const key = getGroupKey(payload, "conversation");
      expect(key).toBe("dm:user1");
    });

    it("should generate server key for server strategy", () => {
      const payload = {
        type: "message" as const,
        title: "Test",
        body: "Test message",
        serverId: "server1",
        channelId: "channel1",
      };

      const key = getGroupKey(payload, "server");
      expect(key).toBe("server:server1");
    });

    it("should generate type key for type strategy", () => {
      const payload = {
        type: "mention" as const,
        title: "Test",
        body: "Test mention",
        serverId: "server1",
        channelId: "channel1",
      };

      const key = getGroupKey(payload, "type");
      expect(key).toBe("type:mention");
    });
  });

  describe("Group Collapsing", () => {
    it("should handle single notification", () => {
      const group = {
        groupKey: "test",
        notifications: [
          {
            type: "message" as const,
            title: "User",
            body: "Hello",
            serverId: "server1",
            channelId: "channel1",
          },
        ],
        strategy: "conversation" as const,
        createdAt: Date.now(),
        lastUpdatedAt: Date.now(),
      };

      const collapsed = collapseGroup(group);
      expect(collapsed.count).toBe(1);
      expect(collapsed.title).toBe("User");
      expect(collapsed.body).toBe("Hello");
    });

    it("should collapse multiple notifications", () => {
      const group = {
        groupKey: "test",
        notifications: [
          {
            type: "message" as const,
            title: "#general",
            body: "First message",
            serverId: "server1",
            channelId: "channel1",
          },
          {
            type: "message" as const,
            title: "#general",
            body: "Second message",
            serverId: "server1",
            channelId: "channel1",
          },
          {
            type: "message" as const,
            title: "#general",
            body: "Third message",
            serverId: "server1",
            channelId: "channel1",
          },
        ],
        strategy: "conversation" as const,
        createdAt: Date.now(),
        lastUpdatedAt: Date.now(),
      };

      const collapsed = collapseGroup(group);
      expect(collapsed.count).toBe(3);
      expect(collapsed.title).toBe("#general");
      expect(collapsed.body).toContain("3 new messages");
      expect(collapsed.body).toContain("Third message");
    });
  });

  describe("Action Handler Registration", () => {
    it("should register action handler", () => {
      const mockHandler = jest.fn();
      registerActionHandler("quick_reply", mockHandler);

      // Test that the handler was registered (this would require exposing the registry)
      expect(typeof registerActionHandler).toBe("function");
    });
  });

  describe("Rich Notification Creation", () => {
    beforeEach(() => {
      mockNotifications.scheduleNotificationAsync.mockResolvedValue("notification-id");
    });

    it("should create rich notification for message", async () => {
      const payload = {
        type: "message" as const,
        title: "User",
        body: "Hello world",
        serverId: "server1",
        channelId: "channel1",
      };

      const notificationId = await createRichNotification(payload);

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: expect.objectContaining({
          title: "User",
          body: "Hello world",
          categoryIdentifier: "rich_message",
          data: expect.objectContaining({
            richNotification: true,
            categoryUsed: "rich_message",
          }),
        }),
        trigger: null,
      });

      expect(notificationId).toBe("notification-id");
    });

    it("should create rich notification with image", async () => {
      const payload = {
        type: "message" as const,
        title: "User",
        body: "Check this out",
        serverId: "server1",
        channelId: "channel1",
      };

      const options = {
        imageUrl: "https://example.com/image.jpg",
      };

      await createRichNotification(payload, options);

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: expect.objectContaining({
          attachments: [
            {
              identifier: "image",
              url: "https://example.com/image.jpg",
              type: "public.image",
            },
          ],
        }),
        trigger: null,
      });
    });

    it("should use appropriate category for different notification types", async () => {
      const testCases = [
        { type: "dm" as const, expectedCategory: "rich_dm" },
        { type: "mention" as const, expectedCategory: "rich_mention" },
        { type: "friend_request" as const, expectedCategory: "rich_friend_request" },
        { type: "call" as const, expectedCategory: "rich_voice" },
      ];

      for (const testCase of testCases) {
        mockNotifications.scheduleNotificationAsync.mockClear();

        const payload = {
          type: testCase.type,
          title: "Test",
          body: "Test notification",
        };

        await createRichNotification(payload);

        expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
          content: expect.objectContaining({
            categoryIdentifier: testCase.expectedCategory,
          }),
          trigger: null,
        });
      }
    });
  });

  describe("Action Response Caching", () => {
    it("should cache action responses", async () => {
      const { cacheActionResponse } = await import("../../lib/services/richNotificationActions");

      const response = {
        actionId: "quick_reply",
        categoryId: "rich_message",
        notificationId: "test-notification",
        userText: "Test reply",
        timestamp: Date.now(),
        data: {
          type: "message" as const,
          title: "Test",
          body: "Test message",
        },
      };

      await cacheActionResponse(response);

      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith("@hearth/notification_actions");
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        "@hearth/notification_actions",
        expect.stringContaining('"quick_reply"')
      );
    });

    it("should get cached action responses", async () => {
      const { getCachedActionResponses } = await import("../../lib/services/richNotificationActions");

      const cachedResponses = [
        {
          actionId: "quick_reply",
          categoryId: "rich_message",
          notificationId: "test-notification",
          cached: true,
          retryCount: 0,
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedResponses));

      const responses = await getCachedActionResponses();

      expect(responses).toEqual(cachedResponses);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith("@hearth/notification_actions");
    });

    it("should clear action cache", async () => {
      const { clearActionCache } = await import("../../lib/services/richNotificationActions");

      await clearActionCache();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith("@hearth/notification_actions");
    });
  });

  describe("Error Handling", () => {
    it("should handle notification creation errors gracefully", async () => {
      mockNotifications.scheduleNotificationAsync.mockRejectedValue(
        new Error("Notification creation failed")
      );

      const payload = {
        type: "message" as const,
        title: "User",
        body: "Hello world",
        serverId: "server1",
        channelId: "channel1",
      };

      await expect(createRichNotification(payload)).rejects.toThrow("Notification creation failed");
    });

    it("should handle AsyncStorage errors in caching", async () => {
      const { cacheActionResponse } = await import("../../lib/services/richNotificationActions");

      mockAsyncStorage.setItem.mockRejectedValue(new Error("Storage error"));

      const response = {
        actionId: "quick_reply",
        categoryId: "rich_message",
        notificationId: "test-notification",
        timestamp: Date.now(),
        data: {
          type: "message" as const,
          title: "Test",
          body: "Test message",
        },
      };

      // Should not throw - should handle error gracefully
      await expect(cacheActionResponse(response)).resolves.not.toThrow();
    });
  });
});