import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import BackgroundTaskManager, { BackgroundTask } from './backgroundTaskManager';
import BatteryMonitoringService from './batteryMonitoring';

export interface UserActivityPattern {
  hourlyActivity: Array<{
    hour: number;
    messageCount: number;
    activeMinutes: number;
    channelsAccessed: string[];
  }>;
  dailyActivity: Array<{
    dayOfWeek: number; // 0-6, Sunday = 0
    averageMessageCount: number;
    peakHours: number[];
    preferredChannels: string[];
  }>;
  channelPreferences: Array<{
    channelId: string;
    serverName: string;
    channelName: string;
    accessFrequency: number;
    lastAccessed: number;
    averageSessionDuration: number;
    priority: 'high' | 'medium' | 'low';
  }>;
  networkPatterns: Array<{
    time: number;
    connectionType: 'wifi' | 'cellular' | 'none';
    quality: 'excellent' | 'good' | 'poor';
    dataUsage: number;
  }>;
  lastUpdated: number;
}

export interface SyncStrategy {
  immediate: {
    channels: string[];
    messageTypes: string[];
    maxMessages: number;
  };
  background: {
    channels: string[];
    intervalMs: number;
    batchSize: number;
  };
  predictive: {
    channels: string[];
    lookaheadHours: number;
    confidenceThreshold: number;
  };
  lowPower: {
    channels: string[];
    intervalMs: number;
    priorityOnly: boolean;
  };
}

export interface SyncJob {
  id: string;
  channelId: string;
  type: 'immediate' | 'background' | 'predictive' | 'lowPower';
  priority: number;
  estimatedMessages: number;
  estimatedSizeMB: number;
  scheduledAt: number;
  deadline?: number;
  retryCount: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  metadata: {
    userTriggered: boolean;
    confidenceScore?: number;
    accessProbability?: number;
  };
}

export interface SyncMetrics {
  totalSyncJobs: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageSyncTime: number;
  predictiveHitRate: number;
  dataUsageSaved: number;
  batteryOptimizationCount: number;
  cacheHitRate: number;
}

export interface MessageCacheEntry {
  messageId: string;
  channelId: string;
  content: any;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // bytes
  priority: 'high' | 'medium' | 'low';
}

class AdaptiveSyncEngine {
  private static instance: AdaptiveSyncEngine;
  private activityPattern: UserActivityPattern | null = null;
  private syncJobs: Map<string, SyncJob> = new Map();
  private messageCache: Map<string, MessageCacheEntry> = new Map();
  private currentStrategy: SyncStrategy;
  private metrics: SyncMetrics;
  private taskManager: BackgroundTaskManager;
  private batteryService: BatteryMonitoringService;
  private isActive = false;
  private activityTrackingInterval: NodeJS.Timeout | null = null;

  private readonly STORAGE_KEYS = {
    ACTIVITY_PATTERN: 'adaptive_sync_activity_pattern',
    SYNC_METRICS: 'adaptive_sync_metrics',
    MESSAGE_CACHE: 'adaptive_sync_message_cache',
  };

  private readonly DEFAULT_STRATEGY: SyncStrategy = {
    immediate: {
      channels: [],
      messageTypes: ['mention', 'direct_message', 'reply'],
      maxMessages: 50,
    },
    background: {
      channels: [],
      intervalMs: 300000, // 5 minutes
      batchSize: 20,
    },
    predictive: {
      channels: [],
      lookaheadHours: 2,
      confidenceThreshold: 0.7,
    },
    lowPower: {
      channels: [],
      intervalMs: 900000, // 15 minutes
      priorityOnly: true,
    },
  };

  private constructor() {
    this.currentStrategy = { ...this.DEFAULT_STRATEGY };
    this.metrics = {
      totalSyncJobs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      averageSyncTime: 0,
      predictiveHitRate: 0,
      dataUsageSaved: 0,
      batteryOptimizationCount: 0,
      cacheHitRate: 0,
    };

    this.taskManager = BackgroundTaskManager.getInstance();
    this.batteryService = BatteryMonitoringService.getInstance();

    this.initializeEngine();
  }

  static getInstance(): AdaptiveSyncEngine {
    if (!AdaptiveSyncEngine.instance) {
      AdaptiveSyncEngine.instance = new AdaptiveSyncEngine();
    }
    return AdaptiveSyncEngine.instance;
  }

