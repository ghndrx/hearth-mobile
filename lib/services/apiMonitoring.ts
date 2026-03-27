/**
 * API Monitoring Service
 *
 * Tracks API usage, rate limiting, performance metrics, and provides real-time monitoring
 * for the Hearth mobile app API dashboard.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ApiUsageMetrics,
  ApiRateLimit,
  ApiRequest,
  ApiDashboardStats,
  ApiMonitoringEvent,
  ApiEndpoint
} from "../types";

const STORAGE_KEYS = {
  API_REQUESTS: "@hearth/api_requests",
  RATE_LIMITS: "@hearth/rate_limits",
  METRICS: "@hearth/api_metrics",
  ENDPOINTS: "@hearth/api_endpoints"
};

type EventCallback = (event: ApiMonitoringEvent) => void;

export class ApiMonitoringService {
  private eventCallbacks: Set<EventCallback> = new Set();
  private requestHistory: ApiRequest[] = [];
  private rateLimits: Map<string, ApiRateLimit> = new Map();
  private metrics: Map<string, ApiUsageMetrics> = new Map();
  private knownEndpoints: Map<string, ApiEndpoint> = new Map();
  private maxHistorySize = 1000; // Keep last 1000 requests in memory

  constructor() {
    this.initializeEndpoints();
    this.loadStoredData();
  }

  /**
   * Initialize known endpoints for tracking
   */
  private initializeEndpoints(): void {
    const endpoints: ApiEndpoint[] = [
      { id: "messages_post", method: "POST", path: "/messages", name: "Send Message", rateLimit: { requests: 100, windowMs: 60000 } },
      { id: "messages_get", method: "GET", path: "/messages", name: "Get Messages", rateLimit: { requests: 200, windowMs: 60000 } },
      { id: "attachments_post", method: "POST", path: "/attachments", name: "Upload Attachment", rateLimit: { requests: 50, windowMs: 60000 } },
      { id: "devices_post", method: "POST", path: "/devices/register", name: "Register Device", rateLimit: { requests: 10, windowMs: 60000 } },
      { id: "devices_delete", method: "DELETE", path: "/devices/*", name: "Unregister Device", rateLimit: { requests: 20, windowMs: 60000 } },
      { id: "auth_post", method: "POST", path: "/auth/login", name: "Login", rateLimit: { requests: 10, windowMs: 300000 } },
      { id: "auth_refresh", method: "POST", path: "/auth/refresh", name: "Refresh Token", rateLimit: { requests: 20, windowMs: 60000 } },
      { id: "users_get", method: "GET", path: "/users/*", name: "Get User", rateLimit: { requests: 150, windowMs: 60000 } },
      { id: "servers_get", method: "GET", path: "/servers", name: "Get Servers", rateLimit: { requests: 100, windowMs: 60000 } },
      { id: "channels_get", method: "GET", path: "/channels", name: "Get Channels", rateLimit: { requests: 100, windowMs: 60000 } }
    ];

    endpoints.forEach(endpoint => {
      this.knownEndpoints.set(endpoint.id, endpoint);

      // Initialize metrics for each endpoint
      this.metrics.set(endpoint.id, {
        endpointId: endpoint.id,
        endpoint: endpoint.path,
        method: endpoint.method,
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        averageResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        rateLimitHits: 0,
        timeWindow: "1h"
      });

      // Initialize rate limit tracking
      if (endpoint.rateLimit) {
        this.rateLimits.set(endpoint.id, {
          endpointId: endpoint.id,
          endpoint: endpoint.path,
          method: endpoint.method,
          limit: endpoint.rateLimit.requests,
          remaining: endpoint.rateLimit.requests,
          resetTime: new Date(Date.now() + endpoint.rateLimit.windowMs).toISOString(),
          windowMs: endpoint.rateLimit.windowMs,
          isBlocked: false
        });
      }
    });
  }

  /**
   * Load stored monitoring data
   */
  private async loadStoredData(): Promise<void> {
    try {
      const storedRequests = await AsyncStorage.getItem(STORAGE_KEYS.API_REQUESTS);
      if (storedRequests) {
        this.requestHistory = JSON.parse(storedRequests);
        this.updateMetricsFromHistory();
      }

      const storedRateLimits = await AsyncStorage.getItem(STORAGE_KEYS.RATE_LIMITS);
      if (storedRateLimits) {
        const rateLimitArray = JSON.parse(storedRateLimits);
        rateLimitArray.forEach((rl: ApiRateLimit) => {
          this.rateLimits.set(rl.endpointId, rl);
        });
      }
    } catch (error) {
      console.error("Failed to load API monitoring data:", error);
    }
  }

  /**
   * Save monitoring data to storage
   */
  private async saveData(): Promise<void> {
    try {
      // Save request history (keep only recent requests)
      const recentRequests = this.requestHistory.slice(-this.maxHistorySize);
      await AsyncStorage.setItem(STORAGE_KEYS.API_REQUESTS, JSON.stringify(recentRequests));

      // Save rate limits
      const rateLimitsArray = Array.from(this.rateLimits.values());
      await AsyncStorage.setItem(STORAGE_KEYS.RATE_LIMITS, JSON.stringify(rateLimitsArray));

      // Save metrics
      const metricsArray = Array.from(this.metrics.values());
      await AsyncStorage.setItem(STORAGE_KEYS.METRICS, JSON.stringify(metricsArray));
    } catch (error) {
      console.error("Failed to save API monitoring data:", error);
    }
  }

  /**
   * Track an API request
   */
  trackRequest(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    requestSize?: number,
    responseSize?: number,
    errorMessage?: string
  ): void {
    const endpointId = this.getEndpointId(endpoint, method);
    const request: ApiRequest = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      endpointId,
      endpoint,
      method,
      statusCode,
      responseTime,
      timestamp: new Date().toISOString(),
      requestSize,
      responseSize,
      errorMessage
    };

    // Add to history
    this.requestHistory.push(request);
    if (this.requestHistory.length > this.maxHistorySize) {
      this.requestHistory = this.requestHistory.slice(-this.maxHistorySize);
    }

    // Update metrics
    this.updateMetrics(request);

    // Check rate limits
    this.updateRateLimit(endpointId);

    // Emit monitoring event
    const eventType: ApiMonitoringEvent["type"] =
      statusCode >= 400 ? "error" :
      responseTime > 2000 ? "slow_response" : "request";

    this.emitEvent({
      type: eventType,
      endpoint,
      method,
      data: request,
      timestamp: request.timestamp
    });

    // Save data periodically
    if (this.requestHistory.length % 10 === 0) {
      this.saveData();
    }
  }

  /**
   * Track a rate limit hit
   */
  trackRateLimit(endpoint: string, method: string, resetTime?: string): void {
    const endpointId = this.getEndpointId(endpoint, method);
    const rateLimit = this.rateLimits.get(endpointId);

    if (rateLimit) {
      rateLimit.remaining = Math.max(0, rateLimit.remaining - 1);
      rateLimit.isBlocked = rateLimit.remaining === 0;
      if (resetTime) {
        rateLimit.resetTime = resetTime;
      }

      // Update metrics
      const metrics = this.metrics.get(endpointId);
      if (metrics) {
        metrics.rateLimitHits++;
      }

      this.emitEvent({
        type: "rate_limit",
        endpoint,
        method,
        data: rateLimit,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get real-time dashboard statistics
   */
  getDashboardStats(): ApiDashboardStats {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const recentRequests = this.requestHistory.filter(r =>
      new Date(r.timestamp) >= hourAgo
    );

    const todaysRequests = this.requestHistory.filter(r =>
      new Date(r.timestamp) >= dayStart
    );

    const totalRequests = this.requestHistory.length;
    const successfulRequests = this.requestHistory.filter(r => r.statusCode < 400).length;
    const errorRequests = this.requestHistory.filter(r => r.statusCode >= 400);

    // Calculate success rate
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

    // Calculate average response time
    const totalResponseTime = this.requestHistory.reduce((sum, r) => sum + r.responseTime, 0);
    const averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;

    // Get rate limit violations
    const rateLimitViolations = Array.from(this.metrics.values())
      .reduce((sum, m) => sum + m.rateLimitHits, 0);

    // Get top endpoints
    const endpointStats = new Map<string, {count: number, success: number}>();
    this.requestHistory.forEach(r => {
      const key = `${r.method} ${r.endpoint}`;
      const stats = endpointStats.get(key) || {count: 0, success: 0};
      stats.count++;
      if (r.statusCode < 400) stats.success++;
      endpointStats.set(key, stats);
    });

    const topEndpoints = Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint: endpoint.split(' ')[1],
        method: endpoint.split(' ')[0],
        requestCount: stats.count,
        successRate: stats.count > 0 ? (stats.success / stats.count) * 100 : 0
      }))
      .sort((a, b) => b.requestCount - a.requestCount)
      .slice(0, 5);

    // Get recent errors
    const recentErrors = errorRequests
      .slice(-10)
      .map(r => ({
        endpoint: r.endpoint,
        method: r.method,
        error: r.errorMessage || `HTTP ${r.statusCode}`,
        timestamp: r.timestamp
      }));

    return {
      totalRequests,
      successRate,
      averageResponseTime,
      rateLimitViolations,
      activeEndpoints: this.knownEndpoints.size,
      requestsToday: todaysRequests.length,
      requestsThisHour: recentRequests.length,
      topEndpoints,
      recentErrors
    };
  }

  /**
   * Get all API usage metrics
   */
  getMetrics(): ApiUsageMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get all rate limit information
   */
  getRateLimits(): ApiRateLimit[] {
    return Array.from(this.rateLimits.values());
  }

  /**
   * Get request history
   */
  getRequestHistory(limit?: number): ApiRequest[] {
    return limit ? this.requestHistory.slice(-limit) : this.requestHistory;
  }

  /**
   * Subscribe to monitoring events
   */
  subscribe(callback: EventCallback): () => void {
    this.eventCallbacks.add(callback);
    return () => this.eventCallbacks.delete(callback);
  }

  /**
   * Reset rate limits (for testing or manual override)
   */
  resetRateLimits(): void {
    this.rateLimits.forEach(rateLimit => {
      const endpoint = this.knownEndpoints.get(rateLimit.endpointId);
      if (endpoint?.rateLimit) {
        rateLimit.remaining = endpoint.rateLimit.requests;
        rateLimit.isBlocked = false;
        rateLimit.resetTime = new Date(Date.now() + endpoint.rateLimit.windowMs).toISOString();
      }
    });
  }

  /**
   * Clear monitoring data (for testing or reset)
   */
  async clearData(): Promise<void> {
    this.requestHistory = [];
    this.metrics.clear();
    this.initializeEndpoints(); // Reinitialize with fresh metrics
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.API_REQUESTS,
      STORAGE_KEYS.RATE_LIMITS,
      STORAGE_KEYS.METRICS
    ]);
  }

  // Private helper methods

  private getEndpointId(endpoint: string, method: string): string {
    // Try to match exact endpoints first
    for (const [id, knownEndpoint] of this.knownEndpoints) {
      if (knownEndpoint.method === method && knownEndpoint.path === endpoint) {
        return id;
      }
      // Handle wildcard matching for dynamic endpoints
      if (knownEndpoint.path.includes('*')) {
        const pattern = knownEndpoint.path.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        if (regex.test(endpoint)) {
          return id;
        }
      }
    }
    // Fallback to a generic ID
    return `${method.toLowerCase()}_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  private updateMetrics(request: ApiRequest): void {
    let metrics = this.metrics.get(request.endpointId);

    if (!metrics) {
      // Create new metrics entry for unknown endpoint
      metrics = {
        endpointId: request.endpointId,
        endpoint: request.endpoint,
        method: request.method,
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        averageResponseTime: 0,
        minResponseTime: request.responseTime,
        maxResponseTime: request.responseTime,
        rateLimitHits: 0,
        timeWindow: "1h"
      };
      this.metrics.set(request.endpointId, metrics);
    }

    // Update counters
    metrics.requestCount++;
    if (request.statusCode < 400) {
      metrics.successCount++;
    } else {
      metrics.errorCount++;
    }

    // Update response time metrics
    const totalTime = metrics.averageResponseTime * (metrics.requestCount - 1) + request.responseTime;
    metrics.averageResponseTime = totalTime / metrics.requestCount;
    metrics.minResponseTime = Math.min(metrics.minResponseTime, request.responseTime);
    metrics.maxResponseTime = Math.max(metrics.maxResponseTime, request.responseTime);
    metrics.lastRequestAt = request.timestamp;
  }

  private updateRateLimit(endpointId: string): void {
    const rateLimit = this.rateLimits.get(endpointId);
    if (rateLimit && rateLimit.remaining > 0) {
      rateLimit.remaining--;
      if (rateLimit.remaining === 0) {
        rateLimit.isBlocked = true;
      }
    }
  }

  private updateMetricsFromHistory(): void {
    this.requestHistory.forEach(request => {
      this.updateMetrics(request);
    });
  }

  private emitEvent(event: ApiMonitoringEvent): void {
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error("Error in monitoring event callback:", error);
      }
    });
  }
}

// Export singleton instance
export const apiMonitoring = new ApiMonitoringService();

// Hook into the existing API client for automatic tracking
// This will be imported and used by the enhanced API client
export const createApiMiddleware = () => {
  return {
    onRequest: (endpoint: string, method: string, startTime: number) => {
      return {
        trackResponse: (statusCode: number, endTime: number, error?: string) => {
          const responseTime = endTime - startTime;
          apiMonitoring.trackRequest(endpoint, method, statusCode, responseTime, undefined, undefined, error);
        }
      };
    },
    onRateLimit: (endpoint: string, method: string, resetTime?: string) => {
      apiMonitoring.trackRateLimit(endpoint, method, resetTime);
    }
  };
};