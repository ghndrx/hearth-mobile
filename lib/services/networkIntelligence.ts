/**
 * Network Intelligence Engine Service (NET-001)
 * Real-time network analysis and voice optimization for mobile platforms
 */

import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import {
  VoiceProfiles,
  DEFAULT_NETWORK_INTELLIGENCE_CONFIG,
} from "../types/network";
import type {
  NetworkConditions,
  VoiceOptimizationProfile,
  NetworkQuality,
  NetworkTransition,
  NetworkIntelligenceConfig,
  VoiceDataUsage,
  NetworkAnalytics,
} from "../types/network";

// ============================================================================
// Network Intelligence Engine Class
// ============================================================================

export class NetworkIntelligenceEngine {
  private config: NetworkIntelligenceConfig;
  private currentConditions: NetworkConditions | null = null;
  private previousConditions: NetworkConditions | null = null;
  private latencyHistory: number[] = [];
  private stabilityHistory: NetworkConditions[] = [];
  private currentProfile: keyof typeof VoiceProfiles = 'STANDARD';
  private lastProfileChange = 0;
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private bandwidthTestInterval: NodeJS.Timeout | null = null;
  private dataUsageTracking: Map<string, VoiceDataUsage> = new Map();

  // Event listeners
  private listeners: {
    networkChange: Array<(conditions: NetworkConditions) => void>;
    profileChange: Array<(profile: keyof typeof VoiceProfiles, reason: string) => void>;
    transitionStart: Array<(transition: NetworkTransition) => void>;
    transitionComplete: Array<(transition: NetworkTransition) => void>;
  } = {
    networkChange: [],
    profileChange: [],
    transitionStart: [],
    transitionComplete: [],
  };

