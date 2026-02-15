import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  useColorScheme,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, Button } from "../../components/ui";
import type { ServerInvite } from "../../lib/types";

const mockInvites: ServerInvite[] = [
  {
    id: "inv1",
    server: {
      id: "s1",
      name: "Gaming Squad",
      icon: undefined,
      memberCount: 156,
      description: "A community for gamers who love to play together",
    },
    inviter: {
      id: "u1",
      username: "sarahj",
      displayName: "Sarah Johnson",
      email: "sarah@example.com",
    },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "inv2",
    server: {
      id: "s2",
      name: "Study Group",
      icon: undefined,
      memberCount: 42,
      description: "Help each other learn and grow",
    },
    inviter: {
      id: "u2",
      username: "mchen",
      displayName: "Michael Chen",
      email: "michael@example.com",
    },
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "inv3",
    server: {
      id: "s3",
      name: "Music Producers Hub",
      icon: undefined,
      memberCount: 2341,
      description: "Share your beats, get feedback, and collaborate with fellow producers",
    },
    inviter: {
      id: "u3",
      username: "djbeats",
      displayName: "DJ Beats",
      email: "dj@example.com",
    },
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatExpiresIn(dateString: string): string | null {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  
  if (diffMs <= 0) return "Expired";
  
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `Expires in ${diffMins}m`;
  if (diffHours < 24) return `Expires in ${diffHours}h`;
  return `Expires in ${diffDays}d`;
}

function formatMemberCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return count.toString();
}

function InviteItem({
  invite,
  isDark,
  onAccept,
  onDecline,
  loading,
}: {
  invite: ServerInvite;
  isDark: boolean;
  onAccept: () => void;
  onDecline: () => void;
  loading?: boolean;
}) {
  const expiresText = invite.expiresAt ? formatExpiresIn(invite.expiresAt) : null;
  const isExpired = expiresText === "Expired";

  return (
    <View
      className={`
        mx-4 my-2 rounded-xl p-4
        ${isDark ? "bg-dark-800" : "bg-white"}
        ${isExpired ? "opacity-60" : ""}
      `}
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.3 : 0.1,
        shadowRadius: 3,
        elevation: 2,
      }}
    >
      {/* Server Info */}
      <View className="flex-row items-center">
        <Avatar
          uri={invite.server.icon}
          name={invite.server.name}
          size="lg"
        />
        <View className="flex-1 ml-3">
          <Text
            className={`text-lg font-bold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
            numberOfLines={1}
          >
            {invite.server.name}
          </Text>
          <View className="flex-row items-center mt-0.5">
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />
              <Text
                className={`text-sm ${isDark ? "text-dark-300" : "text-gray-600"}`}
              >
                {formatMemberCount(invite.server.memberCount)} members
              </Text>
            </View>
            {expiresText && (
              <Text
                className={`text-sm ml-3 ${
                  isExpired
                    ? "text-red-500"
                    : isDark
                      ? "text-dark-400"
                      : "text-gray-500"
                }`}
              >
                • {expiresText}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Description */}
      {invite.server.description && (
        <Text
          className={`mt-3 text-sm ${isDark ? "text-dark-300" : "text-gray-600"}`}
          numberOfLines={2}
        >
          {invite.server.description}
        </Text>
      )}

      {/* Inviter */}
      <View className="flex-row items-center mt-3 pt-3 border-t border-dark-700/30">
        <Ionicons
          name="person-outline"
          size={14}
          color={isDark ? "#80848e" : "#9ca3af"}
        />
        <Text
          className={`ml-1.5 text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}
        >
          Invited by{" "}
          <Text className={`font-medium ${isDark ? "text-dark-200" : "text-gray-700"}`}>
            {invite.inviter.displayName}
          </Text>
          {" • "}
          {formatTimeAgo(invite.createdAt)}
        </Text>
      </View>

      {/* Actions */}
      <View className="flex-row mt-4 space-x-3">
        <TouchableOpacity
          onPress={onDecline}
          disabled={loading || isExpired}
          className={`
            flex-1 py-2.5 rounded-lg items-center justify-center
            ${isDark ? "bg-dark-700" : "bg-gray-100"}
          `}
        >
          <Text
            className={`font-semibold ${
              isDark ? "text-dark-200" : "text-gray-700"
            }`}
          >
            Decline
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onAccept}
          disabled={loading || isExpired}
          className={`
            flex-1 py-2.5 rounded-lg items-center justify-center
            ${isExpired ? "bg-dark-600" : "bg-brand"}
          `}
        >
          <Text className="font-semibold text-white">
            {loading ? "Joining..." : isExpired ? "Expired" : "Accept"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function InvitesScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [refreshing, setRefreshing] = useState(false);
  const [invites, setInvites] = useState<ServerInvite[]>(mockInvites);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate API refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  const handleAccept = useCallback((inviteId: string) => {
    const invite = invites.find((i) => i.id === inviteId);
    if (!invite) return;

    setLoadingIds((prev) => new Set(prev).add(inviteId));

    // Simulate API call
    setTimeout(() => {
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(inviteId);
        return next;
      });
      
      // Navigate to the server
      router.push(`/server/${invite.server.id}`);
    }, 1000);
  }, [invites]);

  const handleDecline = useCallback((inviteId: string) => {
    const invite = invites.find((i) => i.id === inviteId);
    if (!invite) return;

    Alert.alert(
      "Decline Invite",
      `Are you sure you want to decline the invite to ${invite.server.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: () => {
            setInvites((prev) => prev.filter((i) => i.id !== inviteId));
          },
        },
      ]
    );
  }, [invites]);

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Server Invites",
          headerTitleStyle: {
            color: isDark ? "#ffffff" : "#111827",
            fontSize: 20,
            fontWeight: "bold",
          },
          headerStyle: {
            backgroundColor: isDark ? "#1e1f22" : "#ffffff",
          },
        }}
      />

      {/* Header info */}
      {invites.length > 0 && (
        <View
          className={`px-4 py-3 border-b ${
            isDark ? "border-dark-800" : "border-gray-200"
          }`}
        >
          <Text className={`text-sm ${isDark ? "text-dark-300" : "text-gray-600"}`}>
            You have {invites.length} pending invite{invites.length !== 1 ? "s" : ""}
          </Text>
        </View>
      )}

      <FlatList
        data={invites}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <InviteItem
            invite={item}
            isDark={isDark}
            onAccept={() => handleAccept(item.id)}
            onDecline={() => handleDecline(item.id)}
            loading={loadingIds.has(item.id)}
          />
        )}
        contentContainerStyle={{ paddingVertical: 8, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? "#5865f2" : "#4f46e5"}
          />
        }
        ListEmptyComponent={() => (
          <View className="flex-1 items-center justify-center py-20">
            <View
              className={`
                w-20 h-20 rounded-full items-center justify-center mb-4
                ${isDark ? "bg-dark-800" : "bg-gray-100"}
              `}
            >
              <Ionicons
                name="mail-open-outline"
                size={40}
                color={isDark ? "#4e5058" : "#9ca3af"}
              />
            </View>
            <Text
              className={`text-xl font-bold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              No pending invites
            </Text>
            <Text
              className={`mt-2 text-sm text-center px-8 ${
                isDark ? "text-dark-400" : "text-gray-500"
              }`}
            >
              When someone invites you to a server, it will appear here
            </Text>
            <Button
              title="Browse Public Servers"
              variant="secondary"
              size="sm"
              className="mt-6"
              onPress={() => {}}
              leftIcon={
                <Ionicons
                  name="compass-outline"
                  size={16}
                  color={isDark ? "#b5bac1" : "#4b5563"}
                />
              }
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
}
