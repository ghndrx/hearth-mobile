import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  RefreshControl,
  Modal,
  Pressable,
  Alert as RNAlert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, SearchInput } from "../ui";
import type { ServerMember, Role, Server } from "../../lib/types";

// ============================================================================
// Types
// ============================================================================

interface MemberListScreenProps {
  server: Server;
  members: ServerMember[];
  currentUserId: string;
  canKick?: boolean;
  canBan?: boolean;
  onKick?: (member: ServerMember) => Promise<void>;
  onBan?: (member: ServerMember) => Promise<void>;
  onRefresh?: () => Promise<void>;
  onMemberPress?: (member: ServerMember) => void;
}

interface MemberItemProps {
  member: ServerMember;
  isDark: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

interface RoleBadgeProps {
  role: Role;
  size?: "sm" | "md";
}

interface ActionSheetProps {
  visible: boolean;
  member: ServerMember | null;
  canKick: boolean;
  canBan: boolean;
  onKick: () => void;
  onBan: () => void;
  onViewProfile: () => void;
  onClose: () => void;
  isDark: boolean;
}

// ============================================================================
// Role Badge Component
// ============================================================================

function RoleBadge({ role, size = "sm" }: RoleBadgeProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Use role color or default
  const roleColor = role.color || (isDark ? "#80848e" : "#6b7280");

  return (
    <View
      className={`
        rounded-full 
        flex-row 
        items-center
        mr-1
        mb-1
        ${size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1"}
      `}
      style={{
        backgroundColor: `${roleColor}20`,
      }}
    >
      <View
        className="w-2 h-2 rounded-full mr-1"
        style={{ backgroundColor: roleColor }}
      />
      <Text
        className={`font-medium ${size === "sm" ? "text-xs" : "text-sm"}`}
        style={{ color: roleColor }}
      >
        {role.name}
      </Text>
    </View>
  );
}

// ============================================================================
// Member Item Component
// ============================================================================

function MemberItem({ member, isDark, onPress, onLongPress }: MemberItemProps) {
  const displayName =
    member.nickname || member.user.displayName || member.user.username;
  const status = member.user.status || "offline";

  // Get top roles (limit to 3 visible)
  const displayRoles = member.roles
    .filter((r) => !r.isDefault)
    .sort((a, b) => b.position - a.position)
    .slice(0, 3);

  const remainingRoles = member.roles.filter((r) => !r.isDefault).length - 3;

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      delayLongPress={300}
      className={`
        flex-row 
        items-center 
        px-4 
        py-3
        ${isDark ? "active:bg-dark-700" : "active:bg-gray-100"}
      `}
    >
      {/* Avatar */}
      <Avatar
        uri={member.user.avatar}
        name={displayName}
        size="md"
        status={status}
        showStatus
      />

      {/* Member Info */}
      <View className="flex-1 ml-3">
        <View className="flex-row items-center">
          <Text
            className={`font-semibold text-base ${
              isDark ? "text-white" : "text-gray-900"
            }`}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {member.isOwner && (
            <Ionicons
              name="shield"
              size={14}
              color="#f59e0b"
              style={{ marginLeft: 4 }}
            />
          )}
        </View>

        {/* Username if different from display name */}
        {member.nickname && (
          <Text
            className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            @{member.user.username}
          </Text>
        )}

        {/* Roles */}
        {displayRoles.length > 0 && (
          <View className="flex-row flex-wrap mt-1">
            {displayRoles.map((role) => (
              <RoleBadge key={role.id} role={role} size="sm" />
            ))}
            {remainingRoles > 0 && (
              <View
                className={`
                  rounded-full 
                  px-2 
                  py-0.5 
                  mr-1 
                  mb-1
                  ${isDark ? "bg-dark-700" : "bg-gray-200"}
                `}
              >
                <Text
                  className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}
                >
                  +{remainingRoles}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Chevron */}
      <Ionicons
        name="chevron-forward"
        size={20}
        color={isDark ? "#4b5563" : "#9ca3af"}
      />
    </TouchableOpacity>
  );
}

// ============================================================================
// Action Sheet Component
// ============================================================================

function ActionSheet({
  visible,
  member,
  canKick,
  canBan,
  onKick,
  onBan,
  onViewProfile,
  onClose,
  isDark,
}: ActionSheetProps) {
  if (!member) return null;

  const displayName =
    member.nickname || member.user.displayName || member.user.username;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
        <Pressable
          className={`
            rounded-t-3xl
            pb-8
            ${isDark ? "bg-dark-800" : "bg-white"}
          `}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <View className="items-center pt-3 pb-2">
            <View
              className={`w-10 h-1 rounded-full ${
                isDark ? "bg-dark-600" : "bg-gray-300"
              }`}
            />
          </View>

          {/* Header */}
          <View className="items-center px-6 py-4 border-b border-opacity-20">
            <Avatar
              uri={member.user.avatar}
              name={displayName}
              size="lg"
              status={member.user.status}
              showStatus
            />
            <Text
              className={`mt-3 text-lg font-bold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              {displayName}
            </Text>
            <Text
              className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}
            >
              @{member.user.username}
            </Text>
          </View>

          {/* Actions */}
          <View className="px-4 pt-2">
            {/* View Profile */}
            <TouchableOpacity
              onPress={onViewProfile}
              className={`
                flex-row 
                items-center 
                px-4 
                py-4
                rounded-xl
                ${isDark ? "active:bg-dark-700" : "active:bg-gray-100"}
              `}
            >
              <Ionicons
                name="person-outline"
                size={24}
                color={isDark ? "#e0e0e0" : "#374151"}
              />
              <Text
                className={`ml-4 text-base font-medium ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                View Profile
              </Text>
            </TouchableOpacity>

            {/* Kick Member */}
            {canKick && !member.isOwner && (
              <TouchableOpacity
                onPress={onKick}
                className={`
                  flex-row 
                  items-center 
                  px-4 
                  py-4
                  rounded-xl
                  ${isDark ? "active:bg-dark-700" : "active:bg-gray-100"}
                `}
              >
                <Ionicons name="exit-outline" size={24} color="#f59e0b" />
                <Text className="ml-4 text-base font-medium text-yellow-500">
                  Kick Member
                </Text>
              </TouchableOpacity>
            )}

            {/* Ban Member */}
            {canBan && !member.isOwner && (
              <TouchableOpacity
                onPress={onBan}
                className={`
                  flex-row 
                  items-center 
                  px-4 
                  py-4
                  rounded-xl
                  ${isDark ? "active:bg-dark-700" : "active:bg-gray-100"}
                `}
              >
                <Ionicons name="ban-outline" size={24} color="#ef4444" />
                <Text className="ml-4 text-base font-medium text-red-500">
                  Ban Member
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Cancel Button */}
          <View className="px-4 pt-2 pb-2">
            <TouchableOpacity
              onPress={onClose}
              className={`
                py-4
                rounded-xl
                items-center
                ${isDark ? "bg-dark-700" : "bg-gray-100"}
              `}
            >
              <Text
                className={`text-base font-semibold ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyState({
  isDark,
  isSearching,
}: {
  isDark: boolean;
  isSearching: boolean;
}) {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <Ionicons
        name={isSearching ? "search-outline" : "people-outline"}
        size={64}
        color={isDark ? "#4b5563" : "#9ca3af"}
      />
      <Text
        className={`mt-4 text-lg font-medium ${
          isDark ? "text-dark-300" : "text-gray-600"
        }`}
      >
        {isSearching ? "No members found" : "No members yet"}
      </Text>
      <Text
        className={`mt-2 text-center px-8 ${
          isDark ? "text-dark-400" : "text-gray-500"
        }`}
      >
        {isSearching
          ? "Try a different search term"
          : "Members will appear here as they join the server."}
      </Text>
    </View>
  );
}

// ============================================================================
// Role Filter Chip
// ============================================================================

interface RoleFilterProps {
  role: Role | null;
  isSelected: boolean;
  onSelect: () => void;
  isDark: boolean;
}

function RoleFilterChip({
  role,
  isSelected,
  onSelect,
  isDark,
}: RoleFilterProps) {
  const label = role ? role.name : "All";
  const color = role?.color || (isDark ? "#80848e" : "#6b7280");

  return (
    <TouchableOpacity
      onPress={onSelect}
      className={`
        px-3 
        py-1.5 
        rounded-full 
        mr-2
        flex-row
        items-center
        ${isSelected ? "bg-brand" : isDark ? "bg-dark-700" : "bg-gray-200"}
      `}
    >
      {role && (
        <View
          className="w-2 h-2 rounded-full mr-1.5"
          style={{ backgroundColor: isSelected ? "#fff" : color }}
        />
      )}
      <Text
        className={`text-sm font-medium ${
          isSelected ? "text-white" : isDark ? "text-dark-200" : "text-gray-700"
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// Main MemberListScreen Component
// ============================================================================

export function MemberListScreen({
  members,
  currentUserId,
  canKick = false,
  canBan = false,
  onKick,
  onBan,
  onRefresh,
  onMemberPress,
}: MemberListScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ServerMember | null>(
    null,
  );
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string | null>(
    null,
  );
  const [_actionLoading, setActionLoading] = useState(false);

  // Get unique roles for filtering
  const allRoles = useMemo(() => {
    const roleMap = new Map<string, Role>();
    members.forEach((member) => {
      member.roles.forEach((role) => {
        if (!role.isDefault && !roleMap.has(role.id)) {
          roleMap.set(role.id, role);
        }
      });
    });
    return Array.from(roleMap.values()).sort((a, b) => b.position - a.position);
  }, [members]);

  // Filter and sort members
  const filteredMembers = useMemo(() => {
    let result = [...members];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((member) => {
        const displayName =
          member.nickname || member.user.displayName || member.user.username;
        return (
          displayName.toLowerCase().includes(query) ||
          member.user.username.toLowerCase().includes(query)
        );
      });
    }

    // Apply role filter
    if (selectedRoleFilter) {
      result = result.filter((member) =>
        member.roles.some((role) => role.id === selectedRoleFilter),
      );
    }

    // Sort: owner first, then by highest role position, then alphabetically
    result.sort((a, b) => {
      // Owner always first
      if (a.isOwner && !b.isOwner) return -1;
      if (!a.isOwner && b.isOwner) return 1;

      // Then by highest role position
      const aMaxPos = Math.max(...a.roles.map((r) => r.position), 0);
      const bMaxPos = Math.max(...b.roles.map((r) => r.position), 0);
      if (aMaxPos !== bMaxPos) return bMaxPos - aMaxPos;

      // Then alphabetically
      const aName = a.nickname || a.user.displayName || a.user.username;
      const bName = b.nickname || b.user.displayName || b.user.username;
      return aName.localeCompare(bName);
    });

    return result;
  }, [members, searchQuery, selectedRoleFilter]);

  // Group members by status (online first)
  const groupedMembers = useMemo(() => {
    const online = filteredMembers.filter(
      (m) =>
        m.user.status &&
        m.user.status !== "offline" &&
        m.user.status !== "invisible",
    );
    const offline = filteredMembers.filter(
      (m) =>
        !m.user.status ||
        m.user.status === "offline" ||
        m.user.status === "invisible",
    );
    return { online, offline };
  }, [filteredMembers]);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const handleMemberPress = (member: ServerMember) => {
    if (onMemberPress) {
      onMemberPress(member);
    } else {
      router.push(`/profile/${member.user.id}`);
    }
  };

  const handleMemberLongPress = (member: ServerMember) => {
    // Don't show actions for self
    if (member.user.id === currentUserId) return;

    setSelectedMember(member);
    setShowActionSheet(true);
  };

  const handleKick = async () => {
    if (!selectedMember || !onKick) return;

    const displayName =
      selectedMember.nickname ||
      selectedMember.user.displayName ||
      selectedMember.user.username;

    RNAlert.alert(
      "Kick Member",
      `Are you sure you want to kick ${displayName} from the server?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Kick",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              await onKick(selectedMember);
              setShowActionSheet(false);
              setSelectedMember(null);
            } catch (error) {
              RNAlert.alert(
                "Error",
                "Failed to kick member. Please try again.",
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleBan = async () => {
    if (!selectedMember || !onBan) return;

    const displayName =
      selectedMember.nickname ||
      selectedMember.user.displayName ||
      selectedMember.user.username;

    RNAlert.alert(
      "Ban Member",
      `Are you sure you want to ban ${displayName} from the server? This action cannot be easily undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Ban",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              await onBan(selectedMember);
              setShowActionSheet(false);
              setSelectedMember(null);
            } catch (error) {
              RNAlert.alert("Error", "Failed to ban member. Please try again.");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleViewProfile = () => {
    if (!selectedMember) return;
    setShowActionSheet(false);
    handleMemberPress(selectedMember);
  };

  const handleCloseActionSheet = () => {
    setShowActionSheet(false);
    setSelectedMember(null);
  };

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}
      edges={["left", "right"]}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Members",
          headerTitleStyle: {
            color: isDark ? "#ffffff" : "#111827",
            fontSize: 18,
            fontWeight: "bold",
          },
          headerStyle: {
            backgroundColor: isDark ? "#1e1f22" : "#ffffff",
          },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              className="ml-2 p-1"
            >
              <Ionicons
                name="chevron-back"
                size={28}
                color={isDark ? "#80848e" : "#6b7280"}
              />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Search and Filter Header */}
      <View
        className={`
          px-4 
          pt-3 
          pb-2 
          border-b
          ${isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"}
        `}
      >
        {/* Search Input */}
        <SearchInput
          placeholder="Search members..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* Role Filters */}
        {allRoles.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-3"
            contentContainerStyle={{ paddingRight: 16 }}
          >
            <RoleFilterChip
              role={null}
              isSelected={selectedRoleFilter === null}
              onSelect={() => setSelectedRoleFilter(null)}
              isDark={isDark}
            />
            {allRoles.map((role) => (
              <RoleFilterChip
                key={role.id}
                role={role}
                isSelected={selectedRoleFilter === role.id}
                onSelect={() => setSelectedRoleFilter(role.id)}
                isDark={isDark}
              />
            ))}
          </ScrollView>
        )}

        {/* Member Count */}
        <Text
          className={`mt-3 text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}
        >
          {filteredMembers.length} member
          {filteredMembers.length !== 1 ? "s" : ""}
          {searchQuery || selectedRoleFilter ? " found" : ""}
        </Text>
      </View>

      {/* Member List */}
      <ScrollView
        className="flex-1"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={isDark ? "#5865f2" : "#5865f2"}
            />
          ) : undefined
        }
      >
        {filteredMembers.length === 0 ? (
          <EmptyState
            isDark={isDark}
            isSearching={!!searchQuery || !!selectedRoleFilter}
          />
        ) : (
          <>
            {/* Online Members */}
            {groupedMembers.online.length > 0 && (
              <View className="mt-2">
                <Text
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider ${
                    isDark ? "text-dark-400" : "text-gray-500"
                  }`}
                >
                  Online — {groupedMembers.online.length}
                </Text>
                {groupedMembers.online.map((member) => (
                  <MemberItem
                    key={member.id}
                    member={member}
                    isDark={isDark}
                    onPress={() => handleMemberPress(member)}
                    onLongPress={() => handleMemberLongPress(member)}
                  />
                ))}
              </View>
            )}

            {/* Offline Members */}
            {groupedMembers.offline.length > 0 && (
              <View className="mt-2">
                <Text
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider ${
                    isDark ? "text-dark-400" : "text-gray-500"
                  }`}
                >
                  Offline — {groupedMembers.offline.length}
                </Text>
                {groupedMembers.offline.map((member) => (
                  <MemberItem
                    key={member.id}
                    member={member}
                    isDark={isDark}
                    onPress={() => handleMemberPress(member)}
                    onLongPress={() => handleMemberLongPress(member)}
                  />
                ))}
              </View>
            )}
          </>
        )}

        {/* Bottom Padding */}
        <View className="h-8" />
      </ScrollView>

      {/* Action Sheet */}
      <ActionSheet
        visible={showActionSheet}
        member={selectedMember}
        canKick={canKick}
        canBan={canBan}
        onKick={handleKick}
        onBan={handleBan}
        onViewProfile={handleViewProfile}
        onClose={handleCloseActionSheet}
        isDark={isDark}
      />
    </SafeAreaView>
  );
}

// ============================================================================
// Standalone Member List (no header, for embedding)
// ============================================================================

interface MemberListProps {
  members: ServerMember[];
  currentUserId: string;
  canKick?: boolean;
  canBan?: boolean;
  onKick?: (member: ServerMember) => Promise<void>;
  onBan?: (member: ServerMember) => Promise<void>;
  onRefresh?: () => Promise<void>;
  onMemberPress?: (member: ServerMember) => void;
}

export function MemberList({
  members,
  currentUserId,
  canKick = false,
  canBan = false,
  onKick,
  onBan,
  onRefresh,
  onMemberPress,
}: MemberListProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ServerMember | null>(
    null,
  );
  const [showActionSheet, setShowActionSheet] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const handleMemberPress = (member: ServerMember) => {
    if (onMemberPress) {
      onMemberPress(member);
    } else {
      router.push(`/profile/${member.user.id}`);
    }
  };

  const handleMemberLongPress = (member: ServerMember) => {
    if (member.user.id === currentUserId) return;
    setSelectedMember(member);
    setShowActionSheet(true);
  };

  const handleKick = async () => {
    if (!selectedMember || !onKick) return;
    try {
      await onKick(selectedMember);
      setShowActionSheet(false);
      setSelectedMember(null);
    } catch (error) {
      RNAlert.alert("Error", "Failed to kick member.");
    }
  };

  const handleBan = async () => {
    if (!selectedMember || !onBan) return;
    try {
      await onBan(selectedMember);
      setShowActionSheet(false);
      setSelectedMember(null);
    } catch (error) {
      RNAlert.alert("Error", "Failed to ban member.");
    }
  };

  if (members.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <Text className={`${isDark ? "text-dark-400" : "text-gray-500"}`}>
          No members
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        className="flex-1"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#5865f2"
            />
          ) : undefined
        }
      >
        {members.map((member) => (
          <MemberItem
            key={member.id}
            member={member}
            isDark={isDark}
            onPress={() => handleMemberPress(member)}
            onLongPress={() => handleMemberLongPress(member)}
          />
        ))}
      </ScrollView>

      <ActionSheet
        visible={showActionSheet}
        member={selectedMember}
        canKick={canKick}
        canBan={canBan}
        onKick={handleKick}
        onBan={handleBan}
        onViewProfile={() => {
          setShowActionSheet(false);
          if (selectedMember) handleMemberPress(selectedMember);
        }}
        onClose={() => {
          setShowActionSheet(false);
          setSelectedMember(null);
        }}
        isDark={isDark}
      />
    </>
  );
}

export default MemberListScreen;
