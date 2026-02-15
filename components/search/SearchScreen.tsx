import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  useColorScheme,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SearchInput } from "../ui/SearchInput";
import { Avatar } from "../ui/Avatar";
import type { Message, User, Channel } from "../../lib/types";

// ============================================================================
// Types
// ============================================================================

export interface SearchFilters {
  channelId?: string;
  channelName?: string;
  userId?: string;
  userName?: string;
  hasFile?: boolean;
}

export interface SearchResult extends Message {
  channelName?: string;
  serverName?: string;
}

interface SearchScreenProps {
  /** Initial search query */
  initialQuery?: string;
  /** Initial filters */
  initialFilters?: SearchFilters;
  /** Search results */
  results?: SearchResult[];
  /** Whether search is loading */
  isLoading?: boolean;
  /** Callback when search query changes */
  onSearch?: (query: string, filters: SearchFilters) => void;
  /** Callback when a result is pressed */
  onResultPress?: (result: SearchResult) => void;
  /** Callback to refresh results */
  onRefresh?: () => Promise<void>;
  /** Available channels for filter picker */
  channels?: Channel[];
  /** Available users for filter picker */
  users?: User[];
  /** Show back button in header */
  showBackButton?: boolean;
}

interface FilterChipProps {
  label: string;
  value?: string;
  icon: keyof typeof Ionicons.glyphMap;
  isActive: boolean;
  onPress: () => void;
  onClear?: () => void;
  isDark: boolean;
}

interface SearchResultItemProps {
  result: SearchResult;
  isDark: boolean;
  onPress: (result: SearchResult) => void;
}

// ============================================================================
// Filter Chip Component
// ============================================================================

