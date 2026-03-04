import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Dimensions,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Avatar } from "../ui/Avatar";
import type { Channel, User } from "../../lib/types";

// ============================================================================
// Types
// ============================================================================

export interface VoiceParticipant {
  id: string;
  user: User;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  isScreenSharing?: boolean;
  isVideoOn?: boolean;
  joinedAt: Date;
}

export interface VoiceState {
  isMuted: boolean;
  isDeafened: boolean;
  isConnected: boolean;
  isVideoOn?: boolean;
  isScreenSharing?: boolean;
}

interface VoiceChannelScreenProps {
  channel: Channel;
  serverName: string;
  participants: VoiceParticipant[];
  voiceState: VoiceState;
  onMuteToggle: () => void;
  onDeafenToggle: () => void;
  onDisconnect: () => void;
  onVideoToggle?: () => void;
  onScreenShareToggle?: () => void;
  onParticipantPress?: (participant: VoiceParticipant) => void;
}

interface ParticipantItemProps {
  participant: VoiceParticipant;
  isDark: boolean;
  onPress?: () => void;
}

interface VoiceControlsProps {
  voiceState: VoiceState;
  onMuteToggle: () => void;
  onDeafenToggle: () => void;
  onDisconnect: () => void;
  onVideoToggle?: () => void;
  onScreenShareToggle?: () => void;
  isDark: boolean;
}

interface VideoGridProps {
  participants: VoiceParticipant[];
  isDark: boolean;
  onParticipantPress?: (participant: VoiceParticipant) => void;
  focusedParticipantId?: string;
  onFocusParticipant?: (participantId: string | undefined) => void;
}

// ============================================================================
// Video Tile Component
// ============================================================================

