import React, { useCallback, useState } from "react";
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

  React.useEffect(() => {
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
