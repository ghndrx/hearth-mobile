/**
 * Tests for Background Processing Service (PN-006)
 */

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    currentState: 'active',
  },
  Platform: { OS: 'ios', Version: '17.0' },
}));

jest.mock('expo-device', () => ({
  isDevice: true,
  brand: 'Apple',
  modelName: 'iPhone 14',
  totalMemory: 4 * 1024 * 1024 * 1024,
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true, type: 'wifi' }),
  addEventListener: jest.fn(() => jest.fn()),
  NetInfoStateType: { wifi: 'wifi', cellular: 'cellular' },
}));

import {
  backgroundProcessingService,
  type ProcessingTask,
  type TaskResult,
} from '../../src/services/backgroundProcessing/BackgroundProcessingService';

describe('BackgroundProcessingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    backgroundProcessingService.shutdown();
  });

  afterEach(() => {
    backgroundProcessingService.shutdown();
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with default config', async () => {
      await backgroundProcessingService.initialize();
      const stats = backgroundProcessingService.getStats();
      expect(stats.config.maxConcurrentTasks).toBe(3);
      expect(stats.config.batchSize).toBe(5);
      expect(stats.config.maxRetries).toBe(5);
    });

    it('should initialize with custom config', async () => {
      await backgroundProcessingService.initialize({
        maxConcurrentTasks: 5,
        batchSize: 10,
      });
      const stats = backgroundProcessingService.getStats();
      expect(stats.config.maxConcurrentTasks).toBe(5);
      expect(stats.config.batchSize).toBe(10);
    });

    it('should not initialize twice', async () => {
      await backgroundProcessingService.initialize();
      const configBefore = backgroundProcessingService.getStats().config.maxConcurrentTasks;
      await backgroundProcessingService.initialize({ maxConcurrentTasks: 10 });
      const configAfter = backgroundProcessingService.getStats().config.maxConcurrentTasks;
      // Second init should be a no-op, config unchanged
      expect(configAfter).toBe(configBefore);
    });
  });

  describe('task management', () => {
    beforeEach(async () => {
      await backgroundProcessingService.initialize();
    });

    it('should add a task to the queue', () => {
      backgroundProcessingService.addTask({
        id: 'test-task-1',
        priority: 'high',
        type: 'notification_delivery',
        action: jest.fn().mockResolvedValue(undefined),
      });
      expect(backgroundProcessingService.hasTask('test-task-1')).toBe(true);
      expect(backgroundProcessingService.getStats().queuedTasks).toBe(1);
    });

    it('should throw error for invalid task', () => {
      expect(() => {
        backgroundProcessingService.addTask({
          id: '',
          priority: 'high',
          type: 'other',
          action: jest.fn(),
        });
      }).toThrow('Task must have id and action');
    });

    it('should remove a task from the queue', () => {
      backgroundProcessingService.addTask({
        id: 'task-to-remove',
        priority: 'low',
        type: 'cache_cleanup',
        action: jest.fn().mockResolvedValue(undefined),
      });
      const removed = backgroundProcessingService.removeTask('task-to-remove');
      expect(removed).toBe(true);
      expect(backgroundProcessingService.hasTask('task-to-remove')).toBe(false);
    });

    it('should return false when removing non-existent task', () => {
      expect(backgroundProcessingService.removeTask('non-existent')).toBe(false);
    });

    it('should list queued task IDs', () => {
      backgroundProcessingService.addTask({
        id: 'task-a',
        priority: 'high',
        type: 'notification_delivery',
        action: jest.fn().mockResolvedValue(undefined),
      });
      backgroundProcessingService.addTask({
        id: 'task-b',
        priority: 'low',
        type: 'analytics',
        action: jest.fn().mockResolvedValue(undefined),
      });
      const ids = backgroundProcessingService.getQueuedTaskIds();
      expect(ids).toContain('task-a');
      expect(ids).toContain('task-b');
    });
  });

  describe('task execution', () => {
    beforeEach(async () => {
      await backgroundProcessingService.initialize();
    });

    it('should execute tasks when flushing queue', async () => {
      const action = jest.fn().mockResolvedValue(undefined);
      backgroundProcessingService.addTask({
        id: 'flush-task',
        priority: 'high',
        type: 'notification_delivery',
        action,
      });
      await backgroundProcessingService.flushQueue();
      expect(action).toHaveBeenCalled();
      expect(backgroundProcessingService.hasTask('flush-task')).toBe(false);
    });

    it('should track successful task results', async () => {
      const results: TaskResult[] = [];
      backgroundProcessingService.onTaskResult((result) => results.push(result));

      backgroundProcessingService.addTask({
        id: 'result-task',
        priority: 'high',
        type: 'notification_delivery',
        action: jest.fn().mockResolvedValue(undefined),
      });
      await backgroundProcessingService.flushQueue();

      expect(results).toHaveLength(1);
      expect(results[0].taskId).toBe('result-task');
      expect(results[0].success).toBe(true);
    });

    it('should track failed task results after max retries', async () => {
      const failedBefore = backgroundProcessingService.getStats().totalFailed;

      backgroundProcessingService.addTask({
        id: 'fail-task',
        priority: 'high',
        type: 'notification_delivery',
        action: jest.fn().mockRejectedValue(new Error('Test failure')),
        maxRetries: 0,
      });
      await backgroundProcessingService.flushQueue();

      // Task should be removed from queue after failure
      expect(backgroundProcessingService.hasTask('fail-task')).toBe(false);
      expect(backgroundProcessingService.getStats().totalFailed).toBeGreaterThan(failedBefore);
    });

    it('should update stats on success', async () => {
      const statsBefore = backgroundProcessingService.getStats();
      const processedBefore = statsBefore.totalProcessed;

      backgroundProcessingService.addTask({
        id: 'stats-task',
        priority: 'high',
        type: 'notification_delivery',
        action: jest.fn().mockResolvedValue(undefined),
      });
      await backgroundProcessingService.flushQueue();

      const statsAfter = backgroundProcessingService.getStats();
      expect(statsAfter.totalProcessed).toBeGreaterThan(processedBefore);
    });

    it('should increment totalFailed on task failure', async () => {
      const failedBefore = backgroundProcessingService.getStats().totalFailed;
      const action = jest.fn().mockRejectedValue(new Error('fail'));

      backgroundProcessingService.addTask({
        id: 'fail-stats-task-2',
        priority: 'high',
        type: 'notification_delivery',
        action,
        maxRetries: 0,
      });
      await backgroundProcessingService.flushQueue();

      // Verify the action was actually called (i.e. task was executed)
      expect(action).toHaveBeenCalled();
      expect(backgroundProcessingService.getStats().totalFailed).toBeGreaterThan(failedBefore);
    });
  });

  describe('resource metrics', () => {
    beforeEach(async () => {
      await backgroundProcessingService.initialize();
    });

    it('should return resource metrics', () => {
      const metrics = backgroundProcessingService.getMetrics();
      expect(metrics).toHaveProperty('cpuUsage');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('batteryLevel');
      expect(metrics).toHaveProperty('thermalState');
      expect(metrics).toHaveProperty('networkType');
      expect(metrics).toHaveProperty('isCharging');
      expect(metrics).toHaveProperty('isLowPowerMode');
    });

    it('should support subscribe/unsubscribe', () => {
      const callback = jest.fn();
      const unsubscribe = backgroundProcessingService.subscribe(callback);
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });

  describe('config management', () => {
    beforeEach(async () => {
      await backgroundProcessingService.initialize();
    });

    it('should update config', () => {
      backgroundProcessingService.updateConfig({ maxConcurrentTasks: 5 });
      expect(backgroundProcessingService.getStats().config.maxConcurrentTasks).toBe(5);
    });

    it('should persist config to AsyncStorage', () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      backgroundProcessingService.updateConfig({ maxConcurrentTasks: 7 });
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@hearth/background_processing_config',
        expect.any(String),
      );
    });
  });

  describe('shouldProcessTasks', () => {
    beforeEach(async () => {
      await backgroundProcessingService.initialize();
    });

    it('should not process when queue is empty', () => {
      expect(backgroundProcessingService.shouldProcessTasks()).toBe(false);
    });

    it('should process when tasks are in queue', () => {
      backgroundProcessingService.addTask({
        id: 'pending-task',
        priority: 'medium',
        type: 'message_sync',
        action: jest.fn().mockResolvedValue(undefined),
      });
      expect(backgroundProcessingService.shouldProcessTasks()).toBe(true);
    });
  });

  describe('shutdown', () => {
    it('should clear all state on shutdown', async () => {
      await backgroundProcessingService.initialize();
      backgroundProcessingService.addTask({
        id: 'shutdown-task',
        priority: 'low',
        type: 'analytics',
        action: jest.fn().mockResolvedValue(undefined),
      });
      backgroundProcessingService.shutdown();
      expect(backgroundProcessingService.getStats().queuedTasks).toBe(0);
    });

    it('should be safe to call shutdown without initialization', () => {
      expect(() => backgroundProcessingService.shutdown()).not.toThrow();
    });
  });
});
