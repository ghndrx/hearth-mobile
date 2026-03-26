import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch} from "react-native";
import { useColorScheme } from "../../lib/hooks/useColorScheme";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

type PrivacyOption = "everyone" | "friends" | "nobody";

type PrivacySettings = {
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  showReadReceipts: boolean;
  showTypingIndicator: boolean;
  allowDmsFrom: PrivacyOption;
  allowFriendRequestsFrom: PrivacyOption;
  showInServerMemberList: boolean;
  allowServerInvitesFrom: PrivacyOption;
  shareActivityStatus: boolean;
};

const PRIVACY_LABELS: Record<PrivacyOption, string> = {
  everyone: "Everyone",
  friends: "Friends Only",
  nobody: "Nobody",
};

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [settings, setSettings] = useState<PrivacySettings>({
    showOnlineStatus: true,
    showLastSeen: true,
    showReadReceipts: true,
    showTypingIndicator: true,
    allowDmsFrom: "everyone",
    allowFriendRequestsFrom: "everyone",
    showInServerMemberList: true,
    allowServerInvitesFrom: "friends",
    shareActivityStatus: true,
  });

  const [expandedPicker, setExpandedPicker] = useState<string | null>(null);

  const handleToggle = useCallback(
    (key: keyof PrivacySettings) => (value: boolean) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleOptionSelect = useCallback(
    (key: keyof PrivacySettings, value: PrivacyOption) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSettings((prev) => ({ ...prev, [key]: value }));
      setExpandedPicker(null);
    },
    []
  );

  const ToggleRow = ({
    label,
    description,
    settingKey,
  }: {
    label: string;
    description: string;
    settingKey: keyof PrivacySettings;
  }) => (
    <View
      className={`flex-row items-center justify-between px-4 py-3 ${
        isDark ? "border-dark-700" : "border-gray-100"
      } border-b`}
    >
      <View className="mr-4 flex-1">
        <Text
          className={`text-base ${isDark ? "text-white" : "text-gray-900"}`}
        >
          {label}
        </Text>
        <Text
          className={`mt-0.5 text-sm ${
            isDark ? "text-dark-300" : "text-gray-500"
          }`}
        >
          {description}
        </Text>
      </View>
      <Switch
        value={settings[settingKey] as boolean}
        onValueChange={handleToggle(settingKey)}
        trackColor={{ false: "#767577", true: "#f59e0b" }}
        thumbColor="#ffffff"
      />
    </View>
  );

  const OptionPickerRow = ({
    label,
    description,
    settingKey,
  }: {
    label: string;
    description: string;
    settingKey: keyof PrivacySettings;
  }) => {
    const isExpanded = expandedPicker === settingKey;
    const currentValue = settings[settingKey] as PrivacyOption;

    return (
      <View
        className={`${isDark ? "border-dark-700" : "border-gray-100"} border-b`}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setExpandedPicker(isExpanded ? null : settingKey);
          }}
          className="flex-row items-center justify-between px-4 py-3"
        >
          <View className="mr-4 flex-1">
            <Text
              className={`text-base ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              {label}
            </Text>
            <Text
              className={`mt-0.5 text-sm ${
                isDark ? "text-dark-300" : "text-gray-500"
              }`}
            >
              {description}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Text className="mr-1 text-sm text-hearth-amber">
              {PRIVACY_LABELS[currentValue]}
            </Text>
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={isDark ? "#949ba4" : "#6b7280"}
            />
          </View>
        </Pressable>
        {isExpanded && (
          <View
            className={`mx-4 mb-3 overflow-hidden rounded-lg ${
              isDark ? "bg-dark-800" : "bg-gray-50"
            }`}
          >
            {(["everyone", "friends", "nobody"] as PrivacyOption[]).map(
              (option) => (
                <Pressable
                  key={option}
                  onPress={() => handleOptionSelect(settingKey, option)}
                  className={`flex-row items-center justify-between px-4 py-3 ${
                    option !== "nobody"
                      ? isDark
                        ? "border-dark-700"
                        : "border-gray-200"
                      : ""
                  } ${option !== "nobody" ? "border-b" : ""}`}
                >
                  <Text
                    className={`text-sm ${
                      currentValue === option
                        ? "font-semibold text-hearth-amber"
                        : isDark
                          ? "text-dark-200"
                          : "text-gray-700"
                    }`}
                  >
                    {PRIVACY_LABELS[option]}
                  </Text>
                  {currentValue === option && (
                    <Ionicons name="checkmark" size={18} color="#f59e0b" />
                  )}
                </Pressable>
              )
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Privacy",
          headerStyle: {
            backgroundColor: isDark ? "#1e1f22" : "#ffffff",
          },
          headerTintColor: isDark ? "#ffffff" : "#111827",
        }}
      />
      <ScrollView
        className={`flex-1 ${isDark ? "bg-dark-950" : "bg-gray-50"}`}
      >
        {/* Visibility Section */}
        <Text
          className={`px-4 pb-2 pt-6 text-xs font-bold uppercase tracking-wider ${
            isDark ? "text-dark-300" : "text-gray-500"
          }`}
        >
          Visibility
        </Text>
        <View
          className={`${isDark ? "bg-dark-800" : "bg-white"}`}
        >
          <ToggleRow
            label="Online Status"
            description="Show others when you're online"
            settingKey="showOnlineStatus"
          />
          <ToggleRow
            label="Last Seen"
            description="Show when you were last active"
            settingKey="showLastSeen"
          />
          <ToggleRow
            label="Activity Status"
            description="Share what you're currently doing"
            settingKey="shareActivityStatus"
          />
          <ToggleRow
            label="Server Member List"
            description="Appear in server member lists"
            settingKey="showInServerMemberList"
          />
        </View>

        {/* Messaging Section */}
        <Text
          className={`px-4 pb-2 pt-6 text-xs font-bold uppercase tracking-wider ${
            isDark ? "text-dark-300" : "text-gray-500"
          }`}
        >
          Messaging
        </Text>
        <View
          className={`${isDark ? "bg-dark-800" : "bg-white"}`}
        >
          <ToggleRow
            label="Read Receipts"
            description="Let others know when you've read their messages"
            settingKey="showReadReceipts"
          />
          <ToggleRow
            label="Typing Indicator"
            description="Show when you're typing a message"
            settingKey="showTypingIndicator"
          />
        </View>

        {/* Permissions Section */}
        <Text
          className={`px-4 pb-2 pt-6 text-xs font-bold uppercase tracking-wider ${
            isDark ? "text-dark-300" : "text-gray-500"
          }`}
        >
          Who Can Reach You
        </Text>
        <View
          className={`${isDark ? "bg-dark-800" : "bg-white"}`}
        >
          <OptionPickerRow
            label="Direct Messages"
            description="Who can send you direct messages"
            settingKey="allowDmsFrom"
          />
          <OptionPickerRow
            label="Friend Requests"
            description="Who can send you friend requests"
            settingKey="allowFriendRequestsFrom"
          />
          <OptionPickerRow
            label="Server Invites"
            description="Who can invite you to servers"
            settingKey="allowServerInvitesFrom"
          />
        </View>

        {/* Blocked Users Link */}
        <Text
          className={`px-4 pb-2 pt-6 text-xs font-bold uppercase tracking-wider ${
            isDark ? "text-dark-300" : "text-gray-500"
          }`}
        >
          Safety
        </Text>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/settings/blocked");
          }}
          className={`flex-row items-center justify-between px-4 py-4 ${
            isDark ? "bg-dark-800" : "bg-white"
          }`}
        >
          <View className="flex-row items-center">
            <Ionicons
              name="ban-outline"
              size={20}
              color={isDark ? "#ef4444" : "#dc2626"}
            />
            <Text
              className={`ml-3 text-base ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Blocked Users
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={isDark ? "#949ba4" : "#9ca3af"}
          />
        </Pressable>

        <View className="h-8" />
      </ScrollView>
    </>
  );
}
