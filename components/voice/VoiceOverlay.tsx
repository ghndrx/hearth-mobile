import React from "react";
import { View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVoice } from "../../lib/contexts/VoiceContext";
import { VoiceChannelBar } from "./VoiceChannelBar";
import type { User } from "../../lib/types";

// ============================================================================
// Types
// ============================================================================

interface VoiceOverlayProps {
  currentUser: User;
  bottomOffset?: number;
}

// ============================================================================
// Voice Overlay Component
// ============================================================================

/**
 * Global voice overlay that shows at the bottom of the screen
 * when connected to a voice channel.
 *
 * Place this in your root layout to have it appear across all screens.
 */
export function VoiceOverlay({ currentUser, bottomOffset = 0 }: VoiceOverlayProps) {
  const {
    isConnected,
    currentChannel,
    participants,
    voiceState,
    toggleMute,
    toggleDeafen,
    leaveChannel,
    isMinimized,
    setMinimized,
  } = useVoice();

  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  if (!isConnected || !currentChannel) {
    return null;
  }

  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: bottomOffset + insets.bottom,
        zIndex: 1000,
      }}
      className={isDark ? "bg-dark-900/95" : "bg-white/95"}
    >
      <VoiceChannelBar
        channel={currentChannel.channel}
        serverName={currentChannel.serverName}
        participants={participants}
        voiceState={voiceState}
        currentUser={currentUser}
        onMuteToggle={toggleMute}
        onDeafenToggle={toggleDeafen}
        onDisconnect={leaveChannel}
        minimized={isMinimized}
        onMinimizeToggle={() => setMinimized(!isMinimized)}
      />
    </View>
  );
}

export default VoiceOverlay;
