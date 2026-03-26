import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity} from "react-native";
import { useColorScheme } from "../../lib/hooks/useColorScheme";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { RoomCard } from "../../components/iot";
import type { Room } from "../../lib/types/iot";

const MOCK_ROOMS: Room[] = [
  {
    id: "r1",
    name: "Living Room",
    icon: "living",
    color: "#f59e0b",
    deviceCount: 5,
    activeDeviceCount: 3,
    temperature: 22,
    humidity: 45,
    order: 0,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "r2",
    name: "Bedroom",
    icon: "bedroom",
    color: "#8b5cf6",
    deviceCount: 3,
    activeDeviceCount: 1,
    temperature: 20,
    humidity: 40,
    order: 1,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "r3",
    name: "Kitchen",
    icon: "kitchen",
    color: "#ef4444",
    deviceCount: 4,
    activeDeviceCount: 2,
    temperature: 23,
    humidity: 50,
    order: 2,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "r4",
    name: "Garage",
    icon: "garage",
    color: "#64748b",
    deviceCount: 2,
    activeDeviceCount: 0,
    temperature: 18,
    order: 3,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "r5",
    name: "Office",
    icon: "office",
    color: "#3b82f6",
    deviceCount: 3,
    activeDeviceCount: 2,
    temperature: 21,
    humidity: 42,
    order: 4,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "r6",
    name: "Bathroom",
    icon: "bathroom",
    color: "#06b6d4",
    deviceCount: 2,
    activeDeviceCount: 0,
    temperature: 24,
    humidity: 65,
    order: 5,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "r7",
    name: "Garden",
    icon: "garden",
    color: "#22c55e",
    deviceCount: 3,
    activeDeviceCount: 1,
    order: 6,
    createdAt: "",
    updatedAt: "",
  },
];

export default function RoomsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const totalDevices = MOCK_ROOMS.reduce((sum, r) => sum + r.deviceCount, 0);
  const totalActive = MOCK_ROOMS.reduce((sum, r) => sum + r.activeDeviceCount, 0);

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}>
      {/* Header */}
      <View className="px-5 pt-4 pb-2">
        <View className="flex-row items-center justify-between mb-2">
          <Text
            className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
          >
            Rooms
          </Text>
          <TouchableOpacity
            className={`w-10 h-10 rounded-full items-center justify-center ${
              isDark ? "bg-dark-800" : "bg-white"
            }`}
          >
            <Ionicons
              name="add"
              size={22}
              color={isDark ? "#949ba4" : "#6b7280"}
            />
          </TouchableOpacity>
        </View>
        <Text className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}>
          {MOCK_ROOMS.length} rooms · {totalDevices} devices · {totalActive} active
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Summary cards */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(400)}
          className="flex-row px-5 mt-4"
          style={{ gap: 12 }}
        >
          <SummaryCard
            icon="thermometer-outline"
            label="Avg Temp"
            value={`${Math.round(
              MOCK_ROOMS.filter((r) => r.temperature != null).reduce(
                (sum, r) => sum + (r.temperature ?? 0),
                0
              ) / MOCK_ROOMS.filter((r) => r.temperature != null).length
            )}°`}
            color="#ef4444"
            isDark={isDark}
          />
          <SummaryCard
            icon="water-outline"
            label="Avg Humidity"
            value={`${Math.round(
              MOCK_ROOMS.filter((r) => r.humidity != null).reduce(
                (sum, r) => sum + (r.humidity ?? 0),
                0
              ) / MOCK_ROOMS.filter((r) => r.humidity != null).length
            )}%`}
            color="#3b82f6"
            isDark={isDark}
          />
          <SummaryCard
            icon="flash-outline"
            label="Active"
            value={`${totalActive}`}
            color="#22c55e"
            isDark={isDark}
          />
        </Animated.View>

        {/* Room list */}
        <View className="px-5 mt-5">
          {MOCK_ROOMS.map((room, index) => (
            <Animated.View
              key={room.id}
              entering={FadeInDown.delay(100 + index * 50).duration(400)}
            >
              <RoomCard
                room={room}
                onPress={(r) => router.push(`/room/${r.id}`)}
              />
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface SummaryCardProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  color: string;
  isDark: boolean;
}

function SummaryCard({ icon, label, value, color, isDark }: SummaryCardProps) {
  return (
    <View
      className={`flex-1 items-center p-3 rounded-xl ${
        isDark ? "bg-dark-800" : "bg-white"
      } border ${isDark ? "border-dark-700" : "border-gray-200"}`}
    >
      <Ionicons name={icon} size={20} color={color} />
      <Text
        className={`text-lg font-bold mt-1 ${isDark ? "text-white" : "text-gray-900"}`}
      >
        {value}
      </Text>
      <Text className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}>
        {label}
      </Text>
    </View>
  );
}
