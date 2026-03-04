import { useState, useCallback, useEffect } from "react";
import { useLocalSearchParams } from "expo-router";
import { Alert, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { Camera } from "expo-camera";
import {
  VoiceChannelScreen,
  VoiceParticipant,
  VoiceState,
} from "../../components/server/VoiceChannelScreen";
import { VoiceParticipantModal } from "../../components/server/VoiceParticipantModal";
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
    isVideoOn: true,
    joinedAt: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
  },
  {
    id: "p2",
    user: mockUsers[1],
    isMuted: true,
    isDeafened: false,
    isSpeaking: false,
    isVideoOn: true,
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
// Local Volume/Mute State per participant
// ============================================================================

interface ParticipantAudioSettings {
  volume: number;
  locallyMuted: boolean;
}

// ============================================================================
// Voice Channel Route
// ============================================================================

export default function VoiceChannelRoute() {
  const { id, serverId, serverName } = useLocalSearchParams<{
    id: string;
    serverId?: string;
    serverName?: string;
  }>();

  // Camera permission state
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  // Voice state management
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isMuted: false,
    isDeafened: false,
    isConnected: true,
    isVideoOn: false,
    isScreenSharing: false,
  });

  // Participants with video state (to track current user's video)
  const [participants, setParticipants] = useState<VoiceParticipant[]>(mockParticipants);

  // Selected participant for modal
  const [selectedParticipant, setSelectedParticipant] = useState<VoiceParticipant | null>(null);
  const [showParticipantModal, setShowParticipantModal] = useState(false);

  // Per-participant audio settings (local volume, mute for me)
  const [participantSettings, setParticipantSettings] = useState<
    Record<string, ParticipantAudioSettings>
  >({});

  // Mock channel data (replace with real data fetching)
  const channel: Channel = {
    id: id || "1",
    name: "General Voice",
    type: "voice",
    serverId: serverId || "server-1",
    position: 0,
    createdAt: new Date().toISOString(),
  };

  // Request camera permission on mount
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(status === "granted");
    })();
  }, []);

  // Handle mute toggle
  const handleMuteToggle = useCallback(() => {
    setVoiceState((prev) => ({
      ...prev,
      isMuted: !prev.isMuted,
      // When unmuting, also undeafen
      isDeafened: !prev.isMuted ? false : prev.isDeafened,
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Handle deafen toggle
  const handleDeafenToggle = useCallback(() => {
    setVoiceState((prev) => ({
      ...prev,
      isDeafened: !prev.isDeafened,
      // When deafening, also mute
      isMuted: !prev.isDeafened ? true : prev.isMuted,
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Handle video toggle
  const handleVideoToggle = useCallback(async () => {
    if (!hasCameraPermission) {
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Camera Permission Required",
          "Please enable camera access in your device settings to use video.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => {
                // On iOS, this would open settings
                // On Android, you might use Linking.openSettings()
              },
            },
          ]
        );
        return;
      }
      setHasCameraPermission(true);
    }

    setVoiceState((prev) => {
      const newVideoState = !prev.isVideoOn;
      
      // Update current user's participant video state
      setParticipants((prevParticipants) =>
        prevParticipants.map((p) =>
          p.user.id === "current" ? { ...p, isVideoOn: newVideoState } : p
        )
      );

      return {
        ...prev,
        isVideoOn: newVideoState,
        // When turning on video, turn off screen sharing
        isScreenSharing: newVideoState ? false : prev.isScreenSharing,
      };
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [hasCameraPermission]);

  // Handle screen share toggle
  const handleScreenShareToggle = useCallback(() => {
    setVoiceState((prev) => {
      const newScreenShareState = !prev.isScreenSharing;

      // Update current user's participant screen share state
      setParticipants((prevParticipants) =>
        prevParticipants.map((p) =>
          p.user.id === "current"
            ? { ...p, isScreenSharing: newScreenShareState, isVideoOn: false }
            : p
        )
      );

      return {
        ...prev,
        isScreenSharing: newScreenShareState,
        // When screen sharing, turn off video
        isVideoOn: newScreenShareState ? false : prev.isVideoOn,
      };
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Show platform-specific instructions
    if (Platform.OS === "ios" && !voiceState.isScreenSharing) {
      Alert.alert(
        "Start Screen Sharing",
        "In a real app, this would trigger the iOS screen broadcast picker. Tap the screen recording button in Control Center.",
        [{ text: "OK" }]
      );
    } else if (Platform.OS === "android" && !voiceState.isScreenSharing) {
      Alert.alert(
        "Start Screen Sharing",
        "In a real app, this would request screen capture permission and start broadcasting.",
        [{ text: "OK" }]
      );
    }
  }, [voiceState.isScreenSharing]);

  // Handle disconnect
  const handleDisconnect = useCallback(() => {
    setVoiceState((prev) => ({
      ...prev,
      isConnected: false,
      isVideoOn: false,
      isScreenSharing: false,
    }));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    console.log("Disconnecting from voice channel...");
  }, []);

  // Handle participant press - show modal
  const handleParticipantPress = useCallback((participant: VoiceParticipant) => {
    setSelectedParticipant(participant);
    setShowParticipantModal(true);
  }, []);

  // Close participant modal
  const handleCloseParticipantModal = useCallback(() => {
    setShowParticipantModal(false);
    // Delay clearing participant to allow animation
    setTimeout(() => setSelectedParticipant(null), 200);
  }, []);

  // Handle volume change for a participant
  const handleVolumeChange = useCallback((participantId: string, volume: number) => {
    setParticipantSettings((prev) => ({
      ...prev,
      [participantId]: {
        ...prev[participantId],
        volume,
        locallyMuted: prev[participantId]?.locallyMuted ?? false,
      },
    }));
    // In a real app, this would adjust the audio stream volume
    console.log(`Set volume for ${participantId} to ${Math.round(volume * 100)}%`);
  }, []);

  // Handle local mute toggle for a participant
  const handleLocalMute = useCallback((participantId: string, muted: boolean) => {
    setParticipantSettings((prev) => ({
      ...prev,
      [participantId]: {
        volume: prev[participantId]?.volume ?? 1,
        locallyMuted: muted,
      },
    }));
    // In a real app, this would mute/unmute the audio stream
    console.log(`${muted ? "Muted" : "Unmuted"} ${participantId} locally`);
  }, []);

  // Handle report
  const handleReport = useCallback((participant: VoiceParticipant, reason: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      "Report Submitted",
      `Thank you for reporting ${participant.user.displayName || participant.user.username}. Our team will review this report.`,
      [{ text: "OK" }]
    );
    // In a real app, this would submit the report to the backend
    console.log(`Reported ${participant.user.username} for: ${reason}`);
  }, []);

  // Get settings for selected participant
  const selectedSettings = selectedParticipant
    ? participantSettings[selectedParticipant.id]
    : undefined;

  // Check if selected participant is current user
  const isCurrentUser = selectedParticipant?.user.id === "current";

  return (
    <>
      <VoiceChannelScreen
        channel={channel}
        serverName={serverName || "Test Server"}
        participants={participants}
        voiceState={voiceState}
        onMuteToggle={handleMuteToggle}
        onDeafenToggle={handleDeafenToggle}
        onDisconnect={handleDisconnect}
        onVideoToggle={handleVideoToggle}
        onScreenShareToggle={handleScreenShareToggle}
        onParticipantPress={handleParticipantPress}
      />

      <VoiceParticipantModal
        visible={showParticipantModal}
        participant={selectedParticipant}
        onClose={handleCloseParticipantModal}
        onVolumeChange={handleVolumeChange}
        onLocalMute={handleLocalMute}
        onReport={handleReport}
        initialVolume={selectedSettings?.volume ?? 1}
        isLocallyMuted={selectedSettings?.locallyMuted ?? false}
        isCurrentUser={isCurrentUser}
      />
    </>
  );
}
