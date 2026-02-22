/**
 * Offline Indicator Component
 * Shows network status, pending messages, and sync progress
 */

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useOfflineIndicator, useMessageQueue } from "../../lib/contexts/MessageQueueContext";

interface OfflineIndicatorProps {
  /** Show compact version (icon only) */
  compact?: boolean;
  /** Position style */
  position?: "top" | "bottom";
  /** Callback when tapped */
  onPress?: () => void;
}

export function OfflineIndicator({
  compact = false,
  position = "top",
  onPress,
}: OfflineIndicatorProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const {
    isOnline,
    hasPendingMessages,
    hasFailedMessages,
    isSyncing,
    pendingCount,
    failedCount,
  } = useOfflineIndicator();

  // Animation values
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Determine visibility
  const shouldShow = !isOnline || hasPendingMessages || hasFailedMessages;

  // Animate visibility
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: shouldShow ? 0 : -50,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
  }, [shouldShow, slideAnim]);

  // Pulse animation when syncing
  useEffect(() => {
    if (isSyncing) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.7,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
    return undefined;
  }, [isSyncing, pulseAnim]);

  // Get status info
  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        icon: "cloud-offline-outline" as const,
        text: "You're offline",
        color: "#ef4444", // red-500
        bgColor: isDark ? "#450a0a" : "#fef2f2", // red-950 / red-50
      };
    }

    if (hasFailedMessages) {
      return {
        icon: "alert-circle-outline" as const,
        text: `${failedCount} message${failedCount > 1 ? "s" : ""} failed`,
        color: "#f59e0b", // amber-500
        bgColor: isDark ? "#451a03" : "#fffbeb", // amber-950 / amber-50
      };
    }

    if (isSyncing) {
      return {
        icon: "sync-outline" as const,
        text: `Syncing ${pendingCount} message${pendingCount > 1 ? "s" : ""}...`,
        color: "#3b82f6", // blue-500
        bgColor: isDark ? "#172554" : "#eff6ff", // blue-950 / blue-50
      };
    }

    if (hasPendingMessages) {
      return {
        icon: "time-outline" as const,
        text: `${pendingCount} pending`,
        color: "#6b7280", // gray-500
        bgColor: isDark ? "#1f2937" : "#f9fafb", // gray-800 / gray-50
      };
    }

    return null;
  };

  const status = getStatusInfo();
  if (!status) return null;

  const positionStyle =
    position === "top"
      ? { top: 0 }
      : { bottom: 0 };

  if (compact) {
    return (
      <Animated.View
        style={[
          {
            transform: [{ translateY: slideAnim }],
            opacity: pulseAnim,
          },
        ]}
      >
        <TouchableOpacity
          onPress={onPress}
          className="p-2"
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <View
            className="w-8 h-8 rounded-full items-center justify-center"
            style={{ backgroundColor: status.bgColor }}
          >
            <Ionicons name={status.icon} size={18} color={status.color} />
          </View>
          {(pendingCount > 0 || failedCount > 0) && (
            <View
              className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full items-center justify-center px-1"
              style={{ backgroundColor: status.color }}
            >
              <Text className="text-white text-xs font-bold">
                {pendingCount + failedCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      className="absolute left-0 right-0 z-50"
      style={[
        positionStyle,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        className="mx-4 my-2"
      >
        <Animated.View
          className="flex-row items-center px-4 py-3 rounded-xl"
          style={[
            { backgroundColor: status.bgColor },
            { opacity: pulseAnim },
          ]}
        >
          <Ionicons name={status.icon} size={20} color={status.color} />
          <Text
            className="flex-1 ml-3 font-medium"
            style={{ color: status.color }}
          >
            {status.text}
          </Text>
          {hasFailedMessages && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                // Retry all would be called here
              }}
              className="px-3 py-1 rounded-lg"
              style={{ backgroundColor: status.color }}
            >
              <Text className="text-white text-sm font-semibold">Retry</Text>
            </TouchableOpacity>
          )}
          {isSyncing && (
            <View className="ml-2">
              <Ionicons
                name="sync"
                size={18}
                color={status.color}
                style={{
                  transform: [{ rotate: "45deg" }],
                }}
              />
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * Inline sync status for message lists
 */
export function InlineSyncStatus() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { syncStatus, stats, isOnline } = useMessageQueue();

  if (isOnline && !syncStatus.isSyncing && stats.pending === 0) {
    return null;
  }

  return (
    <View
      className={`flex-row items-center justify-center py-2 px-4 ${
        isDark ? "bg-dark-800/50" : "bg-gray-100/50"
      }`}
    >
      {!isOnline ? (
        <>
          <Ionicons
            name="cloud-offline-outline"
            size={14}
            color={isDark ? "#ef4444" : "#dc2626"}
          />
          <Text
            className={`ml-2 text-xs ${isDark ? "text-red-400" : "text-red-600"}`}
          >
            Offline - Messages will send when back online
          </Text>
        </>
      ) : syncStatus.isSyncing ? (
        <>
          <Ionicons
            name="sync-outline"
            size={14}
            color={isDark ? "#60a5fa" : "#3b82f6"}
          />
          <Text
            className={`ml-2 text-xs ${isDark ? "text-blue-400" : "text-blue-600"}`}
          >
            Syncing messages...
          </Text>
        </>
      ) : stats.pending > 0 ? (
        <>
          <Ionicons
            name="time-outline"
            size={14}
            color={isDark ? "#9ca3af" : "#6b7280"}
          />
          <Text
            className={`ml-2 text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
          >
            {stats.pending} message{stats.pending > 1 ? "s" : ""} pending
          </Text>
        </>
      ) : null}
    </View>
  );
}

export default OfflineIndicator;
