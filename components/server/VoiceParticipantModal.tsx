import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  useColorScheme,
  Animated,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Slider from "@react-native-community/slider";
import { Avatar } from "../ui/Avatar";
import type { User } from "../../lib/types";

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

interface VoiceParticipantModalProps {
  visible: boolean;
  participant: VoiceParticipant | null;
  onClose: () => void;
  onVolumeChange?: (participantId: string, volume: number) => void;
  onLocalMute?: (participantId: string, muted: boolean) => void;
  onReport?: (participant: VoiceParticipant, reason: string) => void;
  initialVolume?: number;
  isLocallyMuted?: boolean;
  isCurrentUser?: boolean;
}

interface ActionItemProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  subtitle?: string;
  onPress: () => void;
  destructive?: boolean;
  isDark: boolean;
  rightElement?: React.ReactNode;
  disabled?: boolean;
}

// ============================================================================
// Action Item Component
// ============================================================================

function ActionItem({
  icon,
  label,
  subtitle,
  onPress,
  destructive,
  isDark,
  rightElement,
  disabled,
}: ActionItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={`
        flex-row items-center px-4 py-3.5 
        ${disabled ? "opacity-50" : "active:bg-neutral-100 dark:active:bg-neutral-700/50"}
      `}
      activeOpacity={0.7}
    >
      <View
        className={`
          w-9 h-9 rounded-full items-center justify-center mr-3
          ${
            destructive
              ? "bg-red-100 dark:bg-red-900/30"
              : isDark
                ? "bg-neutral-700"
                : "bg-neutral-100"
          }
        `}
      >
        <Ionicons
          name={icon}
          size={20}
          color={
            destructive
              ? "#ef4444"
              : isDark
                ? "#d4d4d4"
                : "#525252"
          }
        />
      </View>
      <View className="flex-1">
        <Text
          className={`text-base font-medium ${
            destructive
              ? "text-red-500"
              : isDark
                ? "text-neutral-100"
                : "text-neutral-900"
          }`}
        >
          {label}
        </Text>
        {subtitle && (
          <Text
            className={`text-sm mt-0.5 ${
              isDark ? "text-neutral-400" : "text-neutral-500"
            }`}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement}
    </TouchableOpacity>
  );
}

// ============================================================================
// Volume Slider Section
// ============================================================================

function VolumeSection({
  volume,
  onVolumeChange,
  isDark,
  disabled,
}: {
  volume: number;
  onVolumeChange: (value: number) => void;
  isDark: boolean;
  disabled?: boolean;
}) {
  const [localVolume, setLocalVolume] = useState(volume);

  useEffect(() => {
    setLocalVolume(volume);
  }, [volume]);

  const handleSlidingComplete = (value: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onVolumeChange(value);
  };

  const getVolumeIcon = (): React.ComponentProps<typeof Ionicons>["name"] => {
    if (localVolume === 0) return "volume-mute";
    if (localVolume < 0.33) return "volume-low";
    if (localVolume < 0.66) return "volume-medium";
    return "volume-high";
  };

  return (
    <View className={`px-4 py-4 ${disabled ? "opacity-50" : ""}`}>
      <View className="flex-row items-center mb-2">
        <Ionicons
          name={getVolumeIcon()}
          size={20}
          color={isDark ? "#d4d4d4" : "#525252"}
        />
        <Text
          className={`ml-2 text-sm font-medium ${
            isDark ? "text-neutral-300" : "text-neutral-700"
          }`}
        >
          User Volume
        </Text>
        <Text
          className={`ml-auto text-sm ${
            isDark ? "text-neutral-400" : "text-neutral-500"
          }`}
        >
          {Math.round(localVolume * 100)}%
        </Text>
      </View>
      <Slider
        value={localVolume}
        onValueChange={setLocalVolume}
        onSlidingComplete={handleSlidingComplete}
        minimumValue={0}
        maximumValue={1}
        step={0.01}
        disabled={disabled}
        minimumTrackTintColor={disabled ? "#6b7280" : "#5865f2"}
        maximumTrackTintColor={isDark ? "#404040" : "#e5e5e5"}
        thumbTintColor={disabled ? "#6b7280" : "#5865f2"}
        style={{ height: 40 }}
      />
    </View>
  );
}

