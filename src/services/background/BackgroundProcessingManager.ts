import { Platform, AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BatteryOptimizationService from '../battery/BatteryOptimizationService';

export interface BackgroundTask {
  id: string;
  type: 'message_sync' | 'voice_optimization' | 'cache_cleanup' | 'analytics' | 'custom';
  priority: 'high' | 'medium' | 'low';
  payload: any;
  createdAt: number;
  maxRetries: number;
  retryCount: number;
  executeAfter?: number;
  requiresNetwork?: boolean;
  batteryOptimized?: boolean;
}

export interface SyncStrategy {
  batchSize: number;
  intervalMs: number;
  maxConcurrent: number;
  prioritizeRecent: boolean;
}

export class BackgroundProcessingManager {
  private static instance: BackgroundProcessingManager;
  private taskQueue: BackgroundTask[] = [];
  private activeTasks: Map<string, BackgroundTask> = new Map();
  private syncStrategies: Map<string, SyncStrategy> = new Map();
  private isProcessing = false;
  private appState: AppStateStatus = 'active';
  private networkConnected = false;
  private batteryService!: typeof BatteryOptimizationService;

  private readonly DEFAULT_STRATEGIES: Record<string, SyncStrategy> = {
    message_sync: {
      batchSize: 50,
      intervalMs: 5000,
      maxConcurrent: 2,
      prioritizeRecent: true,
    },
    voice_optimization: {
      batchSize: 1,
      intervalMs: 1000,
      maxConcurrent: 1,
      prioritizeRecent: true,
    },
    cache_cleanup: {
      batchSize: 10,
      intervalMs: 30000,
      maxConcurrent: 1,
      prioritizeRecent: false,
    },
    analytics: {
      batchSize: 20,
      intervalMs: 60000,
      maxConcurrent: 1,
      prioritizeRecent: false,
    },
  };

  static getInstance(): BackgroundProcessingManager {
    if (!BackgroundProcessingManager.instance) {
      BackgroundProcessingManager.instance = new BackgroundProcessingManager();
    }
    return BackgroundProcessingManager.instance;
  }

  async initialize(): Promise<void> {
    this.batteryService = BatteryOptimizationService;

    // Initialize sync strategies
    Object.entries(this.DEFAULT_STRATEGIES).forEach(([type, strategy]) => {
      this.syncStrategies.set(type, strategy);
    });

    // Load persisted tasks
    await this.loadPersistedTasks();

    // Set up app state listener
    AppState.addEventListener('change', this.handleAppStateChange);

    // Set up network listener
    NetInfo.addEventListener(state => {
      const wasConnected = this.networkConnected;
      this.networkConnected = state.isConnected || false;

      // Resume processing if network became available
      if (!wasConnected && this.networkConnected) {
        this.processQueue();
      }
    });

    // Start background processing
    this.startBackgroundProcessing();
  }

  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    const previousState = this.appState;
    this.appState = nextAppState;

    if (previousState === 'background' && nextAppState === 'active') {
      // App became active - resume normal processing
      this.processQueue();
    } else if (nextAppState === 'background') {
      // App went to background - optimize processing
      this.optimizeForBackground();
    }
  };

  // Add task to queue with intelligent scheduling
  addTask(task: Omit<BackgroundTask, 'id' | 'createdAt' | 'retryCount'>): string {
    const fullTask: BackgroundTask = {
      ...task,
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      retryCount: 0,
    };

    // Apply battery optimization if enabled
    if (fullTask.batteryOptimized !== false && this.batteryService.shouldThrottleBackgroundSync()) {
      // Delay low priority tasks when battery is low
      if (fullTask.priority === 'low') {
        fullTask.executeAfter = Date.now() + 300000; // 5 minutes delay
      }
    }

    this.taskQueue.push(fullTask);
    this.persistTasks();

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return fullTask.id;
  }

  // Remove task from queue
  removeTask(taskId: string): boolean {
    const index = this.taskQueue.findIndex(task => task.id === taskId);
    if (index > -1) {
      this.taskQueue.splice(index, 1);
      this.persistTasks();
      return true;
    }
    return false;
  }

  // Get task status
  getTaskStatus(taskId: string): 'queued' | 'processing' | 'completed' | 'failed' | 'not_found' {
    if (this.activeTasks.has(taskId)) {
      return 'processing';
    }
    if (this.taskQueue.some(task => task.id === taskId)) {
      return 'queued';
    }
    return 'not_found';
  }

  // Process task queue with intelligent prioritization
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      while (this.taskQueue.length > 0 && this.activeTasks.size < this.getMaxConcurrentTasks()) {
        // Get next task based on priority and conditions
        const task = this.getNextTask();
        if (!task) break;

        // Remove from queue and add to active tasks
        const index = this.taskQueue.findIndex(t => t.id === task.id);
        if (index > -1) {
          this.taskQueue.splice(index, 1);
          this.activeTasks.set(task.id, task);
        }

        // Execute task
        this.executeTask(task);
      }
    } finally {
      this.isProcessing = false;
    }

    // Schedule next processing cycle
    this.scheduleNextProcessing();
  }

  private getNextTask(): BackgroundTask | null {
    const now = Date.now();

    // Filter tasks that are ready to execute
    const readyTasks = this.taskQueue.filter(task => {
      // Check if task should be delayed
      if (task.executeAfter && task.executeAfter > now) {
        return false;
      }

      // Check network requirements
      if (task.requiresNetwork && !this.networkConnected) {
        return false;
      }

      // Check battery optimization
      if (task.batteryOptimized !== false) {
        const profile = this.batteryService.getPerformanceProfile();
        if (profile === 'battery_saver' && task.priority === 'low') {
          return false;
        }
        if (profile === 'thermal_throttled' && task.priority !== 'high') {
          return false;
        }
      }

      return true;
    });

    if (readyTasks.length === 0) return null;

    // Sort by priority and age
    readyTasks.sort((a, b) => {
      // Priority order: high > medium > low
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      // If same priority, prefer older tasks (FIFO)
      return a.createdAt - b.createdAt;
    });

    return readyTasks[0];
  }

  private async executeTask(task: BackgroundTask): Promise<void> {
    try {
      // Execute based on task type
      switch (task.type) {
        case 'message_sync':
          await this.executeMessageSync(task);
          break;
        case 'voice_optimization':
          await this.executeVoiceOptimization(task);
          break;
        case 'cache_cleanup':
          await this.executeCacheCleanup(task);
          break;
        case 'analytics':
          await this.executeAnalytics(task);
          break;
        case 'custom':
          await this.executeCustomTask(task);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      // Task completed successfully
      this.activeTasks.delete(task.id);
    } catch (error) {
      console.warn(`Task ${task.id} failed:`, error);

      // Handle retry logic
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        task.executeAfter = Date.now() + Math.pow(2, task.retryCount) * 1000; // Exponential backoff

        // Return task to queue for retry
        this.taskQueue.push(task);
      }

      this.activeTasks.delete(task.id);
    }

    // Persist updated state
    this.persistTasks();
  }

  private async executeMessageSync(task: BackgroundTask): Promise<void> {
    // Simulate intelligent message synchronization
    const { channelId, lastMessageId } = task.payload;

    // Implement message sync logic here
    // This would typically involve:
    // - Fetching new messages from API
    // - Batch processing based on current strategy
    // - Intelligent caching based on user patterns
    // - Network request optimization

    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
  }

  private async executeVoiceOptimization(task: BackgroundTask): Promise<void> {
    // Implement voice channel optimization
    // - Adjust audio quality based on battery state
    // - Optimize codecs for current performance profile
    // - Manage voice processing threads

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  private async executeCacheCleanup(task: BackgroundTask): Promise<void> {
    // Implement intelligent cache cleanup
    // - Remove old cached messages based on usage patterns
    // - Clean temporary files
    // - Optimize storage usage

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async executeAnalytics(task: BackgroundTask): Promise<void> {
    // Batch and send analytics data
    // - Collect usage metrics
    // - Battery impact analytics
    // - Performance statistics

    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  private async executeCustomTask(task: BackgroundTask): Promise<void> {
    // Execute custom task with provided handler
    if (task.payload.handler && typeof task.payload.handler === 'function') {
      await task.payload.handler(task.payload.data);
    }
  }

  private getMaxConcurrentTasks(): number {
    const profile = this.batteryService.getPerformanceProfile();

    switch (profile) {
      case 'high':
        return 4;
      case 'balanced':
        return 2;
      case 'battery_saver':
        return 1;
      case 'thermal_throttled':
        return 1;
      default:
        return 2;
    }
  }

  private optimizeForBackground(): void {
    // When app goes to background, optimize processing
    // - Reduce concurrent tasks
    // - Prioritize essential tasks only
    // - Increase batching for network requests

    const essentialTypes = ['message_sync', 'voice_optimization'];

    // Filter out non-essential low priority tasks
    this.taskQueue = this.taskQueue.filter(task => {
      return task.priority === 'high' || essentialTypes.includes(task.type);
    });

    this.persistTasks();
  }

  private scheduleNextProcessing(): void {
    // Schedule next processing cycle based on current state
    const interval = this.appState === 'background' ? 30000 : 5000; // 30s in background, 5s when active

    setTimeout(() => {
      if (this.taskQueue.length > 0) {
        this.processQueue();
      }
    }, interval);
  }

  private async loadPersistedTasks(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('background_tasks');
      if (stored) {
        this.taskQueue = JSON.parse(stored);
        // Clean up old tasks (older than 24 hours)
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        this.taskQueue = this.taskQueue.filter(task => task.createdAt > oneDayAgo);
      }
    } catch (error) {
      console.warn('Failed to load persisted tasks:', error);
    }
  }

  private async persistTasks(): Promise<void> {
    try {
      await AsyncStorage.setItem('background_tasks', JSON.stringify(this.taskQueue));
    } catch (error) {
      console.warn('Failed to persist tasks:', error);
    }
  }

  private startBackgroundProcessing(): void {
    // Start the initial processing cycle
    setTimeout(() => this.processQueue(), 1000);
  }

  // Public API methods
  getQueueStatus(): { total: number; active: number; byPriority: Record<string, number>; byType: Record<string, number> } {
    const byPriority = { high: 0, medium: 0, low: 0 };
    const byType: Record<string, number> = {};

    this.taskQueue.forEach(task => {
      byPriority[task.priority]++;
      byType[task.type] = (byType[task.type] || 0) + 1;
    });

    return {
      total: this.taskQueue.length,
      active: this.activeTasks.size,
      byPriority,
      byType,
    };
  }

  updateSyncStrategy(taskType: string, strategy: Partial<SyncStrategy>): void {
    const current = this.syncStrategies.get(taskType) || this.DEFAULT_STRATEGIES[taskType];
    if (current) {
      this.syncStrategies.set(taskType, { ...current, ...strategy });
    }
  }

  // Cleanup
  dispose(): void {
    // Note: In newer React Native versions, AppState listeners are cleaned up automatically
    // or via the unsubscribe function returned by addEventListener
    this.taskQueue = [];
    this.activeTasks.clear();
    this.isProcessing = false;
  }
}

export default BackgroundProcessingManager.getInstance();