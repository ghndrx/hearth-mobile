import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  useColorScheme,
  TouchableOpacity,
  Alert,
  Platform,
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
import { useNotificationContext } from "../../lib/contexts/NotificationContext";
import { usePermissionManager } from "../../lib/hooks/usePermissionManager";
import type {
  NotificationSettings,
  CategoryAlertConfig,
  QuietHoursSchedule,
  ChannelNotificationOverride,
  NotificationLevel,
} from "../../lib/services/notifications";
import {
  DEFAULT_CATEGORY_ALERTS,
  removeChannelOverride,
} from "../../lib/services/notifications";

declare const __DEV__: boolean;

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const NOTIFICATION_LEVEL_LABELS: Record<NotificationLevel, string> = {
  all: "All Messages",
  mentions: "Mentions Only",
  nothing: "Nothing",
  default: "Default",
};

const CATEGORY_LABELS: Record<string, { title: string; subtitle: string }> = {
  dms: { title: "Direct Messages", subtitle: "Sound & vibration for DMs" },
  mentions: { title: "Mentions", subtitle: "Sound & vibration for @mentions" },
  messages: { title: "Channel Messages", subtitle: "Sound & vibration for messages" },
  calls: { title: "Calls", subtitle: "Sound & vibration for incoming calls" },
  serverActivity: { title: "Server Activity", subtitle: "Sound & vibration for server events" },
  serverAnnouncements: { title: "Announcements", subtitle: "Sound & vibration for announcements" },
  friendRequests: { title: "Friend Requests", subtitle: "Sound & vibration for friend requests" },
  voiceChannelEvents: { title: "Voice Events", subtitle: "Sound & vibration for voice channel events" },
};

