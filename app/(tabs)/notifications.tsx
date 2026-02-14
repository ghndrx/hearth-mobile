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
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, Badge } from "../../components/ui";

interface Notification {
  id: string;
  type: "message" | "mention" | "friend" | "system";
  title: string;
  message: string;
  timestamp: string;
  avatar?: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "mention",
    title: "Sarah Johnson",
    message: "mentioned you in #general",
    timestamp: "5m ago",
    read: false,
  },
  {
    id: "2",
    type: "message",
    title: "Design Team",
    message: "Alex shared 3 new files",
    timestamp: "15m ago",
    read: false,
  },
  {
    id: "3",
    type: "friend",
    title: "Michael Chen",
    message: "sent you a friend request",
    timestamp: "1h ago",
    read: true,
  },
  {
    id: "4",
    type: "system",
    title: "Hearth",
    message: "Your account verification is complete",
    timestamp: "2h ago",
    read: true,
  },
  {
    id: "5",
    type: "mention",
    title: "Gaming Squad",
    message: "Tom mentioned @everyone",
    timestamp: "3h ago",
    read: false,
  },
  {
    id: "6",
    type: "message",
    title: "Emily Davis",
    message: "replied to your message",
    timestamp: "Yesterday",
    read: true,
  },
  {
    id: "7",
    type: "system",
    title: "Hearth",
    message: "New features are available! Check them out.",
    timestamp: "2 days ago",
    read: true,
  },
];

function getNotificationIcon(type: Notification["type"], isDark: boolean) {
  const iconColor = isDark ? "#80848e" : "#6b7280";
  switch (type) {
    case "mention":
      return <Ionicons name="at" size={24} color="#5865f2" />;
    case "message":
      return <Ionicons name="chatbubble" size={24} color="#22c55e" />;
    case "friend":
      return <Ionicons name="person-add" size={24} color="#eab308" />;
    case "system":
      return <Ionicons name="information-circle" size={24} color={iconColor} />;
    default:
      return <Ionicons name="notifications" size={24} color={iconColor} />;
  }
}

function NotificationItem({
  notification,
  isDark,
}: {
  notification: Notification;
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
        ${!notification.read && isDark ? "bg-dark-800/50" : ""}
        ${!notification.read && !isDark ? "bg-blue-50/50" : ""}
      `}
    >
      <View
        className={`
          w-12 
          h-12 
          rounded-full 
          items-center 
          justify-center
          ${notification.avatar ? "" : isDark ? "bg-dark-700" : "bg-gray-100"}
        `}
      >
        {notification.avatar ? (
          <Avatar
            uri={notification.avatar}
            name={notification.title}
            size="md"
          />
        ) : (
          getNotificationIcon(notification.type, isDark)
        )}
      </View>
      <View className="flex-1 ml-3">
        <View className="flex-row items-center">
          <Text
            className={`text-base font-semibold ${
              !notification.read
                ? isDark
                  ? "text-white"
                  : "text-gray-900"
                : isDark
                  ? "text-dark-200"
                  : "text-gray-700"
            }`}
          >
            {notification.title}
          </Text>
          {!notification.read && (
            <View className="w-2 h-2 rounded-full bg-brand ml-2" />
          )}
        </View>
        <Text
          className={`text-sm mt-0.5 ${
            isDark ? "text-dark-400" : "text-gray-500"
          }`}
        >
          {notification.message}
        </Text>
        <Text
          className={`text-xs mt-1 ${
            isDark ? "text-dark-500" : "text-gray-400"
          }`}
        >
          {notification.timestamp}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={isDark ? "#4e5058" : "#d1d5db"}
      />
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-white"}`}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Notifications",
          headerTitleStyle: {
            color: isDark ? "#ffffff" : "#111827",
            fontSize: 20,
            fontWeight: "bold",
          },
          headerStyle: {
            backgroundColor: isDark ? "#1e1f22" : "#ffffff",
          },
          headerRight: () =>
            unreadCount > 0 ? (
              <TouchableOpacity onPress={markAllAsRead} className="mr-4">
                <Text className="text-brand text-sm font-medium">
                  Mark all read
                </Text>
              </TouchableOpacity>
            ) : null,
        }}
      />

      {unreadCount > 0 && (
        <View
          className={`
            mx-4 
            mt-4 
            mb-2 
            flex-row 
            items-center 
            justify-between
          `}
        >
          <Text
            className={`text-sm font-medium ${
              isDark ? "text-dark-300" : "text-gray-600"
            }`}
          >
            You have {unreadCount} unread notification
            {unreadCount !== 1 ? "s" : ""}
          </Text>
        </View>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem notification={item} isDark={isDark} />
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
              name="notifications-off-outline"
              size={64}
              color={isDark ? "#4e5058" : "#d1d5db"}
            />
            <Text
              className={`mt-4 text-lg font-medium ${
                isDark ? "text-dark-300" : "text-gray-500"
              }`}
            >
              No notifications
            </Text>
            <Text
              className={`mt-1 text-sm ${
                isDark ? "text-dark-400" : "text-gray-400"
              }`}
            >
              You're all caught up!
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
