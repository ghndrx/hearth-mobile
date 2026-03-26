import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated} from "react-native";
import { useColorScheme } from "../../lib/hooks/useColorScheme";
import { Ionicons } from "@expo/vector-icons";
import { Audio, InterruptionModeIOS, InterruptionModeAndroid, AVPlaybackStatus } from "expo-av";
export interface VoiceMessage {
  uri: string;
  duration: number; // seconds
  waveform?: number[]; // normalized 0-1 values
}

interface VoiceMessagePlayerProps {
  /** Voice message to play */
  voice: VoiceMessage;
  /** Whether this is from the current user */
  isCurrentUser?: boolean;
  /** Callback when playback starts */
  onPlayStart?: () => void;
  /** Callback when playback ends */
  onPlayEnd?: () => void;
  /** Whether another voice message is playing (to handle single-playback) */
  isOtherPlaying?: boolean;
}

export function VoiceMessagePlayer({
  voice,
  isCurrentUser = false,
  onPlayStart,
  onPlayEnd,
  isOtherPlaying = false,
}: VoiceMessagePlayerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const soundRef = useRef<Audio.Sound | null>(null);
  const positionInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Waveform animation
  const waveformProgress = useRef(new Animated.Value(0)).current;

  // Stop playback when another voice message starts
  useEffect(() => {
    if (isOtherPlaying && isPlaying) {
      pausePlayback();
    }
  }, [isOtherPlaying, isPlaying]);

  // Setup audio mode for playback
  const setupAudioMode = async () => {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    });
  };

  // Load sound
  const loadSound = async () => {
    try {
      await setupAudioMode();

      const { sound, status } = await Audio.Sound.createAsync(
        { uri: voice.uri },
        { shouldPlay: false, rate: playbackSpeed },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;

      if (status.isLoaded) {
        setPosition(0);
      }

      return sound;
    } catch (error) {
      console.error("Failed to load voice message:", error);
      return null;
    }
  };

  // Playback status update callback
  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    if (status.didJustFinish) {
      setIsPlaying(false);
      setPosition(0);
      waveformProgress.setValue(0);
      onPlayEnd?.();
    }
  };

  // Toggle playback
  const togglePlayback = async () => {
    try {
      if (!soundRef.current) {
        const sound = await loadSound();
        if (!sound) return;
      }

      if (isPlaying) {
        await pausePlayback();
      } else {
        await startPlayback();
      }
    } catch (error) {
      console.error("Failed to toggle playback:", error);
    }
  };

  // Start playback
  const startPlayback = async () => {
    if (!soundRef.current) return;

    try {
      await soundRef.current.playAsync();
      setIsPlaying(true);
      onPlayStart?.();

      // Update position periodically
      positionInterval.current = setInterval(async () => {
        if (soundRef.current) {
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded) {
            const progress = status.positionMillis / 1000;
            setPosition(progress);
            waveformProgress.setValue(progress / voice.duration);
          }
        }
      }, 100);
    } catch (error) {
      console.error("Failed to start playback:", error);
    }
  };

  // Pause playback
  const pausePlayback = async () => {
    if (!soundRef.current) return;

    try {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);

      if (positionInterval.current) {
        clearInterval(positionInterval.current);
        positionInterval.current = null;
      }
    } catch (error) {
      console.error("Failed to pause playback:", error);
    }
  };

  // Seek to position (available for future scrubbing feature)
  const _seekTo = async (seconds: number) => {
    if (!soundRef.current) {
      await loadSound();
    }

    if (soundRef.current) {
      await soundRef.current.setPositionAsync(seconds * 1000);
      setPosition(seconds);
      waveformProgress.setValue(seconds / voice.duration);
    }
  };

  // Cycle playback speed
  const cycleSpeed = async () => {
    const speeds = [1, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);

    if (soundRef.current) {
      await soundRef.current.setRateAsync(nextSpeed, true);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (positionInterval.current) {
        clearInterval(positionInterval.current);
      }
    };
  }, []);

  // Format time as M:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Generate default waveform if not provided
  const waveform = voice.waveform || Array(30).fill(0).map(() => 0.3 + Math.random() * 0.7);

  // Theme colors
  const bgColor = isCurrentUser
    ? isDark
      ? "bg-brand-hover"
      : "bg-brand-hover"
    : isDark
      ? "bg-dark-600"
      : "bg-gray-200";

  const textColor = isCurrentUser
    ? "text-white"
    : isDark
      ? "text-dark-200"
      : "text-gray-700";

  const iconColor = isCurrentUser ? "#ffffff" : isDark ? "#b5bac1" : "#6b7280";
  const activeBarColor = isCurrentUser ? "#ffffff" : "#5865f2";
  const inactiveBarColor = isCurrentUser
    ? "rgba(255,255,255,0.4)"
    : isDark
      ? "#4e5058"
      : "#d1d5db";

  return (
    <View className={`${bgColor} rounded-2xl p-3 min-w-[200px]`}>
      <View className="flex-row items-center">
        {/* Play/Pause button */}
        <TouchableOpacity
          onPress={togglePlayback}
          className={`w-10 h-10 rounded-full items-center justify-center ${
            isCurrentUser
              ? "bg-white/20"
              : isDark
                ? "bg-dark-500"
                : "bg-gray-300"
          }`}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={20}
            color={iconColor}
            style={isPlaying ? undefined : { marginLeft: 2 }}
          />
        </TouchableOpacity>

        {/* Waveform visualization */}
        <View className="flex-1 mx-3">
          <View className="flex-row items-center h-8 justify-between">
            {waveform.map((level, index) => {
              const progress = position / voice.duration;
              const barProgress = index / waveform.length;
              const isActive = barProgress <= progress;

              return (
                <View
                  key={index}
                  className="rounded-full"
                  style={{
                    width: 2,
                    height: Math.max(4, level * 24),
                    backgroundColor: isActive ? activeBarColor : inactiveBarColor,
                  }}
                />
              );
            })}
          </View>

          {/* Time display */}
          <View className="flex-row justify-between mt-1">
            <Text className={`text-xs ${textColor} opacity-70`}>
              {formatTime(position)}
            </Text>
            <Text className={`text-xs ${textColor} opacity-70`}>
              {formatTime(voice.duration)}
            </Text>
          </View>
        </View>

        {/* Speed button */}
        <TouchableOpacity
          onPress={cycleSpeed}
          className={`px-2 py-1 rounded-lg ${
            isCurrentUser
              ? "bg-white/20"
              : isDark
                ? "bg-dark-500"
                : "bg-gray-300"
          }`}
          activeOpacity={0.7}
        >
          <Text className={`text-xs font-semibold ${textColor}`}>
            {playbackSpeed}x
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Hook for managing single voice playback across multiple messages
export function useVoicePlaybackManager() {
  const [playingId, setPlayingId] = useState<string | null>(null);

  const handlePlayStart = useCallback((messageId: string) => {
    setPlayingId(messageId);
  }, []);

  const handlePlayEnd = useCallback((messageId: string) => {
    setPlayingId((current) => (current === messageId ? null : current));
  }, []);

  const isOtherPlaying = useCallback(
    (messageId: string) => playingId !== null && playingId !== messageId,
    [playingId]
  );

  return {
    playingId,
    handlePlayStart,
    handlePlayEnd,
    isOtherPlaying,
  };
}

export default VoiceMessagePlayer;
