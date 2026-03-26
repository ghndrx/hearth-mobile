import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl} from "react-native";
import { useColorScheme } from "../../../lib/hooks/useColorScheme";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Avatar } from "../../../components/ui";

type ActivityType =
  | "member_join"
  | "member_leave"
  | "channel_create"
  | "channel_delete"
  | "role_create"
  | "role_update"
  | "message_pin"
  | "server_update"
  | "invite_create"
  | "member_ban"
  | "member_kick";

interface ActivityEntry {
  id: string;
  type: ActivityType;
  userId: string;
  userName: string;
  userAvatar?: string;
  targetName?: string;
  timestamp: Date;
  details?: string;
}

const mockActivity: ActivityEntry[] = [
  {
    id: "1",
    type: "member_join",
    userId: "u1",
    userName: "Alex Thompson",
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
  },
  {
    id: "2",
    type: "channel_create",
    userId: "u2",
    userName: "Sarah Johnson",
    targetName: "#project-updates",
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
  },
  {
    id: "3",
    type: "message_pin",
    userId: "u3",
    userName: "Michael Chen",
    targetName: "#general",
    details: "Pinned a message about the new guidelines",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: "4",
    type: "role_create",
    userId: "u2",
    userName: "Sarah Johnson",
    targetName: "Contributor",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
  },
  {
    id: "5",
    type: "server_update",
    userId: "u2",
    userName: "Sarah Johnson",
    details: "Updated the server icon and description",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
  },
  {
    id: "6",
    type: "member_join",
    userId: "u4",
    userName: "Emily Davis",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
  },
  {
    id: "7",
    type: "invite_create",
    userId: "u3",
    userName: "Michael Chen",
    details: "Created an invite link (expires in 7 days)",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12),
  },
  {
    id: "8",
    type: "member_kick",
    userId: "u2",
    userName: "Sarah Johnson",
    targetName: "SpamBot99",
    details: "Reason: Spam",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
  {
    id: "9",
    type: "channel_delete",
    userId: "u2",
    userName: "Sarah Johnson",
    targetName: "#old-announcements",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
  },
  {
    id: "10",
    type: "role_update",
    userId: "u2",
    userName: "Sarah Johnson",
    targetName: "Moderator",
    details: "Updated permissions",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
  },
  {
    id: "11",
    type: "member_ban",
    userId: "u2",
    userName: "Sarah Johnson",
    targetName: "TrollAccount",
    details: "Reason: Harassment",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
  },
  {
    id: "12",
    type: "member_leave",
    userId: "u5",
    userName: "Jake Miller",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
  },
];

type FilterType = "all" | "members" | "channels" | "roles" | "moderation";

const ACTIVITY_CONFIG: Record<
  ActivityType,
  {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    color: string;
    label: (entry: ActivityEntry) => string;
    filter: FilterType;
  }
