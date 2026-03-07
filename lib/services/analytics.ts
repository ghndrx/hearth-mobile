/**
 * Analytics Service
 * 
 * Provides event tracking, user properties, and performance metrics.
 * Platform-agnostic interface that can be backed by Firebase, Segment, or custom backend.
 */

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const ANALYTICS_ENABLED_KEY = "@hearth/analytics_enabled";
const USER_ID_KEY = "@hearth/analytics_user_id";
const SESSION_ID_KEY = "@hearth/analytics_session_id";

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp?: number;
}

export interface UserProperties {
  userId?: string;
  email?: string;
  username?: string;
  tier?: "free" | "premium" | "enterprise";
  createdAt?: string;
  lastLogin?: string;
  [key: string]: unknown;
}

export interface PerformanceMetrics {
  name: string;
  duration: number;
  metadata?: Record<string, unknown>;
}

class AnalyticsService {
  private enabled: boolean = true;
  private userId: string | null = null;
  private sessionId: string | null = null;
  private userProperties: UserProperties = {};
  private eventQueue: AnalyticsEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    try {
      // Check if analytics is enabled (user consent)
      const enabled = await AsyncStorage.getItem(ANALYTICS_ENABLED_KEY);
      this.enabled = enabled !== "false";

      // Restore user ID from storage
      this.userId = await AsyncStorage.getItem(USER_ID_KEY);

      // Generate new session ID
      this.sessionId = this.generateSessionId();
      await AsyncStorage.setItem(SESSION_ID_KEY, this.sessionId);

      // Start periodic flush
      this.startFlushTimer();

      this.logEvent("app_opened", {
        platform: Platform.OS,
        version: Constants.expoConfig?.version,
        buildNumber: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode,
      });
    } catch (error) {
      console.error("Failed to initialize analytics:", error);
    }
  }

  async setEnabled(enabled: boolean): Promise<void> {
    this.enabled = enabled;
    await AsyncStorage.setItem(ANALYTICS_ENABLED_KEY, enabled.toString());
    
    if (!enabled) {
      this.eventQueue = [];
      this.stopFlushTimer();
    } else {
      this.startFlushTimer();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async setUserId(userId: string | null): Promise<void> {
    this.userId = userId;
    if (userId) {
      await AsyncStorage.setItem(USER_ID_KEY, userId);
    } else {
      await AsyncStorage.removeItem(USER_ID_KEY);
    }
  }

  async setUserProperties(properties: UserProperties): Promise<void> {
    this.userProperties = { ...this.userProperties, ...properties };
    
    if (this.enabled) {
      // Send user properties to analytics backend
      this.sendUserProperties(this.userProperties);
    }
  }

  logEvent(name: string, properties?: Record<string, unknown>): void {
    if (!this.enabled) return;

    const event: AnalyticsEvent = {
      name,
      properties: {
        ...properties,
        platform: Platform.OS,
        userId: this.userId,
        sessionId: this.sessionId,
      },
      timestamp: Date.now(),
    };

    this.eventQueue.push(event);

    // Flush immediately for critical events
    if (this.isCriticalEvent(name)) {
      this.flush();
    }
  }

  logScreen(screenName: string, properties?: Record<string, unknown>): void {
    this.logEvent("screen_view", {
      screen_name: screenName,
      ...properties,
    });
  }

  logPerformance(metrics: PerformanceMetrics): void {
    if (!this.enabled) return;

    this.logEvent("performance_metric", {
      metric_name: metrics.name,
      duration_ms: metrics.duration,
      ...metrics.metadata,
    });
  }

  // Common event helpers
  logError(error: Error, context?: Record<string, unknown>): void {
    this.logEvent("error", {
      error_message: error.message,
      error_stack: error.stack,
      error_name: error.name,
      ...context,
    });
  }

  logUserAction(action: string, properties?: Record<string, unknown>): void {
    this.logEvent("user_action", {
      action,
      ...properties,
    });
  }

  logMessageSent(channelType: "dm" | "channel" | "thread", properties?: Record<string, unknown>): void {
    this.logEvent("message_sent", {
      channel_type: channelType,
      ...properties,
    });
  }

  logVoiceCall(action: "started" | "joined" | "left" | "ended", duration?: number): void {
    this.logEvent("voice_call", {
      action,
      duration_seconds: duration,
    });
  }

  logServerJoined(serverId: string, source?: string): void {
    this.logEvent("server_joined", {
      server_id: serverId,
      source,
    });
  }

  logFeatureUsed(feature: string, properties?: Record<string, unknown>): void {
    this.logEvent("feature_used", {
      feature_name: feature,
      ...properties,
    });
  }

  private isCriticalEvent(name: string): boolean {
    const criticalEvents = [
      "error",
      "crash",
      "payment_completed",
      "payment_failed",
      "subscription_changed",
    ];
    return criticalEvents.includes(name);
  }

  private startFlushTimer(): void {
    if (this.flushInterval) return;

    // Flush events every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 30000);
  }

  private stopFlushTimer(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  private async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await this.sendEvents(events);
    } catch (error) {
      console.error("Failed to send analytics events:", error);
      // Re-queue events on failure
      this.eventQueue.unshift(...events);
    }
  }

  private async sendEvents(events: AnalyticsEvent[]): Promise<void> {
    // TODO: Implement actual backend integration
    // For now, just log to console in development
    if (__DEV__) {
      console.log("[Analytics] Events:", events);
    }

    // Example: Send to your analytics backend
    // await fetch('https://api.hearth.app/analytics/events', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ events }),
    // });
  }

  private async sendUserProperties(properties: UserProperties): Promise<void> {
    // TODO: Implement actual backend integration
    if (__DEV__) {
      console.log("[Analytics] User properties:", properties);
    }

    // Example: Send to your analytics backend
    // await fetch('https://api.hearth.app/analytics/user-properties', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ userId: this.userId, properties }),
    // });
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  async cleanup(): Promise<void> {
    this.stopFlushTimer();
    await this.flush();
  }
}

// Export singleton instance
export const analytics = new AnalyticsService();

// Auto-initialize on import
analytics.initialize();
