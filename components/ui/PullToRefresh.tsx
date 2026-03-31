import React, { useCallback, useState, useEffect } from "react";
import {
  RefreshControl,
  ScrollView,
  FlatList,
  View,
  Text,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  showLastUpdated?: boolean;
  lastUpdated?: Date;
}

export function PullToRefresh({
  onRefresh,
  children,
  showLastUpdated = false,
  lastUpdated,
}: PullToRefreshProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const formatLastUpdated = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <View className="flex-1">
      <ScrollView
        contentContainerClassName="flex-grow"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={isDark ? "#8b5cf6" : "#7c3aed"}
            colors={["#8b5cf6"]}
            progressBackgroundColor={isDark ? "#1e1f22" : "#ffffff"}
          />
        }
      >
        {showLastUpdated && lastUpdated && (
          <View className="flex-row items-center justify-center py-2">
            <Ionicons
              name="time-outline"
              size={14}
              color={isDark ? "#80848e" : "#6b7280"}
            />
            <Text
              className={`ml-1 text-xs ${isDark ? "text-dark-400" : "text-gray-400"}`}
            >
              Updated {formatLastUpdated(lastUpdated)}
            </Text>
          </View>
        )}
        {children}
      </ScrollView>
    </View>
  );
}

interface RefreshableFlatListProps<T> {
  data: T[];
  renderItem: ({ item, index }: { item: T; index: number }) => React.ReactElement;
  keyExtractor: (item: T, index: number) => string;
  onRefresh: () => Promise<void>;
  ListEmptyComponent?: React.ComponentType | React.ReactElement;
  ListHeaderComponent?: React.ComponentType | React.ReactElement;
  ListFooterComponent?: React.ComponentType | React.ReactElement;
  contentContainerStyle?: object;
  showLastUpdated?: boolean;
  lastUpdated?: Date;
}

export function RefreshableFlatList<T>({
  data,
  renderItem,
  keyExtractor,
  onRefresh,
  ListEmptyComponent,
  ListHeaderComponent,
  ListFooterComponent,
  contentContainerStyle,
  showLastUpdated = false,
  lastUpdated,
}: RefreshableFlatListProps<T>) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const formatLastUpdated = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const HeaderWithTimestamp = () => (
    <>
      {showLastUpdated && lastUpdated && (
        <View className="flex-row items-center justify-center py-2">
          <Ionicons
            name="time-outline"
            size={14}
            color={isDark ? "#80848e" : "#6b7280"}
          />
          <Text
            className={`ml-1 text-xs ${isDark ? "text-dark-400" : "text-gray-400"}`}
          >
            Updated {formatLastUpdated(lastUpdated)}
          </Text>
        </View>
      )}
      {ListHeaderComponent}
    </>
  );

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListEmptyComponent={ListEmptyComponent}
      ListHeaderComponent={<HeaderWithTimestamp />}
      ListFooterComponent={ListFooterComponent}
      contentContainerStyle={contentContainerStyle}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={isDark ? "#8b5cf6" : "#7c3aed"}
          colors={["#8b5cf6"]}
          progressBackgroundColor={isDark ? "#1e1f22" : "#ffffff"}
        />
      }
    />
  );
}

// Custom animated loading indicator for pull-to-refresh
interface CustomRefreshIndicatorProps {
  refreshing: boolean;
  pullProgress?: number; // 0 to 1
}

