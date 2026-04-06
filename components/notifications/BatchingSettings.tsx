import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Alert,
  useColorScheme,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, SwitchItem, ListDivider } from "../ui";
import {
  BatchingConfig,
  NotificationGroupingSettings,
  GroupingKeyType,
  getBatchingConfig,
  saveBatchingConfig,
  getGroupingSettings,
  saveGroupingSettings,
  getPendingGroupCount,
  getPendingNotificationCount,
  clearPendingNotifications,
} from "../../lib/services";

const BATCH_WINDOW_OPTIONS: { label: string; value: number }[] = [
  { label: "2 seconds", value: 2000 },
  { label: "5 seconds", value: 5000 },
  { label: "10 seconds", value: 10000 },
  { label: "30 seconds", value: 30000 },
];

const MAX_GROUP_SIZE_OPTIONS: { label: string; value: number }[] = [
  { label: "5", value: 5 },
  { label: "10", value: 10 },
  { label: "20", value: 20 },
  { label: "50", value: 50 },
];

const GROUPING_STRATEGY_OPTIONS: { label: string; value: GroupingKeyType; description: string }[] = [
  { label: "By Conversation", value: "conversation", description: "Group by sender + channel" },
  { label: "By Sender", value: "sender", description: "Group all from same person" },
  { label: "By Channel", value: "channel", description: "Group all from same channel" },
  { label: "By Time Window", value: "time_window", description: "Group by time proximity" },
];

