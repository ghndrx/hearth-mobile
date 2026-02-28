import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  useColorScheme,
  Image,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { SearchInput } from "../../components/ui";

interface DirectMessage {
  id: string;
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  recipientStatus: "online" | "idle" | "dnd" | "offline";
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
  isTyping?: boolean;
}

// Mock data for demonstration
const MOCK_DMS: DirectMessage[] = [
  {
    id: "1",
    recipientId: "user1",
    recipientName: "Alex Chen",
    recipientAvatar: undefined,
    recipientStatus: "online",
    lastMessage: "Hey, are you coming to the meetup tonight?",
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 5),
    unreadCount: 2,
  },
  {
    id: "2",
    recipientId: "user2",
    recipientName: "Jordan Smith",
    recipientAvatar: undefined,
    recipientStatus: "idle",
    lastMessage: "Thanks for sharing that article!",
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 30),
    unreadCount: 0,
  },
  {
    id: "3",
    recipientId: "user3",
    recipientName: "Sam Wilson",
    recipientAvatar: undefined,
    recipientStatus: "dnd",
    lastMessage: "Let me check and get back to you",
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    unreadCount: 0,
    isTyping: true,
  },
  {
    id: "4",
    recipientId: "user4",
    recipientName: "Taylor Lee",
    recipientAvatar: undefined,
    recipientStatus: "offline",
    lastMessage: "See you tomorrow!",
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    unreadCount: 0,
  },
];

