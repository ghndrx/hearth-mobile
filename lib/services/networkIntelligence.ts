/**
 * Network Intelligence Engine Service - NET-001
 * Real-time network condition analysis and voice optimization
 * Part of Mobile Network-Intelligent Voice Optimization system
 */

import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { getPlatformNetworkMonitor } from './platformNetworkMonitor';
import {
  VOICE_QUALITY_PROFILES,
  DEFAULT_NETWORK_INTELLIGENCE_CONFIG,
} from '../types/networkIntelligence';
import type {
  NetworkConditions,
  NetworkQualityScore,
  VoiceOptimizationProfile,
  NetworkTransitionEvent,
  NetworkAnalytics,
  NetworkIntelligenceConfig,
  NetworkTransition,
  NetworkType,
  CellularGeneration,
} from '../types/networkIntelligence';

/** Network measurement data for quality scoring */
interface NetworkMeasurement {
  latency: number;
  bandwidth: { up: number; down: number };
  timestamp: number;
  packetLoss?: number;
}

/** Network intelligence engine events */
export type NetworkIntelligenceEvent =
  | 'conditions_changed'
  | 'quality_updated'
  | 'profile_changed'
  | 'transition_detected'
  | 'analytics_updated';

export type NetworkIntelligenceEventListener = (eventType: NetworkIntelligenceEvent, data: any) => void;

/**
 * Network Intelligence Engine Class
 * Implements sophisticated mobile-first network analysis and optimization
 */
export class NetworkIntelligenceEngine {
  private config: NetworkIntelligenceConfig;
  private currentConditions: NetworkConditions | null = null;
  private currentQualityScore: NetworkQualityScore | null = null;
  private currentProfile: VoiceOptimizationProfile | null = null;
  private analytics: NetworkAnalytics;
  private listeners: NetworkIntelligenceEventListener[] = [];

  // Monitoring intervals
  private monitoringInterval: NodeJS.Timeout | null = null;
  private qualityInterval: NodeJS.Timeout | null = null;

  // Network measurement history for stability analysis
  private measurementHistory: NetworkMeasurement[] = [];
  private readonly MAX_HISTORY_SIZE = 20;

  // Transition detection
  private previousConditions: NetworkConditions | null = null;
  private transitionCount = 0;

  constructor(config: Partial<NetworkIntelligenceConfig> = {}) {
    this.config = { ...DEFAULT_NETWORK_INTELLIGENCE_CONFIG, ...config };
    this.analytics = this.initializeAnalytics();
  }

  /**
   * Initialize analytics data structure
   */
  private initializeAnalytics(): NetworkAnalytics {
    return {
      dataUsage: {
        cellular: 0,
        wifi: 0,
        estimatedCost: 0
      },
      voiceMetrics: {
        packetLoss: 0,
        jitter: 0,
        activeCodec: 'opus',
        activeBitrate: 64
      },
      batteryImpact: {
        additionalDrainPercent: 0,
        processingComplexity: 5
      },
      session: {
        startTime: Date.now(),
        transitionCount: 0,
        averageQuality: 0
      }
    };
  }

  /**
   * Start the network intelligence engine
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      console.log('[NetworkIntelligence] Engine is disabled');
      return;
    }

    console.log('[NetworkIntelligence] Starting engine...');

    // Initial network state fetch
    await this.updateNetworkConditions();

    // Start monitoring intervals
    this.monitoringInterval = setInterval(() => {
      this.updateNetworkConditions();
    }, this.config.monitoringIntervalMs);

    this.qualityInterval = setInterval(() => {
      this.assessNetworkQuality();
    }, this.config.qualityAssessmentIntervalMs);

    console.log('[NetworkIntelligence] Engine started successfully');
  }

  /**
   * Stop the network intelligence engine
   */
  stop(): void {
    console.log('[NetworkIntelligence] Stopping engine...');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.qualityInterval) {
      clearInterval(this.qualityInterval);
      this.qualityInterval = null;
    }

