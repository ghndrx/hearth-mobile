import React, { useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity} from "react-native";
import { useColorScheme } from "../../lib/hooks/useColorScheme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Avatar } from "../ui/Avatar";
import type { Channel, VoiceParticipant, VoiceState } from "../../lib/types";

// ============================================================================
// Types
// ============================================================================

interface VoiceChannelPreviewProps {
  channel: Channel;
  participants: VoiceParticipant[];
  currentVoiceState?: VoiceState | null;
  isConnectedToChannel?: boolean;
  onJoin: (channel: Channel) => void;
  onLeave?: () => void;
  onPress?: (channel: Channel) => void;
  showJoinButton?: boolean;
  compact?: boolean;
}

interface ParticipantRowProps {
  participant: VoiceParticipant;
  isDark: boolean;
  onPress?: () => void;
}

// ============================================================================
// Participant Row Component
// ============================================================================

function ParticipantRow({ participant, isDark, onPress }: ParticipantRowProps) {
  const { user, isMuted, isDeafened, isSpeaking, isScreenSharing, isVideoOn } =
    participant;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
      className={`
        flex-row items-center py-1.5 pl-8 pr-3
        ${onPress ? "active:bg-dark-700/50" : ""}
      `}
    >
      {/* Avatar with speaking glow */}
      <View className="relative">
        <View
          className={`
            rounded-full 
            ${isSpeaking ? "ring-2 ring-green-500 ring-offset-1 ring-offset-dark-800" : ""}
          `}
        >
          <Avatar
            uri={user.avatar}
            name={user.displayName || user.username}
            size="xs"
            status={user.status}
          />
        </View>
        {isSpeaking && (
          <View className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 items-center justify-center border border-dark-800">
            <Ionicons name="volume-high" size={7} color="white" />
          </View>
        )}
      </View>

      {/* Username */}
      <Text
        className={`
          flex-1 ml-2 text-sm
          ${isSpeaking ? "text-green-400 font-medium" : isDark ? "text-dark-300" : "text-gray-600"}
        `}
        numberOfLines={1}
      >
        {user.displayName || user.username}
      </Text>

      {/* Status icons */}
      <View className="flex-row items-center space-x-1">
        {isScreenSharing && (
          <Ionicons name="desktop-outline" size={12} color="#a855f7" />
        )}
        {isVideoOn && (
          <Ionicons name="videocam" size={12} color="#3b82f6" />
        )}
        {isDeafened ? (
          <Ionicons name="volume-off" size={12} color="#ef4444" />
        ) : isMuted ? (
          <Ionicons name="mic-off" size={12} color="#ef4444" />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// Join Button Component
// ============================================================================

function JoinButton({
  onPress,
  isDark,
  isConnected,
}: {
  onPress: () => void;
  isDark: boolean;
  isConnected: boolean;
}) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  if (isConnected) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        className="flex-row items-center px-3 py-1.5 rounded-full bg-red-500/20"
      >
        <Ionicons
          name="call"
          size={14}
          color="#ef4444"
          style={{ transform: [{ rotate: "135deg" }] }}
        />
        <Text className="text-red-400 text-xs font-semibold ml-1.5">Leave</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      className={`
        flex-row items-center px-3 py-1.5 rounded-full
        ${isDark ? "bg-green-500/20" : "bg-green-100"}
      `}
    >
      <Ionicons name="enter-outline" size={14} color="#22c55e" />
      <Text className="text-green-500 text-xs font-semibold ml-1.5">Join</Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyParticipants({ isDark }: { isDark: boolean }) {
  return (
    <View className="py-2 pl-8 pr-3">
      <Text
        className={`text-xs italic ${isDark ? "text-dark-500" : "text-gray-400"}`}
      >
        No one in voice
      </Text>
    </View>
  );
}

// ============================================================================
// Compact Voice Channel Preview (for channel list)
// ============================================================================

function CompactPreview({
  channel,
  participants,
  isConnectedToChannel,
  onJoin,
  onLeave,
  onPress,
  showJoinButton,
  isDark,
}: VoiceChannelPreviewProps & { isDark: boolean }) {
  const handlePress = useCallback(() => {
    if (onPress) {
      onPress(channel);
    }
  }, [channel, onPress]);

  const handleJoinLeave = useCallback(() => {
    if (isConnectedToChannel && onLeave) {
      onLeave();
    } else {
      onJoin(channel);
    }
  }, [channel, isConnectedToChannel, onJoin, onLeave]);

  return (
    <View>
      {/* Channel Header */}
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        className={`
          flex-row items-center px-4 py-2.5 mx-2 rounded-lg
          ${isConnectedToChannel ? (isDark ? "bg-green-500/10" : "bg-green-50") : ""}
        `}
      >
        <Ionicons
          name="volume-high-outline"
          size={20}
          color={isConnectedToChannel ? "#22c55e" : isDark ? "#80848e" : "#6b7280"}
        />
        <Text
          className={`ml-3 flex-1 ${
            isConnectedToChannel
              ? "text-green-500 font-medium"
              : isDark
                ? "text-dark-200"
                : "text-gray-700"
          }`}
        >
          {channel.name}
        </Text>

        {/* Participant count badge */}
        {participants.length > 0 && (
          <View
            className={`
              px-2 py-0.5 rounded-full mr-2
              ${isDark ? "bg-dark-700" : "bg-gray-100"}
            `}
          >
            <Text
              className={`text-xs font-medium ${
                isDark ? "text-dark-300" : "text-gray-600"
              }`}
            >
              {participants.length}
            </Text>
          </View>
        )}

        {/* Join/Leave button */}
        {showJoinButton && (
          <JoinButton
            onPress={handleJoinLeave}
            isDark={isDark}
            isConnected={isConnectedToChannel ?? false}
          />
        )}
      </TouchableOpacity>

      {/* Participants list */}
      {participants.length > 0 && (
        <View className="ml-4">
          {participants.slice(0, 5).map((participant) => (
            <ParticipantRow
              key={participant.id}
              participant={participant}
              isDark={isDark}
            />
          ))}
          {participants.length > 5 && (
            <TouchableOpacity
              onPress={handlePress}
              className="py-1.5 pl-8 pr-3"
            >
              <Text className="text-xs text-brand font-medium">
                +{participants.length - 5} more
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// Main VoiceChannelPreview Component
// ============================================================================

export function VoiceChannelPreview({
  channel,
  participants,
  currentVoiceState,
  isConnectedToChannel = false,
  onJoin,
  onLeave,
  onPress,
  showJoinButton = true,
  compact = false,
}: VoiceChannelPreviewProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress(channel);
    }
  }, [channel, onPress]);

  const handleJoinLeave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isConnectedToChannel && onLeave) {
      onLeave();
    } else {
      onJoin(channel);
    }
  }, [channel, isConnectedToChannel, onJoin, onLeave]);

  // Sort participants: speaking first
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.isSpeaking !== b.isSpeaking) return a.isSpeaking ? -1 : 1;
    return a.joinedAt.getTime() - b.joinedAt.getTime();
  });

  if (compact) {
    return (
      <CompactPreview
        channel={channel}
        participants={sortedParticipants}
        isConnectedToChannel={isConnectedToChannel}
        onJoin={onJoin}
        onLeave={onLeave}
        onPress={onPress}
        showJoinButton={showJoinButton}
        isDark={isDark}
      />
    );
  }

  return (
    <View
      className={`
        mx-3 my-1.5 rounded-xl overflow-hidden
        ${isConnectedToChannel 
          ? isDark ? "bg-green-500/10 border border-green-500/30" : "bg-green-50 border border-green-200"
          : isDark ? "bg-dark-800" : "bg-white shadow-sm"
        }
      `}
    >
      {/* Channel Header */}
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        className={`
          flex-row items-center px-4 py-3 border-b
          ${isDark ? "border-dark-700" : "border-gray-100"}
        `}
      >
        <View
          className={`
            w-9 h-9 rounded-full items-center justify-center mr-3
            ${isConnectedToChannel 
              ? "bg-green-500/20" 
              : isDark ? "bg-dark-700" : "bg-gray-100"
            }
          `}
        >
          <Ionicons
            name="volume-high"
            size={18}
            color={isConnectedToChannel ? "#22c55e" : "#5865f2"}
          />
        </View>

        <View className="flex-1">
          <Text
            className={`font-semibold ${
              isConnectedToChannel
                ? "text-green-500"
                : isDark
                  ? "text-white"
                  : "text-gray-900"
            }`}
          >
            {channel.name}
          </Text>
          <View className="flex-row items-center mt-0.5">
            {isConnectedToChannel && (
              <>
                <View className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
                <Text className="text-xs text-green-500 font-medium mr-2">
                  Connected
                </Text>
              </>
            )}
            <Text
              className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}
            >
              {participants.length} {participants.length === 1 ? "user" : "users"}
            </Text>
          </View>
        </View>

        {showJoinButton && (
          <JoinButton
            onPress={handleJoinLeave}
            isDark={isDark}
            isConnected={isConnectedToChannel}
          />
        )}
      </TouchableOpacity>

      {/* Participants List */}
      <View className="py-2">
        {sortedParticipants.length === 0 ? (
          <EmptyParticipants isDark={isDark} />
        ) : (
          sortedParticipants.map((participant) => (
            <ParticipantRow
              key={participant.id}
              participant={participant}
              isDark={isDark}
            />
          ))
        )}
      </View>

      {/* Quick Controls (when connected) */}
      {isConnectedToChannel && currentVoiceState && (
        <View
          className={`
            flex-row items-center justify-center px-4 py-2 border-t
            ${isDark ? "border-dark-700" : "border-gray-100"}
          `}
        >
          <TouchableOpacity
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            className={`
              flex-row items-center px-4 py-2 rounded-full mr-2
              ${currentVoiceState.isMuted ? "bg-red-500/20" : isDark ? "bg-dark-700" : "bg-gray-100"}
            `}
          >
            <Ionicons
              name={currentVoiceState.isMuted ? "mic-off" : "mic"}
              size={16}
              color={currentVoiceState.isMuted ? "#ef4444" : isDark ? "#d1d5db" : "#4b5563"}
            />
            <Text
              className={`ml-1.5 text-xs font-medium ${
                currentVoiceState.isMuted
                  ? "text-red-400"
                  : isDark
                    ? "text-dark-300"
                    : "text-gray-600"
              }`}
            >
              {currentVoiceState.isMuted ? "Unmute" : "Mute"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            className={`
              flex-row items-center px-4 py-2 rounded-full
              ${currentVoiceState.isDeafened ? "bg-red-500/20" : isDark ? "bg-dark-700" : "bg-gray-100"}
            `}
          >
            <Ionicons
              name={currentVoiceState.isDeafened ? "volume-off" : "volume-high"}
              size={16}
              color={currentVoiceState.isDeafened ? "#ef4444" : isDark ? "#d1d5db" : "#4b5563"}
            />
            <Text
              className={`ml-1.5 text-xs font-medium ${
                currentVoiceState.isDeafened
                  ? "text-red-400"
                  : isDark
                    ? "text-dark-300"
                    : "text-gray-600"
              }`}
            >
              {currentVoiceState.isDeafened ? "Undeafen" : "Deafen"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default VoiceChannelPreview;