> = {
  member_join: {
    icon: "person-add",
    color: "#22c55e",
    label: (e) => `${e.userName} joined the server`,
    filter: "members",
  },
  member_leave: {
    icon: "person-remove",
    color: "#80848e",
    label: (e) => `${e.userName} left the server`,
    filter: "members",
  },
  channel_create: {
    icon: "add-circle",
    color: "#3b82f6",
    label: (e) => `${e.userName} created channel ${e.targetName}`,
    filter: "channels",
  },
  channel_delete: {
    icon: "remove-circle",
    color: "#ef4444",
    label: (e) => `${e.userName} deleted channel ${e.targetName}`,
    filter: "channels",
  },
  role_create: {
    icon: "shield",
    color: "#a855f7",
    label: (e) => `${e.userName} created role ${e.targetName}`,
    filter: "roles",
  },
  role_update: {
    icon: "shield-outline",
    color: "#a855f7",
    label: (e) => `${e.userName} updated role ${e.targetName}`,
    filter: "roles",
  },
  message_pin: {
    icon: "pin",
    color: "#f59e0b",
    label: (e) => `${e.userName} pinned a message in ${e.targetName}`,
    filter: "channels",
  },
  server_update: {
    icon: "settings",
    color: "#5865f2",
    label: (e) => `${e.userName} updated server settings`,
    filter: "all",
  },
  invite_create: {
    icon: "link",
    color: "#5865f2",
    label: (e) => `${e.userName} created an invite`,
    filter: "all",
  },
  member_ban: {
    icon: "ban",
    color: "#ef4444",
    label: (e) => `${e.userName} banned ${e.targetName}`,
    filter: "moderation",
  },
  member_kick: {
    icon: "exit",
    color: "#f97316",
    label: (e) => `${e.userName} kicked ${e.targetName}`,
    filter: "moderation",
  },
};

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function ActivityItem({
  entry,
  isDark,
  index,
}: {
  entry: ActivityEntry;
  isDark: boolean;
  index: number;
}) {
  const config = ACTIVITY_CONFIG[entry.type];

  return (
    <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
      <View
        className={`
          flex-row px-4 py-3.5
          border-b ${isDark ? "border-dark-800" : "border-gray-100"}
        `}
      >
        {/* Icon */}
        <View
          className="w-10 h-10 rounded-full items-center justify-center mt-0.5"
          style={{ backgroundColor: config.color + "20" }}
        >
          <Ionicons name={config.icon} size={18} color={config.color} />
        </View>

        {/* Content */}
        <View className="flex-1 ml-3">
          <Text
            className={`text-sm leading-5 ${
              isDark ? "text-dark-200" : "text-gray-700"
            }`}
          >
            {config.label(entry)}
          </Text>
          {entry.details && (
            <Text
              className={`text-xs mt-1 ${
                isDark ? "text-dark-400" : "text-gray-500"
              }`}
            >
              {entry.details}
            </Text>
          )}
          <Text
            className={`text-xs mt-1 ${
              isDark ? "text-dark-500" : "text-gray-400"
            }`}
          >
            {formatTimestamp(entry.timestamp)}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

export default function ServerActivityScreen() {
  const { serverId } = useLocalSearchParams<{ serverId: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "members", label: "Members" },
    { key: "channels", label: "Channels" },
    { key: "roles", label: "Roles" },
    { key: "moderation", label: "Moderation" },
  ];

  const filteredActivity = useMemo(() => {
    if (activeFilter === "all") return mockActivity;
    return mockActivity.filter(
      (entry) => ACTIVITY_CONFIG[entry.type].filter === activeFilter,
    );
  }, [activeFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-dark-900" : "bg-white"}`}
      edges={["bottom"]}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Activity",
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

      {/* Filter Tabs */}
      <View
        className={`border-b ${isDark ? "border-dark-700" : "border-gray-200"}`}
      >
        <FlatList
          horizontal
          data={filters}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setActiveFilter(item.key)}
              className={`
                px-4 py-2 mr-2 rounded-full
                ${
                  activeFilter === item.key
                    ? "bg-brand"
                    : isDark
                      ? "bg-dark-700"
                      : "bg-gray-100"
                }
              `}
            >
              <Text
                className={`
                  text-sm font-medium
                  ${
                    activeFilter === item.key
                      ? "text-white"
                      : isDark
                        ? "text-dark-200"
                        : "text-gray-700"
                  }
                `}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Activity List */}
      <FlatList
        data={filteredActivity}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ActivityItem entry={item} isDark={isDark} index={index} />
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
              name="time-outline"
              size={64}
              color={isDark ? "#4e5058" : "#d1d5db"}
            />
            <Text
              className={`mt-4 text-lg font-medium ${
                isDark ? "text-dark-300" : "text-gray-500"
              }`}
            >
              No activity
            </Text>
            <Text
              className={`mt-1 text-sm text-center px-8 ${
                isDark ? "text-dark-400" : "text-gray-400"
              }`}
            >
              {activeFilter === "all"
                ? "Server activity will appear here"
                : `No ${activeFilter} activity to show`}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
