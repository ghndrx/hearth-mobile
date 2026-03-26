import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl} from "react-native";
import { useColorScheme } from "../../lib/hooks/useColorScheme";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Avatar } from "../../components/ui";

interface PinnedMessage {
  id: string;
  content: string;
  author: {
    name: string;
    avatar?: string;
    isOnline: boolean;
  };
  pinnedBy: string;
  pinnedAt: string;
  timestamp: string;
  attachments?: { type: "image" | "file"; name: string }[];
  reactions?: { emoji: string; count: number }[];
}

const mockPinnedMessages: PinnedMessage[] = [
  {
    id: "p1",
    content:
      "Welcome to the channel! Please read the rules before posting. Be respectful and have fun!",
    author: {
      name: "Sarah Johnson",
      isOnline: true,
    },
    pinnedBy: "Sarah Johnson",
    pinnedAt: "2 weeks ago",
    timestamp: "Mar 1, 2026 at 10:30 AM",
  },
  {
    id: "p2",
    content:
      "Meeting schedule for this week:\n- Monday: Standup at 9am\n- Wednesday: Design review at 2pm\n- Friday: Demo at 4pm",
    author: {
      name: "Michael Chen",
      isOnline: false,
    },
    pinnedBy: "Michael Chen",
    pinnedAt: "1 week ago",
    timestamp: "Mar 3, 2026 at 2:15 PM",
    reactions: [
      { emoji: "👍", count: 8 },
      { emoji: "📅", count: 3 },
    ],
  },
  {
    id: "p3",
    content:
      "Important: The API endpoint for device status has changed. Please update your integrations to use /api/v2/devices instead of /api/v1/devices. The old endpoint will be deprecated on April 1st.",
    author: {
      name: "Alex Thompson",
      isOnline: true,
    },
    pinnedBy: "Sarah Johnson",
    pinnedAt: "3 days ago",
    timestamp: "Mar 4, 2026 at 11:45 AM",
    attachments: [{ type: "file", name: "migration-guide.pdf" }],
    reactions: [
      { emoji: "🔥", count: 5 },
      { emoji: "👀", count: 12 },
    ],
  },
  {
    id: "p4",
    content:
      "Just shipped the new dashboard redesign! Check it out and let me know what you think. Screenshots attached below.",
    author: {
      name: "Emily Davis",
      isOnline: false,
    },
    pinnedBy: "Emily Davis",
    pinnedAt: "Yesterday",
    timestamp: "Mar 5, 2026 at 9:00 AM",
    attachments: [
      { type: "image", name: "dashboard-v2.png" },
      { type: "image", name: "dashboard-mobile.png" },
    ],
    reactions: [
      { emoji: "🎉", count: 15 },
      { emoji: "❤️", count: 7 },
      { emoji: "🚀", count: 4 },
    ],
  },
];

