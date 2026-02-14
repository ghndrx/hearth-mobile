import React from "react";
import { View, Text, type ViewProps } from "react-native";
import { useColorScheme } from "react-native";

interface BadgeProps extends ViewProps {
  children: React.ReactNode;
  variant?: "default" | "primary" | "success" | "warning" | "error";
  size?: "sm" | "md";
}

export function Badge({
  children,
  variant = "default",
  size = "md",
  className = "",
  ...props
}: BadgeProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const variantStyles = {
    default: isDark ? "bg-dark-700 text-dark-200" : "bg-gray-100 text-gray-700",
    primary: "bg-brand/10 text-brand",
    success: isDark
      ? "bg-green-500/20 text-green-400"
      : "bg-green-100 text-green-700",
    warning: isDark
      ? "bg-yellow-500/20 text-yellow-400"
      : "bg-yellow-100 text-yellow-700",
    error: isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  return (
    <View
      className={`
        rounded-full 
        items-center 
        justify-center
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      <Text className={`font-medium ${variantStyles[variant].split(" ")[1]}`}>
        {children}
      </Text>
    </View>
  );
}

interface NotificationBadgeProps {
  count: number;
  max?: number;
  size?: "sm" | "md";
}

export function NotificationBadge({
  count,
  max = 99,
  size = "md",
}: NotificationBadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > max ? `${max}+` : count.toString();
  const sizeStyles = {
    sm: "min-w-[16px] h-4 text-[10px]",
    md: "min-w-[20px] h-5 text-xs",
  };

  return (
    <View
      className={`
        rounded-full 
        bg-red-500 
        items-center 
        justify-center
        px-1.5
        ${sizeStyles[size]}
      `}
    >
      <Text className="text-white font-bold">{displayCount}</Text>
    </View>
  );
}