interface VideoTileProps {
  participant: VoiceParticipant;
  isDark: boolean;
  isLarge?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

function VideoTile({
  participant,
  isDark,
  isLarge = false,
  onPress,
  onLongPress,
}: VideoTileProps) {
  const { user, isMuted, isSpeaking, isScreenSharing } = participant;
  const speakingScale = useSharedValue(1);

  // Animate speaking indicator
  const speakingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: speakingScale.value }],
    borderWidth: isSpeaking ? 3 : 0,
    borderColor: "#22c55e",
  }));

  // Pulse animation when speaking
  if (isSpeaking) {
    speakingScale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 300 }),
        withTiming(1, { duration: 300 })
      ),
      -1,
      true
    );
  } else {
    speakingScale.value = withSpring(1);
  }

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress}>
      <Animated.View
        style={speakingStyle}
        className={`
          rounded-2xl overflow-hidden relative
          ${isLarge ? "h-80" : "h-40"}
          ${isDark ? "bg-dark-800" : "bg-gray-200"}
        `}
      >
        {/* Mock video feed - replace with actual camera view */}
        <View className="flex-1 items-center justify-center">
          {isScreenSharing ? (
            <View className="items-center">
              <Ionicons
                name="desktop"
                size={isLarge ? 64 : 40}
                color={isDark ? "#a855f7" : "#9333ea"}
              />
              <Text
                className={`mt-2 text-sm font-medium ${
                  isDark ? "text-purple-400" : "text-purple-600"
                }`}
              >
                Screen Sharing
              </Text>
            </View>
          ) : (
            <View className="items-center">
              {/* Placeholder for camera feed */}
              <View
                className={`
                  ${isLarge ? "w-24 h-24" : "w-16 h-16"} 
                  rounded-full items-center justify-center
                  ${isDark ? "bg-dark-700" : "bg-gray-300"}
                `}
              >
                <Avatar
                  uri={user.avatar}
                  name={user.displayName || user.username}
                  size={isLarge ? "xl" : "lg"}
                />
              </View>
            </View>
          )}
        </View>

        {/* User info overlay */}
        <View className="absolute bottom-0 left-0 right-0 bg-black/60 px-3 py-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-white font-medium text-sm" numberOfLines={1}>
              {user.displayName || user.username}
            </Text>
            <View className="flex-row items-center space-x-1.5">
              {isSpeaking && (
                <View className="bg-green-500 rounded-full p-1">
                  <Ionicons name="volume-high" size={12} color="white" />
                </View>
              )}
              {isMuted && (
                <View className="bg-red-500/80 rounded-full p-1">
                  <Ionicons name="mic-off" size={12} color="white" />
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Screen share indicator */}
        {isScreenSharing && (
          <View className="absolute top-2 right-2 bg-purple-500 rounded-full px-2 py-1 flex-row items-center">
            <Ionicons name="desktop-outline" size={12} color="white" />
            <Text className="text-white text-xs ml-1 font-medium">
              Sharing
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ============================================================================
// Video Grid Component
// ============================================================================

function VideoGrid({
  participants,
  isDark,
  onParticipantPress,
  focusedParticipantId,
  onFocusParticipant,
}: VideoGridProps) {
  const { width } = Dimensions.get("window");
  const videoParticipants = participants.filter(
    (p) => p.isVideoOn || p.isScreenSharing
  );

  const focusedParticipant = focusedParticipantId
    ? videoParticipants.find((p) => p.id === focusedParticipantId)
    : null;

  const otherParticipants = focusedParticipant
    ? videoParticipants.filter((p) => p.id !== focusedParticipantId)
    : videoParticipants;

  // Grid layout logic
  const getGridColumns = (count: number): number => {
    if (count <= 1) return 1;
    if (count <= 4) return 2;
    return 3;
  };

  const tileWidth = (width - 32 - (getGridColumns(otherParticipants.length) - 1) * 8) / 
    getGridColumns(otherParticipants.length);

  if (videoParticipants.length === 0) return null;

  return (
    <Animated.View 
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      className="px-4 mb-4"
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Ionicons
            name="videocam"
            size={18}
            color="#3b82f6"
            style={{ marginRight: 6 }}
          />
          <Text
            className={`text-xs font-bold tracking-wider uppercase ${
              isDark ? "text-dark-400" : "text-gray-500"
            }`}
          >
            Video — {videoParticipants.length}
          </Text>
        </View>
        {focusedParticipant && (
          <TouchableOpacity
            onPress={() => onFocusParticipant?.(undefined)}
            className="bg-dark-700 px-2 py-1 rounded-lg"
          >
            <Text className="text-xs text-dark-300">Exit Focus</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Focused view */}
      {focusedParticipant && (
        <View className="mb-3">
          <VideoTile
            participant={focusedParticipant}
            isDark={isDark}
            isLarge
            onPress={() => onParticipantPress?.(focusedParticipant)}
          />
        </View>
      )}

      {/* Grid view */}
      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        {otherParticipants.map((participant) => (
          <View key={participant.id} style={{ width: tileWidth }}>
            <VideoTile
              participant={participant}
              isDark={isDark}
              onPress={() => onParticipantPress?.(participant)}
              onLongPress={() => onFocusParticipant?.(participant.id)}
            />
          </View>
        ))}
      </View>

      {/* Hint text */}
      {videoParticipants.length > 1 && !focusedParticipant && (
        <Text
          className={`text-xs text-center mt-2 ${
            isDark ? "text-dark-500" : "text-gray-400"
          }`}
        >
          Long press a video to focus
        </Text>
      )}
    </Animated.View>
  );
}

// ============================================================================
// Participant Item Component
// ============================================================================

function ParticipantItem({
  participant,
  isDark,
  onPress,
}: ParticipantItemProps) {
  const { user, isMuted, isDeafened, isSpeaking } = participant;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={`
        flex-row items-center px-4 py-3 mx-3 my-1 rounded-xl
        ${isSpeaking ? "bg-green-500/20 border border-green-500/50" : isDark ? "bg-dark-800" : "bg-gray-100"}
      `}
    >
      {/* Avatar with speaking indicator */}
      <View className="relative">
        <Avatar
          uri={user.avatar}
          name={user.displayName || user.username}
          size="md"
          status={user.status}
          showStatus
        />
        {isSpeaking && (
          <View className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 items-center justify-center border-2 border-dark-800">
            <Ionicons name="volume-high" size={10} color="white" />
          </View>
        )}
      </View>

      {/* User info */}
      <View className="ml-3 flex-1">
        <Text
          className={`font-semibold ${
            isSpeaking
              ? "text-green-400"
              : isDark
                ? "text-white"
                : "text-gray-900"
          }`}
          numberOfLines={1}
        >
          {user.displayName || user.username}
        </Text>
        {user.status && user.status !== "online" && (
          <Text
            className={`text-xs mt-0.5 ${
              isDark ? "text-dark-400" : "text-gray-500"
            }`}
          >
            {user.status === "idle" && "Idle"}
            {user.status === "dnd" && "Do Not Disturb"}
          </Text>
        )}
      </View>

      {/* Status icons */}
      <View className="flex-row items-center space-x-2">
        {participant.isScreenSharing && (
          <View className="bg-purple-500/20 p-1.5 rounded-lg">
            <Ionicons name="desktop-outline" size={16} color="#a855f7" />
          </View>
        )}
        {participant.isVideoOn && (
          <View className="bg-blue-500/20 p-1.5 rounded-lg">
            <Ionicons name="videocam" size={16} color="#3b82f6" />
          </View>
        )}
        {isDeafened ? (
          <View className="bg-red-500/20 p-1.5 rounded-lg">
            <Ionicons name="volume-off" size={16} color="#ef4444" />
          </View>
        ) : isMuted ? (
          <View className="bg-red-500/20 p-1.5 rounded-lg">
            <Ionicons name="mic-off" size={16} color="#ef4444" />
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// Voice Controls Component
// ============================================================================

function VoiceControls({
  voiceState,
  onMuteToggle,
  onDeafenToggle,
  onDisconnect,
  onVideoToggle,
  onScreenShareToggle,
  isDark,
}: VoiceControlsProps) {
  const { isMuted, isDeafened, isVideoOn = false, isScreenSharing = false } = voiceState;

  const ControlButton = ({
    onPress,
    isActive,
    activeColor,
    icon,
    label,
    disabled = false,
  }: {
    onPress?: () => void;
    isActive: boolean;
    activeColor: string;
    icon: string;
    label: string;
    disabled?: boolean;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
      className={`
        w-14 h-14 rounded-full items-center justify-center mx-2
        ${isActive ? `bg-${activeColor}-500/20` : isDark ? "bg-dark-700" : "bg-gray-100"}
        ${disabled ? "opacity-50" : ""}
      `}
    >
      <Ionicons
        name={icon as keyof typeof Ionicons.glyphMap}
        size={24}
        color={
          isActive
            ? activeColor === "red"
              ? "#ef4444"
              : activeColor === "blue"
                ? "#3b82f6"
                : activeColor === "purple"
                  ? "#a855f7"
                  : "#22c55e"
            : isDark
              ? "#ffffff"
              : "#374151"
        }
      />
      <Text
        className={`text-[9px] mt-0.5 ${
          isActive
            ? activeColor === "red"
              ? "text-red-400"
              : activeColor === "blue"
                ? "text-blue-400"
                : activeColor === "purple"
                  ? "text-purple-400"
                  : "text-green-400"
            : isDark
              ? "text-dark-300"
              : "text-gray-600"
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View
      className={`
        border-t px-4 py-3
        ${isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"}
      `}
    >
      {/* Main controls row */}
      <View className="flex-row items-center justify-center">
        {/* Mute Button */}
        <ControlButton
          onPress={onMuteToggle}
          isActive={isMuted}
          activeColor="red"
          icon={isMuted ? "mic-off" : "mic"}
          label={isMuted ? "Unmute" : "Mute"}
        />

        {/* Deafen Button */}
        <ControlButton
          onPress={onDeafenToggle}
          isActive={isDeafened}
          activeColor="red"
          icon={isDeafened ? "volume-off" : "volume-high"}
          label={isDeafened ? "Undeafen" : "Deafen"}
        />

        {/* Video Button */}
        {onVideoToggle && (
          <ControlButton
            onPress={onVideoToggle}
            isActive={isVideoOn}
            activeColor="blue"
            icon={isVideoOn ? "videocam" : "videocam-off"}
            label={isVideoOn ? "Stop" : "Video"}
          />
        )}

        {/* Screen Share Button */}
        {onScreenShareToggle && (
          <ControlButton
            onPress={onScreenShareToggle}
            isActive={isScreenSharing}
            activeColor="purple"
            icon="desktop-outline"
            label={isScreenSharing ? "Stop" : "Share"}
          />
        )}

        {/* Disconnect Button */}
        <TouchableOpacity
          onPress={onDisconnect}
          activeOpacity={0.7}
          className="w-14 h-14 rounded-full items-center justify-center mx-2 bg-red-500"
        >
          <Ionicons
            name="call"
            size={24}
            color="white"
            style={{ transform: [{ rotate: "135deg" }] }}
          />
          <Text className="text-[9px] mt-0.5 text-white">Leave</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyState({ isDark }: { isDark: boolean }) {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <View className="w-20 h-20 rounded-full bg-brand/20 items-center justify-center mb-4">
        <Ionicons name="volume-high-outline" size={40} color="#5865f2" />
      </View>
      <Text
        className={`text-lg font-semibold ${
          isDark ? "text-white" : "text-gray-900"
        }`}
      >
        No one else is here
      </Text>
      <Text
        className={`mt-2 text-center px-8 ${
          isDark ? "text-dark-400" : "text-gray-500"
        }`}
      >
        You&apos;re the only one in this voice channel. Invite friends to join!
      </Text>
    </View>
  );
}

// ============================================================================
// Connection Status Component
// ============================================================================

function ConnectionStatus({
  isDark,
  channelName,
  serverName,
  hasVideo,
}: {
  isDark: boolean;
  channelName: string;
  serverName: string;
  hasVideo: boolean;
}) {
  return (
    <View
      className={`
        mx-4 my-3 p-4 rounded-xl
        ${isDark ? "bg-green-500/10 border border-green-500/30" : "bg-green-50 border border-green-200"}
      `}
    >
      <View className="flex-row items-center">
        <View className="w-3 h-3 rounded-full bg-green-500 mr-3" />
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text
              className={`font-semibold ${isDark ? "text-green-400" : "text-green-700"}`}
            >
              {hasVideo ? "Video Call" : "Voice"} Connected
            </Text>
            {hasVideo && (
              <View className="ml-2 bg-blue-500/20 rounded-full px-2 py-0.5">
                <Text className="text-xs text-blue-400 font-medium">VIDEO</Text>
              </View>
            )}
          </View>
          <Text
            className={`text-sm mt-0.5 ${isDark ? "text-dark-400" : "text-gray-600"}`}
          >
            {channelName} • {serverName}
          </Text>
        </View>
        <View className="flex-row items-center">
          <View className="w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-pulse" />
          <Text
            className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            Live
          </Text>
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// Main VoiceChannelScreen Component
// ============================================================================

export function VoiceChannelScreen({
  channel,
  serverName,
  participants,
  voiceState,
  onMuteToggle,
  onDeafenToggle,
  onDisconnect,
  onVideoToggle,
  onScreenShareToggle,
  onParticipantPress,
}: VoiceChannelScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [focusedParticipantId, setFocusedParticipantId] = useState<string | undefined>();

  // Sort participants: speaking first, then by join time
  const sortedParticipants = useMemo(
    () =>
      [...participants].sort((a, b) => {
        if (a.isSpeaking !== b.isSpeaking) return a.isSpeaking ? -1 : 1;
        return a.joinedAt.getTime() - b.joinedAt.getTime();
      }),
    [participants]
  );

  // Get participants with video/screen share
  const videoParticipants = useMemo(
    () => participants.filter((p) => p.isVideoOn || p.isScreenSharing),
    [participants]
  );

  // Get audio-only participants (for list view)
  const audioOnlyParticipants = useMemo(
    () => sortedParticipants.filter((p) => !p.isVideoOn && !p.isScreenSharing),
    [sortedParticipants]
  );

  const hasVideoParticipants = videoParticipants.length > 0;

  const handleDisconnect = useCallback(() => {
    onDisconnect();
    router.back();
  }, [onDisconnect]);

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}
      edges={["left", "right", "bottom"]}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: () => (
            <View className="items-center">
              <View className="flex-row items-center">
                <Ionicons
                  name={hasVideoParticipants ? "videocam" : "volume-high"}
                  size={18}
                  color={hasVideoParticipants ? "#3b82f6" : "#5865f2"}
                  style={{ marginRight: 6 }}
                />
                <Text
                  className={`font-semibold text-base ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {channel.name}
                </Text>
              </View>
              <Text
                className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}
              >
                {participants.length}{" "}
                {participants.length === 1 ? "participant" : "participants"}
                {hasVideoParticipants && ` • ${videoParticipants.length} video`}
              </Text>
            </View>
          ),
          headerTitleAlign: "center",
          headerStyle: {
            backgroundColor: isDark ? "#1e1f22" : "#ffffff",
          },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              className="ml-2 p-1"
            >
              <Ionicons
                name="chevron-back"
                size={28}
                color={isDark ? "#80848e" : "#6b7280"}
              />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity className="mr-2 p-1">
              <Ionicons
                name="people-outline"
                size={24}
                color={isDark ? "#80848e" : "#6b7280"}
              />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Connection Status */}
      <ConnectionStatus
        isDark={isDark}
        channelName={channel.name}
        serverName={serverName}
        hasVideo={hasVideoParticipants || voiceState.isVideoOn || false}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Video Grid */}
        {hasVideoParticipants && (
          <VideoGrid
            participants={participants}
            isDark={isDark}
            onParticipantPress={onParticipantPress}
            focusedParticipantId={focusedParticipantId}
            onFocusParticipant={setFocusedParticipantId}
          />
        )}

        {/* Audio-only Participants List */}
        <View>
          <View className="flex-row items-center justify-between px-4 py-2">
            <Text
              className={`text-xs font-bold tracking-wider uppercase ${
                isDark ? "text-dark-400" : "text-gray-500"
              }`}
            >
              {hasVideoParticipants ? "Audio Only" : "In Channel"} — {audioOnlyParticipants.length}
            </Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Ionicons
                name="person-add-outline"
                size={18}
                color={isDark ? "#80848e" : "#6b7280"}
              />
            </TouchableOpacity>
          </View>

          {sortedParticipants.length === 0 ? (
            <EmptyState isDark={isDark} />
          ) : audioOnlyParticipants.length === 0 && hasVideoParticipants ? (
            <View className="px-4 py-8">
              <Text
                className={`text-center text-sm ${
                  isDark ? "text-dark-500" : "text-gray-400"
                }`}
              >
                Everyone has video on
              </Text>
            </View>
          ) : (
            audioOnlyParticipants.map((participant) => (
              <ParticipantItem
                key={participant.id}
                participant={participant}
                isDark={isDark}
                onPress={() => onParticipantPress?.(participant)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Voice Controls */}
      <VoiceControls
        voiceState={voiceState}
        onMuteToggle={onMuteToggle}
        onDeafenToggle={onDeafenToggle}
        onDisconnect={handleDisconnect}
        onVideoToggle={onVideoToggle}
        onScreenShareToggle={onScreenShareToggle}
        isDark={isDark}
      />
    </SafeAreaView>
  );
}

export default VoiceChannelScreen;
