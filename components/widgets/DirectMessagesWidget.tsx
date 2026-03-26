import React from "react";
import { View, Text, TouchableOpacity, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Avatar } from "../ui";
import type { DirectMessagesData, WidgetSize } from "../../lib/types/widgets";

interface Props {
  data: DirectMessagesData;
  size: WidgetSize;
  onRefresh?: () => void;
}

export function DirectMessagesWidget({ data, size, onRefresh }: Props) {
  const isDark = useColorScheme() === "dark";

  if (size === "small") {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push("/(tabs)/dms")}
        className={`p-4 rounded-2xl ${isDark ? "bg-dark-800" : "bg-white"} border ${isDark ? "border-dark-700" : "border-gray-200"}`}
      >
        <View className="flex-row items-center justify-between mb-2">
          <View className="w-8 h-8 rounded-full bg-green-500/20 items-center justify-center">
            <Ionicons name="mail" size={16} color="#22c55e" />
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
          DMs
        </Text>
      </TouchableOpacity>
    );
  }

  const displayConversations =
    size === "medium"
      ? data.conversations.slice(0, 3)
      : data.conversations.slice(0, 6);

  return (
    <View
      className={`p-4 rounded-2xl ${isDark ? "bg-dark-800" : "bg-white"} border ${isDark ? "border-dark-700" : "border-gray-200"}`}
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-full bg-green-500/20 items-center justify-center mr-2">
            <Ionicons name="mail" size={16} color="#22c55e" />
          </View>
          <Text
            className={`text-base font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
          >
            Direct Messages
          </Text>
        </View>
        <View className="flex-row items-center">
          {data.totalUnread > 0 && (
            <View className="bg-green-500 rounded-full min-w-[20px] h-5 items-center justify-center px-1.5 mr-2">
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

      {displayConversations.length === 0 ? (
        <View className="items-center py-4">
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={32}
            color={isDark ? "#4e5058" : "#d1d5db"}
          />
          <Text
            className={`text-sm mt-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            No new messages
          </Text>
        </View>
      ) : (
        displayConversations.map((conv) => (
          <TouchableOpacity
            key={conv.id}
            activeOpacity={0.7}
            onPress={() => router.push(`/chat/${conv.id}`)}
            className="flex-row items-center py-2"
          >
            <Avatar
              uri={conv.avatar}
              name={conv.name}
              size="sm"
              status={conv.isOnline ? "online" : "offline"}
              showStatus
            />
            <View className="flex-1 ml-2 mr-2">
              <Text
                className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}
                numberOfLines={1}
              >
                {conv.name}
              </Text>
              <Text
                className={`text-xs mt-0.5 ${isDark ? "text-dark-300" : "text-gray-600"}`}
                numberOfLines={1}
              >
                {conv.lastMessage}
              </Text>
            </View>
            <View className="items-end">
              <Text
                className={`text-xs ${isDark ? "text-dark-400" : "text-gray-400"}`}
              >
                {conv.lastMessageTimestamp}
              </Text>
              {conv.unreadCount > 0 && (
                <View className="bg-green-500 rounded-full min-w-[16px] h-4 items-center justify-center px-1 mt-1">
                  <Text className="text-white text-[10px] font-bold">
                    {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}
