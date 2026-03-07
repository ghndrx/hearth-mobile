/**
 * Network Status Bar
 * Shows connection status and offline queue sync status
 */

import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Animated } from "react-native";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { useOfflineSync } from "../lib/services/offlineSync";
import { Ionicons } from "@expo/vector-icons";

export function NetworkStatusBar() {
  const [networkState, setNetworkState] = useState<NetInfoState | null>(null);
  const [slideAnim] = useState(new Animated.Value(-50));
  const { syncStatus, queueStats, retryAllFailed } = useOfflineSync();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(setNetworkState);
    return () => unsubscribe();
  }, []);

  // Show bar when offline or when there are messages in queue
  const shouldShow = 
    networkState?.isConnected === false || 
    queueStats.pending > 0 || 
    queueStats.failed > 0 ||
    syncStatus.isSyncing;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: shouldShow ? 0 : -50,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
  }, [shouldShow, slideAnim]);

  if (!networkState) return null;

  // Determine status color and message
  let backgroundColor = "bg-gray-500";
  let iconName: keyof typeof Ionicons.glyphMap = "cloud-offline";
  let statusText = "Offline";

  if (networkState.isConnected) {
    if (syncStatus.isSyncing) {
      backgroundColor = "bg-blue-500";
      iconName = "sync";
      statusText = "Syncing messages...";
    } else if (queueStats.failed > 0) {
      backgroundColor = "bg-red-500";
      iconName = "alert-circle";
      statusText = `${queueStats.failed} message${queueStats.failed > 1 ? "s" : ""} failed`;
    } else if (queueStats.pending > 0) {
      backgroundColor = "bg-amber-500";
      iconName = "time";
      statusText = `${queueStats.pending} message${queueStats.pending > 1 ? "s" : ""} pending`;
    } else {
      // All good, don't show the bar
      return null;
    }
  }

  return (
    <Animated.View
      style={{ transform: [{ translateY: slideAnim }] }}
      className="absolute top-0 left-0 right-0 z-50"
    >
      <Pressable
        onPress={queueStats.failed > 0 ? retryAllFailed : undefined}
        className={`${backgroundColor} px-4 py-2 flex-row items-center justify-between`}
      >
        <View className="flex-row items-center gap-2">
          <Ionicons name={iconName} size={16} color="white" />
          <Text className="text-white text-sm font-medium">{statusText}</Text>
        </View>

        {queueStats.failed > 0 && (
          <View className="flex-row items-center gap-1">
            <Ionicons name="refresh" size={16} color="white" />
            <Text className="text-white text-sm font-medium">Retry</Text>
          </View>
        )}

        {syncStatus.isSyncing && (
          <View className="w-4 h-4">
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: slideAnim.interpolate({
                      inputRange: [-50, 0],
                      outputRange: ["0deg", "360deg"],
                    }),
                  },
                ],
              }}
            >
              <Ionicons name="sync" size={16} color="white" />
            </Animated.View>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}
