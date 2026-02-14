import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  View,
  type TouchableOpacityProps,
} from "react-native";
import { useColorScheme } from "react-native";

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  title,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const baseStyles =
    "flex-row items-center justify-center rounded-lg font-semibold";

  const sizeStyles = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  const variantStyles = {
    primary: isDark
      ? "bg-brand active:bg-brand-hover"
      : "bg-brand active:bg-brand-hover",
    secondary: isDark
      ? "bg-dark-700 active:bg-dark-600 border border-dark-600"
      : "bg-gray-100 active:bg-gray-200 border border-gray-200",
    danger: "bg-red-500 active:bg-red-600",
    ghost: isDark
      ? "bg-transparent active:bg-dark-700"
      : "bg-transparent active:bg-gray-100",
  };

  const textStyles = {
    primary: "text-white",
    secondary: isDark ? "text-dark-100" : "text-gray-900",
    danger: "text-white",
    ghost: isDark ? "text-dark-100" : "text-gray-900",
  };

  const disabledStyles = disabled || isLoading ? "opacity-50" : "";

  return (
    <TouchableOpacity
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${disabledStyles} ${fullWidth ? "w-full" : ""} ${className}`}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator
          color={
            variant === "primary" || variant === "danger"
              ? "#ffffff"
              : isDark
                ? "#e0e0e0"
                : "#1f2937"
          }
          size="small"
        />
      ) : (
        <>
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <Text className={`${textStyles[variant]} font-semibold`}>
            {title}
          </Text>
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </>
      )}
    </TouchableOpacity>
  );
}
