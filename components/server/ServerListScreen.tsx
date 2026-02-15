import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  useColorScheme,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, SearchInput, Button } from "../ui";
import type { Server } from "../../lib/types";

interface ServerItemProps {
  server: Server;
  isDark: boolean;
  onPress?: (server: Server) => void;
}

function ServerIcon({ server, isDark }: { server: Server; isDark: boolean }) {
  return (
    <View className="relative">
      <Avatar uri={server.icon} name={server.name} size="lg" />
      {/* Online indicator dot */}
      <View
        className={`
          absolute bottom-0 right-0 w-4 h-4 rounded-full border-2
          ${isDark ? "border-dark-800" : "border-white"}
          ${server.isOnline ? "bg-green-500" : "bg-gray-400"}
        `}
      />
    </View>
  );
}

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  const displayCount = count > 99 ? "99+" : count.toString();

  return (
    <View className="bg-red-500 rounded-full min-w-[22px] h-[22px] items-center justify-center px-1.5">
      <Text className="text-white text-xs font-bold">{displayCount}</Text>
    </View>
  );
}

function ServerItem({ server, isDark, onPress }: ServerItemProps) {
  const handlePress = useCallback(() => {
    if (onPress) {
      onPress(server);
    } else {
      router.push(`/(tabs)/server/${server.id}`);
    }
  }, [server, onPress]);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      className={`
        flex-row 
        items-center 
        p-4 
        mx-4 
        mb-3 
        rounded-xl
        ${isDark ? "bg-dark-800" : "bg-white"}
        border
        ${isDark ? "border-dark-700" : "border-gray-200"}
        ${server.unreadCount > 0 ? (isDark ? "border-l-brand border-l-4" : "border-l-brand border-l-4") : ""}
      `}
    >
      <ServerIcon server={server} isDark={isDark} />

      <View className="flex-1 ml-4">
        <View className="flex-row items-center">
          <Text
            className={`text-base font-semibold flex-1 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
            numberOfLines={1}
          >
            {server.name}
          </Text>
        </View>

        <View className="flex-row items-center mt-1">
          <Ionicons
            name="people-outline"
            size={14}
            color={isDark ? "#80848e" : "#9ca3af"}
          />
          <Text
            className={`text-sm ml-1 ${
              isDark ? "text-dark-400" : "text-gray-500"
            }`}
          >
            {server.memberCount.toLocaleString()} members
          </Text>
        </View>

        {server.description && (
          <Text
            className={`text-xs mt-1 ${
              isDark ? "text-dark-500" : "text-gray-400"
            }`}
            numberOfLines={1}
          >
            {server.description}
          </Text>
        )}
      </View>

      {server.unreadCount > 0 ? (
        <UnreadBadge count={server.unreadCount} />
      ) : (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={isDark ? "#80848e" : "#9ca3af"}
        />
      )}
    </TouchableOpacity>
  );
}

function EmptyState({
  isDark,
  hasSearch,
}: {
  isDark: boolean;
  hasSearch: boolean;
}) {
  return (
    <View className="items-center justify-center py-20 px-8">
      <View
        className={`
          w-20 h-20 rounded-full items-center justify-center mb-4
          ${isDark ? "bg-dark-800" : "bg-gray-100"}
        `}
      >
        <Ionicons
          name={hasSearch ? "search-outline" : "planet-outline"}
          size={40}
          color={isDark ? "#4e5058" : "#9ca3af"}
        />
      </View>
      <Text
        className={`text-lg font-semibold text-center ${
          isDark ? "text-dark-200" : "text-gray-700"
        }`}
      >
        {hasSearch ? "No servers found" : "No servers yet"}
      </Text>
      <Text
        className={`mt-2 text-sm text-center ${
          isDark ? "text-dark-400" : "text-gray-500"
        }`}
      >
        {hasSearch
          ? "Try adjusting your search terms"
          : "Create or join a server to get started"}
      </Text>
    </View>
  );
}

interface CreateServerButtonProps {
  isDark: boolean;
  onPress: () => void;
}

function CreateServerButton({ isDark, onPress }: CreateServerButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className={`
        flex-row 
        items-center 
        justify-center
        p-4 
        mx-4 
        mb-3 
        rounded-xl
        border-2 border-dashed
        ${isDark ? "border-dark-600" : "border-gray-300"}
      `}
    >
      <View
        className={`
          w-12 h-12 rounded-full items-center justify-center mr-3
          ${isDark ? "bg-brand/20" : "bg-brand/10"}
        `}
      >
        <Ionicons name="add" size={28} color="#5865f2" />
      </View>
      <View className="flex-1">
        <Text
          className={`text-base font-semibold ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          Create a Server
        </Text>
        <Text
          className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}
        >
          Start your own community
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#5865f2" />
    </TouchableOpacity>
  );
}

interface DiscoverServersButtonProps {
  isDark: boolean;
  onPress: () => void;
}

