import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BatteryOptimizationService from '../battery/BatteryOptimizationService';

export interface BatchedRequest {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  headers?: Record<string, string>;
  priority: 'high' | 'medium' | 'low';
  createdAt: number;
  maxRetries: number;
  retryCount: number;
  timeoutMs: number;
  requiresAuth?: boolean;
  cacheKey?: string;
  resolveCallback?: (data: any) => void;
  rejectCallback?: (error: any) => void;
}

export interface BatchConfig {
  maxBatchSize: number;
  maxWaitTimeMs: number;
  networkTypeSpecific: boolean;
  batteryAware: boolean;
}

export interface NetworkMetrics {
  totalRequests: number;
  batchedRequests: number;
  savedRadioWakeups: number;
  averageBatchSize: number;
  failureRate: number;
  batteryOptimizedRequests: number;
}

export class NetworkBatchingService {
  private static instance: NetworkBatchingService;
  private requestQueue: Map<string, BatchedRequest[]> = new Map(); // Grouped by endpoint
  private batchTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private networkState: NetInfoState | null = null;
  private batteryService!: typeof BatteryOptimizationService;
  private metrics: NetworkMetrics = {
    totalRequests: 0,
    batchedRequests: 0,
    savedRadioWakeups: 0,
    averageBatchSize: 0,
    failureRate: 0,
    batteryOptimizedRequests: 0,
  };

  private readonly DEFAULT_BATCH_CONFIG: BatchConfig = {
    maxBatchSize: 10,
    maxWaitTimeMs: 5000,
    networkTypeSpecific: true,
    batteryAware: true,
  };

  private batchConfigs: Map<string, BatchConfig> = new Map();

  static getInstance(): NetworkBatchingService {
    if (!NetworkBatchingService.instance) {
      NetworkBatchingService.instance = new NetworkBatchingService();
    }
    return NetworkBatchingService.instance;
  }

  async initialize(): Promise<void> {
    this.batteryService = BatteryOptimizationService;

    // Set up network state listener
    NetInfo.addEventListener(state => {
      const wasConnected = this.networkState?.isConnected;
      this.networkState = state;

      // If network became available, process pending requests
      if (!wasConnected && state.isConnected) {
        this.processBatches();
      }
    });

    // Load saved metrics
    await this.loadMetrics();

    // Set up periodic batch processing
    this.startBatchProcessing();
  }

  // Add request to batch queue
  addRequest(request: Omit<BatchedRequest, 'id' | 'createdAt' | 'retryCount'>): Promise<any> {
    return new Promise((resolve, reject) => {
      const batchedRequest: BatchedRequest = {
        ...request,
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        retryCount: 0,
        resolveCallback: resolve,
        rejectCallback: reject,
      };

      // Apply battery optimizations
      if (this.DEFAULT_BATCH_CONFIG.batteryAware) {
        this.applyBatteryOptimizations(batchedRequest);
      }

      // Group requests by endpoint for batching
      const endpointKey = this.getEndpointKey(request.endpoint);
      if (!this.requestQueue.has(endpointKey)) {
        this.requestQueue.set(endpointKey, []);
      }

      const queue = this.requestQueue.get(endpointKey)!;
      queue.push(batchedRequest);

      this.metrics.totalRequests++;

      // Check if batch should be processed immediately
      const config = this.getBatchConfig(endpointKey);
      if (this.shouldProcessImmediately(batchedRequest, queue, config)) {
        this.processBatchForEndpoint(endpointKey);
      } else {
        this.scheduleBatchProcessing();
      }
    });
  }

  private applyBatteryOptimizations(request: BatchedRequest): void {
    const batteryProfile = this.batteryService.getPerformanceProfile();

    switch (batteryProfile) {
      case 'battery_saver':
        // Delay low priority requests
        if (request.priority === 'low') {
          request.timeoutMs = Math.min(request.timeoutMs * 2, 30000);
        }
        // Increase timeout for all requests to reduce retries
        request.timeoutMs = Math.min(request.timeoutMs * 1.5, 20000);
        this.metrics.batteryOptimizedRequests++;
        break;

      case 'thermal_throttled':
        // Reduce timeout to prevent long-running requests
        request.timeoutMs = Math.min(request.timeoutMs, 10000);
        // Only process high priority requests immediately
        if (request.priority !== 'high') {
          request.timeoutMs *= 1.2;
        }
        this.metrics.batteryOptimizedRequests++;
        break;

      case 'balanced':
        // Slight optimization for non-critical requests
        if (request.priority === 'low') {
          request.timeoutMs = Math.min(request.timeoutMs * 1.2, 15000);
        }
        break;
    }
  }

