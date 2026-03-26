/**
 * Unit tests for Notification Delivery Service - PN-002
 *
 * Tests the push notification delivery pipeline including:
 * - FCM and APNs message formatting
 * - Error handling and retry logic
 * - Batch notification delivery
 * - Type validation
 */

import {
  NotificationDeliveryService,
  NotificationDeliveryError,
  type NotificationDeliveryConfig,
  type NotificationDeliveryRequest,
  type BatchNotificationDeliveryRequest,
  DEFAULT_RETRY_CONFIG,
  RETRYABLE_ERROR_CODES,
  FCM_ERROR_CODES,
  APNS_ERROR_CODES,
} from '../../lib/services/notificationDelivery';

import {
  type NotificationDeliveryRequest as RequestType,
  type NotificationDeliveryResult,
  type BatchNotificationDeliveryResult,
  type DevicePlatform,
  type NotificationPriority,
  type NotificationContent,
  type AndroidNotificationOptions,
  type iOSNotificationOptions,
} from '../../lib/types/notificationDelivery';

describe('NotificationDeliveryService', () => {
  // Mock Firebase Admin SDK
  const mockFCMMessaging = {
    send: jest.fn(),
  };

  // Mock APNs provider
  const mockApnProvider = {
    send: jest.fn(),
    shutdown: jest.fn(),
  };

  // Mock firebase-admin module
  jest.mock('firebase-admin', () => ({
    apps: [],
    initializeApp: jest.fn(),
    credential: {
      cert: jest.fn(() => ({})),
    },
    messaging: jest.fn(() => mockFCMMessaging),
  }));

  // Mock apn module
  jest.mock('apn', () => ({
    Provider: jest.fn(() => mockApnProvider),
    Notification: jest.fn(() => ({
      alert: {},
      badge: undefined,
      sound: undefined,
      category: 'default',
      threadId: undefined,
      mutableContent: 1,
      priority: 10,
      data: {},
      set: jest.fn(),
    })),
  }));

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create service with default retry config', () => {
      const service = new NotificationDeliveryService();
      expect(service).toBeInstanceOf(NotificationDeliveryService);
    });

    it('should create service with custom retry config', () => {
      const customConfig: NotificationDeliveryConfig = {
        retry: {
          maxRetries: 5,
          baseDelayMs: 2000,
          maxDelayMs: 60000,
          backoffMultiplier: 3,
        },
        logging: false,
      };

      const service = new NotificationDeliveryService(customConfig);
      expect(service).toBeInstanceOf(NotificationDeliveryService);
    });

    it('should not throw when created without FCM or APNs config', () => {
      expect(() => new NotificationDeliveryService()).not.toThrow();
    });
  });

  describe('isFCMEnabled / isAPNsEnabled', () => {
    it('should return false when FCM is not initialized', () => {
      const service = new NotificationDeliveryService();
      expect(service.isFCMEnabled()).toBe(false);
    });

    it('should return false when APNs is not initialized', () => {
      const service = new NotificationDeliveryService();
      expect(service.isAPNsEnabled()).toBe(false);
    });
  });

  describe('send() - Android (FCM)', () => {
    const androidRequest: NotificationDeliveryRequest = {
      token: 'android-fcm-token-123',
      platform: 'android',
      notification: {
        title: 'Test Title',
        body: 'Test body content',
      },
      data: {
        type: 'message',
        channelId: 'channel-123',
        serverId: 'server-456',
      },
      priority: 'high',
    };

    it('should send notification to FCM successfully', async () => {
      // Mock FCM initialization
      mockFCMMessaging.send.mockResolvedValue('fcm-message-id-123');

      const service = new NotificationDeliveryService({
        fcm: { serviceAccount: { project_id: 'test' } },
      });

      const result = await service.send(androidRequest);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('fcm-message-id-123');
      expect(result.platform).toBe('android');
      expect(result.token).toBe(androidRequest.token);
    });

    it('should handle FCM delivery failure', async () => {
      mockFCMMessaging.send.mockRejectedValue(new Error('FCM server error'));

      const service = new NotificationDeliveryService({
        fcm: { serviceAccount: { project_id: 'test' } },
      });

      const result = await service.send(androidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.retryable).toBeDefined();
    });

    it('should include custom data in FCM message', async () => {
      mockFCMMessaging.send.mockResolvedValue('fcm-message-id-456');

      const requestWithData: NotificationDeliveryRequest = {
        token: 'android-token',
        platform: 'android',
        notification: {
          title: 'Message',
          body: 'You have a new message',
        },
        data: {
          messageId: 'msg-123',
          threadId: 'thread-456',
          imageUrl: 'https://example.com/image.png',
        },
      };

      const service = new NotificationDeliveryService({
        fcm: { serviceAccount: { project_id: 'test' } },
      });

      await service.send(requestWithData);

      expect(mockFCMMessaging.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.objectContaining({
            data: expect.objectContaining({
              messageId: 'msg-123',
              threadId: 'thread-456',
              imageUrl: 'https://example.com/image.png',
            }),
          }),
        })
      );
    });

    it('should set correct FCM priority for high priority notifications', async () => {
      mockFCMMessaging.send.mockResolvedValue('fcm-message-id');

      const highPriorityRequest: NotificationDeliveryRequest = {
        ...androidRequest,
        priority: 'high',
      };

      const service = new NotificationDeliveryService({
        fcm: { serviceAccount: { project_id: 'test' } },
      });

      await service.send(highPriorityRequest);

      expect(mockFCMMessaging.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.objectContaining({
            android: expect.objectContaining({
              priority: 'high',
            }),
          }),
        })
      );
    });
  });

  describe('send() - iOS (APNs)', () => {
    const iosRequest: NotificationDeliveryRequest = {
      token: 'ios-apns-token-123',
      platform: 'ios',
      notification: {
        title: 'Test iOS Title',
        body: 'Test iOS body content',
        badge: 5,
        sound: 'default',
        categoryId: 'MESSAGE_CATEGORY',
        threadId: 'thread-123',
      },
      data: {
        type: 'dm',
        senderId: 'user-789',
      },
      priority: 'high',
      ios: {
        interruptionLevel: 'active',
      },
    };

    it('should send notification to APNs successfully', async () => {
      mockApnProvider.send.mockResolvedValue({
        sent: ['apns-message-id-123'],
        failed: [],
      });

      const service = new NotificationDeliveryService({
        apns: {
          keyId: 'KEY123',
          teamId: 'TEAM123',
          bundleId: 'com.hearth.app',
          privateKey: 'private-key-buffer',
          production: false,
        },
      });

      const result = await service.send(iosRequest);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('apns-message-id-123');
      expect(result.platform).toBe('ios');
      expect(result.token).toBe(iosRequest.token);
    });

    it('should handle APNs delivery failure', async () => {
      mockApnProvider.send.mockResolvedValue({
        sent: [],
        failed: [
          {
            device: iosRequest.token,
            response: { reason: 'BadDeviceToken' },
          },
        ],
      });

      const service = new NotificationDeliveryService({
        apns: {
          keyId: 'KEY123',
          teamId: 'TEAM123',
          bundleId: 'com.hearth.app',
          privateKey: 'private-key-buffer',
          production: false,
        },
      });

      const result = await service.send(iosRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('BadDeviceToken');
    });

    it('should handle APNs network error', async () => {
      mockApnProvider.send.mockRejectedValue(new Error('Network timeout'));

      const service = new NotificationDeliveryService({
        apns: {
          keyId: 'KEY123',
          teamId: 'TEAM123',
          bundleId: 'com.hearth.app',
          privateKey: 'private-key-buffer',
          production: false,
        },
      });

      const result = await service.send(iosRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle empty APNs response', async () => {
      mockApnProvider.send.mockResolvedValue({
        sent: [],
        failed: [],
      });

      const service = new NotificationDeliveryService({
        apns: {
          keyId: 'KEY123',
          teamId: 'TEAM123',
          bundleId: 'com.hearth.app',
          privateKey: 'private-key-buffer',
          production: false,
        },
      });

      const result = await service.send(iosRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('APNS_NO_RESPONSE');
    });
  });

  describe('sendWithRetry()', () => {
    const baseRequest: NotificationDeliveryRequest = {
      token: 'retry-token',
      platform: 'android',
      notification: {
        title: 'Retry Test',
        body: 'Testing retry logic',
      },
    };

    it('should retry on retryable errors', async () => {
      let callCount = 0;
      mockFCMMessaging.send.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          const error = new Error('FCM Quota Exceeded');
          (error as { code: string }).code = 'messaging/QUOTA_EXCEEDED';
          throw error;
        }
        return Promise.resolve('fcm-message-id-success');
      });

      const service = new NotificationDeliveryService({
        fcm: { serviceAccount: { project_id: 'test' } },
        retry: {
          maxRetries: 3,
          baseDelayMs: 10,
          maxDelayMs: 100,
          backoffMultiplier: 2,
        },
        logging: false,
      });

      const result = await service.sendWithRetry(baseRequest);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('fcm-message-id-success');
      expect(callCount).toBe(3);
    });

    it('should not retry on non-retryable errors', async () => {
      mockFCMMessaging.send.mockRejectedValue(new Error('Invalid argument'));

      const service = new NotificationDeliveryService({
        fcm: { serviceAccount: { project_id: 'test' } },
        retry: {
          maxRetries: 3,
          baseDelayMs: 10,
          maxDelayMs: 100,
          backoffMultiplier: 2,
        },
        logging: false,
      });

      const result = await service.sendWithRetry(baseRequest);

      expect(result.success).toBe(false);
      expect(result.error?.retryable).toBe(false);
      expect(mockFCMMessaging.send).toHaveBeenCalledTimes(1);
    });

    it('should fail after max retries exceeded', async () => {
      mockFCMMessaging.send.mockRejectedValue(new Error('Service unavailable'));

      const service = new NotificationDeliveryService({
        fcm: { serviceAccount: { project_id: 'test' } },
        retry: {
          maxRetries: 2,
          baseDelayMs: 10,
          maxDelayMs: 100,
          backoffMultiplier: 2,
        },
        logging: false,
      });

      const result = await service.sendWithRetry(baseRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MAX_RETRIES_EXCEEDED');
      expect(mockFCMMessaging.send).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('sendBatch()', () => {
    const createBatchRequest = (count: number): BatchNotificationDeliveryRequest => ({
      notifications: Array.from({ length: count }, (_, i) => ({
        token: `token-${i}`,
        platform: i % 2 === 0 ? 'android' : 'ios',
        notification: {
          title: `Notification ${i}`,
          body: `Body ${i}`,
        },
      })),
      batchSize: 3,
    });

    it('should process batch successfully', async () => {
      mockFCMMessaging.send.mockResolvedValue('fcm-id');
      mockApnProvider.send.mockResolvedValue({ sent: ['apns-id'], failed: [] });

      const service = new NotificationDeliveryService({
        fcm: { serviceAccount: { project_id: 'test' } },
        apns: {
          keyId: 'KEY123',
          teamId: 'TEAM123',
          bundleId: 'com.hearth.app',
          privateKey: 'private-key',
          production: false,
        },
        logging: false,
      });

      const request = createBatchRequest(6);
      const result = await service.sendBatch(request);

      expect(result.total).toBe(6);
      expect(result.successful).toBe(6);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(6);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle mixed success and failure in batch', async () => {
      mockFCMMessaging.send
        .mockResolvedValueOnce('fcm-success-1')
        .mockRejectedValueOnce(new Error('FCM error'))
        .mockResolvedValueOnce('fcm-success-2');

      mockApnProvider.send
        .mockResolvedValueOnce({ sent: ['apns-1'], failed: [] })
        .mockResolvedValueOnce({ sent: [], failed: [{ device: 'token-3', response: { reason: 'BadToken' } }] })
        .mockResolvedValueOnce({ sent: ['apns-3'], failed: [] });

      const service = new NotificationDeliveryService({
        fcm: { serviceAccount: { project_id: 'test' } },
        apns: {
          keyId: 'KEY123',
          teamId: 'TEAM123',
          bundleId: 'com.hearth.app',
          privateKey: 'private-key',
          production: false,
        },
        logging: false,
      });

      const request = createBatchRequest(6);
      const result = await service.sendBatch(request);

      expect(result.total).toBe(6);
      expect(result.successful).toBeLessThan(6);
      expect(result.failed).toBeGreaterThan(0);
      expect(result.results).toHaveLength(6);
    });
  });

  describe('shutdown()', () => {
    it('should shutdown APNs provider gracefully', async () => {
      mockApnProvider.send.mockResolvedValue({ sent: ['id'], failed: [] });
      mockApnProvider.shutdown.mockResolvedValue(undefined);

      const service = new NotificationDeliveryService({
        apns: {
          keyId: 'KEY123',
          teamId: 'TEAM123',
          bundleId: 'com.hearth.app',
          privateKey: 'private-key',
          production: false,
        },
        logging: false,
      });

      await service.shutdown();

      expect(mockApnProvider.shutdown).toHaveBeenCalled();
    });
  });
});

describe('NotificationDeliveryError', () => {
  it('should create error with correct properties', () => {
    const error = new NotificationDeliveryError(
      'Test error message',
      'TEST_CODE',
      'android',
      true
    );

    expect(error.message).toBe('Test error message');
    expect(error.code).toBe('TEST_CODE');
    expect(error.platform).toBe('android');
    expect(error.retryable).toBe(true);
    expect(error.name).toBe('NotificationDeliveryError');
  });

  it('should default retryable to false', () => {
    const error = new NotificationDeliveryError(
      'Test error',
      'TEST_CODE',
      'ios'
    );

    expect(error.retryable).toBe(false);
  });
});

describe('Type definitions', () => {
  it('should export all required types', () => {
    // Verify types are properly exported and can be used
    const platform: DevicePlatform = 'ios';
    const priority: NotificationPriority = 'high';

    const notification: NotificationContent = {
      title: 'Test',
      body: 'Body',
      badge: 1,
      sound: 'default',
    };

    const androidOptions: AndroidNotificationOptions = {
      channelId: 'default',
      notification: {
        channelId: 'default',
        icon: 'ic_notification',
        color: '#5865F2',
        priority: 'HIGH',
      },
    };

    const iosOptions: iOSNotificationOptions = {
      interruptionLevel: 'active',
      relevanceScore: 0.5,
    };

    expect(platform).toBe('ios');
    expect(priority).toBe('high');
    expect(notification.title).toBe('Test');
    expect(androidOptions.notification?.priority).toBe('HIGH');
    expect(iosOptions.interruptionLevel).toBe('active');
  });

  it('should have correct default retry config values', () => {
    expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(3);
    expect(DEFAULT_RETRY_CONFIG.baseDelayMs).toBe(1000);
    expect(DEFAULT_RETRY_CONFIG.maxDelayMs).toBe(30000);
    expect(DEFAULT_RETRY_CONFIG.backoffMultiplier).toBe(2);
  });

  it('should include all retryable error codes', () => {
    expect(RETRYABLE_ERROR_CODES).toContain(FCM_ERROR_CODES.QUOTA_EXCEEDED);
    expect(RETRYABLE_ERROR_CODES).toContain(FCM_ERROR_CODES.UNAVAILABLE);
    expect(RETRYABLE_ERROR_CODES).toContain(APNS_ERROR_CODES.SHUTDOWN);
    expect(RETRYABLE_ERROR_CODES).toContain(APNS_ERROR_CODES.INTERNAL);
  });
});
