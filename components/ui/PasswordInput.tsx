import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  type TextInputProps,
} from "react-native";
import { useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface PasswordInputProps extends Omit<TextInputProps, "secureTextEntry"> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function PasswordInput({
  label,
  error,
  helperText,
  className = "",
  ...props
}: PasswordInputProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View className="mb-4">
      {label && (
        <Text
          className={`text-sm font-medium mb-2 ${isDark ? "text-dark-200" : "text-gray-700"}`}
        >
          {label}
        </Text>
      )}
      <View
        className={`
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
        `}
      >
        <TextInput
          className={`
            flex-1 
            py-3 
            px-4 
            text-base 
            ${isDark ? "text-white" : "text-gray-900"}
            ${className}
          `}
          placeholderTextColor={isDark ? "#80848e" : "#9ca3af"}
          secureTextEntry={!isVisible}
          textContentType="password"
          {...props}
        />
        <TouchableOpacity
          onPress={() => setIsVisible(!isVisible)}
          className="px-4"
          activeOpacity={0.6}
        >
          <Ionicons
            name={isVisible ? "eye-off" : "eye"}
            size={20}
            color={isDark ? "#80848e" : "#6b7280"}
          />
        </TouchableOpacity>
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
