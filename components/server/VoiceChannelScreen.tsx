import { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
}

interface VoiceChannelScreenProps {
  channel: Channel;
  serverName: string;
  participants: VoiceParticipant[];
  voiceState: VoiceState;
  onMuteToggle: () => void;
  onDeafenToggle: () => void;
  onDisconnect: () => void;
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
  isDark: boolean;
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
  isDark,
}: VoiceControlsProps) {
  const { isMuted, isDeafened } = voiceState;

  return (
    <View
      className={`
        flex-row items-center justify-center px-6 py-4 border-t
        ${isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"}
      `}
    >
      {/* Mute Button */}
      <TouchableOpacity
        onPress={onMuteToggle}
        activeOpacity={0.7}
        className={`
          w-16 h-16 rounded-full items-center justify-center mx-3
          ${isMuted ? "bg-red-500/20" : isDark ? "bg-dark-700" : "bg-gray-100"}
        `}
      >
        <Ionicons
          name={isMuted ? "mic-off" : "mic"}
          size={28}
          color={isMuted ? "#ef4444" : isDark ? "#ffffff" : "#374151"}
        />
        <Text
          className={`text-[10px] mt-1 ${
            isMuted
              ? "text-red-400"
              : isDark
                ? "text-dark-300"
                : "text-gray-600"
          }`}
        >
          {isMuted ? "Unmute" : "Mute"}
        </Text>
      </TouchableOpacity>

      {/* Deafen Button */}
      <TouchableOpacity
        onPress={onDeafenToggle}
        activeOpacity={0.7}
        className={`
          w-16 h-16 rounded-full items-center justify-center mx-3
          ${isDeafened ? "bg-red-500/20" : isDark ? "bg-dark-700" : "bg-gray-100"}
        `}
      >
        <Ionicons
          name={isDeafened ? "volume-off" : "volume-high"}
          size={28}
          color={isDeafened ? "#ef4444" : isDark ? "#ffffff" : "#374151"}
        />
        <Text
          className={`text-[10px] mt-1 ${
            isDeafened
              ? "text-red-400"
              : isDark
                ? "text-dark-300"
                : "text-gray-600"
          }`}
        >
          {isDeafened ? "Undeafen" : "Deafen"}
        </Text>
      </TouchableOpacity>

      {/* Disconnect Button */}
      <TouchableOpacity
        onPress={onDisconnect}
        activeOpacity={0.7}
        className="w-16 h-16 rounded-full items-center justify-center mx-3 bg-red-500"
      >
        <Ionicons
          name="call"
          size={28}
          color="white"
          style={{ transform: [{ rotate: "135deg" }] }}
        />
        <Text className="text-[10px] mt-1 text-white">Leave</Text>
      </TouchableOpacity>
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
}: {
  isDark: boolean;
  channelName: string;
  serverName: string;
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
          <Text
            className={`font-semibold ${isDark ? "text-green-400" : "text-green-700"}`}
          >
            Voice Connected
          </Text>
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
  onParticipantPress,
}: VoiceChannelScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Sort participants: speaking first, then by join time
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.isSpeaking !== b.isSpeaking) return a.isSpeaking ? -1 : 1;
    return a.joinedAt.getTime() - b.joinedAt.getTime();
  });

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
                  name="volume-high"
                  size={18}
                  color="#5865f2"
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
      />

      {/* Participants List */}
      <View className="flex-1">
        <View className="flex-row items-center justify-between px-4 py-2">
          <Text
            className={`text-xs font-bold tracking-wider uppercase ${
              isDark ? "text-dark-400" : "text-gray-500"
            }`}
          >
            In Channel — {participants.length}
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
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {sortedParticipants.map((participant) => (
              <ParticipantItem
                key={participant.id}
                participant={participant}
                isDark={isDark}
                onPress={() => onParticipantPress?.(participant)}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Voice Controls */}
      <VoiceControls
        voiceState={voiceState}
        onMuteToggle={onMuteToggle}
        onDeafenToggle={onDeafenToggle}
        onDisconnect={handleDisconnect}
        isDark={isDark}
      />
    </SafeAreaView>
  );
}

export default VoiceChannelScreen;
