import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, Badge } from "../../../components/ui";

interface Channel {
  id: string;
  name: string;
  type: "text" | "voice";
  unreadCount?: number;
  isActive?: boolean;
}

interface Category {
  id: string;
  name: string;
  channels: Channel[];
}

interface ServerMember {
  id: string;
  name: string;
  status: "online" | "idle" | "dnd" | "offline";
  role?: string;
}

const mockCategories: Category[] = [
  {
    id: "1",
    name: "GENERAL",
    channels: [
      { id: "1", name: "general", type: "text", unreadCount: 5 },
      { id: "2", name: "introductions", type: "text" },
      { id: "3", name: "General Voice", type: "voice" },
    ],
  },
  {
    id: "2",
    name: "TEXT CHANNELS",
    channels: [
      { id: "4", name: "random", type: "text", unreadCount: 12 },
      { id: "5", name: "memes", type: "text" },
      { id: "6", name: "announcements", type: "text", isActive: true },
    ],
  },
  {
    id: "3",
    name: "VOICE CHANNELS",
    channels: [
      { id: "7", name: "Lounge", type: "voice" },
      { id: "8", name: "Gaming", type: "voice" },
      { id: "9", name: "Music", type: "voice" },
    ],
  },
];

const mockMembers: ServerMember[] = [
  { id: "1", name: "Alice", status: "online", role: "Admin" },
  { id: "2", name: "Bob", status: "online" },
  { id: "3", name: "Charlie", status: "idle" },
  { id: "4", name: "Diana", status: "dnd", role: "Moderator" },
  { id: "5", name: "Eve", status: "offline" },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "online":
      return "#22c55e";
    case "idle":
      return "#f59e0b";
    case "dnd":
      return "#ef4444";
    default:
      return "#80848e";
  }
};

function CategorySection({
  category,
  isDark,
}: {
  category: Category;
  isDark: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <View className="mb-4">
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        className="flex-row items-center px-4 py-2"
      >
        <Ionicons
          name={isExpanded ? "chevron-down" : "chevron-forward"}
          size={16}
          color={isDark ? "#80848e" : "#6b7280"}
        />
        <Text
          className={`ml-2 text-xs font-bold tracking-wider ${
            isDark ? "text-dark-400" : "text-gray-500"
          }`}
        >
          {category.name}
        </Text>
      </TouchableOpacity>

      {isExpanded &&
        category.channels.map((channel) => (
          <TouchableOpacity
            key={channel.id}
            onPress={() =>
              channel.type === "text" &&
              router.push(`/chat/${channel.id}?server=true`)
            }
            className={`
              flex-row items-center px-4 py-2.5 mx-2 rounded-lg
              ${channel.isActive ? (isDark ? "bg-dark-700" : "bg-gray-100") : ""}
            `}
          >
            <Ionicons
              name={
                channel.type === "text"
                  ? "chatbubble-outline"
                  : "volume-high-outline"
              }
              size={20}
              color={
                channel.isActive ? "#5865f2" : isDark ? "#80848e" : "#6b7280"
              }
            />
            <Text
              className={`ml-3 flex-1 ${
                channel.isActive
                  ? "text-brand font-medium"
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
          </TouchableOpacity>
        ))}
    </View>
  );
}

function MemberItem({
  member,
  isDark,
}: {
  member: ServerMember;
  isDark: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      className="flex-row items-center px-4 py-2"
    >
      <View className="relative">
        <Avatar name={member.name} size="sm" />
        <View
          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
          style={{
            backgroundColor: getStatusColor(member.status),
            borderColor: isDark ? "#1e1f22" : "#ffffff",
          }}
        />
      </View>
      <View className="ml-3 flex-1">
        <Text
          className={`${
            member.role
              ? "text-brand"
              : isDark
                ? "text-dark-200"
                : "text-gray-700"
          }`}
        >
          {member.name}
        </Text>
        {member.role && (
          <Text
            className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            {member.role}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function ServerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [activeTab, setActiveTab] = useState<"channels" | "members">(
    "channels",
  );

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-white"}`}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Gaming Hub",
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
          headerRight: () => (
            <View className="flex-row mr-4">
              <TouchableOpacity className="mr-4">
                <Ionicons
                  name="search-outline"
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

      <View
        className={`flex-row border-b ${isDark ? "border-dark-700" : "border-gray-200"}`}
      >
        <TouchableOpacity
          onPress={() => setActiveTab("channels")}
          className={`flex-1 py-3 items-center ${
            activeTab === "channels" ? "border-b-2 border-brand" : ""
          }`}
        >
          <Text
            className={`font-medium ${
              activeTab === "channels"
                ? "text-brand"
                : isDark
                  ? "text-dark-400"
                  : "text-gray-500"
            }`}
          >
            Channels
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("members")}
          className={`flex-1 py-3 items-center ${
            activeTab === "members" ? "border-b-2 border-brand" : ""
          }`}
        >
          <Text
            className={`font-medium ${
              activeTab === "members"
                ? "text-brand"
                : isDark
                  ? "text-dark-400"
                  : "text-gray-500"
            }`}
          >
            Members ({mockMembers.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "channels" ? (
        <ScrollView className="flex-1 py-4">
          {mockCategories.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              isDark={isDark}
            />
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={mockMembers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MemberItem member={item} isDark={isDark} />
          )}
          contentContainerClassName="py-4"
        />
      )}
    </SafeAreaView>
  );
}
