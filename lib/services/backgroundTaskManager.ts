import { AppState, Platform } from 'react-native';
import BatteryMonitoringService, { BatteryInfo } from './batteryMonitoring';
import ResourceMonitorService, { ResourceMetrics } from './resourceMonitor';

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export type TaskCategory =
  | 'message_sync'
  | 'notification_processing'
  | 'attachment_upload'
  | 'cache_cleanup'
  | 'analytics_upload'
  | 'background_fetch'
  | 'voice_processing'
  | 'image_optimization'
  | 'database_maintenance';

export interface BackgroundTask {
  id: string;
  category: TaskCategory;
  priority: TaskPriority;
  estimatedDuration: number; // milliseconds
  estimatedCpuUsage: number; // 0-100 percentage
  estimatedMemoryUsage: number; // MB
  estimatedBatteryImpact: number; // 0-10 scale
  requiresNetwork: boolean;
  canRunOnMeteredConnection: boolean;
  retryCount: number;
  maxRetries: number;
  createdAt: number;
  scheduledAt?: number;
  startedAt?: number;
  completedAt?: number;
  lastRetryAt?: number;
  deadline?: number; // optional deadline timestamp
  dependencies?: string[]; // task IDs that must complete first
  data: any; // task-specific data
  onProgress?: (progress: number) => void;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
}

export interface TaskExecutionContext {
  battery: BatteryInfo;
  resources: ResourceMetrics;
  networkType: 'wifi' | 'cellular' | 'none';
  isMeteredConnection: boolean;
  thermalState: 'nominal' | 'fair' | 'serious' | 'critical';
  appState: 'active' | 'background' | 'inactive';
}

export interface SchedulingStrategy {
  maxConcurrentTasks: number;
  batteryThresholds: {
    critical: number; // 0.1
    low: number; // 0.2
    normal: number; // 0.5
  };
  thermalThresholds: {
    suspend: 'critical';
    limit: 'serious';
    normal: 'fair';
  };
  resourceThresholds: {
    cpuUsage: number; // 80%
    memoryUsage: number; // 85%
  };
  priorityWeights: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface TaskSchedulerMetrics {
  tasksQueued: number;
  tasksRunning: number;
  tasksCompleted: number;
  tasksFailed: number;
  averageWaitTime: number;
  averageExecutionTime: number;
  batteryOptimizationCount: number;
  thermalThrottlingCount: number;
}

class BackgroundTaskManager {
  private static instance: BackgroundTaskManager;
  private taskQueue: BackgroundTask[] = [];
  private runningTasks: Map<string, BackgroundTask> = new Map();
  private completedTasks: BackgroundTask[] = [];
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private batteryService: BatteryMonitoringService;
  private resourceService: ResourceMonitorService;
  private metrics: TaskSchedulerMetrics;

  private readonly strategy: SchedulingStrategy = {
    maxConcurrentTasks: 3,
    batteryThresholds: {
      critical: 0.1,
      low: 0.2,
      normal: 0.5,
    },
    thermalThresholds: {
      suspend: 'critical',
      limit: 'serious',
      normal: 'fair',
    },
    resourceThresholds: {
      cpuUsage: 80,
      memoryUsage: 85,
    },
    priorityWeights: {
      critical: 100,
      high: 75,
      medium: 50,
      low: 25,
    },
  };

  private constructor() {
    this.batteryService = BatteryMonitoringService.getInstance();
    this.resourceService = ResourceMonitorService.getInstance();
    this.metrics = {
      tasksQueued: 0,
      tasksRunning: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      averageWaitTime: 0,
      averageExecutionTime: 0,
      batteryOptimizationCount: 0,
      thermalThrottlingCount: 0,
    };

    this.initializeScheduler();
  }

  static getInstance(): BackgroundTaskManager {
    if (!BackgroundTaskManager.instance) {
      BackgroundTaskManager.instance = new BackgroundTaskManager();
    }
    return BackgroundTaskManager.instance;
  }

  private initializeScheduler(): void {
    // Listen for app state changes
    AppState.addEventListener('change', this.handleAppStateChange.bind(this));

    // Start processing queue
    this.startProcessing();
  }

