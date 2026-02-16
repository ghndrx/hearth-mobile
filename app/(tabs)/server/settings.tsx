import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  useColorScheme,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SwitchItem, Avatar, Badge, SearchInput } from "../../../components/ui";

// Types
interface ServerRole {
  id: string;
  name: string;
  color: string;
  memberCount: number;
  isDefault?: boolean;
  permissions: string[];
}

interface ServerChannel {
  id: string;
  name: string;
  type: "text" | "voice" | "announcement";
  category?: string;
  isPrivate: boolean;
  position: number;
}

interface ServerMember {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  roles: string[];
  joinedAt: string;
  isOnline: boolean;
  isOwner?: boolean;
}

interface ServerSettings {
  name: string;
  description: string;
  icon?: string;
  banner?: string;
  isPublic: boolean;
  requireVerification: boolean;
  allowInvites: boolean;
  defaultNotifications: "all" | "mentions" | "none";
}

// Mock Data
const mockRoles: ServerRole[] = [
  {
    id: "1",
    name: "@everyone",
    color: "#99aab5",
    memberCount: 1247,
    isDefault: true,
    permissions: ["SEND_MESSAGES", "READ_MESSAGES"],
  },
  {
    id: "2",
    name: "Admin",
    color: "#ed4245",
    memberCount: 3,
    permissions: ["ADMINISTRATOR"],
  },
  {
    id: "3",
    name: "Moderator",
    color: "#5865f2",
    memberCount: 12,
    permissions: ["KICK_MEMBERS", "BAN_MEMBERS", "MANAGE_MESSAGES"],
  },
  {
    id: "4",
    name: "VIP",
    color: "#f47fff",
    memberCount: 45,
    permissions: ["EMBED_LINKS", "ATTACH_FILES"],
  },
  {
    id: "5",
    name: "Booster",
    color: "#ff73fa",
    memberCount: 12,
    permissions: ["USE_EXTERNAL_EMOJI"],
  },
];

const mockChannels: ServerChannel[] = [
  {
    id: "1",
    name: "welcome",
    type: "text",
    category: "Info",
    isPrivate: false,
    position: 0,
  },
  {
    id: "2",
    name: "rules",
    type: "text",
    category: "Info",
    isPrivate: false,
    position: 1,
  },
  {
    id: "3",
    name: "announcements",
    type: "announcement",
    category: "Info",
    isPrivate: false,
    position: 2,
  },
  {
    id: "4",
    name: "general",
    type: "text",
    category: "Chat",
    isPrivate: false,
    position: 3,
  },
  {
    id: "5",
    name: "off-topic",
    type: "text",
    category: "Chat",
    isPrivate: false,
    position: 4,
  },
  {
    id: "6",
    name: "media",
    type: "text",
    category: "Chat",
    isPrivate: false,
    position: 5,
  },
  {
    id: "7",
    name: "General Voice",
    type: "voice",
    category: "Voice",
    isPrivate: false,
    position: 6,
  },
  {
    id: "8",
    name: "Music",
    type: "voice",
    category: "Voice",
    isPrivate: false,
    position: 7,
  },
  {
    id: "9",
    name: "admin-chat",
    type: "text",
    category: "Staff",
    isPrivate: true,
    position: 8,
  },
  {
    id: "10",
    name: "mod-logs",
    type: "text",
    category: "Staff",
    isPrivate: true,
    position: 9,
  },
];

