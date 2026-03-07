/**
 * Message Status Indicator
 * Shows delivery status for sent messages
 */

import React from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MessageStatus as MessageStatusType, FailureReason } from "../lib/types/offline";

interface MessageStatusProps {
  status: MessageStatusType;
  failureReason?: FailureReason;
  errorMessage?: string;
  onRetry?: () => void;
  size?: "sm" | "md";
}

const FAILURE_MESSAGES: Record<FailureReason, string> = {
  network_error: "Network error",
  timeout: "Request timed out",
  server_error: "Server error",
  rate_limited: "Rate limited",
  unauthorized: "Unauthorized",
  validation_error: "Validation failed",
  unknown: "Failed to send",
};

export function MessageStatus({
  status,
  failureReason,
  errorMessage,
  onRetry,
  size = "sm",
}: MessageStatusProps) {
  const iconSize = size === "sm" ? 14 : 16;
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  switch (status) {
    case "pending":
      return (
        <View className="flex-row items-center gap-1">
          <Ionicons name="time-outline" size={iconSize} color="#9ca3af" />
          <Text className={`${textSize} text-gray-400`}>Pending</Text>
        </View>
      );

    case "sending":
      return (
        <View className="flex-row items-center gap-1">
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text className={`${textSize} text-blue-400`}>Sending...</Text>
        </View>
      );

    case "sent":
      return (
        <View className="flex-row items-center gap-1">
          <Ionicons name="checkmark-done" size={iconSize} color="#22c55e" />
          <Text className={`${textSize} text-green-400`}>Sent</Text>
        </View>
      );

    case "failed":
      const message = errorMessage || (failureReason ? FAILURE_MESSAGES[failureReason] : "Failed");
      
      return (
        <Pressable
          onPress={onRetry}
          className="flex-row items-center gap-1 active:opacity-70"
        >
          <Ionicons name="alert-circle" size={iconSize} color="#ef4444" />
          <Text className={`${textSize} text-red-400`}>{message}</Text>
          {onRetry && (
            <Ionicons name="refresh" size={iconSize} color="#ef4444" />
          )}
        </Pressable>
      );

    default:
      return null;
  }
}

/**
 * Compact message status icon (for message bubbles)
 */
export function MessageStatusIcon({ status }: { status: MessageStatusType }) {
  switch (status) {
    case "pending":
      return <Ionicons name="time-outline" size={12} color="#9ca3af" />;
    
    case "sending":
      return <ActivityIndicator size="small" color="#3b82f6" />;
    
    case "sent":
      return <Ionicons name="checkmark-done" size={12} color="#22c55e" />;
    
    case "failed":
      return <Ionicons name="alert-circle" size={12} color="#ef4444" />;
    
    default:
      return null;
  }
}
