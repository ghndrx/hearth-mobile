import React from "react";
import { View, Text, useColorScheme, type ViewProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "./Button";

interface EmptyStateProps extends ViewProps {
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  description?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export function EmptyState({
  icon = "albums-outline",
  title,
  description,
  action,
  className = "",
  ...props
}: EmptyStateProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View
      className={`items-center justify-center py-12 px-6 ${className}`}
      {...props}
    >
      <View
        className={`
          w-20 h-20
          rounded-full
          items-center
          justify-center
          mb-4
          ${isDark ? "bg-dark-800" : "bg-gray-100"}
        `}
      >
        <Ionicons
          name={icon}
          size={36}
          color={isDark ? "#4e5058" : "#9ca3af"}
        />
      </View>
      <Text
        className={`text-lg font-semibold mb-1 text-center ${
          isDark ? "text-dark-200" : "text-gray-700"
        }`}
      >
        {title}
      </Text>
      {description && (
        <Text
          className={`text-sm text-center max-w-xs ${
            isDark ? "text-dark-400" : "text-gray-500"
          }`}
        >
          {description}
        </Text>
      )}
      {action && (
        <View className="mt-6">
          <Button
            title={action.label}
            onPress={action.onPress}
            variant="secondary"
            size="sm"
          />
        </View>
      )}
    </View>
  );
}