export function CustomRefreshIndicator({
  refreshing,
  pullProgress = 0,
}: CustomRefreshIndicatorProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Rotation animation for spinning effect
  const rotation = useSharedValue(0);
  // Scale animation for bounce effect
  const scale = useSharedValue(0.8);
  // Opacity for fade effect
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (refreshing) {
      // Spin animation when refreshing
      rotation.value = withRepeat(
        withTiming(360, { duration: 800, easing: Easing.linear }),
        -1,
        false
      );
      scale.value = withSpring(1, { damping: 12, stiffness: 150 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      // Reset animations
      rotation.value = withTiming(0, { duration: 200 });
      scale.value = withSpring(0.8, { damping: 15 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [refreshing, rotation, scale, opacity]);

  // Interpolate arrow rotation based on pull progress (0-1)
  const arrowRotation = interpolate(
    pullProgress,
    [0, 0.5, 1],
    [0, 180, 360],
    Extrapolation.CLAMP
  );

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${refreshing ? rotation.value : arrowRotation}deg` },
      { scale: scale.value },
    ],
    opacity: refreshing ? opacity.value : interpolate(pullProgress, [0, 0.3], [0, 1], Extrapolation.CLAMP),
  }));

  const dot1Style = useAnimatedStyle(() => {
    const translateY = refreshing
      ? withRepeat(
          withSequence(
            withTiming(-3, { duration: 400, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 400, easing: Easing.in(Easing.quad) })
          ),
          -1,
          false
        )
      : 0;
    return {
      transform: [{ translateY }],
      opacity: refreshing ? 1 : pullProgress,
    };
  });

  const dot2Style = useAnimatedStyle(() => {
    const translateY = refreshing
      ? withRepeat(
          withSequence(
            withTiming(-3, { duration: 400, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 400, easing: Easing.in(Easing.quad) })
          ),
          -1,
          false
        )
      : 0;
    return {
      transform: [{ translateY: translateY as any }],
      opacity: refreshing ? 1 : pullProgress,
    };
  });

  const dot3Style = useAnimatedStyle(() => {
    const translateY = refreshing
      ? withRepeat(
          withSequence(
            withTiming(-3, { duration: 400, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 400, easing: Easing.in(Easing.quad) })
          ),
          -1,
          false
        )
      : 0;
    return {
      transform: [{ translateY: translateY as any }],
      opacity: refreshing ? 1 : pullProgress,
    };
  });

  return (
    <Animated.View style={containerStyle} className="items-center justify-center py-3">
      <View
        className={`
          w-12 h-12 rounded-full items-center justify-center relative
          ${isDark ? "bg-dark-800" : "bg-gray-100"}
          shadow-sm
        `}
      >
        {refreshing ? (
          // Custom animated dots when refreshing
          <View className="flex-row items-center justify-center space-x-1">
            <Animated.View
              style={dot1Style}
              className={`w-2 h-2 rounded-full ${isDark ? "bg-violet-400" : "bg-violet-500"}`}
            />
            <Animated.View
              style={dot2Style}
              className={`w-2 h-2 rounded-full ${isDark ? "bg-violet-400" : "bg-violet-500"}`}
            />
            <Animated.View
              style={dot3Style}
              className={`w-2 h-2 rounded-full ${isDark ? "bg-violet-400" : "bg-violet-500"}`}
            />
          </View>
        ) : (
          // Arrow icon when pulling
          <Ionicons
            name="chevron-down"
            size={24}
            color={isDark ? "#8b5cf6" : "#7c3aed"}
          />
        )}
      </View>
    </Animated.View>
  );
}

// Animated refresh indicator for custom implementations
interface AnimatedRefreshIndicatorProps {
  refreshing: boolean;
  pullProgress: number; // 0 to 1
}

export function AnimatedRefreshIndicator({
  refreshing,
  pullProgress,
}: AnimatedRefreshIndicatorProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (refreshing) {
      rotation.value = withSpring(rotation.value + 360, {
        damping: 10,
        stiffness: 100,
      });
    }
  }, [refreshing, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: withTiming(Math.min(pullProgress, 1), { duration: 100 }) },
    ],
    opacity: withTiming(Math.min(pullProgress * 2, 1), { duration: 100 }),
  }));

  return (
    <Animated.View
      style={animatedStyle}
      className="items-center justify-center py-4"
    >
      <View
        className={`
          w-10 h-10 rounded-full items-center justify-center
          ${isDark ? "bg-dark-800" : "bg-gray-100"}
        `}
      >
        <Ionicons
          name={refreshing ? "sync" : "arrow-down"}
          size={24}
          color={isDark ? "#8b5cf6" : "#7c3aed"}
        />
      </View>
    </Animated.View>
  );
}
