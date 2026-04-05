/**
 * Background Fetch Service (PN-006) - STUB VERSION
 *
 * TODO: Install expo-background-fetch and expo-task-manager dependencies
 * This is a temporary stub to allow TypeScript compilation to succeed.
 * The full implementation requires expo-background-fetch and expo-task-manager modules.
 */

// Task identifiers
export const BACKGROUND_FETCH_TASK = 'hearth-background-fetch';
export const DELIVERY_RETRY_TASK = 'hearth-delivery-retry';
export const TOKEN_VALIDATION_TASK = 'hearth-token-validation';

export interface BackgroundFetchConfig {
  minimumInterval: number; // seconds
  stopOnTerminate: boolean;
  startOnBoot: boolean;
  enableHeadless: boolean;
}

export interface BackgroundFetchMetrics {
  totalFetches: number;
  successfulFetches: number;
  failedFetches: number;
  noDataFetches: number;
  lastFetchAt: number | null;
  lastFetchResult: 'new_data' | 'no_data' | 'failed' | null;
  averageFetchDuration: number;
  isRegistered: boolean;
}

const DEFAULT_CONFIG: BackgroundFetchConfig = {
  minimumInterval: 15 * 60, // 15 minutes (iOS minimum)
  stopOnTerminate: false,
  startOnBoot: true,
  enableHeadless: true,
};

const DEFAULT_METRICS: BackgroundFetchMetrics = {
  totalFetches: 0,
  successfulFetches: 0,
  failedFetches: 0,
  noDataFetches: 0,
  lastFetchAt: null,
  lastFetchResult: null,
  averageFetchDuration: 0,
  isRegistered: false,
};

/**
 * Stub implementation of BackgroundFetchService
 * TODO: Replace with full implementation once dependencies are installed
 */
class BackgroundFetchService {
  private static instance: BackgroundFetchService;
  private config: BackgroundFetchConfig = DEFAULT_CONFIG;
  private metrics: BackgroundFetchMetrics = { ...DEFAULT_METRICS };

  private constructor() {
    console.warn('BackgroundFetchService: Using stub implementation. Install expo-background-fetch and expo-task-manager for full functionality.');
  }

  static getInstance(): BackgroundFetchService {
    if (!BackgroundFetchService.instance) {
      BackgroundFetchService.instance = new BackgroundFetchService();
    }
    return BackgroundFetchService.instance;
  }

  async initialize(config?: Partial<BackgroundFetchConfig>): Promise<boolean> {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    console.warn('BackgroundFetchService.initialize(): Stub implementation - no actual background fetch registered');
    return false;
  }

  async stop(): Promise<void> {
    console.warn('BackgroundFetchService.stop(): Stub implementation');
  }

  getMetrics(): BackgroundFetchMetrics {
    return { ...this.metrics };
  }

  getConfig(): BackgroundFetchConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<BackgroundFetchConfig>): void {
    this.config = { ...this.config, ...config };
  }

  destroy(): void {
    this.metrics = { ...DEFAULT_METRICS };
  }
}

export default BackgroundFetchService;