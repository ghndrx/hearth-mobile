/**
 * VoiceRecordButton Component
 * 
 * A microphone button that triggers voice recording.
 * Can be used as a long-press or tap button.
 */

import { useState } from "react";
import {
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { VoiceRecorder, type VoiceRecording } from "./VoiceRecorder";

export interface VoiceRecordButtonProps {
  /** Called when recording is completed and ready to send */
  onRecordingComplete: (recording: VoiceRecording) => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Size of the button */
  size?: "sm" | "md" | "lg";
  /** Whether haptic feedback is enabled */
  hapticsEnabled?: boolean;
  /** Maximum recording duration in seconds */
  maxDuration?: number;
}

export function VoiceRecordButton({
  onRecordingComplete,
  disabled = false,
  size = "md",
  hapticsEnabled = true,
  maxDuration = 300,
}: VoiceRecordButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [isRecording, setIsRecording] = useState(false);

  const sizeMap = {
    sm: { button: 32, icon: 18 },
    md: { button: 44, icon: 24 },
    lg: { button: 52, icon: 28 },
  };

  const { button: buttonSize, icon: iconSize } = sizeMap[size];

  const handlePress = () => {
    if (!disabled) {
      setIsRecording(true);
    }
  };

  const handleRecordingComplete = (recording: VoiceRecording) => {
    setIsRecording(false);
    onRecordingComplete(recording);
  };

  const handleCancel = () => {
    setIsRecording(false);
  };

  // When recording, show the full recorder UI
  if (isRecording) {
    return (
      <VoiceRecorder
        onRecordingComplete={handleRecordingComplete}
        onCancel={handleCancel}
        maxDuration={maxDuration}
        hapticsEnabled={hapticsEnabled}
      />
    );
  }

  // Show microphone button
  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      className={`rounded-full items-center justify-center ${
        disabled ? "opacity-50" : ""
      } bg-brand`}
      style={{ width: buttonSize, height: buttonSize }}
    >
      <Ionicons name="mic" size={iconSize} color="white" />
    </TouchableOpacity>
  );
}
