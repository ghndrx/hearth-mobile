import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  type TouchableOpacityProps,
} from "react-native";
import { useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ListItemProps extends TouchableOpacityProps {
  title: string;
  subtitle?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showChevron?: boolean;
  destructive?: boolean;
}

export function ListItem({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  showChevron = false,
  destructive = false,
  onPress,
  disabled,
  className = "",
  ...props
}: ListItemProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      onPress={onPress}
      disabled={disabled}
      className={`
        flex-row 
        items-center 
        px-4 
        py-3
        ${onPress ? "active:bg-black/5 dark:active:bg-white/5" : ""}
        ${className}
      `}
      {...props}
    >
      {leftIcon && <View className="mr-3">{leftIcon}</View>}
      <View className="flex-1">
        <Text
          className={`
            text-base
            ${destructive ? "text-red-500" : isDark ? "text-white" : "text-gray-900"}
          `}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            className={`text-sm mt-0.5 ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {rightIcon && <View className="ml-2">{rightIcon}</View>}
      {showChevron && (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={isDark ? "#80848e" : "#9ca3af"}
        />
      )}
    </Container>
  );
}

interface ListSectionProps {
  title?: string;
  children: React.ReactNode;
  footer?: string;
}

export function ListSection({ title, children, footer }: ListSectionProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View className="mb-6">
      {title && (
        <Text
          className={`text-xs font-semibold uppercase px-4 mb-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}
        >
          {title}
        </Text>
      )}
      <View
        className={`
          rounded-lg 
          overflow-hidden
          ${isDark ? "bg-dark-800" : "bg-white"}
          border
          ${isDark ? "border-dark-700" : "border-gray-200"}
        `}
      >
        {children}
      </View>
      {footer && (
        <Text
          className={`text-xs px-4 mt-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}
        >
          {footer}
        </Text>
      )}
    </View>
  );
}

interface ListDividerProps {
  inset?: boolean;
}

export function ListDivider({ inset = false }: ListDividerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View
      className={`
        h-px 
        ${isDark ? "bg-dark-700" : "bg-gray-200"}
        ${inset ? "ml-14" : ""}
      `}
    />
  );
}