export default function NotificationSettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const {
    settings,
    updateSettings,
    permissionStatus,
    isPermissionGranted,
    requestPermission,
    expoPushToken,
    isLoading,
    error,
  } = useNotificationContext();

  const {
    notificationStatus,
    openSystemSettings: openSystemSettingsViaManager,
    getRationale,
    refreshPermissions,
    lastUpdated,
  } = usePermissionManager({
    permissions: ["notifications"],
  });

  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleToggle = async (
    key: keyof NotificationSettings,
    value: boolean
  ) => {
    if (key === "enabled" && value && !isPermissionGranted) {
      const success = await handleRequestPermission();
      if (!success) return;
    }

    setLocalSettings((prev) => ({ ...prev, [key]: value }));

    try {
      await updateSettings({ [key]: value });
    } catch (err) {
      setLocalSettings((prev) => ({ ...prev, [key]: !value }));
      Alert.alert("Error", "Failed to update setting. Please try again.");
    }
  };

  const handleRequestPermission = async (): Promise<boolean> => {
    if (permissionStatus === "denied" || notificationStatus?.status === "denied") {
      Alert.alert(
        "Notifications Disabled",
        "To enable notifications, please go to Settings and allow notifications for Hearth.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: openSystemSettings },
        ]
      );
      return false;
    } else {
      try {
        const success = await requestPermission();
        if (success) await refreshPermissions();
        return success;
      } catch (err) {
        console.error("Permission request failed:", err);
        return false;
      }
    }
  };

  const openSystemSettings = async () => {
    try {
      await openSystemSettingsViaManager();
    } catch (err) {
      console.error("Failed to open settings:", err);
      Alert.alert("Error", "Could not open system settings. Please open Settings manually and find Hearth.");
    }
  };

  const handleShowRationale = () => {
    const rationale = getRationale("notifications");
    Alert.alert(
      rationale.title,
      `${rationale.description}\n\nBenefits:\n${rationale.benefits.map(b => `• ${b}`).join('\n')}${rationale.alternatives ? `\n\nAlternative: ${rationale.alternatives}` : ''}`,
      [
        { text: "Maybe Later", style: "cancel" },
        { text: "Enable Now", onPress: handleRequestPermission },
      ]
    );
  };

  // Category alert handlers
  const handleCategoryAlertToggle = async (
    categoryKey: string,
    field: keyof CategoryAlertConfig,
    value: boolean
  ) => {
    const currentAlerts = localSettings.categoryAlerts || DEFAULT_CATEGORY_ALERTS;
    const currentCategory = currentAlerts[categoryKey] || { sound: true, vibration: true };
    const updatedAlerts = {
      ...currentAlerts,
      [categoryKey]: { ...currentCategory, [field]: value },
    };

    setLocalSettings((prev) => ({ ...prev, categoryAlerts: updatedAlerts }));

    try {
      await updateSettings({ categoryAlerts: updatedAlerts });
    } catch (err) {
      setLocalSettings((prev) => ({ ...prev, categoryAlerts: currentAlerts }));
      Alert.alert("Error", "Failed to update category alert setting.");
    }
  };

  // Quiet hours schedule handlers
  const handleQuietHoursScheduleToggle = async (value: boolean) => {
    const schedule: QuietHoursSchedule = {
      ...(localSettings.quietHoursSchedule || {
        enabled: false,
        startTime: "22:00",
        endTime: "07:00",
        days: [],
      }),
      enabled: value,
    };

    setLocalSettings((prev) => ({
      ...prev,
      quietHoursEnabled: value,
      quietHoursSchedule: schedule,
    }));

    try {
      await updateSettings({ quietHoursEnabled: value, quietHoursSchedule: schedule });
    } catch (err) {
      setLocalSettings((prev) => ({
        ...prev,
        quietHoursEnabled: !value,
        quietHoursSchedule: { ...schedule, enabled: !value },
      }));
      Alert.alert("Error", "Failed to update quiet hours.");
    }
  };

  const handleQuietHoursDayToggle = async (dayIndex: number) => {
    const schedule = localSettings.quietHoursSchedule || {
      enabled: true,
      startTime: "22:00",
      endTime: "07:00",
      days: [],
    };

    const currentDays = schedule.days || [];
    const updatedDays = currentDays.includes(dayIndex)
      ? currentDays.filter((d) => d !== dayIndex)
      : [...currentDays, dayIndex].sort();

    const updatedSchedule: QuietHoursSchedule = { ...schedule, days: updatedDays };

    setLocalSettings((prev) => ({ ...prev, quietHoursSchedule: updatedSchedule }));

    try {
      await updateSettings({ quietHoursSchedule: updatedSchedule });
    } catch (err) {
      setLocalSettings((prev) => ({ ...prev, quietHoursSchedule: schedule }));
    }
  };

  // Channel override handler
  const handleRemoveOverride = async (override: ChannelNotificationOverride) => {
    Alert.alert(
      "Remove Override",
      `Reset notifications for ${override.name} to default?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removeChannelOverride(override.id, override.type);
              const updatedOverrides = localSettings.channelOverrides.filter(
                (o) => !(o.id === override.id && o.type === override.type)
              );
              setLocalSettings((prev) => ({ ...prev, channelOverrides: updatedOverrides }));
            } catch (err) {
              Alert.alert("Error", "Failed to remove override.");
            }
          },
        },
      ]
    );
  };

  const getPermissionStatusIcon = () => {
    if (isPermissionGranted) {
      return <Ionicons name="checkmark-circle" size={20} color="#10b981" />;
    } else if (permissionStatus === "denied") {
      return <Ionicons name="close-circle" size={20} color="#ef4444" />;
    } else {
      return <Ionicons name="help-circle" size={20} color="#f59e0b" />;
    }
  };

  const getPermissionStatusText = () => {
    if (isPermissionGranted) return "Granted";
    if (permissionStatus === "denied") return "Denied";
    if (permissionStatus === "undetermined") return "Not Requested";
    return "Unknown";
  };

  const sectionDisabled = !localSettings.enabled || !isPermissionGranted;
  const sectionStyle = sectionDisabled ? "opacity-50" : "";

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Notifications",
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

      <ScrollView className="flex-1">
        {/* Permission Status Card */}
        <View className="mx-4 mt-4">
          <Card className="p-4">
            <View className="flex-row items-center justify-between mb-4">
              <Text
                className={`text-lg font-semibold ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Permission Status
              </Text>
              <TouchableOpacity onPress={refreshPermissions} className="p-1">
                <Ionicons
                  name="refresh"
                  size={20}
                  color={isDark ? "#80848e" : "#6b7280"}
                />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                {getPermissionStatusIcon()}
                <Text
                  className={`ml-2 font-medium ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {getPermissionStatusText()}
                </Text>
              </View>

              {!isPermissionGranted && (
                <View className="flex-row space-x-2">
                  <TouchableOpacity
                    onPress={handleShowRationale}
                    className={`px-3 py-1 rounded-md ${
                      isDark ? "bg-blue-500/20" : "bg-blue-100"
                    }`}
                  >
                    <Text className="text-blue-500 text-xs font-medium">
                      Why?
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleRequestPermission}
                    className={`px-3 py-1 rounded-md ${
                      isDark ? "bg-green-500/20" : "bg-green-100"
                    }`}
                  >
                    <Text className="text-green-500 text-xs font-medium">
                      {permissionStatus === "denied" ? "Settings" : "Grant"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {lastUpdated && (
              <Text
                className={`text-xs mt-2 ${
                  isDark ? "text-dark-400" : "text-gray-500"
                }`}
              >
                Last checked: {lastUpdated.toLocaleTimeString()}
              </Text>
            )}

            {notificationStatus?.message && (
              <Text
                className={`text-xs mt-2 ${
                  notificationStatus.granted ? "text-green-600" : "text-amber-600"
                }`}
              >
                {notificationStatus.message}
              </Text>
            )}
          </Card>
        </View>

        {/* Permission Banner for Non-Granted State */}
        {!isPermissionGranted && (
          <View className="mx-4 mt-4">
            <Card className={`p-4 ${
              permissionStatus === "denied"
                ? "bg-red-500/10 border-red-500/30"
                : "bg-amber-500/10 border-amber-500/30"
            }`}>
              <View className="flex-row items-center">
                <View
                  className={`
                    w-12 h-12 rounded-full items-center justify-center mr-4
                    ${permissionStatus === "denied"
                      ? (isDark ? "bg-red-500/20" : "bg-red-100")
                      : (isDark ? "bg-amber-500/20" : "bg-amber-100")
                    }
                  `}
                >
                  <Ionicons
                    name={permissionStatus === "denied" ? "close-circle-outline" : "notifications-off-outline"}
                    size={24}
                    color={permissionStatus === "denied" ? "#ef4444" : "#f59e0b"}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className={`font-semibold ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {permissionStatus === "denied"
                      ? "Notifications Blocked"
                      : "Notifications Not Enabled"
                    }
                  </Text>
                  <Text
                    className={`text-sm mt-0.5 ${
                      isDark ? "text-dark-400" : "text-gray-500"
                    }`}
                  >
                    {permissionStatus === "denied"
                      ? "You'll need to enable notifications in System Settings"
                      : "Grant permission to receive notifications"
                    }
                  </Text>
                </View>
              </View>
              <View className="flex-row mt-4 space-x-2">
                <Button
                  title="Learn Why"
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onPress={handleShowRationale}
                  leftIcon={
                    <Ionicons name="information-circle" size={16} color={isDark ? "#80848e" : "#6b7280"} />
                  }
                />
                <Button
                  title={permissionStatus === "denied" ? "Open Settings" : "Grant Permission"}
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  onPress={handleRequestPermission}
                  leftIcon={
                    <Ionicons
                      name={permissionStatus === "denied" ? "settings" : "notifications"}
                      size={16}
                      color="white"
                    />
                  }
                />
              </View>
            </Card>
          </View>
        )}

        {/* Error Banner */}
        {error && (
          <View className="mx-4 mt-4">
            <Card className="p-4 bg-red-500/10 border-red-500/30">
              <View className="flex-row items-center">
                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                <Text className="ml-2 text-red-500 flex-1">{error}</Text>
              </View>
            </Card>
          </View>
        )}

        {/* Master Toggle */}
        <View className="mx-4 mt-6">
          <View className="flex-row items-center justify-between mb-2">
            <Text
              className={`text-xs font-semibold uppercase ${isDark ? "text-dark-400" : "text-gray-500"}`}
            >
              Master Control
            </Text>
            {isPermissionGranted && (
              <Text className={`text-xs ${isDark ? "text-green-400" : "text-green-600"}`}>
                System Permission: Granted
              </Text>
            )}
          </View>
          <View
            className={`rounded-xl overflow-hidden ${isDark ? "bg-dark-800" : "bg-white"} border ${isDark ? "border-dark-700" : "border-gray-200"}`}
          >
            <SwitchItem
              title="Enable All Notifications"
              subtitle={
                localSettings.enabled
                  ? isPermissionGranted
                    ? "You will receive notifications"
                    : "Enabled (but system permission required)"
                  : "All notifications are disabled"
              }
              value={localSettings.enabled}
              onValueChange={(value) => handleToggle("enabled", value)}
              disabled={isLoading}
            />
          </View>
        </View>

        {/* Notification Types */}
        <View className="mx-4 mt-6">
          <Text
            className={`text-xs font-semibold uppercase mb-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            Notification Types
          </Text>
          <View
            className={`rounded-xl overflow-hidden ${isDark ? "bg-dark-800" : "bg-white"} border ${isDark ? "border-dark-700" : "border-gray-200"} ${sectionStyle}`}
          >
            <SwitchItem
              title="Direct Messages"
              subtitle="Private messages from friends"
              value={localSettings.dms}
              onValueChange={(value) => handleToggle("dms", value)}
              disabled={sectionDisabled || isLoading}
            />
            <ListDivider />
            <SwitchItem
              title="Channel Messages"
              subtitle="Messages in server channels"
              value={localSettings.messages}
              onValueChange={(value) => handleToggle("messages", value)}
              disabled={sectionDisabled || isLoading}
            />
            <ListDivider />
            <SwitchItem
              title="Mentions"
              subtitle="When someone @mentions you"
              value={localSettings.mentions}
              onValueChange={(value) => handleToggle("mentions", value)}
              disabled={sectionDisabled || isLoading}
            />
            <ListDivider />
            <SwitchItem
              title="Calls"
              subtitle="Incoming voice and video calls"
              value={localSettings.calls}
              onValueChange={(value) => handleToggle("calls", value)}
              disabled={sectionDisabled || isLoading}
            />
            <ListDivider />
            <SwitchItem
              title="Server Activity"
              subtitle="Events and updates from servers"
              value={localSettings.serverActivity}
              onValueChange={(value) => handleToggle("serverActivity", value)}
              disabled={sectionDisabled || isLoading}
            />
            <ListDivider />
            <SwitchItem
              title="Server Announcements"
              subtitle="Announcements from server admins"
              value={localSettings.serverAnnouncements}
              onValueChange={(value) => handleToggle("serverAnnouncements", value)}
              disabled={sectionDisabled || isLoading}
            />
            <ListDivider />
            <SwitchItem
              title="Voice Channel Events"
              subtitle="When someone joins or leaves a voice channel"
              value={localSettings.voiceChannelEvents}
              onValueChange={(value) => handleToggle("voiceChannelEvents", value)}
              disabled={sectionDisabled || isLoading}
            />
            <ListDivider />
            <SwitchItem
              title="Friend Requests"
              subtitle="New friend requests and social updates"
              value={localSettings.friendRequests}
              onValueChange={(value) => handleToggle("friendRequests", value)}
              disabled={sectionDisabled || isLoading}
            />
          </View>
        </View>

        {/* Alerts & Presentation */}
        <View className="mx-4 mt-6">
          <Text
            className={`text-xs font-semibold uppercase mb-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            Alerts & Presentation
          </Text>
          <View
            className={`rounded-xl overflow-hidden ${isDark ? "bg-dark-800" : "bg-white"} border ${isDark ? "border-dark-700" : "border-gray-200"} ${sectionStyle}`}
          >
            <SwitchItem
              title="Show Previews"
              subtitle="Show message content in notifications"
              value={localSettings.showPreviews}
              onValueChange={(value) => handleToggle("showPreviews", value)}
              disabled={sectionDisabled || isLoading}
            />
            <ListDivider />
            <SwitchItem
              title="Sounds"
              subtitle="Play notification sounds"
              value={localSettings.sounds}
              onValueChange={(value) => handleToggle("sounds", value)}
              disabled={sectionDisabled || isLoading}
            />
            <ListDivider />
            <SwitchItem
              title="Vibration"
              subtitle="Vibrate on notifications"
              value={localSettings.vibration}
              onValueChange={(value) => handleToggle("vibration", value)}
              disabled={sectionDisabled || isLoading}
            />
            <ListDivider />
            <SwitchItem
              title="Badge Count"
              subtitle="Show unread count on app icon"
              value={localSettings.badgeCount}
              onValueChange={(value) => handleToggle("badgeCount", value)}
              disabled={sectionDisabled || isLoading}
            />
          </View>
        </View>

        {/* Per-Category Sound & Vibration */}
        <View className="mx-4 mt-6">
          <Text
            className={`text-xs font-semibold uppercase mb-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            Per-Category Sound & Vibration
          </Text>
          <View
            className={`rounded-xl overflow-hidden ${isDark ? "bg-dark-800" : "bg-white"} border ${isDark ? "border-dark-700" : "border-gray-200"} ${sectionStyle}`}
          >
            {Object.entries(CATEGORY_LABELS).map(([key, label], index) => {
              const alert = localSettings.categoryAlerts?.[key] || DEFAULT_CATEGORY_ALERTS[key] || { sound: true, vibration: true };
              return (
                <View key={key}>
                  {index > 0 && <ListDivider />}
                  <View className="px-4 py-3">
                    <Text
                      className={`font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}
                    >
                      {label.title}
                    </Text>
                    <View className="flex-row mt-2" style={{ gap: 12 }}>
                      <TouchableOpacity
                        className={`flex-row items-center px-3 py-1.5 rounded-full ${
                          alert.sound
                            ? (isDark ? "bg-brand/20" : "bg-brand/10")
                            : (isDark ? "bg-dark-700" : "bg-gray-100")
                        }`}
                        onPress={() => handleCategoryAlertToggle(key, "sound", !alert.sound)}
                        disabled={sectionDisabled || isLoading}
                      >
                        <Ionicons
                          name={alert.sound ? "volume-high" : "volume-mute"}
                          size={14}
                          color={alert.sound ? "#5865f2" : (isDark ? "#80848e" : "#9ca3af")}
                        />
                        <Text
                          className={`ml-1.5 text-xs font-medium ${
                            alert.sound ? "text-brand" : (isDark ? "text-dark-400" : "text-gray-500")
                          }`}
                        >
                          Sound
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className={`flex-row items-center px-3 py-1.5 rounded-full ${
                          alert.vibration
                            ? (isDark ? "bg-brand/20" : "bg-brand/10")
                            : (isDark ? "bg-dark-700" : "bg-gray-100")
                        }`}
                        onPress={() => handleCategoryAlertToggle(key, "vibration", !alert.vibration)}
                        disabled={sectionDisabled || isLoading}
                      >
                        <Ionicons
                          name={alert.vibration ? "phone-portrait" : "phone-portrait-outline"}
                          size={14}
                          color={alert.vibration ? "#5865f2" : (isDark ? "#80848e" : "#9ca3af")}
                        />
                        <Text
                          className={`ml-1.5 text-xs font-medium ${
                            alert.vibration ? "text-brand" : (isDark ? "text-dark-400" : "text-gray-500")
                          }`}
                        >
                          Vibrate
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Quiet Hours / Do Not Disturb */}
        <View className="mx-4 mt-6">
          <Text
            className={`text-xs font-semibold uppercase mb-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            Do Not Disturb / Quiet Hours
          </Text>
          <View
            className={`rounded-xl overflow-hidden ${isDark ? "bg-dark-800" : "bg-white"} border ${isDark ? "border-dark-700" : "border-gray-200"} ${sectionStyle}`}
          >
            <SwitchItem
              title="Enable Quiet Hours"
              subtitle={
                localSettings.quietHoursEnabled
                  ? `Active: ${localSettings.quietHoursSchedule?.startTime || localSettings.quietHoursStart} - ${localSettings.quietHoursSchedule?.endTime || localSettings.quietHoursEnd}`
                  : "Silence notifications during set times"
              }
              value={localSettings.quietHoursEnabled}
              onValueChange={handleQuietHoursScheduleToggle}
              disabled={sectionDisabled || isLoading}
            />
          </View>

          {localSettings.quietHoursEnabled && localSettings.enabled && (
            <View className="mt-3">
              {/* Time Display */}
              <View
                className={`rounded-xl overflow-hidden ${isDark ? "bg-dark-800" : "bg-white"} border ${isDark ? "border-dark-700" : "border-gray-200"} p-4`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Ionicons name="moon" size={18} color={isDark ? "#80848e" : "#6b7280"} />
                    <Text className={`ml-2 font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                      Schedule
                    </Text>
                  </View>
                  <Text className={`font-mono text-sm ${isDark ? "text-dark-300" : "text-gray-600"}`}>
                    {localSettings.quietHoursSchedule?.startTime || "22:00"} – {localSettings.quietHoursSchedule?.endTime || "07:00"}
                  </Text>
                </View>

                {/* Day Selector */}
                <Text
                  className={`text-xs mt-4 mb-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}
                >
                  {(localSettings.quietHoursSchedule?.days?.length || 0) === 0
                    ? "Active every day (tap to select specific days)"
                    : "Active on selected days"}
                </Text>
                <View className="flex-row justify-between">
                  {DAY_LABELS.map((label, index) => {
                    const isActive = (localSettings.quietHoursSchedule?.days?.length || 0) === 0 ||
                      localSettings.quietHoursSchedule?.days?.includes(index);
                    return (
                      <TouchableOpacity
                        key={label}
                        onPress={() => handleQuietHoursDayToggle(index)}
                        className={`w-9 h-9 rounded-full items-center justify-center ${
                          isActive
                            ? "bg-brand"
                            : (isDark ? "bg-dark-700" : "bg-gray-100")
                        }`}
                        disabled={sectionDisabled || isLoading}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            isActive ? "text-white" : (isDark ? "text-dark-400" : "text-gray-500")
                          }`}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <Text
                className={`text-xs mt-2 ${isDark ? "text-dark-500" : "text-gray-400"}`}
              >
                During quiet hours, notifications will be silenced but still
                appear in your notification center. Uses device timezone.
              </Text>
            </View>
          )}
        </View>

        {/* Per-Channel/Server Overrides */}
        <View className="mx-4 mt-6">
          <Text
            className={`text-xs font-semibold uppercase mb-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            Channel & Server Overrides
          </Text>
          <View
            className={`rounded-xl overflow-hidden ${isDark ? "bg-dark-800" : "bg-white"} border ${isDark ? "border-dark-700" : "border-gray-200"} ${sectionStyle}`}
          >
            {localSettings.channelOverrides.length === 0 ? (
              <View className="px-4 py-6 items-center">
                <Ionicons
                  name="options-outline"
                  size={28}
                  color={isDark ? "#4e5058" : "#9ca3af"}
                />
                <Text
                  className={`text-sm mt-2 text-center ${isDark ? "text-dark-400" : "text-gray-500"}`}
                >
                  No custom overrides set
                </Text>
                <Text
                  className={`text-xs mt-1 text-center ${isDark ? "text-dark-500" : "text-gray-400"}`}
                >
                  Override notification levels per channel or server from their settings pages
                </Text>
              </View>
            ) : (
              localSettings.channelOverrides.map((override, index) => (
                <View key={`${override.type}-${override.id}`}>
                  {index > 0 && <ListDivider />}
                  <TouchableOpacity
                    className="flex-row items-center justify-between px-4 py-3"
                    onPress={() => handleRemoveOverride(override)}
                    disabled={sectionDisabled || isLoading}
                  >
                    <View className="flex-1">
                      <View className="flex-row items-center">
                        <Ionicons
                          name={override.type === "server" ? "server-outline" : "chatbubble-outline"}
                          size={16}
                          color={isDark ? "#80848e" : "#6b7280"}
                        />
                        <Text
                          className={`ml-2 font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}
                        >
                          {override.name}
                        </Text>
                      </View>
                      {override.serverName && (
                        <Text
                          className={`text-xs mt-0.5 ml-6 ${isDark ? "text-dark-400" : "text-gray-500"}`}
                        >
                          {override.serverName}
                        </Text>
                      )}
                    </View>
                    <View className="flex-row items-center">
                      <View
                        className={`px-2 py-1 rounded ${
                          override.level === "nothing"
                            ? "bg-red-500/10"
                            : override.level === "mentions"
                            ? "bg-amber-500/10"
                            : "bg-green-500/10"
                        }`}
                      >
                        <Text
                          className={`text-xs font-medium ${
                            override.level === "nothing"
                              ? "text-red-500"
                              : override.level === "mentions"
                              ? "text-amber-500"
                              : "text-green-500"
                          }`}
                        >
                          {NOTIFICATION_LEVEL_LABELS[override.level]}
                        </Text>
                      </View>
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={isDark ? "#4e5058" : "#9ca3af"}
                        style={{ marginLeft: 8 }}
                      />
                    </View>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Advanced Settings */}
        <View className="mx-4 mt-6">
          <Text
            className={`text-xs font-semibold uppercase mb-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            Advanced
          </Text>

          {/* System Settings Link */}
          <TouchableOpacity
            onPress={openSystemSettings}
            className={`flex-row items-center justify-between p-4 rounded-xl ${isDark ? "bg-dark-800" : "bg-white"} border ${isDark ? "border-dark-700" : "border-gray-200"} mb-3`}
          >
            <View className="flex-row items-center">
              <Ionicons
                name="settings-outline"
                size={22}
                color={isDark ? "#80848e" : "#6b7280"}
              />
              <View className="ml-3">
                <Text className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                  System Notification Settings
                </Text>
                <Text className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                  Manage {Platform.OS === "ios" ? "iOS" : "Android"} notification preferences
                </Text>
              </View>
            </View>
            <Ionicons
              name="open-outline"
              size={20}
              color={isDark ? "#80848e" : "#6b7280"}
            />
          </TouchableOpacity>

          {/* Refresh Permissions */}
          <TouchableOpacity
            onPress={refreshPermissions}
            className={`flex-row items-center justify-between p-4 rounded-xl ${isDark ? "bg-dark-800" : "bg-white"} border ${isDark ? "border-dark-700" : "border-gray-200"}`}
          >
            <View className="flex-row items-center">
              <Ionicons
                name="refresh-outline"
                size={22}
                color={isDark ? "#80848e" : "#6b7280"}
              />
              <View className="ml-3">
                <Text className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                  Refresh Permission Status
                </Text>
                <Text className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                  Check latest permission state from system
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={isDark ? "#80848e" : "#6b7280"}
            />
          </TouchableOpacity>
        </View>

        {/* Debug Info (development only) */}
        {__DEV__ && expoPushToken && (
          <View className="mx-4 mt-6 mb-8">
            <Text
              className={`text-xs font-semibold uppercase mb-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}
            >
              Debug Information
            </Text>
            <Card className="p-4">
              <Text
                className={`text-xs font-mono ${isDark ? "text-dark-300" : "text-gray-600"}`}
                selectable
              >
                Push Token:{"\n"}
                {expoPushToken}
              </Text>
              <Text className={`text-xs mt-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                Context Permission: {permissionStatus || "null"}
              </Text>
              <Text className={`text-xs mt-1 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                Manager Permission: {notificationStatus?.status || "null"}
              </Text>
              <Text className={`text-xs mt-1 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                Platform: {Platform.OS} {Platform.Version}
              </Text>
              <Text className={`text-xs mt-1 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                Can Ask Again: {notificationStatus?.canAskAgain ? "Yes" : "No"}
              </Text>
              <Text className={`text-xs mt-1 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                Channel Overrides: {localSettings.channelOverrides.length}
              </Text>
              <Text className={`text-xs mt-1 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                Quiet Hours: {localSettings.quietHoursEnabled ? "On" : "Off"}
                {localSettings.quietHoursSchedule?.days?.length
                  ? ` (${localSettings.quietHoursSchedule.days.map(d => DAY_LABELS[d]).join(", ")})`
                  : " (Every day)"}
              </Text>
            </Card>
          </View>
        )}

        {!__DEV__ && <View className="h-8" />}
      </ScrollView>
    </SafeAreaView>
  );
}
