import React from "react";
import { View, Text, TouchableOpacity, type ViewProps } from "react-native";
import { useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface AlertProps extends ViewProps {
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  message: string;
  onClose?: () => void;
}

export function Alert({
  variant = "info",
  title,
  message,
  onClose,
  className = "",
  ...props
}: AlertProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const variantStyles = {
    info: {
      bg: isDark ? "bg-blue-500/10" : "bg-blue-50",
      border: isDark ? "border-blue-500/30" : "border-blue-200",
      icon: "information-circle" as const,
      iconColor: "#3b82f6",
    },
    success: {
      bg: isDark ? "bg-green-500/10" : "bg-green-50",
      border: isDark ? "border-green-500/30" : "border-green-200",
      icon: "checkmark-circle" as const,
      iconColor: "#22c55e",
    },
    warning: {
      bg: isDark ? "bg-yellow-500/10" : "bg-yellow-50",
      border: isDark ? "border-yellow-500/30" : "border-yellow-200",
      icon: "warning" as const,
      iconColor: "#eab308",
    },
    error: {
      bg: isDark ? "bg-red-500/10" : "bg-red-50",
      border: isDark ? "border-red-500/30" : "border-red-200",
      icon: "alert-circle" as const,
      iconColor: "#ef4444",
    },
  };

  const styles = variantStyles[variant];

  return (
    <View
      className={`
        rounded-lg 
        border 
        p-4 
        flex-row 
        items-start
        ${styles.bg}
        ${styles.border}
        ${className}
      `}
      {...props}
    >
      <Ionicons
        name={styles.icon}
        size={20}
        color={styles.iconColor}
        style={{ marginTop: 2 }}
      />
      <View className="flex-1 ml-3">
        {title && (
          <Text
            className={`font-semibold text-sm ${isDark ? "text-white" : "text-gray-900"}`}
          >
            {title}
          </Text>
        )}
        <Text
          className={`text-sm mt-0.5 ${isDark ? "text-dark-200" : "text-gray-700"}`}
        >
          {message}
        </Text>
      </View>
      {onClose && (
        <TouchableOpacity onPress={onClose} className="ml-2">
          <Ionicons
            name="close"
            size={20}
            color={isDark ? "#80848e" : "#6b7280"}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}
