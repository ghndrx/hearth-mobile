import React, { useCallback, useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  LayoutChangeEvent} from "react-native";
import { useColorScheme } from "../../lib/hooks/useColorScheme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Avatar } from "../ui/Avatar";
import type { Channel, VoiceParticipant, VoiceState, User } from "../../lib/types";

// ============================================================================
// Types
// ============================================================================

interface VoiceChannelBarProps {
  channel: Channel;
  serverName: string;
  participants: VoiceParticipant[];
  voiceState: VoiceState;
  currentUser: User;
  onMuteToggle: () => void;
  onDeafenToggle: () => void;
  onDisconnect: () => void;
  onExpand?: () => void;
  minimized?: boolean;
  onMinimizeToggle?: () => void;
}

interface ControlButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  isActive?: boolean;
  onPress: () => void;
  isDark: boolean;
  size?: "sm" | "md";
  activeColor?: string;
}

// ============================================================================
// Control Button Component
// ============================================================================

function ControlButton({
  icon,
  isActive,
  onPress,
  isDark,
  size = "md",
  activeColor = "#ef4444",
}: ControlButtonProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const buttonSize = size === "sm" ? "w-10 h-10" : "w-12 h-12";
  const iconSize = size === "sm" ? 20 : 24;

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      className={`
        ${buttonSize} rounded-full items-center justify-center
        ${isActive ? "bg-red-500/20" : isDark ? "bg-dark-700" : "bg-gray-100"}
      `}
    >
      <Ionicons
        name={icon}
        size={iconSize}
        color={isActive ? activeColor : isDark ? "#d1d5db" : "#4b5563"}
      />
    </TouchableOpacity>
  );
}

// ============================================================================
// Participant Avatars Component
// ============================================================================

