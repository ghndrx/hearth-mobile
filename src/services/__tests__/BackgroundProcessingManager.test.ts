import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import BackgroundProcessingManager from '../background/BackgroundProcessingManager';
import BatteryOptimizationService from '../battery/BatteryOptimizationService';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  AppState: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
}));
jest.mock('@react-native-community/netinfo');
jest.mock('../battery/BatteryOptimizationService');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockBatteryService = BatteryOptimizationService as jest.Mocked<typeof BatteryOptimizationService>;

describe('BackgroundProcessingManager', () => {
  let manager: typeof BackgroundProcessingManager;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();

    // Mock battery service
    mockBatteryService.shouldThrottleBackgroundSync.mockReturnValue(false);
    mockBatteryService.getPerformanceProfile.mockReturnValue('balanced');

    manager = BackgroundProcessingManager;
  });

  afterEach(() => {
    jest.useRealTimers();
    manager.dispose();
  });

  describe('initialization', () => {
    it('should initialize with default sync strategies', async () => {
      await manager.initialize();

      const status = manager.getQueueStatus();
      expect(status.total).toBe(0);
      expect(status.active).toBe(0);
    });

    it('should load persisted tasks from storage', async () => {
      const savedTasks = [{
        id: 'task1',
        type: 'message_sync',
        priority: 'high',
        payload: { channelId: '123' },
        createdAt: Date.now(),
        maxRetries: 3,
        retryCount: 0,
      }];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(savedTasks));

      await manager.initialize();

      const status = manager.getQueueStatus();
      expect(status.total).toBe(1);
    });
  });

  describe('task management', () => {
    it('should add tasks to queue', async () => {
      await manager.initialize();

      const taskId = manager.addTask({
        type: 'message_sync',
        priority: 'high',
        payload: { channelId: '123' },
        maxRetries: 3,
      });

      expect(taskId).toBeTruthy();
      expect(manager.getTaskStatus(taskId)).toBe('queued');

      const status = manager.getQueueStatus();
      expect(status.total).toBe(1);
      expect(status.byPriority.high).toBe(1);
      expect(status.byType.message_sync).toBe(1);
    });

    it('should remove tasks from queue', async () => {
      await manager.initialize();

      const taskId = manager.addTask({
        type: 'cache_cleanup',
        priority: 'low',
        payload: {},
        maxRetries: 2,
      });

      expect(manager.removeTask(taskId)).toBe(true);
      expect(manager.getTaskStatus(taskId)).toBe('not_found');
    });

    it('should prioritize high priority tasks', async () => {
      await manager.initialize();

      // Add low priority task first
      manager.addTask({
        type: 'analytics',
        priority: 'low',
        payload: {},
        maxRetries: 1,
      });

      // Add high priority task
      const highPriorityTaskId = manager.addTask({
        type: 'voice_optimization',
        priority: 'high',
        payload: {},
        maxRetries: 1,
      });

      // High priority task should be processed first
      expect(manager.getTaskStatus(highPriorityTaskId)).toBe('processing');
    });

    it('should apply battery optimizations to tasks', async () => {
      mockBatteryService.shouldThrottleBackgroundSync.mockReturnValue(true);
      await manager.initialize();

      const taskId = manager.addTask({
        type: 'message_sync',
        priority: 'low',
        payload: {},
        maxRetries: 1,
        batteryOptimized: true,
      });

      // Task should be delayed due to battery optimization
      const status = manager.getTaskStatus(taskId);
      expect(status).toBe('queued'); // Should be queued, not immediately processing
    });
  });

  describe('performance profiles', () => {
    it('should limit concurrent tasks based on performance profile', async () => {
      mockBatteryService.getPerformanceProfile.mockReturnValue('battery_saver');
      await manager.initialize();

      // Add multiple tasks
      for (let i = 0; i < 5; i++) {
        manager.addTask({
          type: 'message_sync',
          priority: 'medium',
          payload: { id: i },
          maxRetries: 1,
        });
      }

      const status = manager.getQueueStatus();
      // In battery_saver mode, should limit concurrent tasks to 1
      expect(status.active).toBeLessThanOrEqual(1);
    });

    it('should allow more concurrent tasks in high performance mode', async () => {
      mockBatteryService.getPerformanceProfile.mockReturnValue('high');
      await manager.initialize();

      // Add multiple tasks
      for (let i = 0; i < 3; i++) {
        manager.addTask({
          type: 'message_sync',
          priority: 'high',
          payload: { id: i },
          maxRetries: 1,
        });
      }

      const status = manager.getQueueStatus();
      // In high performance mode, should allow more concurrent tasks
      expect(status.active).toBeGreaterThan(1);
    });
  });

  describe('task execution', () => {
    it('should execute message sync tasks', async () => {
      await manager.initialize();

      const taskId = manager.addTask({
        type: 'message_sync',
        priority: 'high',
        payload: { channelId: '123', lastMessageId: 'msg456' },
        maxRetries: 1,
      });

      // Fast-forward timers to allow task execution
      jest.advanceTimersByTime(2000);

      // Task should eventually complete
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(manager.getTaskStatus(taskId)).toBe('not_found'); // Completed tasks are removed
    });

    it('should retry failed tasks', async () => {
      await manager.initialize();

      // Mock task execution to fail initially
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const taskId = manager.addTask({
        type: 'message_sync',
        priority: 'high',
        payload: { channelId: '123' },
        maxRetries: 2,
      });

      // Fast-forward to trigger retries
      jest.advanceTimersByTime(10000);

      // Task should still be in queue for retry
      expect(manager.getTaskStatus(taskId)).toBe('queued');

      // Restore fetch
      global.fetch = originalFetch;
    });
  });

  describe('background optimization', () => {
    it('should optimize task queue when app goes to background', async () => {
      await manager.initialize();

      // Add various priority tasks
      manager.addTask({ type: 'analytics', priority: 'low', payload: {}, maxRetries: 1 });
      manager.addTask({ type: 'message_sync', priority: 'high', payload: {}, maxRetries: 1 });
      manager.addTask({ type: 'cache_cleanup', priority: 'low', payload: {}, maxRetries: 1 });

      const initialStatus = manager.getQueueStatus();
      expect(initialStatus.total).toBe(3);

      // Simulate app state change to background
      const appStateCallback = (AppState.addEventListener as jest.Mock).mock.calls[0][1];
      appStateCallback('background');

      // Should filter out non-essential low priority tasks
      const backgroundStatus = manager.getQueueStatus();
      expect(backgroundStatus.total).toBeLessThan(initialStatus.total);
      expect(backgroundStatus.byPriority.high).toBeGreaterThan(0); // High priority tasks should remain
    });
  });

  describe('sync strategies', () => {
    it('should allow updating sync strategies', async () => {
      await manager.initialize();

      manager.updateSyncStrategy('message_sync', {
        maxBatchSize: 20,
        intervalMs: 3000,
      });

      // Add enough tasks to test the new batch size
      for (let i = 0; i < 25; i++) {
        manager.addTask({
          type: 'message_sync',
          priority: 'medium',
          payload: { id: i },
          maxRetries: 1,
        });
      }

      // Should respect the updated strategy
      const status = manager.getQueueStatus();
      expect(status.byType.message_sync).toBe(25);
    });
  });

  describe('persistence', () => {
    it('should persist tasks to storage', async () => {
      await manager.initialize();

      manager.addTask({
        type: 'cache_cleanup',
        priority: 'medium',
        payload: { size: 100 },
        maxRetries: 2,
      });

      // Should save to AsyncStorage
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'background_tasks',
        expect.stringContaining('cache_cleanup')
      );
    });

    it('should clean up old tasks on load', async () => {
      const oldTask = {
        id: 'old-task',
        type: 'message_sync',
        priority: 'low',
        payload: {},
        createdAt: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        maxRetries: 1,
        retryCount: 0,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([oldTask]));

      await manager.initialize();

      const status = manager.getQueueStatus();
      expect(status.total).toBe(0); // Old task should be cleaned up
    });
  });
});