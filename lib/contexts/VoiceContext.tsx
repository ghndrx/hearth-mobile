import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import * as Haptics from "expo-haptics";
import type { Channel, VoiceParticipant, VoiceState, User } from "../types";
import type {
  NetworkConditions,
  VoiceOptimizationProfile,
  NetworkQuality,
} from "../types/network";
import { VoiceProfiles } from "../types/network";
import { useNetworkIntelligence } from "../hooks/useNetworkStatus";

// ============================================================================
// Enhanced Types for NET-001
// ============================================================================

interface VoiceChannel {
  channel: Channel;
  serverName: string;
  serverId: string;
}

interface VoiceQualityMetrics {
  /** Current bitrate in kbps */
  bitrate: number;
  /** Current codec being used */
  codec: string;
  /** Packet loss percentage (0-100) */
  packetLoss: number;
  /** Audio quality score (0-100) */
  audioQuality: number;
  /** Whether adaptive optimization is active */
  isAdaptiveOptimizationActive: boolean;
  /** Data usage for current session in KB */
  dataUsage: number;
}

interface VoiceContextValue {
  // Connection state
  isConnected: boolean;
  currentChannel: VoiceChannel | null;
  participants: VoiceParticipant[];
  voiceState: VoiceState;

  // Actions
  joinChannel: (channel: Channel, serverName: string, serverId: string) => Promise<void>;
  leaveChannel: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;

  // Participant management
  setParticipantVolume: (participantId: string, volume: number) => void;
  setParticipantLocalMute: (participantId: string, muted: boolean) => void;

  // UI state
  isMinimized: boolean;
  setMinimized: (minimized: boolean) => void;

  // Enhanced connection quality (NET-001)
  connectionQuality: "excellent" | "good" | "poor" | "disconnected";
  latency: number;
  networkConditions: NetworkConditions | null;
  networkQuality: NetworkQuality | null;
  voiceProfile: VoiceOptimizationProfile | null;
  voiceProfileKey: keyof typeof VoiceProfiles | null;
  voiceQualityMetrics: VoiceQualityMetrics;

  // Adaptive optimization controls
  isAdaptiveOptimizationEnabled: boolean;
  enableAdaptiveOptimization: () => void;
  disableAdaptiveOptimization: () => void;
  forceVoiceProfile: (profile: keyof typeof VoiceProfiles) => void;
}

const defaultVoiceState: VoiceState = {
  isMuted: false,
  isDeafened: false,
  isConnected: false,
};

const defaultVoiceQualityMetrics: VoiceQualityMetrics = {
  bitrate: 64,
  codec: 'opus',
  packetLoss: 0,
  audioQuality: 85,
  isAdaptiveOptimizationActive: false,
  dataUsage: 0,
};

// ============================================================================
// Context
// ============================================================================

const VoiceContext = createContext<VoiceContextValue | null>(null);

// ============================================================================
// Enhanced Provider with Network Intelligence
// ============================================================================

interface VoiceProviderProps {
  children: ReactNode;
  currentUser: User;
}

