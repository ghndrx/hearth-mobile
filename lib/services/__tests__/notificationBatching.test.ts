/**
 * Notification Batching Service Tests
 */

import {
  NotificationBatchManager,
  getGroupKey,
  collapseGroup,
  resolveBatchPriority,
  getBatchingConfig,
  saveBatchingConfig,
  resetBatchManager,
  DEFAULT_BATCHING_CONFIG,
  type BatchedNotification,
  type NotificationGroup,
  type BatchingConfig,
} from "../notificationBatching";
import type { NotificationPayload } from "../notifications";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";

// Mock expo-notifications
jest.mock("expo-notifications", () => ({
  scheduleNotificationAsync: jest.fn().mockResolvedValue("notif-id-123"),
  AndroidImportance: {
    MAX: 5,
    HIGH: 4,
    DEFAULT: 3,
    LOW: 2,
    MIN: 1,
  },
}));

// Mock Platform
jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

// ============================================================================
// Helpers
// ============================================================================

function makePayload(overrides: Partial<NotificationPayload> = {}): NotificationPayload {
  return {
    type: "message",
    serverId: "server-1",
    channelId: "channel-1",
    messageId: "msg-1",
    userId: "user-1",
    title: "Test Channel",
    body: "Hello world",
    ...overrides,
  };
}

// ============================================================================
// getGroupKey Tests
// ============================================================================

describe("getGroupKey", () => {
  it("groups DMs by userId in conversation strategy", () => {
    const payload = makePayload({ type: "dm", userId: "user-42" });
    expect(getGroupKey(payload, "conversation")).toBe("dm:user-42");
  });

  it("groups channel messages by server+channel in conversation strategy", () => {
    const payload = makePayload({
      serverId: "srv-1",
      channelId: "ch-1",
    });
    expect(getGroupKey(payload, "conversation")).toBe("channel:srv-1:ch-1");
  });

  it("groups by server in server strategy", () => {
    const payload = makePayload({ serverId: "srv-1" });
    expect(getGroupKey(payload, "server")).toBe("server:srv-1");
  });

  it("groups DMs together in server strategy", () => {
    const payload = makePayload({ type: "dm", serverId: undefined });
    expect(getGroupKey(payload, "server")).toBe("dm:all");
  });

  it("groups by type in type strategy", () => {
    const payload = makePayload({ type: "mention" });
    expect(getGroupKey(payload, "type")).toBe("type:mention");
  });

  it("groups by sender in sender strategy", () => {
    const payload = makePayload({ userId: "user-99" });
    expect(getGroupKey(payload, "sender")).toBe("user:user-99");
  });

  it("falls back to type when sender has no userId", () => {
    const payload = makePayload({ userId: undefined, type: "system" });
    expect(getGroupKey(payload, "sender")).toBe("type:system");
  });
});

// ============================================================================
// resolveBatchPriority Tests
// ============================================================================

describe("resolveBatchPriority", () => {
  it("returns the highest priority from notifications", () => {
    const notifications = [
      makePayload({ type: "message" }), // normal
      makePayload({ type: "mention" }), // high
      makePayload({ type: "system" }), // low
    ];
    expect(resolveBatchPriority(notifications, DEFAULT_BATCHING_CONFIG)).toBe(
      "high"
    );
  });

  it("returns urgent for calls", () => {
    const notifications = [
      makePayload({ type: "message" }),
      makePayload({ type: "call" }),
    ];
    expect(resolveBatchPriority(notifications, DEFAULT_BATCHING_CONFIG)).toBe(
      "urgent"
    );
  });

  it("returns low for only system notifications", () => {
    const notifications = [makePayload({ type: "system" })];
    expect(resolveBatchPriority(notifications, DEFAULT_BATCHING_CONFIG)).toBe(
      "low"
    );
  });
});

// ============================================================================
// collapseGroup Tests
// ============================================================================

describe("collapseGroup", () => {
  it("returns single notification as-is", () => {
    const group: NotificationGroup = {
      groupKey: "channel:srv-1:ch-1",
      notifications: [makePayload({ title: "Alice", body: "Hey!" })],
      strategy: "conversation",
      createdAt: Date.now(),
      lastUpdatedAt: Date.now(),
    };

    const result = collapseGroup(group);
    expect(result.count).toBe(1);
    expect(result.title).toBe("Alice");
    expect(result.body).toBe("Hey!");
  });

  it("collapses multiple conversation notifications into summary", () => {
    const group: NotificationGroup = {
      groupKey: "channel:srv-1:ch-1",
      notifications: [
        makePayload({ title: "#general", body: "Hello" }),
        makePayload({ title: "#general", body: "World" }),
        makePayload({ title: "#general", body: "!!!" }),
      ],
      strategy: "conversation",
      createdAt: Date.now(),
      lastUpdatedAt: Date.now(),
    };

    const result = collapseGroup(group);
    expect(result.count).toBe(3);
    expect(result.body).toContain("3 new messages");
    expect(result.body).toContain("!!!");
  });

  it("includes android channel for the notification", () => {
    const group: NotificationGroup = {
      groupKey: "dm:user-1",
      notifications: [makePayload({ type: "dm" })],
      strategy: "conversation",
      createdAt: Date.now(),
      lastUpdatedAt: Date.now(),
    };

    const result = collapseGroup(group);
    expect(result.channelId).toBe("direct-messages");
  });
});

// ============================================================================
// NotificationBatchManager Tests
// ============================================================================

