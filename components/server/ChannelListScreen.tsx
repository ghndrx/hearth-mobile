import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { Channel, Category, Server } from "../../lib/types";

// ============================================================================
// Types
// ============================================================================

interface ChannelListScreenProps {
  server: Server;
  categories: Category[];
  onChannelPress?: (channel: Channel) => void;
  onVoiceChannelPress?: (channel: Channel) => void;
  onRefresh?: () => Promise<void>;
  headerRight?: React.ReactNode;
}

interface CategorySectionProps {
  category: Category;
  isDark: boolean;
  onChannelPress?: (channel: Channel) => void;
  onVoiceChannelPress?: (channel: Channel) => void;
  initialExpanded?: boolean;
}

interface ChannelItemProps {
  channel: Channel;
  isDark: boolean;
  onPress?: (channel: Channel) => void;
}

// ============================================================================
// Channel Item Component
// ============================================================================

function ChannelItem({ channel, isDark, onPress }: ChannelItemProps) {
  const isText = channel.type === "text";
  const isVoice = channel.type === "voice";
  const isAnnouncement = channel.type === "announcement";

  const getIcon = (): keyof typeof Ionicons.glyphMap => {
    if (isVoice) return "volume-high-outline";
    if (isAnnouncement) return "megaphone-outline";
    return "chatbubble-outline";
  };

  const handlePress = () => {
    if (onPress) {
      onPress(channel);
    } else if (isText || isAnnouncement) {
      router.push(`/chat/${channel.id}?server=true`);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      className={`
        flex-row items-center px-4 py-2.5 mx-2 rounded-lg
        ${channel.isActive ? (isDark ? "bg-dark-700" : "bg-gray-100") : ""}
      `}
    >
      <Ionicons
        name={getIcon()}
        size={20}
        color={channel.isActive ? "#5865f2" : isDark ? "#80848e" : "#6b7280"}
      />
      <Text
        className={`ml-3 flex-1 ${
          channel.isActive
            ? "text-brand font-medium"
            : channel.unreadCount && channel.unreadCount > 0
              ? isDark
                ? "text-white font-medium"
                : "text-gray-900 font-medium"
              : isDark
                ? "text-dark-200"
                : "text-gray-700"
        }`}
      >
        {channel.name}
      </Text>
      {channel.unreadCount && channel.unreadCount > 0 ? (
        <View className="bg-brand rounded-full min-w-[20px] h-5 items-center justify-center px-1.5">
          <Text className="text-white text-xs font-bold">
            {channel.unreadCount > 99 ? "99+" : channel.unreadCount}
          </Text>
        </View>
      ) : null}
      {isVoice && (
        <Ionicons
          name="people-outline"
          size={16}
          color={isDark ? "#80848e" : "#6b7280"}
          style={{ marginLeft: 8 }}
        />
      )}
    </TouchableOpacity>
  );
}

// ============================================================================
// Category Section Component
// ============================================================================

function CategorySection({
  category,
  isDark,
  onChannelPress,
  onVoiceChannelPress,
  initialExpanded = true,
}: CategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(
    category.isCollapsed !== undefined ? !category.isCollapsed : initialExpanded
  );

  const textChannels = category.channels.filter(
    (c) => c.type === "text" || c.type === "announcement"
  );
  const voiceChannels = category.channels.filter((c) => c.type === "voice");

  // Sort channels by position
  const sortedTextChannels = [...textChannels].sort(
    (a, b) => a.position - b.position
  );
  const sortedVoiceChannels = [...voiceChannels].sort(
    (a, b) => a.position - b.position
  );
  const sortedChannels = [...sortedTextChannels, ...sortedVoiceChannels];

  const handleChannelPress = (channel: Channel) => {
    if (channel.type === "voice" && onVoiceChannelPress) {
      onVoiceChannelPress(channel);
    } else if (onChannelPress) {
      onChannelPress(channel);
    }
  };

  return (
    <View className="mb-2">
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        className="flex-row items-center px-4 py-2"
        activeOpacity={0.7}
      >
        <Ionicons
          name={isExpanded ? "chevron-down" : "chevron-forward"}
          size={12}
          color={isDark ? "#80848e" : "#6b7280"}
        />
        <Text
          className={`ml-1 text-xs font-bold tracking-wider uppercase ${
            isDark ? "text-dark-400" : "text-gray-500"
          }`}
        >
          {category.name}
        </Text>
        <Text
          className={`ml-2 text-xs ${isDark ? "text-dark-500" : "text-gray-400"}`}
        >
          ({category.channels.length})
        </Text>
      </TouchableOpacity>

      {isExpanded && (
        <View>
          {sortedChannels.map((channel) => (
            <ChannelItem
              key={channel.id}
              channel={channel}
              isDark={isDark}
              onPress={handleChannelPress}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyState({ isDark }: { isDark: boolean }) {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <Ionicons
        name="chatbubbles-outline"
        size={64}
        color={isDark ? "#4b5563" : "#9ca3af"}
      />
      <Text
        className={`mt-4 text-lg font-medium ${
          isDark ? "text-dark-300" : "text-gray-600"
        }`}
      >
        No channels yet
      </Text>
      <Text
        className={`mt-2 text-center px-8 ${
          isDark ? "text-dark-400" : "text-gray-500"
        }`}
      >
        Channels will appear here once they are created by server admins.
      </Text>
    </View>
  );
}

// ============================================================================
// Main ChannelListScreen Component
// ============================================================================

export function ChannelListScreen({
  server,
  categories,
  onChannelPress,
  onVoiceChannelPress,
  onRefresh,
  headerRight,
}: ChannelListScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  // Sort categories by position
  const sortedCategories = [...categories].sort(
    (a, b) => a.position - b.position
  );

  // Get uncategorized channels (channels without a category)
  const uncategorizedChannels = sortedCategories
    .flatMap((c) => c.channels)
    .filter((ch) => !ch.categoryId);

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}
      edges={["left", "right"]}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: server.name,
          headerTitleStyle: {
            color: isDark ? "#ffffff" : "#111827",
            fontSize: 18,
            fontWeight: "bold",
          },
          headerStyle: {
            backgroundColor: isDark ? "#1e1f22" : "#ffffff",
          },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              className="ml-2 p-1"
            >
              <Ionicons
                name="chevron-back"
                size={28}
                color={isDark ? "#80848e" : "#6b7280"}
              />
            </TouchableOpacity>
          ),
          headerRight: headerRight
            ? () => headerRight
            : () => (
                <View className="flex-row mr-2">
                  <TouchableOpacity className="p-2">
                    <Ionicons
                      name="search-outline"
                      size={22}
                      color={isDark ? "#80848e" : "#6b7280"}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="p-2"
                    onPress={() => router.push(`/server/${server.id}/settings`)}
                  >
                    <Ionicons
                      name="ellipsis-vertical"
                      size={22}
                      color={isDark ? "#80848e" : "#6b7280"}
                    />
                  </TouchableOpacity>
                </View>
              ),
        }}
      />

      {/* Server Banner/Header */}
      <View
        className={`px-4 py-3 border-b ${
          isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"
        }`}
      >
        <View className="flex-row items-center">
          {server.icon ? (
            <View className="w-10 h-10 rounded-xl overflow-hidden bg-brand items-center justify-center">
              <Text className="text-white text-lg font-bold">
                {server.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          ) : (
            <View className="w-10 h-10 rounded-xl bg-brand items-center justify-center">
              <Text className="text-white text-lg font-bold">
                {server.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View className="ml-3 flex-1">
            <Text
              className={`font-semibold text-base ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              {server.name}
            </Text>
            <Text
              className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}
            >
              {server.memberCount} members
            </Text>
          </View>
          <View
            className={`w-2.5 h-2.5 rounded-full ${
              server.isOnline ? "bg-green-500" : "bg-gray-400"
            }`}
          />
        </View>
        {server.description && (
          <Text
            className={`mt-2 text-sm ${
              isDark ? "text-dark-300" : "text-gray-600"
            }`}
            numberOfLines={2}
          >
            {server.description}
          </Text>
        )}
      </View>

      {/* Channel List */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingVertical: 8 }}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={isDark ? "#5865f2" : "#5865f2"}
            />
          ) : undefined
        }
      >
        {sortedCategories.length === 0 ? (
          <EmptyState isDark={isDark} />
        ) : (
          sortedCategories.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              isDark={isDark}
              onChannelPress={onChannelPress}
              onVoiceChannelPress={onVoiceChannelPress}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// Standalone Channel List (no header, for embedding)
// ============================================================================

interface ChannelListProps {
  categories: Category[];
  onChannelPress?: (channel: Channel) => void;
  onVoiceChannelPress?: (channel: Channel) => void;
  onRefresh?: () => Promise<void>;
  emptyMessage?: string;
}

export function ChannelList({
  categories,
  onChannelPress,
  onVoiceChannelPress,
  onRefresh,
  emptyMessage = "No channels available",
}: ChannelListProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const sortedCategories = [...categories].sort(
    (a, b) => a.position - b.position
  );

  if (sortedCategories.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <Text className={`${isDark ? "text-dark-400" : "text-gray-500"}`}>
          {emptyMessage}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingVertical: 8 }}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#5865f2"
          />
        ) : undefined
      }
    >
      {sortedCategories.map((category) => (
        <CategorySection
          key={category.id}
          category={category}
          isDark={isDark}
          onChannelPress={onChannelPress}
          onVoiceChannelPress={onVoiceChannelPress}
        />
      ))}
    </ScrollView>
  );
}

export default ChannelListScreen;
