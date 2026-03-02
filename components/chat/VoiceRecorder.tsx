import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  useColorScheme,
  PanResponder,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from "expo-av";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system";

export interface VoiceRecording {
  uri: string;
  duration: number;
  mimeType: string;
  filename: string;
}

interface VoiceRecorderProps {
  /** Called when recording is complete */
  onRecordingComplete: (recording: VoiceRecording) => void;
  /** Called when recording is cancelled */
  onCancel?: () => void;
  /** Maximum recording duration in seconds */
  maxDuration?: number;
  /** Whether haptic feedback is enabled */
  hapticsEnabled?: boolean;
}

export function VoiceRecorder({
  onRecordingComplete,
  onCancel,
  maxDuration = 300, // 5 minutes
  hapticsEnabled = true,
}: VoiceRecorderProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [showCancelHint, setShowCancelHint] = useState(false);
  const [metering, setMetering] = useState<number[]>([]);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const meteringInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const lockSlideAnim = useRef(new Animated.Value(0)).current;
  const cancelSlideAnim = useRef(new Animated.Value(0)).current;
  const waveformAnim = useRef(new Animated.Value(0)).current;

  // Pan responder for slide-to-cancel and slide-to-lock
  const slideStartX = useRef(0);
  const slideStartY = useRef(0);

  const haptic = useCallback(
    (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
      if (hapticsEnabled) {
        Haptics.impactAsync(style);
      }
    },
    [hapticsEnabled]
  );

  // Setup audio mode for recording
  const setupAudioMode = async () => {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      playThroughEarpieceAndroid: false,
    });
  };

  // Reset audio mode after recording
  const resetAudioMode = async () => {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: false,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      playThroughEarpieceAndroid: false,
    });
  };

  // Start recording
  const startRecording = async () => {
    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Microphone access is needed to record voice messages.",
          [{ text: "OK" }]
        );
        return;
      }

      await setupAudioMode();

      // Configure recording
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: {
          extension: ".m4a",
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: ".m4a",
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        isMeteringEnabled: true,
      });

      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      setDuration(0);
      setMetering([]);
      haptic(Haptics.ImpactFeedbackStyle.Medium);

      // Start duration timer
      durationInterval.current = setInterval(() => {
        setDuration((prev) => {
          const next = prev + 1;
          if (next >= maxDuration) {
            stopRecording();
          }
          return next;
        });
      }, 1000);

      // Start metering
      meteringInterval.current = setInterval(async () => {
        if (recordingRef.current) {
          const status = await recordingRef.current.getStatusAsync();
          if (status.isRecording && status.metering !== undefined) {
            // Normalize metering value (-160 to 0 dB) to 0-1 range
            const normalized = Math.max(0, (status.metering + 60) / 60);
            setMetering((prev) => [...prev.slice(-30), normalized]);
          }
        }
      }, 100);

      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Waveform animation
      Animated.loop(
        Animated.timing(waveformAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } catch (error) {
      console.error("Failed to start recording:", error);
      Alert.alert("Error", "Failed to start recording. Please try again.");
    }
  };

  // Stop recording and return result
  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      // Stop animations and timers
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      waveformAnim.stopAnimation();
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
      if (meteringInterval.current) {
        clearInterval(meteringInterval.current);
        meteringInterval.current = null;
      }

      // Stop recording
      await recordingRef.current.stopAndUnloadAsync();
      await resetAudioMode();

      const uri = recordingRef.current.getURI();
      const finalDuration = duration;

      if (uri && finalDuration >= 1) {
        // Generate filename with timestamp
        const filename = `voice_${Date.now()}.m4a`;

        onRecordingComplete({
          uri,
          duration: finalDuration,
          mimeType: "audio/mp4",
          filename,
        });
        haptic(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        // Recording too short
        if (uri) {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        }
        haptic(Haptics.ImpactFeedbackStyle.Light);
      }

      recordingRef.current = null;
      setIsRecording(false);
      setIsPaused(false);
      setIsLocked(false);
      setDuration(0);
      setMetering([]);
    } catch (error) {
      console.error("Failed to stop recording:", error);
    }
  };

  // Cancel recording
  const cancelRecording = async () => {
    if (!recordingRef.current) return;

    try {
      // Stop animations and timers
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      waveformAnim.stopAnimation();
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
      if (meteringInterval.current) {
        clearInterval(meteringInterval.current);
        meteringInterval.current = null;
      }

      // Stop and delete recording
      await recordingRef.current.stopAndUnloadAsync();
      await resetAudioMode();

      const uri = recordingRef.current.getURI();
      if (uri) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }

      recordingRef.current = null;
      setIsRecording(false);
      setIsPaused(false);
      setIsLocked(false);
      setDuration(0);
      setMetering([]);

      haptic(Haptics.ImpactFeedbackStyle.Light);
      onCancel?.();
    } catch (error) {
      console.error("Failed to cancel recording:", error);
    }
  };

  // Pause/resume recording
  const togglePause = async () => {
    if (!recordingRef.current) return;

    try {
      if (isPaused) {
        await recordingRef.current.startAsync();
        setIsPaused(false);
        
        // Resume duration timer
        durationInterval.current = setInterval(() => {
          setDuration((prev) => {
            const next = prev + 1;
            if (next >= maxDuration) {
              stopRecording();
            }
            return next;
          });
        }, 1000);

        // Resume metering
        meteringInterval.current = setInterval(async () => {
          if (recordingRef.current) {
            const status = await recordingRef.current.getStatusAsync();
            if (status.isRecording && status.metering !== undefined) {
              const normalized = Math.max(0, (status.metering + 60) / 60);
              setMetering((prev) => [...prev.slice(-30), normalized]);
            }
          }
        }, 100);
      } else {
        await recordingRef.current.pauseAsync();
        setIsPaused(true);
        
        if (durationInterval.current) {
          clearInterval(durationInterval.current);
          durationInterval.current = null;
        }
        if (meteringInterval.current) {
          clearInterval(meteringInterval.current);
          meteringInterval.current = null;
        }
      }
      haptic();
    } catch (error) {
      console.error("Failed to toggle pause:", error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
      if (meteringInterval.current) {
        clearInterval(meteringInterval.current);
      }
    };
  }, []);

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Pan responder for hold-to-record with slide gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, gestureState) => {
        slideStartX.current = gestureState.x0;
        slideStartY.current = gestureState.y0;
        startRecording();
      },
      onPanResponderMove: (_, gestureState) => {
        const dx = gestureState.moveX - slideStartX.current;
        const dy = slideStartY.current - gestureState.moveY;

        // Slide left to cancel
        if (dx < -50 && !isLocked) {
          setShowCancelHint(true);
          cancelSlideAnim.setValue(Math.min(1, Math.abs(dx) / 150));
        } else {
          setShowCancelHint(false);
          cancelSlideAnim.setValue(0);
        }

        // Slide up to lock
        if (dy > 50 && !isLocked) {
          lockSlideAnim.setValue(Math.min(1, dy / 100));
          if (dy > 100) {
            setIsLocked(true);
            lockSlideAnim.setValue(0);
            haptic(Haptics.ImpactFeedbackStyle.Heavy);
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const dx = gestureState.moveX - slideStartX.current;

        cancelSlideAnim.setValue(0);
        lockSlideAnim.setValue(0);
        setShowCancelHint(false);

        if (!isLocked) {
          if (dx < -100) {
            // Cancelled by sliding
            cancelRecording();
          } else {
            // Released - send recording
            stopRecording();
          }
        }
      },
    })
  ).current;

  // Locked recording UI
  if (isRecording && isLocked) {
    return (
      <View
        className={`p-4 rounded-2xl mx-4 mb-4 ${
          isDark ? "bg-dark-700" : "bg-gray-100"
        }`}
      >
        {/* Waveform visualization */}
        <View className="flex-row items-center justify-center h-12 mb-4">
          {metering.slice(-20).map((level, index) => (
            <View
              key={index}
              className={`w-1 mx-0.5 rounded-full ${isDark ? "bg-brand" : "bg-brand"}`}
              style={{
                height: Math.max(4, level * 40),
                opacity: 0.3 + level * 0.7,
              }}
            />
          ))}
          {metering.length < 20 &&
            Array(20 - metering.length)
              .fill(0)
              .map((_, index) => (
                <View
                  key={`empty-${index}`}
                  className={`w-1 h-1 mx-0.5 rounded-full ${
                    isDark ? "bg-dark-500" : "bg-gray-300"
                  }`}
                />
              ))}
        </View>

        {/* Duration */}
        <Text
          className={`text-center text-lg font-semibold mb-4 ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          {formatDuration(duration)}
        </Text>

        {/* Controls */}
        <View className="flex-row items-center justify-center">
          {/* Cancel button */}
          <TouchableOpacity
            onPress={cancelRecording}
            className={`p-4 rounded-full mr-8 ${
              isDark ? "bg-dark-600" : "bg-gray-200"
            }`}
          >
            <Ionicons
              name="trash-outline"
              size={24}
              color="#ef4444"
            />
          </TouchableOpacity>

          {/* Pause/Resume button */}
          <TouchableOpacity
            onPress={togglePause}
            className={`p-4 rounded-full mr-8 ${
              isDark ? "bg-dark-600" : "bg-gray-200"
            }`}
          >
            <Ionicons
              name={isPaused ? "play" : "pause"}
              size={24}
              color={isDark ? "#b5bac1" : "#6b7280"}
            />
          </TouchableOpacity>

          {/* Send button */}
          <TouchableOpacity
            onPress={stopRecording}
            className="p-4 rounded-full bg-brand"
          >
            <Ionicons name="send" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Hold-to-record button UI
  return (
    <View className="relative">
      {/* Cancel hint (slides in from right) */}
      {showCancelHint && (
        <Animated.View
          className="absolute right-20 top-1/2 -translate-y-1/2"
          style={{
            opacity: cancelSlideAnim,
            transform: [
              {
                translateX: cancelSlideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          }}
        >
          <Text className="text-red-500 font-medium">
            ← Slide to cancel
          </Text>
        </Animated.View>
      )}

      {/* Lock hint (slides down from top) */}
      {isRecording && !isLocked && (
        <Animated.View
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-16"
          style={{
            opacity: lockSlideAnim,
          }}
        >
          <View className="items-center">
            <Ionicons
              name="lock-closed"
              size={20}
              color={isDark ? "#b5bac1" : "#6b7280"}
            />
            <Text
              className={`text-xs mt-1 ${
                isDark ? "text-dark-400" : "text-gray-500"
              }`}
            >
              Lock
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Recording button */}
      <View {...panResponder.panHandlers}>
        <Animated.View
          className={`p-3 rounded-full ${
            isRecording ? "bg-red-500" : isDark ? "bg-dark-700" : "bg-gray-100"
          }`}
          style={{
            transform: [{ scale: isRecording ? pulseAnim : 1 }],
          }}
        >
          <Ionicons
            name="mic"
            size={24}
            color={isRecording ? "#ffffff" : isDark ? "#b5bac1" : "#6b7280"}
          />
        </Animated.View>
      </View>

      {/* Recording indicator */}
      {isRecording && !isLocked && (
        <View className="absolute -top-8 left-1/2 -translate-x-1/2">
          <View className="flex-row items-center bg-red-500 px-3 py-1 rounded-full">
            <View className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
            <Text className="text-white text-sm font-medium">
              {formatDuration(duration)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

export default VoiceRecorder;
