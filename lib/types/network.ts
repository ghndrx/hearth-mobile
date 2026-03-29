/**
 * Network Intelligence Engine Types
 * Enhanced network analysis and voice optimization types for NET-001
 */

// ============================================================================
// Enhanced Network Analysis
// ============================================================================

/** Detailed network condition analysis */
export interface NetworkConditions {
  /** Connection type */
  type: 'cellular' | 'wifi' | 'ethernet';
  /** Signal strength (0-100) */
  strength: number;
  /** Network latency in milliseconds */
  latency: number;
  /** Bandwidth measurements */
  bandwidth: {
    /** Upload bandwidth in kbps */
    up: number;
    /** Download bandwidth in kbps */
    down: number;
  };
  /** Connection stability (0-100, based on variance) */
  stability: number;
  /** Whether connection is data-limited (user preference) */
  dataLimited: boolean;
  /** Cost per MB for cellular connections */
  costPerMB?: number;
  /** Cellular technology (3G, LTE, 5G) */
  cellularTechnology?: 'edge' | '3g' | 'lte' | '5g';
  /** Wi-Fi frequency band */
  wifiFrequency?: '2.4ghz' | '5ghz' | '6ghz';
  /** Whether device is roaming */
  isRoaming?: boolean;
  /** Network congestion level (0-100) */
  congestion?: number;
  /** Timestamp of last measurement */
  timestamp: number;
}

/** Voice optimization profile for different network conditions */
export interface VoiceOptimizationProfile {
  /** Audio codec to use */
  codec: 'opus' | 'aac-eld' | 'silk';
  /** Target bitrate in kbps */
  bitrate: number;
  /** Audio frame size in milliseconds */
  frameSize: number;
  /** Encoder complexity (0-10) */
  complexity: number;
  /** Discontinuous transmission for silence detection */
  dtx: boolean;
  /** Forward error correction */
  fec: boolean;
  /** Sample rate in Hz */
  sampleRate: number;
  /** Profile description */
  description: string;
}

// ============================================================================
// Voice Quality Profiles
// ============================================================================

/** Predefined voice optimization profiles for different scenarios */
export const VoiceProfiles: Record<string, VoiceOptimizationProfile> = {
  /** Excellent Wi-Fi or strong LTE */
  PREMIUM: {
    codec: 'opus',
    bitrate: 96,
    frameSize: 20,
    sampleRate: 48000,
    complexity: 8,
    fec: true,
    dtx: false,
    description: 'Premium quality for excellent connections'
  },

  /** Good cellular connection */
  STANDARD: {
    codec: 'opus',
    bitrate: 64,
    frameSize: 20,
    sampleRate: 48000,
    complexity: 6,
    fec: true,
    dtx: true,
    description: 'Standard quality for good cellular'
  },

  /** Poor cellular or data-limited */
  EFFICIENT: {
    codec: 'silk',
    bitrate: 32,
    frameSize: 20,
    sampleRate: 24000,
    complexity: 4,
    fec: false,
    dtx: true,
    description: 'Efficient quality for limited bandwidth'
  },

  /** Very poor connection */
  SURVIVAL: {
    codec: 'silk',
    bitrate: 16,
    frameSize: 40,
    sampleRate: 16000,
    complexity: 2,
    fec: false,
    dtx: true,
    description: 'Survival mode for poor connections'
  }
};

// ============================================================================
// Network Quality Scoring
// ============================================================================

/** Network quality assessment */
export interface NetworkQuality {
  /** Overall quality score (0-100) */
  score: number;
  /** Quality category */
  category: 'excellent' | 'good' | 'fair' | 'poor';
  /** Individual component scores */
  components: {
    bandwidth: number;
    latency: number;
    stability: number;
    strength: number;
  };
  /** Recommended voice profile */
  recommendedProfile: keyof typeof VoiceProfiles;
}

// ============================================================================
// Network Transition Management
// ============================================================================

