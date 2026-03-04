import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  useColorScheme,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SearchInput } from "../../components/ui";
import { DeviceCard } from "../../components/iot";
import type { Device, DeviceType } from "../../lib/types/iot";

const ALL_DEVICES: Device[] = [
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
    name: "Main Thermostat",
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
    name: "Front Door Lock",
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
  {
    id: "5",
    name: "Garage Door",
    type: "garage",
    roomId: "r4",
    status: "online",
    state: { garageDoorState: "closed" },
    capabilities: [{ type: "garage" }],
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "6",
    name: "Kitchen Lights",
    type: "light",
    roomId: "r3",
    status: "online",
    state: { isOn: true, brightness: 100 },
    capabilities: [{ type: "toggle" }, { type: "brightness", min: 0, max: 100 }],
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "7",
    name: "Doorbell Camera",
    type: "camera",
    roomId: "r3",
    status: "online",
    state: { isOn: true },
    capabilities: [{ type: "toggle" }],
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "8",
    name: "Motion Sensor",
    type: "sensor",
    roomId: "r3",
    status: "online",
    state: { motionDetected: false, batteryLevel: 85 },
    capabilities: [],
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "9",
    name: "Smart Plug",
    type: "plug",
    roomId: "r1",
    status: "offline",
    state: { isOn: false },
    capabilities: [{ type: "toggle" }],
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "10",
    name: "Window Blinds",
    type: "blinds",
    roomId: "r2",
    status: "online",
    state: { blindsPosition: 50, blindsState: "partial" },
    capabilities: [{ type: "blinds", min: 0, max: 100 }],
    createdAt: "",
    updatedAt: "",
  },
];

type FilterType = "all" | DeviceType;

const FILTER_OPTIONS: { id: FilterType; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { id: "all", label: "All", icon: "grid-outline" },
  { id: "light", label: "Lights", icon: "bulb-outline" },
  { id: "thermostat", label: "Climate", icon: "thermometer-outline" },
  { id: "lock", label: "Locks", icon: "lock-closed-outline" },
  { id: "camera", label: "Cameras", icon: "videocam-outline" },
  { id: "sensor", label: "Sensors", icon: "pulse-outline" },
];

export default function DevicesScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [devices, setDevices] = useState(ALL_DEVICES);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
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

  const filteredDevices = devices.filter((device) => {
    const matchesSearch =
      !searchQuery ||
      device.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      activeFilter === "all" || device.type === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const onlineDevices = filteredDevices.filter((d) => d.status === "online");
  const offlineDevices = filteredDevices.filter((d) => d.status !== "online");

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}>
      {/* Header */}
      <View className="px-5 pt-4 pb-2">
        <View className="flex-row items-center justify-between mb-4">
          <Text
            className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
          >
            Devices
          </Text>
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              className={`w-10 h-10 rounded-full items-center justify-center mr-2 ${
                isDark ? "bg-dark-800" : "bg-white"
              }`}
            >
              <Ionicons
                name={viewMode === "grid" ? "list-outline" : "grid-outline"}
                size={20}
                color={isDark ? "#949ba4" : "#6b7280"}
              />
            </TouchableOpacity>
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
        </View>

        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search devices..."
        />
      </View>

      {/* Filters */}
      <Animated.View entering={FadeInDown.delay(50).duration(300)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 8 }}
        >
          {FILTER_OPTIONS.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              onPress={() => setActiveFilter(filter.id)}
              className={`
                flex-row items-center px-4 py-2 rounded-full mr-2
                ${activeFilter === filter.id
                  ? "bg-brand"
                  : isDark ? "bg-dark-800" : "bg-white"
                }
                ${activeFilter !== filter.id
                  ? `border ${isDark ? "border-dark-700" : "border-gray-200"}`
                  : ""
                }
              `}
            >
              <Ionicons
                name={filter.icon}
                size={16}
                color={
                  activeFilter === filter.id
                    ? "#ffffff"
                    : isDark ? "#949ba4" : "#6b7280"
                }
              />
              <Text
                className={`ml-1.5 text-sm font-medium ${
                  activeFilter === filter.id
                    ? "text-white"
                    : isDark ? "text-dark-200" : "text-gray-600"
                }`}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Device List */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Online devices */}
        {onlineDevices.length > 0 && (
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <Text
              className={`text-xs font-semibold uppercase tracking-wider px-5 mt-3 mb-2 ${
                isDark ? "text-dark-400" : "text-gray-500"
              }`}
            >
              Online ({onlineDevices.length})
            </Text>
            {viewMode === "grid" ? (
              <View className="px-5 flex-row flex-wrap" style={{ gap: 12 }}>
                {onlineDevices.map((device) => (
                  <View key={device.id} style={{ width: "47%" }}>
                    <DeviceCard
                      device={device}
                      onPress={(d) => router.push(`/device/${d.id}`)}
                      onToggle={handleToggleDevice}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <View className="px-5">
                {onlineDevices.map((device) => (
                  <DeviceCard
                    key={device.id}
                    device={device}
                    compact
                    onPress={(d) => router.push(`/device/${d.id}`)}
                    onToggle={handleToggleDevice}
                  />
                ))}
              </View>
            )}
          </Animated.View>
        )}

        {/* Offline devices */}
        {offlineDevices.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <Text
              className={`text-xs font-semibold uppercase tracking-wider px-5 mt-5 mb-2 ${
                isDark ? "text-dark-400" : "text-gray-500"
              }`}
            >
              Offline ({offlineDevices.length})
            </Text>
            <View className="px-5">
              {offlineDevices.map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  compact
                  onPress={(d) => router.push(`/device/${d.id}`)}
                />
              ))}
            </View>
          </Animated.View>
        )}

        {filteredDevices.length === 0 && (
          <View className="items-center justify-center py-20">
            <Ionicons
              name="search-outline"
              size={48}
              color={isDark ? "#4e5058" : "#9ca3af"}
            />
            <Text
              className={`text-base mt-4 ${isDark ? "text-dark-400" : "text-gray-500"}`}
            >
              No devices found
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
