import React from "react";
import { View, Text, TouchableOpacity, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Room } from "../../lib/types/iot";

interface RoomCardProps {
  room: Room;
  onPress?: (room: Room) => void;
}

const ROOM_ICONS: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
  living: "tv-outline",
  bedroom: "bed-outline",
  kitchen: "restaurant-outline",
  bathroom: "water-outline",
  office: "desktop-outline",
  garage: "car-outline",
  garden: "leaf-outline",
  hallway: "walk-outline",
  default: "cube-outline",
};

function getRoomIcon(room: Room): React.ComponentProps<typeof Ionicons>["name"] {
  if (room.icon && ROOM_ICONS[room.icon]) return ROOM_ICONS[room.icon];
  const nameLower = room.name.toLowerCase();
  for (const [key, icon] of Object.entries(ROOM_ICONS)) {
    if (nameLower.includes(key)) return icon;
  }
  return ROOM_ICONS.default;
}

export function RoomCard({ room, onPress }: RoomCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const hasActiveDevices = room.activeDeviceCount > 0;
  const accentColor = room.color || "#5865f2";

  return (
    <TouchableOpacity
      onPress={() => onPress?.(room)}
      activeOpacity={0.7}
      className={`
        p-4 rounded-2xl mb-3
        ${isDark ? "bg-dark-800" : "bg-white"}
        border ${isDark ? "border-dark-700" : "border-gray-200"}
      `}
    >
      <View className="flex-row items-center">
        <View
          className="w-12 h-12 rounded-xl items-center justify-center mr-4"
          style={{
            backgroundColor: hasActiveDevices ? accentColor + "20" : isDark ? "#2b2d31" : "#f3f4f6",
          }}
        >
          <Ionicons
            name={getRoomIcon(room)}
            size={24}
            color={hasActiveDevices ? accentColor : isDark ? "#6b7280" : "#9ca3af"}
          />
        </View>
        <View className="flex-1">
          <Text
            className={`text-base font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
            numberOfLines={1}
          >
            {room.name}
          </Text>
          <Text className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}>
            {room.deviceCount} device{room.deviceCount !== 1 ? "s" : ""}
            {hasActiveDevices && ` · ${room.activeDeviceCount} active`}
          </Text>
        </View>
        <View className="items-end">
          {room.temperature != null && (
            <Text
              className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
            >
              {room.temperature}°
            </Text>
          )}
          {room.humidity != null && (
            <Text className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}>
              {room.humidity}% humidity
            </Text>
          )}
          {room.temperature == null && (
            <Ionicons
              name="chevron-forward"
              size={20}
              color={isDark ? "#4e5058" : "#9ca3af"}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export { ROOM_ICONS, getRoomIcon };
