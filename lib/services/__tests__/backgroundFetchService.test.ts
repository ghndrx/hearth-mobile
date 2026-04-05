import BackgroundFetchService, {
  BACKGROUND_FETCH_TASK,
} from '../backgroundFetchService';

jest.mock('expo-background-fetch', () => ({
  getStatusAsync: jest.fn().mockResolvedValue(2), // Available
  registerTaskAsync: jest.fn().mockResolvedValue(undefined),
  unregisterTaskAsync: jest.fn().mockResolvedValue(undefined),
  BackgroundFetchStatus: {
    Denied: 1,
    Restricted: 3,
    Available: 2,
  },
  BackgroundFetchResult: {
    NewData: 1,
    NoData: 2,
    Failed: 3,
  },
}));

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskDefined: jest.fn().mockReturnValue(false),
  isTaskRegisteredAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
    currentState: 'active',
  },
  Platform: { OS: 'ios' },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
  addEventListener: jest.fn(() => jest.fn()),
}));

jest.mock('../notificationDeliveryTracking', () => {
  const mockInstance = {
    getPendingDeliveries: jest.fn().mockReturnValue([]),
    processRetryQueue: jest.fn().mockResolvedValue(undefined),
    pruneOldRecords: jest.fn().mockResolvedValue(0),
    confirmDelivery: jest.fn(),
    trackNotificationSent: jest.fn(),
    reportFailure: jest.fn(),
    getMetrics: jest.fn(),
    getRetryQueueSize: jest.fn().mockReturnValue(0),
    setDeliveryAttemptHandler: jest.fn(),
    resetRecentMetrics: jest.fn(),
    getDeliveryRecord: jest.fn(),
    destroy: jest.fn(),
  };
  return {
    __esModule: true,
    default: {
      getInstance: jest.fn(() => mockInstance),
    },
  };
});

jest.mock('../tokenRefreshManager', () => {
  const mockInstance = {
    validateToken: jest.fn().mockResolvedValue(true),
    forceRefresh: jest.fn().mockResolvedValue('new-token'),
    destroy: jest.fn(),
  };
  return {
    __esModule: true,
    default: {
      getInstance: jest.fn(() => mockInstance),
    },
  };
});

jest.mock('../backgroundTaskManager', () => {
  const mockInstance = {
    getQueueStatus: jest.fn().mockReturnValue({ queued: 0, running: 0, queuedByPriority: {} }),
    resumeProcessing: jest.fn(),
    destroy: jest.fn(),
  };
  return {
    __esModule: true,
    default: {
      getInstance: jest.fn(() => mockInstance),
    },
  };
});

jest.mock('../batteryMonitoring', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => ({
      getCurrentBatteryInfo: jest.fn().mockReturnValue({ level: 0.8, isCharging: false }),
    })),
  },
}));

jest.mock('../resourceMonitor', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => ({
      getCurrentMetrics: jest.fn().mockReturnValue(null),
    })),
  },
}));

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

describe('BackgroundFetchService', () => {
  let service: BackgroundFetchService;

  beforeEach(() => {
    (BackgroundFetchService as any).instance = null;
    service = BackgroundFetchService.getInstance();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const a = BackgroundFetchService.getInstance();
      const b = BackgroundFetchService.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('initialization', () => {
    it('should register background fetch task', async () => {
      const result = await service.initialize();
      expect(result).toBe(true);
      expect(TaskManager.defineTask).toHaveBeenCalledWith(
        BACKGROUND_FETCH_TASK,
        expect.any(Function)
      );
      expect(BackgroundFetch.registerTaskAsync).toHaveBeenCalledWith(
        BACKGROUND_FETCH_TASK,
        expect.objectContaining({
          minimumInterval: 900, // 15 minutes
          stopOnTerminate: false,
          startOnBoot: true,
        })
      );
    });

    it('should not re-initialize if already initialized', async () => {
      await service.initialize();
      const result = await service.initialize();
      expect(result).toBe(true);
      expect(TaskManager.defineTask).toHaveBeenCalledTimes(1);
    });

    it('should accept custom config', async () => {
      await service.initialize({ minimumInterval: 1800 });
      expect(BackgroundFetch.registerTaskAsync).toHaveBeenCalledWith(
        BACKGROUND_FETCH_TASK,
        expect.objectContaining({
          minimumInterval: 1800,
        })
      );
    });

    it('should handle denied permission', async () => {
      (BackgroundFetch.getStatusAsync as jest.Mock).mockResolvedValueOnce(1); // Denied
      const result = await service.initialize();
      // Still returns true because the task definition succeeds;
      // the denied check just warns
      expect(result).toBe(true);
    });
  });

  describe('status', () => {
    it('should check background fetch status', async () => {
      const status = await service.getStatus();
      expect(status).toBe(2); // Available
    });

    it('should report initialization status', async () => {
      expect(service.isServiceInitialized()).toBe(false);
      await service.initialize();
      expect(service.isServiceInitialized()).toBe(true);
    });
  });

  describe('metrics', () => {
    it('should provide initial metrics', () => {
      const metrics = service.getMetrics();
      expect(metrics.totalFetches).toBe(0);
      expect(metrics.isRegistered).toBe(false);
      expect(metrics.lastFetchAt).toBeNull();
    });

    it('should update metrics after initialization', async () => {
      await service.initialize();
      const metrics = service.getMetrics();
      expect(metrics.isRegistered).toBe(true);
    });
  });

  describe('unregister', () => {
    it('should unregister background fetch task', async () => {
      await service.initialize();
      await service.unregister();
      expect(BackgroundFetch.unregisterTaskAsync).toHaveBeenCalledWith(BACKGROUND_FETCH_TASK);
      expect(service.isServiceInitialized()).toBe(false);
    });
  });
});