  private shouldProcessImmediately(
    request: BatchedRequest,
    queue: BatchedRequest[],
    config: BatchConfig
  ): boolean {
    // Process immediately if:
    // - High priority request
    // - Batch size reached
    // - Network is cellular and battery is low (to minimize radio usage)

    if (request.priority === 'high') {
      return true;
    }

    if (queue.length >= config.maxBatchSize) {
      return true;
    }

    // Battery-aware immediate processing
    if (config.batteryAware && this.networkState?.type === 'cellular') {
      const batteryMetrics = this.batteryService.getBatteryMetrics();
      if (batteryMetrics.level < 0.3 && !batteryMetrics.isCharging) {
        // Process batch early to minimize radio wake cycles
        return queue.length >= Math.ceil(config.maxBatchSize / 2);
      }
    }

    return false;
  }

  private scheduleBatchProcessing(): void {
    if (this.batchTimer) {
      return; // Timer already scheduled
    }

    const config = this.DEFAULT_BATCH_CONFIG;
    let waitTime = config.maxWaitTimeMs;

    // Adjust wait time based on battery state
    if (config.batteryAware) {
      const batteryProfile = this.batteryService.getPerformanceProfile();
      switch (batteryProfile) {
        case 'battery_saver':
          waitTime *= 2; // Wait longer to batch more requests
          break;
        case 'thermal_throttled':
          waitTime *= 1.5;
          break;
      }
    }

    // Adjust wait time based on network type
    if (config.networkTypeSpecific && this.networkState) {
      switch (this.networkState.type) {
        case 'cellular':
          waitTime *= 1.5; // Wait longer on cellular to batch more
          break;
        case 'wifi':
          waitTime *= 0.8; // Process faster on WiFi
          break;
      }
    }

    this.batchTimer = setTimeout(() => {
      this.batchTimer = null;
      this.processBatches();
    }, waitTime);
  }

  private async processBatches(): Promise<void> {
    if (this.isProcessing || !this.networkState?.isConnected) {
      return;
    }

    this.isProcessing = true;

    try {
      const endpointsToProcess = Array.from(this.requestQueue.keys()).filter(
        key => this.requestQueue.get(key)!.length > 0
      );

      // Process batches in parallel, but limit concurrency
      const maxConcurrent = this.getMaxConcurrentBatches();
      const chunks = this.chunkArray(endpointsToProcess, maxConcurrent);

      for (const chunk of chunks) {
        await Promise.all(chunk.map(endpoint => this.processBatchForEndpoint(endpoint)));
      }
    } finally {
      this.isProcessing = false;
    }

    // Schedule next processing if there are still requests
    if (this.hasQueuedRequests()) {
      this.scheduleBatchProcessing();
    }
  }

  private async processBatchForEndpoint(endpointKey: string): Promise<void> {
    const queue = this.requestQueue.get(endpointKey);
    if (!queue || queue.length === 0) {
      return;
    }

    const config = this.getBatchConfig(endpointKey);
    const batchSize = Math.min(queue.length, config.maxBatchSize);
    const batch = queue.splice(0, batchSize);

    // Sort batch by priority (high -> medium -> low)
    batch.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    try {
      // Group requests by method for more efficient batching
      const groupedRequests = this.groupRequestsByMethod(batch);

      for (const [method, requests] of groupedRequests.entries()) {
        await this.executeBatchedRequests(method, requests, endpointKey);
      }

      this.metrics.batchedRequests += batch.length;
      this.metrics.savedRadioWakeups += Math.max(0, batch.length - 1);
      this.updateAverageBatchSize(batch.length);

    } catch (error) {
      console.error(`Failed to process batch for ${endpointKey}:`, error);
      this.handleBatchError(batch, error);
    }
  }

  private groupRequestsByMethod(batch: BatchedRequest[]): Map<string, BatchedRequest[]> {
    const grouped = new Map<string, BatchedRequest[]>();

    batch.forEach(request => {
      if (!grouped.has(request.method)) {
        grouped.set(request.method, []);
      }
      grouped.get(request.method)!.push(request);
    });

    return grouped;
  }

  private async executeBatchedRequests(
    method: string,
    requests: BatchedRequest[],
    endpointKey: string
  ): Promise<void> {
    if (requests.length === 1) {
      // Single request - execute normally
      await this.executeSingleRequest(requests[0]);
      return;
    }

    // Multiple requests - create batched request
    try {
      const batchPayload = this.createBatchPayload(requests, method);
      const response = await this.performBatchRequest(endpointKey, method, batchPayload);

      // Distribute responses to individual request callbacks
      this.distributeBatchResponse(requests, response);

    } catch (error) {
      // If batch request fails, fall back to individual requests
      console.warn('Batch request failed, falling back to individual requests:', error);

      for (const request of requests) {
        try {
          await this.executeSingleRequest(request);
        } catch (singleError) {
          this.handleRequestError(request, singleError);
        }
      }
    }
  }

  private async executeSingleRequest(request: BatchedRequest): Promise<void> {
    try {
      const response = await this.performSingleRequest(request);

      if (request.resolveCallback) {
        request.resolveCallback(response);
      }

    } catch (error) {
      this.handleRequestError(request, error);
    }
  }