function DiscoverServersButton({
  isDark,
  onPress,
}: DiscoverServersButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className={`
        flex-row 
        items-center 
        justify-center
        p-4 
        mx-4 
        mb-3 
        rounded-xl
        ${isDark ? "bg-dark-800" : "bg-white"}
        border
        ${isDark ? "border-dark-700" : "border-gray-200"}
      `}
    >
      <View
        className={`
          w-12 h-12 rounded-full items-center justify-center mr-3
          ${isDark ? "bg-green-500/20" : "bg-green-500/10"}
        `}
      >
        <Ionicons name="compass-outline" size={28} color="#22c55e" />
      </View>
      <View className="flex-1">
        <Text
          className={`text-base font-semibold ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          Discover Servers
        </Text>
        <Text
          className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}
        >
          Find communities to join
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#22c55e" />
    </TouchableOpacity>
  );
}

interface ServerListScreenProps {
  /** Initial list of servers to display */
  servers?: Server[];
  /** Callback when a server is selected */
  onServerPress?: (server: Server) => void;
  /** Callback when refresh is triggered */
  onRefresh?: () => Promise<void>;
  /** Callback when create server button is pressed */
  onCreateServer?: () => void;
  /** Callback when discover servers button is pressed */
  onDiscoverServers?: () => void;
  /** Whether the list is currently loading */
  isLoading?: boolean;
  /** Whether to show the search bar */
  showSearch?: boolean;
  /** Whether to show the create server button in the list */
  showCreateButton?: boolean;
  /** Whether to show the discover servers button */
  showDiscoverButton?: boolean;
  /** Header component to render at the top */
  ListHeaderComponent?: React.ComponentType | React.ReactElement | null;
  /** Screen title */
  title?: string;
}

export function ServerListScreen({
  servers = [],
  onServerPress,
  onRefresh,
  onCreateServer,
  onDiscoverServers,
  isLoading = false,
  showSearch = true,
  showCreateButton = true,
  showDiscoverButton = true,
  ListHeaderComponent,
  title = "Servers",
}: ServerListScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const filteredServers = useMemo(() => {
    if (!searchQuery.trim()) return servers;

    const query = searchQuery.toLowerCase().trim();
    return servers.filter(
      (server) =>
        server.name.toLowerCase().includes(query) ||
        server.description?.toLowerCase().includes(query),
    );
  }, [servers, searchQuery]);

  // Sort servers: unread first, then alphabetically
  const sortedServers = useMemo(() => {
    return [...filteredServers].sort((a, b) => {
      // Unread servers first
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
      // Then by name
      return a.name.localeCompare(b.name);
    });
  }, [filteredServers]);

  const totalUnreadCount = useMemo(() => {
    return servers.reduce((sum, server) => sum + (server.unreadCount || 0), 0);
  }, [servers]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const handleCreateServer = useCallback(() => {
    if (onCreateServer) {
      onCreateServer();
    } else {
      router.push("/server/create");
    }
  }, [onCreateServer]);

  const handleDiscoverServers = useCallback(() => {
    if (onDiscoverServers) {
      onDiscoverServers();
    } else {
      router.push("/(tabs)/discover");
    }
  }, [onDiscoverServers]);

  const renderHeader = useCallback(() => {
    return (
      <View>
        {/* Title Section */}
        <View className="px-4 pt-4 pb-2">
          <View className="flex-row items-center justify-between">
            <Text
              className={`text-2xl font-bold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              {title}
            </Text>
            {totalUnreadCount > 0 && (
              <View className="bg-brand rounded-full px-3 py-1">
                <Text className="text-white text-sm font-semibold">
                  {totalUnreadCount > 99 ? "99+" : totalUnreadCount} unread
                </Text>
              </View>
            )}
          </View>
          <Text
            className={`text-sm mt-1 ${
              isDark ? "text-dark-400" : "text-gray-500"
            }`}
          >
            {servers.length} server{servers.length !== 1 ? "s" : ""}
          </Text>
        </View>

        {ListHeaderComponent &&
          (typeof ListHeaderComponent === "function" ? (
            <ListHeaderComponent />
          ) : (
            ListHeaderComponent
          ))}

        {showSearch && (
          <View className="px-4 py-3">
            <SearchInput
              placeholder="Search servers..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        )}

        {showDiscoverButton && (
          <DiscoverServersButton
            isDark={isDark}
            onPress={handleDiscoverServers}
          />
        )}

        {showCreateButton && (
          <CreateServerButton isDark={isDark} onPress={handleCreateServer} />
        )}

        {sortedServers.length > 0 && (
          <View className="px-4 pb-2 pt-1">
            <Text
              className={`text-xs font-semibold uppercase tracking-wide ${
                isDark ? "text-dark-400" : "text-gray-500"
              }`}
            >
              Your Servers ({sortedServers.length})
            </Text>
          </View>
        )}
      </View>
    );
  }, [
    ListHeaderComponent,
    showSearch,
    searchQuery,
    showCreateButton,
    showDiscoverButton,
    isDark,
    sortedServers.length,
    servers.length,
    totalUnreadCount,
    title,
    handleCreateServer,
    handleDiscoverServers,
  ]);

  if (isLoading && servers.length === 0) {
    return (
      <SafeAreaView
        className={`flex-1 items-center justify-center ${
          isDark ? "bg-dark-900" : "bg-gray-50"
        }`}
        edges={["bottom"]}
      >
        <ActivityIndicator size="large" color="#5865f2" />
        <Text className={`mt-4 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
          Loading servers...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}
      edges={["bottom"]}
    >
      <FlatList
        data={sortedServers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ServerItem server={item} isDark={isDark} onPress={onServerPress} />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState isDark={isDark} hasSearch={searchQuery.length > 0} />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={isDark ? "#5865f2" : "#4f46e5"}
            colors={["#5865f2"]}
          />
        }
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

export default ServerListScreen;
