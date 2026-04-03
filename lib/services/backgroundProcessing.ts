/**
 * Background Processing Service
 * Implements intelligent resource management and background task optimization
 * Part of PN-006: Background processing and delivery optimization
 */

import { Platform, AppState, type AppStateStatus } from 'react-native';
import * as Device from 'expo-device';

// Optional expo-battery import - will use fallback if not available
let Battery: {
  getBatteryLevelAsync: () => Promise<number>;
  getBatteryStateAsync: () => Promise<number>;
  getPowerStateAsync: () => Promise<{ lowPowerMode: boolean }>;
  BatteryState: { UNKNOWN: number; CHARGING: number; DISCHARGING: number; NOT_CHARGING: number; FULL: number };
} | null = null;

try {
  Battery = require('expo-battery');
} catch {
  console.warn('[BackgroundProcessing] expo-battery not available, using fallback values');
}

// Task priority levels based on criticality
export type TaskPriority = 'critical' | 'high' | 'normal' | 'low' | 'background';

// Resource usage thresholds
export interface ResourceThresholds {
  cpu: { low: number; medium: number; high: number };
  memory: { low: number; medium: number; high: number };
  battery: { low: number; critical: number };
  thermal: { warn: number; critical: number };
}

// Background task definition
export interface BackgroundTask {
  id: string;
  name: string;
  priority: TaskPriority;
  execute: () => Promise<void>;
  estimatedDurationMs: number;
  requiredResources: {
    cpu: 'low' | 'medium' | 'high';
    memory: 'low' | 'medium' | 'high';
    network: boolean;
  };
  maxRetries: number;
  currentRetries: number;
  scheduledAt: number;
  lastExecutedAt?: number;
  isRecurring?: boolean;
  intervalMs?: number;
}

// Performance metrics
export interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  batteryLevel: number;
  batteryState: number | null;
  thermalState: 'nominal' | 'fair' | 'serious' | 'critical';
  networkType: 'cellular' | 'wifi' | 'none';
  isLowPowerMode: boolean;
  timestamp: number;
}

// Task execution context
interface TaskExecutionContext {
  priority: TaskPriority;
  canExecute: boolean;
  delayMs?: number;
  reason?: string;
}

// Default resource thresholds optimized for mobile devices
const DEFAULT_THRESHOLDS: ResourceThresholds = {
  cpu: { low: 30, medium: 60, high: 85 },
  memory: { low: 40, medium: 70, high: 90 },
  battery: { low: 20, critical: 10 },
  thermal: { warn: 70, critical: 85 },
};

// Network request batch configuration
interface NetworkBatch {
  requests: (() => Promise<any>)[];
  maxBatchSize: number;
  maxWaitMs: number;
  createdAt: number;
}

class BackgroundProcessingService {
  private tasks: Map<string, BackgroundTask> = new Map();
  private resourceMetrics: PerformanceMetrics | null = null;
  private thresholds: ResourceThresholds = DEFAULT_THRESHOLDS;
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  private networkBatch: NetworkBatch | null = null;
  private batchTimeout: NodeJS.Timeout | null = null;

  // Processing intervals based on app state
  private readonly PROCESSING_INTERVALS = {
    active: 1000,     // 1 second when app is active
    background: 5000, // 5 seconds when backgrounded
    inactive: 3000,   // 3 seconds when inactive
  };

  constructor() {
    this.setupAppStateListener();
  }

  /**
   * Start the background processing service
   */
  async start(): Promise<void> {
    console.log('[BackgroundProcessing] Starting service');

    try {
      // Initialize resource monitoring
      await this.updateResourceMetrics();
      this.startResourceMonitoring();

      // Start task processing
      this.startTaskProcessing();

      console.log('[BackgroundProcessing] Service started successfully');
    } catch (error) {
      console.error('[BackgroundProcessing] Failed to start:', error);
      throw error;
    }
  }

  /**
   * Stop the background processing service
   */
  stop(): void {
    console.log('[BackgroundProcessing] Stopping service');

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    this.isProcessing = false;
    console.log('[BackgroundProcessing] Service stopped');
  }

  /**
   * Schedule a background task with intelligent prioritization
   */
  scheduleTask(task: Omit<BackgroundTask, 'id' | 'currentRetries' | 'scheduledAt'>): string {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const backgroundTask: BackgroundTask = {
      ...task,
      id: taskId,
      currentRetries: 0,
      scheduledAt: Date.now(),
    };

    this.tasks.set(taskId, backgroundTask);

    console.log(`[BackgroundProcessing] Scheduled task ${taskId} with priority ${task.priority}`);

    // Process immediately if critical
    if (task.priority === 'critical' && !this.isProcessing) {
      this.processTaskQueue();
    }

    return taskId;
  }

