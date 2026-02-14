import React from "react";
import { View, Text, Switch, type ViewProps } from "react-native";
import { useColorScheme } from "react-native";

interface SwitchItemProps extends ViewProps {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export function SwitchItem({
  title,
  subtitle,
  value,
  onValueChange,
  disabled = false,
  className = "",
  ...props
}: SwitchItemProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View
      className={`flex-row items-center justify-between px-4 py-3 ${className}`}
      {...props}
    >
      <View className="flex-1 pr-4">
        <Text
          className={`text-base ${isDark ? "text-white" : "text-gray-900"}`}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            className={`text-sm mt-0.5 ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            {subtitle}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{
          false: isDark ? "#4e5058" : "#d1d5db",
          true: "#5865f2",
        }}
        thumbColor="#ffffff"
        ios_backgroundColor={isDark ? "#4e5058" : "#d1d5db"}
      />
    </View>
  );
}
