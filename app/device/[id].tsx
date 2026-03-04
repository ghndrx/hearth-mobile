import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  useColorScheme,
  TouchableOpacity,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Card } from "../../components/ui";
import { DeviceControl, DEVICE_ICONS, DEVICE_COLORS } from "../../components/iot";
import type { Device, DeviceState } from "../../lib/types/iot";

// Mock: In production, fetch from API based on id
const MOCK_DEVICES: Record<string, Device> = {
  "1": {
    id: "1",
    name: "Living Room Lights",
    type: "light",
    roomId: "r1",
    status: "online",
    state: { isOn: true, brightness: 80, colorTemperature: 4000 },
    capabilities: [
      { type: "toggle" },
      { type: "brightness", min: 0, max: 100 },
      { type: "color", min: 2700, max: 6500 },
    ],
    manufacturer: "Philips",
    model: "Hue White Ambiance",
    firmwareVersion: "1.88.1",
    lastSeen: new Date().toISOString(),
    createdAt: "",
    updatedAt: "",
  },
  "2": {
    id: "2",
    name: "Main Thermostat",
    type: "thermostat",
    roomId: "r1",
    status: "online",
    state: { isOn: true, currentTemperature: 22, targetTemperature: 23, humidity: 45 },
    capabilities: [
      { type: "toggle" },
      { type: "temperature", min: 16, max: 30, step: 0.5, unit: "°C" },
    ],
    manufacturer: "Nest",
    model: "Learning Thermostat",
    firmwareVersion: "5.9.3",
    lastSeen: new Date().toISOString(),
    createdAt: "",
    updatedAt: "",
  },
  "3": {
    id: "3",
    name: "Front Door Lock",
    type: "lock",
    roomId: "r3",
    status: "online",
    state: { lockState: "locked", batteryLevel: 78 },
    capabilities: [{ type: "lock" }],
    manufacturer: "August",
    model: "Wi-Fi Smart Lock",
    firmwareVersion: "2.12.0",
    lastSeen: new Date().toISOString(),
    createdAt: "",
    updatedAt: "",
  },
  "4": {
    id: "4",
    name: "Bedroom Fan",
    type: "fan",
    roomId: "r2",
    status: "online",
    state: { isOn: false, fanSpeed: 2 },
    capabilities: [
      { type: "toggle" },
      { type: "fan_speed", min: 1, max: 5, step: 1 },
    ],
    manufacturer: "Hunter",
    model: "Signal Smart Fan",
    firmwareVersion: "3.1.0",
    lastSeen: new Date().toISOString(),
    createdAt: "",
    updatedAt: "",
  },
  "5": {
    id: "5",
    name: "Garage Door",
    type: "garage",
    roomId: "r4",
    status: "online",
    state: { garageDoorState: "closed" },
    capabilities: [{ type: "garage" }],
    manufacturer: "Chamberlain",
    model: "myQ Smart Opener",
    firmwareVersion: "1.5.0",
    lastSeen: new Date().toISOString(),
    createdAt: "",
    updatedAt: "",
  },
  "10": {
    id: "10",
    name: "Window Blinds",
    type: "blinds",
    roomId: "r2",
    status: "online",
    state: { blindsPosition: 50, blindsState: "partial" },
    capabilities: [{ type: "blinds", min: 0, max: 100, step: 5 }],
    manufacturer: "Lutron",
    model: "Serena Smart Shades",
    firmwareVersion: "7.2.1",
    lastSeen: new Date().toISOString(),
    createdAt: "",
    updatedAt: "",
  },
};

