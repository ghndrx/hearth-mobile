/**
 * Haptic Feedback Service Tests
 * Tests for expo-haptics based implementation
 */

import { Platform } from 'react-native';
import HapticService, { HapticPattern, HapticImpact } from '../hapticService';

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// Mock React Native Platform
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Platform: {
      OS: 'android',
      Version: 33,
    },
  };
});

describe('HapticService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset service state
    HapticService.reset();
  });

  describe('Platform Detection', () => {
    test('should detect Android platform', () => {
      expect(HapticService.getPlatform()).toBe('android');
    });

    test('should detect iOS platform', () => {
      (Platform as any).OS = 'ios';
      expect(HapticService.getPlatform()).toBe('ios');
      (Platform as any).OS = 'android'; // Reset
    });

    test('should detect unknown platform', () => {
      (Platform as any).OS = 'web';
      expect(HapticService.getPlatform()).toBe('web');
      (Platform as any).OS = 'android'; // Reset
    });
  });

  describe('Haptic Support Detection', () => {
    test('should support haptics on Android with sufficient API level', async () => {
      (Platform as any).OS = 'android';
      (Platform as any).Version = 26;

      const isSupported = await HapticService.isHapticsSupported();
      expect(isSupported).toBe(true);
    });

    test('should not support haptics on Android with insufficient API level', async () => {
      (Platform as any).OS = 'android';
      (Platform as any).Version = 19;

      const isSupported = await HapticService.isHapticsSupported();
      expect(isSupported).toBe(false);
    });

    test('should support haptics on iOS', async () => {
      (Platform as any).OS = 'ios';

      const isSupported = await HapticService.isHapticsSupported();
      expect(isSupported).toBe(true);
    });

    test('should not support haptics on web', async () => {
      (Platform as any).OS = 'web';

      const isSupported = await HapticService.isHapticsSupported();
      expect(isSupported).toBe(false);
    });
  });

  describe('Initialization', () => {
    test('should initialize successfully on supported platform', async () => {
      (Platform as any).OS = 'android';
      (Platform as any).Version = 26;

      const result = await HapticService.initialize();

      expect(result).toBe(true);
      expect(HapticService.isReady()).toBe(true);
    });

    test('should fail initialization on unsupported platform', async () => {
      (Platform as any).OS = 'web';

      const result = await HapticService.initialize();

      expect(result).toBe(false);
      expect(HapticService.isReady()).toBe(false);
    });

    test('should initialize with custom configuration', async () => {
      (Platform as any).OS = 'android';
      (Platform as any).Version = 26;

      const customConfig = {
        enabled: false,
        android: { minApiLevel: 23 },
      };

      const result = await HapticService.initialize(customConfig);

      expect(result).toBe(true);
      const config = HapticService.getConfig();
      expect(config.enabled).toBe(false);
      expect(config.android.minApiLevel).toBe(23);
    });
  });

  describe('Configuration Management', () => {
    test('should get default configuration', () => {
      const config = HapticService.getConfig();

      expect(config).toEqual({
        enabled: true,
        ios: { respectSystemSettings: true },
        android: { minApiLevel: 21 },
      });
    });

    test('should update configuration', () => {
      HapticService.updateConfig({
        enabled: false,
        android: { minApiLevel: 25 },
      });

      const config = HapticService.getConfig();
      expect(config.enabled).toBe(false);
      expect(config.android.minApiLevel).toBe(25);
      expect(config.ios.respectSystemSettings).toBe(true); // Should preserve existing values
    });

    test('should enable/disable haptics', () => {
      HapticService.setEnabled(false);
      expect(HapticService.getConfig().enabled).toBe(false);

      HapticService.setEnabled(true);
      expect(HapticService.getConfig().enabled).toBe(true);
    });

    test('should reset to default state', () => {
      HapticService.updateConfig({ enabled: false });
      HapticService.reset();

      const config = HapticService.getConfig();
      expect(config.enabled).toBe(true);
      expect(HapticService.isReady()).toBe(false);
    });
  });

  describe('Haptic Feedback Patterns', () => {
    beforeEach(async () => {
      // Reset all mocks to their default resolved state
      const Haptics = require('expo-haptics');
      Haptics.selectionAsync.mockResolvedValue(undefined);
      Haptics.impactAsync.mockResolvedValue(undefined);
      Haptics.notificationAsync.mockResolvedValue(undefined);

      (Platform as any).OS = 'android';
      (Platform as any).Version = 26;
      await HapticService.initialize();
    });

    test('should trigger selection haptic feedback', async () => {
      const Haptics = require('expo-haptics');

      const result = await HapticService.trigger(HapticPattern.SELECTION);

      expect(result).toBe(true);
      expect(Haptics.selectionAsync).toHaveBeenCalled();
    });

    test('should trigger light impact haptic feedback', async () => {
      const Haptics = require('expo-haptics');

      const result = await HapticService.trigger(HapticPattern.LIGHT);

      expect(result).toBe(true);
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    test('should trigger medium impact haptic feedback', async () => {
      const Haptics = require('expo-haptics');

      const result = await HapticService.trigger(HapticPattern.MEDIUM);

      expect(result).toBe(true);
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });

    test('should trigger heavy impact haptic feedback', async () => {
      const Haptics = require('expo-haptics');

      const result = await HapticService.trigger(HapticPattern.HEAVY);

      expect(result).toBe(true);
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy);
    });

    test('should trigger success notification haptic feedback', async () => {
      const Haptics = require('expo-haptics');

      const result = await HapticService.trigger(HapticPattern.SUCCESS);

      expect(result).toBe(true);
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
    });

    test('should trigger warning notification haptic feedback', async () => {
      const Haptics = require('expo-haptics');

      const result = await HapticService.trigger(HapticPattern.WARNING);

      expect(result).toBe(true);
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Warning);
    });

    test('should trigger error notification haptic feedback', async () => {
      const Haptics = require('expo-haptics');

      const result = await HapticService.trigger(HapticPattern.ERROR);

      expect(result).toBe(true);
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
    });

    test('should handle unknown haptic pattern', async () => {
      const result = await HapticService.trigger('unknown' as HapticPattern);

      expect(result).toBe(false);
    });

    test('should handle expo-haptics errors gracefully', async () => {
      const Haptics = require('expo-haptics');
      Haptics.selectionAsync.mockRejectedValue(new Error('Haptic error'));

      const result = await HapticService.trigger(HapticPattern.SELECTION);

      expect(result).toBe(false);
    });
  });

  describe('Convenience Methods', () => {
    beforeEach(async () => {
      // Reset all mocks to their default resolved state
      const Haptics = require('expo-haptics');
      Haptics.selectionAsync.mockResolvedValue(undefined);
      Haptics.impactAsync.mockResolvedValue(undefined);
      Haptics.notificationAsync.mockResolvedValue(undefined);

      (Platform as any).OS = 'android';
      (Platform as any).Version = 26;
      await HapticService.initialize();
    });

    test('should trigger selection feedback via convenience method', async () => {
      const Haptics = require('expo-haptics');

      const result = await HapticService.selection();

      expect(result).toBe(true);
      expect(Haptics.selectionAsync).toHaveBeenCalled();
    });

    test('should trigger impact feedback with default intensity', async () => {
      const Haptics = require('expo-haptics');

      const result = await HapticService.impact();

      expect(result).toBe(true);
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });

    test('should trigger impact feedback with light intensity', async () => {
      const Haptics = require('expo-haptics');

      const result = await HapticService.impact(HapticImpact.LIGHT);

      expect(result).toBe(true);
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    test('should trigger impact feedback with heavy intensity', async () => {
      const Haptics = require('expo-haptics');

      const result = await HapticService.impact(HapticImpact.HEAVY);

      expect(result).toBe(true);
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy);
    });

    test('should trigger success feedback via convenience method', async () => {
      const Haptics = require('expo-haptics');

      const result = await HapticService.success();

      expect(result).toBe(true);
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
    });

    test('should trigger warning feedback via convenience method', async () => {
      const Haptics = require('expo-haptics');

      const result = await HapticService.warning();

      expect(result).toBe(true);
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Warning);
    });

    test('should trigger error feedback via convenience method', async () => {
      const Haptics = require('expo-haptics');

      const result = await HapticService.error();

      expect(result).toBe(true);
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
    });

    test('should trigger light impact via convenience method', async () => {
      const Haptics = require('expo-haptics');

      const result = await HapticService.light();

      expect(result).toBe(true);
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    test('should trigger medium impact via convenience method', async () => {
      const Haptics = require('expo-haptics');

      const result = await HapticService.medium();

      expect(result).toBe(true);
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });

    test('should trigger heavy impact via convenience method', async () => {
      const Haptics = require('expo-haptics');

      const result = await HapticService.heavy();

      expect(result).toBe(true);
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy);
    });
  });

  describe('Service State Management', () => {
    test('should not trigger feedback when service is not initialized', async () => {
      const result = await HapticService.trigger(HapticPattern.SELECTION);

      expect(result).toBe(false);
      expect(HapticService.isReady()).toBe(false);
    });

    test('should not trigger feedback when haptics are disabled', async () => {
      (Platform as any).OS = 'android';
      (Platform as any).Version = 26;
      await HapticService.initialize();

      HapticService.setEnabled(false);
      const result = await HapticService.trigger(HapticPattern.SELECTION);

      expect(result).toBe(false);
      expect(HapticService.isReady()).toBe(false);
    });

    test('should return ready state correctly', async () => {
      expect(HapticService.isReady()).toBe(false);

      (Platform as any).OS = 'android';
      (Platform as any).Version = 26;
      await HapticService.initialize();

      expect(HapticService.isReady()).toBe(true);

      HapticService.setEnabled(false);
      expect(HapticService.isReady()).toBe(false);
    });
  });
});