  private async initializeEngine(): Promise<void> {
    await this.loadStoredData();
    this.setupActivityTracking();
    this.setupBatteryOptimization();
    this.start();
  }

  private async loadStoredData(): Promise<void> {
    try {
      // Load activity patterns
      const storedActivity = await AsyncStorage.getItem(this.STORAGE_KEYS.ACTIVITY_PATTERN);
      if (storedActivity) {
        this.activityPattern = JSON.parse(storedActivity);
      }

      // Load metrics
      const storedMetrics = await AsyncStorage.getItem(this.STORAGE_KEYS.SYNC_METRICS);
      if (storedMetrics) {
        this.metrics = { ...this.metrics, ...JSON.parse(storedMetrics) };
      }

      // Load message cache
      const storedCache = await AsyncStorage.getItem(this.STORAGE_KEYS.MESSAGE_CACHE);
      if (storedCache) {
        const cacheArray = JSON.parse(storedCache);
        this.messageCache = new Map(cacheArray);
      }
    } catch (error) {
      console.warn('Failed to load adaptive sync data:', error);
    }
  }

  private async saveStoredData(): Promise<void> {
    try {
      if (this.activityPattern) {
        await AsyncStorage.setItem(
          this.STORAGE_KEYS.ACTIVITY_PATTERN,
          JSON.stringify(this.activityPattern)
        );
      }

      await AsyncStorage.setItem(
        this.STORAGE_KEYS.SYNC_METRICS,
        JSON.stringify(this.metrics)
      );

      // Convert Map to array for storage
      const cacheArray = Array.from(this.messageCache.entries());
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.MESSAGE_CACHE,
        JSON.stringify(cacheArray)
      );
    } catch (error) {
      console.warn('Failed to save adaptive sync data:', error);
    }
  }

  private setupActivityTracking(): void {
    // Track app activity patterns
    AppState.addEventListener('change', this.handleAppStateChange.bind(this));

    // Track user activity every hour when active
    this.activityTrackingInterval = setInterval(() => {
      if (AppState.currentState === 'active') {
        this.updateActivityPattern();
      }
    }, 3600000); // 1 hour
  }

  private setupBatteryOptimization(): void {
    // Listen to battery changes for strategy optimization
    this.batteryService.addBatteryListener((batteryInfo) => {
      this.optimizeSyncStrategy(batteryInfo);
    });
  }

  private handleAppStateChange(nextAppState: string): void {
    if (nextAppState === 'active') {
      // User became active, trigger predictive sync
      this.triggerPredictiveSync();
    } else if (nextAppState === 'background') {
      // Save state and switch to background sync
      this.saveStoredData();
      this.switchToBackgroundSync();
    }
  }

  private updateActivityPattern(): void {
    if (!this.activityPattern) {
      this.activityPattern = this.createEmptyActivityPattern();
    }

    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    // Update hourly activity (simplified - would track actual usage)
    const hourlyEntry = this.activityPattern.hourlyActivity.find(entry => entry.hour === hour);
    if (hourlyEntry) {
      hourlyEntry.messageCount++;
      hourlyEntry.activeMinutes++;
    } else {
      this.activityPattern.hourlyActivity.push({
        hour,
        messageCount: 1,
        activeMinutes: 1,
        channelsAccessed: [],
      });
    }

    // Update daily activity
    const dailyEntry = this.activityPattern.dailyActivity.find(entry => entry.dayOfWeek === dayOfWeek);
    if (dailyEntry) {
      dailyEntry.averageMessageCount = (dailyEntry.averageMessageCount + 1) / 2;
    } else {
      this.activityPattern.dailyActivity.push({
        dayOfWeek,
        averageMessageCount: 1,
        peakHours: [hour],
        preferredChannels: [],
      });
    }

    this.activityPattern.lastUpdated = Date.now();
    this.optimizeStrategyFromPatterns();
  }

  private createEmptyActivityPattern(): UserActivityPattern {
    return {
      hourlyActivity: [],
      dailyActivity: [],
      channelPreferences: [],
      networkPatterns: [],
      lastUpdated: Date.now(),
    };
  }

  private optimizeStrategyFromPatterns(): void {
    if (!this.activityPattern) return;

    // Identify peak hours for immediate sync
    const peakHours = this.activityPattern.hourlyActivity
      .filter(entry => entry.messageCount > 10)
      .map(entry => entry.hour);

    // Optimize based on channel preferences
    const topChannels = this.activityPattern.channelPreferences
      .filter(channel => channel.priority === 'high')
      .slice(0, 10)
      .map(channel => channel.channelId);

    // Update strategy
    this.currentStrategy.immediate.channels = topChannels.slice(0, 5);
    this.currentStrategy.background.channels = topChannels;
    this.currentStrategy.predictive.channels = topChannels.slice(0, 8);
  }

  private optimizeSyncStrategy(batteryInfo: any): void {
    const batteryLevel = batteryInfo.level;
    const isLowPowerMode = batteryInfo.isLowPowerMode;

    if (isLowPowerMode || batteryLevel < 0.2) {
      // Switch to low power strategy
      this.switchToLowPowerMode();
      this.metrics.batteryOptimizationCount++;
    } else if (batteryLevel < 0.5) {
      // Reduce sync frequency
      this.currentStrategy.background.intervalMs = 600000; // 10 minutes
      this.currentStrategy.predictive.lookaheadHours = 1;
    } else {
      // Use optimal sync strategy
      this.currentStrategy = { ...this.DEFAULT_STRATEGY };
      this.optimizeStrategyFromPatterns();
    }
  }

  private switchToLowPowerMode(): void {
    // Minimal sync strategy for battery conservation
    this.currentStrategy.immediate.maxMessages = 10;
    this.currentStrategy.background.intervalMs = 1800000; // 30 minutes
    this.currentStrategy.background.batchSize = 5;
    this.currentStrategy.predictive.lookaheadHours = 0.5;
    this.currentStrategy.predictive.confidenceThreshold = 0.9;

    // Use low power sync for all channels
    this.currentStrategy.lowPower.channels = this.currentStrategy.immediate.channels;
  }

  private switchToBackgroundSync(): void {
    // Reduce sync activity when app is in background
    this.cancelNonCriticalSyncs();
    this.scheduleBackgroundSyncs();
  }

  private cancelNonCriticalSyncs(): void {
    for (const [jobId, job] of this.syncJobs.entries()) {
      if (job.status === 'pending' && job.type !== 'immediate') {
        job.status = 'failed';
        this.syncJobs.delete(jobId);
      }
    }
  }

  private scheduleBackgroundSyncs(): void {
    if (this.currentStrategy.background.channels.length === 0) return;

    const syncJob: SyncJob = {
      id: this.generateJobId(),
      channelId: this.currentStrategy.background.channels[0], // Simplified
      type: 'background',
      priority: 5,
      estimatedMessages: this.currentStrategy.background.batchSize,
      estimatedSizeMB: this.currentStrategy.background.batchSize * 0.5, // Estimate 0.5MB per message
      scheduledAt: Date.now() + this.currentStrategy.background.intervalMs,
      retryCount: 0,
      status: 'pending',
      metadata: {
        userTriggered: false,
      },
    };

    this.scheduleSync(syncJob);
  }

  private triggerPredictiveSync(): void {
    if (!this.activityPattern) return;

    const predictions = this.generatePredictiveSync();
    predictions.forEach(prediction => {
      this.scheduleSync(prediction);
    });
  }

  private generatePredictiveSync(): SyncJob[] {
    if (!this.activityPattern) return [];

    const jobs: SyncJob[] = [];
    const now = new Date();
    const currentHour = now.getHours();

    // Predict channels user is likely to access in the next few hours
    const likelyChannels = this.activityPattern.channelPreferences
      .filter(channel => {
        const hoursSinceAccess = (Date.now() - channel.lastAccessed) / (1000 * 60 * 60);
        return hoursSinceAccess < 24 && channel.accessFrequency > 0.3;
      })
      .slice(0, this.currentStrategy.predictive.channels.length);

    for (const channel of likelyChannels) {
      const accessProbability = this.calculateAccessProbability(channel, currentHour);

      if (accessProbability >= this.currentStrategy.predictive.confidenceThreshold) {
        const job: SyncJob = {
          id: this.generateJobId(),
          channelId: channel.channelId,
          type: 'predictive',
          priority: Math.round(accessProbability * 10),
          estimatedMessages: Math.round(accessProbability * 30),
          estimatedSizeMB: accessProbability * 15,
          scheduledAt: Date.now() + (Math.random() * 300000), // Random delay up to 5 minutes
          retryCount: 0,
          status: 'pending',
          metadata: {
            userTriggered: false,
            confidenceScore: accessProbability,
            accessProbability,
          },
        };

        jobs.push(job);
      }
    }

    return jobs;
  }

  private calculateAccessProbability(channel: any, currentHour: number): number {
    if (!this.activityPattern) return 0;

    // Base probability from access frequency
    let probability = channel.accessFrequency;

    // Adjust based on hourly patterns
    const hourlyActivity = this.activityPattern.hourlyActivity.find(entry => entry.hour === currentHour);
    if (hourlyActivity && hourlyActivity.channelsAccessed.includes(channel.channelId)) {
      probability *= 1.5; // 50% boost for channels accessed at this hour
    }

    // Adjust based on last access time
    const hoursSinceAccess = (Date.now() - channel.lastAccessed) / (1000 * 60 * 60);
    if (hoursSinceAccess < 2) {
      probability *= 1.3; // Recently accessed channels
    } else if (hoursSinceAccess > 48) {
      probability *= 0.7; // Long time since access
    }

    // Adjust based on priority
    if (channel.priority === 'high') {
      probability *= 1.2;
    } else if (channel.priority === 'low') {
      probability *= 0.8;
    }

    return Math.min(1, probability);
  }

  private scheduleSync(job: SyncJob): void {
    this.syncJobs.set(job.id, job);
    this.metrics.totalSyncJobs++;

    // Convert to background task
    const backgroundTask: Omit<BackgroundTask, 'id' | 'createdAt' | 'retryCount'> = {
      category: 'message_sync',
      priority: job.priority > 7 ? 'high' : job.priority > 4 ? 'medium' : 'low',
      estimatedDuration: job.estimatedMessages * 100, // 100ms per message estimate
      estimatedCpuUsage: Math.min(50, job.estimatedMessages * 2),
      estimatedMemoryUsage: job.estimatedSizeMB,
      estimatedBatteryImpact: Math.min(8, job.priority),
      requiresNetwork: true,
      canRunOnMeteredConnection: job.type === 'immediate',
      maxRetries: job.type === 'immediate' ? 3 : 1,
      deadline: job.deadline,
      data: {
        syncJobId: job.id,
        channelId: job.channelId,
        messageCount: job.estimatedMessages,
      },
      onComplete: (result) => this.handleSyncCompletion(job.id, result),
      onError: (error) => this.handleSyncError(job.id, error),
    };

    this.taskManager.addTask(backgroundTask);
  }

  private handleSyncCompletion(jobId: string, result: any): void {
    const job = this.syncJobs.get(jobId);
    if (!job) return;

    job.status = 'completed';
    this.metrics.successfulSyncs++;

    // Update cache with synced messages
    if (result.messages) {
      this.updateMessageCache(result.messages);
    }

    // Update predictive accuracy metrics
    if (job.type === 'predictive') {
      this.updatePredictiveMetrics(job, true);
    }

    this.syncJobs.delete(jobId);
  }

  private handleSyncError(jobId: string, error: Error): void {
    const job = this.syncJobs.get(jobId);
    if (!job) return;

    job.status = 'failed';
    job.retryCount++;
    this.metrics.failedSyncs++;

    // Update predictive accuracy metrics
    if (job.type === 'predictive') {
      this.updatePredictiveMetrics(job, false);
    }

    console.warn(`Sync job ${jobId} failed:`, error);
    this.syncJobs.delete(jobId);
  }

  private updatePredictiveMetrics(job: SyncJob, success: boolean): void {
    // Update hit rate based on whether the prediction was accessed
    const prediction = job.metadata;
    if (prediction.accessProbability) {
      const currentHitRate = this.metrics.predictiveHitRate;
      const totalPredictions = this.metrics.totalSyncJobs;

      if (success) {
        this.metrics.predictiveHitRate = ((currentHitRate * (totalPredictions - 1)) + 1) / totalPredictions;
      } else {
        this.metrics.predictiveHitRate = (currentHitRate * (totalPredictions - 1)) / totalPredictions;
      }
    }
  }

  private updateMessageCache(messages: any[]): void {
    for (const message of messages) {
      const cacheEntry: MessageCacheEntry = {
        messageId: message.id,
        channelId: message.channelId,
        content: message,
        timestamp: Date.now(),
        accessCount: 0,
        lastAccessed: Date.now(),
        size: JSON.stringify(message).length,
        priority: this.determineCachePriority(message),
      };

      this.messageCache.set(message.id, cacheEntry);
    }

    // Cleanup old cache entries
    this.cleanupMessageCache();
  }

  private determineCachePriority(message: any): 'high' | 'medium' | 'low' {
    // Determine cache priority based on message type and channel
    if (message.mentions?.includes('@me') || message.type === 'direct_message') {
      return 'high';
    } else if (message.type === 'reply' || message.attachments?.length > 0) {
      return 'medium';
    }
    return 'low';
  }

  private cleanupMessageCache(): void {
    const maxCacheSize = 1000;
    const maxAgeMs = 7 * 24 * 60 * 60 * 1000; // 7 days
    const now = Date.now();

    // Remove old entries
    for (const [messageId, entry] of this.messageCache.entries()) {
      if (now - entry.timestamp > maxAgeMs) {
        this.messageCache.delete(messageId);
      }
    }

    // Remove excess entries if still over limit
    if (this.messageCache.size > maxCacheSize) {
      const entries = Array.from(this.messageCache.entries());
      entries.sort(([, a], [, b]) => {
        // Sort by priority and access count
        const aScore = this.getCacheScore(a);
        const bScore = this.getCacheScore(b);
        return bScore - aScore;
      });

      // Keep only the top entries
      this.messageCache.clear();
      entries.slice(0, maxCacheSize).forEach(([id, entry]) => {
        this.messageCache.set(id, entry);
      });
    }
  }

  private getCacheScore(entry: MessageCacheEntry): number {
    const priorityScore = entry.priority === 'high' ? 3 : entry.priority === 'medium' ? 2 : 1;
    const accessScore = entry.accessCount;
    const recencyScore = Math.max(0, 7 - (Date.now() - entry.lastAccessed) / (24 * 60 * 60 * 1000));

    return priorityScore * 10 + accessScore * 5 + recencyScore;
  }

  private generateJobId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API

  public start(): void {
    if (this.isActive) return;
    this.isActive = true;

    // Initial predictive sync
    this.triggerPredictiveSync();
  }

  public stop(): void {
    this.isActive = false;

    if (this.activityTrackingInterval) {
      clearInterval(this.activityTrackingInterval);
      this.activityTrackingInterval = null;
    }

    this.saveStoredData();
  }

  public syncChannel(channelId: string, immediate: boolean = false): string {
    const job: SyncJob = {
      id: this.generateJobId(),
      channelId,
      type: immediate ? 'immediate' : 'background',
      priority: immediate ? 10 : 5,
      estimatedMessages: 50,
      estimatedSizeMB: 25,
      scheduledAt: immediate ? Date.now() : Date.now() + 30000,
      retryCount: 0,
      status: 'pending',
      metadata: {
        userTriggered: true,
      },
    };

    this.scheduleSync(job);
    return job.id;
  }

  public getCachedMessage(messageId: string): any | null {
    const entry = this.messageCache.get(messageId);
    if (entry) {
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      this.metrics.cacheHitRate = ((this.metrics.cacheHitRate * 0.9) + 1) * 0.1; // Rolling average
      return entry.content;
    }
    return null;
  }

  public getSyncMetrics(): SyncMetrics {
    return { ...this.metrics };
  }

  public getActivityPattern(): UserActivityPattern | null {
    return this.activityPattern ? { ...this.activityPattern } : null;
  }

  public updateChannelPreference(channelId: string, preference: Partial<UserActivityPattern['channelPreferences'][0]>): void {
    if (!this.activityPattern) {
      this.activityPattern = this.createEmptyActivityPattern();
    }

    const existingIndex = this.activityPattern.channelPreferences.findIndex(
      pref => pref.channelId === channelId
    );

    if (existingIndex > -1) {
      this.activityPattern.channelPreferences[existingIndex] = {
        ...this.activityPattern.channelPreferences[existingIndex],
        ...preference,
      };
    } else {
      this.activityPattern.channelPreferences.push({
        channelId,
        serverName: preference.serverName || '',
        channelName: preference.channelName || '',
        accessFrequency: preference.accessFrequency || 0,
        lastAccessed: Date.now(),
        averageSessionDuration: preference.averageSessionDuration || 0,
        priority: preference.priority || 'medium',
      });
    }

    this.optimizeStrategyFromPatterns();
  }

  public getCurrentStrategy(): SyncStrategy {
    return { ...this.currentStrategy };
  }

  public destroy(): void {
    this.stop();
    this.syncJobs.clear();
    this.messageCache.clear();
    // Note: React Native AppState uses different cleanup approach
    // The listener will be cleaned up when the service is destroyed
  }
}

export default AdaptiveSyncEngine;