function ParticipantAvatars({
  participants,
  maxDisplay = 3,
}: {
  participants: VoiceParticipant[];
  maxDisplay?: number;
}) {
  const displayParticipants = participants.slice(0, maxDisplay);
  const remainingCount = participants.length - maxDisplay;

  return (
    <View className="flex-row items-center">
      {displayParticipants.map((participant, index) => (
        <View
          key={participant.id}
          className="relative"
          style={{ marginLeft: index > 0 ? -8 : 0, zIndex: maxDisplay - index }}
        >
          <View
            className={`
              rounded-full border-2 
              ${participant.isSpeaking ? "border-green-500" : "border-dark-800"}
            `}
          >
            <Avatar
              uri={participant.user.avatar}
              name={participant.user.displayName || participant.user.username}
              size="xs"
            />
          </View>
          {participant.isMuted && (
            <View className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 items-center justify-center border border-dark-800">
              <Ionicons name="mic-off" size={8} color="white" />
            </View>
          )}
        </View>
      ))}
      {remainingCount > 0 && (
        <View
          className="w-7 h-7 rounded-full bg-dark-600 items-center justify-center border-2 border-dark-800"
          style={{ marginLeft: -8 }}
        >
          <Text className="text-white text-[10px] font-bold">
            +{remainingCount}
          </Text>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// Minimized Voice Bar Component
// ============================================================================

function MinimizedBar({
  channel,
  participants,
  voiceState,
  onExpand,
  onDisconnect,
  isDark,
}: {
  channel: Channel;
  participants: VoiceParticipant[];
  voiceState: VoiceState;
  onExpand: () => void;
  onDisconnect: () => void;
  isDark: boolean;
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <TouchableOpacity
      onPress={onExpand}
      activeOpacity={0.9}
      className={`
        flex-row items-center px-3 py-2 mx-4 rounded-2xl
        ${isDark ? "bg-dark-800" : "bg-white shadow-sm"}
      `}
    >
      {/* Voice indicator */}
      <View className="relative mr-2">
        <Animated.View
          style={{ transform: [{ scale: pulseAnim }] }}
          className="w-3 h-3 rounded-full bg-green-500/30 absolute -inset-1"
        />
        <View className="w-3 h-3 rounded-full bg-green-500" />
      </View>

      {/* Channel info */}
      <View className="flex-1 mr-2">
        <Text
          className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}
          numberOfLines={1}
        >
          {channel.name}
        </Text>
        <View className="flex-row items-center">
          <Text
            className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            {participants.length} {participants.length === 1 ? "user" : "users"}
          </Text>
          {voiceState.isMuted && (
            <View className="flex-row items-center ml-2">
              <Ionicons name="mic-off" size={10} color="#ef4444" />
            </View>
          )}
          {voiceState.isDeafened && (
            <View className="flex-row items-center ml-1">
              <Ionicons name="volume-off" size={10} color="#ef4444" />
            </View>
          )}
        </View>
      </View>

      {/* Participant avatars */}
      <ParticipantAvatars participants={participants} maxDisplay={2} />

      {/* Quick disconnect */}
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onDisconnect();
        }}
        activeOpacity={0.7}
        className="ml-3 w-8 h-8 rounded-full bg-red-500 items-center justify-center"
      >
        <Ionicons
          name="call"
          size={16}
          color="white"
          style={{ transform: [{ rotate: "135deg" }] }}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ============================================================================
// Main VoiceChannelBar Component
// ============================================================================

export function VoiceChannelBar({
  channel,
  serverName,
  participants,
  voiceState,
  currentUser,
  onMuteToggle,
  onDeafenToggle,
  onDisconnect,
  onExpand,
  minimized = false,
  onMinimizeToggle,
}: VoiceChannelBarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [_barHeight, _setBarHeight] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const { width: _screenWidth } = Dimensions.get("window");

  // Find current user's participant info
  const currentParticipant = participants.find(
    (p) => p.user.id === currentUser.id
  );
  const isSpeaking = currentParticipant?.isSpeaking ?? false;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
  }, [slideAnim]);

  const handleLayout = (event: LayoutChangeEvent) => {
    _setBarHeight(event.nativeEvent.layout.height);
  };

  const handleExpand = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onExpand) {
      onExpand();
    } else {
      router.push(`/voice/${channel.id}`);
    }
  }, [channel.id, onExpand]);

  const handleDisconnect = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDisconnect();
  }, [onDisconnect]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -50 && onMinimizeToggle) {
          onMinimizeToggle();
        }
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  if (!voiceState.isConnected) {
    return null;
  }

  if (minimized) {
    return (
      <MinimizedBar
        channel={channel}
        participants={participants}
        voiceState={voiceState}
        onExpand={handleExpand}
        onDisconnect={handleDisconnect}
        isDark={isDark}
      />
    );
  }

  return (
    <Animated.View
      onLayout={handleLayout}
      style={{ transform: [{ translateY: slideAnim }] }}
      {...panResponder.panHandlers}
      className={`
        mx-4 rounded-2xl overflow-hidden
        ${isDark ? "bg-dark-800" : "bg-white shadow-lg"}
      `}
    >
      {/* Voice Status Header */}
      <TouchableOpacity
        onPress={handleExpand}
        activeOpacity={0.8}
        className={`
          flex-row items-center px-4 py-3 border-b
          ${isDark ? "border-dark-700" : "border-gray-100"}
        `}
      >
        {/* Speaking indicator */}
        <View
          className={`
            w-10 h-10 rounded-full items-center justify-center mr-3
            ${isSpeaking ? "bg-green-500/20" : isDark ? "bg-dark-700" : "bg-gray-100"}
          `}
        >
          <Ionicons
            name="volume-high"
            size={20}
            color={isSpeaking ? "#22c55e" : "#5865f2"}
          />
        </View>

        {/* Channel info */}
        <View className="flex-1">
          <View className="flex-row items-center">
            <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />
            <Text
              className={`font-semibold ${isDark ? "text-green-400" : "text-green-600"}`}
            >
              Voice Connected
            </Text>
          </View>
          <Text
            className={`text-sm mt-0.5 ${isDark ? "text-dark-400" : "text-gray-500"}`}
            numberOfLines={1}
          >
            {channel.name} • {serverName}
          </Text>
        </View>

        {/* Expand indicator */}
        <Ionicons
          name="chevron-up"
          size={20}
          color={isDark ? "#6b7280" : "#9ca3af"}
        />
      </TouchableOpacity>

      {/* Participants Preview */}
      <View className="px-4 py-3">
        <View className="flex-row items-center justify-between mb-2">
          <Text
            className={`text-xs font-bold tracking-wider uppercase ${
              isDark ? "text-dark-500" : "text-gray-400"
            }`}
          >
            In Channel — {participants.length}
          </Text>
          <TouchableOpacity onPress={handleExpand}>
            <Text className="text-xs text-brand font-medium">View All</Text>
          </TouchableOpacity>
        </View>
        <ParticipantAvatars participants={participants} maxDisplay={5} />
      </View>

      {/* Voice Controls */}
      <View
        className={`
          flex-row items-center justify-center px-4 py-3 border-t
          ${isDark ? "border-dark-700" : "border-gray-100"}
        `}
      >
        <ControlButton
          icon={voiceState.isMuted ? "mic-off" : "mic"}
          isActive={voiceState.isMuted}
          onPress={onMuteToggle}
          isDark={isDark}
        />
        <View className="w-3" />
        <ControlButton
          icon={voiceState.isDeafened ? "volume-off" : "volume-high"}
          isActive={voiceState.isDeafened}
          onPress={onDeafenToggle}
          isDark={isDark}
        />
        <View className="w-3" />
        <TouchableOpacity
          onPress={handleDisconnect}
          activeOpacity={0.7}
          className="w-12 h-12 rounded-full bg-red-500 items-center justify-center"
        >
          <Ionicons
            name="call"
            size={24}
            color="white"
            style={{ transform: [{ rotate: "135deg" }] }}
          />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export default VoiceChannelBar;
