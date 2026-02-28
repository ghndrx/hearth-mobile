import React from "react";
import { View, Text, useColorScheme, type ViewProps } from "react-native";

interface DividerProps extends ViewProps {
  label?: string;
}

export function Divider({ label, className = "", ...props }: DividerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  if (label) {
    return (
      <View className={`flex-row items-center my-4 ${className}`} {...props}>
        <View
          className={`flex-1 h-px ${isDark ? "bg-dark-700" : "bg-gray-200"}`}
        />
        <Text
          className={`mx-4 text-xs uppercase tracking-wide ${
            isDark ? "text-dark-400" : "text-gray-400"
          }`}
        >
          {label}
        </Text>
        <View
          className={`flex-1 h-px ${isDark ? "bg-dark-700" : "bg-gray-200"}`}
        />
      </View>
    );
  }

  return (
    <View
      className={`h-px my-4 ${isDark ? "bg-dark-700" : "bg-gray-200"} ${className}`}
      {...props}
    />
  );
}

interface SectionHeaderProps extends ViewProps {
  title: string;
  action?: React.ReactNode;
}

export function SectionHeader({
  title,
  action,
  className = "",
  ...props
}: SectionHeaderProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View
      className={`flex-row items-center justify-between px-4 py-2 ${className}`}
      {...props}
    >
      <Text
        className={`text-xs font-semibold uppercase tracking-wide ${
          isDark ? "text-dark-400" : "text-gray-500"
        }`}
      >
        {title}
      </Text>
      {action}
    </View>
  );
}