const mockMembers: ServerMember[] = [
  {
    id: "1",
    username: "alice_admin",
    displayName: "Alice",
    roles: ["Admin"],
    joinedAt: "2023-01-15",
    isOnline: true,
    isOwner: true,
  },
  {
    id: "2",
    username: "bob_mod",
    displayName: "Bob",
    roles: ["Moderator"],
    joinedAt: "2023-02-20",
    isOnline: true,
  },
  {
    id: "3",
    username: "charlie",
    displayName: "Charlie",
    roles: ["VIP", "Booster"],
    joinedAt: "2023-03-10",
    isOnline: false,
  },
  {
    id: "4",
    username: "diana",
    displayName: "Diana",
    roles: ["Moderator"],
    joinedAt: "2023-04-05",
    isOnline: true,
  },
  {
    id: "5",
    username: "eve_vip",
    displayName: "Eve",
    roles: ["VIP"],
    joinedAt: "2023-05-12",
    isOnline: false,
  },
  {
    id: "6",
    username: "frank",
    displayName: "Frank",
    roles: [],
    joinedAt: "2023-06-18",
    isOnline: true,
  },
  {
    id: "7",
    username: "grace",
    displayName: "Grace",
    roles: ["Booster"],
    joinedAt: "2023-07-22",
    isOnline: false,
  },
  {
    id: "8",
    username: "henry",
    displayName: "Henry",
    roles: [],
    joinedAt: "2023-08-30",
    isOnline: true,
  },
  {
    id: "9",
    username: "iris",
    displayName: "Iris",
    roles: ["VIP"],
    joinedAt: "2023-09-14",
    isOnline: false,
  },
  {
    id: "10",
    username: "jack",
    displayName: "Jack",
    roles: [],
    joinedAt: "2023-10-25",
    isOnline: true,
  },
];

// Helper Components
function SettingSection({
  title,
  children,
  isDark,
}: {
  title: string;
  children: React.ReactNode | React.ReactNode[];
  isDark: boolean;
}) {
  return (
    <View className="mx-4 mt-6">
      <Text
        className={`text-xs font-semibold uppercase mb-3 ${isDark ? "text-dark-400" : "text-gray-500"}`}
      >
        {title}
      </Text>
      <View
        className={`rounded-xl overflow-hidden ${isDark ? "bg-dark-800" : "bg-white"} border ${isDark ? "border-dark-700" : "border-gray-200"}`}
      >
        {children}
      </View>
    </View>
  );
}

function Divider({
  inset = false,
  isDark,
}: {
  inset?: boolean;
  isDark: boolean;
}) {
  return (
    <View
      className={`h-px ${inset ? "ml-14" : ""}`}
      style={{
        backgroundColor: isDark ? "rgba(128,132,142,0.2)" : "rgba(0,0,0,0.1)",
      }}
    />
  );
}