const STATUS_COLORS: Record<string, string> = {
  online: "#22c55e",
  idle: "#f59e0b",
  dnd: "#ef4444",
  offline: "#6b7280",
};

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface DMItemProps {
  dm: DirectMessage;
  isDark: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

function DMItem({ dm, isDark, onPress, onLongPress }: DMItemProps) {
  const hasUnread = dm.unreadCount > 0;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      className={`flex-row items-center px-4 py-3 active:opacity-70 ${
        hasUnread
          ? isDark
            ? "bg-gray-900/50"
            : "bg-blue-50"
          : ""
      }`}
    >
      {/* Avatar */}
      <View className="relative">
        {dm.recipientAvatar ? (
          <Image
            source={{ uri: dm.recipientAvatar }}
            className="w-12 h-12 rounded-full"
          />
        ) : (
          <View
            className={`w-12 h-12 rounded-full items-center justify-center ${
              isDark ? "bg-gray-700" : "bg-gray-200"
            }`}
          >
            <Text
              className={`text-lg font-semibold ${
                isDark ? "text-gray-300" : "text-gray-600"
              }`}
            >
              {getInitials(dm.recipientName)}
            </Text>
          </View>
        )}
        {/* Status indicator */}
        <View
          className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2"
          style={{
            backgroundColor: STATUS_COLORS[dm.recipientStatus],
            borderColor: isDark ? "#111827" : "#ffffff",
          }}
        />
      </View>

      {/* Content */}
      <View className="flex-1 ml-3 mr-2">
        <View className="flex-row items-center justify-between mb-1">
          <Text
            className={`text-base font-semibold flex-1 ${
              hasUnread
                ? isDark
                  ? "text-white"
                  : "text-gray-900"
                : isDark
                ? "text-gray-200"
                : "text-gray-800"
            }`}
            numberOfLines={1}
          >
            {dm.recipientName}
          </Text>
          <Text
            className={`text-xs ml-2 ${
              hasUnread
                ? "text-blue-500 font-medium"
                : isDark
                ? "text-gray-500"
                : "text-gray-400"
            }`}
          >
            {formatTimestamp(dm.lastMessageAt)}
          </Text>
        </View>
        <View className="flex-row items-center">
          {dm.isTyping ? (
            <View className="flex-row items-center">
              <View className="flex-row gap-1">
                <View className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
                <View className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
                <View className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
              </View>
              <Text
                className={`ml-2 text-sm italic ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                typing...
              </Text>
            </View>
          ) : (
            <Text
              className={`text-sm flex-1 ${
                hasUnread
                  ? isDark
                    ? "text-gray-300"
                    : "text-gray-700"
                  : isDark
                  ? "text-gray-500"
                  : "text-gray-500"
              }`}
              numberOfLines={1}
            >
              {dm.lastMessage}
            </Text>
          )}
          {hasUnread && (
            <View className="ml-2 min-w-6 h-6 px-2 rounded-full bg-blue-500 items-center justify-center">
              <Text className="text-xs font-bold text-white">
                {dm.unreadCount > 99 ? "99+" : dm.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function MessagesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [dms] = useState<DirectMessage[]>(MOCK_DMS);

  const filteredDms = useMemo(() => {
    if (!searchQuery.trim()) return dms;
    const query = searchQuery.toLowerCase();
    return dms.filter(
      (dm) =>
        dm.recipientName.toLowerCase().includes(query) ||
        dm.lastMessage.toLowerCase().includes(query)
    );
  }, [dms, searchQuery]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Fetch latest DMs
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleDMPress = useCallback(
    (dm: DirectMessage) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/chat/${dm.id}`);
    },
    [router]
  );

  const handleDMLongPress = useCallback((_dm: DirectMessage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // TODO: Show context menu (mute, archive, block, etc.)
  }, []);

  const handleNewMessage = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // TODO: Open new DM modal/screen
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: DirectMessage }) => (
      <DMItem
        dm={item}
        isDark={isDark}
        onPress={() => handleDMPress(item)}
        onLongPress={() => handleDMLongPress(item)}
      />
    ),
    [isDark, handleDMPress, handleDMLongPress]
  );

  const renderEmptyState = useCallback(
    () => (
      <View className="flex-1 items-center justify-center py-20">
        <View
          className={`w-20 h-20 rounded-full items-center justify-center mb-4 ${
            isDark ? "bg-gray-800" : "bg-gray-100"
          }`}
        >
          <MaterialCommunityIcons
            name="message-text-outline"
            size={40}
            color={isDark ? "#4b5563" : "#9ca3af"}
          />
        </View>
        <Text
          className={`text-lg font-semibold mb-2 ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          {searchQuery ? "No Results" : "No Messages Yet"}
        </Text>
        <Text
          className={`text-sm text-center px-8 ${
            isDark ? "text-gray-400" : "text-gray-500"
          }`}
        >
          {searchQuery
            ? "Try a different search term"
            : "Start a conversation with friends or server members"}
        </Text>
        {!searchQuery && (
          <Pressable
            onPress={handleNewMessage}
            className="mt-6 px-6 py-3 rounded-xl bg-emerald-500 active:opacity-80"
          >
            <Text className="text-white font-semibold">Start a Conversation</Text>
          </Pressable>
        )}
      </View>
    ),
    [isDark, searchQuery, handleNewMessage]
  );

  const renderHeader = useCallback(
    () => (
      <View className="px-4 py-3">
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search messages..."
        />
      </View>
    ),
    [searchQuery]
  );

  const ItemSeparator = useCallback(
    () => (
      <View
        className={`h-px ml-20 ${isDark ? "bg-gray-800" : "bg-gray-100"}`}
      />
    ),
    [isDark]
  );

  return (
    <View className={`flex-1 ${isDark ? "bg-black" : "bg-white"}`}>
      <Stack.Screen
        options={{
          title: "Messages",
          headerStyle: {
            backgroundColor: isDark ? "#0a0a0a" : "#ffffff",
          },
          headerTintColor: isDark ? "#ffffff" : "#1a1a1a",
          headerRight: () => (
            <Pressable
              onPress={handleNewMessage}
              className="mr-2 p-2 active:opacity-70"
            >
              <MaterialCommunityIcons
                name="pencil-plus"
                size={24}
                color={isDark ? "#10b981" : "#059669"}
              />
            </Pressable>
          ),
        }}
      />

      <FlatList
        data={filteredDms}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        ItemSeparatorComponent={ItemSeparator}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? "#6b7280" : "#9ca3af"}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          filteredDms.length === 0 ? { flexGrow: 1 } : undefined
        }
      />
    </View>
  );
}