function FilterChip({
  label,
  value,
  icon,
  isActive,
  onPress,
  onClear,
  isDark,
}: FilterChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={`
        flex-row 
        items-center 
        px-3 
        py-2 
        rounded-full 
        mr-2
        ${
          isActive
            ? "bg-brand"
            : isDark
              ? "bg-dark-700 border border-dark-600"
              : "bg-gray-100 border border-gray-200"
        }
      `}
    >
      <Ionicons
        name={icon}
        size={16}
        color={isActive ? "#ffffff" : isDark ? "#80848e" : "#6b7280"}
      />
      <Text
        className={`
          ml-1.5 
          text-sm 
          font-medium
          ${isActive ? "text-white" : isDark ? "text-dark-200" : "text-gray-700"}
        `}
        numberOfLines={1}
      >
        {value || label}
      </Text>
      {isActive && onClear && (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            onClear();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="ml-1.5"
        >
          <Ionicons name="close-circle" size={16} color="#ffffff" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ============================================================================
// Search Result Item Component
// ============================================================================

function SearchResultItem({
  result,
  isDark,
  onPress,
}: SearchResultItemProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const hasAttachments = result.attachments && result.attachments.length > 0;

  return (
    <TouchableOpacity
      onPress={() => onPress(result)}
      activeOpacity={0.7}
      className={`
        px-4 
        py-3
        border-b
        ${isDark ? "border-dark-700" : "border-gray-100"}
      `}
    >
      <View className="flex-row">
        {/* Avatar */}
        <Avatar
          uri={result.author?.avatar}
          name={result.author?.displayName || result.author?.username || "User"}
          size="md"
        />

        {/* Content */}
        <View className="flex-1 ml-3">
          {/* Header */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <Text
                className={`
                  font-semibold 
                  text-sm
                  ${isDark ? "text-white" : "text-gray-900"}
                `}
                numberOfLines={1}
              >
                {result.author?.displayName || result.author?.username || "Unknown User"}
              </Text>
              {result.channelName && (
                <>
                  <Text
                    className={`
                      mx-1.5 
                      text-xs
                      ${isDark ? "text-dark-500" : "text-gray-400"}
                    `}
                  >
                    in
                  </Text>
                  <Text
                    className={`
                      text-xs 
                      font-medium
                      ${isDark ? "text-dark-300" : "text-gray-600"}
                    `}
                    numberOfLines={1}
                  >
                    #{result.channelName}
                  </Text>
                </>
              )}
            </View>
            <Text
              className={`
                text-xs 
                ml-2
                ${isDark ? "text-dark-400" : "text-gray-500"}
              `}
            >
              {formatDate(result.createdAt)}
            </Text>
          </View>

          {/* Message Content */}
          <Text
            className={`
              mt-1 
              text-sm 
              leading-5
              ${isDark ? "text-dark-200" : "text-gray-700"}
            `}
            numberOfLines={3}
          >
            {result.content}
          </Text>

          {/* Attachments indicator */}
          {hasAttachments && (
            <View className="flex-row items-center mt-2">
              <Ionicons
                name="attach"
                size={14}
                color={isDark ? "#80848e" : "#6b7280"}
              />
              <Text
                className={`
                  ml-1 
                  text-xs
                  ${isDark ? "text-dark-400" : "text-gray-500"}
                `}
              >
                {result.attachments!.length} attachment
                {result.attachments!.length > 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyState({
  isDark,
  hasQuery,
}: {
  isDark: boolean;
  hasQuery: boolean;
}) {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <Ionicons
        name={hasQuery ? "search-outline" : "chatbubble-ellipses-outline"}
        size={64}
        color={isDark ? "#4b5563" : "#9ca3af"}
      />
      <Text
        className={`
          mt-4 
          text-lg 
          font-medium 
          ${isDark ? "text-dark-300" : "text-gray-600"}
        `}
      >
        {hasQuery ? "No results found" : "Search messages"}
      </Text>
      <Text
        className={`
          mt-2 
          text-center 
          px-8 
          ${isDark ? "text-dark-400" : "text-gray-500"}
        `}
      >
        {hasQuery
          ? "Try a different search term or adjust your filters"
          : "Find messages by keywords, users, channels, or files"}
      </Text>
    </View>
  );
}

// ============================================================================
// Main SearchScreen Component
// ============================================================================

export function SearchScreen({
  initialQuery = "",
  initialFilters = {},
  results = [],
  isLoading = false,
  onSearch,
  onResultPress,
  onRefresh,
  channels = [],
  users = [],
  showBackButton = true,
}: SearchScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [refreshing, setRefreshing] = useState(false);
  const [showChannelPicker, setShowChannelPicker] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);

  // Trigger search when query or filters change
  const handleSearch = useCallback(
    (newQuery: string, newFilters: SearchFilters) => {
      onSearch?.(newQuery, newFilters);
    },
    [onSearch]
  );

  const handleQueryChange = useCallback(
    (text: string) => {
      setQuery(text);
      handleSearch(text, filters);
    },
    [filters, handleSearch]
  );

  const handleFilterChange = useCallback(
    (key: keyof SearchFilters, value: string | boolean | undefined) => {
      const newFilters = { ...filters };
      if (value === undefined) {
        delete newFilters[key];
        // Also clear related name fields
        if (key === "channelId") delete newFilters.channelName;
        if (key === "userId") delete newFilters.userName;
      } else {
        (newFilters as Record<string, unknown>)[key] = value;
      }
      setFilters(newFilters);
      handleSearch(query, newFilters);
    },
    [filters, query, handleSearch]
  );

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const handleResultPress = useCallback(
    (result: SearchResult) => {
      if (onResultPress) {
        onResultPress(result);
      } else {
        // Default: navigate to the message in chat
        router.push(`/chat/${result.channelId}?messageId=${result.id}`);
      }
    },
    [onResultPress]
  );

  const clearChannelFilter = () => {
    handleFilterChange("channelId", undefined);
  };

  const clearUserFilter = () => {
    handleFilterChange("userId", undefined);
  };

  const toggleFileFilter = () => {
    handleFilterChange("hasFile", filters.hasFile ? undefined : true);
  };

  const renderResult = useCallback(
    ({ item }: { item: SearchResult }) => (
      <SearchResultItem
        result={item}
        isDark={isDark}
        onPress={handleResultPress}
      />
    ),
    [isDark, handleResultPress]
  );

  const keyExtractor = useCallback((item: SearchResult) => item.id, []);

  const hasActiveFilters = !!(
    filters.channelId ||
    filters.userId ||
    filters.hasFile
  );

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}
      edges={["left", "right"]}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Search",
          headerTitleStyle: {
            color: isDark ? "#ffffff" : "#111827",
            fontSize: 18,
            fontWeight: "bold",
          },
          headerStyle: {
            backgroundColor: isDark ? "#1e1f22" : "#ffffff",
          },
          headerLeft: showBackButton
            ? () => (
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
              )
            : undefined,
        }}
      />

      {/* Search Input */}
      <View
        className={`
          px-4 
          pt-4 
          pb-3
          ${isDark ? "bg-dark-800" : "bg-white"}
          border-b
          ${isDark ? "border-dark-700" : "border-gray-200"}
        `}
      >
        <SearchInput
          value={query}
          onChangeText={handleQueryChange}
          placeholder="Search messages..."
          autoFocus
          returnKeyType="search"
        />

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3"
          contentContainerStyle={{ paddingRight: 16 }}
        >
          {/* In Channel Filter */}
          <FilterChip
            label="In Channel"
            value={filters.channelName}
            icon="chatbubble-outline"
            isActive={!!filters.channelId}
            onPress={() => setShowChannelPicker(true)}
            onClear={clearChannelFilter}
            isDark={isDark}
          />

          {/* From User Filter */}
          <FilterChip
            label="From User"
            value={filters.userName}
            icon="person-outline"
            isActive={!!filters.userId}
            onPress={() => setShowUserPicker(true)}
            onClear={clearUserFilter}
            isDark={isDark}
          />

          {/* Has File Filter */}
          <FilterChip
            label="Has File"
            icon="attach"
            isActive={!!filters.hasFile}
            onPress={toggleFileFilter}
            onClear={filters.hasFile ? toggleFileFilter : undefined}
            isDark={isDark}
          />
        </ScrollView>
      </View>

      {/* Results */}
      {isLoading && results.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator
            size="large"
            color={isDark ? "#5865f2" : "#4f46e5"}
          />
          <Text
            className={`mt-4 ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            Searching...
          </Text>
        </View>
      ) : results.length === 0 ? (
        <EmptyState isDark={isDark} hasQuery={query.length > 0 || hasActiveFilters} />
      ) : (
        <FlatList
          data={results}
          renderItem={renderResult}
          keyExtractor={keyExtractor}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={isDark ? "#5865f2" : "#4f46e5"}
              />
            ) : undefined
          }
          ListHeaderComponent={
            <View className="px-4 py-2">
              <Text
                className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}
              >
                {results.length} result{results.length !== 1 ? "s" : ""}
              </Text>
            </View>
          }
        />
      )}

      {/* Channel Picker Modal */}
      {showChannelPicker && (
        <View
          className={`
            absolute 
            inset-0 
            ${isDark ? "bg-black/60" : "bg-black/40"}
          `}
        >
          <TouchableOpacity
            className="flex-1"
            onPress={() => setShowChannelPicker(false)}
          />
          <View
            className={`
              rounded-t-3xl 
              max-h-[60%]
              ${isDark ? "bg-dark-800" : "bg-white"}
            `}
          >
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-dark-700">
              <Text
                className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}
              >
                Select Channel
              </Text>
              <TouchableOpacity onPress={() => setShowChannelPicker(false)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={isDark ? "#80848e" : "#6b7280"}
                />
              </TouchableOpacity>
            </View>
            <ScrollView className="px-2 py-2">
              {channels.length === 0 ? (
                <Text
                  className={`text-center py-8 ${isDark ? "text-dark-400" : "text-gray-500"}`}
                >
                  No channels available
                </Text>
              ) : (
                channels.map((channel) => (
                  <TouchableOpacity
                    key={channel.id}
                    onPress={() => {
                      handleFilterChange("channelId", channel.id);
                      handleFilterChange("channelName", channel.name);
                      setShowChannelPicker(false);
                    }}
                    className={`
                      flex-row 
                      items-center 
                      px-4 
                      py-3 
                      rounded-lg
                      ${filters.channelId === channel.id ? (isDark ? "bg-brand/20" : "bg-brand/10") : ""}
                    `}
                  >
                    <Ionicons
                      name="chatbubble-outline"
                      size={20}
                      color={
                        filters.channelId === channel.id
                          ? "#5865f2"
                          : isDark
                            ? "#80848e"
                            : "#6b7280"
                      }
                    />
                    <Text
                      className={`
                        ml-3 
                        text-base
                        ${
                          filters.channelId === channel.id
                            ? "text-brand font-medium"
                            : isDark
                              ? "text-dark-200"
                              : "text-gray-700"
                        }
                      `}
                    >
                      #{channel.name}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {/* User Picker Modal */}
      {showUserPicker && (
        <View
          className={`
            absolute 
            inset-0 
            ${isDark ? "bg-black/60" : "bg-black/40"}
          `}
        >
          <TouchableOpacity
            className="flex-1"
            onPress={() => setShowUserPicker(false)}
          />
          <View
            className={`
              rounded-t-3xl 
              max-h-[60%]
              ${isDark ? "bg-dark-800" : "bg-white"}
            `}
          >
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-dark-700">
              <Text
                className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}
              >
                Select User
              </Text>
              <TouchableOpacity onPress={() => setShowUserPicker(false)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={isDark ? "#80848e" : "#6b7280"}
                />
              </TouchableOpacity>
            </View>
            <ScrollView className="px-2 py-2">
              {users.length === 0 ? (
                <Text
                  className={`text-center py-8 ${isDark ? "text-dark-400" : "text-gray-500"}`}
                >
                  No users available
                </Text>
              ) : (
                users.map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    onPress={() => {
                      handleFilterChange("userId", user.id);
                      handleFilterChange("userName", user.displayName || user.username);
                      setShowUserPicker(false);
                    }}
                    className={`
                      flex-row 
                      items-center 
                      px-4 
                      py-3 
                      rounded-lg
                      ${filters.userId === user.id ? (isDark ? "bg-brand/20" : "bg-brand/10") : ""}
                    `}
                  >
                    <Avatar
                      uri={user.avatar}
                      name={user.displayName || user.username}
                      size="sm"
                    />
                    <View className="ml-3">
                      <Text
                        className={`
                          text-base
                          ${
                            filters.userId === user.id
                              ? "text-brand font-medium"
                              : isDark
                                ? "text-dark-200"
                                : "text-gray-700"
                          }
                        `}
                      >
                        {user.displayName || user.username}
                      </Text>
                      {user.displayName && (
                        <Text
                          className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}
                        >
                          @{user.username}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

export default SearchScreen;
