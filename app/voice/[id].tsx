import { useState, useCallback } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  VoiceChannelScreen,
  VoiceParticipant,
  VoiceState,
} from "../../components/server/VoiceChannelScreen";
import type { Channel, User } from "../../lib/types";

// ============================================================================
// Mock Data (replace with real API data)
// ============================================================================

const mockUsers: User[] = [
  {
    id: "1",
    username: "alex_dev",
    displayName: "Alex Chen",
    email: "alex@example.com",
    status: "online",
  },
  {
    id: "2",
    username: "sarah_j",
    displayName: "Sarah Johnson",
    email: "sarah@example.com",
    status: "online",
  },
  {
    id: "3",
    username: "mike_wilson",
    displayName: "Mike Wilson",
    email: "mike@example.com",
    status: "idle",
  },
  {
    id: "current",
    username: "you",
    displayName: "You",
    email: "you@example.com",
    status: "online",
  },
];

const mockParticipants: VoiceParticipant[] = [
  {
    id: "p1",
    user: mockUsers[0],
    isMuted: false,
    isDeafened: false,
    isSpeaking: true,
    joinedAt: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
  },
  {
    id: "p2",
    user: mockUsers[1],
    isMuted: true,
    isDeafened: false,
    isSpeaking: false,
    joinedAt: new Date(Date.now() - 1000 * 60 * 10), // 10 mins ago
  },
  {
    id: "p3",
    user: mockUsers[2],
    isMuted: false,
    isDeafened: true,
    isSpeaking: false,
    isScreenSharing: true,
    joinedAt: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
  },
  {
    id: "p4",
    user: mockUsers[3],
    isMuted: false,
    isDeafened: false,
    isSpeaking: false,
    joinedAt: new Date(), // Just joined
  },
];

// ============================================================================
// Voice Channel Route
// ============================================================================

export default function VoiceChannelRoute() {
  const { id, serverId, serverName } = useLocalSearchParams<{
    id: string;
    serverId?: string;
    serverName?: string;
  }>();

  // Voice state management
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isMuted: false,
    isDeafened: false,
    isConnected: true,
  });

  // Mock channel data (replace with real data fetching)
  const channel: Channel = {
    id: id || "1",
    name: "General Voice",
    type: "voice",
    serverId: serverId || "server-1",
    position: 0,
    createdAt: new Date().toISOString(),
  };

  // Handle mute toggle
  const handleMuteToggle = useCallback(() => {
    setVoiceState((prev) => ({
      ...prev,
      isMuted: !prev.isMuted,
      // When unmuting, also undeafen
      isDeafened: !prev.isMuted ? false : prev.isDeafened,
    }));
  }, []);

  // Handle deafen toggle
  const handleDeafenToggle = useCallback(() => {
    setVoiceState((prev) => ({
      ...prev,
      isDeafened: !prev.isDeafened,
      // When deafening, also mute
      isMuted: !prev.isDeafened ? true : prev.isMuted,
    }));
  }, []);

  // Handle disconnect
  const handleDisconnect = useCallback(() => {
    setVoiceState((prev) => ({
      ...prev,
      isConnected: false,
    }));
    // TODO: Clean up voice connection
    console.log("Disconnecting from voice channel...");
  }, []);

  // Handle participant press
  const handleParticipantPress = useCallback((participant: VoiceParticipant) => {
    console.log("Participant pressed:", participant.user.displayName);
    // TODO: Show participant options modal (view profile, adjust volume, etc.)
  }, []);

  return (
    <VoiceChannelScreen
      channel={channel}
      serverName={serverName || "Test Server"}
      participants={mockParticipants}
      voiceState={voiceState}
      onMuteToggle={handleMuteToggle}
      onDeafenToggle={handleDeafenToggle}
      onDisconnect={handleDisconnect}
      onParticipantPress={handleParticipantPress}
    />
  );
}
