import BackgroundTaskManager, { BackgroundTask, TaskPriority } from '../backgroundTaskManager';
import BatteryMonitoringService from '../batteryMonitoring';
import ResourceMonitorService from '../resourceMonitor';

// Mock dependencies
jest.mock('../batteryMonitoring');
jest.mock('../resourceMonitor');

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    currentState: 'active',
  },
}));

describe('BackgroundTaskManager', () => {
  let taskManager: BackgroundTaskManager;
  let mockBatteryService: jest.Mocked<BatteryMonitoringService>;
  let mockResourceService: jest.Mocked<ResourceMonitorService>;

  const mockBatteryInfo = {
    level: 0.8,
    isCharging: false,
    isLowPowerMode: false,
    temperature: 30,
  };

  const mockResourceMetrics = {
    cpu: { usage: 30, temperature: 30, throttling: false },
    memory: { used: 1000, total: 4000, available: 3000, pressure: 'normal' as const },
    thermal: { state: 'nominal' as const, temperature: 30, throttling: false },
    network: { bytesReceived: 100, bytesSent: 50, packetsReceived: 10, packetsSent: 5, connectionType: 'wifi' as const },
    storage: { used: 20000, total: 64000, available: 44000, pressure: 'normal' as const },
    timestamp: Date.now(),
  };

  beforeEach(() => {
    // Reset singleton
    (BackgroundTaskManager as any).instance = null;

    // Mock services
    mockBatteryService = {
      getCurrentBatteryInfo: jest.fn().mockReturnValue(mockBatteryInfo),
    } as any;

    mockResourceService = {
      getCurrentMetrics: jest.fn().mockReturnValue(mockResourceMetrics),
    } as any;

    (BatteryMonitoringService.getInstance as jest.Mock).mockReturnValue(mockBatteryService);
    (ResourceMonitorService.getInstance as jest.Mock).mockReturnValue(mockResourceService);

    taskManager = BackgroundTaskManager.getInstance();

    jest.useFakeTimers();
  });

  afterEach(() => {
    taskManager.destroy();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create singleton instance', () => {
      const instance1 = BackgroundTaskManager.getInstance();
      const instance2 = BackgroundTaskManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('task scheduling', () => {
    it('should add task to queue correctly', () => {
      const taskId = taskManager.addTask({
        category: 'message_sync',
        priority: 'high',
        estimatedDuration: 1000,
        estimatedCpuUsage: 20,
        estimatedMemoryUsage: 10,
        estimatedBatteryImpact: 3,
        requiresNetwork: true,
        canRunOnMeteredConnection: false,
        maxRetries: 3,
        data: { test: 'data' },
      });

      expect(taskId).toBeDefined();
      expect(typeof taskId).toBe('string');

      const status = taskManager.getTaskStatus(taskId);
      expect(status).toBe('queued');

      const queueStatus = taskManager.getQueueStatus();
      expect(queueStatus.queued).toBe(1);
    });

    it('should sort tasks by priority', () => {
      const lowPriorityId = taskManager.addTask({
        category: 'cache_cleanup',
        priority: 'low',
        estimatedDuration: 1000,
        estimatedCpuUsage: 20,
        estimatedMemoryUsage: 10,
        estimatedBatteryImpact: 2,
        requiresNetwork: false,
        canRunOnMeteredConnection: true,
        maxRetries: 1,
        data: {},
      });

      const highPriorityId = taskManager.addTask({
        category: 'message_sync',
        priority: 'critical',
        estimatedDuration: 500,
        estimatedCpuUsage: 30,
        estimatedMemoryUsage: 5,
        estimatedBatteryImpact: 4,
        requiresNetwork: true,
        canRunOnMeteredConnection: false,
        maxRetries: 3,
        data: {},
      });

      // Access private queue for testing
      const queue = (taskManager as any).taskQueue;
      expect(queue[0].id).toBe(highPriorityId); // Critical should come first
      expect(queue[1].id).toBe(lowPriorityId); // Low should come after
    });

    it('should cancel queued tasks', () => {
      const taskId = taskManager.addTask({
        category: 'analytics_upload',
        priority: 'low',
        estimatedDuration: 1000,
        estimatedCpuUsage: 10,
        estimatedMemoryUsage: 5,
        estimatedBatteryImpact: 1,
        requiresNetwork: true,
        canRunOnMeteredConnection: true,
        maxRetries: 2,
        data: {},
      });

      expect(taskManager.cancelTask(taskId)).toBe(true);
      expect(taskManager.getTaskStatus(taskId)).toBe('not_found');
    });
  });

  describe('task processing conditions', () => {
    it('should process tasks under normal conditions', () => {
      const shouldProcess = (taskManager as any).shouldProcessTasks({
        battery: mockBatteryInfo,
        resources: mockResourceMetrics,
        networkType: 'wifi',
        isMeteredConnection: false,
        thermalState: 'nominal',
        appState: 'active',
      });

      expect(shouldProcess).toBe(true);
    });

    it('should not process tasks during critical thermal state', () => {
      const shouldProcess = (taskManager as any).shouldProcessTasks({
        battery: mockBatteryInfo,
        resources: { ...mockResourceMetrics, thermal: { state: 'critical' } },
        networkType: 'wifi',
        isMeteredConnection: false,
        thermalState: 'critical',
        appState: 'active',
      });

      expect(shouldProcess).toBe(false);
    });

    it('should limit tasks during critical battery', () => {
      taskManager.addTask({
        category: 'message_sync',
        priority: 'critical',
        estimatedDuration: 1000,
        estimatedCpuUsage: 20,
        estimatedMemoryUsage: 10,
        estimatedBatteryImpact: 3,
        requiresNetwork: true,
        canRunOnMeteredConnection: false,
        maxRetries: 3,
        data: {},
      });

      taskManager.addTask({
        category: 'cache_cleanup',
        priority: 'low',
        estimatedDuration: 2000,
        estimatedCpuUsage: 15,
        estimatedMemoryUsage: 5,
        estimatedBatteryImpact: 2,
        requiresNetwork: false,
        canRunOnMeteredConnection: true,
        maxRetries: 1,
        data: {},
      });

      const shouldProcess = (taskManager as any).shouldProcessTasks({
        battery: { ...mockBatteryInfo, level: 0.05 }, // Critical battery
        resources: mockResourceMetrics,
        networkType: 'wifi',
        isMeteredConnection: false,
        thermalState: 'nominal',
        appState: 'active',
      });

      expect(shouldProcess).toBe(true);

      // Check that only critical tasks remain
      const queue = (taskManager as any).taskQueue;
      expect(queue.length).toBe(1);
      expect(queue[0].priority).toBe('critical');
    });

    it('should filter tasks during low battery', () => {
      taskManager.addTask({
        category: 'message_sync',
        priority: 'high',
        estimatedDuration: 1000,
        estimatedCpuUsage: 20,
        estimatedMemoryUsage: 10,
        estimatedBatteryImpact: 3,
        requiresNetwork: true,
        canRunOnMeteredConnection: false,
        maxRetries: 3,
        data: {},
      });

      taskManager.addTask({
        category: 'cache_cleanup',
        priority: 'low',
        estimatedDuration: 2000,
        estimatedCpuUsage: 15,
        estimatedMemoryUsage: 5,
        estimatedBatteryImpact: 2,
        requiresNetwork: false,
        canRunOnMeteredConnection: true,
        maxRetries: 1,
        data: {},
      });

      (taskManager as any).shouldProcessTasks({
        battery: { ...mockBatteryInfo, level: 0.15 }, // Low battery
        resources: mockResourceMetrics,
        networkType: 'wifi',
        isMeteredConnection: false,
        thermalState: 'nominal',
        appState: 'active',
      });

      // Check that only critical and high priority tasks remain
      const queue = (taskManager as any).taskQueue;
      expect(queue.length).toBe(1);
      expect(queue[0].priority).toBe('high');
    });
  });

  describe('task filtering', () => {
    beforeEach(() => {
      // Add a task with dependencies for testing
      const dependencyId = taskManager.addTask({
        category: 'message_sync',
        priority: 'high',
        estimatedDuration: 500,
        estimatedCpuUsage: 10,
        estimatedMemoryUsage: 5,
        estimatedBatteryImpact: 2,
        requiresNetwork: true,
        canRunOnMeteredConnection: false,
        maxRetries: 3,
        data: { id: 'dependency' },
      });

      taskManager.addTask({
        category: 'attachment_upload',
        priority: 'medium',
        estimatedDuration: 2000,
        estimatedCpuUsage: 30,
        estimatedMemoryUsage: 20,
        estimatedBatteryImpact: 5,
        requiresNetwork: true,
        canRunOnMeteredConnection: false,
        maxRetries: 2,
        dependencies: [dependencyId],
        data: { id: 'dependent' },
      });
    });

    it('should filter tasks based on network requirements', () => {
      const context = {
        battery: mockBatteryInfo,
        resources: mockResourceMetrics,
        networkType: 'none' as const,
        isMeteredConnection: false,
        thermalState: 'nominal' as const,
        appState: 'active' as const,
      };

      const nextTask = (taskManager as any).getNextTask(context);
      expect(nextTask).toBeNull(); // Should not return network-requiring tasks
    });

    it('should filter tasks based on metered connection', () => {
      // Add a task that can run on metered connection
      taskManager.addTask({
        category: 'analytics_upload',
        priority: 'low',
        estimatedDuration: 1000,
        estimatedCpuUsage: 10,
        estimatedMemoryUsage: 5,
        estimatedBatteryImpact: 1,
        requiresNetwork: true,
        canRunOnMeteredConnection: true,
        maxRetries: 2,
        data: {},
      });

      const context = {
        battery: mockBatteryInfo,
        resources: mockResourceMetrics,
        networkType: 'cellular' as const,
        isMeteredConnection: true,
        thermalState: 'nominal' as const,
        appState: 'active' as const,
      };

      const nextTask = (taskManager as any).getNextTask(context);
      expect(nextTask).not.toBeNull();
      expect(nextTask.canRunOnMeteredConnection).toBe(true);
    });

    it('should filter tasks based on resource requirements', () => {
      // Add a high-resource task
      taskManager.addTask({
        category: 'voice_processing',
        priority: 'medium',
        estimatedDuration: 3000,
        estimatedCpuUsage: 90, // Very high CPU
        estimatedMemoryUsage: 100,
        estimatedBatteryImpact: 7,
        requiresNetwork: false,
        canRunOnMeteredConnection: true,
        maxRetries: 1,
        data: {},
      });

      const context = {
        battery: mockBatteryInfo,
        resources: { ...mockResourceMetrics, cpu: { usage: 85 } }, // High current CPU usage
        networkType: 'wifi' as const,
        isMeteredConnection: false,
        thermalState: 'nominal' as const,
        appState: 'active' as const,
      };

      const nextTask = (taskManager as any).getNextTask(context);
      expect(nextTask?.estimatedCpuUsage || 0).toBeLessThan(90);
    });
  });

  describe('task execution', () => {
    it('should execute message sync task', async () => {
      const mockTask: BackgroundTask = {
        id: 'test-id',
        category: 'message_sync',
        priority: 'medium',
        estimatedDuration: 1000,
        estimatedCpuUsage: 20,
        estimatedMemoryUsage: 10,
        estimatedBatteryImpact: 3,
        requiresNetwork: true,
        canRunOnMeteredConnection: false,
        retryCount: 0,
        maxRetries: 3,
        createdAt: Date.now(),
        data: {},
      };

      const context = {
        battery: mockBatteryInfo,
        resources: mockResourceMetrics,
        networkType: 'wifi' as const,
        isMeteredConnection: false,
        thermalState: 'nominal' as const,
        appState: 'active' as const,
      };

      const result = await (taskManager as any).runTaskByCategory(mockTask, context);
      expect(result).toBeDefined();
      expect(result.messagesSynced).toBeGreaterThan(0);
    });

    it('should execute attachment upload task with progress', async () => {
      const mockTask: BackgroundTask = {
        id: 'upload-test',
        category: 'attachment_upload',
        priority: 'high',
        estimatedDuration: 2000,
        estimatedCpuUsage: 30,
        estimatedMemoryUsage: 20,
        estimatedBatteryImpact: 5,
        requiresNetwork: true,
        canRunOnMeteredConnection: false,
        retryCount: 0,
        maxRetries: 3,
        createdAt: Date.now(),
        data: { fileSize: 1024000 },
        onProgress: jest.fn(),
      };

      const context = {
        battery: mockBatteryInfo,
        resources: mockResourceMetrics,
        networkType: 'wifi' as const,
        isMeteredConnection: false,
        thermalState: 'nominal' as const,
        appState: 'active' as const,
      };

      const resultPromise = (taskManager as any).runTaskByCategory(mockTask, context);

      // Fast forward to trigger progress
      jest.advanceTimersByTime(500);

      const result = await resultPromise;
      expect(mockTask.onProgress).toHaveBeenCalled();
      expect(result.uploadedBytes).toBe(1024000);
    });
  });

  describe('task failure handling', () => {
    it('should retry failed tasks', async () => {
      const mockTask: BackgroundTask = {
        id: 'retry-test',
        category: 'message_sync',
        priority: 'medium',
        estimatedDuration: 1000,
        estimatedCpuUsage: 20,
        estimatedMemoryUsage: 10,
        estimatedBatteryImpact: 3,
        requiresNetwork: true,
        canRunOnMeteredConnection: false,
        retryCount: 0,
        maxRetries: 2,
        createdAt: Date.now(),
        data: {},
        onError: jest.fn(),
      };

      const error = new Error('Test error');
      (taskManager as any).handleTaskFailure(mockTask, error);

      expect(mockTask.retryCount).toBe(1);
      expect(mockTask.onError).toHaveBeenCalledWith(error);

      // Task should be re-queued
      expect(taskManager.getTaskStatus(mockTask.id)).toBe('queued');
    });

    it('should not retry tasks beyond max retries', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const mockTask: BackgroundTask = {
        id: 'no-retry-test',
        category: 'message_sync',
        priority: 'medium',
        estimatedDuration: 1000,
        estimatedCpuUsage: 20,
        estimatedMemoryUsage: 10,
        estimatedBatteryImpact: 3,
        requiresNetwork: true,
        canRunOnMeteredConnection: false,
        retryCount: 2,
        maxRetries: 2,
        createdAt: Date.now(),
        data: {},
      };

      const error = new Error('Final error');
      (taskManager as any).handleTaskFailure(mockTask, error);

      expect(mockTask.retryCount).toBe(3);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        `Task ${mockTask.id} failed permanently after 2 retries:`,
        error
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('queue management', () => {
    it('should provide accurate queue status', () => {
      taskManager.addTask({
        category: 'message_sync',
        priority: 'critical',
        estimatedDuration: 1000,
        estimatedCpuUsage: 20,
        estimatedMemoryUsage: 10,
        estimatedBatteryImpact: 3,
        requiresNetwork: true,
        canRunOnMeteredConnection: false,
        maxRetries: 3,
        data: {},
      });

      taskManager.addTask({
        category: 'cache_cleanup',
        priority: 'low',
        estimatedDuration: 2000,
        estimatedCpuUsage: 15,
        estimatedMemoryUsage: 5,
        estimatedBatteryImpact: 2,
        requiresNetwork: false,
        canRunOnMeteredConnection: true,
        maxRetries: 1,
        data: {},
      });

      const status = taskManager.getQueueStatus();
      expect(status.queued).toBe(2);
      expect(status.running).toBe(0);
      expect(status.queuedByPriority.critical).toBe(1);
      expect(status.queuedByPriority.low).toBe(1);
    });

    it('should provide queue metrics', () => {
      const metrics = taskManager.getQueueMetrics();
      expect(metrics).toHaveProperty('tasksQueued');
      expect(metrics).toHaveProperty('tasksRunning');
      expect(metrics).toHaveProperty('tasksCompleted');
      expect(metrics).toHaveProperty('tasksFailed');
    });
  });

  describe('processing control', () => {
    it('should pause and resume processing', () => {
      taskManager.pauseProcessing();
      expect((taskManager as any).isProcessing).toBe(false);

      taskManager.resumeProcessing();
      expect((taskManager as any).isProcessing).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should clean up resources on destroy', () => {
      taskManager.destroy();
      expect((taskManager as any).isProcessing).toBe(false);
      expect((taskManager as any).taskQueue.length).toBe(0);
      expect((taskManager as any).runningTasks.size).toBe(0);
    });
  });
});