  constructor(config?: Partial<NetworkIntelligenceConfig>) {
    this.config = {
      ...DEFAULT_NETWORK_INTELLIGENCE_CONFIG,
      ...config,
    };
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Start network monitoring and intelligence analysis
   */
  public async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;

    // Initial network analysis
    await this.analyzeCurrentNetwork();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.analyzeCurrentNetwork();
    }, this.config.monitoringInterval);

    // Set up bandwidth testing if enabled
    if (this.config.bandwidthTest.enabled) {
      this.bandwidthTestInterval = setInterval(async () => {
        await this.performBandwidthTest();
      }, this.config.bandwidthTest.interval);
    }

    console.log('[NetworkIntelligenceEngine] Started monitoring');
  }

  /**
   * Stop network monitoring
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.bandwidthTestInterval) {
      clearInterval(this.bandwidthTestInterval);
      this.bandwidthTestInterval = null;
    }

    console.log('[NetworkIntelligenceEngine] Stopped monitoring');
  }

  /**
   * Get current network conditions
   */
  public getCurrentConditions(): NetworkConditions | null {
    return this.currentConditions;
  }

  /**
   * Get current recommended voice profile
   */
  public getCurrentProfile(): keyof typeof VoiceProfiles {
    return this.currentProfile;
  }

  /**
   * Get current network quality assessment
   */
  public getNetworkQuality(): NetworkQuality | null {
    if (!this.currentConditions) {
      return null;
    }

    return this.calculateNetworkQuality(this.currentConditions);
  }

  /**
   * Manually trigger network analysis
   */
  public async refreshAnalysis(): Promise<NetworkConditions | null> {
    return await this.analyzeCurrentNetwork();
  }

  /**
   * Get optimal voice profile for current network conditions
   */
  public getOptimalVoiceProfile(): VoiceOptimizationProfile | null {
    if (!this.currentConditions) {
      return null;
    }

    const profileKey = this.selectOptimalProfile(this.currentConditions);
    return VoiceProfiles[profileKey];
  }

  // ============================================================================
  // Event Management
  // ============================================================================

  public addEventListener<T extends keyof typeof this.listeners>(
    event: T,
    callback: typeof this.listeners[T][0]
  ): void {
    this.listeners[event].push(callback as any);
  }

  public removeEventListener<T extends keyof typeof this.listeners>(
    event: T,
    callback: typeof this.listeners[T][0]
  ): void {
    const index = this.listeners[event].indexOf(callback as any);
    if (index > -1) {
      this.listeners[event].splice(index, 1);
    }
  }

  // ============================================================================
  // Network Analysis
  // ============================================================================

  private async analyzeCurrentNetwork(): Promise<NetworkConditions | null> {
    try {
      const netInfoState = await NetInfo.fetch();
      const conditions = await this.parseNetworkConditions(netInfoState);

      this.previousConditions = this.currentConditions;
      this.currentConditions = conditions;

      // Update history
      this.updateStabilityHistory(conditions);

      // Detect transitions
      if (this.previousConditions && this.detectNetworkTransition(this.previousConditions, conditions)) {
        await this.handleNetworkTransition(this.previousConditions, conditions);
      }

      // Update voice profile if needed
      await this.updateVoiceProfile(conditions);

      // Notify listeners
      this.listeners.networkChange.forEach(callback => callback(conditions));

      return conditions;
    } catch (error) {
      console.error('[NetworkIntelligenceEngine] Failed to analyze network:', error);
      return null;
    }
  }

  private async parseNetworkConditions(state: NetInfoState): Promise<NetworkConditions> {
    const conditions: NetworkConditions = {
      type: this.mapNetworkType(state.type),
      strength: this.calculateSignalStrength(state),
      latency: await this.measureLatency(),
      bandwidth: await this.estimateBandwidth(state),
      stability: this.calculateStability(),
      dataLimited: state.details?.isConnectionExpensive ?? false,
      timestamp: Date.now(),
    };

    // Add cellular-specific information
    if (conditions.type === 'cellular' && state.details) {
      const cellularDetails = state.details as any;
      conditions.cellularTechnology = this.mapCellularTechnology(cellularDetails.cellularGeneration);
      conditions.isRoaming = cellularDetails.isRoaming;
    }

    // Add Wi-Fi specific information
    if (conditions.type === 'wifi' && state.details) {
      const wifiDetails = state.details as any;
      conditions.wifiFrequency = this.mapWifiFrequency(wifiDetails.frequency);
    }

    return conditions;
  }

  private mapNetworkType(type: string): NetworkConditions['type'] {
    switch (type.toLowerCase()) {
      case 'wifi':
        return 'wifi';
      case 'cellular':
      case 'mobile':
        return 'cellular';
      case 'ethernet':
        return 'ethernet';
      default:
        return 'cellular'; // Default fallback
    }
  }

  private calculateSignalStrength(state: NetInfoState): number {
    if (!state.isConnected) {
      return 0;
    }

    // Basic strength calculation based on NetInfo details
    if (state.details) {
      const details = state.details as any;

      if (details.strength !== undefined) {
        return Math.round(details.strength * 100);
      }

      if (details.signalStrength !== undefined) {
        return Math.round(details.signalStrength * 100);
      }
    }

    // Default to good signal if connected but no details
    return 85;
  }

  private async measureLatency(): Promise<number> {
    const startTime = Date.now();

    try {
      // Use a lightweight ping-like request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.latencyTimeout);

      await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache',
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;

      // Update latency history
      this.latencyHistory.push(latency);
      if (this.latencyHistory.length > 10) {
        this.latencyHistory.shift();
      }

      return latency;
    } catch (error) {
      // Return a penalty latency for failed requests
      return this.config.latencyTimeout;
    }
  }

  private async estimateBandwidth(state: NetInfoState): Promise<{ up: number; down: number }> {
    // Basic bandwidth estimation based on network type
    // In production, this could use actual speed tests

    const defaultBandwidth = { up: 100, down: 500 }; // kbps

    if (!state.isConnected) {
      return { up: 0, down: 0 };
    }

    switch (state.type) {
      case 'wifi':
        return { up: 1000, down: 5000 }; // Assume good Wi-Fi
      case 'cellular':
        const details = state.details as any;
        if (details?.cellularGeneration) {
          switch (details.cellularGeneration) {
            case '5g':
              return { up: 2000, down: 10000 };
            case '4g':
            case 'lte':
              return { up: 500, down: 2000 };
            case '3g':
              return { up: 100, down: 500 };
            case '2g':
              return { up: 50, down: 100 };
            default:
              return { up: 200, down: 1000 };
          }
        }
        return { up: 300, down: 1000 }; // Default cellular
      case 'ethernet':
        return { up: 5000, down: 20000 }; // Assume good ethernet
      default:
        return defaultBandwidth;
    }
  }

  private calculateStability(): number {
    if (this.stabilityHistory.length < 2) {
      return 100; // Not enough data, assume stable
    }

    // Calculate variance in latency and signal strength
    const latencyVariance = this.calculateVariance(
      this.stabilityHistory.slice(-5).map(c => c.latency)
    );
    const strengthVariance = this.calculateVariance(
      this.stabilityHistory.slice(-5).map(c => c.strength)
    );

    // Convert variance to stability score (0-100)
    const latencyStability = Math.max(0, 100 - (latencyVariance / 10));
    const strengthStability = Math.max(0, 100 - (strengthVariance * 2));

    return Math.round((latencyStability + strengthStability) / 2);
  }

  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private mapCellularTechnology(generation?: string): NetworkConditions['cellularTechnology'] {
    if (!generation) return undefined;

    switch (generation.toLowerCase()) {
      case '5g':
        return '5g';
      case '4g':
      case 'lte':
        return 'lte';
      case '3g':
        return '3g';
      case '2g':
      case 'edge':
      case 'gprs':
        return 'edge';
      default:
        return 'lte';
    }
  }

  private mapWifiFrequency(frequency?: number): NetworkConditions['wifiFrequency'] {
    if (!frequency) return undefined;

    if (frequency >= 5000 && frequency <= 6000) {
      return '5ghz';
    } else if (frequency >= 6000) {
      return '6ghz';
    } else {
      return '2.4ghz';
    }
  }

  // ============================================================================
  // Voice Profile Optimization
  // ============================================================================

  private selectOptimalProfile(conditions: NetworkConditions): keyof typeof VoiceProfiles {
    const quality = this.calculateNetworkQuality(conditions);

    // Consider data limitations
    if (conditions.dataLimited || conditions.costPerMB) {
      if (quality.score < 30) {
        return 'SURVIVAL';
      } else if (quality.score < 60) {
        return 'EFFICIENT';
      } else {
        return 'STANDARD';
      }
    }

    // Regular quality-based selection
    if (quality.score >= 85) {
      return 'PREMIUM';
    } else if (quality.score >= 65) {
      return 'STANDARD';
    } else if (quality.score >= 35) {
      return 'EFFICIENT';
    } else {
      return 'SURVIVAL';
    }
  }

  private calculateNetworkQuality(conditions: NetworkConditions): NetworkQuality {
    // Score bandwidth (0-100)
    const bandwidthScore = Math.min(100, (conditions.bandwidth.down / 1000) * 50);

    // Score latency (0-100, lower is better)
    const latencyScore = Math.max(0, 100 - (conditions.latency / 10));

    // Score signal strength (0-100)
    const strengthScore = conditions.strength;

    // Score stability (0-100)
    const stabilityScore = conditions.stability;

    // Weighted overall score
    const overallScore = Math.round(
      bandwidthScore * 0.3 +
      latencyScore * 0.3 +
      strengthScore * 0.2 +
      stabilityScore * 0.2
    );

    // Determine category
    let category: NetworkQuality['category'];
    if (overallScore >= 85) {
      category = 'excellent';
    } else if (overallScore >= 65) {
      category = 'good';
    } else if (overallScore >= 35) {
      category = 'fair';
    } else {
      category = 'poor';
    }

    // Determine recommended profile directly from score to avoid circular call
    let recommendedProfile: keyof typeof VoiceProfiles;
    if (conditions.dataLimited || conditions.costPerMB) {
      if (overallScore < 30) {
        recommendedProfile = 'SURVIVAL';
      } else if (overallScore < 60) {
        recommendedProfile = 'EFFICIENT';
      } else {
        recommendedProfile = 'STANDARD';
      }
    } else if (overallScore >= 85) {
      recommendedProfile = 'PREMIUM';
    } else if (overallScore >= 65) {
      recommendedProfile = 'STANDARD';
    } else if (overallScore >= 35) {
      recommendedProfile = 'EFFICIENT';
    } else {
      recommendedProfile = 'SURVIVAL';
    }

    return {
      score: overallScore,
      category,
      components: {
        bandwidth: bandwidthScore,
        latency: latencyScore,
        stability: stabilityScore,
        strength: strengthScore,
      },
      recommendedProfile,
    };
  }

  private async updateVoiceProfile(conditions: NetworkConditions): Promise<void> {
    if (!this.config.voiceOptimization.autoSwitch) {
      return;
    }

    const currentTime = Date.now();
    const timeSinceLastChange = currentTime - this.lastProfileChange;

    // Respect cooldown period
    if (timeSinceLastChange < this.config.voiceOptimization.switchCooldown) {
      return;
    }

    const optimalProfile = this.selectOptimalProfile(conditions);
    const quality = this.calculateNetworkQuality(conditions);

    // Only switch if there's a significant quality change
    const shouldUpgrade = quality.score > this.config.voiceOptimization.upgradeThreshold &&
      this.isProfileUpgrade(this.currentProfile, optimalProfile);

    const shouldDowngrade = quality.score < this.config.voiceOptimization.downgradeThreshold &&
      this.isProfileDowngrade(this.currentProfile, optimalProfile);

    if (shouldUpgrade || shouldDowngrade || this.currentProfile !== optimalProfile) {
      const previousProfile = this.currentProfile;
      this.currentProfile = optimalProfile;
      this.lastProfileChange = currentTime;

      const reason = shouldUpgrade ? 'quality_improvement' :
                     shouldDowngrade ? 'quality_degradation' :
                     'network_change';

      console.log(`[NetworkIntelligenceEngine] Profile changed: ${previousProfile} → ${optimalProfile} (${reason})`);

      // Notify listeners
      this.listeners.profileChange.forEach(callback =>
        callback(optimalProfile, reason)
      );
    }
  }

  private isProfileUpgrade(current: keyof typeof VoiceProfiles, target: keyof typeof VoiceProfiles): boolean {
    const profileOrder = ['SURVIVAL', 'EFFICIENT', 'STANDARD', 'PREMIUM'];
    return profileOrder.indexOf(target) > profileOrder.indexOf(current);
  }

  private isProfileDowngrade(current: keyof typeof VoiceProfiles, target: keyof typeof VoiceProfiles): boolean {
    const profileOrder = ['SURVIVAL', 'EFFICIENT', 'STANDARD', 'PREMIUM'];
    return profileOrder.indexOf(target) < profileOrder.indexOf(current);
  }

  // ============================================================================
  // Network Transition Handling
  // ============================================================================

  private detectNetworkTransition(
    previous: NetworkConditions,
    current: NetworkConditions
  ): boolean {
    // Type change (Wi-Fi ↔ Cellular)
    if (previous.type !== current.type) {
      return true;
    }

    // Significant quality change
    const previousQuality = this.calculateNetworkQuality(previous);
    const currentQuality = this.calculateNetworkQuality(current);
    const qualityDelta = Math.abs(previousQuality.score - currentQuality.score);

    return qualityDelta > 20; // Significant quality change threshold
  }

  private async handleNetworkTransition(
    from: NetworkConditions,
    to: NetworkConditions
  ): Promise<void> {
    const transition: NetworkTransition = {
      from,
      to,
      startedAt: Date.now(),
      type: this.getTransitionType(from, to),
      isComplete: false,
    };

    console.log(`[NetworkIntelligenceEngine] Network transition detected: ${transition.type}`);

    // Notify transition start
    this.listeners.transitionStart.forEach(callback => callback(transition));

    // Handle specific transition types
    switch (transition.type) {
      case 'wifi_to_cellular':
        await this.handleWifiToCellularTransition(transition);
        break;
      case 'cellular_to_wifi':
        await this.handleCellularToWifiTransition(transition);
        break;
      case 'quality_change':
        await this.handleQualityChangeTransition(transition);
        break;
    }

    // Mark transition complete
    transition.isComplete = true;
    this.listeners.transitionComplete.forEach(callback => callback(transition));
  }

  private getTransitionType(
    from: NetworkConditions,
    to: NetworkConditions
  ): NetworkTransition['type'] {
    if (from.type === 'wifi' && to.type === 'cellular') {
      return 'wifi_to_cellular';
    } else if (from.type === 'cellular' && to.type === 'wifi') {
      return 'cellular_to_wifi';
    } else if (from.type === to.type) {
      return 'quality_change';
    } else {
      return 'provider_change';
    }
  }

  private async handleWifiToCellularTransition(transition: NetworkTransition): Promise<void> {
    // Preemptively reduce quality to handle cellular limitations
    const cellularProfile = this.selectOptimalProfile(transition.to);
    console.log(`[NetworkIntelligenceEngine] Wi-Fi → Cellular: switching to ${cellularProfile}`);
  }

  private async handleCellularToWifiTransition(transition: NetworkTransition): Promise<void> {
    // Gradually increase quality to prevent stuttering
    const wifiProfile = this.selectOptimalProfile(transition.to);
    console.log(`[NetworkIntelligenceEngine] Cellular → Wi-Fi: upgrading to ${wifiProfile}`);
  }

  private async handleQualityChangeTransition(transition: NetworkTransition): Promise<void> {
    // Handle quality changes within the same network type
    const newProfile = this.selectOptimalProfile(transition.to);
    console.log(`[NetworkIntelligenceEngine] Quality change: switching to ${newProfile}`);
  }

  // ============================================================================
  // Bandwidth Testing
  // ============================================================================

  private async performBandwidthTest(): Promise<void> {
    if (!this.currentConditions) {
      return;
    }

    try {
      const testStart = Date.now();
      const testSize = 100 * 1024; // 100 KB test

      // Simple download test using a small resource
      const response = await fetch('https://httpbin.org/bytes/' + testSize, {
        cache: 'no-cache',
      });

      if (response.ok) {
        const testDuration = (Date.now() - testStart) / 1000; // seconds
        const throughputKbps = (testSize * 8) / (testDuration * 1024); // kbps

        // Update bandwidth estimate
        this.currentConditions.bandwidth.down = Math.round(throughputKbps);

        console.log(`[NetworkIntelligenceEngine] Bandwidth test: ${throughputKbps.toFixed(1)} kbps`);
      }
    } catch (error) {
      console.warn('[NetworkIntelligenceEngine] Bandwidth test failed:', error);
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private updateStabilityHistory(conditions: NetworkConditions): void {
    this.stabilityHistory.push(conditions);

    // Keep only the last N samples for stability calculation
    if (this.stabilityHistory.length > this.config.stabilitySamples) {
      this.stabilityHistory.shift();
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let networkIntelligenceInstance: NetworkIntelligenceEngine | null = null;

/**
 * Get the singleton NetworkIntelligenceEngine instance
 */
export function getNetworkIntelligenceEngine(
  config?: Partial<NetworkIntelligenceConfig>
): NetworkIntelligenceEngine {
  if (!networkIntelligenceInstance) {
    networkIntelligenceInstance = new NetworkIntelligenceEngine(config);
  }
  return networkIntelligenceInstance;
}

export default NetworkIntelligenceEngine;