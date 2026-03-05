import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  useColorScheme,
  RefreshControl,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Card } from "../../components/ui";
import { DeviceCard, SceneCard, RoomCard } from "../../components/iot";
import { QuickCaptureFab } from "../../components/QuickCaptureFab";
import type { Device, Room, Scene, HomeAlert } from "../../lib/types/iot";

// Mock data for demonstration
const MOCK_DEVICES: Device[] = [
  {
    id: "1",
    name: "Living Room Lights",
    type: "light",
    roomId: "r1",
    status: "online",
    state: { isOn: true, brightness: 80 },
    capabilities: [{ type: "toggle" }, { type: "brightness", min: 0, max: 100 }],
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "2",
    name: "Thermostat",
    type: "thermostat",
    roomId: "r1",
    status: "online",
    state: { isOn: true, currentTemperature: 22, targetTemperature: 23 },
    capabilities: [{ type: "toggle" }, { type: "temperature", min: 16, max: 30 }],
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "3",
    name: "Front Door",
    type: "lock",
    roomId: "r3",
    status: "online",
    state: { lockState: "locked" },
    capabilities: [{ type: "lock" }],
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "4",
    name: "Bedroom Fan",
    type: "fan",
    roomId: "r2",
    status: "online",
    state: { isOn: false },
    capabilities: [{ type: "toggle" }, { type: "fan_speed", min: 1, max: 5 }],
    createdAt: "",
    updatedAt: "",
  },
];

const MOCK_ROOMS: Room[] = [
  {
    id: "r1",
    name: "Living Room",
    icon: "living",
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
    deviceCount: 3,
    activeDeviceCount: 1,
    temperature: 20,
    order: 1,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "r3",
    name: "Kitchen",
    icon: "kitchen",
    deviceCount: 4,
    activeDeviceCount: 2,
    temperature: 23,
    order: 2,
    createdAt: "",
    updatedAt: "",
  },
];

const MOCK_SCENES: Scene[] = [
  {
    id: "s1",
    name: "Movie Night",
    icon: "movie",
    color: "#8b5cf6",
    deviceActions: [],
    isActive: false,
    createdAt: "",
  },
  {
    id: "s2",
    name: "Good Night",
    icon: "sleep",
    color: "#3b82f6",
    deviceActions: [],
    isActive: false,
    createdAt: "",
  },
  {
    id: "s3",
    name: "Morning",
    icon: "morning",
    color: "#f59e0b",
    deviceActions: [],
    isActive: true,
    createdAt: "",
  },
  {
    id: "s4",
    name: "Away",
    icon: "away",
    color: "#6b7280",
    deviceActions: [],
    isActive: false,
    createdAt: "",
  },
];

