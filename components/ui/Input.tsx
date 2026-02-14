import React from "react";
import { TextInput, View, Text, type TextInputProps } from "react-native";
import { useColorScheme } from "react-native";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  containerClassName = "",
  className = "",
  ...props
}: InputProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const inputStyles = `
    flex-1 
    py-3 
    text-base 
    ${isDark ? "text-white" : "text-gray-900"}
    ${leftIcon ? "pl-2" : "pl-4"}
    ${rightIcon ? "pr-2" : "pr-4"}
  `;

  const containerStyles = `
    flex-row 
    items-center 
    rounded-lg 
    border
    ${
      error
        ? "border-red-500 bg-red-500/5"
        : isDark
          ? "border-dark-700 bg-dark-700"
          : "border-gray-200 bg-gray-100"
    }
    ${props.editable === false ? "opacity-50" : ""}
  `;

  return (
    <View className={`mb-4 ${containerClassName}`}>
      {label && (
        <Text
          className={`text-sm font-medium mb-2 ${isDark ? "text-dark-200" : "text-gray-700"}`}
        >
          {label}
        </Text>
      )}
      <View className={containerStyles}>
        {leftIcon && <View className="pl-4">{leftIcon}</View>}
        <TextInput
          className={`${inputStyles} ${className}`}
          placeholderTextColor={isDark ? "#80848e" : "#9ca3af"}
          {...props}
        />
        {rightIcon && <View className="pr-4">{rightIcon}</View>}
      </View>
      {error && <Text className="text-red-500 text-sm mt-1">{error}</Text>}
      {helperText && !error && (
        <Text
          className={`text-xs mt-1 ${isDark ? "text-dark-400" : "text-gray-500"}`}
        >
          {helperText}
        </Text>
      )}
    </View>
  );
}
