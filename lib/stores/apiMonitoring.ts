import { create } from "zustand";
import { apiMonitoring } from "../services/apiMonitoring";
import {
  ApiUsageMetrics,
  ApiRateLimit,
  ApiRequest,
  ApiDashboardStats,
  ApiMonitoringEvent
} from "../types";

interface ApiMonitoringState {
  // State
  dashboardStats: ApiDashboardStats;
  metrics: ApiUsageMetrics[];
  rateLimits: ApiRateLimit[];
  recentRequests: ApiRequest[];
  recentEvents: ApiMonitoringEvent[];
  isMonitoring: boolean;
  lastUpdated: string;

  // Real-time updates
  autoRefresh: boolean;
  refreshInterval: number; // seconds

  // Actions
  startMonitoring: () => void;
  stopMonitoring: () => void;
  refreshData: () => void;
  clearData: () => Promise<void>;
  resetRateLimits: () => void;
  setAutoRefresh: (enabled: boolean, interval?: number) => void;

  // Getters
  getTopEndpoints: () => ApiUsageMetrics[];
  getCurrentRateLimit: (endpointId: string) => ApiRateLimit | undefined;
  getSuccessRate: () => number;
  getTotalRequests: () => number;
}

export const useApiMonitoringStore = create<ApiMonitoringState>((set, get) => {
  let eventSubscription: (() => void) | null = null;
  let refreshTimer: NodeJS.Timeout | null = null;

  const refreshData = () => {
    const stats = apiMonitoring.getDashboardStats();
    const metrics = apiMonitoring.getMetrics();
    const rateLimits = apiMonitoring.getRateLimits();
    const recentRequests = apiMonitoring.getRequestHistory(50); // Last 50 requests

    set({
      dashboardStats: stats,
      metrics,
      rateLimits,
      recentRequests,
      lastUpdated: new Date().toISOString()
    });
  };

  const startAutoRefresh = (intervalSeconds: number) => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
    }
    refreshTimer = setInterval(() => {
      refreshData();
    }, intervalSeconds * 1000);
  };

  const stopAutoRefresh = () => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  };

  return {
    // Initial state
    dashboardStats: {
      totalRequests: 0,
      successRate: 0,
      averageResponseTime: 0,
      rateLimitViolations: 0,
      activeEndpoints: 0,
      requestsToday: 0,
      requestsThisHour: 0,
      topEndpoints: [],
      recentErrors: []
    },
    metrics: [],
    rateLimits: [],
    recentRequests: [],
    recentEvents: [],
    isMonitoring: false,
    lastUpdated: new Date().toISOString(),
    autoRefresh: true,
    refreshInterval: 30, // 30 seconds default

    // Actions
    startMonitoring: () => {
      if (eventSubscription) return; // Already monitoring

      // Subscribe to real-time events
      eventSubscription = apiMonitoring.subscribe((event: ApiMonitoringEvent) => {
        const currentEvents = get().recentEvents;
        const newEvents = [event, ...currentEvents.slice(0, 49)]; // Keep last 50 events

        set({
          recentEvents: newEvents,
          lastUpdated: new Date().toISOString()
        });

        // Refresh data on certain events
        if (event.type === "request" || event.type === "error" || event.type === "rate_limit") {
          setTimeout(refreshData, 100); // Small delay to batch updates
        }
      });

      // Initial data refresh
      refreshData();

      // Start auto refresh if enabled
      const { autoRefresh, refreshInterval } = get();
      if (autoRefresh) {
        startAutoRefresh(refreshInterval);
      }

      set({ isMonitoring: true });
    },

    stopMonitoring: () => {
      if (eventSubscription) {
        eventSubscription();
        eventSubscription = null;
      }

      stopAutoRefresh();
      set({ isMonitoring: false });
    },

    refreshData: () => {
      refreshData();
    },

    clearData: async () => {
      await apiMonitoring.clearData();
      refreshData();
      set({
        recentEvents: []
      });
    },

    resetRateLimits: () => {
      apiMonitoring.resetRateLimits();
      refreshData();
    },

    setAutoRefresh: (enabled: boolean, interval = 30) => {
      set({
        autoRefresh: enabled,
        refreshInterval: interval
      });

      if (get().isMonitoring) {
        if (enabled) {
          startAutoRefresh(interval);
        } else {
          stopAutoRefresh();
        }
      }
    },

    // Getters
    getTopEndpoints: () => {
      return get().metrics
        .filter(m => m.requestCount > 0)
        .sort((a, b) => b.requestCount - a.requestCount)
        .slice(0, 10);
    },

    getCurrentRateLimit: (endpointId: string) => {
      return get().rateLimits.find(rl => rl.endpointId === endpointId);
    },

    getSuccessRate: () => {
      return get().dashboardStats.successRate;
    },

    getTotalRequests: () => {
      return get().dashboardStats.totalRequests;
    }
  };
});

// Auto-start monitoring when store is created
// This ensures monitoring starts as soon as the app loads
setTimeout(() => {
  const store = useApiMonitoringStore.getState();
  if (!store.isMonitoring) {
    store.startMonitoring();
  }
}, 1000);

// Utility hooks for common use cases
export const useApiDashboardStats = () => {
  return useApiMonitoringStore(state => state.dashboardStats);
};

export const useApiMetrics = () => {
  return useApiMonitoringStore(state => state.metrics);
};

export const useRateLimits = () => {
  return useApiMonitoringStore(state => state.rateLimits);
};

export const useRecentRequests = () => {
  return useApiMonitoringStore(state => state.recentRequests);
};

export const useRecentEvents = () => {
  return useApiMonitoringStore(state => state.recentEvents);
};

export const useMonitoringActions = () => {
  return useApiMonitoringStore(state => ({
    startMonitoring: state.startMonitoring,
    stopMonitoring: state.stopMonitoring,
    refreshData: state.refreshData,
    clearData: state.clearData,
    resetRateLimits: state.resetRateLimits,
    setAutoRefresh: state.setAutoRefresh
  }));
};

export const useMonitoringStatus = () => {
  return useApiMonitoringStore(state => ({
    isMonitoring: state.isMonitoring,
    autoRefresh: state.autoRefresh,
    refreshInterval: state.refreshInterval,
    lastUpdated: state.lastUpdated
  }));
};