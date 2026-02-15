import React, { useState, useEffect, useCallback } from "react";
import { View, Text, useColorScheme } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { MemberListScreen } from "../../../components/server/MemberListScreen";
import { LoadingSpinner } from "../../../components/ui";
import { api } from "../../../lib/services/api";
import type { Server, ServerMember } from "../../../lib/types";

// Mock data for development - replace with actual API calls
const mockMembers: ServerMember[] = [
  {
    id: "1",
    user: {
      id: "u1",
      username: "serverowner",
      displayName: "Server Owner",
      email: "owner@example.com",
      status: "online",
      avatar: undefined,
      bio: "I created this server!",
    },
    serverId: "s1",
    roles: [
      { id: "r1", name: "Owner", color: "#f59e0b", position: 100, permissions: ["*"] },
      { id: "r2", name: "Admin", color: "#ef4444", position: 90, permissions: ["admin"] },
    ],
    joinedAt: "2024-01-01T00:00:00Z",
    isOwner: true,
  },
  {
    id: "2",
    user: {
      id: "u2",
      username: "moderator",
      displayName: "Mod Master",
      email: "mod@example.com",
      status: "online",
      avatar: undefined,
    },
    serverId: "s1",
    roles: [
      { id: "r3", name: "Moderator", color: "#22c55e", position: 50, permissions: ["mod"] },
    ],
    joinedAt: "2024-01-15T00:00:00Z",
  },
  {
    id: "3",
    user: {
      id: "u3",
      username: "vipuser",
      displayName: "VIP User",
      email: "vip@example.com",
      status: "idle",
      avatar: undefined,
    },
    serverId: "s1",
    nickname: "The VIP",
    roles: [
      { id: "r4", name: "VIP", color: "#a855f7", position: 30, permissions: [] },
      { id: "r5", name: "Member", color: "#6b7280", position: 1, permissions: [], isDefault: true },
    ],
    joinedAt: "2024-02-01T00:00:00Z",
  },
  {
    id: "4",
    user: {
      id: "u4",
      username: "member1",
      displayName: "Regular Member",
      email: "member1@example.com",
      status: "offline",
      avatar: undefined,
    },
    serverId: "s1",
    roles: [
      { id: "r5", name: "Member", color: "#6b7280", position: 1, permissions: [], isDefault: true },
    ],
    joinedAt: "2024-02-10T00:00:00Z",
  },
  {
    id: "5",
    user: {
      id: "u5",
      username: "member2",
      displayName: "Another Member",
      email: "member2@example.com",
      status: "dnd",
      avatar: undefined,
    },
    serverId: "s1",
    roles: [
      { id: "r5", name: "Member", color: "#6b7280", position: 1, permissions: [], isDefault: true },
    ],
    joinedAt: "2024-02-12T00:00:00Z",
  },
];

const mockServer: Server = {
  id: "s1",
  name: "Test Server",
  description: "A test server for development",
  ownerId: "u1",
  memberCount: 5,
  unreadCount: 0,
  isOnline: true,
  createdAt: "2024-01-01T00:00:00Z",
};

export default function ServerMembersPage() {
  const { serverId } = useLocalSearchParams<{ serverId: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [server, setServer] = useState<Server | null>(null);
  const [members, setMembers] = useState<ServerMember[]>([]);
  
  // TODO: Get from auth context
  const currentUserId = "u2"; // Mock current user as moderator
  const canKick = true; // Would check permissions
  const canBan = true; // Would check permissions

  const fetchData = useCallback(async () => {
    try {
      // TODO: Replace with actual API calls
      // const serverRes = await api.get<Server>(`/servers/${serverId}`, true);
      // const membersRes = await api.get<ServerMember[]>(`/servers/${serverId}/members`, true);
      
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      setServer(mockServer);
      setMembers(mockMembers);
      setError(null);
    } catch (err) {
      setError("Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    await fetchData();
  };

  const handleKick = async (member: ServerMember) => {
    // TODO: Implement actual kick API call
    // await api.post(`/servers/${serverId}/members/${member.id}/kick`, {}, true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    // Remove from local state
    setMembers((prev) => prev.filter((m) => m.id !== member.id));
  };

  const handleBan = async (member: ServerMember) => {
    // TODO: Implement actual ban API call
    // await api.post(`/servers/${serverId}/members/${member.id}/ban`, {}, true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    // Remove from local state
    setMembers((prev) => prev.filter((m) => m.id !== member.id));
  };

  if (loading) {
    return (
      <View
        className={`flex-1 items-center justify-center ${
          isDark ? "bg-dark-900" : "bg-gray-50"
        }`}
      >
        <LoadingSpinner size="large" />
      </View>
    );
  }

  if (error || !server) {
    return (
      <View
        className={`flex-1 items-center justify-center px-6 ${
          isDark ? "bg-dark-900" : "bg-gray-50"
        }`}
      >
        <Text
          className={`text-lg font-medium ${
            isDark ? "text-dark-300" : "text-gray-600"
          }`}
        >
          {error || "Server not found"}
        </Text>
      </View>
    );
  }

  return (
    <MemberListScreen
      server={server}
      members={members}
      currentUserId={currentUserId}
      canKick={canKick}
      canBan={canBan}
      onKick={handleKick}
      onBan={handleBan}
      onRefresh={handleRefresh}
    />
  );
}
