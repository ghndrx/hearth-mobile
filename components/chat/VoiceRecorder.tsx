/**
 * VoiceRecorder Component
 * 
 * Full-featured voice message recorder with:
 * - Audio recording with permissions
 * - Real-time waveform visualization
 * - Playback preview before sending
 * - Pause/resume recording
 * - Slide to cancel gesture
 * - Platform-specific optimizations
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  PanResponder,
  Platform,
  Alert} from "react-native";
import { useColorScheme } from "../../lib/hooks/useColorScheme";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system";

export interface VoiceRecording {
  uri: string;
  duration: number;
  size: number;
  mimeType: string;
}

export interface VoiceRecorderProps {
  /** Called when recording is completed and ready to send */
  onRecordingComplete: (recording: VoiceRecording) => void;
  /** Called when recording is cancelled */
  onCancel: () => void;
  /** Maximum recording duration in seconds (default: 300 = 5 minutes) */
  maxDuration?: number;
  /** Whether to show the slide to cancel gesture hint */
  showCancelHint?: boolean;
  /** Whether haptic feedback is enabled */
  hapticsEnabled?: boolean;
}

type RecordingState = "idle" | "recording" | "paused" | "previewing";

const CANCEL_THRESHOLD = -120; // Swipe distance to cancel

export function VoiceRecorder({
  onRecordingComplete,
  onCancel,
  maxDuration = 300,
  showCancelHint = true,
  hapticsEnabled = true,
}: VoiceRecorderProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Recording state
  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Waveform visualization (simplified bars)
  const [waveformBars, setWaveformBars] = useState<number[]>([]);
  const waveformInterval = useRef<NodeJS.Timeout | null>(null);

  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const cancelOpacity = useRef(new Animated.Value(0)).current;

  // Duration timer
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  // Pan responder for slide to cancel
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => state === "recording",
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 5 && state === "recording",
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          slideAnim.setValue(gestureState.dx);
          const opacity = Math.min(Math.abs(gestureState.dx) / 100, 1);
          cancelOpacity.setValue(opacity);
        }
      },
      onPanResponderRelease: async (_, gestureState) => {
        if (gestureState.dx < CANCEL_THRESHOLD) {
          // Cancelled!
          await handleCancel();
        } else {
          // Spring back
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
          Animated.timing(cancelOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Request permissions and start recording
  useEffect(() => {
    let mounted = true;

    const startRecording = async () => {
      try {
        // Request permissions
        const permission = await Audio.requestPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            "Microphone Permission Required",
            "Please enable microphone access to record voice messages.",
            [
              { text: "Cancel", onPress: onCancel },
              { text: "Settings", onPress: () => {} },
            ]
          );
          return;
        }

        // Set audio mode for recording
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        // Create recording
        const { recording: rec } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY,
          undefined,
          100 // Update every 100ms
        );

        if (mounted) {
          setRecording(rec);
          setState("recording");
          startDurationTimer();
          startWaveformAnimation();
          startPulseAnimation();
          if (hapticsEnabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        }
      } catch (error) {
        console.error("Failed to start recording:", error);
        Alert.alert("Recording Error", "Failed to start recording. Please try again.");
        onCancel();
      }
    };

    startRecording();

    return () => {
      mounted = false;
      cleanup();
    };
  }, []);

  // Cleanup function
  const cleanup = useCallback(async () => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
    if (waveformInterval.current) {
      clearInterval(waveformInterval.current);
      waveformInterval.current = null;
    }
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch (e) {
        console.error("Error stopping recording:", e);
      }
    }
    if (sound) {
      try {
        await sound.unloadAsync();
      } catch (e) {
        console.error("Error unloading sound:", e);
      }
    }
  }, [recording, sound]);

  // Start duration timer
  const startDurationTimer = () => {
    durationInterval.current = setInterval(() => {
      setDuration((prev) => {
        const next = prev + 1;
        if (next >= maxDuration) {
          handleStopRecording();
          return prev;
        }
        return next;
      });
    }, 1000);
  };

  // Start waveform animation (mock visualization)
  const startWaveformAnimation = () => {
    waveformInterval.current = setInterval(() => {
      setWaveformBars((prev) => {
        const newBars = [...prev];
        if (newBars.length >= 50) {
          newBars.shift();
        }
        newBars.push(Math.random() * 0.8 + 0.2);
        return newBars;
      });
    }, 100);
  };

  // Pulse animation for recording indicator
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle pause/resume
  const handlePauseResume = async () => {
    try {
      if (state === "recording" && recording) {
        await recording.pauseAsync();
        setState("paused");
        if (durationInterval.current) {
          clearInterval(durationInterval.current);
          durationInterval.current = null;
        }
        if (waveformInterval.current) {
          clearInterval(waveformInterval.current);
          waveformInterval.current = null;
        }
        if (hapticsEnabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } else if (state === "paused" && recording) {
        await recording.startAsync();
        setState("recording");
        startDurationTimer();
        startWaveformAnimation();
        if (hapticsEnabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    } catch (error) {
      console.error("Failed to pause/resume recording:", error);
    }
  };

  // Handle stop recording
  const handleStopRecording = async () => {
    try {
      if (!recording) return;

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (!uri) {
        throw new Error("No recording URI");
      }

      setRecordingUri(uri);
      setState("previewing");

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const fileSize = "size" in fileInfo ? fileInfo.size || 0 : 0;

      // Load for playback
      const { sound: playbackSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );

      setSound(playbackSound);
      
      // Get duration
      const status = await playbackSound.getStatusAsync();
      if (status.isLoaded && status.durationMillis) {
        setPlaybackDuration(Math.floor(status.durationMillis / 1000));
      }

      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
      if (waveformInterval.current) {
        clearInterval(waveformInterval.current);
        waveformInterval.current = null;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Failed to stop recording:", error);
      Alert.alert("Error", "Failed to complete recording. Please try again.");
      onCancel();
    }
  };

  // Playback status update
  const onPlaybackStatusUpdate = useCallback((status: any) => {
    if (status.isLoaded) {
      if (status.positionMillis !== undefined) {
        setPlaybackPosition(Math.floor(status.positionMillis / 1000));
      }
      setIsPlaying(status.isPlaying || false);
      
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPlaybackPosition(0);
      }
    }
  }, []);

  // Handle play/pause preview
  const handlePlayPause = async () => {
    try {
      if (!sound) return;

      if (isPlaying) {
        await sound.pauseAsync();
        if (hapticsEnabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } else {
        await sound.playAsync();
        if (hapticsEnabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    } catch (error) {
      console.error("Playback error:", error);
    }
  };

  // Handle send
  const handleSend = async () => {
    try {
      if (!recordingUri) return;

      const fileInfo = await FileSystem.getInfoAsync(recordingUri);
      const fileSize = "size" in fileInfo ? fileInfo.size || 0 : 0;

      onRecordingComplete({
        uri: recordingUri,
        duration: playbackDuration,
        size: fileSize,
        mimeType: Platform.OS === "ios" ? "audio/x-m4a" : "audio/mp4",
      });

      if (hapticsEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Failed to send recording:", error);
      Alert.alert("Error", "Failed to send voice message. Please try again.");
    }
  };

  // Handle cancel
  const handleCancel = async () => {
    await cleanup();
    if (recordingUri) {
      try {
        await FileSystem.deleteAsync(recordingUri, { idempotent: true });
      } catch (e) {
        console.error("Error deleting recording file:", e);
      }
    }
    if (hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    onCancel();
  };

  // Recording view
  if (state === "recording" || state === "paused") {
    return (
      <Animated.View
        {...panResponder.panHandlers}
        className={`flex-row items-center px-4 py-4 ${
          isDark ? "bg-dark-800" : "bg-white"
        }`}
        style={{
          transform: [{ translateX: slideAnim }],
        }}
      >
        {/* Cancel hint */}
        {showCancelHint && (
          <Animated.View
            className="absolute left-4 flex-row items-center"
            style={{ opacity: cancelOpacity }}
          >
            <Ionicons name="chevron-back" size={20} color="#ef4444" />
            <Text className="text-red-500 font-medium ml-1">Cancel</Text>
          </Animated.View>
        )}

        {/* Recording indicator */}
        <Animated.View
          className="w-3 h-3 rounded-full bg-red-500 mr-3"
          style={{
            transform: [{ scale: state === "recording" ? pulseAnim : 1 }],
          }}
        />

        {/* Waveform */}
        <View className="flex-1 flex-row items-center justify-center h-12 mr-3">
          {waveformBars.map((height, index) => (
            <View
              key={index}
              className={`w-1 rounded-full mx-0.5 ${
                isDark ? "bg-hearth-amber" : "bg-amber-600"
              }`}
              style={{
                height: height * 48,
                opacity: state === "paused" ? 0.5 : 1,
              }}
            />
          ))}
        </View>

        {/* Duration */}
        <Text
          className={`text-base font-mono mr-3 ${
            isDark ? "text-dark-200" : "text-gray-700"
          }`}
        >
          {formatDuration(duration)}
        </Text>

        {/* Pause/Resume */}
        <TouchableOpacity
          onPress={handlePauseResume}
          className={`w-10 h-10 rounded-full items-center justify-center mr-2 ${
            isDark ? "bg-dark-700" : "bg-gray-100"
          }`}
        >
          <Ionicons
            name={state === "recording" ? "pause" : "play"}
            size={20}
            color={isDark ? "#e0e0e0" : "#374151"}
          />
        </TouchableOpacity>

        {/* Stop/Complete */}
        <TouchableOpacity
          onPress={handleStopRecording}
          className="w-10 h-10 rounded-full items-center justify-center bg-hearth-amber"
        >
          <Ionicons name="checkmark" size={24} color="white" />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Preview view
  if (state === "previewing") {
    return (
      <View
        className={`flex-row items-center px-4 py-4 ${
          isDark ? "bg-dark-800" : "bg-white"
        }`}
      >
        {/* Play/Pause button */}
        <TouchableOpacity
          onPress={handlePlayPause}
          className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
            isDark ? "bg-dark-700" : "bg-gray-100"
          }`}
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={20}
            color={isDark ? "#e0e0e0" : "#374151"}
          />
        </TouchableOpacity>

        {/* Playback progress */}
        <View className="flex-1 mr-3">
          <View className="flex-row items-center justify-between mb-2">
            <Text
              className={`text-sm font-medium ${
                isDark ? "text-dark-200" : "text-gray-700"
              }`}
            >
              Voice Message
            </Text>
            <Text
              className={`text-xs font-mono ${
                isDark ? "text-dark-400" : "text-gray-500"
              }`}
            >
              {formatDuration(playbackPosition)} / {formatDuration(playbackDuration)}
            </Text>
          </View>
          
          {/* Progress bar */}
          <View
            className={`h-1 rounded-full overflow-hidden ${
              isDark ? "bg-dark-700" : "bg-gray-200"
            }`}
          >
            <View
              className="h-full bg-hearth-amber rounded-full"
              style={{
                width: `${
                  playbackDuration > 0
                    ? (playbackPosition / playbackDuration) * 100
                    : 0
                }%`,
              }}
            />
          </View>
        </View>

        {/* Cancel */}
        <TouchableOpacity
          onPress={handleCancel}
          className={`w-10 h-10 rounded-full items-center justify-center mr-2 ${
            isDark ? "bg-dark-700" : "bg-gray-100"
          }`}
        >
          <Ionicons name="close" size={24} color="#ef4444" />
        </TouchableOpacity>

        {/* Send */}
        <TouchableOpacity
          onPress={handleSend}
          className="w-10 h-10 rounded-full items-center justify-center bg-hearth-amber"
        >
          <Ionicons name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}