const MOCK_ALERTS: HomeAlert[] = [
  {
    id: "a1",
    severity: "warning",
    title: "Garage Door Open",
    message: "Your garage door has been open for 30 minutes",
    acknowledged: false,
    createdAt: new Date().toISOString(),
  },
];

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [refreshing, setRefreshing] = useState(false);
  const [devices, setDevices] = useState(MOCK_DEVICES);
  const [alerts] = useState(MOCK_ALERTS);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // In production: await deviceService.getHomeOverview()
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleToggleDevice = useCallback((device: Device) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === device.id
          ? { ...d, state: { ...d.state, isOn: !d.state.isOn } }
          : d
      )
    );
  }, []);

  const onlineCount = devices.filter((d) => d.status === "online").length;

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(400)}
          className="px-5 pt-4 pb-2"
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text
                className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
              >
                My Home
              </Text>
              <Text className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                {onlineCount} of {devices.length} devices online
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/settings/notifications")}
              className={`w-10 h-10 rounded-full items-center justify-center ${
                isDark ? "bg-dark-800" : "bg-white"
              }`}
            >
              <Ionicons
                name="notifications-outline"
                size={22}
                color={isDark ? "#949ba4" : "#6b7280"}
              />
              {alerts.length > 0 && (
                <View className="absolute top-1 right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-dark-900" />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Alerts */}
        {alerts.filter((a) => !a.acknowledged).map((alert) => (
          <Animated.View
            key={alert.id}
            entering={FadeInDown.delay(100).duration(400)}
            className="px-5 mt-3"
          >
            <View
              className={`flex-row items-center p-3 rounded-xl ${
                alert.severity === "critical"
                  ? "bg-red-500/10 border border-red-500/30"
                  : "bg-hearth-amber/10 border border-hearth-amber/30"
              }`}
            >
              <Ionicons
                name={alert.severity === "critical" ? "alert-circle" : "warning"}
                size={20}
                color={alert.severity === "critical" ? "#ef4444" : "#f59e0b"}
              />
              <View className="flex-1 ml-3">
                <Text
                  className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {alert.title}
                </Text>
                <Text
                  className={`text-xs ${isDark ? "text-dark-300" : "text-gray-500"}`}
                >
                  {alert.message}
                </Text>
              </View>
            </View>
          </Animated.View>
        ))}

        {/* Quick Scenes */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
          <View className="flex-row items-center justify-between px-5 mt-5 mb-3">
            <Text
              className={`text-base font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
            >
              Scenes
            </Text>
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={MOCK_SCENES}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            renderItem={({ item }) => (
              <SceneCard scene={item} onPress={() => {}} />
            )}
          />
        </Animated.View>

        {/* Favorite Devices */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)}>
          <View className="flex-row items-center justify-between px-5 mt-6 mb-3">
            <Text
              className={`text-base font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
            >
              Quick Controls
            </Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/devices")}>
              <Text className="text-brand text-sm font-medium">See All</Text>
            </TouchableOpacity>
          </View>
          <View className="px-5 flex-row flex-wrap" style={{ gap: 12 }}>
            {devices.map((device) => (
              <View key={device.id} style={{ width: "47%" }}>
                <DeviceCard
                  device={device}
                  onPress={(d) => router.push(`/device/${d.id}`)}
                  onToggle={handleToggleDevice}
                />
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Rooms Overview */}
        <Animated.View entering={FadeInDown.delay(350).duration(400)}>
          <View className="flex-row items-center justify-between px-5 mt-6 mb-3">
            <Text
              className={`text-base font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
            >
              Rooms
            </Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/rooms")}>
              <Text className="text-brand text-sm font-medium">See All</Text>
            </TouchableOpacity>
          </View>
          <View className="px-5">
            {MOCK_ROOMS.slice(0, 3).map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                onPress={(r) => router.push(`/room/${r.id}`)}
              />
            ))}
          </View>
        </Animated.View>

        {/* Energy Summary */}
        <Animated.View entering={FadeInDown.delay(450).duration(400)} className="px-5 mt-6">
          <Card
            title="Energy Today"
            className={isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"}
          >
            <View className="flex-row justify-between">
              <StatItem
                label="Active Devices"
                value={`${devices.filter((d) => d.state.isOn).length}`}
                icon="flash-outline"
                color="#f59e0b"
                isDark={isDark}
              />
              <StatItem
                label="Avg Temp"
                value="22°"
                icon="thermometer-outline"
                color="#ef4444"
                isDark={isDark}
              />
              <StatItem
                label="Humidity"
                value="45%"
                icon="water-outline"
                color="#3b82f6"
                isDark={isDark}
              />
            </View>
          </Card>
        </Animated.View>
      </ScrollView>

      {/* Quick Capture FAB */}
      <QuickCaptureFab size="lg" position="bottomRight" />
    </SafeAreaView>
  );
}

interface StatItemProps {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  isDark: boolean;
}

function StatItem({ label, value, icon, color, isDark }: StatItemProps) {
  return (
    <View className="items-center flex-1">
      <View
        className="w-10 h-10 rounded-full items-center justify-center mb-2"
        style={{ backgroundColor: color + "20" }}
      >
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text
        className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}
      >
        {value}
      </Text>
      <Text className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}>
        {label}
      </Text>
    </View>
  );
}
