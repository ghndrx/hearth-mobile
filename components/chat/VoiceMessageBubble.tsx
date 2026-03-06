/**
 * VoiceMessageBubble Component
 * 
 * Displays voice message attachments with:
 * - Waveform visualization
 * - Playback controls
 * - Progress tracking
 * - Download status
 * - Duration display
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";

export interface VoiceMessageProps {
  /** Voice message URI */
  uri: string;
  /** Duration in seconds */
  duration: number;
  /** File size in bytes */
  size?: number;
  /** Whether this is from the current user */
  isCurrentUser?: boolean;
  /** Whether the message has been listened to */
  isListened?: boolean;
  /** Callback when playback starts */
  onPlay?: () => void;
  /** Callback when playback completes */
  onComplete?: () => void;
}

export function VoiceMessageBubble({
  uri,
  duration,
  size,
  isCurrentUser = false,
  isListened = false,
  onPlay,
  onComplete,
}: VoiceMessageProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(duration);
  const [hasListened, setHasListened] = useState(isListened);

  // Waveform bars (mock visualization - in a real app, you'd analyze the audio)
  const waveformBars = useRef(
    Array.from({ length: 30 }, () => Math.random() * 0.6 + 0.4)
  ).current;

  // Load sound on mount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // Format duration
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Playback status update
  const onPlaybackStatusUpdate = useCallback(
    (status: any) => {
      if (status.isLoaded) {
        if (status.positionMillis !== undefined) {
          setPlaybackPosition(status.positionMillis / 1000);
        }
        if (status.durationMillis !== undefined) {
          setPlaybackDuration(status.durationMillis / 1000);
        }
        setIsPlaying(status.isPlaying || false);

        if (status.didJustFinish) {
          setIsPlaying(false);
          setPlaybackPosition(0);
          setHasListened(true);
          onComplete?.();
        }
      }
    },
    [onComplete]
  );

  // Handle play/pause
  const handlePlayPause = async () => {
    try {
      // Load sound if not loaded
      if (!sound) {
        setIsLoading(true);
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        setSound(newSound);
        setIsLoading(false);
        setHasListened(true);
        onPlay?.();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      }

      // Play/pause existing sound
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        if (isPlaying) {
          await sound.pauseAsync();
        } else {
          await sound.playAsync();
          if (!hasListened) {
            setHasListened(true);
            onPlay?.();
          }
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error("Playback error:", error);
      setIsLoading(false);
    }
  };

  // Handle seek
  const handleSeek = async (progress: number) => {
    if (!sound) return;

    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.durationMillis) {
        const position = progress * status.durationMillis;
        await sound.setPositionAsync(position);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error("Seek error:", error);
    }
  };

  // Calculate progress
  const progress = playbackDuration > 0 ? playbackPosition / playbackDuration : 0;

  // Get background color
  const getBgColor = () => {
    if (isCurrentUser) {
      return "bg-hearth-amber";
    }
    return isDark ? "bg-dark-700" : "bg-gray-100";
  };

  // Get text color
  const getTextColor = () => {
    if (isCurrentUser) {
      return "text-white";
    }
    return isDark ? "text-dark-200" : "text-gray-700";
  };

  return (
    <View className={`rounded-2xl p-3 min-w-[280px] max-w-[320px] ${getBgColor()}`}>
      <View className="flex-row items-center">
        {/* Play/Pause Button */}
        <TouchableOpacity
          onPress={handlePlayPause}
          disabled={isLoading}
          className={`
            w-12 h-12 rounded-full items-center justify-center mr-3
            ${
              isCurrentUser
                ? "bg-white/20"
                : isDark
                  ? "bg-dark-600"
                  : "bg-white"
            }
          `}
        >
          {isLoading ? (
            <ActivityIndicator
              size="small"
              color={isCurrentUser ? "white" : isDark ? "#e0e0e0" : "#374151"}
            />
          ) : (
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={24}
              color={isCurrentUser ? "white" : isDark ? "#e0e0e0" : "#374151"}
            />
          )}
        </TouchableOpacity>

        {/* Waveform and Progress */}
        <View className="flex-1">
          {/* Waveform visualization */}
          <TouchableOpacity
            onPress={() => handleSeek(0.5)}
            activeOpacity={0.7}
            className="flex-row items-center justify-between h-8 mb-1"
          >
            {waveformBars.map((height, index) => {
              const barProgress = index / waveformBars.length;
              const isActive = barProgress <= progress;

              return (
                <View
                  key={index}
                  className={`w-0.5 rounded-full ${
                    isActive
                      ? isCurrentUser
                        ? "bg-white"
                        : "bg-hearth-amber"
                      : isCurrentUser
                        ? "bg-white/40"
                        : isDark
                          ? "bg-dark-500"
                          : "bg-gray-300"
                  }`}
                  style={{
                    height: height * 32,
                  }}
                />
              );
            })}
          </TouchableOpacity>

          {/* Duration and Status */}
          <View className="flex-row items-center justify-between">
            <Text className={`text-xs font-mono ${getTextColor()}`}>
              {isPlaying || playbackPosition > 0
                ? formatTime(playbackPosition)
                : formatTime(duration)}
            </Text>

            <View className="flex-row items-center">
              {!hasListened && !isCurrentUser && (
                <View className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
              )}
              {size && (
                <Text
                  className={`text-xs ${
                    isCurrentUser
                      ? "text-white/70"
                      : isDark
                        ? "text-dark-400"
                        : "text-gray-500"
                  }`}
                >
                  {formatSize(size)}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