export function VoiceProvider({ children, currentUser }: VoiceProviderProps) {
  // Basic voice state
  const [currentChannel, setCurrentChannel] = useState<VoiceChannel | null>(null);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [voiceState, setVoiceState] = useState<VoiceState>(defaultVoiceState);
  const [isMinimized, setMinimized] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<
    "excellent" | "good" | "poor" | "disconnected"
  >("disconnected");
  const [latency, setLatency] = useState(0);

  // Enhanced voice optimization state (NET-001)
  const [isAdaptiveOptimizationEnabled, setIsAdaptiveOptimizationEnabled] = useState(true);
  const [voiceQualityMetrics, setVoiceQualityMetrics] = useState<VoiceQualityMetrics>(
    defaultVoiceQualityMetrics
  );
  const [forcedProfile, setForcedProfile] = useState<keyof typeof VoiceProfiles | null>(null);

  // Network intelligence integration
  const {
    conditions: networkConditions,
    quality: networkQuality,
    voiceProfile,
    voiceProfileKey,
    isActive: isIntelligenceActive
  } = useNetworkIntelligence({
    voiceOptimization: {
      autoSwitch: isAdaptiveOptimizationEnabled && !forcedProfile,
      switchCooldown: 5000, // 5 seconds cooldown for voice calls
      upgradeThreshold: 80,
      downgradeThreshold: 50,
    }
  });

  // Refs
  const participantSettings = useRef<Map<string, { volume: number; muted: boolean }>>(
    new Map()
  );
  const connectionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataUsageTracker = useRef({ startTime: 0, totalBytes: 0 });
  const profileChangeLogRef = useRef<Array<{
    timestamp: number;
    from: string;
    to: string;
    reason: string;
  }>>([]);

  // ============================================================================
  // Voice Profile Management
  // ============================================================================

  const applyVoiceProfile = useCallback((profile: VoiceOptimizationProfile, profileKey: keyof typeof VoiceProfiles, reason: string = 'automatic') => {
    if (!voiceState.isConnected) {
      return;
    }

    console.log(`[VoiceContext] Applying voice profile: ${profileKey} (${reason})`);

    // Update voice quality metrics
    setVoiceQualityMetrics(prev => ({
      ...prev,
      bitrate: profile.bitrate,
      codec: profile.codec,
      isAdaptiveOptimizationActive: isAdaptiveOptimizationEnabled && !forcedProfile,
    }));

    // Log profile changes for analytics
    profileChangeLogRef.current.push({
      timestamp: Date.now(),
      from: voiceQualityMetrics.codec,
      to: profile.codec,
      reason,
    });

    // Keep only last 10 changes
    if (profileChangeLogRef.current.length > 10) {
      profileChangeLogRef.current.shift();
    }

    // In a real implementation, this would configure the WebRTC connection
    // For now, we simulate the effect on connection quality
    updateConnectionQualityFromProfile(profile, networkConditions);
  }, [voiceState.isConnected, isAdaptiveOptimizationEnabled, forcedProfile, voiceQualityMetrics.codec, networkConditions]);

  const updateConnectionQualityFromProfile = useCallback((
    profile: VoiceOptimizationProfile,
    conditions: NetworkConditions | null
  ) => {
    if (!conditions) {
      return;
    }

    // Simulate connection quality based on profile and network conditions
    let qualityScore = 0;

    if (profile.codec === 'opus' && conditions.bandwidth.down > 500) {
      qualityScore = 90;
    } else if (profile.codec === 'silk' && conditions.bandwidth.down > 200) {
      qualityScore = 75;
    } else if (conditions.bandwidth.down > 100) {
      qualityScore = 60;
    } else {
      qualityScore = 30;
    }

    // Adjust for latency
    if (conditions.latency > 200) {
      qualityScore -= 20;
    } else if (conditions.latency > 100) {
      qualityScore -= 10;
    }

    // Update connection quality
    if (qualityScore >= 85) {
      setConnectionQuality("excellent");
    } else if (qualityScore >= 65) {
      setConnectionQuality("good");
    } else {
      setConnectionQuality("poor");
    }

    // Update latency from network conditions
    setLatency(conditions.latency);

    // Update audio quality metric
    setVoiceQualityMetrics(prev => ({
      ...prev,
      audioQuality: qualityScore,
      packetLoss: Math.max(0, (200 - conditions.stability) / 20), // Simulate packet loss from instability
    }));
  }, []);

  // ============================================================================
  // Network Intelligence Integration
  // ============================================================================

  // Auto-apply voice profiles based on network intelligence
  useEffect(() => {
    if (!voiceProfile || !voiceProfileKey || !voiceState.isConnected) {
      return;
    }

    // Don't auto-apply if user has forced a profile
    if (forcedProfile) {
      return;
    }

    // Don't auto-apply if adaptive optimization is disabled
    if (!isAdaptiveOptimizationEnabled) {
      return;
    }

    applyVoiceProfile(voiceProfile, voiceProfileKey, 'network_adaptation');
  }, [voiceProfile, voiceProfileKey, voiceState.isConnected, forcedProfile, isAdaptiveOptimizationEnabled, applyVoiceProfile]);

  // ============================================================================
  // Data Usage Tracking
  // ============================================================================

  useEffect(() => {
    if (!voiceState.isConnected) {
      return;
    }

    // Start tracking data usage
    dataUsageTracker.current.startTime = Date.now();
    dataUsageTracker.current.totalBytes = 0;

    // Simulate data usage calculation based on current profile
    const dataTrackingInterval = setInterval(() => {
      const currentProfile = voiceProfile || VoiceProfiles.STANDARD;
      const bitrateKbps = currentProfile.bitrate;
      const bytesPerSecond = (bitrateKbps * 1024) / 8; // Convert kbps to bytes per second

      dataUsageTracker.current.totalBytes += bytesPerSecond;

      setVoiceQualityMetrics(prev => ({
        ...prev,
        dataUsage: Math.round(dataUsageTracker.current.totalBytes / 1024), // Convert to KB
      }));
    }, 1000);

    return () => {
      clearInterval(dataTrackingInterval);
    };
  }, [voiceState.isConnected, voiceProfile]);

  // ============================================================================
  // Core Voice Functions (Enhanced)
  // ============================================================================

  const joinChannel = useCallback(
    async (channel: Channel, serverName: string, serverId: string) => {
      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Leave current channel if connected
      if (currentChannel) {
        setParticipants((prev) =>
          prev.filter((p) => p.user.id !== currentUser.id)
        );
      }

      // Set new channel
      setCurrentChannel({ channel, serverName, serverId });
      setVoiceState({
        isMuted: false,
        isDeafened: false,
        isConnected: true,
      });

      // Initialize with standard quality, network intelligence will optimize
      setConnectionQuality("good");
      setLatency(50);

      // Reset data usage tracking
      dataUsageTracker.current = { startTime: Date.now(), totalBytes: 0 };

      // Apply initial voice profile based on current network conditions
      const initialProfile = voiceProfile || VoiceProfiles.STANDARD;
      const initialProfileKey = voiceProfileKey || 'STANDARD';
      applyVoiceProfile(initialProfile, initialProfileKey, 'initial_connection');

      // Add self to participants
      const selfParticipant: VoiceParticipant = {
        id: `participant-${currentUser.id}`,
        user: currentUser,
        isMuted: false,
        isDeafened: false,
        isSpeaking: false,
        joinedAt: new Date(),
      };

      setParticipants((prev) => {
        const filtered = prev.filter((p) => p.user.id !== currentUser.id);
        return [...filtered, selfParticipant];
      });

      // Simulate other participants (demo data)
      setTimeout(() => {
        setParticipants((prev) => {
          if (prev.length <= 1) {
            return [
              ...prev,
              {
                id: "demo-1",
                user: {
                  id: "user-demo-1",
                  username: "alice",
                  displayName: "Alice",
                  email: "alice@example.com",
                  status: "online" as const,
                },
                isMuted: false,
                isDeafened: false,
                isSpeaking: false,
                joinedAt: new Date(Date.now() - 300000),
              },
              {
                id: "demo-2",
                user: {
                  id: "user-demo-2",
                  username: "bob",
                  displayName: "Bob",
                  email: "bob@example.com",
                  status: "online" as const,
                },
                isMuted: true,
                isDeafened: false,
                isSpeaking: false,
                joinedAt: new Date(Date.now() - 600000),
              },
            ];
          }
          return prev;
        });
      }, 500);

      // Simulate speaking indicators
      connectionRef.current = setInterval(() => {
        setParticipants((prev) =>
          prev.map((p) => ({
            ...p,
            isSpeaking: p.user.id !== currentUser.id && Math.random() > 0.7,
          }))
        );
      }, 2000);

      console.log(`[VoiceContext] Joined channel: ${channel.name} with network intelligence ${isIntelligenceActive ? 'enabled' : 'disabled'}`);
    },
    [currentChannel, currentUser, voiceProfile, voiceProfileKey, applyVoiceProfile, isIntelligenceActive]
  );

  const leaveChannel = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    if (connectionRef.current) {
      clearInterval(connectionRef.current);
      connectionRef.current = null;
    }

    // Log session summary
    const sessionDuration = (Date.now() - dataUsageTracker.current.startTime) / 1000;
    const totalDataKB = voiceQualityMetrics.dataUsage;
    console.log(`[VoiceContext] Session ended. Duration: ${sessionDuration}s, Data usage: ${totalDataKB}KB`);

    setCurrentChannel(null);
    setParticipants([]);
    setVoiceState(defaultVoiceState);
    setConnectionQuality("disconnected");
    setLatency(0);
    setMinimized(false);
    setVoiceQualityMetrics(defaultVoiceQualityMetrics);
    setForcedProfile(null); // Reset forced profile on disconnect
  }, [voiceQualityMetrics.dataUsage]);

  const toggleMute = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVoiceState((prev) => {
      const newMuted = !prev.isMuted;
      // Update self in participants
      setParticipants((participants) =>
        participants.map((p) =>
          p.user.id === currentUser.id ? { ...p, isMuted: newMuted } : p
        )
      );
      return { ...prev, isMuted: newMuted };
    });
  }, [currentUser.id]);

  const toggleDeafen = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVoiceState((prev) => {
      const newDeafened = !prev.isDeafened;
      // If deafening, also mute
      const newMuted = newDeafened ? true : prev.isMuted;
      // Update self in participants
      setParticipants((participants) =>
        participants.map((p) =>
          p.user.id === currentUser.id
            ? { ...p, isMuted: newMuted, isDeafened: newDeafened }
            : p
        )
      );
      return { ...prev, isMuted: newMuted, isDeafened: newDeafened };
    });
  }, [currentUser.id]);

  const setParticipantVolume = useCallback(
    (participantId: string, volume: number) => {
      const settings = participantSettings.current.get(participantId) || {
        volume: 1,
        muted: false,
      };
      participantSettings.current.set(participantId, { ...settings, volume });
    },
    []
  );

  const setParticipantLocalMute = useCallback(
    (participantId: string, muted: boolean) => {
      const settings = participantSettings.current.get(participantId) || {
        volume: 1,
        muted: false,
      };
      participantSettings.current.set(participantId, { ...settings, muted });
    },
    []
  );

  // ============================================================================
  // Adaptive Optimization Controls
  // ============================================================================

  const enableAdaptiveOptimization = useCallback(() => {
    setIsAdaptiveOptimizationEnabled(true);
    setForcedProfile(null); // Clear any forced profile
    console.log('[VoiceContext] Adaptive optimization enabled');
  }, []);

  const disableAdaptiveOptimization = useCallback(() => {
    setIsAdaptiveOptimizationEnabled(false);
    console.log('[VoiceContext] Adaptive optimization disabled');
  }, []);

  const forceVoiceProfile = useCallback((profile: keyof typeof VoiceProfiles) => {
    setForcedProfile(profile);
    const profileConfig = VoiceProfiles[profile];
    applyVoiceProfile(profileConfig, profile, 'user_forced');
    console.log(`[VoiceContext] Voice profile forced to: ${profile}`);
  }, [applyVoiceProfile]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (connectionRef.current) {
        clearInterval(connectionRef.current);
      }
    };
  }, []);

  // ============================================================================
  // Context Value
  // ============================================================================

  const value: VoiceContextValue = {
    // Basic voice state
    isConnected: voiceState.isConnected,
    currentChannel,
    participants,
    voiceState,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleDeafen,
    setParticipantVolume,
    setParticipantLocalMute,
    isMinimized,
    setMinimized,

    // Enhanced connection quality (NET-001)
    connectionQuality,
    latency,
    networkConditions,
    networkQuality,
    voiceProfile: forcedProfile ? VoiceProfiles[forcedProfile] : voiceProfile,
    voiceProfileKey: forcedProfile || voiceProfileKey,
    voiceQualityMetrics,

    // Adaptive optimization controls
    isAdaptiveOptimizationEnabled,
    enableAdaptiveOptimization,
    disableAdaptiveOptimization,
    forceVoiceProfile,
  };

  return (
    <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useVoice() {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error("useVoice must be used within a VoiceProvider");
  }
  return context;
}

export default VoiceContext;
