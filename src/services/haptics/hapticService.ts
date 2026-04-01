/**
 * Haptic Feedback Service
 * Cross-platform unified API using expo-haptics
 *
 * Provides platform-specific haptic feedback for iOS (Taptic Engine) and Android (VibrationEffect).
 * Supports various haptic patterns for common user interactions.
 */

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Haptic pattern types for common interactions
 */
export enum HapticPattern {
  // Basic feedback patterns
  SELECTION = 'selection',
  LIGHT = 'light',
  MEDIUM = 'medium',
  HEAVY = 'heavy',

  // Semantic feedback patterns
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
}

/**
 * Haptic feedback configuration options
 */
export interface HapticConfig {
  /** Whether haptic feedback is enabled globally */
  enabled: boolean;
  /** Platform-specific settings */
  ios: {
    /** Use system haptics preference */
    respectSystemSettings: boolean;
  };
  android: {
    /** Minimum Android API level for vibration effects */
    minApiLevel: number;
  };
}

/**
 * Haptic impact intensity levels
 */
export enum HapticImpact {
  LIGHT = 'light',
  MEDIUM = 'medium',
  HEAVY = 'heavy',
}

/**
 * Platform-specific haptic feedback implementation
 */
class HapticService {
  private static isInitialized = false;
  private static config: HapticConfig = {
    enabled: true,
    ios: {
      respectSystemSettings: true,
    },
    android: {
      minApiLevel: 21, // Android 5.0+
    },
  };

  /**
   * Initialize the haptic service
   * @param config Optional configuration overrides
   * @returns Promise<boolean> True if initialization successful
   */
  static async initialize(config?: Partial<HapticConfig>): Promise<boolean> {
    try {
      // Merge provided config with defaults
      if (config) {
        HapticService.config = {
          ...HapticService.config,
          ...config,
          ios: { ...HapticService.config.ios, ...config.ios },
          android: { ...HapticService.config.android, ...config.android },
        };
      }

      // Check platform support
      const isSupported = await HapticService.isHapticsSupported();
      if (!isSupported) {
        console.warn('Haptic feedback is not supported on this device');
        HapticService.isInitialized = false;
        return false;
      }

      HapticService.isInitialized = true;
      console.log('Haptic service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize haptic service:', error);
      HapticService.isInitialized = false;
      return false;
    }
  }

  /**
   * Check if haptic feedback is supported on the current device
   * @returns Promise<boolean> True if haptics are supported
   */
  static async isHapticsSupported(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        return false;
      }

      // On Android, check API level
      if (Platform.OS === 'android') {
        const androidVersion = Platform.Version;
        return androidVersion >= HapticService.config.android.minApiLevel;
      }

      // On iOS, expo-haptics will handle availability checking
      return true;
    } catch (error) {
      console.warn('Error checking haptic support:', error);
      return false;
    }
  }

  /**
   * Check if the service is initialized and haptics are enabled
   * @returns boolean True if ready to provide haptic feedback
   */
  static isReady(): boolean {
    return HapticService.isInitialized && HapticService.config.enabled;
  }

  /**
   * Enable or disable haptic feedback
   * @param enabled Whether to enable haptic feedback
   */
  static setEnabled(enabled: boolean): void {
    HapticService.config.enabled = enabled;
  }

  /**
   * Get current platform
   * @returns string Current platform ('ios', 'android', 'web', 'unknown')
   */
  static getPlatform(): string {
    return Platform.OS || 'unknown';
  }

  /**
   * Provide haptic feedback for a specific pattern
   * @param pattern The haptic pattern to trigger
   * @returns Promise<boolean> True if feedback was triggered successfully
   */
  static async trigger(pattern: HapticPattern): Promise<boolean> {
    if (!HapticService.isReady()) {
      return false;
    }

    try {
      switch (pattern) {
        case HapticPattern.SELECTION:
          await Haptics.selectionAsync();
          break;

        case HapticPattern.LIGHT:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;

        case HapticPattern.MEDIUM:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;

        case HapticPattern.HEAVY:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;

        case HapticPattern.SUCCESS:
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;

        case HapticPattern.WARNING:
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;

        case HapticPattern.ERROR:
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;

        default:
          console.warn(`Unknown haptic pattern: ${pattern}`);
          return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to trigger haptic feedback:', error);
      return false;
    }
  }

  /**
   * Provide selection haptic feedback (light tap for UI interactions)
   * @returns Promise<boolean> True if feedback was triggered successfully
   */
  static async selection(): Promise<boolean> {
    return HapticService.trigger(HapticPattern.SELECTION);
  }

  /**
   * Provide impact haptic feedback with specified intensity
   * @param intensity The impact intensity level
   * @returns Promise<boolean> True if feedback was triggered successfully
   */
  static async impact(intensity: HapticImpact = HapticImpact.MEDIUM): Promise<boolean> {
    switch (intensity) {
      case HapticImpact.LIGHT:
        return HapticService.trigger(HapticPattern.LIGHT);
      case HapticImpact.MEDIUM:
        return HapticService.trigger(HapticPattern.MEDIUM);
      case HapticImpact.HEAVY:
        return HapticService.trigger(HapticPattern.HEAVY);
      default:
        return HapticService.trigger(HapticPattern.MEDIUM);
    }
  }

  /**
   * Provide success haptic feedback
   * @returns Promise<boolean> True if feedback was triggered successfully
   */
  static async success(): Promise<boolean> {
    return HapticService.trigger(HapticPattern.SUCCESS);
  }

  /**
   * Provide warning haptic feedback
   * @returns Promise<boolean> True if feedback was triggered successfully
   */
  static async warning(): Promise<boolean> {
    return HapticService.trigger(HapticPattern.WARNING);
  }

  /**
   * Provide error haptic feedback
   * @returns Promise<boolean> True if feedback was triggered successfully
   */
  static async error(): Promise<boolean> {
    return HapticService.trigger(HapticPattern.ERROR);
  }

  /**
   * Provide light impact haptic feedback
   * @returns Promise<boolean> True if feedback was triggered successfully
   */
  static async light(): Promise<boolean> {
    return HapticService.trigger(HapticPattern.LIGHT);
  }

  /**
   * Provide medium impact haptic feedback
   * @returns Promise<boolean> True if feedback was triggered successfully
   */
  static async medium(): Promise<boolean> {
    return HapticService.trigger(HapticPattern.MEDIUM);
  }

  /**
   * Provide heavy impact haptic feedback
   * @returns Promise<boolean> True if feedback was triggered successfully
   */
  static async heavy(): Promise<boolean> {
    return HapticService.trigger(HapticPattern.HEAVY);
  }

  /**
   * Get current configuration
   * @returns HapticConfig Current service configuration
   */
  static getConfig(): HapticConfig {
    return { ...HapticService.config };
  }

  /**
   * Update service configuration
   * @param config Partial configuration to update
   */
  static updateConfig(config: Partial<HapticConfig>): void {
    HapticService.config = {
      ...HapticService.config,
      ...config,
      ios: { ...HapticService.config.ios, ...config.ios },
      android: { ...HapticService.config.android, ...config.android },
    };
  }

  /**
   * Reset service to default state
   */
  static reset(): void {
    HapticService.isInitialized = false;
    HapticService.config = {
      enabled: true,
      ios: {
        respectSystemSettings: true,
      },
      android: {
        minApiLevel: 21,
      },
    };
  }
}

export default HapticService;