export default function DeviceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const initialDevice = MOCK_DEVICES[id ?? ""] ?? MOCK_DEVICES["1"];
  const [device, setDevice] = useState<Device>(initialDevice);

  const color = DEVICE_COLORS[device.type];
  const isOnline = device.status === "online";

  const handleStateChange = useCallback(
    (newState: Partial<DeviceState>) => {
      setDevice((prev) => ({
        ...prev,
        state: { ...prev.state, ...newState },
      }));
      // In production: await deviceService.updateDeviceState(device.id, newState)
    },
    []
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: device.name,
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
      >
        {/* Device header */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(400)}
          className="items-center pt-6 pb-4"
        >
          <View
            className="w-20 h-20 rounded-2xl items-center justify-center mb-4"
            style={{
              backgroundColor: isOnline ? color + "20" : isDark ? "#2b2d31" : "#f3f4f6",
            }}
          >
            <Ionicons
              name={DEVICE_ICONS[device.type]}
              size={40}
              color={isOnline ? color : isDark ? "#6b7280" : "#9ca3af"}
            />
          </View>
          <Text
            className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
          >
            {device.name}
          </Text>
          <View className="flex-row items-center mt-1">
            <View
              className={`w-2 h-2 rounded-full mr-2 ${
                isOnline ? "bg-iot-online" : "bg-iot-offline"
              }`}
            />
            <Text className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}>
              {device.status.charAt(0).toUpperCase() + device.status.slice(1)}
            </Text>
          </View>
        </Animated.View>

        {/* Controls */}
        {isOnline && (
          <Animated.View entering={FadeInDown.delay(150).duration(400)} className="px-5">
            <Card className={isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"}>
              <DeviceControl device={device} onStateChange={handleStateChange} />
            </Card>
          </Animated.View>
        )}

        {/* Sensor readings */}
        {device.state.currentTemperature != null && (
          <Animated.View entering={FadeInDown.delay(250).duration(400)} className="px-5 mt-4">
            <Card
              title="Readings"
              className={isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"}
            >
              <View className="flex-row" style={{ gap: 16 }}>
                {device.state.currentTemperature != null && (
                  <ReadingItem
                    icon="thermometer-outline"
                    label="Temperature"
                    value={`${device.state.currentTemperature}°`}
                    color="#ef4444"
                    isDark={isDark}
                  />
                )}
                {device.state.humidity != null && (
                  <ReadingItem
                    icon="water-outline"
                    label="Humidity"
                    value={`${device.state.humidity}%`}
                    color="#3b82f6"
                    isDark={isDark}
                  />
                )}
              </View>
            </Card>
          </Animated.View>
        )}

        {/* Battery level */}
        {device.state.batteryLevel != null && (
          <Animated.View entering={FadeInDown.delay(300).duration(400)} className="px-5 mt-4">
            <Card className={isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"}>
              <View className="flex-row items-center">
                <Ionicons
                  name={
                    device.state.batteryLevel > 75
                      ? "battery-full-outline"
                      : device.state.batteryLevel > 25
                        ? "battery-half-outline"
                        : "battery-dead-outline"
                  }
                  size={22}
                  color={
                    device.state.batteryLevel > 25 ? "#22c55e" : "#ef4444"
                  }
                />
                <Text
                  className={`ml-3 text-base ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  Battery
                </Text>
                <Text
                  className={`ml-auto text-base font-semibold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {device.state.batteryLevel}%
                </Text>
              </View>
            </Card>
          </Animated.View>
        )}

        {/* Device info */}
        <Animated.View entering={FadeInDown.delay(350).duration(400)} className="px-5 mt-4">
          <Card
            title="Device Info"
            className={isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"}
          >
            <InfoRow
              label="Manufacturer"
              value={device.manufacturer ?? "Unknown"}
              isDark={isDark}
            />
            <InfoRow label="Model" value={device.model ?? "Unknown"} isDark={isDark} />
            <InfoRow
              label="Firmware"
              value={device.firmwareVersion ?? "Unknown"}
              isDark={isDark}
            />
            <InfoRow
              label="Last Seen"
              value={device.lastSeen ? new Date(device.lastSeen).toLocaleString() : "Never"}
              isDark={isDark}
              isLast
            />
          </Card>
        </Animated.View>

        {/* Actions */}
        <Animated.View entering={FadeInDown.delay(450).duration(400)} className="px-5 mt-4">
          <TouchableOpacity
            className={`flex-row items-center justify-center py-4 rounded-xl ${
              isDark ? "bg-dark-800" : "bg-white"
            } border ${isDark ? "border-dark-700" : "border-gray-200"}`}
          >
            <Ionicons name="swap-horizontal-outline" size={20} color={isDark ? "#949ba4" : "#6b7280"} />
            <Text className={`ml-2 font-medium ${isDark ? "text-dark-200" : "text-gray-600"}`}>
              Move to Another Room
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center justify-center py-4 rounded-xl mt-3 bg-red-500/10 border border-red-500/20"
            onPress={() => router.back()}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
            <Text className="ml-2 font-medium text-red-500">Remove Device</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </>
  );
}

interface ReadingItemProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  color: string;
  isDark: boolean;
}

function ReadingItem({ icon, label, value, color, isDark }: ReadingItemProps) {
  return (
    <View className="flex-1 items-center">
      <Ionicons name={icon} size={22} color={color} />
      <Text className={`text-2xl font-bold mt-1 ${isDark ? "text-white" : "text-gray-900"}`}>
        {value}
      </Text>
      <Text className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}>
        {label}
      </Text>
    </View>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
  isDark: boolean;
  isLast?: boolean;
}

function InfoRow({ label, value, isDark, isLast }: InfoRowProps) {
  return (
    <>
      <View className="flex-row items-center justify-between py-2">
        <Text className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}>
          {label}
        </Text>
        <Text
          className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}
        >
          {value}
        </Text>
      </View>
      {!isLast && (
        <View className={`h-px ${isDark ? "bg-dark-700" : "bg-gray-100"}`} />
      )}
    </>
  );
}
