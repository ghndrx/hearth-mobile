import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert} from "react-native";
import { useColorScheme } from "../../../lib/hooks/useColorScheme";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Avatar } from "../../../components/ui";

export default function DMSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [isMuted, setIsMuted] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [showNotifications, setShowNotifications] = useState(true);

  const mockUser = {
    name: "Sarah Johnson",
    username: "sarah.j",
    isOnline: true,
    mutualServers: 3,
    friendsSince: "January 2025",
  };

  const handleBlock = () => {
    Alert.alert(
      "Block User",
      `Block ${mockUser.name}? They won't be able to message you or see your online status.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            router.back();
          },
        },
      ]
    );
  };

  const handleReport = () => {
    router.push({
      pathname: "/report",
      params: {
        type: "user",
        targetId: id,
        targetName: mockUser.name,
      },
    });
  };

  const handleLeave = () => {
    Alert.alert(
      "Leave Conversation",
      "Leave this conversation? You can still be re-added later.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            router.dismiss();
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
          headerTitle: "Conversation Settings",
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
        }}
      />

      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        {/* User Profile */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(300)}
          className="items-center mt-6 mb-2"
        >
          <Avatar name={mockUser.name} size={56} />
          <Text
            className={`mt-3 text-xl font-bold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            {mockUser.name}
          </Text>
          <Text
            className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            @{mockUser.username}
          </Text>
          <View className="flex-row items-center mt-1">
            <View className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />
            <Text
              className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}
            >
              Online
            </Text>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(300)}
          className="flex-row justify-center mt-4 mb-2"
          style={{ gap: 16 }}
        >
          <TouchableOpacity
            onPress={() => router.push(`/user/${id}`)}
            className="items-center"
            activeOpacity={0.7}
          >
            <View
              className={`w-12 h-12 rounded-full items-center justify-center ${
                isDark ? "bg-dark-800" : "bg-gray-100"
              }`}
            >
              <Ionicons
                name="person-outline"
                size={22}
                color={isDark ? "#9ca3af" : "#6b7280"}
              />
            </View>
            <Text
              className={`text-xs mt-1 ${
                isDark ? "text-dark-400" : "text-gray-500"
              }`}
            >
              Profile
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/chat/media",
                params: { chatId: id },
              })
            }
            className="items-center"
            activeOpacity={0.7}
          >
            <View
              className={`w-12 h-12 rounded-full items-center justify-center ${
                isDark ? "bg-dark-800" : "bg-gray-100"
              }`}
            >
              <Ionicons
                name="images-outline"
                size={22}
                color={isDark ? "#9ca3af" : "#6b7280"}
              />
            </View>
            <Text
              className={`text-xs mt-1 ${
                isDark ? "text-dark-400" : "text-gray-500"
              }`}
            >
              Media
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/chat/pinned",
                params: { chatId: id },
              })
            }
            className="items-center"
            activeOpacity={0.7}
          >
            <View
              className={`w-12 h-12 rounded-full items-center justify-center ${
                isDark ? "bg-dark-800" : "bg-gray-100"
              }`}
            >
              <Ionicons
                name="pin-outline"
                size={22}
                color={isDark ? "#9ca3af" : "#6b7280"}
              />
            </View>
            <Text
              className={`text-xs mt-1 ${
                isDark ? "text-dark-400" : "text-gray-500"
              }`}
            >
              Pinned
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              // Search within conversation
            }}
            className="items-center"
            activeOpacity={0.7}
          >
            <View
              className={`w-12 h-12 rounded-full items-center justify-center ${
                isDark ? "bg-dark-800" : "bg-gray-100"
              }`}
            >
              <Ionicons
                name="search-outline"
                size={22}
                color={isDark ? "#9ca3af" : "#6b7280"}
              />
            </View>
            <Text
              className={`text-xs mt-1 ${
                isDark ? "text-dark-400" : "text-gray-500"
              }`}
            >
              Search
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Info */}
        <Animated.View entering={FadeInDown.delay(150).duration(300)} className="mt-4">
          <Text
            className={`px-4 pb-2 text-xs uppercase tracking-wide ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Info
          </Text>
          <View
            className={`mx-4 rounded-xl overflow-hidden ${
              isDark ? "bg-dark-800" : "bg-white"
            }`}
          >
            <View className="flex-row items-center justify-between px-4 py-3.5">
              <Text
                className={`text-sm ${isDark ? "text-dark-300" : "text-gray-600"}`}
              >
                Friends since
              </Text>
              <Text
                className={`text-sm font-medium ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                {mockUser.friendsSince}
              </Text>
            </View>
            <View
              className={`border-t ${isDark ? "border-dark-700" : "border-gray-100"}`}
            />
            <View className="flex-row items-center justify-between px-4 py-3.5">
              <Text
                className={`text-sm ${isDark ? "text-dark-300" : "text-gray-600"}`}
              >
                Mutual servers
              </Text>
              <Text
                className={`text-sm font-medium ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                {mockUser.mutualServers}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Notification Settings */}
        <Animated.View entering={FadeInDown.delay(200).duration(300)} className="mt-6">
          <Text
            className={`px-4 pb-2 text-xs uppercase tracking-wide ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Notifications
          </Text>
          <View
            className={`mx-4 rounded-xl overflow-hidden ${
              isDark ? "bg-dark-800" : "bg-white"
            }`}
          >
            <View className="flex-row items-center justify-between px-4 py-4">
              <View className="flex-row items-center flex-1 mr-4">
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color={isDark ? "#9ca3af" : "#6b7280"}
                />
                <Text
                  className={`text-base ml-3 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Notifications
                </Text>
              </View>
              <Switch
                value={showNotifications}
                onValueChange={(v) => {
                  setShowNotifications(v);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                trackColor={{ false: "#767577", true: "#5865f2" }}
                thumbColor="#ffffff"
              />
            </View>

            <View
              className={`border-t ${isDark ? "border-dark-700" : "border-gray-100"}`}
            />

            <View className="flex-row items-center justify-between px-4 py-4">
              <View className="flex-row items-center flex-1 mr-4">
                <Ionicons
                  name="volume-mute-outline"
                  size={20}
                  color={isDark ? "#9ca3af" : "#6b7280"}
                />
                <Text
                  className={`text-base ml-3 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Mute Conversation
                </Text>
              </View>
              <Switch
                value={isMuted}
                onValueChange={(v) => {
                  setIsMuted(v);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                trackColor={{ false: "#767577", true: "#f59e0b" }}
                thumbColor="#ffffff"
              />
            </View>

            <View
              className={`border-t ${isDark ? "border-dark-700" : "border-gray-100"}`}
            />

            <View className="flex-row items-center justify-between px-4 py-4">
              <View className="flex-row items-center flex-1 mr-4">
                <Ionicons
                  name="pin-outline"
                  size={20}
                  color={isDark ? "#9ca3af" : "#6b7280"}
                />
                <Text
                  className={`text-base ml-3 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Pin Conversation
                </Text>
              </View>
              <Switch
                value={isPinned}
                onValueChange={(v) => {
                  setIsPinned(v);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                trackColor={{ false: "#767577", true: "#5865f2" }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </Animated.View>

        {/* Actions */}
        <Animated.View entering={FadeInDown.delay(250).duration(300)} className="mt-6">
          <Text className="px-4 pb-2 text-xs uppercase tracking-wide text-red-500">
            Actions
          </Text>
          <View
            className={`mx-4 rounded-xl overflow-hidden ${
              isDark ? "bg-dark-800" : "bg-white"
            }`}
          >
            <TouchableOpacity
              onPress={handleReport}
              className="flex-row items-center px-4 py-4"
              activeOpacity={0.7}
            >
              <Ionicons name="flag-outline" size={20} color="#f59e0b" />
              <Text className="text-base ml-3 text-hearth-amber font-medium">
                Report User
              </Text>
            </TouchableOpacity>

            <View
              className={`border-t ${isDark ? "border-dark-700" : "border-gray-100"}`}
            />

            <TouchableOpacity
              onPress={handleBlock}
              className="flex-row items-center px-4 py-4"
              activeOpacity={0.7}
            >
              <Ionicons name="ban-outline" size={20} color="#ef4444" />
              <Text className="text-base ml-3 text-red-500 font-medium">
                Block User
              </Text>
            </TouchableOpacity>

            <View
              className={`border-t ${isDark ? "border-dark-700" : "border-gray-100"}`}
            />

            <TouchableOpacity
              onPress={handleLeave}
              className="flex-row items-center px-4 py-4"
              activeOpacity={0.7}
            >
              <Ionicons name="exit-outline" size={20} color="#ef4444" />
              <Text className="text-base ml-3 text-red-500 font-medium">
                Leave Conversation
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