export default function BatchingSettings() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [config, setConfig] = useState<BatchingConfig | null>(null);
  const [groupingSettings, setGroupingSettings] = useState<NotificationGroupingSettings | null>(null);
  const [pendingGroups, setPendingGroups] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const [batchConfig, groupSettings] = await Promise.all([
        getBatchingConfig(),
        getGroupingSettings(),
      ]);
      setConfig(batchConfig);
      setGroupingSettings(groupSettings);
      setPendingGroups(getPendingGroupCount());
      setPendingCount(getPendingNotificationCount());
    } catch {
      Alert.alert("Error", "Failed to load batching settings.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateConfig = async (updates: Partial<BatchingConfig>) => {
    if (!config) return;
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    try {
      await saveBatchingConfig(newConfig);
    } catch {
      setConfig(config);
      Alert.alert("Error", "Failed to save batching settings.");
    }
  };

  const updateGrouping = async (updates: Partial<NotificationGroupingSettings>) => {
    if (!groupingSettings) return;
    const newSettings = { ...groupingSettings, ...updates };
    setGroupingSettings(newSettings);
    try {
      await saveGroupingSettings(newSettings);
    } catch {
      setGroupingSettings(groupingSettings);
      Alert.alert("Error", "Failed to save grouping settings.");
    }
  };

  const handleClearPending = () => {
    Alert.alert(
      "Clear Pending Notifications",
      `Clear ${pendingCount} pending notification(s) in ${pendingGroups} group(s)?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            clearPendingNotifications();
            setPendingGroups(0);
            setPendingCount(0);
          },
        },
      ]
    );
  };

  const OptionSelector = <T extends string | number>({
    options,
    value,
    onSelect,
    disabled,
  }: {
    options: { label: string; value: T; description?: string }[];
    value: T;
    onSelect: (value: T) => void;
    disabled?: boolean;
  }) => (
    <View className={`flex-row flex-wrap gap-2 ${disabled ? "opacity-50" : ""}`}>
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <TouchableOpacity
            key={String(option.value)}
            onPress={() => !disabled && onSelect(option.value)}
            disabled={disabled}
            className={`
              px-3 py-2 rounded-lg border
              ${isSelected
                ? "bg-blue-500 border-blue-500"
                : isDark
                  ? "bg-dark-700 border-dark-600"
                  : "bg-gray-50 border-gray-200"
              }
            `}
          >
            <Text
              className={`text-sm font-medium ${
                isSelected ? "text-white" : isDark ? "text-dark-300" : "text-gray-600"
              }`}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  if (isLoading || !config || !groupingSettings) {
    return (
      <View className="p-4 items-center">
        <Text className={isDark ? "text-dark-400" : "text-gray-500"}>Loading...</Text>
      </View>
    );
  }

  return (
    <View>
      {/* Enable Batching */}
      <View className="mb-6">
        <Text className={`text-xs font-semibold uppercase mb-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
          Notification Batching
        </Text>
        <Card>
          <SwitchItem
            title="Enable Batching"
            subtitle={
              config.enabled
                ? "Notifications are grouped before delivery"
                : "Each notification is delivered individually"
            }
            value={config.enabled}
            onValueChange={(value) => updateConfig({ enabled: value })}
          />
        </Card>
      </View>

      {/* Batch Window */}
      <View className={`mb-6 ${!config.enabled ? "opacity-50" : ""}`}>
        <Text className={`text-xs font-semibold uppercase mb-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
          Batch Window
        </Text>
        <Card className="p-4">
          <Text className={`text-sm mb-3 ${isDark ? "text-dark-300" : "text-gray-600"}`}>
            How long to wait before delivering a batch
          </Text>
          <OptionSelector
            options={BATCH_WINDOW_OPTIONS}
            value={config.batchWindowMs}
            onSelect={(value) => updateConfig({ batchWindowMs: value })}
            disabled={!config.enabled}
          />
        </Card>
      </View>

      {/* Max Group Size */}
      <View className={`mb-6 ${!config.enabled ? "opacity-50" : ""}`}>
        <Text className={`text-xs font-semibold uppercase mb-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
          Max Notifications Per Group
        </Text>
        <Card className="p-4">
          <Text className={`text-sm mb-3 ${isDark ? "text-dark-300" : "text-gray-600"}`}>
            Maximum notifications before a group is delivered
          </Text>
          <OptionSelector
            options={MAX_GROUP_SIZE_OPTIONS}
            value={config.maxGroupSize}
            onSelect={(value) => updateConfig({ maxGroupSize: value })}
            disabled={!config.enabled}
          />
        </Card>
      </View>

      {/* Grouping Strategy */}
      <View className={`mb-6 ${!config.enabled ? "opacity-50" : ""}`}>
        <Text className={`text-xs font-semibold uppercase mb-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
          Grouping Strategy
        </Text>
        <Card className="p-4">
          <Text className={`text-sm mb-3 ${isDark ? "text-dark-300" : "text-gray-600"}`}>
            How notifications are grouped together
          </Text>
          {GROUPING_STRATEGY_OPTIONS.map((option, index) => {
            const isSelected = option.value === config.groupingStrategy;
            return (
              <React.Fragment key={option.value}>
                {index > 0 && <ListDivider />}
                <TouchableOpacity
                  className={`py-3 flex-row items-center justify-between ${!config.enabled ? "opacity-50" : ""}`}
                  onPress={() => config.enabled && updateConfig({ groupingStrategy: option.value })}
                  disabled={!config.enabled}
                >
                  <View className="flex-1">
                    <Text className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                      {option.label}
                    </Text>
                    <Text className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                      {option.description}
                    </Text>
                  </View>
                  <Ionicons
                    name={isSelected ? "radio-button-on" : "radio-button-off"}
                    size={22}
                    color={isSelected ? "#3b82f6" : isDark ? "#4b5563" : "#9ca3af"}
                  />
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </Card>
      </View>

      {/* Group Summary Toggle */}
      <View className={`mb-6 ${!config.enabled ? "opacity-50" : ""}`}>
        <Text className={`text-xs font-semibold uppercase mb-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
          Display
        </Text>
        <Card>
          <SwitchItem
            title="Show Group Summary"
            subtitle="Display a summary for grouped notifications"
            value={config.showGroupSummary}
            onValueChange={(value) => updateConfig({ showGroupSummary: value })}
            disabled={!config.enabled}
          />
        </Card>
      </View>

      {/* Grouping Toggles */}
      <View className={`mb-6 ${!config.enabled ? "opacity-50" : ""}`}>
        <Text className={`text-xs font-semibold uppercase mb-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
          Grouping Rules
        </Text>
        <Card>
          <SwitchItem
            title="Group by Sender"
            subtitle="Combine notifications from the same person"
            value={groupingSettings.bySender}
            onValueChange={(value) => updateGrouping({ bySender: value })}
            disabled={!config.enabled}
          />
          <ListDivider />
          <SwitchItem
            title="Group by Conversation"
            subtitle="Combine notifications from the same chat"
            value={groupingSettings.byConversation}
            onValueChange={(value) => updateGrouping({ byConversation: value })}
            disabled={!config.enabled}
          />
          <ListDivider />
          <SwitchItem
            title="Group by Channel"
            subtitle="Combine notifications from the same channel"
            value={groupingSettings.byChannel}
            onValueChange={(value) => updateGrouping({ byChannel: value })}
            disabled={!config.enabled}
          />
        </Card>
      </View>

      {/* Pending Stats & Clear */}
      {(pendingGroups > 0 || pendingCount > 0) && (
        <View className="mb-6">
          <Text className={`text-xs font-semibold uppercase mb-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
            Pending Notifications
          </Text>
          <Card className="p-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className={isDark ? "text-dark-300" : "text-gray-600"}>
                {pendingCount} notification(s) in {pendingGroups} group(s)
              </Text>
            </View>
            <TouchableOpacity
              className={`py-2 px-4 rounded-lg self-start ${isDark ? "bg-red-500/20" : "bg-red-50"}`}
              onPress={handleClearPending}
            >
              <Text className="text-red-500 font-medium text-sm">Clear All Pending</Text>
            </TouchableOpacity>
          </Card>
        </View>
      )}
    </View>
  );
}