    console.log('[NetworkIntelligence] Engine stopped');
  }

  /**
   * Update current network conditions
   */
  private async updateNetworkConditions(): Promise<void> {
    try {
      const netInfoState = await NetInfo.fetch();
      const conditions = await this.analyzeNetworkState(netInfoState);

      // Store previous conditions for transition detection
      this.previousConditions = this.currentConditions;
      this.currentConditions = conditions;

      // Detect and handle transitions
      if (this.previousConditions && this.detectNetworkTransition(this.previousConditions, conditions)) {
        await this.handleNetworkTransition(this.previousConditions, conditions);
      }

      // Update analytics
      this.updateAnalytics(conditions);

      // Notify listeners
      this.emit('conditions_changed', conditions);

    } catch (error) {
      console.error('[NetworkIntelligence] Failed to update network conditions:', error);
    }
  }

  /**
   * Analyze NetInfo state into detailed NetworkConditions
   * Enhanced with platform-specific monitoring for better accuracy
   */
  private async analyzeNetworkState(state: NetInfoState): Promise<NetworkConditions> {
    const platformMonitor = getPlatformNetworkMonitor();
    const networkType = this.mapNetworkType(state.type);

    // Use platform-specific methods for more accurate data
    const [latency, bandwidth] = await Promise.all([
      platformMonitor.measureLatency(),
      platformMonitor.estimateBandwidth()
    ]);

    const stability = this.calculateStability();

    const conditions: NetworkConditions = {
      type: networkType,
      strength: 0, // Will be set below based on platform data
      latency,
      bandwidth,
      stability,
      dataLimited: this.isDataLimited(state),
      timestamp: Date.now()
    };

    // Add cellular-specific data using platform monitor
    if (networkType === 'cellular') {
      const cellularInfo = await platformMonitor.getCellularInfo();
      if (cellularInfo) {
        conditions.strength = cellularInfo.signalStrength;
        conditions.cellular = {
          generation: cellularInfo.generation,
          carrier: cellularInfo.networkOperator,
          isRoaming: cellularInfo.isRoaming,
          signalBars: cellularInfo.signalBars
        };
      } else {
        // Fallback to basic NetInfo data
        conditions.strength = this.calculateSignalStrength(state);
        conditions.cellular = {
          generation: this.detectCellularGeneration(state),
          carrier: (state.details as any)?.carrierName || undefined,
          isRoaming: (state.details as any)?.isRoaming || false,
          signalBars: this.calculateSignalBars(conditions.strength)
        };
      }
    }

    // Add Wi-Fi specific data using platform monitor
    if (networkType === 'wifi') {
      const wifiInfo = await platformMonitor.getWiFiInfo();
      if (wifiInfo) {
        conditions.strength = Math.max(0, Math.min(100, ((wifiInfo.rssi + 100) / 70) * 100));
        conditions.wifi = {
          ssid: wifiInfo.ssid,
          rssi: wifiInfo.rssi,
          frequency: wifiInfo.frequency
        };
      } else {
        // Fallback to basic NetInfo data
        conditions.strength = this.calculateSignalStrength(state);
        conditions.wifi = {
          ssid: (state.details as any)?.ssid || undefined,
          rssi: (state.details as any)?.strength || -50,
          frequency: (state.details as any)?.frequency || undefined
        };
      }
    }

    // For other network types (ethernet, unknown), use fallback signal strength
    if (networkType !== 'cellular' && networkType !== 'wifi') {
      conditions.strength = networkType === 'ethernet' ? 100 : 50;
    }

    return conditions;
  }

  /**
   * Map NetInfo network type to our NetworkType
   */
  private mapNetworkType(type: string | null): NetworkType {
    if (!type) return 'unknown';

    switch (type.toLowerCase()) {
      case 'wifi':
        return 'wifi';
      case 'cellular':
        return 'cellular';
      case 'ethernet':
        return 'ethernet';
      default:
        return 'unknown';
    }
  }

  /**
   * Calculate signal strength percentage from NetInfo state
   */
  private calculateSignalStrength(state: NetInfoState): number {
    if (!state.details) return 50; // Default middle value

    const details = state.details as any;

    if (state.type === 'cellular') {
      // For cellular, use signal strength if available
      if (details.cellularGeneration) {
        return Math.max(0, Math.min(100, (details.strength || 50)));
      }
    }

    if (state.type === 'wifi') {
      // For Wi-Fi, convert RSSI to percentage
      const rssi = details.strength || -50;
      // RSSI typically ranges from -100 (poor) to -30 (excellent)
      return Math.max(0, Math.min(100, ((rssi + 100) / 70) * 100));
    }

    return 75; // Default good value for ethernet/other
  }

  /**
   * Measure network latency
   */
  private async measureLatency(): Promise<number> {
    try {
      const startTime = Date.now();

      // Use a lightweight ping-like request
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache'
      });

      const latency = Date.now() - startTime;
      return response.ok ? latency : 999; // High latency if failed
    } catch (error) {
      console.warn('[NetworkIntelligence] Latency measurement failed:', error);
      return 999; // High latency if failed
    }
  }

  /**
   * Estimate available bandwidth
   */
  private async estimateBandwidth(state: NetInfoState): Promise<{ up: number; down: number }> {
    // Basic bandwidth estimation based on connection type
    const details = state.details as any;

    switch (state.type) {
      case 'wifi':
        return { up: 50000, down: 100000 }; // 50/100 Mbps typical Wi-Fi

      case 'cellular':
        return this.estimateCellularBandwidth(details);

      case 'ethernet':
        return { up: 100000, down: 100000 }; // 100/100 Mbps ethernet

      default:
        return { up: 1000, down: 2000 }; // Conservative fallback
    }
  }

  /**
   * Estimate cellular bandwidth based on generation
   */
  private estimateCellularBandwidth(details: any): { up: number; down: number } {
    const generation = details?.cellularGeneration || '4G';

    switch (generation) {
      case '5G':
        return { up: 50000, down: 100000 }; // Up to 50/100 Mbps
      case '4G':
      case 'LTE':
        return { up: 10000, down: 50000 }; // Up to 10/50 Mbps
      case '3G':
        return { up: 1000, down: 3000 }; // Up to 1/3 Mbps
      case '2G':
        return { up: 64, down: 128 }; // Up to 64/128 kbps
      default:
        return { up: 5000, down: 20000 }; // Default 4G estimate
    }
  }

  /**
   * Calculate network stability based on measurement history
   */
  private calculateStability(): number {
    if (this.measurementHistory.length < 3) return 100; // Assume stable initially

    // Calculate variance in latency and bandwidth
    const latencies = this.measurementHistory.map(m => m.latency);
    const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
    const latencyVariance = latencies.reduce((sum, l) => sum + Math.pow(l - avgLatency, 2), 0) / latencies.length;

    // Convert variance to stability score (lower variance = higher stability)
    const maxVariance = 10000; // 100ms variance threshold
    const stabilityScore = Math.max(0, 100 - (latencyVariance / maxVariance) * 100);

    return Math.round(stabilityScore);
  }

  /**
   * Detect cellular generation
   */
  private detectCellularGeneration(state: NetInfoState): CellularGeneration {
    const details = state.details as any;
    const generation = details?.cellularGeneration?.toLowerCase() || '';

    if (generation.includes('5g') || generation.includes('nr')) return '5G';
    if (generation.includes('4g') || generation.includes('lte')) return '4G';
    if (generation.includes('3g') || generation.includes('umts')) return '3G';
    if (generation.includes('2g') || generation.includes('gsm')) return '2G';

    return 'unknown';
  }

  /**
   * Calculate signal bars (1-5) from strength percentage
   */
  private calculateSignalBars(strength: number): number {
    if (strength >= 80) return 5;
    if (strength >= 60) return 4;
    if (strength >= 40) return 3;
    if (strength >= 20) return 2;
    return 1;
  }

  /**
   * Check if connection has data limitations
   */
  private isDataLimited(state: NetInfoState): boolean {
    const details = state.details as any;
    return details?.isConnectionExpensive || state.type === 'cellular';
  }

  /**
   * Assess overall network quality and determine optimization profile
   */
  private assessNetworkQuality(): void {
    if (!this.currentConditions) return;

    const qualityScore = this.calculateNetworkQualityScore(this.currentConditions);
    this.currentQualityScore = qualityScore;

    // Select optimal voice profile
    const newProfile = VOICE_QUALITY_PROFILES[qualityScore.recommendedProfile];

    // Check if profile should change (avoid unnecessary switches)
    if (this.shouldSwitchProfile(this.currentProfile, newProfile, qualityScore)) {
      const previousProfile = this.currentProfile;
      this.currentProfile = newProfile;

      console.log(`[NetworkIntelligence] Profile changed: ${previousProfile?.profileName || 'none'} -> ${newProfile.profileName}`);
      this.emit('profile_changed', { from: previousProfile, to: newProfile, qualityScore });
    }

    this.emit('quality_updated', qualityScore);
  }

  /**
   * Calculate comprehensive network quality score
   */
  private calculateNetworkQualityScore(conditions: NetworkConditions): NetworkQualityScore {
    // Calculate individual component scores (0-100)
    const strengthScore = conditions.strength;
    const latencyScore = this.calculateLatencyScore(conditions.latency);
    const bandwidthScore = this.calculateBandwidthScore(conditions.bandwidth);
    const stabilityScore = conditions.stability;

    // Weighted overall score
    const weights = {
      strength: 0.2,
      latency: 0.3,
      bandwidth: 0.3,
      stability: 0.2
    };

    const overall = Math.round(
      strengthScore * weights.strength +
      latencyScore * weights.latency +
      bandwidthScore * weights.bandwidth +
      stabilityScore * weights.stability
    );

    const level = this.getQualityLevel(overall);
    const recommendedProfile = this.getRecommendedProfile(overall, conditions);

    return {
      overall,
      components: {
        strength: strengthScore,
        latency: latencyScore,
        bandwidth: bandwidthScore,
        stability: stabilityScore
      },
      recommendedProfile,
      level
    };
  }

  /**
   * Calculate latency score (lower is better)
   */
  private calculateLatencyScore(latency: number): number {
    if (latency <= 50) return 100;
    if (latency <= 80) return 90;
    if (latency <= 120) return 75;
    if (latency <= 200) return 50;
    if (latency <= 400) return 25;
    return 10;
  }

  /**
   * Calculate bandwidth score
   */
  private calculateBandwidthScore(bandwidth: { up: number; down: number }): number {
    // Focus on upload for voice quality
    const upload = bandwidth.up;

    if (upload >= 5000) return 100;   // 5+ Mbps
    if (upload >= 1000) return 90;    // 1-5 Mbps
    if (upload >= 512) return 75;     // 512kbps-1Mbps
    if (upload >= 256) return 50;     // 256-512kbps
    if (upload >= 128) return 25;     // 128-256kbps
    return 10;                        // <128kbps
  }

  /**
   * Get quality level from overall score
   */
  private getQualityLevel(score: number): NetworkQualityScore['level'] {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    if (score >= 30) return 'poor';
    return 'very_poor';
  }

  /**
   * Get recommended voice profile based on score and conditions
   */
  private getRecommendedProfile(score: number, conditions: NetworkConditions): keyof typeof VOICE_QUALITY_PROFILES {
    // Consider data limitations
    if (conditions.dataLimited && score < 70) {
      return score < 40 ? 'SURVIVAL' : 'EFFICIENT';
    }

    // Standard quality-based selection
    if (score >= 85) return 'PREMIUM';
    if (score >= 65) return 'STANDARD';
    if (score >= 40) return 'EFFICIENT';
    return 'SURVIVAL';
  }

  /**
   * Determine if voice profile should be switched
   */
  private shouldSwitchProfile(
    current: VoiceOptimizationProfile | null,
    recommended: VoiceOptimizationProfile,
    qualityScore: NetworkQualityScore
  ): boolean {
    if (!current) return true; // First time setup

    if (current.profileName === recommended.profileName) return false; // Same profile

    // Check if quality difference justifies switch
    const profileScores = {
      'Premium': 90,
      'Standard': 70,
      'Efficient': 50,
      'Survival': 30
    };

    const currentScore = profileScores[current.profileName as keyof typeof profileScores] || 50;
    const scoreDifference = Math.abs(qualityScore.overall - currentScore);

    return scoreDifference >= this.config.qualitySwitchThreshold;
  }

  /**
   * Detect network transitions
   */
  private detectNetworkTransition(prev: NetworkConditions, current: NetworkConditions): boolean {
    return (
      prev.type !== current.type ||
      Math.abs(prev.strength - current.strength) > 30 ||
      Math.abs(prev.latency - current.latency) > 100 ||
      Math.abs(prev.stability - current.stability) > 25
    );
  }

  /**
   * Handle network transition
   */
  private async handleNetworkTransition(prev: NetworkConditions, current: NetworkConditions): Promise<void> {
    const transitionType = this.determineTransitionType(prev, current);

    const event: NetworkTransitionEvent = {
      type: transitionType,
      from: prev,
      to: current,
      timestamp: Date.now(),
      predictedDurationMs: this.predictTransitionDuration(transitionType)
    };

    this.transitionCount++;
    this.analytics.session.transitionCount = this.transitionCount;

    console.log(`[NetworkIntelligence] Network transition detected: ${transitionType}`);
    this.emit('transition_detected', event);

    // Apply transition-specific optimizations
    await this.applyTransitionOptimizations(event);
  }

  /**
   * Determine the type of network transition
   */
  private determineTransitionType(prev: NetworkConditions, current: NetworkConditions): NetworkTransition {
    if (prev.type === 'wifi' && current.type === 'cellular') return 'wifi_to_cellular';
    if (prev.type === 'cellular' && current.type === 'wifi') return 'cellular_to_wifi';
    if (current.strength < 30 && prev.strength > 50) return 'weak_signal';
    if (current.strength === 0) return 'network_loss';
    return 'quality_change';
  }

  /**
   * Predict transition duration
   */
  private predictTransitionDuration(type: NetworkTransition): number {
    switch (type) {
      case 'wifi_to_cellular': return 2000;
      case 'cellular_to_wifi': return 3000;
      case 'weak_signal': return 5000;
      case 'network_loss': return 10000;
      case 'quality_change': return 1000;
      default: return 2000;
    }
  }

  /**
   * Apply transition-specific optimizations
   */
  private async applyTransitionOptimizations(event: NetworkTransitionEvent): Promise<void> {
    switch (event.type) {
      case 'wifi_to_cellular':
        // Preemptively reduce quality to prevent stuttering
        console.log('[NetworkIntelligence] Applying cellular transition optimization');
        break;

      case 'cellular_to_wifi':
        // Gradually increase quality to prevent overload
        console.log('[NetworkIntelligence] Applying Wi-Fi transition optimization');
        break;

      case 'weak_signal':
        // Increase buffering and reduce bitrate
        console.log('[NetworkIntelligence] Applying weak signal optimization');
        break;

      case 'network_loss':
        // Maintain connection with local buffering
        console.log('[NetworkIntelligence] Applying network loss mitigation');
        break;
    }
  }

  /**
   * Update analytics data
   */
  private updateAnalytics(conditions: NetworkConditions): void {
    // Update session average quality
    if (this.currentQualityScore) {
      const sessionDuration = Date.now() - this.analytics.session.startTime;
      const weight = Math.min(sessionDuration / 60000, 1); // Weight increases over first minute
      this.analytics.session.averageQuality =
        (this.analytics.session.averageQuality * (1 - weight) +
         this.currentQualityScore.overall * weight);
    }

    // Update battery impact based on processing complexity
    if (this.currentProfile) {
      this.analytics.batteryImpact.processingComplexity = this.currentProfile.complexity;
      // Estimate additional drain (simplified)
      this.analytics.batteryImpact.additionalDrainPercent =
        Math.max(0, (this.currentProfile.complexity - 5) * 2);
    }

    this.emit('analytics_updated', this.analytics);
  }

  /**
   * Add measurement to history
   */
  private addMeasurement(measurement: NetworkMeasurement): void {
    this.measurementHistory.push(measurement);
    if (this.measurementHistory.length > this.MAX_HISTORY_SIZE) {
      this.measurementHistory.shift();
    }
  }

  /**
   * Add event listener
   */
  addEventListener(listener: NetworkIntelligenceEventListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: NetworkIntelligenceEventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Emit event to all listeners
   */
  private emit(eventType: NetworkIntelligenceEvent, data: any): void {
    this.listeners.forEach(listener => {
      try {
        listener(eventType, data);
      } catch (error) {
        console.error('[NetworkIntelligence] Error in event listener:', error);
      }
    });
  }

  // Public getters for current state
  getCurrentConditions(): NetworkConditions | null { return this.currentConditions; }
  getCurrentQualityScore(): NetworkQualityScore | null { return this.currentQualityScore; }
  getCurrentProfile(): VoiceOptimizationProfile | null { return this.currentProfile; }
  getAnalytics(): NetworkAnalytics { return this.analytics; }
  getConfig(): NetworkIntelligenceConfig { return this.config; }
}

// Singleton instance for global use
let engineInstance: NetworkIntelligenceEngine | null = null;

/**
 * Get or create the global network intelligence engine instance
 */
export function getNetworkIntelligenceEngine(config?: Partial<NetworkIntelligenceConfig>): NetworkIntelligenceEngine {
  if (!engineInstance) {
    engineInstance = new NetworkIntelligenceEngine(config);
  }
  return engineInstance;
}

/**
 * Reset the global engine instance (useful for testing)
 */
export function resetNetworkIntelligenceEngine(): void {
  if (engineInstance) {
    engineInstance.stop();
    engineInstance = null;
  }
}

export default NetworkIntelligenceEngine;