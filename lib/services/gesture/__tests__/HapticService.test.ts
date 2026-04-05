import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { HapticService } from "../HapticService";

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: {
    Light: "Light",
    Medium: "Medium",
    Heavy: "Heavy",
  },
  NotificationFeedbackType: {
    Success: "Success",
    Warning: "Warning",
    Error: "Error",
  },
}));

describe("HapticService", () => {
  let service: HapticService;

  beforeEach(() => {
    jest.clearAllMocks();
    (HapticService as any).instance = null;
    service = HapticService.getInstance();
    // Default to iOS for haptic tests
    (Platform as any).OS = "ios";
  });

  describe("singleton", () => {
    it("returns the same instance", () => {
      const a = HapticService.getInstance();
      const b = HapticService.getInstance();
      expect(a).toBe(b);
    });
  });

  describe("intensity", () => {
    it("defaults to medium", () => {
      expect(service.getIntensity()).toBe("medium");
    });

    it("can be changed", () => {
      service.setIntensity("light");
      expect(service.getIntensity()).toBe("light");
    });

    it("disables haptics when set to off", async () => {
      service.setIntensity("off");
      await service.impact("heavy");
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });
  });

  describe("impact()", () => {
    it("calls impactAsync with Light style", async () => {
      await service.impact("light");
      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Light
      );
    });

    it("calls impactAsync with Medium style", async () => {
      await service.impact("medium");
      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Medium
      );
    });

    it("calls impactAsync with Heavy style", async () => {
      service.setIntensity("heavy");
      await service.impact("heavy");
      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Heavy
      );
    });

    it("caps at medium when intensity is medium", async () => {
      service.setIntensity("medium");
      await service.impact("heavy");
      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Medium
      );
    });

    it("always uses light when intensity is light", async () => {
      service.setIntensity("light");
      await service.impact("heavy");
      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Light
      );
    });

    it("defaults to medium style", async () => {
      await service.impact();
      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Medium
      );
    });

    it("handles errors gracefully", async () => {
      (Haptics.impactAsync as jest.Mock).mockRejectedValueOnce(
        new Error("unavailable")
      );
      await expect(service.impact("light")).resolves.toBeUndefined();
    });
  });

  describe("notification()", () => {
    it("calls notificationAsync with Success", async () => {
      await service.notification("success");
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success
      );
    });

    it("calls notificationAsync with Warning", async () => {
      await service.notification("warning");
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Warning
      );
    });

    it("calls notificationAsync with Error", async () => {
      await service.notification("error");
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Error
      );
    });

    it("defaults to success", async () => {
      await service.notification();
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success
      );
    });
  });

  describe("selection()", () => {
    it("calls selectionAsync", async () => {
      await service.selection();
      expect(Haptics.selectionAsync).toHaveBeenCalled();
    });
  });

  describe("platform support", () => {
    it("does not fire on unsupported platforms", async () => {
      (Platform as any).OS = "web";
      await service.impact("light");
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });

    it("fires on android", async () => {
      (Platform as any).OS = "android";
      await service.impact("light");
      expect(Haptics.impactAsync).toHaveBeenCalled();
    });

    it("reports availability correctly", () => {
      (Platform as any).OS = "ios";
      expect(service.isAvailable()).toBe(true);

      (Platform as any).OS = "android";
      expect(service.isAvailable()).toBe(true);

      (Platform as any).OS = "web";
      expect(service.isAvailable()).toBe(false);
    });
  });
});
