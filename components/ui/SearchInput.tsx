import React from "react";
import { View, Text, TextInput, type TextInputProps } from "react-native";
import { useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SearchInputProps extends Omit<TextInputProps, "placeholder"> {
  placeholder?: string;
  onClear?: () => void;
}

export function SearchInput({
  placeholder = "Search...",
  onClear,
  value,
  onChangeText,
  className = "",
  ...props
}: SearchInputProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const handleClear = () => {
    onChangeText?.("");
    onClear?.();
  };

  return (
    <View
      className={`
        flex-row 
        items-center 
        rounded-full 
        px-4 
        py-2.5
        ${isDark ? "bg-dark-700" : "bg-gray-100"}
        ${className}
      `}
    >
      <Ionicons
        name="search"
        size={18}
        color={isDark ? "#80848e" : "#9ca3af"}
      />
      <TextInput
        className={`
          flex-1 
          ml-2 
          text-base
          ${isDark ? "text-white" : "text-gray-900"}
        `}
        placeholder={placeholder}
        placeholderTextColor={isDark ? "#80848e" : "#9ca3af"}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
      />
      {value && value.length > 0 && (
        <Ionicons
          name="close-circle"
          size={18}
          color={isDark ? "#80848e" : "#9ca3af"}
          onPress={handleClear}
        />
      )}
    </View>
  );
}
