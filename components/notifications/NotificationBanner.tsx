import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  useColorScheme,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Avatar } from "../ui/Avatar";
import { useNotificationContext } from "../../lib/contexts/NotificationContext";
import { BatchedNotification } from "../../src/services/notifications/NotificationBatcher";

const BANNER_HEIGHT = 80;
const AUTO_DISMISS_MS = 5000;

interface NotificationData {
  type?: "message" | "mention" | "friend_request" | "server" | "call";
  channelId?: string;
  serverId?: string;
  userId?: string;
  senderName?: string;
  senderAvatar?: string;
}

interface NotificationBannerProps {
  batchedNotification?: BatchedNotification;
  onBatchDismiss?: (groupKey: string) => void;
}

export function NotificationBanner({ batchedNotification, onBatchDismiss }: NotificationBannerProps = {}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const { notification } = useNotificationContext();

  const translateY = useRef(new Animated.Value(-BANNER_HEIGHT - insets.top)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout>>();

  const showBanner = () => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss
    dismissTimer.current = setTimeout(hideBanner, AUTO_DISMISS_MS);
  };

  const hideBanner = () => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -BANNER_HEIGHT - insets.top,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    if (notification || batchedNotification) {
      showBanner();
    }

    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
      }
    };
  }, [notification, batchedNotification]);

  const handlePress = () => {
    hideBanner();

    if (batchedNotification) {
      // Navigate based on the most recent notification in the batch
      const latestNotif = batchedNotification.notifications[batchedNotification.notifications.length - 1];

      switch (latestNotif.type) {
        case "message":
        case "mention":
        case "reply":
          if (latestNotif.threadId) {
            router.push({
              pathname: "/chat/thread",
              params: { id: latestNotif.threadId, channelId: latestNotif.channelId },
            });
          } else if (latestNotif.channelId) {
            router.push({
              pathname: "/chat/[id]",
              params: { id: latestNotif.channelId, serverId: latestNotif.serverId },
            });
          }
          break;

        case "dm":
          if (latestNotif.channelId) {
            router.push({
              pathname: "/chat/[id]",
              params: { id: latestNotif.channelId, isDm: 'true' },
            });
          }
          break;

        case "friend_request":
          router.push("/(tabs)/friends");
          break;

        case "server_invite":
          router.push("/(tabs)/invites");
          break;

        case "call":
          if (latestNotif.channelId) {
            router.push({
              pathname: "/voice/[id]",
              params: { id: latestNotif.channelId },
            });
          }
          break;

        default:
          router.push("/(tabs)/notifications");
      }
    } else {
      // Handle single notification
      const data = notification?.request.content.data as NotificationData | undefined;
      if (data) {
        switch (data.type) {
          case "message":
          case "mention":
            if (data.channelId) {
              router.push({
                pathname: "/chat/[id]",
                params: { id: data.channelId, server: data.serverId },
              });
            }
            break;

          case "friend_request":
            router.push("/(tabs)/notifications");
            break;

          case "server":
            if (data.serverId) {
              router.push({
                pathname: "/(tabs)/server/[id]",
                params: { id: data.serverId },
              });
            }
            break;

          default:
            router.push("/(tabs)/notifications");
        }
      }
    }
  };

  const handleDismiss = () => {
    hideBanner();

    // If this is a batched notification, dismiss the batch
    if (batchedNotification && onBatchDismiss) {
      onBatchDismiss(batchedNotification.groupKey);
    }
  };

  if (!notification && !batchedNotification) {
    return null;
  }

  // Determine display content based on whether we have a batch or single notification
  const displayData = batchedNotification
    ? {
        title: batchedNotification.title,
        body: batchedNotification.body,
        type: batchedNotification.notifications[batchedNotification.notifications.length - 1]?.type,
        count: batchedNotification.count,
        isBatch: true,
      }
    : {
        title: notification?.request.content.title,
        body: notification?.request.content.body,
        type: (notification?.request.content.data as NotificationData | undefined)?.type,
        count: 1,
        isBatch: false,
      };

  const notifData = batchedNotification
    ? (notification?.request.content.data as NotificationData | undefined)
    : notification?.request.content.data as NotificationData | undefined;

  const getIcon = () => {
    // For batches, show a stack icon if multiple notifications, otherwise use the type icon
    if (displayData.isBatch && displayData.count > 1) {
      return "layers";
    }

    switch (displayData.type) {
      case "message":
        return "chatbubble";
      case "dm":
        return "mail";
      case "mention":
        return "at";
      case "reply":
        return "return-up-back";
      case "friend_request":
        return "person-add";
      case "server_invite":
        return "server";
      case "call":
        return "call";
      case "system":
        return "settings";
      default:
        return "notifications";
    }
  };

  const getAccentColor = () => {
    switch (displayData.type) {
      case "mention":
        return "#ed4245";
      case "friend_request":
        return "#57f287";
      case "call":
        return "#5865f2";
      case "dm":
        return "#9146ff";
      default:
        return "#5865f2";
    }
  };

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        transform: [{ translateY }],
        opacity,
      }}
    >
      <Pressable onPress={handlePress}>
        <View
          style={{
            paddingTop: insets.top,
            paddingHorizontal: 16,
            paddingBottom: 12,
          }}
          className={`
            ${isDark ? "bg-dark-800" : "bg-white"}
            shadow-lg
          `}
        >
          <View className="flex-row items-center">
            {/* Icon or Avatar with batch indicator */}
            <View className="relative">
              {notifData && 'senderAvatar' in notifData && notifData.senderAvatar && !displayData.isBatch ? (
                <Avatar
                  uri={notifData.senderAvatar}
                  name={notifData.senderName || "User"}
                  size={48}
                />
              ) : (
                <View
                  className="w-12 h-12 rounded-full items-center justify-center"
                  style={{ backgroundColor: getAccentColor() + "20" }}
                >
                  <Ionicons
                    name={getIcon()}
                    size={24}
                    color={getAccentColor()}
                  />
                </View>
              )}

              {/* Batch count indicator */}
              {displayData.isBatch && displayData.count > 1 && (
                <View
                  className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full items-center justify-center"
                  style={{ backgroundColor: getAccentColor() }}
                >
                  <Text className="text-white text-xs font-bold">
                    {displayData.count > 99 ? '99+' : displayData.count}
                  </Text>
                </View>
              )}
            </View>

            {/* Content */}
            <View className="flex-1 ml-3 mr-2">
              <View className="flex-row items-center">
                <Text
                  className={`font-semibold ${
                    isDark ? "text-white" : "text-gray-900"
                  } flex-1`}
                  numberOfLines={1}
                >
                  {displayData.title || "New Notification"}
                </Text>
                {displayData.isBatch && displayData.count > 1 && (
                  <Text
                    className={`text-xs ml-2 ${
                      isDark ? "text-dark-300" : "text-gray-600"
                    }`}
                  >
                    {displayData.count} messages
                  </Text>
                )}
              </View>
              {displayData.body && (
                <Text
                  className={`text-sm mt-0.5 ${
                    isDark ? "text-dark-300" : "text-gray-600"
                  }`}
                  numberOfLines={2}
                >
                  {displayData.body}
                </Text>
              )}
              {displayData.isBatch && (
                <Text
                  className={`text-xs mt-1 ${
                    isDark ? "text-dark-400" : "text-gray-500"
                  }`}
                >
                  Tap to view {displayData.count > 1 ? 'all messages' : 'message'}
                </Text>
              )}
            </View>

            {/* Dismiss */}
            <TouchableOpacity
              onPress={handleDismiss}
              className="p-2"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="close"
                size={20}
                color={isDark ? "#80848e" : "#6b7280"}
              />
            </TouchableOpacity>
          </View>

          {/* Accent bar */}
          <View
            className="absolute bottom-0 left-0 right-0 h-0.5"
            style={{ backgroundColor: getAccentColor() }}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}
