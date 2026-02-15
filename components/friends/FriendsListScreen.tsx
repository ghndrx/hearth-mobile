import React, { useState, useMemo, useCallback } from "react";
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
import { Avatar, SearchInput } from "../ui";
import type { User } from "../../lib/types";

type FriendStatus = "online" | "offline" | "idle" | "dnd" | "all";

interface Friend extends User {
  isFriend: boolean;
  friendSince?: string;
  mutualServers?: number;
}

const mockFriends: Friend[] = [
  {
    id: "1",
    username: "sarah_dev",
    displayName: "Sarah Chen",
    avatar: undefined,
    email: "sarah@example.com",
    status: "online",
    bio: "Frontend developer & coffee enthusiast ☕",
    isFriend: true,
    friendSince: "2024-01-15",
    mutualServers: 3,
  },
  {
    id: "2",
    username: "mike_design",
    displayName: "Mike Ross",
    avatar: undefined,
    email: "mike@example.com",
    status: "idle",
    bio: "UI/UX Designer 🎨",
    isFriend: true,
    friendSince: "2024-02-20",
    mutualServers: 2,
  },
  {
    id: "3",
    username: "alex_backend",
    displayName: "Alex Johnson",
    avatar: undefined,
    email: "alex@example.com",
    status: "dnd",
    bio: "Backend wizard | Go & Rust",
    isFriend: true,
    friendSince: "2024-03-10",
    mutualServers: 5,
  },
  {
    id: "4",
    username: "emma_mobile",
    displayName: "Emma Wilson",
    avatar: undefined,
    email: "emma@example.com",
    status: "offline",
    bio: "React Native developer 📱",
    isFriend: true,
    friendSince: "2024-01-28",
    mutualServers: 1,
  },
  {
    id: "5",
    username: "david_pm",
    displayName: "David Lee",
    avatar: undefined,
    email: "david@example.com",
    status: "online",
    bio: "Product Manager | Tech enthusiast",
    isFriend: true,
    friendSince: "2024-04-05",
    mutualServers: 4,
  },
  {
    id: "6",
    username: "lisa_fullstack",
    displayName: "Lisa Park",
    avatar: undefined,
    email: "lisa@example.com",
    status: "offline",
    bio: "Full-stack developer 💻",
    isFriend: true,
    friendSince: "2024-02-14",
    mutualServers: 2,
  },
];

const filterTabs: { key: FriendStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "online", label: "Online" },
  { key: "offline", label: "Offline" },
];

interface FriendItemProps {
  friend: Friend;
  isDark: boolean;
  onPress: (friend: Friend) => void;
  onMessage: (friend: Friend) => void;
}

function FriendItem({ friend, isDark, onPress, onMessage }: FriendItemProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(friend)}
      className={`
        flex-row 
        items-center 
        p-4 
        mx-4 
        mb-2 
        rounded-xl
        ${isDark ? "bg-dark-800" : "bg-white"}
        border
        ${isDark ? "border-dark-700" : "border-gray-200"}
      `}
    >
      <Avatar
        uri={friend.avatar}
        name={friend.displayName}
        size="lg"
        status={friend.status}
        showStatus
      />

      <View className="flex-1 ml-4">
        <Text
          className={`text-base font-semibold ${
            isDark ? "text-white" : "text-gray-900"
          }`}
          numberOfLines={1}
        >
          {friend.displayName}
        </Text>
        <Text
          className={`text-sm mt-0.5 ${
            isDark ? "text-dark-400" : "text-gray-500"
          }`}
          numberOfLines={1}
        >
          @{friend.username}
        </Text>
        {friend.bio && (
          <Text
            className={`text-xs mt-1 ${
              isDark ? "text-dark-500" : "text-gray-400"
            }`}
            numberOfLines={1}
          >
            {friend.bio}
          </Text>
        )}
      </View>

      <View className="flex-row items-center">
        <TouchableOpacity
          onPress={() => onMessage(friend)}
          className={`
            w-10 h-10 rounded-full items-center justify-center mr-2
            ${isDark ? "bg-dark-700" : "bg-gray-100"}
          `}
        >
          <Ionicons
            name="chatbubble-outline"
            size={20}
            color={isDark ? "#80848e" : "#6b7280"}
          />
        </TouchableOpacity>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={isDark ? "#80848e" : "#9ca3af"}
        />
      </View>
    </TouchableOpacity>
  );
}