  /**
   * Cancel a scheduled task
   */
  cancelTask(taskId: string): boolean {
    const deleted = this.tasks.delete(taskId);
    if (deleted) {
      console.log(`[BackgroundProcessing] Cancelled task ${taskId}`);
    }
    return deleted;
  }

  /**
   * Batch network requests for efficiency
   */
  async batchNetworkRequest<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      // Initialize batch if needed
      if (!this.networkBatch) {
        this.networkBatch = {
          requests: [],
          maxBatchSize: 10,
          maxWaitMs: 1000,
          createdAt: Date.now(),
        };
      }

      // Add request to batch
      const wrappedRequest = async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      this.networkBatch.requests.push(wrappedRequest);

      // Process batch if full or if timeout is reached
      const shouldProcessNow =
        this.networkBatch.requests.length >= this.networkBatch.maxBatchSize ||
        Date.now() - this.networkBatch.createdAt >= this.networkBatch.maxWaitMs;

      if (shouldProcessNow) {
        this.processBatch();
      } else if (!this.batchTimeout) {
        // Set timeout to process remaining requests
        this.batchTimeout = setTimeout(() => {
          this.processBatch();
        }, this.networkBatch.maxWaitMs);
      }
    });
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics | null {
    return this.resourceMetrics;
  }

  /**
   * Get task queue statistics
   */
  getTaskStats(): {
    total: number;
    pending: number;
    byPriority: Record<TaskPriority, number>;
  } {
    const tasks = Array.from(this.tasks.values());
    const stats = {
      total: tasks.length,
      pending: tasks.filter(t => !t.lastExecutedAt).length,
      byPriority: {
        critical: 0,
        high: 0,
        normal: 0,
        low: 0,
        background: 0,
      } as Record<TaskPriority, number>,
    };

    tasks.forEach(task => {
      stats.byPriority[task.priority]++;
    });

    return stats;
  }

  /**
   * Update resource thresholds for optimization
   */
  updateThresholds(thresholds: Partial<ResourceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
    console.log('[BackgroundProcessing] Updated resource thresholds');
  }

  /**
   * Process the batch of network requests
   */
  private async processBatch(): Promise<void> {
    if (!this.networkBatch) return;

    const batch = this.networkBatch;
    this.networkBatch = null;

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    console.log(`[BackgroundProcessing] Processing batch of ${batch.requests.length} network requests`);

    // Execute all requests concurrently with intelligent throttling
    const maxConcurrent = this.getOptimalConcurrency();

    for (let i = 0; i < batch.requests.length; i += maxConcurrent) {
      const chunk = batch.requests.slice(i, i + maxConcurrent);
      await Promise.all(chunk.map(req => req().catch(console.error)));

      // Small delay between chunks to prevent overwhelming the system
      if (i + maxConcurrent < batch.requests.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
  }

  /**
   * Get optimal concurrency based on device capabilities
   */
  private getOptimalConcurrency(): number {
    if (!this.resourceMetrics) return 3; // Conservative default

    // Reduce concurrency based on resource usage
    const cpuLoad = this.resourceMetrics.cpuUsage;
    const memoryLoad = this.resourceMetrics.memoryUsage;
    const batteryLevel = this.resourceMetrics.batteryLevel;
    const isLowPower = this.resourceMetrics.isLowPowerMode;

    if (isLowPower || batteryLevel < this.thresholds.battery.critical) {
      return 1; // Minimal concurrency in low power
    }

    if (cpuLoad > this.thresholds.cpu.high || memoryLoad > this.thresholds.memory.high) {
      return 2; // Reduced concurrency under load
    }

    if (cpuLoad > this.thresholds.cpu.medium || memoryLoad > this.thresholds.memory.medium) {
      return 3; // Moderate concurrency
    }

    return 5; // Maximum concurrency when resources are available
  }

  /**
   * Start resource monitoring
   */
  private startResourceMonitoring(): void {
    this.metricsInterval = setInterval(async () => {
      await this.updateResourceMetrics();
    }, 5000); // Update every 5 seconds
  }

  /**
   * Update current resource metrics
   */
  private async updateResourceMetrics(): Promise<void> {
    try {
      let batteryLevel = 1;
      let batteryState: number | null = null;
      let isLowPowerMode = false;

      if (Battery) {
        batteryLevel = await Battery.getBatteryLevelAsync();
        batteryState = await Battery.getBatteryStateAsync();
        const powerState = await Battery.getPowerStateAsync();
        isLowPowerMode = powerState.lowPowerMode;
      }

      // Estimate CPU and memory usage (simplified for mobile)
      const memoryUsage = this.estimateMemoryUsage();
      const cpuUsage = this.estimateCpuUsage();

      this.resourceMetrics = {
        cpuUsage,
        memoryUsage,
        batteryLevel: Math.round(batteryLevel * 100),
        batteryState,
        thermalState: this.estimateThermalState(),
        networkType: 'wifi', // TODO: Get from NetInfo
        isLowPowerMode,
        timestamp: Date.now(),
      };

    } catch (error) {
      console.error('[BackgroundProcessing] Failed to update metrics:', error);
    }
  }

  /**
   * Estimate memory usage (simplified approach for React Native)
   */
  private estimateMemoryUsage(): number {
    // In production, this would use platform-specific APIs
    // For now, estimate based on app complexity and time
    const baseUsage = 35; // Base memory usage percentage
    const runtime = Date.now() - (global as any).__startTime || 0;
    const runtimeFactor = Math.min(runtime / (1000 * 60 * 30), 1); // 30 min max

    return Math.min(baseUsage + (runtimeFactor * 20), 90);
  }

  /**
   * Estimate CPU usage
   */
  private estimateCpuUsage(): number {
    // Simplified CPU usage estimation
    // In production, would use platform-specific performance APIs
    const taskCount = this.tasks.size;
    const baseUsage = 15;
    const taskLoad = Math.min(taskCount * 5, 40);

    return Math.min(baseUsage + taskLoad, 95);
  }

  /**
   * Estimate thermal state
   */
  private estimateThermalState(): PerformanceMetrics['thermalState'] {
    if (!this.resourceMetrics) return 'nominal';

    const cpuLoad = this.resourceMetrics.cpuUsage;

    if (cpuLoad > this.thresholds.thermal.critical) return 'critical';
    if (cpuLoad > this.thresholds.thermal.warn) return 'serious';
    if (cpuLoad > 50) return 'fair';

    return 'nominal';
  }

  /**
   * Start task processing with adaptive intervals
   */
  private startTaskProcessing(): void {
    const appState = AppState.currentState as keyof typeof this.PROCESSING_INTERVALS;
    const interval = this.PROCESSING_INTERVALS[appState] || this.PROCESSING_INTERVALS.background;

    this.processingInterval = setInterval(() => {
      this.processTaskQueue();
    }, interval);
  }

  /**
   * Process the task queue with intelligent prioritization
   */
  private async processTaskQueue(): Promise<void> {
    if (this.isProcessing || this.tasks.size === 0) return;

    this.isProcessing = true;

    try {
      // Get executable tasks sorted by priority
      const executableTasks = this.getExecutableTasks();

      for (const task of executableTasks) {
        const context = this.evaluateTaskExecution(task);

        if (!context.canExecute) {
          if (context.delayMs) {
            console.log(`[BackgroundProcessing] Delaying task ${task.name}: ${context.reason}`);
            // Reschedule task
            task.scheduledAt = Date.now() + context.delayMs;
          }
          continue;
        }

        await this.executeTask(task);

        // Small delay between tasks to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('[BackgroundProcessing] Queue processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get tasks that can be executed, sorted by priority
   */
  private getExecutableTasks(): BackgroundTask[] {
    const now = Date.now();
    const priorityOrder: TaskPriority[] = ['critical', 'high', 'normal', 'low', 'background'];

    return Array.from(this.tasks.values())
      .filter(task => task.scheduledAt <= now)
      .sort((a, b) => {
        // Primary sort: priority
        const aPriority = priorityOrder.indexOf(a.priority);
        const bPriority = priorityOrder.indexOf(b.priority);
        if (aPriority !== bPriority) return aPriority - bPriority;

        // Secondary sort: scheduled time
        return a.scheduledAt - b.scheduledAt;
      });
  }

  /**
   * Evaluate if a task can be executed based on current conditions
   */
  private evaluateTaskExecution(task: BackgroundTask): TaskExecutionContext {
    if (!this.resourceMetrics) {
      return { priority: task.priority, canExecute: false, reason: 'No metrics available' };
    }

    const { cpuUsage, memoryUsage, batteryLevel, isLowPowerMode, thermalState } = this.resourceMetrics;

    // Critical tasks always execute unless thermal critical
    if (task.priority === 'critical' && thermalState !== 'critical') {
      return { priority: task.priority, canExecute: true };
    }

    // Block execution in critical thermal state
    if (thermalState === 'critical') {
      return {
        priority: task.priority,
        canExecute: false,
        delayMs: 30000, // Wait 30 seconds
        reason: 'Critical thermal state',
      };
    }

    // Block execution in low power mode for non-critical tasks
    if (isLowPowerMode && task.priority !== 'critical' && task.priority !== 'high') {
      return {
        priority: task.priority,
        canExecute: false,
        delayMs: 60000, // Wait 1 minute
        reason: 'Low power mode',
      };
    }

    // Block execution when battery is critically low
    if (batteryLevel < this.thresholds.battery.critical && task.priority !== 'critical') {
      return {
        priority: task.priority,
        canExecute: false,
        delayMs: 120000, // Wait 2 minutes
        reason: 'Battery critically low',
      };
    }

    // Adaptive execution based on resource requirements
    const canExecuteBasedOnResources = this.canExecuteBasedOnResources(task, cpuUsage, memoryUsage);

    if (!canExecuteBasedOnResources) {
      const delayMs = this.calculateAdaptiveDelay(task.priority, cpuUsage, memoryUsage);
      return {
        priority: task.priority,
        canExecute: false,
        delayMs,
        reason: 'Insufficient resources',
      };
    }

    return { priority: task.priority, canExecute: true };
  }

  /**
   * Check if task can execute based on current resource usage
   */
  private canExecuteBasedOnResources(
    task: BackgroundTask,
    cpuUsage: number,
    memoryUsage: number
  ): boolean {
    const resourceLevel = task.requiredResources;

    // High resource tasks need low system usage
    if (resourceLevel.cpu === 'high' && cpuUsage > this.thresholds.cpu.medium) {
      return false;
    }

    if (resourceLevel.memory === 'high' && memoryUsage > this.thresholds.memory.medium) {
      return false;
    }

    // Medium resource tasks need reasonable system usage
    if (resourceLevel.cpu === 'medium' && cpuUsage > this.thresholds.cpu.high) {
      return false;
    }

    if (resourceLevel.memory === 'medium' && memoryUsage > this.thresholds.memory.high) {
      return false;
    }

    return true;
  }

  /**
   * Calculate adaptive delay based on priority and resource usage
   */
  private calculateAdaptiveDelay(priority: TaskPriority, cpuUsage: number, memoryUsage: number): number {
    const baseDelays = {
      critical: 5000,
      high: 15000,
      normal: 30000,
      low: 60000,
      background: 120000,
    };

    let delay = baseDelays[priority];

    // Increase delay based on resource pressure
    const resourcePressure = Math.max(
      cpuUsage / 100,
      memoryUsage / 100
    );

    delay = delay * (1 + resourcePressure);

    return Math.round(delay);
  }

  /**
   * Execute a single task with error handling and retry logic
   */
  private async executeTask(task: BackgroundTask): Promise<void> {
    const startTime = Date.now();

    try {
      console.log(`[BackgroundProcessing] Executing task: ${task.name}`);

      await task.execute();

      const duration = Date.now() - startTime;
      task.lastExecutedAt = Date.now();

      console.log(`[BackgroundProcessing] Task ${task.name} completed in ${duration}ms`);

      // Remove non-recurring tasks
      if (!task.isRecurring) {
        this.tasks.delete(task.id);
      } else if (task.intervalMs) {
        // Reschedule recurring task
        task.scheduledAt = Date.now() + task.intervalMs;
        task.currentRetries = 0; // Reset retry count
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[BackgroundProcessing] Task ${task.name} failed after ${duration}ms:`, error);

      task.currentRetries++;

      if (task.currentRetries < task.maxRetries) {
        // Exponential backoff for retries
        const backoffMs = Math.pow(2, task.currentRetries) * 1000;
        task.scheduledAt = Date.now() + backoffMs;
        console.log(`[BackgroundProcessing] Retrying task ${task.name} in ${backoffMs}ms (attempt ${task.currentRetries + 1}/${task.maxRetries})`);
      } else {
        console.error(`[BackgroundProcessing] Task ${task.name} exceeded max retries, removing`);
        this.tasks.delete(task.id);
      }
    }
  }

  /**
   * Setup app state listener to adjust processing intervals
   */
  private setupAppStateListener(): void {
    AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      console.log(`[BackgroundProcessing] App state changed to: ${nextAppState}`);

      // Restart processing with new interval
      if (this.processingInterval) {
        clearInterval(this.processingInterval);
        this.startTaskProcessing();
      }

      // Trigger immediate processing when app becomes active
      if (nextAppState === 'active') {
        this.processTaskQueue();
      }
    });
  }
}

// Singleton instance
export const backgroundProcessingService = new BackgroundProcessingService();

// React hook for using the background processing service
export function useBackgroundProcessing() {
  return {
    scheduleTask: backgroundProcessingService.scheduleTask.bind(backgroundProcessingService),
    cancelTask: backgroundProcessingService.cancelTask.bind(backgroundProcessingService),
    batchNetworkRequest: backgroundProcessingService.batchNetworkRequest.bind(backgroundProcessingService),
    getMetrics: backgroundProcessingService.getPerformanceMetrics.bind(backgroundProcessingService),
    getTaskStats: backgroundProcessingService.getTaskStats.bind(backgroundProcessingService),
    updateThresholds: backgroundProcessingService.updateThresholds.bind(backgroundProcessingService),
  };
}

export default backgroundProcessingService;