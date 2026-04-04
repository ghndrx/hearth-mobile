import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  useColorScheme,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  ListDivider,
  SwitchItem,
  Card,
  Button,
} from "../../components/ui";
import { useGranularNotifications } from "../../lib/hooks/useGranularNotifications";
import type { UserNotificationSettings } from "../../lib/services/granularNotifications";

interface User {
  id: string;
  username: string;
  avatar?: string;
  displayName?: string;
  isOnline: boolean;
}

// Mock users - in real app this would come from your API
const mockUsers: User[] = [
  { id: "user1", username: "gaming_pro", displayName: "Alex", isOnline: true },
  { id: "user2", username: "study_buddy", displayName: "Sarah", isOnline: false },
  { id: "user3", username: "work_mate", displayName: "Mike", isOnline: true },
  { id: "user4", username: "night_owl", displayName: "Emma", isOnline: false },
  { id: "user5", username: "early_bird", displayName: "John", isOnline: true },
];

export default function UserNotificationSettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const {
    settings,
    isLoading,
    error,
    getUserSettings,
    updateUserSettings,
    muteUserTemp,
    unmuteUserPerm,
    checkUserMuted,
  } = useGranularNotifications();

  const [searchQuery, setSearchQuery] = useState("");
  const [mutedUsers, setMutedUsers] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const filteredUsers = React.useMemo(() => {
    return mockUsers.filter(user =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const loadMutedUsers = async () => {
    const muted = new Set<string>();
    for (const user of mockUsers) {
      if (await checkUserMuted(user.id)) {
        muted.add(user.id);
      }
    }
    setMutedUsers(muted);
  };

  useEffect(() => {
    loadMutedUsers();
  }, []);

  const handleMuteUser = (userId: string, username: string) => {
    Alert.alert(
      "Mute User",
      `Choose how long to mute ${username}:`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "15 minutes",
          onPress: () => muteUserForDuration(userId, 15 * 60 * 1000),
        },
        {
          text: "1 hour",
          onPress: () => muteUserForDuration(userId, 60 * 60 * 1000),
        },
        {
          text: "8 hours",
          onPress: () => muteUserForDuration(userId, 8 * 60 * 60 * 1000),
        },
        {
          text: "24 hours",
          onPress: () => muteUserForDuration(userId, 24 * 60 * 60 * 1000),
        },
        {
          text: "Until I unmute",
          onPress: () => muteUserForDuration(userId),
          style: "destructive",
        },
      ]
    );
  };

  const muteUserForDuration = async (userId: string, duration?: number) => {
    try {
      const endTime = duration ? Date.now() + duration : undefined;
      await muteUserTemp(userId, endTime);
      setMutedUsers(prev => new Set(prev).add(userId));
    } catch (err) {
      Alert.alert("Error", "Failed to mute user. Please try again.");
    }
  };

  const handleUnmuteUser = async (userId: string) => {
    try {
      await unmuteUserPerm(userId);
      setMutedUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    } catch (err) {
      Alert.alert("Error", "Failed to unmute user. Please try again.");
    }
  };

  const handleToggleUserSetting = async (
    userId: string,
    field: keyof UserNotificationSettings,
    value: boolean
  ) => {
    try {
      await updateUserSettings(userId, { [field]: value });
    } catch (err) {
      Alert.alert("Error", "Failed to update user settings. Please try again.");
    }
  };

  const getUserSettingsSync = (userId: string): UserNotificationSettings | null => {
    return settings?.users[userId] || null;
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadMutedUsers();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: "User Notifications",
            headerTitleStyle: {
              color: isDark ? "#ffffff" : "#111827",
              fontSize: 20,
              fontWeight: "bold",
            },
            headerStyle: {
              backgroundColor: isDark ? "#1e1f22" : "#ffffff",
            },
            headerLeft: () => (
              <TouchableOpacity className="ml-4" onPress={() => router.back()}>
                <Ionicons
                  name="chevron-back"
                  size={28}
                  color={isDark ? "#80848e" : "#6b7280"}
                />
              </TouchableOpacity>
            ),
          }}
        />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={isDark ? "#5865f2" : "#5865f2"} />
          <Text className={`mt-4 ${isDark ? "text-white" : "text-gray-900"}`}>
            Loading user settings...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "User Notifications",
          headerTitleStyle: {
            color: isDark ? "#ffffff" : "#111827",
            fontSize: 20,
            fontWeight: "bold",
          },
          headerStyle: {
            backgroundColor: isDark ? "#1e1f22" : "#ffffff",
          },
          headerLeft: () => (
            <TouchableOpacity className="ml-4" onPress={() => router.back()}>
              <Ionicons
                name="chevron-back"
                size={28}
                color={isDark ? "#80848e" : "#6b7280"}
              />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity className="mr-4" onPress={refresh}>
              <Ionicons
                name="refresh"
                size={24}
                color={isDark ? "#80848e" : "#6b7280"}
              />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Error Banner */}
      {error && (
        <View className="mx-4 mt-4">
          <Card className="p-4 bg-red-500/10 border-red-500/30">
            <Text className="text-red-500">{error}</Text>
          </Card>
        </View>
      )}

      {/* Search Bar */}
      <View className="mx-4 mt-4">
        <View className={`
          flex-row items-center
          p-3 rounded-xl border
          ${isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"}
        `}>
          <Ionicons
            name="search"
            size={20}
            color={isDark ? "#80848e" : "#6b7280"}
          />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search users..."
            className={`
              flex-1 ml-3 text-base
              ${isDark ? "text-white" : "text-gray-900"}
            `}
            placeholderTextColor={isDark ? "#80848e" : "#6b7280"}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons
                name="close-circle"
                size={20}
                color={isDark ? "#80848e" : "#6b7280"}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView className="flex-1" refreshControl={undefined}>
        {/* Muted Users Section */}
        {mutedUsers.size > 0 && (
          <View className="mx-4 mt-6">
            <Text className={`
              text-xs
              font-semibold
              uppercase
              mb-2
              ${isDark ? "text-dark-400" : "text-gray-500"}
            `}>
              Muted Users ({mutedUsers.size})
            </Text>

            <View className={`
              rounded-xl
              overflow-hidden
              ${isDark ? "bg-dark-800" : "bg-white"}
              border
              ${isDark ? "border-dark-700" : "border-gray-200"}
            `}>
              {Array.from(mutedUsers).map((userId, index) => {
                const user = mockUsers.find(u => u.id === userId);
                if (!user) return null;

                return (
                  <React.Fragment key={userId}>
                    {index > 0 && <ListDivider />}
                    <View className="p-4 flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1">
                        <View className={`
                          w-10 h-10 rounded-full items-center justify-center
                          ${isDark ? "bg-red-500/20" : "bg-red-100"}
                        `}>
                          <Ionicons
                            name="volume-mute"
                            size={18}
                            color="#ef4444"
                          />
                        </View>
                        <View className="ml-3 flex-1">
                          <Text className={`
                            font-medium
                            ${isDark ? "text-white" : "text-gray-900"}
                          `}>
                            {user.displayName || user.username}
                          </Text>
                          <Text className={`
                            text-sm
                            ${isDark ? "text-red-400" : "text-red-500"}
                          `}>
                            @{user.username} • Muted
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleUnmuteUser(userId)}
                        className={`
                          px-3 py-2 rounded-lg
                          ${isDark ? "bg-green-500/20" : "bg-green-100"}
                        `}
                      >
                        <Text className="text-green-600 font-medium text-sm">
                          Unmute
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        )}

        {/* All Users Section */}
        <View className="mx-4 mt-6">
          <Text className={`
            text-xs
            font-semibold
            uppercase
            mb-2
            ${isDark ? "text-dark-400" : "text-gray-500"}
          `}>
            All Users ({filteredUsers.length})
          </Text>

          {filteredUsers.length === 0 ? (
            <Card className="p-6 items-center">
              <Ionicons
                name="person-outline"
                size={48}
                color={isDark ? "#80848e" : "#9ca3af"}
              />
              <Text className={`
                text-center mt-4 font-medium
                ${isDark ? "text-white" : "text-gray-900"}
              `}>
                No Users Found
              </Text>
              <Text className={`
                text-center mt-2 text-sm
                ${isDark ? "text-dark-400" : "text-gray-500"}
              `}>
                Try adjusting your search terms
              </Text>
            </Card>
          ) : (
            <View className={`
              rounded-xl
              overflow-hidden
              ${isDark ? "bg-dark-800" : "bg-white"}
              border
              ${isDark ? "border-dark-700" : "border-gray-200"}
            `}>
              {filteredUsers.map((user, index) => {
                const isMuted = mutedUsers.has(user.id);
                const userSettings = getUserSettingsSync(user.id);

                return (
                  <React.Fragment key={user.id}>
                    {index > 0 && <ListDivider />}
                    <View className="p-4">
                      {/* User Header */}
                      <View className="flex-row items-center justify-between mb-3">
                        <View className="flex-row items-center flex-1">
                          <View className={`
                            w-10 h-10 rounded-full items-center justify-center relative
                            ${isDark ? "bg-indigo-500/20" : "bg-indigo-100"}
                          `}>
                            <Text className="text-indigo-600 font-semibold text-lg">
                              {(user.displayName || user.username)[0].toUpperCase()}
                            </Text>
                            {user.isOnline && (
                              <View className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                            )}
                          </View>
                          <View className="ml-3 flex-1">
                            <Text className={`
                              font-medium
                              ${isDark ? "text-white" : "text-gray-900"}
                            `}>
                              {user.displayName || user.username}
                            </Text>
                            <Text className={`
                              text-sm
                              ${isDark ? "text-dark-400" : "text-gray-500"}
                            `}>
                              @{user.username}
                            </Text>
                          </View>
                        </View>

                        {isMuted ? (
                          <TouchableOpacity
                            onPress={() => handleUnmuteUser(user.id)}
                            className={`
                              px-3 py-2 rounded-lg
                              ${isDark ? "bg-green-500/20" : "bg-green-100"}
                            `}
                          >
                            <Text className="text-green-600 font-medium text-sm">
                              Unmute
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            onPress={() => handleMuteUser(user.id, user.username)}
                            className={`
                              px-3 py-2 rounded-lg
                              ${isDark ? "bg-gray-500/20" : "bg-gray-100"}
                            `}
                          >
                            <Text className={`
                              font-medium text-sm
                              ${isDark ? "text-gray-300" : "text-gray-600"}
                            `}>
                              Mute
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* User Settings (when not muted) */}
                      {!isMuted && (
                        <View className={`
                          rounded-lg overflow-hidden
                          ${isDark ? "bg-dark-700" : "bg-gray-50"}
                        `}>
                          <SwitchItem
                            title="Allow DMs"
                            subtitle="Receive direct messages"
                            value={userSettings?.allowDMs !== false}
                            onValueChange={(value) =>
                              handleToggleUserSetting(user.id, 'allowDMs', value)
                            }
                          />
                          <ListDivider />
                          <SwitchItem
                            title="Allow Mentions"
                            subtitle="Get notified when mentioned"
                            value={userSettings?.allowMentions !== false}
                            onValueChange={(value) =>
                              handleToggleUserSetting(user.id, 'allowMentions', value)
                            }
                          />
                        </View>
                      )}
                    </View>
                  </React.Fragment>
                );
              })}
            </View>
          )}
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}