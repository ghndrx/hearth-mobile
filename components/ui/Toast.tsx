import React, { useEffect, useCallback } from "react";
import { Text, View, Pressable, useColorScheme } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastProps {
  visible: boolean;
  message: string;
  variant?: ToastVariant;
  duration?: number;
  onDismiss: () => void;
  action?: {
    label: string;
    onPress: () => void;
  };
}

const variantConfig: Record<
  ToastVariant,
  {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    iconColor: string;
    bg: string;
    bgLight: string;
  }
> = {
  success: {
    icon: "checkmark-circle",
    iconColor: "#22c55e",
    bg: "bg-dark-800 border-green-500/30",
    bgLight: "bg-white border-green-200",
  },
  error: {
    icon: "alert-circle",
    iconColor: "#ef4444",
    bg: "bg-dark-800 border-red-500/30",
    bgLight: "bg-white border-red-200",
  },
  warning: {
    icon: "warning",
    iconColor: "#eab308",
    bg: "bg-dark-800 border-yellow-500/30",
    bgLight: "bg-white border-yellow-200",
  },
  info: {
    icon: "information-circle",
    iconColor: "#3b82f6",
    bg: "bg-dark-800 border-blue-500/30",
    bgLight: "bg-white border-blue-200",
  },
};

export function Toast({
  visible,
  message,
  variant = "info",
  duration = 3000,
  onDismiss,
  action,
}: ToastProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  const config = variantConfig[variant];

  const dismiss = useCallback(() => {
    translateY.value = withTiming(-100, { duration: 200 });
    opacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(onDismiss)();
    });
  }, [translateY, opacity, onDismiss]);

  useEffect(() => {
    if (!visible) return;

    translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    opacity.value = withTiming(1, { duration: 200 });

    if (duration > 0) {
      const timer = setTimeout(dismiss, duration);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [visible, duration, dismiss, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[animatedStyle, { top: insets.top + 8 }]}
      className="absolute left-4 right-4 z-50"
    >
      <Pressable
        onPress={dismiss}
        className={`
          flex-row items-center
          px-4 py-3
          rounded-xl border
          shadow-lg
          ${isDark ? config.bg : config.bgLight}
        `}
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <Ionicons name={config.icon} size={22} color={config.iconColor} />
        <Text
          className={`flex-1 ml-3 text-sm font-medium ${
            isDark ? "text-white" : "text-gray-900"
          }`}
          numberOfLines={2}
        >
          {message}
        </Text>
        {action && (
          <Pressable onPress={action.onPress} className="ml-3">
            <Text className="text-brand font-semibold text-sm">
              {action.label}
            </Text>
          </Pressable>
        )}
        <View className="ml-2">
          <Ionicons
            name="close"
            size={18}
            color={isDark ? "#80848e" : "#9ca3af"}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}