  private async performSingleRequest(request: BatchedRequest): Promise<any> {
    const { endpoint, method, data, headers, timeoutMs } = request;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async performBatchRequest(endpoint: string, method: string, batchPayload: any): Promise<any> {
    // This would typically be a special batch endpoint provided by the API
    const batchEndpoint = `${endpoint}/batch`;

    const response = await fetch(batchEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method,
        requests: batchPayload,
      }),
    });

    if (!response.ok) {
      throw new Error(`Batch request failed: ${response.status}`);
    }

    return await response.json();
  }

  private createBatchPayload(requests: BatchedRequest[], method: string): any[] {
    return requests.map(request => ({
      id: request.id,
      data: request.data,
      headers: request.headers,
    }));
  }

  private distributeBatchResponse(requests: BatchedRequest[], batchResponse: any): void {
    // Assume batch response has structure: { responses: [{ id, data, error }] }
    const responseMap = new Map();

    if (batchResponse.responses) {
      batchResponse.responses.forEach((res: any) => {
        responseMap.set(res.id, res);
      });
    }

    requests.forEach(request => {
      const response = responseMap.get(request.id);

      if (response) {
        if (response.error) {
          this.handleRequestError(request, new Error(response.error));
        } else if (request.resolveCallback) {
          request.resolveCallback(response.data);
        }
      } else if (request.rejectCallback) {
        request.rejectCallback(new Error('No response received for request'));
      }
    });
  }

  private handleRequestError(request: BatchedRequest, error: any): void {
    if (request.retryCount < request.maxRetries) {
      // Retry the request
      request.retryCount++;

      const endpointKey = this.getEndpointKey(request.endpoint);
      const queue = this.requestQueue.get(endpointKey) || [];
      queue.unshift(request); // Add to front for retry
      this.requestQueue.set(endpointKey, queue);

    } else if (request.rejectCallback) {
      this.metrics.failureRate = (this.metrics.failureRate + 1) / this.metrics.totalRequests;
      request.rejectCallback(error);
    }
  }

  private handleBatchError(batch: BatchedRequest[], error: any): void {
    batch.forEach(request => this.handleRequestError(request, error));
  }

  private getEndpointKey(endpoint: string): string {
    // Extract base endpoint for batching
    try {
      const url = new URL(endpoint);
      return `${url.pathname}`;
    } catch {
      return endpoint;
    }
  }

  private getBatchConfig(endpointKey: string): BatchConfig {
    return this.batchConfigs.get(endpointKey) || this.DEFAULT_BATCH_CONFIG;
  }

  private getMaxConcurrentBatches(): number {
    const batteryProfile = this.batteryService.getPerformanceProfile();

    switch (batteryProfile) {
      case 'high': return 4;
      case 'balanced': return 2;
      case 'battery_saver': return 1;
      case 'thermal_throttled': return 1;
      default: return 2;
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private hasQueuedRequests(): boolean {
    return Array.from(this.requestQueue.values()).some(queue => queue.length > 0);
  }

  private updateAverageBatchSize(batchSize: number): void {
    const totalBatches = this.metrics.batchedRequests / this.metrics.averageBatchSize || 1;
    this.metrics.averageBatchSize = (
      (this.metrics.averageBatchSize * (totalBatches - 1)) + batchSize
    ) / totalBatches;
  }

  private startBatchProcessing(): void {
    // Start periodic batch processing
    setInterval(() => {
      if (this.hasQueuedRequests() && !this.isProcessing) {
        this.processBatches();
      }
    }, 10000); // Check every 10 seconds
  }

  // Public API methods
  updateBatchConfig(endpointKey: string, config: Partial<BatchConfig>): void {
    const currentConfig = this.getBatchConfig(endpointKey);
    this.batchConfigs.set(endpointKey, { ...currentConfig, ...config });
  }

  getNetworkMetrics(): NetworkMetrics {
    return { ...this.metrics };
  }

  getQueueStatus(): { [endpoint: string]: number } {
    const status: { [endpoint: string]: number } = {};

    this.requestQueue.forEach((queue, endpoint) => {
      status[endpoint] = queue.length;
    });

    return status;
  }

  clearQueue(endpointKey?: string): void {
    if (endpointKey) {
      this.requestQueue.delete(endpointKey);
    } else {
      this.requestQueue.clear();
    }
  }

  // Persistence
  private async loadMetrics(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('network_batching_metrics');
      if (stored) {
        this.metrics = { ...this.metrics, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load network batching metrics:', error);
    }
  }

  private async saveMetrics(): Promise<void> {
    try {
      await AsyncStorage.setItem('network_batching_metrics', JSON.stringify(this.metrics));
    } catch (error) {
      console.warn('Failed to save network batching metrics:', error);
    }
  }

  // Cleanup
  dispose(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    this.requestQueue.clear();
    this.saveMetrics();
  }
}

export default NetworkBatchingService.getInstance();