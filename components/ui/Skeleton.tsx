import React from "react";
import { View, useColorScheme, ViewStyle, DimensionValue } from "react-native";
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue,
} from "react-native-reanimated";

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  className?: string;
}

export function Skeleton({
  width = "100%",
  height = 20,
  borderRadius = 8,
  style,
  className = "",
}: SkeletonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const opacity = useSharedValue(0.3);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 800 }),
        withTiming(0.3, { duration: 800 })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as DimensionValue,
          height,
          borderRadius,
          backgroundColor: isDark ? "#2b2d31" : "#e5e7eb",
        },
        animatedStyle,
        style,
      ]}
      className={className}
    />
  );
}

// Common skeleton patterns
export function SkeletonText({
  lines = 1,
  lastLineWidth = "60%",
}: {
  lines?: number;
  lastLineWidth?: DimensionValue;
}) {
  return (
    <View className="space-y-2">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? lastLineWidth : "100%"}
          height={16}
        />
      ))}
    </View>
  );
}

export function SkeletonAvatar({
  size = 40,
}: {
  size?: number;
}) {
  return <Skeleton width={size} height={size} borderRadius={size / 2} />;
}

export function SkeletonCard() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View
      className={`
        p-4 rounded-xl mb-3
        ${isDark ? "bg-dark-800" : "bg-white"}
      `}
    >
      <View className="flex-row items-center mb-3">
        <SkeletonAvatar size={48} />
        <View className="ml-3 flex-1">
          <Skeleton width="40%" height={16} />
          <View className="h-2" />
          <Skeleton width="30%" height={12} />
        </View>
      </View>
      <SkeletonText lines={2} lastLineWidth="80%" />
    </View>
  );
}

export function SkeletonMessage() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isLeft = Math.random() > 0.5;

  return (
    <View
      className={`
        flex-row items-start mb-4
        ${isLeft ? "justify-start" : "justify-end"}
      `}
    >
      {isLeft && (
        <View className="mr-2">
          <SkeletonAvatar size={36} />
        </View>
      )}
      <View
        className={`
          p-3 rounded-2xl max-w-[70%]
          ${isDark ? "bg-dark-800" : "bg-gray-100"}
        `}
      >
        <Skeleton width={100 + Math.random() * 100} height={16} />
        <View className="h-1" />
        <Skeleton width={60 + Math.random() * 60} height={16} />
      </View>
    </View>
  );
}

export function SkeletonChatList({ count = 5 }: { count?: number }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View className="px-4">
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          className={`
            flex-row items-center py-3
            ${index < count - 1 ? `border-b ${isDark ? "border-dark-700" : "border-gray-100"}` : ""}
          `}
        >
          <SkeletonAvatar size={52} />
          <View className="ml-3 flex-1">
            <View className="flex-row items-center justify-between mb-1">
              <Skeleton width="50%" height={16} />
              <Skeleton width={40} height={12} />
            </View>
            <Skeleton width="70%" height={14} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function SkeletonServerList({ count = 6 }: { count?: number }) {
  return (
    <View className="items-center py-2">
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} className="mb-2">
          <SkeletonAvatar size={48} />
        </View>
      ))}
    </View>
  );
}

export function SkeletonProfile() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View className="items-center pt-8 px-4">
      <SkeletonAvatar size={96} />
      <View className="h-4" />
      <Skeleton width={150} height={24} />
      <View className="h-2" />
      <Skeleton width={100} height={14} />
      <View className="h-6" />
      
      <View
        className={`
          w-full p-4 rounded-xl
          ${isDark ? "bg-dark-800" : "bg-white"}
        `}
      >
        <Skeleton width="30%" height={14} />
        <View className="h-2" />
        <SkeletonText lines={3} />
      </View>
    </View>
  );
}

// Loading wrapper that shows skeleton while loading
interface SkeletonLoaderProps {
  loading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
}

export function SkeletonLoader({
  loading,
  skeleton,
  children,
}: SkeletonLoaderProps) {
  if (loading) {
    return <>{skeleton}</>;
  }
  return <>{children}</>;
}