  private handleAppStateChange(nextAppState: string): void {
    if (nextAppState === 'background') {
      // Reduce concurrent tasks when app goes to background
      this.strategy.maxConcurrentTasks = Math.min(2, this.strategy.maxConcurrentTasks);

      // Prioritize critical and high priority tasks only
      this.reorderQueueForBackground();
    } else if (nextAppState === 'active') {
      // Restore normal concurrent task limit
      this.strategy.maxConcurrentTasks = 3;

      // Resume normal task processing
      this.optimizeQueueForForeground();
    }
  }

  private reorderQueueForBackground(): void {
    // Move only critical and high priority tasks to front
    this.taskQueue.sort((a, b) => {
      const aPriorityValue = this.strategy.priorityWeights[a.priority];
      const bPriorityValue = this.strategy.priorityWeights[b.priority];

      // Only process critical and high priority in background
      if (a.priority === 'critical' || a.priority === 'high') {
        if (b.priority === 'critical' || b.priority === 'high') {
          return bPriorityValue - aPriorityValue;
        }
        return -1;
      }

      if (b.priority === 'critical' || b.priority === 'high') {
        return 1;
      }

      return 0; // Keep medium and low priority tasks at current position
    });
  }

  private optimizeQueueForForeground(): void {
    // Resort queue using full priority and deadline logic
    this.sortTaskQueue();
  }

  private startProcessing(): void {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    // Process queue every 5 seconds
    this.processingInterval = setInterval(() => {
      this.processTaskQueue();
    }, 5000);

    // Initial processing
    this.processTaskQueue();
  }

