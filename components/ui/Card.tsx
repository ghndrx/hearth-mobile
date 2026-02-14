import React from "react";
import { View, Text, type ViewProps } from "react-native";
import { useColorScheme } from "react-native";

interface CardProps extends ViewProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({
  children,
  title,
  subtitle,
  padding = "md",
  className = "",
  ...props
}: CardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const paddingStyles = {
    none: "",
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  return (
    <View
      className={`
        rounded-xl 
        border 
        ${isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"}
        shadow-sm
        ${paddingStyles[padding]}
        ${className}
      `}
      {...props}
    >
      {(title || subtitle) && (
        <View className="mb-4">
          {title && (
            <Text
              className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
            >
              {title}
            </Text>
          )}
          {subtitle && (
            <Text
              className={`text-sm mt-1 ${isDark ? "text-dark-400" : "text-gray-500"}`}
            >
              {subtitle}
            </Text>
          )}
        </View>
      )}
      {children}
    </View>
  );
}