/** Network transition state */
export interface NetworkTransition {
  /** Previous network conditions */
  from: NetworkConditions;
  /** Current network conditions */
  to: NetworkConditions;
  /** Transition start time */
  startedAt: number;
  /** Transition type */
  type: 'wifi_to_cellular' | 'cellular_to_wifi' | 'quality_change' | 'provider_change';
  /** Whether transition is complete */
  isComplete: boolean;
}

// ============================================================================
// Intelligence Engine Configuration
// ============================================================================

/** Configuration for the Network Intelligence Engine */
export interface NetworkIntelligenceConfig {
  /** Monitoring interval in milliseconds */
  monitoringInterval: number;
  /** Latency measurement timeout in milliseconds */
  latencyTimeout: number;
  /** Number of samples for stability calculation */
  stabilitySamples: number;
  /** Bandwidth measurement settings */
  bandwidthTest: {
    /** Enable bandwidth testing */
    enabled: boolean;
    /** Test interval in milliseconds */
    interval: number;
    /** Test duration in milliseconds */
    duration: number;
  };
  /** Voice optimization settings */
  voiceOptimization: {
    /** Enable automatic profile switching */
    autoSwitch: boolean;
    /** Minimum time between profile changes in milliseconds */
    switchCooldown: number;
    /** Quality threshold for profile upgrades (0-100) */
    upgradeThreshold: number;
    /** Quality threshold for profile downgrades (0-100) */
    downgradeThreshold: number;
  };
}

/** Default configuration for the Network Intelligence Engine */
export const DEFAULT_NETWORK_INTELLIGENCE_CONFIG: NetworkIntelligenceConfig = {
  monitoringInterval: 5000, // 5 seconds
  latencyTimeout: 3000, // 3 seconds
  stabilitySamples: 10,
  bandwidthTest: {
    enabled: true,
    interval: 30000, // 30 seconds
    duration: 2000, // 2 seconds
  },
  voiceOptimization: {
    autoSwitch: true,
    switchCooldown: 10000, // 10 seconds
    upgradeThreshold: 80,
    downgradeThreshold: 40,
  },
};

// ============================================================================
// Data Usage Tracking
// ============================================================================

/** Data usage tracking for voice calls */
export interface VoiceDataUsage {
  /** Session ID */
  sessionId: string;
  /** Start time */
  startTime: number;
  /** End time (if session ended) */
  endTime?: number;
  /** Total bytes transmitted */
  bytesTransmitted: number;
  /** Total bytes received */
  bytesReceived: number;
  /** Average bitrate in kbps */
  averageBitrate: number;
  /** Voice profiles used during session */
  profilesUsed: Array<{
    profile: keyof typeof VoiceProfiles;
    startTime: number;
    endTime?: number;
    bytesUsed: number;
  }>;
  /** Network type during session */
  networkType: NetworkConditions['type'];
  /** Whether session was on metered connection */
  wasMetered: boolean;
  /** Estimated cost (if available) */
  estimatedCost?: number;
}

// ============================================================================
// Analytics and Telemetry
// ============================================================================

/** Network analytics data for optimization insights */
export interface NetworkAnalytics {
  /** Unique session identifier */
  sessionId: string;
  /** User identifier (anonymized) */
  userId: string;
  /** Network conditions throughout session */
  networkHistory: Array<NetworkConditions & { duration: number }>;
  /** Voice quality adjustments made */
  qualityAdjustments: Array<{
    timestamp: number;
    fromProfile: keyof typeof VoiceProfiles;
    toProfile: keyof typeof VoiceProfiles;
    reason: 'network_change' | 'quality_degradation' | 'user_preference';
    networkQuality: NetworkQuality;
  }>;
  /** User satisfaction indicators */
  satisfaction?: {
    /** User-reported quality rating (1-5) */
    qualityRating?: number;
    /** Whether user experienced issues */
    hadIssues?: boolean;
    /** Specific issues reported */
    issues?: Array<'choppy_audio' | 'high_latency' | 'dropouts' | 'poor_quality'>;
  };
}