// Tab Components
function GeneralTab({
  settings,
  setSettings,
  isDark,
}: {
  settings: ServerSettings;
  setSettings: React.Dispatch<React.SetStateAction<ServerSettings>>;
  isDark: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(settings.name);
  const [editedDescription, setEditedDescription] = useState(
    settings.description,
  );

  const handleSaveChanges = () => {
    setSettings((prev) => ({
      ...prev,
      name: editedName,
      description: editedDescription,
    }));
    setIsEditing(false);
  };

  const handleDeleteServer = () => {
    Alert.alert(
      "Delete Server",
      "Are you sure you want to delete this server? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert("Server Deleted", "The server has been deleted.");
            router.back();
          },
        },
      ],
    );
  };

  const handleLeaveServer = () => {
    Alert.alert("Leave Server", "Are you sure you want to leave this server?", [
      { text: "Cancel", style: "cancel" },
      { text: "Leave", style: "destructive", onPress: () => router.back() },
    ]);
  };

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {/* Server Icon & Name */}
      <SettingSection title="Server Profile" isDark={isDark}>
        <View className="p-4">
          <View className="items-center">
            <TouchableOpacity className="relative">
              <View
                className={`w-24 h-24 rounded-full items-center justify-center ${isDark ? "bg-dark-700" : "bg-gray-200"}`}
              >
                {settings.icon ? (
                  <Image
                    source={{ uri: settings.icon }}
                    className="w-24 h-24 rounded-full"
                  />
                ) : (
                  <Text className="text-4xl font-bold text-brand">
                    {settings.name.charAt(0)}
                  </Text>
                )}
              </View>
              <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full items-center justify-center bg-brand">
                <Ionicons name="camera" size={16} color="white" />
              </View>
            </TouchableOpacity>

            {isEditing ? (
              <View className="w-full mt-4 space-y-3">
                <View>
                  <Text
                    className={`text-sm mb-2 ${isDark ? "text-dark-400" : "text-gray-600"}`}
                  >
                    Server Name
                  </Text>
                  <TextInput
                    value={editedName}
                    onChangeText={setEditedName}
                    className={`px-4 py-3 rounded-lg ${isDark ? "bg-dark-700 text-white" : "bg-gray-100 text-gray-900"}`}
                    maxLength={100}
                    placeholderTextColor={isDark ? "#80848e" : "#9ca3af"}
                  />
                </View>
                <View className="mt-3">
                  <Text
                    className={`text-sm mb-2 ${isDark ? "text-dark-400" : "text-gray-600"}`}
                  >
                    Description
                  </Text>
                  <TextInput
                    value={editedDescription}
                    onChangeText={setEditedDescription}
                    multiline
                    numberOfLines={3}
                    className={`px-4 py-3 rounded-lg ${isDark ? "bg-dark-700 text-white" : "bg-gray-100 text-gray-900"}`}
                    maxLength={1024}
                    placeholderTextColor={isDark ? "#80848e" : "#9ca3af"}
                  />
                </View>
                <View className="flex-row space-x-3 mt-3">
                  <TouchableOpacity
                    onPress={() => setIsEditing(false)}
                    className="flex-1 py-3 rounded-lg bg-gray-600"
                  >
                    <Text className="text-white text-center font-medium">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveChanges}
                    className="flex-1 py-3 rounded-lg bg-brand ml-3"
                  >
                    <Text className="text-white text-center font-medium">
                      Save
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <Text
                  className={`text-xl font-bold mt-4 ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {settings.name}
                </Text>
                <Text
                  className={`text-sm mt-1 text-center ${isDark ? "text-dark-400" : "text-gray-500"}`}
                >
                  {settings.description}
                </Text>
                <TouchableOpacity
                  onPress={() => setIsEditing(true)}
                  className="mt-3 px-4 py-2 rounded-lg bg-brand/10"
                >
                  <Text className="text-brand font-medium">Edit Server</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </SettingSection>

      {/* Server Stats */}
      <SettingSection title="Statistics" isDark={isDark}>
        <View className="flex-row">
          <View
            className={`flex-1 items-center py-4 border-r ${isDark ? "border-dark-700" : "border-gray-200"}`}
          >
            <Text className="text-2xl font-bold text-brand">1,247</Text>
            <Text
              className={`text-sm mt-1 ${isDark ? "text-dark-400" : "text-gray-500"}`}
            >
              Members
            </Text>
          </View>
          <View
            className={`flex-1 items-center py-4 border-r ${isDark ? "border-dark-700" : "border-gray-200"}`}
          >
            <Text className="text-2xl font-bold text-green-500">89</Text>
            <Text
              className={`text-sm mt-1 ${isDark ? "text-dark-400" : "text-gray-500"}`}
            >
              Online
            </Text>
          </View>
          <View className="flex-1 items-center py-4">
            <Text className="text-2xl font-bold text-purple-500">10</Text>
            <Text
              className={`text-sm mt-1 ${isDark ? "text-dark-400" : "text-gray-500"}`}
            >
              Channels
            </Text>
          </View>
        </View>
      </SettingSection>

      {/* Visibility Settings */}
      <SettingSection title="Visibility" isDark={isDark}>
        <SwitchItem
          title="Public Server"
          subtitle="Show in server discovery"
          value={settings.isPublic}
          onValueChange={(value) =>
            setSettings((prev) => ({ ...prev, isPublic: value }))
          }
        />
        <Divider isDark={isDark} />
        <SwitchItem
          title="Verification Required"
          subtitle="Require email verification to join"
          value={settings.requireVerification}
          onValueChange={(value) =>
            setSettings((prev) => ({ ...prev, requireVerification: value }))
          }
        />
        <Divider isDark={isDark} />
        <SwitchItem
          title="Allow Invites"
          subtitle="Let members create invite links"
          value={settings.allowInvites}
          onValueChange={(value) =>
            setSettings((prev) => ({ ...prev, allowInvites: value }))
          }
        />
      </SettingSection>

      {/* Notification Defaults */}
      <SettingSection title="Default Notifications" isDark={isDark}>
        {(["all", "mentions", "none"] as const).map((option, index) => (
          <React.Fragment key={option}>
            {index > 0 && <Divider isDark={isDark} />}
            <TouchableOpacity
              onPress={() =>
                setSettings((prev) => ({
                  ...prev,
                  defaultNotifications: option,
                }))
              }
              className="flex-row items-center px-4 py-3"
            >
              <View
                className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                  settings.defaultNotifications === option
                    ? "border-brand"
                    : isDark
                      ? "border-dark-600"
                      : "border-gray-300"
                }`}
              >
                {settings.defaultNotifications === option && (
                  <View className="w-2.5 h-2.5 rounded-full bg-brand" />
                )}
              </View>
              <Text
                className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}
              >
                {option === "all"
                  ? "All Messages"
                  : option === "mentions"
                    ? "Only @mentions"
                    : "Nothing"}
              </Text>
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </SettingSection>

      {/* Danger Zone */}
      <View className="mx-4 mt-6 mb-8 space-y-3">
        <TouchableOpacity
          onPress={handleLeaveServer}
          className={`flex-row items-center justify-center py-4 rounded-xl ${isDark ? "bg-orange-500/20" : "bg-orange-100"}`}
        >
          <Ionicons name="exit-outline" size={20} color="#f97316" />
          <Text className="ml-2 font-semibold text-orange-500">
            Leave Server
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDeleteServer}
          className={`flex-row items-center justify-center py-4 rounded-xl ${isDark ? "bg-red-500/20" : "bg-red-100"}`}
        >
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
          <Text className="ml-2 font-semibold text-red-500">Delete Server</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function RolesTab({ isDark }: { isDark: boolean }) {
  const [roles, setRoles] = useState(mockRoles);

  const handleDeleteRole = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (role?.isDefault) {
      Alert.alert("Cannot Delete", "The @everyone role cannot be deleted.");
      return;
    }
    Alert.alert(
      "Delete Role",
      `Are you sure you want to delete the "${role?.name}" role?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            setRoles((prev) => prev.filter((r) => r.id !== roleId)),
        },
      ],
    );
  };

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <SettingSection title={`Roles (${roles.length})`} isDark={isDark}>
        <View className="px-4 py-3">
          <Text
            className={`text-sm ${isDark ? "text-dark-400" : "text-gray-600"}`}
          >
            Manage permissions and colors for different member groups
          </Text>
        </View>
        {roles.map((role, index) => (
          <React.Fragment key={role.id}>
            {index > 0 && <Divider inset isDark={isDark} />}
            <TouchableOpacity className="flex-row items-center px-4 py-3">
              <View
                className="w-4 h-4 rounded-full mr-3"
                style={{ backgroundColor: role.color }}
              />
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text
                    className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    {role.name}
                  </Text>
                  {role.isDefault && (
                    <Badge variant="default" className="ml-2">
                      Default
                    </Badge>
                  )}
                </View>
                <Text
                  className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}
                >
                  {role.memberCount} members • {role.permissions.length}{" "}
                  permissions
                </Text>
              </View>
              {!role.isDefault && (
                <TouchableOpacity
                  onPress={() => handleDeleteRole(role.id)}
                  className="p-2 mr-1"
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              )}
              <Ionicons
                name="chevron-forward"
                size={20}
                color={isDark ? "#4e5058" : "#d1d5db"}
              />
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </SettingSection>

      <View className="mx-4 mt-4 mb-8">
        <TouchableOpacity
          className={`flex-row items-center justify-center py-4 rounded-xl bg-brand`}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text className="ml-2 font-semibold text-white">Create New Role</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function ChannelsTab({ isDark }: { isDark: boolean }) {
  const [channels] = useState(mockChannels);

  // Group channels by category
  const categories = channels.reduce(
    (acc, channel) => {
      const cat = channel.category || "Uncategorized";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(channel);
      return acc;
    },
    {} as Record<string, ServerChannel[]>,
  );

  const getChannelIcon = (type: string, isPrivate: boolean) => {
    if (isPrivate) return "lock-closed";
    switch (type) {
      case "voice":
        return "volume-high";
      case "announcement":
        return "megaphone";
      default:
        return "chatbubble";
    }
  };

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {Object.entries(categories).map(([categoryName, categoryChannels]) => (
        <SettingSection key={categoryName} title={categoryName} isDark={isDark}>
          {categoryChannels.map((channel, index) => (
            <React.Fragment key={channel.id}>
              {index > 0 && <Divider inset isDark={isDark} />}
              <TouchableOpacity className="flex-row items-center px-4 py-3">
                <Ionicons
                  name={
                    getChannelIcon(
                      channel.type,
                      channel.isPrivate,
                    ) as React.ComponentProps<typeof Ionicons>["name"]
                  }
                  size={20}
                  color={
                    channel.isPrivate
                      ? "#f97316"
                      : isDark
                        ? "#80848e"
                        : "#6b7280"
                  }
                />
                <View className="flex-1 ml-3">
                  <View className="flex-row items-center">
                    <Text
                      className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}
                    >
                      {channel.name}
                    </Text>
                    {channel.isPrivate && (
                      <Badge variant="warning" className="ml-2">
                        Private
                      </Badge>
                    )}
                  </View>
                  <Text
                    className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}
                  >
                    {channel.type.charAt(0).toUpperCase() +
                      channel.type.slice(1)}{" "}
                    Channel
                  </Text>
                </View>
                <Ionicons
                  name="reorder-three"
                  size={24}
                  color={isDark ? "#4e5058" : "#d1d5db"}
                />
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </SettingSection>
      ))}

      <View className="mx-4 mt-4 space-y-3 mb-8">
        <TouchableOpacity
          className={`flex-row items-center justify-center py-4 rounded-xl bg-brand`}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text className="ml-2 font-semibold text-white">Create Channel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-row items-center justify-center py-4 rounded-xl ${isDark ? "bg-dark-700" : "bg-gray-200"}`}
        >
          <Ionicons
            name="folder-open"
            size={20}
            color={isDark ? "#80848e" : "#6b7280"}
          />
          <Text
            className={`ml-2 font-semibold ${isDark ? "text-dark-300" : "text-gray-600"}`}
          >
            Create Category
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function MembersTab({ isDark }: { isDark: boolean }) {
  const [members] = useState(mockMembers);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMembers = members.filter(
    (member) =>
      member.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.displayName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const onlineMembers = filteredMembers.filter((m) => m.isOnline);
  const offlineMembers = filteredMembers.filter((m) => !m.isOnline);

  const handleKickMember = (member: ServerMember) => {
    if (member.isOwner) {
      Alert.alert("Cannot Kick", "You cannot kick the server owner.");
      return;
    }
    Alert.alert(
      "Kick Member",
      `Are you sure you want to kick ${member.displayName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Kick",
          style: "destructive",
          onPress: () =>
            Alert.alert("Success", `${member.displayName} has been kicked.`),
        },
      ],
    );
  };

  const handleBanMember = (member: ServerMember) => {
    if (member.isOwner) {
      Alert.alert("Cannot Ban", "You cannot ban the server owner.");
      return;
    }
    Alert.alert(
      "Ban Member",
      `Are you sure you want to ban ${member.displayName}? They will not be able to rejoin.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Ban",
          style: "destructive",
          onPress: () =>
            Alert.alert("Success", `${member.displayName} has been banned.`),
        },
      ],
    );
  };

  const getRoleColor = (roleName: string) => {
    const role = mockRoles.find((r) => r.name === roleName);
    return role?.color || "#99aab5";
  };

  const renderMember = (member: ServerMember) => (
    <TouchableOpacity
      key={member.id}
      className="flex-row items-center px-4 py-3"
    >
      <View className="relative">
        <Avatar name={member.displayName} size="md" />
        <View
          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 ${
            isDark ? "border-dark-800" : "border-white"
          } ${member.isOnline ? "bg-green-500" : "bg-gray-400"}`}
        />
      </View>
      <View className="flex-1 ml-3">
        <View className="flex-row items-center">
          <Text
            className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}
          >
            {member.displayName}
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
        <View className="flex-row items-center flex-wrap">
          <Text
            className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            @{member.username}
          </Text>
          {member.roles.length > 0 && (
            <View className="flex-row items-center ml-2">
              {member.roles.slice(0, 2).map((role) => (
                <View
                  key={role}
                  className="px-1.5 py-0.5 rounded mr-1"
                  style={{ backgroundColor: getRoleColor(role) + "30" }}
                >
                  <Text
                    style={{
                      color: getRoleColor(role),
                      fontSize: 10,
                      fontWeight: "600",
                    }}
                  >
                    {role}
                  </Text>
                </View>
              ))}
              {member.roles.length > 2 && (
                <Text
                  className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}
                >
                  +{member.roles.length - 2}
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
      {!member.isOwner && (
        <View className="flex-row">
          <TouchableOpacity
            onPress={() => handleKickMember(member)}
            className="p-2"
          >
            <Ionicons name="exit-outline" size={18} color="#f97316" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleBanMember(member)}
            className="p-2"
          >
            <Ionicons name="ban" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View className="flex-1">
      {/* Search */}
      <View className="px-4 pt-4 pb-2">
        <SearchInput
          placeholder="Search members..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Online Members */}
        {onlineMembers.length > 0 && (
          <SettingSection
            title={`Online — ${onlineMembers.length}`}
            isDark={isDark}
          >
            {onlineMembers.map((member, index) => (
              <React.Fragment key={member.id}>
                {index > 0 && <Divider inset isDark={isDark} />}
                {renderMember(member)}
              </React.Fragment>
            ))}
          </SettingSection>
        )}

        {/* Offline Members */}
        {offlineMembers.length > 0 && (
          <SettingSection
            title={`Offline — ${offlineMembers.length}`}
            isDark={isDark}
          >
            {offlineMembers.map((member, index) => (
              <React.Fragment key={member.id}>
                {index > 0 && <Divider inset isDark={isDark} />}
                {renderMember(member)}
              </React.Fragment>
            ))}
          </SettingSection>
        )}

        {filteredMembers.length === 0 && (
          <View className="items-center py-12">
            <Ionicons
              name="search"
              size={48}
              color={isDark ? "#4e5058" : "#d1d5db"}
            />
            <Text
              className={`mt-4 text-lg font-medium ${isDark ? "text-dark-400" : "text-gray-500"}`}
            >
              No members found
            </Text>
          </View>
        )}

        <View className="h-8" />
      </ScrollView>
    </View>
  );
}

// Main Component
export default function ServerSettingsScreen() {
  useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [settings, setSettings] = useState<ServerSettings>({
    name: "Gaming Hub",
    description: "A community for gaming enthusiasts",
    isPublic: true,
    requireVerification: false,
    allowInvites: true,
    defaultNotifications: "mentions",
  });

  const [activeTab, setActiveTab] = useState<
    "general" | "roles" | "channels" | "members"
  >("general");

  const tabs = [
    { key: "general" as const, icon: "settings-outline", label: "General" },
    { key: "roles" as const, icon: "shield-outline", label: "Roles" },
    {
      key: "channels" as const,
      icon: "chatbubbles-outline",
      label: "Channels",
    },
    { key: "members" as const, icon: "people-outline", label: "Members" },
  ];

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}>
      {/* Header */}
      <View
        className={`flex-row items-center justify-between px-4 py-3 ${isDark ? "bg-dark-900" : "bg-white"} border-b ${isDark ? "border-dark-800" : "border-gray-200"}`}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons
            name="chevron-back"
            size={28}
            color={isDark ? "#80848e" : "#6b7280"}
          />
        </TouchableOpacity>
        <Text
          className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}
        >
          Server Settings
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Tab Navigation */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className={`border-b ${isDark ? "border-dark-800 bg-dark-900" : "border-gray-200 bg-white"}`}
        contentContainerClassName="px-4"
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            className={`flex-row items-center py-3 px-4 mr-2 ${activeTab === tab.key ? "border-b-2 border-brand" : ""}`}
          >
            <Ionicons
              name={tab.icon as React.ComponentProps<typeof Ionicons>["name"]}
              size={18}
              color={
                activeTab === tab.key
                  ? "#5865f2"
                  : isDark
                    ? "#80848e"
                    : "#6b7280"
              }
            />
            <Text
              className={`ml-2 font-medium ${
                activeTab === tab.key
                  ? "text-brand"
                  : isDark
                    ? "text-dark-300"
                    : "text-gray-600"
              }`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab Content */}
      {activeTab === "general" && (
        <GeneralTab
          settings={settings}
          setSettings={setSettings}
          isDark={isDark}
        />
      )}
      {activeTab === "roles" && <RolesTab isDark={isDark} />}
      {activeTab === "channels" && <ChannelsTab isDark={isDark} />}
      {activeTab === "members" && <MembersTab isDark={isDark} />}
    </SafeAreaView>
  );
}
