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

// ============================================================================
// Types
// ============================================================================

interface VoiceChannel {
  channel: Channel;
  serverName: string;
  serverId: string;
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

  // Connection quality
  connectionQuality: "excellent" | "good" | "poor" | "disconnected";
  latency: number;
}

const defaultVoiceState: VoiceState = {
  isMuted: false,
  isDeafened: false,
  isConnected: false,
};

// ============================================================================
// Context
// ============================================================================

const VoiceContext = createContext<VoiceContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface VoiceProviderProps {
  children: ReactNode;
  currentUser: User;
}

export function VoiceProvider({ children, currentUser }: VoiceProviderProps) {
  const [currentChannel, setCurrentChannel] = useState<VoiceChannel | null>(null);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [voiceState, setVoiceState] = useState<VoiceState>(defaultVoiceState);
  const [isMinimized, setMinimized] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<
    "excellent" | "good" | "poor" | "disconnected"
  >("disconnected");
  const [latency, setLatency] = useState(0);

  // Local participant settings (volume, mute)
  const participantSettings = useRef<Map<string, { volume: number; muted: boolean }>>(
    new Map()
  );

  // Simulated connection (in production, this would be WebRTC)
  const connectionRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setConnectionQuality("excellent");
      setLatency(45);

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
        // Remove self if already in list, then add
        const filtered = prev.filter((p) => p.user.id !== currentUser.id);
        return [...filtered, selfParticipant];
      });

      // Simulate other participants (demo data)
      // In production, this would come from the voice server
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
    },
    [currentChannel, currentUser]
  );

  const leaveChannel = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    if (connectionRef.current) {
      clearInterval(connectionRef.current);
      connectionRef.current = null;
    }

    setCurrentChannel(null);
    setParticipants([]);
    setVoiceState(defaultVoiceState);
    setConnectionQuality("disconnected");
    setLatency(0);
    setMinimized(false);
  }, []);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (connectionRef.current) {
        clearInterval(connectionRef.current);
      }
    };
  }, []);

  const value: VoiceContextValue = {
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
    connectionQuality,
    latency,
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
