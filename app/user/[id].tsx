import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Avatar, Badge, Button, Card } from "../../components/ui";

type UserStatus = "online" | "idle" | "dnd" | "offline";

interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  banner?: string;
  bio?: string;
  status: UserStatus;
  customStatus?: string;
  joinedAt: string;
  mutualServers: { id: string; name: string }[];
  mutualFriends: number;
  isFriend: boolean;
  isBlocked: boolean;
  roles?: { name: string; color: string }[];
}

const MOCK_USERS: Record<string, UserProfile> = {
  "1": {
    id: "1",
    username: "sarahj",
    displayName: "Sarah Johnson",
    bio: "Full-stack developer. Love building cool stuff with React Native and TypeScript.",
    status: "online",
    customStatus: "Working on a new project",
    joinedAt: "2023-06-15",
    mutualServers: [
      { id: "s1", name: "Developer Hub" },
      { id: "s2", name: "Gaming Zone" },
      { id: "s3", name: "Design Team" },
    ],
    mutualFriends: 12,
    isFriend: true,
    isBlocked: false,
    roles: [
      { name: "Admin", color: "#ef4444" },
      { name: "Developer", color: "#3b82f6" },
    ],
  },
  "2": {
    id: "2",
    username: "mchen",
    displayName: "Michael Chen",
    bio: "Music producer & gamer. Always down for a jam session.",
    status: "idle",
    joinedAt: "2023-09-01",
    mutualServers: [
      { id: "s1", name: "Music Lounge" },
      { id: "s2", name: "Gaming Zone" },
    ],
    mutualFriends: 8,
    isFriend: true,
    isBlocked: false,
    roles: [{ name: "Moderator", color: "#22c55e" }],
  },
  "3": {
    id: "3",
    username: "emilyd",
    displayName: "Emily Davis",
    bio: "UX Designer crafting beautiful experiences.",
    status: "dnd",
    customStatus: "In a meeting",
    joinedAt: "2024-01-10",
    mutualServers: [{ id: "s1", name: "Design Team" }],
    mutualFriends: 5,
    isFriend: false,
    isBlocked: false,
  },
};

const statusColors: Record<UserStatus, string> = {
  online: "#22c55e",
  idle: "#f59e0b",
  dnd: "#ef4444",
  offline: "#80848e",
};

