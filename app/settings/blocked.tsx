import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  useColorScheme,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Avatar } from "../../components/ui/Avatar";
import { EmptyState } from "../../components/ui/EmptyState";

type BlockedUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  blockedAt: string;
};

const MOCK_BLOCKED: BlockedUser[] = [
  {
    id: "1",
    username: "spammer42",
    displayName: "Spammer",
    blockedAt: "2026-02-15T10:30:00Z",
  },
  {
    id: "2",
    username: "toxic_user",
    displayName: "Toxic User",
    blockedAt: "2026-01-20T14:22:00Z",
  },
];

export default function BlockedUsersScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>(MOCK_BLOCKED);
  const [refreshing, setRefreshing] = useState(false);

  const handleUnblock = useCallback(
    (user: BlockedUser) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert(
        "Unblock User",
        `Are you sure you want to unblock ${user.displayName}? They will be able to message you and see your activity again.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Unblock",
            style: "destructive",
            onPress: () => {
              setBlockedUsers((prev) => prev.filter((u) => u.id !== user.id));
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
            },
          },
        ]
      );
    },
    []
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setRefreshing(false);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderUser = useCallback(
    ({ item }: { item: BlockedUser }) => (
      <View
        className={`flex-row items-center px-4 py-3 ${
          isDark ? "border-dark-700" : "border-gray-100"
        } border-b`}
      >
        <Avatar
          size="md"
          name={item.displayName}
          uri={item.avatarUrl}
        />
        <View className="ml-3 flex-1">
          <Text
            className={`text-base font-semibold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            {item.displayName}
          </Text>
          <Text
            className={`text-sm ${
              isDark ? "text-dark-200" : "text-gray-500"
            }`}
          >
            @{item.username} · Blocked {formatDate(item.blockedAt)}
          </Text>
        </View>
        <Pressable
          onPress={() => handleUnblock(item)}
          className={`rounded-lg px-4 py-2 ${
            isDark ? "bg-dark-600" : "bg-gray-100"
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              isDark ? "text-dark-100" : "text-gray-700"
            }`}
          >
            Unblock
          </Text>
        </Pressable>
      </View>
    ),
    [isDark, handleUnblock]
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: "Blocked Users",
          headerStyle: {
            backgroundColor: isDark ? "#1e1f22" : "#ffffff",
          },
          headerTintColor: isDark ? "#ffffff" : "#111827",
        }}
      />
      <View className={`flex-1 ${isDark ? "bg-dark-950" : "bg-gray-50"}`}>
        <View
          className={`mx-4 mt-4 mb-2 rounded-lg p-3 ${
            isDark ? "bg-dark-700" : "bg-amber-50"
          }`}
        >
          <View className="flex-row items-start">
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={isDark ? "#f59e0b" : "#d97706"}
            />
            <Text
              className={`ml-2 flex-1 text-sm ${
                isDark ? "text-dark-200" : "text-gray-600"
              }`}
            >
              Blocked users cannot send you messages, add you as a friend, or
              see your online status.
            </Text>
          </View>
        </View>

        <FlatList
          data={blockedUsers}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <EmptyState
              icon="checkmark-circle-outline"
              title="No Blocked Users"
              description="You haven't blocked anyone. Users you block will appear here."
            />
          }
          contentContainerStyle={
            blockedUsers.length === 0 ? { flex: 1 } : undefined
          }
        />
      </View>
    </>
  );
}