  private stopProcessing(): void {
    this.isProcessing = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  private async processTaskQueue(): Promise<void> {
    if (!this.isProcessing) {
      return;
    }

    try {
      const context = await this.getExecutionContext();

      // Check if we should process tasks based on device state
      if (!this.shouldProcessTasks(context)) {
        return;
      }

      // Process tasks up to concurrent limit
      while (
        this.runningTasks.size < this.strategy.maxConcurrentTasks &&
        this.taskQueue.length > 0
      ) {
        const nextTask = this.getNextTask(context);
        if (nextTask) {
          await this.executeTask(nextTask, context);
        } else {
          break; // No suitable tasks found
        }
      }
    } catch (error) {
      console.warn('Error processing task queue:', error);
    }
  }

  private async getExecutionContext(): Promise<TaskExecutionContext> {
    const battery = this.batteryService.getCurrentBatteryInfo();
    const resources = this.resourceService.getCurrentMetrics();

    return {
      battery,
      resources: resources || this.getDefaultResourceMetrics(),
      networkType: 'wifi', // Would get from network service
      isMeteredConnection: false, // Would get from network service
      thermalState: resources?.thermal.state || 'nominal',
      appState: AppState.currentState as any,
    };
  }

  private getDefaultResourceMetrics(): ResourceMetrics {
    return {
      cpu: { usage: 30, temperature: 35, throttling: false },
      memory: { used: 150, total: 4000, available: 3850, pressure: 'normal' },
      thermal: { state: 'nominal', temperature: 35, throttling: false },
      network: { bytesReceived: 0, bytesSent: 0, packetsReceived: 0, packetsSent: 0, connectionType: 'wifi' },
      storage: { used: 15000, total: 64000, available: 49000, pressure: 'normal' },
      timestamp: Date.now(),
    };
  }

  private shouldProcessTasks(context: TaskExecutionContext): boolean {
    // Don't process if device is overheating
    if (context.thermalState === this.strategy.thermalThresholds.suspend) {
      this.metrics.thermalThrottlingCount++;
      return false;
    }

    // Limited processing on critical battery
    if (context.battery.level <= this.strategy.batteryThresholds.critical) {
      // Only allow critical priority tasks
      this.taskQueue = this.taskQueue.filter(task => task.priority === 'critical');
      this.metrics.batteryOptimizationCount++;
      return this.taskQueue.length > 0;
    }

    // Limited processing on low battery
    if (context.battery.level <= this.strategy.batteryThresholds.low) {
      // Only allow critical and high priority tasks
      this.taskQueue = this.taskQueue.filter(task =>
        task.priority === 'critical' || task.priority === 'high'
      );
      this.metrics.batteryOptimizationCount++;
    }

    return true;
  }

  private getNextTask(context: TaskExecutionContext): BackgroundTask | null {
    if (this.taskQueue.length === 0) {
      return null;
    }

    // Filter tasks based on current conditions
    const eligibleTasks = this.taskQueue.filter(task => {
      // Check dependencies
      if (task.dependencies && task.dependencies.length > 0) {
        const hasUnfinishedDependencies = task.dependencies.some(depId =>
          !this.completedTasks.find(t => t.id === depId)
        );
        if (hasUnfinishedDependencies) {
          return false;
        }
      }

      // Check resource requirements
      if (task.estimatedCpuUsage > this.strategy.resourceThresholds.cpuUsage - context.resources.cpu.usage) {
        return false;
      }

      if (task.estimatedMemoryUsage > context.resources.memory.available) {
        return false;
      }

      // Check network requirements
      if (task.requiresNetwork && context.networkType === 'none') {
        return false;
      }

      if (!task.canRunOnMeteredConnection && context.isMeteredConnection) {
        return false;
      }

      // Check thermal state
      if (context.thermalState === this.strategy.thermalThresholds.limit &&
          task.estimatedCpuUsage > 50) {
        return false;
      }

      return true;
    });

    if (eligibleTasks.length === 0) {
      return null;
    }

    // Sort eligible tasks by priority and deadline
    eligibleTasks.sort(this.compareTaskPriority.bind(this));

    // Remove from queue and return
    const nextTask = eligibleTasks[0];
    const queueIndex = this.taskQueue.indexOf(nextTask);
    this.taskQueue.splice(queueIndex, 1);

    return nextTask;
  }

  private compareTaskPriority(a: BackgroundTask, b: BackgroundTask): number {
    const now = Date.now();

    // Deadline urgency (tasks near deadline get priority)
    const aDeadlineUrgency = a.deadline ? Math.max(0, (a.deadline - now) / (60 * 60 * 1000)) : Infinity;
    const bDeadlineUrgency = b.deadline ? Math.max(0, (b.deadline - now) / (60 * 60 * 1000)) : Infinity;

    if (aDeadlineUrgency < 1 && bDeadlineUrgency >= 1) return -1; // a is urgent
    if (bDeadlineUrgency < 1 && aDeadlineUrgency >= 1) return 1;  // b is urgent

    // Priority weight
    const aPriorityWeight = this.strategy.priorityWeights[a.priority];
    const bPriorityWeight = this.strategy.priorityWeights[b.priority];

    if (aPriorityWeight !== bPriorityWeight) {
      return bPriorityWeight - aPriorityWeight;
    }

    // Wait time (older tasks get priority)
    const aWaitTime = now - a.createdAt;
    const bWaitTime = now - b.createdAt;

    return bWaitTime - aWaitTime;
  }

  private async executeTask(task: BackgroundTask, context: TaskExecutionContext): Promise<void> {
    task.startedAt = Date.now();
    this.runningTasks.set(task.id, task);
    this.metrics.tasksRunning++;

    try {
      // Execute task based on category
      const result = await this.runTaskByCategory(task, context);

      // Mark as completed
      task.completedAt = Date.now();
      this.runningTasks.delete(task.id);
      this.completedTasks.push(task);
      this.metrics.tasksRunning--;
      this.metrics.tasksCompleted++;

      // Update metrics
      this.updateExecutionMetrics(task);

      // Call completion callback
      if (task.onComplete) {
        task.onComplete(result);
      }
    } catch (error) {
      // Handle task failure
      this.handleTaskFailure(task, error as Error);
    }
  }

  private async runTaskByCategory(task: BackgroundTask, context: TaskExecutionContext): Promise<any> {
    switch (task.category) {
      case 'message_sync':
        return this.executeMessageSync(task, context);

      case 'notification_processing':
        return this.executeNotificationProcessing(task, context);

      case 'attachment_upload':
        return this.executeAttachmentUpload(task, context);

      case 'cache_cleanup':
        return this.executeCacheCleanup(task, context);

      case 'analytics_upload':
        return this.executeAnalyticsUpload(task, context);

      case 'background_fetch':
        return this.executeBackgroundFetch(task, context);

      case 'voice_processing':
        return this.executeVoiceProcessing(task, context);

      case 'image_optimization':
        return this.executeImageOptimization(task, context);

      case 'database_maintenance':
        return this.executeDatabaseMaintenance(task, context);

      default:
        throw new Error(`Unknown task category: ${task.category}`);
    }
  }

  private async executeMessageSync(task: BackgroundTask, context: TaskExecutionContext): Promise<any> {
    // Simulate message sync task
    return new Promise((resolve) => {
      const duration = Math.min(task.estimatedDuration, 5000); // Max 5 seconds
      setTimeout(() => {
        resolve({ messagesSynced: Math.floor(Math.random() * 50) + 10 });
      }, duration);
    });
  }

  private async executeNotificationProcessing(task: BackgroundTask, context: TaskExecutionContext): Promise<any> {
    return new Promise((resolve) => {
      const duration = Math.min(task.estimatedDuration, 2000);
      setTimeout(() => {
        resolve({ notificationsProcessed: Math.floor(Math.random() * 10) + 1 });
      }, duration);
    });
  }

  private async executeAttachmentUpload(task: BackgroundTask, context: TaskExecutionContext): Promise<any> {
    return new Promise((resolve, reject) => {
      const duration = task.estimatedDuration;

      // Simulate progress reporting
      const progressInterval = setInterval(() => {
        if (task.onProgress) {
          const progress = Math.min(100, (Date.now() - (task.startedAt || 0)) / duration * 100);
          task.onProgress(progress);
        }
      }, 500);

      setTimeout(() => {
        clearInterval(progressInterval);

        // Simulate occasional failures for uploads
        if (Math.random() < 0.1) {
          reject(new Error('Upload failed due to network error'));
        } else {
          resolve({ uploadedBytes: task.data.fileSize });
        }
      }, duration);
    });
  }

  private async executeCacheCleanup(task: BackgroundTask, context: TaskExecutionContext): Promise<any> {
    return new Promise((resolve) => {
      const duration = Math.min(task.estimatedDuration, 3000);
      setTimeout(() => {
        resolve({ freedSpaceMB: Math.floor(Math.random() * 100) + 50 });
      }, duration);
    });
  }

  private async executeAnalyticsUpload(task: BackgroundTask, context: TaskExecutionContext): Promise<any> {
    return new Promise((resolve) => {
      const duration = Math.min(task.estimatedDuration, 1000);
      setTimeout(() => {
        resolve({ eventsUploaded: task.data.eventCount || 0 });
      }, duration);
    });
  }

  private async executeBackgroundFetch(task: BackgroundTask, context: TaskExecutionContext): Promise<any> {
    return new Promise((resolve) => {
      const duration = Math.min(task.estimatedDuration, 4000);
      setTimeout(() => {
        resolve({ dataFetched: true, bytesReceived: Math.floor(Math.random() * 1000) });
      }, duration);
    });
  }

  private async executeVoiceProcessing(task: BackgroundTask, context: TaskExecutionContext): Promise<any> {
    return new Promise((resolve) => {
      const duration = task.estimatedDuration;
      setTimeout(() => {
        resolve({ processedDurationMs: task.data.audioDuration || 0 });
      }, duration);
    });
  }

  private async executeImageOptimization(task: BackgroundTask, context: TaskExecutionContext): Promise<any> {
    return new Promise((resolve) => {
      const duration = task.estimatedDuration;
      setTimeout(() => {
        resolve({
          originalSize: task.data.originalSize,
          optimizedSize: Math.floor(task.data.originalSize * 0.7)
        });
      }, duration);
    });
  }

  private async executeDatabaseMaintenance(task: BackgroundTask, context: TaskExecutionContext): Promise<any> {
    return new Promise((resolve) => {
      const duration = Math.min(task.estimatedDuration, 10000);
      setTimeout(() => {
        resolve({
          recordsCleaned: Math.floor(Math.random() * 1000),
          indexesRebuilt: Math.floor(Math.random() * 5)
        });
      }, duration);
    });
  }

  private handleTaskFailure(task: BackgroundTask, error: Error): void {
    this.runningTasks.delete(task.id);
    this.metrics.tasksRunning--;
    this.metrics.tasksFailed++;

    task.retryCount++;
    task.lastRetryAt = Date.now();

    // Call error callback
    if (task.onError) {
      task.onError(error);
    }

    // Retry logic
    if (task.retryCount <= task.maxRetries) {
      // Add back to queue with delay based on retry count
      const retryDelay = Math.min(60000, 1000 * Math.pow(2, task.retryCount)); // Exponential backoff

      setTimeout(() => {
        task.scheduledAt = Date.now() + retryDelay;
        // Add existing task back to queue directly (don't use addTask which creates new ID)
        this.taskQueue.push(task);
        this.metrics.tasksQueued++;
        this.sortTaskQueue();
      }, retryDelay);
    } else {
      console.warn(`Task ${task.id} failed permanently after ${task.maxRetries} retries:`, error);
    }
  }

  private updateExecutionMetrics(task: BackgroundTask): void {
    if (task.startedAt && task.completedAt) {
      const executionTime = task.completedAt - task.startedAt;
      const waitTime = task.startedAt - task.createdAt;

      // Update running averages
      this.metrics.averageExecutionTime =
        (this.metrics.averageExecutionTime * (this.metrics.tasksCompleted - 1) + executionTime) / this.metrics.tasksCompleted;

      this.metrics.averageWaitTime =
        (this.metrics.averageWaitTime * (this.metrics.tasksCompleted - 1) + waitTime) / this.metrics.tasksCompleted;
    }
  }

  private sortTaskQueue(): void {
    this.taskQueue.sort(this.compareTaskPriority.bind(this));
  }

  // Public API

  public addTask(task: Omit<BackgroundTask, 'id' | 'createdAt' | 'retryCount'>): string {
    const fullTask: BackgroundTask = {
      ...task,
      id: this.generateTaskId(),
      createdAt: Date.now(),
      retryCount: 0,
    };

    this.taskQueue.push(fullTask);
    this.metrics.tasksQueued++;
    this.sortTaskQueue();

    return fullTask.id;
  }

  public cancelTask(taskId: string): boolean {
    // Remove from queue
    const queueIndex = this.taskQueue.findIndex(task => task.id === taskId);
    if (queueIndex > -1) {
      this.taskQueue.splice(queueIndex, 1);
      return true;
    }

    // Can't cancel running tasks for now
    return false;
  }

  public getTaskStatus(taskId: string): 'queued' | 'running' | 'completed' | 'failed' | 'not_found' {
    if (this.runningTasks.has(taskId)) {
      return 'running';
    }

    if (this.taskQueue.find(task => task.id === taskId)) {
      return 'queued';
    }

    if (this.completedTasks.find(task => task.id === taskId)) {
      return 'completed';
    }

    return 'not_found';
  }

  public getQueueMetrics(): TaskSchedulerMetrics {
    return { ...this.metrics };
  }

  public getQueueStatus(): {
    queued: number;
    running: number;
    queuedByPriority: Record<TaskPriority, number>;
  } {
    const queuedByPriority = this.taskQueue.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {} as Record<TaskPriority, number>);

    return {
      queued: this.taskQueue.length,
      running: this.runningTasks.size,
      queuedByPriority,
    };
  }

  public pauseProcessing(): void {
    this.stopProcessing();
  }

  public resumeProcessing(): void {
    this.startProcessing();
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public destroy(): void {
    this.stopProcessing();
    this.taskQueue = [];
    this.runningTasks.clear();
    this.completedTasks = [];
    // Note: React Native AppState uses different cleanup approach
    // The listener will be cleaned up when the service is destroyed
  }
}

export default BackgroundTaskManager;