import React from "react";
import { View, Text, TouchableOpacity, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { UnreadMessagesData, WidgetSize } from "../../lib/types/widgets";

interface Props {
  data: UnreadMessagesData;
  size: WidgetSize;
  onRefresh?: () => void;
}

export function UnreadMessagesWidget({ data, size, onRefresh }: Props) {
  const isDark = useColorScheme() === "dark";

  if (size === "small") {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push("/(tabs)/dms")}
        className={`p-4 rounded-2xl ${isDark ? "bg-dark-800" : "bg-white"} border ${isDark ? "border-dark-700" : "border-gray-200"}`}
      >
        <View className="flex-row items-center justify-between mb-2">
          <View className="w-8 h-8 rounded-full bg-brand/20 items-center justify-center">
            <Ionicons name="chatbubbles" size={16} color="#5865f2" />
          </View>
          {onRefresh && (
            <TouchableOpacity onPress={onRefresh} hitSlop={8}>
              <Ionicons
                name="refresh"
                size={14}
                color={isDark ? "#949ba4" : "#6b7280"}
              />
            </TouchableOpacity>
          )}
        </View>
        <Text
          className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
        >
          {data.totalUnread}
        </Text>
        <Text
          className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}
        >
          Unread
        </Text>
      </TouchableOpacity>
    );
  }

  const displayChannels =
    size === "medium" ? data.channels.slice(0, 3) : data.channels.slice(0, 6);

  return (
    <View
      className={`p-4 rounded-2xl ${isDark ? "bg-dark-800" : "bg-white"} border ${isDark ? "border-dark-700" : "border-gray-200"}`}
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-full bg-brand/20 items-center justify-center mr-2">
            <Ionicons name="chatbubbles" size={16} color="#5865f2" />
          </View>
          <Text
            className={`text-base font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
          >
            Unread Messages
          </Text>
        </View>
        <View className="flex-row items-center">
          {data.totalUnread > 0 && (
            <View className="bg-brand rounded-full min-w-[20px] h-5 items-center justify-center px-1.5 mr-2">
              <Text className="text-white text-xs font-bold">
                {data.totalUnread > 99 ? "99+" : data.totalUnread}
              </Text>
            </View>
          )}
          {onRefresh && (
            <TouchableOpacity onPress={onRefresh} hitSlop={8}>
              <Ionicons
                name="refresh"
                size={16}
                color={isDark ? "#949ba4" : "#6b7280"}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {displayChannels.length === 0 ? (
        <View className="items-center py-4">
          <Ionicons
            name="checkmark-circle-outline"
            size={32}
            color={isDark ? "#4e5058" : "#d1d5db"}
          />
          <Text
            className={`text-sm mt-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            All caught up!
          </Text>
        </View>
      ) : (
        displayChannels.map((channel) => (
          <TouchableOpacity
            key={channel.id}
            activeOpacity={0.7}
            onPress={() => router.push(`/chat/${channel.id}`)}
            className={`flex-row items-center py-2 ${isDark ? "border-dark-700" : "border-gray-100"}`}
          >
            <View className="flex-1 mr-2">
              <View className="flex-row items-center">
                <Text
                  className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}
                  numberOfLines={1}
                >
                  #{channel.name}
                </Text>
                <Text
                  className={`text-xs ml-1 ${isDark ? "text-dark-400" : "text-gray-500"}`}
                  numberOfLines={1}
                >
                  {channel.serverName}
                </Text>
              </View>
              <Text
                className={`text-xs mt-0.5 ${isDark ? "text-dark-300" : "text-gray-600"}`}
                numberOfLines={1}
              >
                {channel.lastMessageAuthor}: {channel.lastMessagePreview}
              </Text>
            </View>
            <View className="bg-brand/20 rounded-full min-w-[20px] h-5 items-center justify-center px-1.5">
              <Text className="text-brand text-xs font-bold">
                {channel.unreadCount}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}