interface EmptyStateProps {
  isDark: boolean;
  hasSearch: boolean;
  filterStatus: FriendStatus;
}

function EmptyState({ isDark, hasSearch, filterStatus }: EmptyStateProps) {
  const getMessage = () => {
    if (hasSearch) {
      return {
        title: "No friends found",
        subtitle: "Try adjusting your search terms",
        icon: "search-outline" as const,
      };
    }
    if (filterStatus === "online") {
      return {
        title: "No friends online",
        subtitle: "When friends come online, they'll appear here",
        icon: "planet-outline" as const,
      };
    }
    if (filterStatus === "offline") {
      return {
        title: "No offline friends",
        subtitle: "All your friends are currently online!",
        icon: "happy-outline" as const,
      };
    }
    return {
      title: "No friends yet",
      subtitle: "Add friends to see them here",
      icon: "people-outline" as const,
    };
  };

  const message = getMessage();

  return (
    <View className="items-center justify-center py-20 px-8">
      <View
        className={`
          w-20 h-20 rounded-full items-center justify-center mb-4
          ${isDark ? "bg-dark-800" : "bg-gray-100"}
        `}
      >
        <Ionicons
          name={message.icon}
          size={40}
          color={isDark ? "#4e5058" : "#9ca3af"}
        />
      </View>
      <Text
        className={`text-lg font-semibold text-center ${
          isDark ? "text-dark-200" : "text-gray-700"
        }`}
      >
        {message.title}
      </Text>
      <Text
        className={`mt-2 text-sm text-center ${
          isDark ? "text-dark-400" : "text-gray-500"
        }`}
      >
        {message.subtitle}
      </Text>
    </View>
  );
}

interface StatusSummaryProps {
  friends: Friend[];
  isDark: boolean;
}

function StatusSummary({ friends, isDark }: StatusSummaryProps) {
  const counts = useMemo(() => {
    return {
      online: friends.filter((f) => f.status === "online").length,
      idle: friends.filter((f) => f.status === "idle").length,
      dnd: friends.filter((f) => f.status === "dnd").length,
      offline: friends.filter((f) => f.status === "offline").length,
    };
  }, [friends]);

  return (
    <View className="flex-row justify-around px-4 py-3 mb-2">
      <View className="items-center">
        <View className="flex-row items-center">
          <View className="w-2.5 h-2.5 rounded-full bg-green-500 mr-1.5" />
          <Text
            className={`text-lg font-bold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            {counts.online}
          </Text>
        </View>
        <Text
          className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}
        >
          Online
        </Text>
      </View>
      <View className="items-center">
        <View className="flex-row items-center">
          <View className="w-2.5 h-2.5 rounded-full bg-yellow-500 mr-1.5" />
          <Text
            className={`text-lg font-bold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            {counts.idle}
          </Text>
        </View>
        <Text
          className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}
        >
          Idle
        </Text>
      </View>
      <View className="items-center">
        <View className="flex-row items-center">
          <View className="w-2.5 h-2.5 rounded-full bg-red-500 mr-1.5" />
          <Text
            className={`text-lg font-bold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            {counts.dnd}
          </Text>
        </View>
        <Text
          className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}
        >
          Busy
        </Text>
      </View>
      <View className="items-center">
        <View className="flex-row items-center">
          <View className="w-2.5 h-2.5 rounded-full bg-gray-500 mr-1.5" />
          <Text
            className={`text-lg font-bold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            {counts.offline}
          </Text>
        </View>
        <Text
          className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}
        >
          Offline
        </Text>
      </View>
    </View>
  );
}

