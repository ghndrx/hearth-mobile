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

export function NotificationBanner() {
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
    if (notification) {
      showBanner();
    }

    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
      }
    };
  }, [notification]);

  const handlePress = () => {
    hideBanner();

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
  };

  const handleDismiss = () => {
    hideBanner();
  };

  if (!notification) {
    return null;
  }

  const { title, body, data } = notification.request.content;
  const notifData = data as NotificationData | undefined;

  const getIcon = () => {
    switch (notifData?.type) {
      case "message":
        return "chatbubble";
      case "mention":
        return "at";
      case "friend_request":
        return "person-add";
      case "server":
        return "server";
      case "call":
        return "call";
      default:
        return "notifications";
    }
  };

  const getAccentColor = () => {
    switch (notifData?.type) {
      case "mention":
        return "#ed4245";
      case "friend_request":
        return "#57f287";
      case "call":
        return "#5865f2";
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
            {/* Icon or Avatar */}
            {notifData?.senderAvatar ? (
              <Avatar
                uri={notifData.senderAvatar}
                name={notifData.senderName || "User"}
                size="md"
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

            {/* Content */}
            <View className="flex-1 ml-3 mr-2">
              <Text
                className={`font-semibold ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
                numberOfLines={1}
              >
                {title || "New Notification"}
              </Text>
              {body && (
                <Text
                  className={`text-sm mt-0.5 ${
                    isDark ? "text-dark-300" : "text-gray-600"
                  }`}
                  numberOfLines={2}
                >
                  {body}
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