function PinnedMessageCard({
  message,
  isDark,
  index,
  onJump,
  onUnpin,
}: {
  message: PinnedMessage;
  isDark: boolean;
  index: number;
  onJump: () => void;
  onUnpin: () => void;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).duration(300)}
      className={`mx-4 mb-3 rounded-xl overflow-hidden border ${
        isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"
      }`}
    >
      {/* Pin indicator */}
      <View
        className={`flex-row items-center px-4 pt-3 pb-1`}
      >
        <Ionicons name="pin" size={12} color="#f59e0b" />
        <Text
          className={`text-xs ml-1.5 ${isDark ? "text-dark-400" : "text-gray-500"}`}
        >
          Pinned by {message.pinnedBy} · {message.pinnedAt}
        </Text>
      </View>

      {/* Message content */}
      <View className="px-4 py-2">
        <View className="flex-row items-center mb-2">
          <Avatar
            name={message.author.name}
            uri={message.author.avatar}
            size="sm"
            status={message.author.isOnline ? "online" : "offline"}
            showStatus
          />
          <View className="ml-2.5">
            <Text
              className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
            >
              {message.author.name}
            </Text>
            <Text
              className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}
            >
              {message.timestamp}
            </Text>
          </View>
        </View>

        <Text
          className={`text-base leading-6 ${isDark ? "text-dark-200" : "text-gray-700"}`}
        >
          {message.content}
        </Text>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <View className="flex-row flex-wrap mt-2" style={{ gap: 8 }}>
            {message.attachments.map((att, i) => (
              <View
                key={i}
                className={`flex-row items-center px-3 py-2 rounded-lg ${
                  isDark ? "bg-dark-700" : "bg-gray-100"
                }`}
              >
                <Ionicons
                  name={att.type === "image" ? "image-outline" : "document-outline"}
                  size={16}
                  color={isDark ? "#80848e" : "#6b7280"}
                />
                <Text
                  className={`text-sm ml-1.5 ${isDark ? "text-dark-200" : "text-gray-700"}`}
                  numberOfLines={1}
                >
                  {att.name}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <View className="flex-row flex-wrap mt-2" style={{ gap: 6 }}>
            {message.reactions.map((reaction, i) => (
              <View
                key={i}
                className={`flex-row items-center px-2 py-1 rounded-full ${
                  isDark ? "bg-dark-700" : "bg-gray-100"
                }`}
              >
                <Text className="text-sm">{reaction.emoji}</Text>
                <Text
                  className={`text-xs ml-1 font-medium ${
                    isDark ? "text-dark-300" : "text-gray-600"
                  }`}
                >
                  {reaction.count}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Actions */}
      <View
        className={`flex-row items-center border-t px-2 py-1 ${
          isDark ? "border-dark-700" : "border-gray-100"
        }`}
      >
        <TouchableOpacity
          onPress={onJump}
          className="flex-row items-center px-3 py-2"
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-forward-outline"
            size={16}
            color="#5865f2"
          />
          <Text className="text-brand text-sm font-medium ml-1.5">
            Jump to message
          </Text>
        </TouchableOpacity>
        <View className="flex-1" />
        <TouchableOpacity
          onPress={onUnpin}
          className="px-3 py-2"
          activeOpacity={0.7}
        >
          <Ionicons
            name="pin-outline"
            size={16}
            color={isDark ? "#80848e" : "#6b7280"}
          />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export default function PinnedMessagesScreen() {
  const { channelName } = useLocalSearchParams<{ channelName?: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [messages, setMessages] = useState(mockPinnedMessages);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleUnpin = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  const handleJump = useCallback((_messageId: string) => {
    // In production: navigate to the message in the channel and scroll to it
    router.back();
  }, []);

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Pinned Messages",
          headerTitleStyle: {
            color: isDark ? "#ffffff" : "#111827",
            fontSize: 18,
            fontWeight: "bold",
          },
          headerStyle: {
            backgroundColor: isDark ? "#1e1f22" : "#ffffff",
          },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="ml-2">
              <Ionicons
                name="chevron-back"
                size={28}
                color={isDark ? "#80848e" : "#6b7280"}
              />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Channel info */}
      {channelName && (
        <View
          className={`flex-row items-center px-4 py-2.5 border-b ${
            isDark ? "bg-dark-800/50 border-dark-800" : "bg-white border-gray-200"
          }`}
        >
          <Ionicons
            name="chatbubble-outline"
            size={16}
            color={isDark ? "#80848e" : "#9ca3af"}
          />
          <Text
            className={`text-sm font-medium ml-1.5 ${isDark ? "text-dark-200" : "text-gray-700"}`}
          >
            #{channelName}
          </Text>
          <Text
            className={`text-sm ml-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            · {messages.length} pinned
          </Text>
        </View>
      )}

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <PinnedMessageCard
            message={item}
            isDark={isDark}
            index={index}
            onJump={() => handleJump(item.id)}
            onUnpin={() => handleUnpin(item.id)}
          />
        )}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? "#5865f2" : "#4f46e5"}
          />
        }
        ListEmptyComponent={() => (
          <View className="items-center justify-center py-20">
            <Ionicons
              name="pin-outline"
              size={64}
              color={isDark ? "#4e5058" : "#d1d5db"}
            />
            <Text
              className={`mt-4 text-lg font-medium ${
                isDark ? "text-dark-300" : "text-gray-500"
              }`}
            >
              No pinned messages
            </Text>
            <Text
              className={`mt-1 text-sm text-center px-8 ${
                isDark ? "text-dark-400" : "text-gray-400"
              }`}
            >
              Pin important messages so they're easy to find later. Long-press a
              message to pin it.
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
