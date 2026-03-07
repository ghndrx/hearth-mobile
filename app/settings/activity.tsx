import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  FlatList,
  RefreshControl,
  Alert,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

interface Session {
  id: string;
  device: string;
  platform: string;
  location: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
  icon: keyof typeof Ionicons.glyphMap;
}

interface LoginEvent {
  id: string;
  action: string;
  device: string;
  location: string;
  timestamp: string;
  success: boolean;
}

const mockSessions: Session[] = [
  {
    id: "s1",
    device: "iPhone 16 Pro",
    platform: "iOS 19.2",
    location: "San Francisco, CA",
    ip: "192.168.1.***",
    lastActive: "Now",
    isCurrent: true,
    icon: "phone-portrait-outline",
  },
  {
    id: "s2",
    device: "MacBook Pro",
    platform: "macOS 15.3",
    location: "San Francisco, CA",
    ip: "192.168.1.***",
    lastActive: "2 hours ago",
    isCurrent: false,
    icon: "laptop-outline",
  },
  {
    id: "s3",
    device: "Chrome Browser",
    platform: "Windows 11",
    location: "New York, NY",
    ip: "10.0.0.***",
    lastActive: "Yesterday",
    isCurrent: false,
    icon: "globe-outline",
  },
];

const mockLoginHistory: LoginEvent[] = [
  {
    id: "l1",
    action: "Login",
    device: "iPhone 16 Pro",
    location: "San Francisco, CA",
    timestamp: "Today, 9:15 AM",
    success: true,
  },
  {
    id: "l2",
    action: "Login",
    device: "MacBook Pro",
    location: "San Francisco, CA",
    timestamp: "Today, 7:30 AM",
    success: true,
  },
  {
    id: "l3",
    action: "Failed login attempt",
    device: "Unknown Device",
    location: "Moscow, RU",
    timestamp: "Yesterday, 11:45 PM",
    success: false,
  },
  {
    id: "l4",
    action: "Login",
    device: "Chrome Browser",
    location: "New York, NY",
    timestamp: "Yesterday, 3:20 PM",
    success: true,
  },
  {
    id: "l5",
    action: "Password changed",
    device: "iPhone 16 Pro",
    location: "San Francisco, CA",
    timestamp: "Mar 3, 2026",
    success: true,
  },
  {
    id: "l6",
    action: "Login",
    device: "iPad Air",
    location: "San Francisco, CA",
    timestamp: "Mar 2, 2026",
    success: true,
  },
  {
    id: "l7",
    action: "Failed login attempt",
    device: "Unknown Device",
    location: "Beijing, CN",
    timestamp: "Mar 1, 2026",
    success: false,
  },
];

