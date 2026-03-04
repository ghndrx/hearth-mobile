import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  useColorScheme,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Card } from "../../components/ui";
import { DeviceCard, getRoomIcon } from "../../components/iot";
import type { Device, Room } from "../../lib/types/iot";

const MOCK_ROOMS: Record<string, Room> = {
  r1: {
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
  r2: {
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
  r3: {
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
  r4: {
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
  r5: {
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
};

const MOCK_ROOM_DEVICES: Record<string, Device[]> = {
  r1: [
    {
      id: "1",
      name: "Ceiling Lights",
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
      id: "11",
      name: "Floor Lamp",
      type: "light",
      roomId: "r1",
      status: "online",
      state: { isOn: true, brightness: 60 },
      capabilities: [{ type: "toggle" }, { type: "brightness", min: 0, max: 100 }],
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "12",
      name: "Speaker",
      type: "speaker",
      roomId: "r1",
      status: "online",
      state: { isOn: false },
      capabilities: [{ type: "toggle" }],
      createdAt: "",
      updatedAt: "",
    },
  ],
  r2: [
    {
      id: "4",
      name: "Bedroom Fan",
      type: "fan",
      roomId: "r2",
      status: "online",
      state: { isOn: false, fanSpeed: 2 },
      capabilities: [{ type: "toggle" }, { type: "fan_speed", min: 1, max: 5 }],
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
    {
      id: "13",
      name: "Bedside Lamp",
      type: "light",
      roomId: "r2",
      status: "online",
      state: { isOn: true, brightness: 30 },
      capabilities: [{ type: "toggle" }, { type: "brightness", min: 0, max: 100 }],
      createdAt: "",
      updatedAt: "",
    },
  ],
  r3: [
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
  ],
  r4: [
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
      id: "14",
      name: "Garage Lights",
      type: "light",
      roomId: "r4",
      status: "online",
      state: { isOn: false },
      capabilities: [{ type: "toggle" }],
      createdAt: "",
      updatedAt: "",
    },
  ],
  r5: [
    {
      id: "15",
      name: "Desk Lamp",
      type: "light",
      roomId: "r5",
      status: "online",
      state: { isOn: true, brightness: 90 },
      capabilities: [{ type: "toggle" }, { type: "brightness", min: 0, max: 100 }],
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "16",
      name: "Office Thermostat",
      type: "thermostat",
      roomId: "r5",
      status: "online",
      state: { isOn: true, currentTemperature: 21, targetTemperature: 22 },
      capabilities: [{ type: "toggle" }, { type: "temperature", min: 16, max: 30 }],
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "17",
      name: "Smart Speaker",
      type: "speaker",
      roomId: "r5",
      status: "online",
      state: { isOn: true },
      capabilities: [{ type: "toggle" }],
      createdAt: "",
      updatedAt: "",
    },
  ],
};

export default function RoomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [refreshing, setRefreshing] = useState(false);

  const room = MOCK_ROOMS[id ?? ""] ?? MOCK_ROOMS.r1;
  const [roomDevices, setRoomDevices] = useState<Device[]>(
    MOCK_ROOM_DEVICES[id ?? ""] ?? MOCK_ROOM_DEVICES.r1
  );

  const accentColor = room.color || "#5865f2";

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleToggleDevice = useCallback((device: Device) => {
    setRoomDevices((prev) =>
      prev.map((d) =>
        d.id === device.id
          ? { ...d, state: { ...d.state, isOn: !d.state.isOn } }
          : d
      )
    );
  }, []);

  const onlineDevices = roomDevices.filter((d) => d.status === "online");
  const offlineDevices = roomDevices.filter((d) => d.status !== "online");

  const handleToggleAll = useCallback(
    (turnOn: boolean) => {
      setRoomDevices((prev) =>
        prev.map((d) =>
          d.status === "online" && d.capabilities.some((c) => c.type === "toggle")
            ? { ...d, state: { ...d.state, isOn: turnOn } }
            : d
        )
      );
    },
    []
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: room.name,
          headerRight: () => (
            <TouchableOpacity className="mr-2">
              <Ionicons
                name="settings-outline"
                size={22}
                color={isDark ? "#949ba4" : "#6b7280"}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Room header */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(400)}
          className="items-center pt-6 pb-4"
        >
          <View
            className="w-16 h-16 rounded-2xl items-center justify-center mb-3"
            style={{ backgroundColor: accentColor + "20" }}
          >
            <Ionicons
              name={getRoomIcon(room)}
              size={32}
              color={accentColor}
            />
          </View>
          {(room.temperature != null || room.humidity != null) && (
            <View className="flex-row items-center mt-1" style={{ gap: 16 }}>
              {room.temperature != null && (
                <View className="flex-row items-center">
                  <Ionicons name="thermometer-outline" size={16} color={isDark ? "#949ba4" : "#6b7280"} />
                  <Text className={`ml-1 text-sm ${isDark ? "text-dark-200" : "text-gray-600"}`}>
                    {room.temperature}°
                  </Text>
                </View>
              )}
              {room.humidity != null && (
                <View className="flex-row items-center">
                  <Ionicons name="water-outline" size={16} color={isDark ? "#949ba4" : "#6b7280"} />
                  <Text className={`ml-1 text-sm ${isDark ? "text-dark-200" : "text-gray-600"}`}>
                    {room.humidity}%
                  </Text>
                </View>
              )}
            </View>
          )}
        </Animated.View>

        {/* Quick actions */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          className="flex-row px-5 mb-4"
          style={{ gap: 12 }}
        >
          <TouchableOpacity
            onPress={() => handleToggleAll(true)}
            className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${
              isDark ? "bg-dark-800" : "bg-white"
            } border ${isDark ? "border-dark-700" : "border-gray-200"}`}
          >
            <Ionicons name="sunny-outline" size={18} color="#f59e0b" />
            <Text className={`ml-2 text-sm font-medium ${isDark ? "text-dark-200" : "text-gray-600"}`}>
              All On
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleToggleAll(false)}
            className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${
              isDark ? "bg-dark-800" : "bg-white"
            } border ${isDark ? "border-dark-700" : "border-gray-200"}`}
          >
            <Ionicons name="moon-outline" size={18} color="#6366f1" />
            <Text className={`ml-2 text-sm font-medium ${isDark ? "text-dark-200" : "text-gray-600"}`}>
              All Off
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Online devices */}
        {onlineDevices.length > 0 && (
          <Animated.View entering={FadeInDown.delay(150).duration(400)}>
            <Text
              className={`text-xs font-semibold uppercase tracking-wider px-5 mb-2 ${
                isDark ? "text-dark-400" : "text-gray-500"
              }`}
            >
              Devices ({onlineDevices.length})
            </Text>
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
          </Animated.View>
        )}

        {/* Offline devices */}
        {offlineDevices.length > 0 && (
          <Animated.View entering={FadeInDown.delay(250).duration(400)}>
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

        {/* Room actions */}
        <Animated.View entering={FadeInDown.delay(350).duration(400)} className="px-5 mt-6">
          <Card className={isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"}>
            <TouchableOpacity className="flex-row items-center py-2">
              <Ionicons name="add-circle-outline" size={22} color={isDark ? "#949ba4" : "#6b7280"} />
              <Text className={`ml-3 text-base ${isDark ? "text-dark-200" : "text-gray-600"}`}>
                Add Device to Room
              </Text>
            </TouchableOpacity>
          </Card>
        </Animated.View>
      </ScrollView>
    </>
  );
}
