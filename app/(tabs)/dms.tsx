import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  useColorScheme,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, SearchInput, Badge } from "../../components/ui";

interface Conversation {
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isOnline: boolean;
  isGroup: boolean;
}

const mockConversations: Conversation[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    lastMessage: "Hey! Are you coming to the meeting tomorrow?",
    timestamp: "2m",
    unreadCount: 3,
    isOnline: true,
    isGroup: false,
  },
  {
    id: "2",
    name: "Design Team",
    lastMessage: "Alex: Just shared the new mockups",
    timestamp: "15m",
    unreadCount: 0,
    isOnline: false,
    isGroup: true,
  },
  {
    id: "3",
    name: "Michael Chen",
    lastMessage: "Thanks for the help! 🙏",
    timestamp: "1h",
    unreadCount: 0,
    isOnline: false,
    isGroup: false,
  },
  {
    id: "4",
    name: "Gaming Squad",
    lastMessage: "Tom: Who's online tonight?",
    timestamp: "2h",
    unreadCount: 12,
    isOnline: true,
    isGroup: true,
  },
  {
    id: "5",
    name: "Emily Davis",
    lastMessage: "Can you send me the file?",
    timestamp: "Yesterday",
    unreadCount: 1,
    isOnline: true,
    isGroup: false,
  },
  {
    id: "6",
    name: "Project Alpha",
    lastMessage: "Jessica: Meeting rescheduled to 3pm",
    timestamp: "Yesterday",
    unreadCount: 0,
    isOnline: false,
    isGroup: true,
  },
  {
    id: "7",
    name: "David Wilson",
    lastMessage: "Sounds good!",
    timestamp: "Mon",
    unreadCount: 0,
    isOnline: false,
    isGroup: false,
  },
];

function ConversationItem({
  conversation,
  isDark,
}: {
  conversation: Conversation;
  isDark: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      className={`
        flex-row 
        items-center 
        p-4 
        border-b
        ${isDark ? "border-dark-800" : "border-gray-100"}
        ${conversation.unreadCount > 0 && isDark ? "bg-dark-800/30" : ""}
        ${conversation.unreadCount > 0 && !isDark ? "bg-blue-50/30" : ""}
      `}
    >
      <Avatar
        uri={conversation.avatar}
        name={conversation.name}
        size="md"
        status={conversation.isOnline ? "online" : "offline"}
        showStatus
      />
      <View className="flex-1 ml-3">
        <View className="flex-row items-center justify-between">
          <Text
            className={`text-base font-semibold ${
              conversation.unreadCount > 0
                ? isDark
                  ? "text-white"
                  : "text-gray-900"
                : isDark
                  ? "text-dark-200"
                  : "text-gray-700"
            }`}
          >
            {conversation.name}
          </Text>
          <Text
            className={`text-xs ${
              conversation.unreadCount > 0
                ? "text-brand"
                : isDark
                  ? "text-dark-400"
                  : "text-gray-400"
            }`}
          >
            {conversation.timestamp}
          </Text>
        </View>
        <View className="flex-row items-center justify-between mt-1">
          <Text
            className={`text-sm flex-1 mr-2 ${
              conversation.unreadCount > 0
                ? isDark
                  ? "text-dark-200"
                  : "text-gray-700"
                : isDark
                  ? "text-dark-400"
                  : "text-gray-500"
            }`}
            numberOfLines={1}
          >
            {conversation.lastMessage}
          </Text>
          {conversation.unreadCount > 0 && (
            <View className="bg-brand rounded-full min-w-[20px] h-5 items-center justify-center px-1.5">
              <Text className="text-white text-xs font-bold">
                {conversation.unreadCount > 99
                  ? "99+"
                  : conversation.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function DMsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const filteredConversations = mockConversations.filter((conv) =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  const totalUnread = mockConversations.reduce(
    (sum, conv) => sum + conv.unreadCount,
    0,
  );

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-white"}`}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Messages",
          headerTitleStyle: {
            color: isDark ? "#ffffff" : "#111827",
            fontSize: 20,
            fontWeight: "bold",
          },
          headerStyle: {
            backgroundColor: isDark ? "#1e1f22" : "#ffffff",
          },
          headerRight: () => (
            <View className="flex-row mr-4">
              <TouchableOpacity className="mr-4">
                <Ionicons
                  name="create-outline"
                  size={24}
                  color={isDark ? "#80848e" : "#6b7280"}
                />
              </TouchableOpacity>
              <TouchableOpacity>
                <Ionicons
                  name="ellipsis-vertical"
                  size={24}
                  color={isDark ? "#80848e" : "#6b7280"}
                />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <View className="px-4 py-3">
        <SearchInput
          placeholder="Search conversations..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationItem conversation={item} isDark={isDark} />
        )}
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
              name="chatbubbles-outline"
              size={64}
              color={isDark ? "#4e5058" : "#d1d5db"}
            />
            <Text
              className={`mt-4 text-lg font-medium ${
                isDark ? "text-dark-300" : "text-gray-500"
              }`}
            >
              No conversations found
            </Text>
            <Text
              className={`mt-1 text-sm ${
                isDark ? "text-dark-400" : "text-gray-400"
              }`}
            >
              Start a new chat to get started
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