describe("NotificationBatchManager", () => {
  let manager: NotificationBatchManager;

  beforeEach(() => {
    jest.useFakeTimers();
    manager = new NotificationBatchManager({
      enabled: true,
      maxBatchSize: 5,
      timeWindowMs: 3000,
      collapseThreshold: 3,
    });
  });

  afterEach(() => {
    manager.destroy();
    jest.useRealTimers();
  });

  it("returns urgent notifications immediately", () => {
    const result = manager.addNotification(
      makePayload({ type: "call" })
    );
    expect(result).not.toBeNull();
    expect(result!.priority).toBe("urgent");
  });

  it("batches normal notifications", () => {
    const result = manager.addNotification(makePayload());
    expect(result).toBeNull();
    expect(manager.getPendingCount()).toBe(1);
  });

  it("flushes after time window expires", () => {
    const flushCb = jest.fn();
    manager.setFlushCallback(flushCb);

    manager.addNotification(makePayload({ body: "msg1" }));
    manager.addNotification(makePayload({ body: "msg2" }));

    expect(flushCb).not.toHaveBeenCalled();

    jest.advanceTimersByTime(3000);

    expect(flushCb).toHaveBeenCalledTimes(1);
    const flushed = flushCb.mock.calls[0][0] as BatchedNotification[];
    // 2 notifications < collapseThreshold(3), so delivered individually
    expect(flushed).toHaveLength(2);
  });

  it("collapses when threshold is met", () => {
    const flushCb = jest.fn();
    manager.setFlushCallback(flushCb);

    manager.addNotification(makePayload({ body: "1" }));
    manager.addNotification(makePayload({ body: "2" }));
    manager.addNotification(makePayload({ body: "3" }));

    jest.advanceTimersByTime(3000);

    expect(flushCb).toHaveBeenCalledTimes(1);
    const flushed = flushCb.mock.calls[0][0] as BatchedNotification[];
    // 3 notifications >= collapseThreshold(3), so collapsed into 1
    expect(flushed).toHaveLength(1);
    expect(flushed[0].count).toBe(3);
  });

  it("flushes immediately when maxBatchSize is reached", () => {
    const flushCb = jest.fn();
    manager.setFlushCallback(flushCb);

    for (let i = 0; i < 5; i++) {
      manager.addNotification(makePayload({ body: `msg-${i}` }));
    }

    // Should have flushed without waiting for timer
    expect(flushCb).toHaveBeenCalledTimes(1);
    expect(manager.getPendingCount()).toBe(0);
  });

  it("groups notifications by conversation", () => {
    manager.addNotification(
      makePayload({ serverId: "s1", channelId: "c1", body: "a" })
    );
    manager.addNotification(
      makePayload({ serverId: "s1", channelId: "c2", body: "b" })
    );
    manager.addNotification(
      makePayload({ serverId: "s1", channelId: "c1", body: "c" })
    );

    const keys = manager.getGroupKeys();
    expect(keys).toHaveLength(2);
    expect(keys).toContain("channel:s1:c1");
    expect(keys).toContain("channel:s1:c2");
  });

  it("flushAll delivers all pending groups", () => {
    manager.addNotification(
      makePayload({ serverId: "s1", channelId: "c1" })
    );
    manager.addNotification(
      makePayload({ serverId: "s1", channelId: "c2" })
    );

    const results = manager.flushAll();
    expect(results).toHaveLength(2);
    expect(manager.getPendingCount()).toBe(0);
  });

  it("returns all notifications immediately when batching disabled", () => {
    const disabledManager = new NotificationBatchManager({ enabled: false });
    const result = disabledManager.addNotification(makePayload());
    expect(result).not.toBeNull();
    expect(result!.count).toBe(1);
    disabledManager.destroy();
  });

  it("adapts timing when user is active (smart timing)", () => {
    const smartManager = new NotificationBatchManager({
      enabled: true,
      smartTiming: true,
      timeWindowMs: 4000,
    });
    const flushCb = jest.fn();
    smartManager.setFlushCallback(flushCb);

    smartManager.setUserActive(true);
    smartManager.addNotification(makePayload());

    // With user active, effective window = 4000/2 = 2000ms
    jest.advanceTimersByTime(2000);
    expect(flushCb).toHaveBeenCalledTimes(1);

    smartManager.destroy();
  });

  it("uses longer window when user is idle (smart timing)", () => {
    const smartManager = new NotificationBatchManager({
      enabled: true,
      smartTiming: true,
      timeWindowMs: 3000,
    });
    const flushCb = jest.fn();
    smartManager.setFlushCallback(flushCb);

    // Simulate idle for > 60 seconds
    smartManager.setUserActive(false);
    jest.advanceTimersByTime(61000);

    smartManager.addNotification(makePayload());

    // Default window is 3000, doubled for idle = 6000
    jest.advanceTimersByTime(3000);
    expect(flushCb).not.toHaveBeenCalled();

    jest.advanceTimersByTime(3000);
    expect(flushCb).toHaveBeenCalledTimes(1);

    smartManager.destroy();
  });
});

// ============================================================================
// Config Persistence Tests
// ============================================================================

describe("config persistence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns defaults when no stored config", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const config = await getBatchingConfig();
    expect(config).toEqual(DEFAULT_BATCHING_CONFIG);
  });

  it("merges stored config with defaults", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({ maxBatchSize: 10 })
    );
    const config = await getBatchingConfig();
    expect(config.maxBatchSize).toBe(10);
    expect(config.timeWindowMs).toBe(DEFAULT_BATCHING_CONFIG.timeWindowMs);
  });

  it("saves config to AsyncStorage", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    await saveBatchingConfig({ maxBatchSize: 8 });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "@hearth/notification_batching_settings",
      expect.stringContaining('"maxBatchSize":8')
    );
  });
});