// ============================================================================
// Main VoiceParticipantModal Component
// ============================================================================

export function VoiceParticipantModal({
  visible,
  participant,
  onClose,
  onVolumeChange,
  onLocalMute,
  onReport,
  initialVolume = 1,
  isLocallyMuted = false,
  isCurrentUser = false,
}: VoiceParticipantModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const [localMuted, setLocalMuted] = useState(isLocallyMuted);
  const [volume, setVolume] = useState(initialVolume);

  // Sync external state
  useEffect(() => {
    setLocalMuted(isLocallyMuted);
    setVolume(initialVolume);
  }, [isLocallyMuted, initialVolume]);

  // Animation
  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scaleAnim, opacityAnim, slideAnim]);

  const handleViewProfile = useCallback(() => {
    if (!participant) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    router.push({
      pathname: "/profile/[id]",
      params: { id: participant.user.id },
    });
  }, [participant, onClose]);

  const handleToggleLocalMute = useCallback(() => {
    if (!participant) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newMuted = !localMuted;
    setLocalMuted(newMuted);
    onLocalMute?.(participant.id, newMuted);
  }, [participant, localMuted, onLocalMute]);

  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      if (!participant) return;
      setVolume(newVolume);
      onVolumeChange?.(participant.id, newVolume);
    },
    [participant, onVolumeChange]
  );

  const handleReport = useCallback(() => {
    if (!participant || !onReport) return;

    Alert.alert(
      "Report User",
      `Report ${participant.user.displayName || participant.user.username}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Harassment",
          onPress: () => {
            onReport(participant, "harassment");
            onClose();
          },
        },
        {
          text: "Spam",
          onPress: () => {
            onReport(participant, "spam");
            onClose();
          },
        },
        {
          text: "Inappropriate Content",
          onPress: () => {
            onReport(participant, "inappropriate");
            onClose();
          },
        },
      ]
    );
  }, [participant, onReport, onClose]);

  const handleSendMessage = useCallback(() => {
    if (!participant) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    router.push({
      pathname: "/chat/[id]",
      params: { id: participant.user.id, isDm: "true" },
    });
  }, [participant, onClose]);

  const formatJoinTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Just joined";
    if (minutes === 1) return "1 minute ago";
    if (minutes < 60) return `${minutes} minutes ago`;

    const hours = Math.floor(minutes / 60);
    if (hours === 1) return "1 hour ago";
    return `${hours} hours ago`;
  };

  if (!visible || !participant) return null;

  const { user, isMuted, isDeafened, isSpeaking, isScreenSharing } = participant;
  const displayName = user.displayName || user.username;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        className="flex-1 justify-end bg-black/50"
        onPress={onClose}
      >
        <Animated.View
          style={{
            transform: [
              { scale: scaleAnim },
              { translateY: slideAnim },
            ],
            opacity: opacityAnim,
          }}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View
              className={`
                rounded-t-3xl overflow-hidden pb-8
                ${isDark ? "bg-neutral-800" : "bg-white"}
              `}
            >
              {/* Handle Bar */}
              <View className="items-center pt-3 pb-2">
                <View
                  className={`w-10 h-1 rounded-full ${
                    isDark ? "bg-neutral-600" : "bg-neutral-300"
                  }`}
                />
              </View>

              {/* User Header */}
              <View className="items-center px-6 pt-2 pb-4">
                <View className="relative">
                  <Avatar
                    uri={user.avatar}
                    name={displayName}
                    size="xl"
                    status={user.status}
                    showStatus
                  />
                  {isSpeaking && (
                    <View className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-500 items-center justify-center border-2 border-neutral-800">
                      <Ionicons name="volume-high" size={14} color="white" />
                    </View>
                  )}
                </View>

                <Text
                  className={`mt-3 text-xl font-bold ${
                    isDark ? "text-white" : "text-neutral-900"
                  }`}
                >
                  {displayName}
                </Text>

                <Text
                  className={`text-sm ${
                    isDark ? "text-neutral-400" : "text-neutral-500"
                  }`}
                >
                  @{user.username}
                </Text>

                {/* Status Badges */}
                <View className="flex-row items-center mt-3 space-x-2">
                  {isSpeaking && (
                    <View className="flex-row items-center px-2.5 py-1 rounded-full bg-green-500/20">
                      <View className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />
                      <Text className="text-xs font-medium text-green-500">
                        Speaking
                      </Text>
                    </View>
                  )}

                  {isMuted && (
                    <View className="flex-row items-center px-2.5 py-1 rounded-full bg-red-500/20">
                      <Ionicons name="mic-off" size={12} color="#ef4444" />
                      <Text className="text-xs font-medium text-red-500 ml-1">
                        Muted
                      </Text>
                    </View>
                  )}

                  {isDeafened && (
                    <View className="flex-row items-center px-2.5 py-1 rounded-full bg-red-500/20">
                      <Ionicons name="volume-off" size={12} color="#ef4444" />
                      <Text className="text-xs font-medium text-red-500 ml-1">
                        Deafened
                      </Text>
                    </View>
                  )}

                  {isScreenSharing && (
                    <View className="flex-row items-center px-2.5 py-1 rounded-full bg-purple-500/20">
                      <Ionicons name="desktop-outline" size={12} color="#a855f7" />
                      <Text className="text-xs font-medium text-purple-500 ml-1">
                        Sharing
                      </Text>
                    </View>
                  )}
                </View>

                <Text
                  className={`text-xs mt-2 ${
                    isDark ? "text-neutral-500" : "text-neutral-400"
                  }`}
                >
                  Joined {formatJoinTime(participant.joinedAt)}
                </Text>
              </View>

              {/* Divider */}
              <View
                className={`h-px mx-4 ${
                  isDark ? "bg-neutral-700" : "bg-neutral-200"
                }`}
              />

              {/* Volume Control - only for other users */}
              {!isCurrentUser && (
                <>
                  <VolumeSection
                    volume={volume}
                    onVolumeChange={handleVolumeChange}
                    isDark={isDark}
                    disabled={localMuted}
                  />
                  <View
                    className={`h-px mx-4 ${
                      isDark ? "bg-neutral-700" : "bg-neutral-200"
                    }`}
                  />
                </>
              )}

              {/* Actions */}
              <View className="pt-1">
                <ActionItem
                  icon="person-outline"
                  label="View Profile"
                  subtitle={`See ${displayName}'s profile`}
                  onPress={handleViewProfile}
                  isDark={isDark}
                />

                {!isCurrentUser && (
                  <>
                    <ActionItem
                      icon="chatbubble-outline"
                      label="Send Message"
                      subtitle="Open direct message"
                      onPress={handleSendMessage}
                      isDark={isDark}
                    />

                    <ActionItem
                      icon={localMuted ? "volume-high" : "volume-mute"}
                      label={localMuted ? "Unmute for Me" : "Mute for Me"}
                      subtitle={
                        localMuted
                          ? "You won't hear this user"
                          : "Only affects your audio"
                      }
                      onPress={handleToggleLocalMute}
                      isDark={isDark}
                      rightElement={
                        <View
                          className={`
                            w-12 h-7 rounded-full items-center justify-center
                            ${localMuted ? "bg-red-500" : isDark ? "bg-neutral-600" : "bg-neutral-300"}
                          `}
                          style={{
                            paddingLeft: localMuted ? 22 : 4,
                          }}
                        >
                          <View className="w-5 h-5 rounded-full bg-white shadow" />
                        </View>
                      }
                    />
                  </>
                )}

                {!isCurrentUser && onReport && (
                  <>
                    <View
                      className={`h-px mx-4 my-1 ${
                        isDark ? "bg-neutral-700" : "bg-neutral-200"
                      }`}
                    />
                    <ActionItem
                      icon="flag-outline"
                      label="Report"
                      subtitle="Report inappropriate behavior"
                      onPress={handleReport}
                      destructive
                      isDark={isDark}
                    />
                  </>
                )}
              </View>

              {/* Cancel Button */}
              <TouchableOpacity
                onPress={onClose}
                className={`
                  mx-4 mt-3 py-3.5 rounded-xl items-center
                  ${isDark ? "bg-neutral-700" : "bg-neutral-100"}
                `}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-base font-semibold ${
                    isDark ? "text-neutral-300" : "text-neutral-600"
                  }`}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

export default VoiceParticipantModal;