export default function ActivityHistoryScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [sessions, setSessions] = useState(mockSessions);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"sessions" | "history">("sessions");

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleRevokeSession = (session: Session) => {
    Alert.alert(
      "Revoke Session",
      `Sign out from ${session.device}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setSessions((prev) => prev.filter((s) => s.id !== session.id));
          },
        },
      ]
    );
  };

  const handleRevokeAll = () => {
    Alert.alert(
      "Sign Out All Devices",
      "Sign out from all other devices? You'll stay signed in on this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out All",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setSessions((prev) => prev.filter((s) => s.isCurrent));
          },
        },
      ]
    );
  };

  const renderSession = ({ item, index }: { item: Session; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(300)}>
      <TouchableOpacity
        onPress={() => !item.isCurrent && handleRevokeSession(item)}
        activeOpacity={item.isCurrent ? 1 : 0.7}
        className={`flex-row items-center px-4 py-4 ${
          index > 0
            ? `border-t ${isDark ? "border-dark-700" : "border-gray-100"}`
            : ""
        }`}
      >
        <View
          className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
            item.isCurrent
              ? "bg-green-500/10"
              : isDark
              ? "bg-dark-700"
              : "bg-gray-100"
          }`}
        >
          <Ionicons
            name={item.icon}
            size={20}
            color={item.isCurrent ? "#22c55e" : isDark ? "#9ca3af" : "#6b7280"}
          />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text
              className={`text-base font-medium ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              {item.device}
            </Text>
            {item.isCurrent && (
              <View className="ml-2 px-2 py-0.5 rounded-full bg-green-500/10">
                <Text className="text-xs text-green-500 font-medium">
                  Current
                </Text>
              </View>
            )}
          </View>
          <Text
            className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            {item.platform} · {item.location}
          </Text>
          <Text
            className={`text-xs ${isDark ? "text-dark-500" : "text-gray-400"}`}
          >
            Last active: {item.lastActive} · IP: {item.ip}
          </Text>
        </View>
        {!item.isCurrent && (
          <Ionicons
            name="close-circle-outline"
            size={22}
            color="#ef4444"
          />
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  const renderLoginEvent = ({
    item,
    index,
  }: {
    item: LoginEvent;
    index: number;
  }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
      <View
        className={`flex-row items-center px-4 py-3.5 ${
          index > 0
            ? `border-t ${isDark ? "border-dark-700" : "border-gray-100"}`
            : ""
        }`}
      >
        <View
          className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
            item.success ? "bg-green-500/10" : "bg-red-500/10"
          }`}
        >
          <Ionicons
            name={item.success ? "checkmark-circle" : "alert-circle"}
            size={18}
            color={item.success ? "#22c55e" : "#ef4444"}
          />
        </View>
        <View className="flex-1">
          <Text
            className={`text-sm font-medium ${
              item.success
                ? isDark
                  ? "text-white"
                  : "text-gray-900"
                : "text-red-500"
            }`}
          >
            {item.action}
          </Text>
          <Text
            className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            {item.device} · {item.location}
          </Text>
        </View>
        <Text
          className={`text-xs ${isDark ? "text-dark-500" : "text-gray-400"}`}
        >
          {item.timestamp}
        </Text>
      </View>
    </Animated.View>
  );

  return (
    <View className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}>
      <Stack.Screen
        options={{
          title: "Activity",
          headerStyle: {
            backgroundColor: isDark ? "#1e1f22" : "#ffffff",
          },
          headerTintColor: isDark ? "#ffffff" : "#1a1a1a",
        }}
      />

      {/* Tab Switcher */}
      <View
        className={`flex-row mx-4 mt-4 p-1 rounded-xl ${
          isDark ? "bg-dark-800" : "bg-gray-200"
        }`}
      >
        <TouchableOpacity
          onPress={() => setTab("sessions")}
          className={`flex-1 py-2.5 rounded-lg items-center ${
            tab === "sessions"
              ? isDark
                ? "bg-dark-700"
                : "bg-white"
              : ""
          }`}
          activeOpacity={0.7}
        >
          <Text
            className={`text-sm font-medium ${
              tab === "sessions"
                ? isDark
                  ? "text-white"
                  : "text-gray-900"
                : isDark
                ? "text-dark-400"
                : "text-gray-500"
            }`}
          >
            Active Sessions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab("history")}
          className={`flex-1 py-2.5 rounded-lg items-center ${
            tab === "history"
              ? isDark
                ? "bg-dark-700"
                : "bg-white"
              : ""
          }`}
          activeOpacity={0.7}
        >
          <Text
            className={`text-sm font-medium ${
              tab === "history"
                ? isDark
                  ? "text-white"
                  : "text-gray-900"
                : isDark
                ? "text-dark-400"
                : "text-gray-500"
            }`}
          >
            Login History
          </Text>
        </TouchableOpacity>
      </View>

      {tab === "sessions" ? (
        <>
          <View className="mt-4">
            <View
              className={`mx-4 rounded-xl overflow-hidden ${
                isDark ? "bg-dark-800" : "bg-white"
              }`}
            >
              <FlatList
                data={sessions}
                keyExtractor={(item) => item.id}
                renderItem={renderSession}
                scrollEnabled={false}
              />
            </View>
          </View>

          {sessions.filter((s) => !s.isCurrent).length > 0 && (
            <TouchableOpacity
              onPress={handleRevokeAll}
              className={`mx-4 mt-4 py-3.5 rounded-xl items-center ${
                isDark ? "bg-dark-800" : "bg-white"
              }`}
              activeOpacity={0.7}
            >
              <Text className="text-base font-medium text-red-500">
                Sign Out All Other Devices
              </Text>
            </TouchableOpacity>
          )}

          <Text
            className={`mx-4 mt-3 text-xs ${
              isDark ? "text-dark-500" : "text-gray-400"
            }`}
          >
            Tap a session to sign it out. Your current session cannot be revoked
            from here.
          </Text>
        </>
      ) : (
        <View className="mt-4 flex-1">
          <View
            className={`mx-4 rounded-xl overflow-hidden flex-1 ${
              isDark ? "bg-dark-800" : "bg-white"
            }`}
          >
            <FlatList
              data={mockLoginHistory}
              keyExtractor={(item) => item.id}
              renderItem={renderLoginEvent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={isDark ? "#5865f2" : "#4f46e5"}
                />
              }
              contentContainerStyle={{ paddingBottom: 16 }}
            />
          </View>

          <Text
            className={`mx-4 mt-3 mb-4 text-xs ${
              isDark ? "text-dark-500" : "text-gray-400"
            }`}
          >
            Failed login attempts from unknown locations may indicate someone
            trying to access your account. Consider changing your password.
          </Text>
        </View>
      )}
    </View>
  );
}
