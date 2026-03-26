import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert} from "react-native";
import { useColorScheme } from "../../../../../lib/hooks/useColorScheme";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

export default function ChannelSettingsScreen() {
  const { serverId, channelId } = useLocalSearchParams<{
    serverId: string;
    channelId: string;
  }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [channelName, setChannelName] = useState("general");
  const [topic, setTopic] = useState(
    "General discussion about the project and team updates"
  );
  const [isNsfw, setIsNsfw] = useState(false);
  const [slowMode, setSlowMode] = useState(0);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const slowModeOptions = [
    { label: "Off", value: 0 },
    { label: "5s", value: 5 },
    { label: "10s", value: 10 },
    { label: "30s", value: 30 },
    { label: "1m", value: 60 },
    { label: "5m", value: 300 },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => {
      setIsSaving(false);
      Alert.alert("Saved", "Channel settings have been updated.");
    }, 800);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Channel",
      `Are you sure you want to delete #${channelName}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            router.back();
          },
        },
      ]
    );
  };

  const handleArchive = () => {
    Alert.alert(
      "Archive Channel",
      `Archive #${channelName}? Members won't be able to send new messages.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Channel Settings",
          headerTitleStyle: {
            color: isDark ? "#ffffff" : "#111827",
            fontSize: 18,
            fontWeight: "bold",
          },
          headerStyle: {
            backgroundColor: isDark ? "#1e1f22" : "#ffffff",
          },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="ml-2">
              <Ionicons
                name="chevron-back"
                size={28}
                color={isDark ? "#80848e" : "#6b7280"}
              />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              className="mr-2"
            >
              <Text
                className={`text-base font-semibold ${
                  isSaving ? "text-gray-400" : "text-brand"
                }`}
              >
                {isSaving ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        {/* Channel Name */}
        <Animated.View entering={FadeInDown.delay(50).duration(300)} className="mt-6">
          <Text
            className={`px-4 pb-2 text-xs uppercase tracking-wide ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Channel Name
          </Text>
          <View
            className={`mx-4 rounded-xl overflow-hidden ${
              isDark ? "bg-dark-800" : "bg-white"
            }`}
          >
            <View className="flex-row items-center px-4 py-3">
              <Ionicons
                name="chatbubble-outline"
                size={18}
                color={isDark ? "#80848e" : "#9ca3af"}
              />
              <TextInput
                value={channelName}
                onChangeText={setChannelName}
                className={`flex-1 ml-2 text-base ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
                placeholderTextColor={isDark ? "#4e5058" : "#9ca3af"}
                placeholder="channel-name"
                autoCapitalize="none"
              />
            </View>
          </View>
        </Animated.View>

        {/* Topic */}
        <Animated.View entering={FadeInDown.delay(100).duration(300)} className="mt-6">
          <Text
            className={`px-4 pb-2 text-xs uppercase tracking-wide ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Channel Topic
          </Text>
          <View
            className={`mx-4 rounded-xl overflow-hidden ${
              isDark ? "bg-dark-800" : "bg-white"
            }`}
          >
            <TextInput
              value={topic}
              onChangeText={setTopic}
              className={`px-4 py-3 text-base ${
                isDark ? "text-white" : "text-gray-900"
              }`}
              placeholderTextColor={isDark ? "#4e5058" : "#9ca3af"}
              placeholder="Set a topic for this channel"
              multiline
              numberOfLines={3}
              style={{ minHeight: 80, textAlignVertical: "top" }}
            />
          </View>
          <Text
            className={`px-4 mt-2 text-xs ${
              isDark ? "text-gray-500" : "text-gray-400"
            }`}
          >
            The topic appears at the top of the channel for all members.
          </Text>
        </Animated.View>

        {/* Privacy */}
        <Animated.View entering={FadeInDown.delay(150).duration(300)} className="mt-6">
          <Text
            className={`px-4 pb-2 text-xs uppercase tracking-wide ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Permissions
          </Text>
          <View
            className={`mx-4 rounded-xl overflow-hidden ${
              isDark ? "bg-dark-800" : "bg-white"
            }`}
          >
            <View className="flex-row items-center justify-between px-4 py-4">
              <View className="flex-row items-center flex-1 mr-4">
                <View
                  className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                    isDark ? "bg-dark-700" : "bg-gray-100"
                  }`}
                >
                  <Ionicons
                    name={isPrivate ? "lock-closed" : "globe-outline"}
                    size={20}
                    color={isPrivate ? "#f59e0b" : isDark ? "#9ca3af" : "#6b7280"}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className={`text-base font-medium ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Private Channel
                  </Text>
                  <Text
                    className={`text-sm ${
                      isDark ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    Only selected members can view
                  </Text>
                </View>
              </View>
              <Switch
                value={isPrivate}
                onValueChange={setIsPrivate}
                trackColor={{ false: "#767577", true: "#5865f2" }}
                thumbColor="#ffffff"
              />
            </View>

            <View
              className={`border-t ${
                isDark ? "border-dark-700" : "border-gray-100"
              }`}
            />

            <View className="flex-row items-center justify-between px-4 py-4">
              <View className="flex-row items-center flex-1 mr-4">
                <View
                  className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                    isDark ? "bg-dark-700" : "bg-gray-100"
                  }`}
                >
                  <Ionicons
                    name="warning-outline"
                    size={20}
                    color={isNsfw ? "#ef4444" : isDark ? "#9ca3af" : "#6b7280"}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className={`text-base font-medium ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Age-Restricted
                  </Text>
                  <Text
                    className={`text-sm ${
                      isDark ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    Requires age verification to view
                  </Text>
                </View>
              </View>
              <Switch
                value={isNsfw}
                onValueChange={setIsNsfw}
                trackColor={{ false: "#767577", true: "#ef4444" }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </Animated.View>

        {/* Slow Mode */}
        <Animated.View entering={FadeInDown.delay(200).duration(300)} className="mt-6">
          <Text
            className={`px-4 pb-2 text-xs uppercase tracking-wide ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Slow Mode
          </Text>
          <View
            className={`mx-4 rounded-xl overflow-hidden ${
              isDark ? "bg-dark-800" : "bg-white"
            }`}
          >
            <View className="px-4 py-3">
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {slowModeOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => {
                      setSlowMode(opt.value);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    className={`px-4 py-2 rounded-full ${
                      slowMode === opt.value
                        ? "bg-brand"
                        : isDark
                        ? "bg-dark-700"
                        : "bg-gray-100"
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        slowMode === opt.value
                          ? "text-white"
                          : isDark
                          ? "text-dark-200"
                          : "text-gray-700"
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
          <Text
            className={`px-4 mt-2 text-xs ${
              isDark ? "text-gray-500" : "text-gray-400"
            }`}
          >
            Limits how often members can send messages in this channel.
          </Text>
        </Animated.View>

        {/* Danger Zone */}
        <Animated.View entering={FadeInDown.delay(250).duration(300)} className="mt-8">
          <Text
            className={`px-4 pb-2 text-xs uppercase tracking-wide text-red-500`}
          >
            Danger Zone
          </Text>
          <View
            className={`mx-4 rounded-xl overflow-hidden ${
              isDark ? "bg-dark-800" : "bg-white"
            }`}
          >
            <TouchableOpacity
              onPress={handleArchive}
              className="flex-row items-center px-4 py-4"
              activeOpacity={0.7}
            >
              <View
                className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                  isDark ? "bg-dark-700" : "bg-gray-100"
                }`}
              >
                <Ionicons name="archive-outline" size={20} color="#f59e0b" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-medium text-hearth-amber">
                  Archive Channel
                </Text>
                <Text
                  className={`text-sm ${
                    isDark ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Read-only, can be restored later
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={isDark ? "#4b5563" : "#9ca3af"}
              />
            </TouchableOpacity>

            <View
              className={`border-t ${
                isDark ? "border-dark-700" : "border-gray-100"
              }`}
            />

            <TouchableOpacity
              onPress={handleDelete}
              className="flex-row items-center px-4 py-4"
              activeOpacity={0.7}
            >
              <View
                className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                  isDark ? "bg-dark-700" : "bg-gray-100"
                }`}
              >
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-medium text-red-500">
                  Delete Channel
                </Text>
                <Text
                  className={`text-sm ${
                    isDark ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Permanently delete this channel and all messages
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={isDark ? "#4b5563" : "#9ca3af"}
              />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
