import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

// ============================================================================
// Types
// ============================================================================

export type HapticIntensity = "off" | "light" | "medium" | "heavy";

export type ImpactStyle = "light" | "medium" | "heavy";

export type NotificationType = "success" | "warning" | "error";

// ============================================================================
// HapticService
// ============================================================================

export class HapticService {
  private static instance: HapticService;
  private intensity: HapticIntensity = "medium";

  private constructor() {}

  static getInstance(): HapticService {
    if (!HapticService.instance) {
      HapticService.instance = new HapticService();
    }
    return HapticService.instance;
  }

  /**
   * Set the haptic intensity level. "off" disables all haptics.
   */
  setIntensity(intensity: HapticIntensity): void {
    this.intensity = intensity;
  }

  /**
   * Get the current haptic intensity level.
   */
  getIntensity(): HapticIntensity {
    return this.intensity;
  }

  /**
   * Trigger impact haptic feedback.
   */
  async impact(style: ImpactStyle = "medium"): Promise<void> {
    if (!this.shouldFire()) return;

    const resolvedStyle = this.resolveImpactStyle(style);
    if (!resolvedStyle) return;

    try {
      await Haptics.impactAsync(resolvedStyle);
    } catch (error) {
      console.debug("Haptic impact unavailable:", error);
    }
  }

  /**
   * Trigger notification haptic feedback.
   */
  async notification(type: NotificationType = "success"): Promise<void> {
    if (!this.shouldFire()) return;

    const typeMap: Record<NotificationType, Haptics.NotificationFeedbackType> = {
      success: Haptics.NotificationFeedbackType.Success,
      warning: Haptics.NotificationFeedbackType.Warning,
      error: Haptics.NotificationFeedbackType.Error,
    };

    try {
      await Haptics.notificationAsync(typeMap[type]);
    } catch (error) {
      console.debug("Haptic notification unavailable:", error);
    }
  }

  /**
   * Trigger selection haptic feedback.
   */
  async selection(): Promise<void> {
    if (!this.shouldFire()) return;

    try {
      await Haptics.selectionAsync();
    } catch (error) {
      console.debug("Haptic selection unavailable:", error);
    }
  }

  /**
   * Check if haptics are available on this platform.
   */
  isAvailable(): boolean {
    return Platform.OS === "ios" || Platform.OS === "android";
  }

  private shouldFire(): boolean {
    if (this.intensity === "off") return false;
    if (!this.isAvailable()) return false;
    return true;
  }

  /**
   * Resolve the requested impact style based on the current intensity setting.
   * When intensity is "light", heavy/medium impacts are downgraded.
   */
  private resolveImpactStyle(
    requested: ImpactStyle
  ): Haptics.ImpactFeedbackStyle | null {
    const styleMap: Record<ImpactStyle, Haptics.ImpactFeedbackStyle> = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    };

    if (this.intensity === "heavy") {
      return styleMap[requested];
    }

    if (this.intensity === "medium") {
      // Cap at medium
      if (requested === "heavy") return Haptics.ImpactFeedbackStyle.Medium;
      return styleMap[requested];
    }

    if (this.intensity === "light") {
      // Always light
      return Haptics.ImpactFeedbackStyle.Light;
    }

    return styleMap[requested];
  }
}
