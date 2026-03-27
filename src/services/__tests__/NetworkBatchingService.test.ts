import AsyncStorage from '@react-native-async-storage/async-storage';
import NetworkBatchingService from '../network/NetworkBatchingService';
import BatteryOptimizationService from '../battery/BatteryOptimizationService';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');
jest.mock('../battery/BatteryOptimizationService');

// Mock fetch
global.fetch = jest.fn();

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockBatteryService = BatteryOptimizationService as jest.Mocked<typeof BatteryOptimizationService>;
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('NetworkBatchingService', () => {
  let service: typeof NetworkBatchingService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();

    // Mock battery service
    mockBatteryService.getPerformanceProfile.mockReturnValue('balanced');
    mockBatteryService.getBatteryMetrics.mockReturnValue({
      level: 0.8,
      isCharging: false,
      batteryState: 2, // UNPLUGGED
      lowPowerMode: false,
    });

    // Mock successful fetch responses
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: 'test' }),
    } as Response);

    service = NetworkBatchingService;
  });

  afterEach(() => {
    jest.useRealTimers();
    service.dispose();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', async () => {
      await service.initialize();

      const metrics = service.getNetworkMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.batchedRequests).toBe(0);
    });

    it('should load saved metrics from storage', async () => {
      const savedMetrics = {
        totalRequests: 100,
        batchedRequests: 80,
        savedRadioWakeups: 20,
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(savedMetrics));

      await service.initialize();

      const metrics = service.getNetworkMetrics();
      expect(metrics.totalRequests).toBe(100);
      expect(metrics.batchedRequests).toBe(80);
      expect(metrics.savedRadioWakeups).toBe(20);
    });
  });

  describe('request batching', () => {
    it('should add requests to queue', async () => {
      await service.initialize();

      const requestPromise = service.addRequest({
        endpoint: '/api/messages',
        method: 'GET',
        priority: 'medium',
        maxRetries: 3,
        timeoutMs: 10000,
      });

      expect(requestPromise).toBeInstanceOf(Promise);

      const queueStatus = service.getQueueStatus();
      expect(queueStatus['/api/messages']).toBe(1);
    });

    it('should process high priority requests immediately', async () => {
      await service.initialize();

      const requestPromise = service.addRequest({
        endpoint: '/api/urgent',
        method: 'POST',
        priority: 'high',
        data: { message: 'urgent' },
        maxRetries: 1,
        timeoutMs: 5000,
      });

      // High priority requests should be processed immediately
      jest.advanceTimersByTime(100);

      expect(mockFetch).toHaveBeenCalledWith('/api/urgent', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ message: 'urgent' }),
      }));

      await requestPromise;
    });

    it('should batch multiple requests to same endpoint', async () => {
      await service.initialize();

      // Add multiple requests to same endpoint
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(service.addRequest({
          endpoint: '/api/messages',
          method: 'GET',
          priority: 'medium',
          data: { id: i },
          maxRetries: 1,
          timeoutMs: 10000,
        }));
      }

      // Fast forward to trigger batching
      jest.advanceTimersByTime(6000);

      // Should try to create a batch request first
      expect(mockFetch).toHaveBeenCalledWith('/api/messages/batch', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('requests'),
      }));
    });

    it('should fall back to individual requests if batch fails', async () => {
      await service.initialize();

      // Mock batch request to fail, but individual requests to succeed
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        } as Response)
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response);

      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(service.addRequest({
          endpoint: '/api/fallback',
          method: 'GET',
          priority: 'medium',
          maxRetries: 1,
          timeoutMs: 5000,
        }));
      }

      jest.advanceTimersByTime(6000);

      // Should fall back to individual requests
      expect(mockFetch).toHaveBeenCalledWith('/api/fallback/batch', expect.any(Object));
      expect(mockFetch).toHaveBeenCalledWith('/api/fallback', expect.any(Object));
    });
  });

  describe('battery optimizations', () => {
    it('should apply battery optimizations when battery is low', async () => {
      mockBatteryService.getPerformanceProfile.mockReturnValue('battery_saver');
      mockBatteryService.getBatteryMetrics.mockReturnValue({
        level: 0.15,
        isCharging: false,
        batteryState: 2, // UNPLUGGED
        lowPowerMode: true,
      });

      await service.initialize();

      const requestPromise = service.addRequest({
        endpoint: '/api/low-priority',
        method: 'GET',
        priority: 'low',
        maxRetries: 1,
        timeoutMs: 10000,
        batteryOptimized: true,
      });

      // Low priority request should be delayed in battery saver mode
      const queueStatus = service.getQueueStatus();
      expect(queueStatus['/api/low-priority']).toBe(1);

      // Should not be processed immediately
      jest.advanceTimersByTime(1000);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should increase timeout in battery saver mode', async () => {
      mockBatteryService.getPerformanceProfile.mockReturnValue('battery_saver');

      await service.initialize();

      service.addRequest({
        endpoint: '/api/timeout-test',
        method: 'GET',
        priority: 'high',
        maxRetries: 1,
        timeoutMs: 10000,
        batteryOptimized: true,
      });

      jest.advanceTimersByTime(100);

      // Should have extended timeout due to battery optimization
      expect(mockFetch).toHaveBeenCalledWith('/api/timeout-test', expect.objectContaining({
        signal: expect.any(AbortSignal),
      }));
    });

    it('should prioritize essential requests in thermal throttling', async () => {
      mockBatteryService.getPerformanceProfile.mockReturnValue('thermal_throttled');

      await service.initialize();

      // Add low priority request
      service.addRequest({
        endpoint: '/api/low',
        method: 'GET',
        priority: 'low',
        maxRetries: 1,
        timeoutMs: 5000,
      });

      // Add high priority request
      service.addRequest({
        endpoint: '/api/high',
        method: 'GET',
        priority: 'high',
        maxRetries: 1,
        timeoutMs: 5000,
      });

      jest.advanceTimersByTime(100);

      // High priority should be processed
      expect(mockFetch).toHaveBeenCalledWith('/api/high', expect.any(Object));

      // Low priority should be queued
      const queueStatus = service.getQueueStatus();
      expect(queueStatus['/api/low']).toBe(1);
    });
  });

  describe('network state handling', () => {
    it('should queue requests when network is disconnected', async () => {
      // Mock network as disconnected
      require('@react-native-community/netinfo').__setNetworkState({
        isConnected: false,
        type: 'none',
      });

      await service.initialize();

      service.addRequest({
        endpoint: '/api/offline',
        method: 'GET',
        priority: 'medium',
        maxRetries: 1,
        timeoutMs: 5000,
        requiresNetwork: true,
      });

      jest.advanceTimersByTime(6000);

      // Should not make request when offline
      expect(mockFetch).not.toHaveBeenCalled();

      const queueStatus = service.getQueueStatus();
      expect(queueStatus['/api/offline']).toBe(1);
    });

    it('should process queued requests when network becomes available', async () => {
      const netInfo = require('@react-native-community/netinfo');

      // Start with disconnected network
      netInfo.__setNetworkState({
        isConnected: false,
        type: 'none',
      });

      await service.initialize();

      service.addRequest({
        endpoint: '/api/reconnect',
        method: 'GET',
        priority: 'medium',
        maxRetries: 1,
        timeoutMs: 5000,
        requiresNetwork: true,
      });

      // Network becomes available
      netInfo.__setNetworkState({
        isConnected: true,
        type: 'wifi',
      });

      jest.advanceTimersByTime(1000);

      // Should process the queued request
      expect(mockFetch).toHaveBeenCalledWith('/api/reconnect', expect.any(Object));
    });

    it('should adjust batch timing based on network type', async () => {
      const netInfo = require('@react-native-community/netinfo');

      // Set cellular network
      netInfo.__setNetworkState({
        isConnected: true,
        type: 'cellular',
      });

      await service.initialize();

      service.addRequest({
        endpoint: '/api/cellular',
        method: 'GET',
        priority: 'medium',
        maxRetries: 1,
        timeoutMs: 5000,
      });

      // Should wait longer on cellular to batch more requests
      jest.advanceTimersByTime(5000);
      expect(mockFetch).not.toHaveBeenCalled();

      jest.advanceTimersByTime(3000);
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('request retry logic', () => {
    it('should retry failed requests', async () => {
      await service.initialize();

      // Mock first request to fail, second to succeed
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response);

      const requestPromise = service.addRequest({
        endpoint: '/api/retry',
        method: 'GET',
        priority: 'high',
        maxRetries: 2,
        timeoutMs: 5000,
      });

      jest.advanceTimersByTime(100);

      // First attempt should fail
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Advance time for retry with exponential backoff
      jest.advanceTimersByTime(2000);

      // Should retry the request
      expect(mockFetch).toHaveBeenCalledTimes(2);

      await requestPromise;
    });

    it('should give up after max retries', async () => {
      await service.initialize();

      mockFetch.mockRejectedValue(new Error('Persistent error'));

      const requestPromise = service.addRequest({
        endpoint: '/api/fail',
        method: 'GET',
        priority: 'high',
        maxRetries: 1,
        timeoutMs: 5000,
      });

      jest.advanceTimersByTime(100);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(2000);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Should not retry again
      jest.advanceTimersByTime(5000);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      await expect(requestPromise).rejects.toThrow('Persistent error');
    });
  });

  describe('performance controls', () => {
    it('should limit concurrent requests based on performance profile', async () => {
      mockBatteryService.getPerformanceProfile.mockReturnValue('battery_saver');

      await service.initialize();

      // Add multiple requests
      for (let i = 0; i < 5; i++) {
        service.addRequest({
          endpoint: `/api/concurrent-${i}`,
          method: 'GET',
          priority: 'medium',
          maxRetries: 1,
          timeoutMs: 5000,
        });
      }

      jest.advanceTimersByTime(100);

      // In battery_saver mode, should limit concurrent requests
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should allow more concurrent requests in high performance mode', async () => {
      mockBatteryService.getPerformanceProfile.mockReturnValue('high');

      await service.initialize();

      // Add multiple requests
      for (let i = 0; i < 3; i++) {
        service.addRequest({
          endpoint: `/api/high-perf-${i}`,
          method: 'GET',
          priority: 'high',
          maxRetries: 1,
          timeoutMs: 5000,
        });
      }

      jest.advanceTimersByTime(100);

      // Should allow more concurrent requests
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('batch configuration', () => {
    it('should allow updating batch configuration', async () => {
      await service.initialize();

      service.updateBatchConfig('/api/custom', {
        maxBatchSize: 20,
        maxWaitTimeMs: 3000,
      });

      // Add requests to test custom config
      for (let i = 0; i < 15; i++) {
        service.addRequest({
          endpoint: '/api/custom',
          method: 'GET',
          priority: 'medium',
          maxRetries: 1,
          timeoutMs: 5000,
        });
      }

      // Should not batch yet (under the new limit)
      jest.advanceTimersByTime(1000);
      expect(mockFetch).not.toHaveBeenCalled();

      // Add more to reach batch size
      for (let i = 15; i < 20; i++) {
        service.addRequest({
          endpoint: '/api/custom',
          method: 'GET',
          priority: 'medium',
          maxRetries: 1,
          timeoutMs: 5000,
        });
      }

      // Should trigger batch at custom size
      jest.advanceTimersByTime(100);
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('metrics tracking', () => {
    it('should track network metrics correctly', async () => {
      await service.initialize();

      // Add and process several requests
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(service.addRequest({
          endpoint: '/api/metrics',
          method: 'GET',
          priority: 'medium',
          maxRetries: 1,
          timeoutMs: 5000,
        }));
      }

      jest.advanceTimersByTime(6000);
      await Promise.all(promises);

      const metrics = service.getMetrics();
      expect(metrics.totalRequests).toBe(3);
      expect(metrics.batchedRequests).toBe(3);
      expect(metrics.savedRadioWakeups).toBe(2); // 3 requests - 1 batch = 2 saved wakeups
    });
  });

  describe('queue management', () => {
    it('should provide queue status information', async () => {
      await service.initialize();

      service.addRequest({
        endpoint: '/api/status1',
        method: 'GET',
        priority: 'high',
        maxRetries: 1,
        timeoutMs: 5000,
      });

      service.addRequest({
        endpoint: '/api/status2',
        method: 'POST',
        priority: 'low',
        maxRetries: 1,
        timeoutMs: 5000,
      });

      const queueStatus = service.getQueueStatus();
      expect(queueStatus['/api/status1']).toBe(1);
      expect(queueStatus['/api/status2']).toBe(1);
    });

    it('should allow clearing specific queues', async () => {
      await service.initialize();

      service.addRequest({
        endpoint: '/api/clear1',
        method: 'GET',
        priority: 'medium',
        maxRetries: 1,
        timeoutMs: 5000,
      });

      service.addRequest({
        endpoint: '/api/clear2',
        method: 'GET',
        priority: 'medium',
        maxRetries: 1,
        timeoutMs: 5000,
      });

      service.clearQueue('/api/clear1');

      const queueStatus = service.getQueueStatus();
      expect(queueStatus['/api/clear1']).toBeUndefined();
      expect(queueStatus['/api/clear2']).toBe(1);
    });

    it('should allow clearing all queues', async () => {
      await service.initialize();

      service.addRequest({
        endpoint: '/api/clearall1',
        method: 'GET',
        priority: 'medium',
        maxRetries: 1,
        timeoutMs: 5000,
      });

      service.addRequest({
        endpoint: '/api/clearall2',
        method: 'GET',
        priority: 'medium',
        maxRetries: 1,
        timeoutMs: 5000,
      });

      service.clearQueue();

      const queueStatus = service.getQueueStatus();
      expect(Object.keys(queueStatus)).toHaveLength(0);
    });
  });
});

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn((callback) => {
    const state = require('@react-native-community/netinfo').__getNetworkState();
    callback(state);
    return jest.fn(); // unsubscribe function
  }),
  __setNetworkState: jest.fn(),
  __getNetworkState: jest.fn(() => ({
    isConnected: true,
    type: 'wifi',
  })),
}));