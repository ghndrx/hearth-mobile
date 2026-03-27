import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import BatteryAwareNotificationService from '../notifications/BatteryAwareNotificationService';
import BatteryOptimizationService from '../battery/BatteryOptimizationService';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-notifications');
jest.mock('../battery/BatteryOptimizationService');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;
const mockBatteryService = BatteryOptimizationService as jest.Mocked<typeof BatteryOptimizationService>;

describe('BatteryAwareNotificationService', () => {
  let service: typeof BatteryAwareNotificationService;
  let mockBatterySubscriber: ((metrics: any) => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();

    // Mock notifications
    mockNotifications.setNotificationHandler.mockImplementation(() => {});
    mockNotifications.scheduleNotificationAsync.mockResolvedValue('notification-id');
    mockNotifications.cancelScheduledNotificationAsync.mockResolvedValue();

    // Mock battery service
    mockBatteryService.subscribe.mockImplementation((callback) => {
      mockBatterySubscriber = callback;
      // Immediately call with default metrics
      callback({
        level: 0.8,
        isCharging: false,
        batteryState: 2, // UNPLUGGED
        lowPowerMode: false,
      });
      return jest.fn(); // unsubscribe function
    });

    mockBatteryService.getBatteryMetrics.mockReturnValue({
      level: 0.8,
      isCharging: false,
      batteryState: 2, // UNPLUGGED
      lowPowerMode: false,
    });

    service = BatteryAwareNotificationService;
  });

  afterEach(() => {
    jest.useRealTimers();
    service.dispose();
    mockBatterySubscriber = null;
  });

  describe('initialization', () => {
    it('should initialize with default settings', async () => {
      await service.initialize();

      const settings = service.getSettings();
      expect(settings.batteryAwareEnabled).toBe(true);
      expect(settings.criticalAlwaysAllowed).toBe(true);
      expect(settings.groupingSettings.enabled).toBe(true);
    });

    it('should load saved settings from storage', async () => {
      const savedSettings = {
        batteryAwareEnabled: false,
        criticalAlwaysAllowed: false,
        lowPowerModeSettings: {
          allowMessages: false,
          allowVoiceCalls: true,
        },
      };
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'notification_settings') {
          return Promise.resolve(JSON.stringify(savedSettings));
        }
        return Promise.resolve(null);
      });

      await service.initialize();

      const settings = service.getSettings();
      expect(settings.batteryAwareEnabled).toBe(false);
      expect(settings.criticalAlwaysAllowed).toBe(false);
      expect(settings.lowPowerModeSettings.allowMessages).toBe(false);
      expect(settings.lowPowerModeSettings.allowVoiceCalls).toBe(true);
    });

    it('should set up notification handler', async () => {
      await service.initialize();

      expect(mockNotifications.setNotificationHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          handleNotification: expect.any(Function),
        })
      );
    });
  });

  describe('notification scheduling', () => {
    it('should schedule immediate notifications', async () => {
      await service.initialize();

      const notificationId = await service.scheduleNotification({
        title: 'Test Notification',
        body: 'This is a test',
        priority: 'high',
        category: 'message',
        maxRetries: 3,
        timeoutMs: 5000,
      });

      expect(notificationId).toBeTruthy();
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: 'Test Notification',
            body: 'This is a test',
          }),
          trigger: null,
        })
      );
    });

    it('should suppress marketing notifications in low power mode', async () => {
      mockBatteryService.getBatteryMetrics.mockReturnValue({
        level: 0.8,
        isCharging: false,
        batteryState: 2,
        lowPowerMode: true,
      });

      await service.initialize();

      const notificationId = await service.scheduleNotification({
        title: 'Marketing Message',
        body: 'Buy our product!',
        priority: 'low',
        category: 'marketing',
        maxRetries: 1,
        timeoutMs: 5000,
      });

      expect(notificationId).toBeTruthy();
      expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();

      const metrics = service.getMetrics();
      expect(metrics.suppressed).toBe(1);
    });

    it('should delay low priority notifications when battery is low', async () => {
      mockBatteryService.getBatteryMetrics.mockReturnValue({
        level: 0.12, // Very low battery
        isCharging: false,
        batteryState: 2,
        lowPowerMode: false,
      });

      await service.initialize();

      await service.scheduleNotification({
        title: 'Low Priority',
        body: 'Can wait',
        priority: 'low',
        category: 'social',
        maxRetries: 1,
        timeoutMs: 5000,
      });

      // Should not send immediately
      expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();

      // Should be in pending notifications
      expect(service.getPendingNotificationsCount()).toBe(1);
    });

    it('should always allow critical notifications', async () => {
      mockBatteryService.getBatteryMetrics.mockReturnValue({
        level: 0.05, // Extremely low battery
        isCharging: false,
        batteryState: 2,
        lowPowerMode: true,
      });

      await service.initialize();

      await service.scheduleNotification({
        title: 'Critical Alert',
        body: 'Emergency notification',
        priority: 'critical',
        category: 'system',
        maxRetries: 1,
        timeoutMs: 5000,
      });

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalled();
    });

    it('should disable sound and vibration in low power situations', async () => {
      mockBatteryService.getBatteryMetrics.mockReturnValue({
        level: 0.18,
        isCharging: false,
        batteryState: 2,
        lowPowerMode: false,
      });

      await service.initialize();

      await service.scheduleNotification({
        title: 'Quiet Notification',
        body: 'Should be silent',
        priority: 'medium',
        category: 'message',
        sound: true,
        vibration: true,
        maxRetries: 1,
        timeoutMs: 5000,
      });

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            sound: undefined, // Should be undefined (no sound) due to low battery
          }),
        })
      );
    });
  });

  describe('notification grouping', () => {
    it('should group notifications with same groupKey', async () => {
      await service.initialize();

      // Schedule multiple notifications with same group
      await service.scheduleNotification({
        title: 'Message 1',
        body: 'First message',
        priority: 'medium',
        category: 'message',
        groupKey: 'chat-room-123',
        maxRetries: 1,
        timeoutMs: 5000,
      });

      await service.scheduleNotification({
        title: 'Message 2',
        body: 'Second message',
        priority: 'medium',
        category: 'message',
        groupKey: 'chat-room-123',
        maxRetries: 1,
        timeoutMs: 5000,
      });

      // Should not send individual notifications yet
      expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
      expect(service.getPendingNotificationsCount()).toBe(2);
    });

    it('should send grouped notification when batch size is reached', async () => {
      await service.initialize();

      // Add notifications up to max group size (default: 5)
      for (let i = 1; i <= 5; i++) {
        await service.scheduleNotification({
          title: `Message ${i}`,
          body: `Message body ${i}`,
          priority: 'medium',
          category: 'message',
          groupKey: 'group-max-test',
          maxRetries: 1,
          timeoutMs: 5000,
        });
      }

      // Should send grouped notification
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: '5 new messages',
            body: expect.stringContaining('Message 1, Message 2'),
          }),
        })
      );
    });

    it('should send grouped notification after time window', async () => {
      await service.initialize();

      await service.scheduleNotification({
        title: 'Delayed Group',
        body: 'Should be sent after timeout',
        priority: 'medium',
        category: 'message',
        groupKey: 'timeout-group',
        maxRetries: 1,
        timeoutMs: 5000,
      });

      // Fast forward past group time window (default: 5 minutes)
      jest.advanceTimersByTime(300000);

      // Should send the grouped notification
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalled();
    });

    it('should create appropriate group titles for different categories', async () => {
      await service.initialize();

      // Social notifications group
      for (let i = 1; i <= 3; i++) {
        await service.scheduleNotification({
          title: `Social Update ${i}`,
          body: `Update body ${i}`,
          priority: 'low',
          category: 'social',
          groupKey: 'social-group',
          maxRetries: 1,
          timeoutMs: 5000,
        });
      }

      // Trigger grouping by reaching max size
      for (let i = 4; i <= 5; i++) {
        await service.scheduleNotification({
          title: `Social Update ${i}`,
          body: `Update body ${i}`,
          priority: 'low',
          category: 'social',
          groupKey: 'social-group',
          maxRetries: 1,
          timeoutMs: 5000,
        });
      }

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: '5 social updates',
          }),
        })
      );
    });
  });

  describe('catch-up notifications', () => {
    it('should send catch-up notifications when device starts charging', async () => {
      await service.initialize();

      // Schedule notifications that get delayed
      mockBatteryService.getBatteryMetrics.mockReturnValue({
        level: 0.10,
        isCharging: false,
        batteryState: 2,
        lowPowerMode: false,
      });

      await service.scheduleNotification({
        title: 'Delayed 1',
        body: 'Should be delayed',
        priority: 'medium',
        category: 'message',
        maxRetries: 1,
        timeoutMs: 5000,
      });

      await service.scheduleNotification({
        title: 'Delayed 2',
        body: 'Should be delayed too',
        priority: 'low',
        category: 'social',
        maxRetries: 1,
        timeoutMs: 5000,
      });

      expect(service.getPendingNotificationsCount()).toBe(2);
      expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();

      // Simulate device starting to charge
      const chargingMetrics = {
        level: 0.10,
        isCharging: true,
        batteryState: 1, // CHARGING
        lowPowerMode: false,
      };

      mockBatteryService.getBatteryMetrics.mockReturnValue(chargingMetrics);

      // Trigger battery state change
      if (mockBatterySubscriber) {
        mockBatterySubscriber(chargingMetrics);
      }

      // Fast forward to process catch-up
      jest.advanceTimersByTime(2000);

      // Should send catch-up notifications with delays
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalled();
    });

    it('should limit catch-up notifications', async () => {
      await service.initialize();

      // Update settings to limit catch-up notifications
      await service.updateSettings({
        chargingBehavior: {
          resumeAllNotifications: true,
          catchUpMissed: true,
          maxCatchUpNotifications: 2,
        },
      });

      // Schedule many delayed notifications
      mockBatteryService.getBatteryMetrics.mockReturnValue({
        level: 0.08,
        isCharging: false,
        batteryState: 2,
        lowPowerMode: false,
      });

      for (let i = 1; i <= 5; i++) {
        await service.scheduleNotification({
          title: `Catchup ${i}`,
          body: `Delayed notification ${i}`,
          priority: 'medium',
          category: 'message',
          maxRetries: 1,
          timeoutMs: 5000,
        });
      }

      expect(service.getPendingNotificationsCount()).toBe(5);

      // Start charging
      if (mockBatterySubscriber) {
        mockBatterySubscriber({
          level: 0.08,
          isCharging: true,
          batteryState: 1,
          lowPowerMode: false,
        });
      }

      jest.advanceTimersByTime(5000);

      // Should only send up to maxCatchUpNotifications (2)
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
      expect(service.getPendingNotificationsCount()).toBe(3); // 3 should remain
    });
  });

  describe('settings management', () => {
    it('should update and persist settings', async () => {
      await service.initialize();

      await service.updateSettings({
        batteryAwareEnabled: false,
        groupingSettings: {
          enabled: false,
          maxGroupSize: 10,
          groupTimeWindowMs: 600000,
        },
      });

      const settings = service.getSettings();
      expect(settings.batteryAwareEnabled).toBe(false);
      expect(settings.groupingSettings.enabled).toBe(false);
      expect(settings.groupingSettings.maxGroupSize).toBe(10);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'notification_settings',
        expect.stringContaining('"batteryAwareEnabled":false')
      );
    });
  });

  describe('notification cancellation', () => {
    it('should cancel pending notifications', async () => {
      await service.initialize();

      const notificationId = await service.scheduleNotification({
        title: 'To Cancel',
        body: 'This will be cancelled',
        priority: 'low',
        category: 'social',
        scheduleAfter: Date.now() + 300000, // 5 minutes from now
        maxRetries: 1,
        timeoutMs: 5000,
      });

      expect(service.getPendingNotificationsCount()).toBe(1);

      const cancelled = await service.cancelNotification(notificationId);
      expect(cancelled).toBe(true);
      expect(service.getPendingNotificationsCount()).toBe(0);
    });

    it('should cancel notifications from groups', async () => {
      await service.initialize();

      const notificationId = await service.scheduleNotification({
        title: 'Grouped Cancel',
        body: 'In a group, will be cancelled',
        priority: 'medium',
        category: 'message',
        groupKey: 'cancel-group',
        maxRetries: 1,
        timeoutMs: 5000,
      });

      await service.scheduleNotification({
        title: 'Grouped Stay',
        body: 'In a group, will stay',
        priority: 'medium',
        category: 'message',
        groupKey: 'cancel-group',
        maxRetries: 1,
        timeoutMs: 5000,
      });

      expect(service.getPendingNotificationsCount()).toBe(2);

      const cancelled = await service.cancelNotification(notificationId);
      expect(cancelled).toBe(true);
      expect(service.getPendingNotificationsCount()).toBe(1);
    });
  });

  describe('metrics tracking', () => {
    it('should track notification metrics', async () => {
      await service.initialize();

      // Send some notifications
      await service.scheduleNotification({
        title: 'Metric Test 1',
        body: 'Sent immediately',
        priority: 'high',
        category: 'system',
        maxRetries: 1,
        timeoutMs: 5000,
      });

      // Suppress one notification
      mockBatteryService.getBatteryMetrics.mockReturnValue({
        level: 0.08,
        isCharging: false,
        batteryState: 2,
        lowPowerMode: false,
      });

      await service.scheduleNotification({
        title: 'Metric Test 2',
        body: 'Should be suppressed',
        priority: 'low',
        category: 'marketing',
        maxRetries: 1,
        timeoutMs: 5000,
      });

      const metrics = service.getMetrics();
      expect(metrics.totalSent).toBe(1);
      expect(metrics.suppressed).toBe(1);
      expect(metrics.batterySavings).toBeGreaterThan(0);
    });
  });

  describe('periodic cleanup', () => {
    it('should clean up expired notifications', async () => {
      await service.initialize();

      // Schedule notification that expires soon
      await service.scheduleNotification({
        title: 'Expires Soon',
        body: 'Will expire',
        priority: 'low',
        category: 'social',
        expiresAt: Date.now() + 1000, // Expires in 1 second
        scheduleAfter: Date.now() + 5000, // Scheduled for 5 seconds
        maxRetries: 1,
        timeoutMs: 5000,
      });

      expect(service.getPendingNotificationsCount()).toBe(1);

      // Fast forward past expiration
      jest.advanceTimersByTime(62000); // > 1 minute to trigger cleanup

      expect(service.getPendingNotificationsCount()).toBe(0);
    });
  });
});