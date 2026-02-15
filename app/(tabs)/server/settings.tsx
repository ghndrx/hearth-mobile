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
  import { SwitchItem } from "../../../components/ui";

  interface ServerRole {
    id: string;
    name: string;
    color: string;
    memberCount: number;
    isDefault?: boolean;
    permissions: string[];
  }

  interface ServerInvite {
    id: string;
    code: string;
    uses: number;
    maxUses: number | null;
    expiresAt: string | null;
    createdBy: string;
  }

  interface ServerSettings {
    name: string;
    description: string;
    icon?: string;
    banner?: string;
    isPublic: boolean;
    requireVerification: boolean;
    slowmode: number;
    contentFilter: "off" | "medium" | "strict";
  }

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
      name: "Moderator",
      color: "#5865f2",
      memberCount: 12,
      permissions: ["KICK_MEMBERS", "BAN_MEMBERS", "MANAGE_MESSAGES"],
    },
    {
      id: "3",
      name: "VIP",
      color: "#f47fff",
      memberCount: 45,
      permissions: ["EMBED_LINKS", "ATTACH_FILES"],
    },
    {
      id: "4",
      name: "Admin",
      color: "#ed4245",
      memberCount: 3,
      permissions: ["ADMINISTRATOR"],
    },
  ];

  const mockInvites: ServerInvite[] = [
    {
      id: "1",
      code: "hearth-gaming",
      uses: 456,
      maxUses: null,
      expiresAt: null,
      createdBy: "Admin",
    },
    {
      id: "2",
      code: "abc123xyz",
      uses: 23,
      maxUses: 100,
      expiresAt: "2024-12-31",
      createdBy: "Moderator",
    },
    {
      id: "3",
      code: "temp-event",
      uses: 8,
      maxUses: 50,
      expiresAt: "2024-03-01",
      createdBy: "Admin",
    },
  ];

  const contentFilterOptions = [
    { value: "off", label: "Don't scan any media", description: "No content filtering" },
    { value: "medium", label: "Scan media from untrusted users", description: "Recommended for most servers" },
    { value: "strict", label: "Scan all media", description: "Maximum security" },
  ] as const;

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
          className={`
            text-xs 
            font-semibold 
            uppercase 
            mb-3
            ${isDark ? "text-dark-400" : "text-gray-500"}
          `}
        >
          {title}
        </Text>
        <View
          className={`
            rounded-xl
            overflow-hidden
            ${isDark ? "bg-dark-800" : "bg-white"}
            border
            ${isDark ? "border-dark-700" : "border-gray-200"}
          `}
        >
          {children}
        </View>
      </View>
    );
  }

  function SettingItem({
    icon,
    label,
    value,
    onPress,
    isDark,
    showChevron = true,
    destructive = false,
  }: {
    icon: string;
    label: string;
    value?: string | React.ReactNode;
    onPress?: () => void;
    isDark: boolean;
    showChevron?: boolean;
    destructive?: boolean;
  }) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={!onPress}
        className="flex-row items-center px-4 py-3"
      >
        <Ionicons
          name={icon as React.ComponentProps<typeof Ionicons>["name"]}
          size={22}
          color={destructive ? "#ef4444" : isDark ? "#80848e" : "#6b7280"}
        />
        <View className="flex-1 ml-3">
          <Text
            className={`font-medium ${
              destructive
                ? "text-red-500"
                : isDark
                  ? "text-white"
                  : "text-gray-900"
            }`}
          >
            {label}
          </Text>
          {value && typeof value === "string" && (
            <Text
              className={`text-sm ${
                isDark ? "text-dark-400" : "text-gray-500"
              }`}
            >
              {value}
            </Text>
          )}
        </View>
        {showChevron && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={isDark ? "#4e5058" : "#d1d5db"}
          />
        )}
      </TouchableOpacity>
    );
  }

  function Divider({ inset = false }: { inset?: boolean }) {
    return (
      <View
        className={`
          h-px 
          ${inset ? "ml-14" : ""}
          ${"bg-dark-700"}
        `}
        style={{ backgroundColor: inset ? undefined : "rgba(128,132,142,0.2)" }}
      />
    );
  }

  export default function ServerSettingsScreen() {
    useLocalSearchParams<{ id: string }>();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    const [settings, setSettings] = useState<ServerSettings>({
      name: "Gaming Hub",
      description: "A community for gaming enthusiasts",
      isPublic: true,
      requireVerification: false,
      slowmode: 0,
      contentFilter: "medium",
    });

    const [activeTab, setActiveTab] = useState<"overview" | "roles" | "invites" | "moderation">("overview");
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(settings.name);
    const [editedDescription, setEditedDescription] = useState(settings.description);

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
        ]
      );
    };

    const handleLeaveServer = () => {
      Alert.alert(
        "Leave Server",
        "Are you sure you want to leave this server?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Leave",
            style: "destructive",
            onPress: () => router.back(),
          },
        ]
      );
    };

    const revokeInvite = (_inviteId: string) => {
      Alert.alert("Revoke Invite", "Are you sure you want to revoke this invite link?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: () => {
            Alert.alert("Success", "Invite link has been revoked.");
          },
        },
      ]);
    };

    return (
      <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}>
        {/* Header */}
        <View
          className={`
            flex-row items-center justify-between px-4 py-3
            ${isDark ? "bg-dark-900" : "bg-white"}
            border-b ${isDark ? "border-dark-800" : "border-gray-200"}
          `}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons
              name="chevron-back"
              size={28}
              color={isDark ? "#80848e" : "#6b7280"}
            />
          </TouchableOpacity>
          <Text
            className={`text-lg font-bold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
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
          {(
            [
              { key: "overview", icon: "settings-outline", label: "Overview" },
              { key: "roles", icon: "shield-outline", label: "Roles" },
              { key: "invites", icon: "link-outline", label: "Invites" },
              { key: "moderation", icon: "shield-checkmark-outline", label: "Moderation" },
            ] as const
          ).map((tab) => (
            <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            className={`
              flex-row items-center py-3 px-4 mr-2
              ${activeTab === tab.key ? "border-b-2 border-brand" : ""}
            `}
          >
            <Ionicons
              name={tab.icon}
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

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {activeTab === "overview" && (
            <>
              {/* Server Icon & Name */}
              <SettingSection title="Server Overview" isDark={isDark}>
                <View className="p-4">
                  <View className="items-center">
                    <TouchableOpacity className="relative">
                      <View
                        className={`
                          w-24 h-24 rounded-full items-center justify-center
                          ${isDark ? "bg-dark-700" : "bg-gray-200"}
                        `}
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
                      <View
                        className={`
                          absolute bottom-0 right-0 w-8 h-8 rounded-full
                          items-center justify-center
                          bg-brand
                        `}
                      >
                        <Ionicons name="camera" size={16} color="white" />
                      </View>
                    </TouchableOpacity>

                    {isEditing ? (
                      <View className="w-full mt-4 space-y-3">
                        <View>
                          <Text
                            className={`text-sm mb-2 ${
                              isDark ? "text-dark-400" : "text-gray-600"
                            }`}
                          >
                            Server Name
                          </Text>
                          <TextInput
                            value={editedName}
                            onChangeText={setEditedName}
                            className={`
                              px-4 py-3 rounded-lg
                              ${isDark ? "bg-dark-700 text-white" : "bg-gray-100 text-gray-900"}
                            `}
                            maxLength={100}
                          />
                        </View>
                        <View>
                          <Text
                            className={`text-sm mb-2 ${
                              isDark ? "text-dark-400" : "text-gray-600"
                            }`}
                          >
                            Description
                          </Text>
                          <TextInput
                            value={editedDescription}
                            onChangeText={setEditedDescription}
                            multiline
                            numberOfLines={3}
                            className={`
                              px-4 py-3 rounded-lg
                              ${isDark ? "bg-dark-700 text-white" : "bg-gray-100 text-gray-900"}
                            `}
                            maxLength={1024}
                          />
                        </View>
                        <View className="flex-row space-x-3">
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
                            className="flex-1 py-3 rounded-lg bg-brand"
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
                          className={`text-xl font-bold mt-4 ${
                            isDark ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {settings.name}
                        </Text>
                        <Text
                          className={`text-sm mt-1 ${
                            isDark ? "text-dark-400" : "text-gray-500"
                          }`}
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
                  <View className="flex-1 items-center py-4 border-r border-dark-700">
                    <Text className="text-2xl font-bold text-brand">1,247</Text>
                    <Text
                      className={`text-sm mt-1 ${
                        isDark ? "text-dark-400" : "text-gray-500"
                      }`}
                    >
                      Members
                    </Text>
                  </View>
                  <View className="flex-1 items-center py-4 border-r border-dark-700">
                    <Text className="text-2xl font-bold text-green-500">89</Text>
                    <Text
                      className={`text-sm mt-1 ${
                        isDark ? "text-dark-400" : "text-gray-500"
                      }`}
                    >
                      Online
                    </Text>
                  </View>
                  <View className="flex-1 items-center py-4">
                    <Text className="text-2xl font-bold text-purple-500">12</Text>
                    <Text
                      className={`text-sm mt-1 ${
                        isDark ? "text-dark-400" : "text-gray-500"
                      }`}
                    >
                      Boosts
                    </Text>
                  </View>
                </View>
              </SettingSection>

              {/* Visibility */}
              <SettingSection title="Visibility" isDark={isDark}>
                <View className="px-4 py-3 flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <Ionicons
                      name="globe-outline"
                      size={22}
                      color={isDark ? "#80848e" : "#6b7280"}
                    />
                    <View className="ml-3 flex-1">
                      <Text
                        className={`font-medium ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        Public Server
                      </Text>
                      <Text
                        className={`text-sm ${
                          isDark ? "text-dark-400" : "text-gray-500"
                        }`}
                      >
                        Show in server discovery
                      </Text>
                    </View>
                  </View>
                  <SwitchItem
                    title=""
                    value={settings.isPublic}
                    onValueChange={(value: boolean) =>
                      setSettings((prev) => ({ ...prev, isPublic: value }))
                    }
                  />
                </View>
                <Divider inset />
                <View className="px-4 py-3 flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={22}
                      color={isDark ? "#80848e" : "#6b7280"}
                    />
                    <View className="ml-3 flex-1">
                      <Text
                        className={`font-medium ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        Verification Required
                      </Text>
                      <Text
                        className={`text-sm ${
                          isDark ? "text-dark-400" : "text-gray-500"
                        }`}
                      >
                        Require email verification
                      </Text>
                    </View>
                  </View>
                  <SwitchItem
                    title=""
                    value={settings.requireVerification}
                    onValueChange={(value: boolean) =>
                      setSettings((prev) => ({
                        ...prev,
                        requireVerification: value,
                      }))
                    }
                  />
                </View>
              </SettingSection>

              {/* Community Settings */}
              <SettingSection title="Community" isDark={isDark}>
                <SettingItem
                  icon="people-outline"
                  label="Members"
                  value="1,247"
                  isDark={isDark}
                />
                <Divider inset />
                <SettingItem
                  icon="chatbubbles-outline"
                  label="Channels"
                  value="24"
                  isDark={isDark}
                />
                <Divider inset />
                <SettingItem
                  icon="folder-outline"
                  label="Categories"
                  value="6"
                  isDark={isDark}
                />
              </SettingSection>

              {/* Leave/Delete */}
              <View className="mx-4 mt-6 space-y-3">
                <TouchableOpacity
                  onPress={handleLeaveServer}
                  className={`
                    flex-row items-center justify-center py-4 rounded-xl
                    ${isDark ? "bg-orange-500/20" : "bg-orange-100"}
                  `}
                >
                  <Ionicons name="exit-outline" size={20} color="#f97316" />
                  <Text className="ml-2 font-semibold text-orange-500">
                    Leave Server
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleDeleteServer}
                  className={`
                    flex-row items-center justify-center py-4 rounded-xl
                    ${isDark ? "bg-red-500/20" : "bg-red-100"}
                  `}
                >
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  <Text className="ml-2 font-semibold text-red-500">
                    Delete Server
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {activeTab === "roles" && (
            <>
              <SettingSection title="Server Roles" isDark={isDark}>
                <View className="px-4 py-3">
                  <Text
                    className={`text-sm mb-3 ${
                      isDark ? "text-dark-400" : "text-gray-600"
                    }`}
                  >
                    Manage permissions for different member groups
                  </Text>
                </View>
                {mockRoles.map((role, index) => (
                  <View key={role.id}>
                    <TouchableOpacity className="flex-row items-center px-4 py-3">
                      <View
                        className="w-4 h-4 rounded-full mr-3"
                        style={{ backgroundColor: role.color }}
                      />
                      <View className="flex-1">
                        <Text
                          className={`font-medium ${
                            isDark ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {role.name}
                          {role.isDefault && (
                            <Text
                              className={`text-xs ml-2 ${
                                isDark ? "text-dark-500" : "text-gray-400"
                              }`}
                            >
                              {" "}
                              (Default)
                            </Text>
                          )}
                        </Text>
                        <Text
                          className={`text-sm ${
                            isDark ? "text-dark-400" : "text-gray-500"
                          }`}
                        >
                          {role.memberCount} members
                          {" | "}
                          {role.permissions.length} permissions
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={isDark ? "#4e5058" : "#d1d5db"}
                      />
                    </TouchableOpacity>
                    {index < mockRoles.length - 1 && <Divider inset />}
                  </View>
                ))}
              </SettingSection>

              <View className="mx-4 mt-4">
                <TouchableOpacity
                  className={`
                    flex-row items-center justify-center py-4 rounded-xl
                    ${isDark ? "bg-brand/20" : "bg-indigo-100"}
                  `}
                >
                  <Ionicons name="add" size={20} color="#5865f2" />
                  <Text className="ml-2 font-semibold text-brand">
                    Create New Role
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {activeTab === "invites" && (
            <>
              <SettingSection title="Active Invites" isDark={isDark}>
                <View className="px-4 py-3">
                  <Text
                    className={`text-sm ${
                      isDark ? "text-dark-400" : "text-gray-600"
                    }`}
                  >
                    Manage invite links to your server
                  </Text>
                </View>
                {mockInvites.map((invite, index) => (
                  <View key={invite.id}>
                    <View className="px-4 py-3">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center flex-1">
                          <View
                            className={`
                              w-10 h-10 rounded-lg items-center justify-center
                              ${isDark ? "bg-dark-700" : "bg-gray-100"}
                            `}
                          >
                            <Ionicons
                              name="link"
                              size={20}
                              color={isDark ? "#80848e" : "#6b7280"}
                            />
                          </View>
                          <View className="ml-3 flex-1">
                            <Text
                              className={`font-medium ${
                                isDark ? "text-white" : "text-gray-900"
                              }`}
                            >
                              discord.gg/{invite.code}
                            </Text>
                            <Text
                              className={`text-sm ${
                                isDark ? "text-dark-400" : "text-gray-500"
                              }`}
                            >
                              {invite.uses} uses
                              {invite.maxUses && ` / ${invite.maxUses}`}
                              {" • "}by {invite.createdBy}
                              {invite.expiresAt && ` • Expires ${invite.expiresAt}`}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={() => revokeInvite(invite.id)}
                          className="ml-2 px-3 py-1.5 rounded-lg bg-red-500/10"
                        >
                          <Text className="text-red-500 text-sm">Revoke</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    {index < mockInvites.length - 1 && <Divider inset />}
                  </View>
                ))}
              </SettingSection>

              <View className="mx-4 mt-4">
                <TouchableOpacity
                  className={`
                    flex-row items-center justify-center py-4 rounded-xl
                    ${isDark ? "bg-brand" : "bg-brand"}
                  `}
                >
                  <Ionicons name="add" size={20} color="white" />
                  <Text className="ml-2 font-semibold text-white">
                    Create New Invite
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {activeTab === "moderation" && (
            <>
              <SettingSection title="Content Moderation" isDark={isDark}>
                <View className="px-4 py-3">
                  <Text
                    className={`text-sm mb-3 ${
                      isDark ? "text-dark-400" : "text-gray-600"
                    }`}
                  >
                    Automatically scan and delete explicit media content
                  </Text>
                </View>
                {contentFilterOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() =>
                      setSettings((prev) => ({
                        ...prev,
                        contentFilter: option.value,
                      }))
                    }
                    className="flex-row items-center px-4 py-3"
                  >
                    <View
                      className={`
                        w-5 h-5 rounded-full border-2 mr-3 items-center justify-center
                        ${
                          settings.contentFilter === option.value
                            ? "border-brand"
                            : isDark
                              ? "border-dark-600"
                              : "border-gray-300"
                        }
                      `}
                    >
                      {settings.contentFilter === option.value && (
                        <View className="w-2.5 h-2.5 rounded-full bg-brand" />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`font-medium ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {option.label}
                      </Text>
                      <Text
                        className={`text-sm ${
                          isDark ? "text-dark-400" : "text-gray-500"
                        }`}
                      >
                        {option.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </SettingSection>

              <SettingSection title="Slowmode" isDark={isDark}>
                <View className="px-4 py-3">
                  <Text
                    className={`text-sm ${
                      isDark ? "text-dark-400" : "text-gray-600"
                    }`}
                  >
                    Limit how often users can send messages
                  </Text>
                </View>
                {["Off", "5 seconds", "10 seconds", "30 seconds", "1 minute", "5 minutes"].map(
                  (option, index) => (
                    <TouchableOpacity
                      key={option}
                      onPress={() =>
                        setSettings((prev) => ({
                          ...prev,
                          slowmode: index,
                        }))
                      }
                      className="flex-row items-center px-4 py-3"
                    >
                      <View
                        className={`
                          w-5 h-5 rounded-full border-2 mr-3 items-center justify-center
                          ${
                            settings.slowmode === index
                              ? "border-brand"
                              : isDark
                                ? "border-dark-600"
                                : "border-gray-300"
                          }
                        `}
                      >
                        {settings.slowmode === index && (
                          <View className="w-2.5 h-2.5 rounded-full bg-brand" />
                        )}
                      </View>
                      <Text
                        className={`font-medium ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </SettingSection>

              <SettingSection title="Safety" isDark={isDark}>
                <SettingItem
                  icon="shield-outline"
                  label="Raid Protection"
                  value="Enabled"
                  isDark={isDark}
                />
                <Divider inset />
                <SettingItem
                  icon="ban-outline"
                  label="Banned Users"
                  value="3 users"
                  isDark={isDark}
                />
                <Divider inset />
                <SettingItem
                  icon="time-outline"
                  label="Timeout History"
                  value="View"
                  isDark={isDark}
                />
              </SettingSection>
            </>
          )}

          {/* Bottom padding */}
          <View className="h-8" />
        </ScrollView>
      </SafeAreaView>
    );
  }
