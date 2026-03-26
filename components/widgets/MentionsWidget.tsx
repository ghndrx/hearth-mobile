import React from "react";
import { View, Text, TouchableOpacity, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Avatar } from "../ui";
import type { MentionsData, WidgetSize } from "../../lib/types/widgets";

interface Props {
  data: MentionsData;
  size: WidgetSize;
  onRefresh?: () => void;
}

export function MentionsWidget({ data, size, onRefresh }: Props) {
  const isDark = useColorScheme() === "dark";

  if (size === "small") {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push("/(tabs)/notifications")}
        className={`p-4 rounded-2xl ${isDark ? "bg-dark-800" : "bg-white"} border ${isDark ? "border-dark-700" : "border-gray-200"}`}
      >
        <View className="flex-row items-center justify-between mb-2">
          <View className="w-8 h-8 rounded-full bg-hearth-amber/20 items-center justify-center">
            <Ionicons name="at" size={16} color="#f59e0b" />
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
          {data.totalMentions}
        </Text>
        <Text
          className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}
        >
          Mentions
        </Text>
      </TouchableOpacity>
    );
  }

  const displayMentions =
    size === "medium" ? data.mentions.slice(0, 3) : data.mentions.slice(0, 6);

  return (
    <View
      className={`p-4 rounded-2xl ${isDark ? "bg-dark-800" : "bg-white"} border ${isDark ? "border-dark-700" : "border-gray-200"}`}
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-full bg-hearth-amber/20 items-center justify-center mr-2">
            <Ionicons name="at" size={16} color="#f59e0b" />
          </View>
          <Text
            className={`text-base font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
          >
            Mentions
          </Text>
        </View>
        <View className="flex-row items-center">
          {data.totalMentions > 0 && (
            <View className="bg-hearth-amber rounded-full min-w-[20px] h-5 items-center justify-center px-1.5 mr-2">
              <Text className="text-white text-xs font-bold">
                {data.totalMentions > 99 ? "99+" : data.totalMentions}
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

      {displayMentions.length === 0 ? (
        <View className="items-center py-4">
          <Ionicons
            name="checkmark-circle-outline"
            size={32}
            color={isDark ? "#4e5058" : "#d1d5db"}
          />
          <Text
            className={`text-sm mt-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            No new mentions
          </Text>
        </View>
      ) : (
        displayMentions.map((mention) => (
          <TouchableOpacity
            key={mention.id}
            activeOpacity={0.7}
            onPress={() => router.push(`/chat/${mention.channelId}`)}
            className="flex-row items-start py-2"
          >
            <Avatar
              uri={mention.authorAvatar}
              name={mention.authorName}
              size="sm"
            />
            <View className="flex-1 ml-2">
              <View className="flex-row items-center">
                <Text
                  className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {mention.authorName}
                </Text>
                <Text
                  className={`text-xs ml-1 ${isDark ? "text-dark-400" : "text-gray-500"}`}
                >
                  in #{mention.channelName}
                </Text>
              </View>
              <Text
                className={`text-xs mt-0.5 ${isDark ? "text-dark-300" : "text-gray-600"}`}
                numberOfLines={2}
              >
                {mention.content}
              </Text>
              <Text
                className={`text-xs mt-0.5 ${isDark ? "text-dark-400" : "text-gray-400"}`}
              >
                {mention.timestamp}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}