const statusLabels: Record<UserStatus, string> = {
  online: "Online",
  idle: "Idle",
  dnd: "Do Not Disturb",
  offline: "Offline",
};

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const defaultUser: UserProfile = {
    id: id || "0",
    username: "unknown",
    displayName: "Unknown User",
    status: "offline",
    joinedAt: new Date().toISOString(),
    mutualServers: [],
    mutualFriends: 0,
    isFriend: false,
    isBlocked: false,
  };

  const [user, setUser] = useState<UserProfile>(
    MOCK_USERS[id || ""] || defaultUser,
  );

  const handleSendMessage = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/chat/${user.id}`);
  }, [user.id]);

  const handleToggleFriend = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (user.isFriend) {
      Alert.alert(
        "Remove Friend",
        `Are you sure you want to remove ${user.displayName} from your friends?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => setUser((prev) => ({ ...prev, isFriend: false })),
          },
        ],
      );
    } else {
      setUser((prev) => ({ ...prev, isFriend: true }));
    }
  }, [user]);

  const handleBlock = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      user.isBlocked ? "Unblock User" : "Block User",
      user.isBlocked
        ? `Unblock ${user.displayName}?`
        : `Block ${user.displayName}? They won't be able to message you or see your status.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: user.isBlocked ? "Unblock" : "Block",
          style: "destructive",
          onPress: () =>
            setUser((prev) => ({ ...prev, isBlocked: !prev.isBlocked })),
        },
      ],
    );
  }, [user]);

  const handleReport = useCallback(() => {
    Alert.alert(
      "Report User",
      `Report ${user.displayName} for violating community guidelines?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Report",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Report Submitted", "Thank you for your report.");
          },
        },
      ],
    );
  }, [user]);

  const formatJoinDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  };

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}
      edges={["bottom"]}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "",
          headerTransparent: true,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              className={`
                ml-2 w-10 h-10 rounded-full items-center justify-center
                ${isDark ? "bg-black/40" : "bg-white/80"}
              `}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={isDark ? "#ffffff" : "#111827"}
              />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={() =>
                Alert.alert("Options", undefined, [
                  {
                    text: user.isBlocked ? "Unblock" : "Block",
                    onPress: handleBlock,
                    style: "destructive",
                  },
                  { text: "Report", onPress: handleReport, style: "destructive" },
                  { text: "Cancel", style: "cancel" },
                ])
              }
              className={`
                mr-4 w-10 h-10 rounded-full items-center justify-center
                ${isDark ? "bg-black/40" : "bg-white/80"}
              `}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={24}
                color={isDark ? "#ffffff" : "#111827"}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View
          className="h-36"
          style={{
            backgroundColor: statusColors[user.status] + "40",
          }}
        />

        {/* Profile Info */}
        <View className="px-4 -mt-14">
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <View className="flex-row items-end justify-between">
              <View
                className={`
                  rounded-full p-1
                  ${isDark ? "bg-dark-900" : "bg-gray-50"}
                `}
              >
                <Avatar
                  uri={user.avatar}
                  name={user.displayName}
                  size="xl"
                  status={user.status}
                  showStatus
                />
              </View>

              <View className="flex-row items-center space-x-2 mb-2">
                {!user.isBlocked && (
                  <>
                    <TouchableOpacity
                      onPress={handleSendMessage}
                      className={`
                        w-10 h-10 rounded-full items-center justify-center
                        ${isDark ? "bg-dark-700" : "bg-gray-200"}
                      `}
                    >
                      <Ionicons
                        name="chatbubble"
                        size={18}
                        color={isDark ? "#b5bac1" : "#6b7280"}
                      />
                    </TouchableOpacity>
                    <Button
                      title={user.isFriend ? "Friends" : "Add Friend"}
                      variant={user.isFriend ? "secondary" : "primary"}
                      size="sm"
                      onPress={handleToggleFriend}
                      leftIcon={
                        <Ionicons
                          name={user.isFriend ? "checkmark" : "person-add"}
                          size={16}
                          color={user.isFriend ? (isDark ? "#e0e0e0" : "#374151") : "white"}
                        />
                      }
                    />
                  </>
                )}
              </View>
            </View>
          </Animated.View>

          {/* Name & Username */}
          <Animated.View entering={FadeInDown.delay(150).duration(400)} className="mt-3">
            <Text
              className={`text-2xl font-bold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              {user.displayName}
            </Text>
            <Text
              className={`text-base ${isDark ? "text-dark-400" : "text-gray-500"}`}
            >
              @{user.username}
            </Text>
          </Animated.View>

          {/* Status */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(400)}
            className="flex-row items-center mt-2"
          >
            <View
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: statusColors[user.status] }}
            />
            <Text
              className={`text-sm ${isDark ? "text-dark-300" : "text-gray-600"}`}
            >
              {statusLabels[user.status]}
            </Text>
            {user.customStatus && (
              <>
                <Text
                  className={`text-sm mx-2 ${isDark ? "text-dark-500" : "text-gray-400"}`}
                >
                  —
                </Text>
                <Text
                  className={`text-sm ${isDark ? "text-dark-300" : "text-gray-600"}`}
                >
                  {user.customStatus}
                </Text>
              </>
            )}
          </Animated.View>

          {/* Roles */}
          {user.roles && user.roles.length > 0 && (
            <Animated.View
              entering={FadeInDown.delay(250).duration(400)}
              className="flex-row flex-wrap mt-3"
              style={{ gap: 6 }}
            >
              {user.roles.map((role) => (
                <View
                  key={role.name}
                  className={`
                    flex-row items-center px-2.5 py-1 rounded-full
                    ${isDark ? "bg-dark-800" : "bg-gray-100"}
                  `}
                >
                  <View
                    className="w-3 h-3 rounded-full mr-1.5"
                    style={{ backgroundColor: role.color }}
                  />
                  <Text
                    className={`text-xs font-medium ${
                      isDark ? "text-dark-200" : "text-gray-700"
                    }`}
                  >
                    {role.name}
                  </Text>
                </View>
              ))}
            </Animated.View>
          )}

          {/* Bio */}
          {user.bio && (
            <Animated.View entering={FadeInDown.delay(300).duration(400)}>
              <View
                className={`
                  mt-4 p-4 rounded-xl
                  ${isDark ? "bg-dark-800" : "bg-white"}
                  border ${isDark ? "border-dark-700" : "border-gray-200"}
                `}
              >
                <Text
                  className={`text-xs font-semibold uppercase mb-2 ${
                    isDark ? "text-dark-400" : "text-gray-500"
                  }`}
                >
                  About Me
                </Text>
                <Text
                  className={`text-sm leading-5 ${
                    isDark ? "text-dark-200" : "text-gray-700"
                  }`}
                >
                  {user.bio}
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Member Since */}
          <Animated.View entering={FadeInDown.delay(350).duration(400)}>
            <View
              className={`
                mt-4 p-4 rounded-xl
                ${isDark ? "bg-dark-800" : "bg-white"}
                border ${isDark ? "border-dark-700" : "border-gray-200"}
              `}
            >
              <Text
                className={`text-xs font-semibold uppercase mb-2 ${
                  isDark ? "text-dark-400" : "text-gray-500"
                }`}
              >
                Member Since
              </Text>
              <View className="flex-row items-center">
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={isDark ? "#80848e" : "#6b7280"}
                />
                <Text
                  className={`ml-2 text-sm ${
                    isDark ? "text-dark-200" : "text-gray-700"
                  }`}
                >
                  {formatJoinDate(user.joinedAt)}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Mutual Servers */}
          {user.mutualServers.length > 0 && (
            <Animated.View entering={FadeInDown.delay(400).duration(400)}>
              <View
                className={`
                  mt-4 p-4 rounded-xl
                  ${isDark ? "bg-dark-800" : "bg-white"}
                  border ${isDark ? "border-dark-700" : "border-gray-200"}
                `}
              >
                <Text
                  className={`text-xs font-semibold uppercase mb-3 ${
                    isDark ? "text-dark-400" : "text-gray-500"
                  }`}
                >
                  Mutual Servers — {user.mutualServers.length}
                </Text>
                {user.mutualServers.map((server) => (
                  <TouchableOpacity
                    key={server.id}
                    onPress={() => router.push(`/(tabs)/server/${server.id}`)}
                    className="flex-row items-center py-2"
                  >
                    <Avatar name={server.name} size={32} />
                    <Text
                      className={`ml-3 text-sm font-medium ${
                        isDark ? "text-dark-200" : "text-gray-700"
                      }`}
                    >
                      {server.name}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={isDark ? "#4e5058" : "#d1d5db"}
                      style={{ marginLeft: "auto" }}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Mutual Friends */}
          {user.mutualFriends > 0 && (
            <Animated.View entering={FadeInDown.delay(450).duration(400)}>
              <View
                className={`
                  mt-4 p-4 rounded-xl
                  ${isDark ? "bg-dark-800" : "bg-white"}
                  border ${isDark ? "border-dark-700" : "border-gray-200"}
                `}
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name="people"
                    size={18}
                    color={isDark ? "#80848e" : "#6b7280"}
                  />
                  <Text
                    className={`ml-2 text-sm ${
                      isDark ? "text-dark-200" : "text-gray-700"
                    }`}
                  >
                    {user.mutualFriends} mutual friend
                    {user.mutualFriends !== 1 ? "s" : ""}
                  </Text>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Bottom spacer */}
          <View className="h-8" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
