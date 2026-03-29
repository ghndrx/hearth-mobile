/**
 * Network Intelligence Engine Types
 * Defines interfaces and types for NET-001: Network Intelligence Engine
 * Part of mobile-first voice optimization system
 */

/** Network connection type */
export type NetworkType = 'cellular' | 'wifi' | 'ethernet' | 'unknown';

/** Cellular technology generation */
export type CellularGeneration = '2G' | '3G' | '4G' | '5G' | 'unknown';

/** Voice codec options for optimization */
export type VoiceCodec = 'opus' | 'aac-eld' | 'silk';

/** Network conditions analysis data */
export interface NetworkConditions {
  /** Connection type (cellular, wifi, etc.) */
  type: NetworkType;
  /** Signal strength percentage (0-100) */
  strength: number;
  /** Round-trip latency in milliseconds */
  latency: number;
  /** Available bandwidth */
  bandwidth: {
    /** Upload speed in kbps */
    up: number;
    /** Download speed in kbps */
    down: number;
  };
  /** Connection stability score (0-100, based on variance) */
  stability: number;
  /** Whether user has data usage limits */
  dataLimited: boolean;
  /** Cost per MB for cellular (optional) */
  costPerMB?: number;
  /** Cellular-specific information */
  cellular?: {
    /** Technology generation (2G, 3G, 4G, 5G) */
    generation: CellularGeneration;
    /** Network operator name */
    carrier?: string;
    /** Whether connection is roaming */
    isRoaming: boolean;
    /** Signal bars (1-5) */
    signalBars: number;
  };
  /** Wi-Fi specific information */
  wifi?: {
    /** Network SSID */
    ssid?: string;
    /** Signal strength in dBm */
    rssi: number;
    /** Frequency band (2.4GHz or 5GHz) */
    frequency?: number;
  };
  /** Timestamp of measurement */
  timestamp: number;
}

/** Voice optimization profile based on network conditions */
export interface VoiceOptimizationProfile {
  /** Selected voice codec */
  codec: VoiceCodec;
  /** Target bitrate in kbps */
  bitrate: number;
  /** Audio frame size in milliseconds */
  frameSize: number;
  /** Encoding complexity (0-10) */
  complexity: number;
  /** Discontinuous transmission enabled */
  dtx: boolean;
  /** Forward error correction enabled */
  fec: boolean;
  /** Sample rate in Hz */
  sampleRate: number;
  /** Profile name for debugging */
  profileName: string;
}

/** Predefined voice quality profiles */
export interface VoiceQualityProfiles {
  /** Excellent Wi-Fi or strong LTE */
  PREMIUM: VoiceOptimizationProfile;
  /** Good cellular connection */
  STANDARD: VoiceOptimizationProfile;
  /** Poor cellular or data-limited */
  EFFICIENT: VoiceOptimizationProfile;
  /** Very poor connection */
  SURVIVAL: VoiceOptimizationProfile;
}

/** Network transition types */
export type NetworkTransition =
  | 'wifi_to_cellular'
  | 'cellular_to_wifi'
  | 'weak_signal'
  | 'network_loss'
  | 'quality_change';

/** Network transition event */
export interface NetworkTransitionEvent {
  /** Type of transition */
  type: NetworkTransition;
  /** Previous network conditions */
  from: NetworkConditions;
  /** New network conditions */
  to: NetworkConditions;
  /** Timestamp of transition */
  timestamp: number;
  /** Predicted duration of transition */
  predictedDurationMs?: number;
}

/** Network quality score breakdown */
export interface NetworkQualityScore {
  /** Overall quality score (0-100) */
  overall: number;
  /** Individual component scores */
  components: {
    /** Signal strength score (0-100) */
    strength: number;
    /** Latency score (0-100) */
    latency: number;
    /** Bandwidth score (0-100) */
    bandwidth: number;
    /** Stability score (0-100) */
    stability: number;
  };
  /** Recommended voice profile */
  recommendedProfile: keyof VoiceQualityProfiles;
  /** Quality assessment level */
  level: 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor';
}

/** Network intelligence analytics data */
export interface NetworkAnalytics {
  /** Data usage tracking */
  dataUsage: {
    /** Cellular data used in current session (bytes) */
    cellular: number;
    /** Wi-Fi data used in current session (bytes) */
    wifi: number;
    /** Estimated cost for cellular usage */
    estimatedCost?: number;
  };
  /** Voice session metrics */
  voiceMetrics: {
    /** Voice quality score (1-5) */
    qualityScore?: number;
    /** Packet loss percentage */
    packetLoss: number;
    /** Jitter in milliseconds */
    jitter: number;
    /** Current codec in use */
    activeCodec: VoiceCodec;
    /** Current bitrate */
    activeBitrate: number;
  };
  /** Battery impact */
  batteryImpact: {
    /** Additional battery drain percentage */
    additionalDrainPercent: number;
    /** Processing complexity level */
    processingComplexity: number;
  };
  /** Session information */
  session: {
    /** Session start time */
    startTime: number;
    /** Number of network transitions */
    transitionCount: number;
    /** Average quality score */
    averageQuality: number;
  };
}

/** Network intelligence engine configuration */
export interface NetworkIntelligenceConfig {
  /** Enable/disable the intelligence engine */
  enabled: boolean;
  /** Monitoring interval in milliseconds */
  monitoringIntervalMs: number;
  /** Quality assessment interval in milliseconds */
  qualityAssessmentIntervalMs: number;
  /** Enable data usage tracking */
  trackDataUsage: boolean;
  /** Enable battery optimization */
  batteryOptimization: boolean;
  /** Minimum quality threshold for profile switching */
  qualitySwitchThreshold: number;
  /** Enable predictive network management */
  predictiveManagement: boolean;
}

/** Default voice quality profiles as defined in PRD */
export const VOICE_QUALITY_PROFILES: VoiceQualityProfiles = {
  PREMIUM: {
    codec: 'opus',
    bitrate: 96,
    frameSize: 20,
    sampleRate: 48000,
    complexity: 8,
    fec: true,
    dtx: false,
    profileName: 'Premium'
  },
  STANDARD: {
    codec: 'opus',
    bitrate: 64,
    frameSize: 20,
    sampleRate: 48000,
    complexity: 6,
    fec: true,
    dtx: true,
    profileName: 'Standard'
  },
  EFFICIENT: {
    codec: 'silk',
    bitrate: 32,
    frameSize: 20,
    sampleRate: 24000,
    complexity: 4,
    fec: false,
    dtx: true,
    profileName: 'Efficient'
  },
  SURVIVAL: {
    codec: 'silk',
    bitrate: 16,
    frameSize: 20,
    sampleRate: 16000,
    complexity: 2,
    fec: false,
    dtx: true,
    profileName: 'Survival'
  }
};

/** Default network intelligence configuration */
export const DEFAULT_NETWORK_INTELLIGENCE_CONFIG: NetworkIntelligenceConfig = {
  enabled: true,
  monitoringIntervalMs: 1000,
  qualityAssessmentIntervalMs: 5000,
  trackDataUsage: true,
  batteryOptimization: true,
  qualitySwitchThreshold: 15, // 15 point quality difference to switch profiles
  predictiveManagement: true
};