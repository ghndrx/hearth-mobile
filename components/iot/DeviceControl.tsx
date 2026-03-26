import React from "react";
import { View, Text, TouchableOpacity} from "react-native";
import { useColorScheme } from "../../lib/hooks/useColorScheme";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import type { Device, DeviceState } from "../../lib/types/iot";
import { DEVICE_COLORS } from "./DeviceCard";

interface DeviceControlProps {
  device: Device;
  onStateChange?: (state: Partial<DeviceState>) => void;
}

export function DeviceControl({ device, onStateChange }: DeviceControlProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const color = DEVICE_COLORS[device.type];
  const isOn = device.state.isOn ?? false;

  return (
    <View>
      {/* Power toggle */}
      {device.capabilities.some((c) => c.type === "toggle") && (
        <View className="mb-6">
          <TouchableOpacity
            onPress={() => onStateChange?.({ isOn: !isOn })}
            className={`
              w-20 h-20 rounded-full items-center justify-center self-center
              ${isOn ? "" : isDark ? "bg-dark-700" : "bg-gray-200"}
            `}
            style={isOn ? { backgroundColor: color } : undefined}
            activeOpacity={0.8}
          >
            <Ionicons
              name="power"
              size={36}
              color={isOn ? "#ffffff" : isDark ? "#6b7280" : "#9ca3af"}
            />
          </TouchableOpacity>
          <Text
            className={`text-center mt-2 text-sm font-medium ${
              isDark ? "text-dark-200" : "text-gray-600"
            }`}
          >
            {isOn ? "On" : "Off"}
          </Text>
        </View>
      )}

      {/* Brightness slider */}
      {device.capabilities.some((c) => c.type === "brightness") && isOn && (
        <ControlSlider
          label="Brightness"
          icon="sunny-outline"
          value={device.state.brightness ?? 100}
          min={0}
          max={100}
          step={1}
          unit="%"
          color={color}
          isDark={isDark}
          onValueChange={(val) => onStateChange?.({ brightness: val })}
        />
      )}

      {/* Color temperature slider */}
      {device.capabilities.some((c) => c.type === "color") && isOn && (
        <ControlSlider
          label="Color Temperature"
          icon="color-palette-outline"
          value={device.state.colorTemperature ?? 4000}
          min={2700}
          max={6500}
          step={100}
          unit="K"
          color="#f59e0b"
          isDark={isDark}
          onValueChange={(val) => onStateChange?.({ colorTemperature: val })}
        />
      )}

      {/* Temperature control */}
      {device.capabilities.some((c) => c.type === "temperature") && (
        <View className="mb-6">
          <Text
            className={`text-sm font-medium mb-2 ${isDark ? "text-dark-200" : "text-gray-600"}`}
          >
            Target Temperature
          </Text>
          <View className="flex-row items-center justify-center">
            <TouchableOpacity
              onPress={() =>
                onStateChange?.({
                  targetTemperature: (device.state.targetTemperature ?? 20) - 0.5,
                })
              }
              className={`w-12 h-12 rounded-full items-center justify-center ${
                isDark ? "bg-dark-700" : "bg-gray-200"
              }`}
            >
              <Ionicons name="remove" size={24} color={isDark ? "#e0e0e0" : "#374151"} />
            </TouchableOpacity>
            <View className="mx-6 items-center">
              <Text
                className={`text-4xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
              >
                {device.state.targetTemperature ?? 20}°
              </Text>
              {device.state.currentTemperature != null && (
                <Text className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                  Currently {device.state.currentTemperature}°
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() =>
                onStateChange?.({
                  targetTemperature: (device.state.targetTemperature ?? 20) + 0.5,
                })
              }
              className={`w-12 h-12 rounded-full items-center justify-center ${
                isDark ? "bg-dark-700" : "bg-gray-200"
              }`}
            >
              <Ionicons name="add" size={24} color={isDark ? "#e0e0e0" : "#374151"} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Lock control */}
      {device.capabilities.some((c) => c.type === "lock") && (
        <View className="mb-6 items-center">
          <TouchableOpacity
            onPress={() =>
              onStateChange?.({
                lockState: device.state.lockState === "locked" ? "unlocked" : "locked",
              })
            }
            className={`
              w-24 h-24 rounded-full items-center justify-center
            `}
            style={{
              backgroundColor:
                device.state.lockState === "locked" ? "#22c55e" + "20" : "#ef4444" + "20",
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={
                device.state.lockState === "locked"
                  ? "lock-closed"
                  : "lock-open"
              }
              size={40}
              color={device.state.lockState === "locked" ? "#22c55e" : "#ef4444"}
            />
          </TouchableOpacity>
          <Text
            className={`text-center mt-3 text-base font-medium ${
              isDark ? "text-dark-200" : "text-gray-600"
            }`}
          >
            {device.state.lockState === "locked" ? "Locked" : "Unlocked"}
          </Text>
        </View>
      )}

      {/* Blinds control */}
      {device.capabilities.some((c) => c.type === "blinds") && (
        <ControlSlider
          label="Blinds Position"
          icon="reorder-four-outline"
          value={device.state.blindsPosition ?? 0}
          min={0}
          max={100}
          step={5}
          unit="%"
          color="#14b8a6"
          isDark={isDark}
          onValueChange={(val) => onStateChange?.({ blindsPosition: val })}
        />
      )}

      {/* Fan speed */}
      {device.capabilities.some((c) => c.type === "fan_speed") && isOn && (
        <ControlSlider
          label="Fan Speed"
          icon="leaf-outline"
          value={device.state.fanSpeed ?? 1}
          min={1}
          max={5}
          step={1}
          unit=""
          color="#06b6d4"
          isDark={isDark}
          onValueChange={(val) => onStateChange?.({ fanSpeed: val })}
        />
      )}

      {/* Garage door control */}
      {device.capabilities.some((c) => c.type === "garage") && (
        <View className="mb-6 items-center">
          <TouchableOpacity
            onPress={() =>
              onStateChange?.({
                garageDoorState:
                  device.state.garageDoorState === "open" ? "closed" : "open",
              })
            }
            className={`
              px-8 py-4 rounded-xl items-center
            `}
            style={{
              backgroundColor:
                device.state.garageDoorState === "open"
                  ? "#ef4444" + "20"
                  : "#22c55e" + "20",
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={device.state.garageDoorState === "open" ? "arrow-down" : "arrow-up"}
              size={32}
              color={device.state.garageDoorState === "open" ? "#ef4444" : "#22c55e"}
            />
            <Text
              className="text-base font-medium mt-1"
              style={{
                color:
                  device.state.garageDoorState === "open" ? "#ef4444" : "#22c55e",
              }}
            >
              {device.state.garageDoorState === "open" ? "Close" : "Open"} Garage
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

interface ControlSliderProps {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  color: string;
  isDark: boolean;
  onValueChange: (value: number) => void;
}

function ControlSlider({
  label,
  icon,
  value,
  min,
  max,
  step,
  unit,
  color,
  isDark,
  onValueChange,
}: ControlSliderProps) {
  return (
    <View className="mb-6">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <Ionicons name={icon} size={18} color={isDark ? "#949ba4" : "#6b7280"} />
          <Text
            className={`text-sm font-medium ml-2 ${isDark ? "text-dark-200" : "text-gray-600"}`}
          >
            {label}
          </Text>
        </View>
        <Text
          className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
        >
          {Math.round(value)}
          {unit}
        </Text>
      </View>
      <Slider
        value={value}
        minimumValue={min}
        maximumValue={max}
        step={step}
        minimumTrackTintColor={color}
        maximumTrackTintColor={isDark ? "#2b2d31" : "#e5e7eb"}
        thumbTintColor={color}
        onSlidingComplete={onValueChange}
      />
    </View>
  );
}
