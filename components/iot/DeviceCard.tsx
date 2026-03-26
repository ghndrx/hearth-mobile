import React from "react";
import { View, Text, TouchableOpacity} from "react-native";
import { useColorScheme } from "../../lib/hooks/useColorScheme";
import { Ionicons } from "@expo/vector-icons";
import type { Device, DeviceType } from "../../lib/types/iot";

interface DeviceCardProps {
  device: Device;
  onPress?: (device: Device) => void;
  onToggle?: (device: Device) => void;
  compact?: boolean;
}

const DEVICE_ICONS: Record<DeviceType, React.ComponentProps<typeof Ionicons>["name"]> = {
  light: "bulb-outline",
  thermostat: "thermometer-outline",
  lock: "lock-closed-outline",
  camera: "videocam-outline",
  sensor: "pulse-outline",
  switch: "toggle-outline",
  plug: "flash-outline",
  speaker: "volume-medium-outline",
  blinds: "reorder-four-outline",
  fan: "leaf-outline",
  garage: "car-outline",
  doorbell: "notifications-outline",
};

const DEVICE_COLORS: Record<DeviceType, string> = {
  light: "#f59e0b",
  thermostat: "#ef4444",
  lock: "#3b82f6",
  camera: "#8b5cf6",
  sensor: "#22c55e",
  switch: "#6366f1",
  plug: "#f97316",
  speaker: "#ec4899",
  blinds: "#14b8a6",
  fan: "#06b6d4",
  garage: "#64748b",
  doorbell: "#eab308",
};

function getDeviceStateLabel(device: Device): string {
  if (device.status === "offline") return "Offline";
  if (device.status === "error") return "Error";
  if (device.status === "updating") return "Updating...";

  switch (device.type) {
    case "light":
      if (!device.state.isOn) return "Off";
      return device.state.brightness
        ? `${device.state.brightness}%`
        : "On";
    case "thermostat":
      if (device.state.currentTemperature != null) {
        return `${device.state.currentTemperature}°`;
      }
      return device.state.isOn ? "Heating" : "Off";
    case "lock":
      return device.state.lockState === "locked" ? "Locked" : "Unlocked";
    case "sensor":
      if (device.state.currentTemperature != null) {
        return `${device.state.currentTemperature}° · ${device.state.humidity ?? "--"}%`;
      }
      return device.state.motionDetected ? "Motion" : "Clear";
    case "blinds":
      if (device.state.blindsPosition != null) {
        return `${device.state.blindsPosition}% open`;
      }
      return device.state.blindsState === "open" ? "Open" : "Closed";
    case "fan":
      if (!device.state.isOn) return "Off";
      return device.state.fanSpeed ? `Speed ${device.state.fanSpeed}` : "On";
    case "garage":
      return device.state.garageDoorState === "open" ? "Open" : "Closed";
    case "camera":
      return device.state.isOn ? "Streaming" : "Off";
    default:
      return device.state.isOn ? "On" : "Off";
  }
}

export function DeviceCard({ device, onPress, onToggle, compact }: DeviceCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isOn = device.state.isOn ?? false;
  const isOnline = device.status === "online";
  const color = DEVICE_COLORS[device.type];

  if (compact) {
    return (
      <TouchableOpacity
        onPress={() => onPress?.(device)}
        activeOpacity={0.7}
        className={`
          flex-row items-center p-3 rounded-xl mb-2
          ${isDark ? "bg-dark-800" : "bg-white"}
          border ${isDark ? "border-dark-700" : "border-gray-200"}
        `}
      >
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: isOn && isOnline ? color + "20" : isDark ? "#2b2d31" : "#f3f4f6" }}
        >
          <Ionicons
            name={DEVICE_ICONS[device.type]}
            size={20}
            color={isOn && isOnline ? color : isDark ? "#6b7280" : "#9ca3af"}
          />
        </View>
        <View className="flex-1">
          <Text
            className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}
            numberOfLines={1}
          >
            {device.name}
          </Text>
          <Text
            className={`text-xs ${
              isOnline
                ? isOn ? "text-iot-online" : isDark ? "text-dark-400" : "text-gray-500"
                : "text-iot-offline"
            }`}
          >
            {getDeviceStateLabel(device)}
          </Text>
        </View>
        {onToggle && device.capabilities.some((c) => c.type === "toggle") && (
          <TouchableOpacity
            onPress={() => onToggle(device)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isOn ? "power" : "power-outline"}
              size={22}
              color={isOn ? color : isDark ? "#6b7280" : "#9ca3af"}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={() => onPress?.(device)}
      onLongPress={() => onToggle?.(device)}
      activeOpacity={0.7}
      className={`
        p-4 rounded-2xl
        ${isDark
          ? isOn && isOnline ? "bg-dark-700" : "bg-dark-800"
          : isOn && isOnline ? "bg-white" : "bg-gray-50"
        }
        border ${isDark
          ? isOn && isOnline ? `border-dark-600` : "border-dark-700"
          : isOn && isOnline ? "border-gray-200" : "border-gray-100"
        }
      `}
      style={isOn && isOnline ? {
        borderColor: color + "40",
        shadowColor: color,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
      } : undefined}
    >
      <View className="flex-row items-start justify-between mb-3">
        <View
          className="w-11 h-11 rounded-xl items-center justify-center"
          style={{
            backgroundColor: isOn && isOnline ? color + "20" : isDark ? "#2b2d31" : "#f3f4f6",
          }}
        >
          <Ionicons
            name={DEVICE_ICONS[device.type]}
            size={24}
            color={isOn && isOnline ? color : isDark ? "#6b7280" : "#9ca3af"}
          />
        </View>
        {onToggle && device.capabilities.some((c) => c.type === "toggle") && (
          <TouchableOpacity
            onPress={() => onToggle(device)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className={`
              w-10 h-6 rounded-full justify-center
              ${isOn && isOnline ? "" : isDark ? "bg-dark-600" : "bg-gray-300"}
            `}
            style={isOn && isOnline ? { backgroundColor: color } : undefined}
          >
            <View
              className={`
                w-5 h-5 rounded-full bg-white shadow-sm
                ${isOn ? "self-end mr-0.5" : "self-start ml-0.5"}
              `}
            />
          </TouchableOpacity>
        )}
      </View>

      <Text
        className={`text-sm font-semibold mb-0.5 ${isDark ? "text-white" : "text-gray-900"}`}
        numberOfLines={1}
      >
        {device.name}
      </Text>
      <Text
        className={`text-xs ${
          isOnline
            ? isOn ? "text-iot-online" : isDark ? "text-dark-400" : "text-gray-500"
            : "text-iot-offline"
        }`}
      >
        {getDeviceStateLabel(device)}
      </Text>
    </TouchableOpacity>
  );
}

export { DEVICE_ICONS, DEVICE_COLORS, getDeviceStateLabel };