interface FilterTabsProps {
  activeTab: FriendStatus;
  onChange: (tab: FriendStatus) => void;
  isDark: boolean;
}

function FilterTabs({ activeTab, onChange, isDark }: FilterTabsProps) {
  return (
    <View className="flex-row px-4 py-2">
      {filterTabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          onPress={() => onChange(tab.key)}
          className={`
            px-4 py-2 rounded-full mr-2
            ${
              activeTab === tab.key
                ? isDark
                  ? "bg-brand"
                  : "bg-brand"
                : isDark
                  ? "bg-dark-800"
                  : "bg-gray-100"
            }
          `}
        >
          <Text
            className={`
              text-sm font-medium
              ${
                activeTab === tab.key
                  ? "text-white"
                  : isDark
                    ? "text-dark-300"
                    : "text-gray-600"
              }
            `}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

interface FriendsListScreenProps {
  friends?: Friend[];
  isLoading?: boolean;
  onRefresh?: () => Promise<void>;
  onFriendPress?: (friend: Friend) => void;
  onMessagePress?: (friend: Friend) => void;
}

export function FriendsListScreen({
  friends = mockFriends,
  isLoading = false,
  onRefresh,
  onFriendPress,
  onMessagePress,
}: FriendsListScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FriendStatus>("all");

  const filteredFriends = useMemo(() => {
    let result = friends;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (friend) =>
          friend.displayName.toLowerCase().includes(query) ||
          friend.username.toLowerCase().includes(query) ||
          friend.bio?.toLowerCase().includes(query),
      );
    }

    // Filter by status
    if (activeFilter !== "all") {
      result = result.filter((friend) => {
        if (activeFilter === "online") {
          return ["online", "idle", "dnd"].includes(friend.status || "");
        }
        if (activeFilter === "offline") {
          return friend.status === "offline";
        }
        return true;
      });
    }

    // Sort: online first, then by name
    return result.sort((a, b) => {
      const aOnline = ["online", "idle", "dnd"].includes(a.status || "");
      const bOnline = ["online", "idle", "dnd"].includes(b.status || "");
      if (aOnline && !bOnline) return -1;
      if (bOnline && !aOnline) return 1;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [friends, searchQuery, activeFilter]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const handleFriendPress = useCallback(
    (friend: Friend) => {
      if (onFriendPress) {
        onFriendPress(friend);
      } else {
        router.push(`/profile/${friend.id}`);
      }
    },
    [onFriendPress],
  );

  const handleMessagePress = useCallback(
    (friend: Friend) => {
      if (onMessagePress) {
        onMessagePress(friend);
      } else {
        router.push(`/chat/${friend.id}`);
      }
    },
    [onMessagePress],
  );

  if (isLoading && friends.length === 0) {
    return (
      <SafeAreaView
        className={`flex-1 items-center justify-center ${
          isDark ? "bg-dark-900" : "bg-gray-50"
        }`}
        edges={["bottom"]}
      >
        <ActivityIndicator size="large" color="#5865f2" />
        <Text className={`mt-4 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
          Loading friends...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <View className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}>
      <StatusSummary friends={friends} isDark={isDark} />

      <View className="px-4 py-2">
        <SearchInput
          placeholder="Search friends..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FilterTabs
        activeTab={activeFilter}
        onChange={setActiveFilter}
        isDark={isDark}
      />

      <FlatList
        data={filteredFriends}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FriendItem
            friend={item}
            isDark={isDark}
            onPress={handleFriendPress}
            onMessage={handleMessagePress}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            isDark={isDark}
            hasSearch={searchQuery.length > 0}
            filterStatus={activeFilter}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={isDark ? "#5865f2" : "#4f46e5"}
            colors={["#5865f2"]}
          />
        }
        contentContainerStyle={{
          paddingBottom: 20,
          flexGrow: filteredFriends.length === 0 ? 1 : undefined,
        }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

export default FriendsListScreen;
