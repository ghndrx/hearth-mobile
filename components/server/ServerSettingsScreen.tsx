import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  useColorScheme,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Input } from "../ui";
import { Switch } from "react-native";

interface ServerSettings {
  name: string;
  description: string;
  iconUrl: string | null;
  isPublic: boolean;
  requireApproval: boolean;
  allowInvites: boolean;
  slowMode: boolean;
  slowModeDelay: number;
  explicitContentFilter: boolean;
  verificationLevel: "none" | "low" | "medium" | "high";
}

interface ServerSettingsScreenProps {
  serverId?: string;
}

const verificationLevels = [
  { value: "none" as const, label: "None", description: "No restrictions" },
  {
    value: "low" as const,
    label: "Low",
    description: "Must have verified email",
  },
  {
    value: "medium" as const,
    label: "Medium",
    description: "Registered for >5 minutes",
  },
  {
    value: "high" as const,
    label: "High",
    description: "Member for >10 minutes",
  },
];

export function ServerSettingsScreen({
  serverId: propServerId,
}: ServerSettingsScreenProps = {}) {
  const params = useLocalSearchParams<{ serverId: string }>();
  const _serverId = propServerId || params.serverId || "1";
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "moderation" | "notifications"
  >("overview");
  const [hasChanges, setHasChanges] = useState(false);

  const [settings, setSettings] = useState<ServerSettings>({
    name: "My Awesome Server",
    description: "A place for friends to hang out and chat about everything!",
    iconUrl: null,
    isPublic: false,
    requireApproval: true,
    allowInvites: true,
    slowMode: false,
    slowModeDelay: 5,
    explicitContentFilter: true,
    verificationLevel: "low",
  });

  // Store original settings for comparison
  useState(settings);

  const handleSettingChange = <K extends keyof ServerSettings>(
    key: K,
    value: ServerSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setHasChanges(false);
    Alert.alert("Success", "Server settings saved successfully");
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
            // Handle server deletion
            router.back();
          },
        },
      ],
    );
  };

  const handleLeaveServer = () => {
    Alert.alert("Leave Server", "Are you sure you want to leave this server?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: () => {
          router.back();
        },
      },
    ]);
  };

  const tabs = [
    {
      id: "overview" as const,
      label: "Overview",
      icon: "information-circle-outline",
    },
    { id: "moderation" as const, label: "Moderation", icon: "shield-outline" },
    {
      id: "notifications" as const,
      label: "Notifications",
      icon: "notifications-outline",
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <View className="space-y-6">
            {/* Server Icon & Name */}
            <View
              className={`
                mx-4 p-6 rounded-2xl
                ${isDark ? "bg-dark-800" : "bg-white"}
                border ${isDark ? "border-dark-700" : "border-gray-200"}
              `}
            >
              <View className="items-center mb-6">
                <TouchableOpacity
                  className={`
                    w-24 h-24 rounded-full items-center justify-center mb-4
                    ${isDark ? "bg-dark-700" : "bg-gray-100"}
                    border-2 border-dashed ${isDark ? "border-dark-500" : "border-gray-300"}
                  `}
                >
                  {settings.iconUrl ? (
                    <Image
                      source={{ uri: settings.iconUrl }}
                      className="w-full h-full rounded-full"
                    />
                  ) : (
                    <Ionicons
                      name="image-outline"
                      size={32}
                      color={isDark ? "#80848e" : "#6b7280"}
                    />
                  )}
                </TouchableOpacity>
                <Text
                  className={`text-sm ${isDark ? "text-brand" : "text-brand"} font-medium`}
                >
                  Change Icon
                </Text>
              </View>

              <Input
                label="Server Name"
                value={settings.name}
                onChangeText={(text) => handleSettingChange("name", text)}
                placeholder="Enter server name"
                maxLength={100}
              />

              <View className="mt-4">
                <Text
                  className={`text-sm font-medium mb-2 ${
                    isDark ? "text-dark-200" : "text-gray-700"
                  }`}
                >
                  Description
                </Text>
                <View
                  className={`
                    rounded-xl border p-3
                    ${isDark ? "bg-dark-900 border-dark-700" : "bg-gray-50 border-gray-200"}
                  `}
                >
                  <ScrollView className="max-h-24">
                    <Text
                      className={isDark ? "text-dark-100" : "text-gray-900"}
                      style={{ minHeight: 60 }}
                    >
                      {settings.description}
                    </Text>
                  </ScrollView>
                </View>
                <Text
                  className={`text-xs mt-1 ${
                    isDark ? "text-dark-400" : "text-gray-500"
                  }`}
                >
                  {settings.description.length}/500 characters
                </Text>
              </View>
            </View>

            {/* Server Visibility */}
            <View
              className={`
                mx-4 rounded-2xl overflow-hidden
                ${isDark ? "bg-dark-800" : "bg-white"}
                border ${isDark ? "border-dark-700" : "border-gray-200"}
              `}
            >
              <View className="p-4 border-b border-dark-700/30">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View
                      className={`
                        w-10 h-10 rounded-xl items-center justify-center mr-3
                        ${isDark ? "bg-dark-700" : "bg-gray-100"}
                      `}
                    >
                      <Ionicons
                        name="globe-outline"
                        size={20}
                        color={isDark ? "#80848e" : "#6b7280"}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`font-medium ${
                          isDark ? "text-dark-100" : "text-gray-900"
                        }`}
                      >
                        Public Server
                      </Text>
                      <Text
                        className={`text-sm ${
                          isDark ? "text-dark-400" : "text-gray-500"
                        }`}
                      >
                        Make this server discoverable
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={settings.isPublic}
                    onValueChange={(value: boolean) =>
                      handleSettingChange("isPublic", value)
                    }
                  />
                </View>
              </View>

              <View className="p-4 border-b border-dark-700/30">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View
                      className={`
                        w-10 h-10 rounded-xl items-center justify-center mr-3
                        ${isDark ? "bg-dark-700" : "bg-gray-100"}
                      `}
                    >
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={20}
                        color={isDark ? "#80848e" : "#6b7280"}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`font-medium ${
                          isDark ? "text-dark-100" : "text-gray-900"
                        }`}
                      >
                        Require Approval
                      </Text>
                      <Text
                        className={`text-sm ${
                          isDark ? "text-dark-400" : "text-gray-500"
                        }`}
                      >
                        New members need approval
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={settings.requireApproval}
                    onValueChange={(value: boolean) =>
                      handleSettingChange("requireApproval", value)
                    }
                  />
                </View>
              </View>

              <View className="p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View
                      className={`
                        w-10 h-10 rounded-xl items-center justify-center mr-3
                        ${isDark ? "bg-dark-700" : "bg-gray-100"}
                      `}
                    >
                      <Ionicons
                        name="link-outline"
                        size={20}
                        color={isDark ? "#80848e" : "#6b7280"}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`font-medium ${
                          isDark ? "text-dark-100" : "text-gray-900"
                        }`}
                      >
                        Allow Invites
                      </Text>
                      <Text
                        className={`text-sm ${
                          isDark ? "text-dark-400" : "text-gray-500"
                        }`}
                      >
                        Members can create invite links
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={settings.allowInvites}
                    onValueChange={(value: boolean) =>
                      handleSettingChange("allowInvites", value)
                    }
                  />
                </View>
              </View>
            </View>

            {/* Server Stats */}
            <View
              className={`
                mx-4 p-4 rounded-2xl
                ${isDark ? "bg-dark-800" : "bg-white"}
                border ${isDark ? "border-dark-700" : "border-gray-200"}
              `}
            >
              <Text
                className={`text-sm font-semibold uppercase mb-4 ${
                  isDark ? "text-dark-400" : "text-gray-500"
                }`}
              >
                Server Stats
              </Text>
              <View className="flex-row justify-around">
                <View className="items-center">
                  <Text
                    className={`text-2xl font-bold ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    1,234
                  </Text>
                  <Text
                    className={`text-sm ${
                      isDark ? "text-dark-400" : "text-gray-500"
                    }`}
                  >
                    Members
                  </Text>
                </View>
                <View className="items-center">
                  <Text
                    className={`text-2xl font-bold ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    12
                  </Text>
                  <Text
                    className={`text-sm ${
                      isDark ? "text-dark-400" : "text-gray-500"
                    }`}
                  >
                    Channels
                  </Text>
                </View>
                <View className="items-center">
                  <Text
                    className={`text-2xl font-bold ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    89
                  </Text>
                  <Text
                    className={`text-sm ${
                      isDark ? "text-dark-400" : "text-gray-500"
                    }`}
                  >
                    Online
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );

      case "moderation":
        return (
          <View className="space-y-6">
            {/* Content Moderation */}
            <View
              className={`
                mx-4 rounded-2xl overflow-hidden
                ${isDark ? "bg-dark-800" : "bg-white"}
                border ${isDark ? "border-dark-700" : "border-gray-200"}
              `}
            >
              <View className="p-4 border-b border-dark-700/30">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View
                      className={`
                        w-10 h-10 rounded-xl items-center justify-center mr-3
                        ${isDark ? "bg-dark-700" : "bg-gray-100"}
                      `}
                    >
                      <Ionicons
                        name="warning-outline"
                        size={20}
                        color={isDark ? "#80848e" : "#6b7280"}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`font-medium ${
                          isDark ? "text-dark-100" : "text-gray-900"
                        }`}
                      >
                        Explicit Content Filter
                      </Text>
                      <Text
                        className={`text-sm ${
                          isDark ? "text-dark-400" : "text-gray-500"
                        }`}
                      >
                        Scan and delete explicit content
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={settings.explicitContentFilter}
                    onValueChange={(value: boolean) =>
                      handleSettingChange("explicitContentFilter", value)
                    }
                  />
                </View>
              </View>

              <View className="p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View
                      className={`
                        w-10 h-10 rounded-xl items-center justify-center mr-3
                        ${isDark ? "bg-dark-700" : "bg-gray-100"}
                      `}
                    >
                      <Ionicons
                        name="timer-outline"
                        size={20}
                        color={isDark ? "#80848e" : "#6b7280"}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`font-medium ${
                          isDark ? "text-dark-100" : "text-gray-900"
                        }`}
                      >
                        Slow Mode
                      </Text>
                      <Text
                        className={`text-sm ${
                          isDark ? "text-dark-400" : "text-gray-500"
                        }`}
                      >
                        Limit message sending rate
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={settings.slowMode}
                    onValueChange={(value: boolean) =>
                      handleSettingChange("slowMode", value)
                    }
                  />
                </View>
              </View>
            </View>

            {/* Verification Level */}
            <View
              className={`
                mx-4 p-4 rounded-2xl
                ${isDark ? "bg-dark-800" : "bg-white"}
                border ${isDark ? "border-dark-700" : "border-gray-200"}
              `}
            >
              <Text
                className={`text-sm font-semibold uppercase mb-4 ${
                  isDark ? "text-dark-400" : "text-gray-500"
                }`}
              >
                Verification Level
              </Text>
              {verificationLevels.map((level, index) => (
                <TouchableOpacity
                  key={level.value}
                  onPress={() =>
                    handleSettingChange("verificationLevel", level.value)
                  }
                  className={`
                    flex-row items-center py-3
                    ${index !== verificationLevels.length - 1 ? "border-b border-dark-700/30" : ""}
                  `}
                >
                  <View
                    className={`
                      w-5 h-5 rounded-full border-2 mr-3 items-center justify-center
                      ${
                        settings.verificationLevel === level.value
                          ? "border-brand"
                          : isDark
                            ? "border-dark-500"
                            : "border-gray-300"
                      }
                    `}
                  >
                    {settings.verificationLevel === level.value && (
                      <View className="w-2.5 h-2.5 rounded-full bg-brand" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`font-medium ${
                        isDark ? "text-dark-100" : "text-gray-900"
                      }`}
                    >
                      {level.label}
                    </Text>
                    <Text
                      className={`text-sm ${
                        isDark ? "text-dark-400" : "text-gray-500"
                      }`}
                    >
                      {level.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case "notifications":
        return (
          <View className="space-y-6">
            {/* Notification Settings */}
            <View
              className={`
                mx-4 rounded-2xl overflow-hidden
                ${isDark ? "bg-dark-800" : "bg-white"}
                border ${isDark ? "border-dark-700" : "border-gray-200"}
              `}
            >
              {[
                {
                  id: "all",
                  label: "All Messages",
                  description: "Get notified for every message",
                  icon: "notifications-outline",
                },
                {
                  id: "mentions",
                  label: "Mentions Only",
                  description: "Only @mentions and direct messages",
                  icon: "at-outline",
                },
                {
                  id: "none",
                  label: "Nothing",
                  description: "No notifications from this server",
                  icon: "notifications-off-outline",
                },
              ].map((option, index, array) => (
                <TouchableOpacity
                  key={option.id}
                  className={`
                    p-4 flex-row items-center
                    ${index !== array.length - 1 ? "border-b border-dark-700/30" : ""}
                  `}
                >
                  <View
                    className={`
                      w-10 h-10 rounded-xl items-center justify-center mr-3
                      ${isDark ? "bg-dark-700" : "bg-gray-100"}
                    `}
                  >
                    <Ionicons
                      name={option.icon as keyof typeof Ionicons.glyphMap}
                      size={20}
                      color={isDark ? "#80848e" : "#6b7280"}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`font-medium ${
                        isDark ? "text-dark-100" : "text-gray-900"
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
                  <View
                    className={`
                      w-5 h-5 rounded-full border-2 items-center justify-center
                      ${
                        option.id === "mentions"
                          ? "border-brand"
                          : isDark
                            ? "border-dark-500"
                            : "border-gray-300"
                      }
                    `}
                  >
                    {option.id === "mentions" && (
                      <View className="w-2.5 h-2.5 rounded-full bg-brand" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notification Options */}
            <View
              className={`
                mx-4 rounded-2xl overflow-hidden
                ${isDark ? "bg-dark-800" : "bg-white"}
                border ${isDark ? "border-dark-700" : "border-gray-200"}
              `}
            >
              <View className="p-4 border-b border-dark-700/30">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View
                      className={`
                        w-10 h-10 rounded-xl items-center justify-center mr-3
                        ${isDark ? "bg-dark-700" : "bg-gray-100"}
                      `}
                    >
                      <Ionicons
                        name="phone-portrait-outline"
                        size={20}
                        color={isDark ? "#80848e" : "#6b7280"}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`font-medium ${
                          isDark ? "text-dark-100" : "text-gray-900"
                        }`}
                      >
                        Mobile Push
                      </Text>
                      <Text
                        className={`text-sm ${
                          isDark ? "text-dark-400" : "text-gray-500"
                        }`}
                      >
                        Receive push notifications
                      </Text>
                    </View>
                  </View>
                  <Switch value={true} onValueChange={() => {}} />
                </View>
              </View>

              <View className="p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View
                      className={`
                        w-10 h-10 rounded-xl items-center justify-center mr-3
                        ${isDark ? "bg-dark-700" : "bg-gray-100"}
                      `}
                    >
                      <Ionicons
                        name="musical-note-outline"
                        size={20}
                        color={isDark ? "#80848e" : "#6b7280"}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`font-medium ${
                          isDark ? "text-dark-100" : "text-gray-900"
                        }`}
                      >
                        Notification Sound
                      </Text>
                      <Text
                        className={`text-sm ${
                          isDark ? "text-dark-400" : "text-gray-500"
                        }`}
                      >
                        Play sound on notification
                      </Text>
                    </View>
                  </View>
                  <Switch value={true} onValueChange={() => {}} />
                </View>
              </View>
            </View>
          </View>
        );
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Server Settings",
          headerTitleStyle: {
            color: isDark ? "#ffffff" : "#111827",
            fontSize: 18,
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

      <ScrollView className="flex-1">
        {/* Tab Navigation */}
        <View
          className={`
            mx-4 mt-4 mb-6 p-1 rounded-xl flex-row
            ${isDark ? "bg-dark-800" : "bg-gray-200"}
          `}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              className={`
                flex-1 py-2 px-3 rounded-lg flex-row items-center justify-center
                ${activeTab === tab.id ? (isDark ? "bg-dark-700" : "bg-white") : ""}
              `}
            >
              <Ionicons
                name={tab.icon as keyof typeof Ionicons.glyphMap}
                size={16}
                color={
                  activeTab === tab.id
                    ? "#5865f2"
                    : isDark
                      ? "#80848e"
                      : "#6b7280"
                }
              />
              <Text
                className={`
                  ml-2 text-sm font-medium
                  ${
                    activeTab === tab.id
                      ? "text-brand"
                      : isDark
                        ? "text-dark-400"
                        : "text-gray-500"
                  }
                `}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {renderTabContent()}

        {/* Danger Zone */}
        <View className="mx-4 mt-6 mb-8">
          <Text
            className={`text-sm font-semibold uppercase mb-4 ${
              isDark ? "text-red-400" : "text-red-600"
            }`}
          >
            Danger Zone
          </Text>
          <View
            className={`
              rounded-2xl overflow-hidden border
              ${isDark ? "bg-dark-800 border-red-900/50" : "bg-white border-red-200"}
            `}
          >
            <TouchableOpacity
              onPress={handleLeaveServer}
              className="p-4 flex-row items-center border-b border-dark-700/30"
            >
              <Ionicons name="exit-outline" size={20} color="#ef4444" />
              <Text className="ml-3 text-red-500 font-medium">
                Leave Server
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDeleteServer}
              className="p-4 flex-row items-center"
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text className="ml-3 text-red-500 font-medium">
                Delete Server
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      {hasChanges && (
        <View
          className={`
            px-4 py-4 border-t
            ${isDark ? "bg-dark-900 border-dark-700" : "bg-white border-gray-200"}
          `}
        >
          <Button
            title="Save Changes"
            onPress={handleSave}
            isLoading={isLoading}
            fullWidth
            size="lg"
          />
        </View>
      )}
    </SafeAreaView>
  );
}

export default ServerSettingsScreen;
