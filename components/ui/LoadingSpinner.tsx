import React from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { useColorScheme } from "react-native";

interface LoadingSpinnerProps {
  size?: "small" | "large";
  text?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({
  size = "large",
  text,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const Spinner = (
    <View className="items-center">
      <ActivityIndicator size={size} color={isDark ? "#5865f2" : "#4f46e5"} />
      {text && (
        <Text
          className={`mt-4 text-base ${isDark ? "text-dark-200" : "text-gray-600"}`}
        >
          {text}
        </Text>
      )}
    </View>
  );

  if (fullScreen) {
    return (
      <View
        className={`flex-1 items-center justify-center ${isDark ? "bg-dark-900" : "bg-white"}`}
      >
        {Spinner}
      </View>
    );
  }

  return Spinner;
}
