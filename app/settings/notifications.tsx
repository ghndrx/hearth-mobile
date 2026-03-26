import { useState, useEffect } from "react";
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

declare const __DEV__: boolean;

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
  const [showRationale, setShowRationale] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleToggle = async (
    key: keyof typeof settings,
    value: boolean
  ) => {
    // If enabling notifications but no permission, request it first
    if (key === "enabled" && value && !isPermissionGranted) {
      const success = await handleRequestPermission();
      if (!success) {
        return; // Don't update setting if permission denied
      }
    }

    // Optimistic update
    setLocalSettings((prev) => ({ ...prev, [key]: value }));

    try {
      await updateSettings({ [key]: value });
    } catch (err) {
      // Revert on error
      setLocalSettings((prev) => ({ ...prev, [key]: !value }));
      Alert.alert("Error", "Failed to update setting. Please try again.");
    }
  };

  const handleRequestPermission = async (): Promise<boolean> => {
    if (permissionStatus === "denied" || notificationStatus?.status === "denied") {
      // Permission was permanently denied, need to go to settings
      Alert.alert(
        "Notifications Disabled",
        "To enable notifications, please go to Settings and allow notifications for Hearth.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Settings",
            onPress: openSystemSettings,
          },
        ]
      );
      return false;
    } else {
      try {
        const success = await requestPermission();
        if (success) {
          // Refresh permission status after successful grant
          await refreshPermissions();
        }
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
        {
          text: "Enable Now",
          onPress: handleRequestPermission,
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
              <TouchableOpacity
                onPress={refreshPermissions}
                className="p-1"
              >
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
              className={`
                text-xs
                font-semibold
                uppercase
                ${isDark ? "text-dark-400" : "text-gray-500"}
              `}
            >
              Master Control
            </Text>
            {isPermissionGranted && (
              <Text
                className={`text-xs ${
                  isDark ? "text-green-400" : "text-green-600"
                }`}
              >
                System Permission: Granted
              </Text>
            )}
          </View>
          <View
            className={`
              rounded-xl
              overflow-hidden
              ${isDark ? "bg-dark-800" : "bg-white"}
              border
              ${isDark ? "border-dark-700" : "border-gray-200"}
            `}
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
            className={`
              text-xs
              font-semibold
              uppercase
              mb-2
              ${isDark ? "text-dark-400" : "text-gray-500"}
            `}
          >
            Notification Types
          </Text>
          <View
            className={`
              rounded-xl
              overflow-hidden
              ${isDark ? "bg-dark-800" : "bg-white"}
              border
              ${isDark ? "border-dark-700" : "border-gray-200"}
              ${(!localSettings.enabled || !isPermissionGranted) ? "opacity-50" : ""}
            `}
          >
            <SwitchItem
              title="Direct Messages"
              subtitle="Private messages from friends"
              value={localSettings.dms}
              onValueChange={(value) => handleToggle("dms", value)}
              disabled={!localSettings.enabled || isLoading}
            />
            <ListDivider />
            <SwitchItem
              title="Channel Messages"
              subtitle="Messages in server channels"
              value={localSettings.messages}
              onValueChange={(value) => handleToggle("messages", value)}
              disabled={!localSettings.enabled || isLoading}
            />
            <ListDivider />
            <SwitchItem
              title="Mentions"
              subtitle="When someone @mentions you"
              value={localSettings.mentions}
              onValueChange={(value) => handleToggle("mentions", value)}
              disabled={!localSettings.enabled || isLoading}
            />
            <ListDivider />
            <SwitchItem
              title="Calls"
              subtitle="Incoming voice and video calls"
              value={localSettings.calls}
              onValueChange={(value) => handleToggle("calls", value)}
              disabled={!localSettings.enabled || isLoading}
            />
            <ListDivider />
            <SwitchItem
              title="Server Activity"
              subtitle="Events and updates from servers"
              value={localSettings.serverActivity}
              onValueChange={(value) => handleToggle("serverActivity", value)}
              disabled={!localSettings.enabled || isLoading}
            />
            <ListDivider />
            <SwitchItem
              title="Friend Requests"
              subtitle="New friend requests and social updates"
              value={localSettings.friendRequests}
              onValueChange={(value) => handleToggle("friendRequests", value)}
              disabled={!localSettings.enabled || isLoading}
            />
          </View>
        </View>

        {/* Alerts & Presentation */}
        <View className="mx-4 mt-6">
          <Text
            className={`
              text-xs
              font-semibold
              uppercase
              mb-2
              ${isDark ? "text-dark-400" : "text-gray-500"}
            `}
          >
            Alerts & Presentation
          </Text>
          <View
            className={`
              rounded-xl
              overflow-hidden
              ${isDark ? "bg-dark-800" : "bg-white"}
              border
              ${isDark ? "border-dark-700" : "border-gray-200"}
              ${(!localSettings.enabled || !isPermissionGranted) ? "opacity-50" : ""}
            `}
          >
            <SwitchItem
              title="Show Previews"
              subtitle="Show message content in notifications"
              value={localSettings.showPreviews}
              onValueChange={(value) => handleToggle("showPreviews", value)}
              disabled={!localSettings.enabled || isLoading}
            />
            <ListDivider />
            <SwitchItem
              title="Sounds"
              subtitle="Play notification sounds"
              value={localSettings.sounds}
              onValueChange={(value) => handleToggle("sounds", value)}
              disabled={!localSettings.enabled || isLoading}
            />
            <ListDivider />
            <SwitchItem
              title="Vibration"
              subtitle="Vibrate on notifications"
              value={localSettings.vibration}
              onValueChange={(value) => handleToggle("vibration", value)}
              disabled={!localSettings.enabled || isLoading}
            />
            <ListDivider />
            <SwitchItem
              title="Badge Count"
              subtitle="Show unread count on app icon"
              value={localSettings.badgeCount}
              onValueChange={(value) => handleToggle("badgeCount", value)}
              disabled={!localSettings.enabled || isLoading}
            />
          </View>
        </View>

        {/* Quiet Hours */}
        <View className="mx-4 mt-6">
          <Text
            className={`
              text-xs
              font-semibold
              uppercase
              mb-2
              ${isDark ? "text-dark-400" : "text-gray-500"}
            `}
          >
            Quiet Hours
          </Text>
          <View
            className={`
              rounded-xl
              overflow-hidden
              ${isDark ? "bg-dark-800" : "bg-white"}
              border
              ${isDark ? "border-dark-700" : "border-gray-200"}
              ${(!localSettings.enabled || !isPermissionGranted) ? "opacity-50" : ""}
            `}
          >
            <SwitchItem
              title="Enable Quiet Hours"
              subtitle={
                localSettings.quietHoursEnabled
                  ? `Active: ${localSettings.quietHoursStart} - ${localSettings.quietHoursEnd}`
                  : "Disable notifications during set times"
              }
              value={localSettings.quietHoursEnabled}
              onValueChange={(value) =>
                handleToggle("quietHoursEnabled", value)
              }
              disabled={!localSettings.enabled || isLoading}
            />
          </View>
          {localSettings.quietHoursEnabled && localSettings.enabled && (
            <Text
              className={`
                text-xs
                mt-2
                ${isDark ? "text-dark-500" : "text-gray-400"}
              `}
            >
              During quiet hours, notifications will be silenced but still
              appear in your notification center. Uses device timezone.
            </Text>
          )}
        </View>

        {/* Advanced Settings */}
        <View className="mx-4 mt-6">
          <Text
            className={`
              text-xs
              font-semibold
              uppercase
              mb-2
              ${isDark ? "text-dark-400" : "text-gray-500"}
            `}
          >
            Advanced
          </Text>

          {/* System Settings Link */}
          <TouchableOpacity
            onPress={openSystemSettings}
            className={`
              flex-row items-center justify-between
              p-4
              rounded-xl
              ${isDark ? "bg-dark-800" : "bg-white"}
              border
              ${isDark ? "border-dark-700" : "border-gray-200"}
              mb-3
            `}
          >
            <View className="flex-row items-center">
              <Ionicons
                name="settings-outline"
                size={22}
                color={isDark ? "#80848e" : "#6b7280"}
              />
              <View className="ml-3">
                <Text
                  className={`font-medium ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  System Notification Settings
                </Text>
                <Text
                  className={`text-xs ${
                    isDark ? "text-dark-400" : "text-gray-500"
                  }`}
                >
                  Manage platform-level notification preferences
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
            className={`
              flex-row items-center justify-between
              p-4
              rounded-xl
              ${isDark ? "bg-dark-800" : "bg-white"}
              border
              ${isDark ? "border-dark-700" : "border-gray-200"}
            `}
          >
            <View className="flex-row items-center">
              <Ionicons
                name="refresh-outline"
                size={22}
                color={isDark ? "#80848e" : "#6b7280"}
              />
              <View className="ml-3">
                <Text
                  className={`font-medium ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Refresh Permission Status
                </Text>
                <Text
                  className={`text-xs ${
                    isDark ? "text-dark-400" : "text-gray-500"
                  }`}
                >
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
              className={`
                text-xs
                font-semibold
                uppercase
                mb-2
                ${isDark ? "text-dark-400" : "text-gray-500"}
              `}
            >
              Debug Information
            </Text>
            <Card className="p-4">
              <Text
                className={`text-xs font-mono ${
                  isDark ? "text-dark-300" : "text-gray-600"
                }`}
                selectable
              >
                Push Token:{"\n"}
                {expoPushToken}
              </Text>
              <Text
                className={`text-xs mt-2 ${
                  isDark ? "text-dark-400" : "text-gray-500"
                }`}
              >
                Context Permission: {permissionStatus || "null"}
              </Text>
              <Text
                className={`text-xs mt-1 ${
                  isDark ? "text-dark-400" : "text-gray-500"
                }`}
              >
                Manager Permission: {notificationStatus?.status || "null"}
              </Text>
              <Text
                className={`text-xs mt-1 ${
                  isDark ? "text-dark-400" : "text-gray-500"
                }`}
              >
                Platform: {Platform.OS} {Platform.Version}
              </Text>
              <Text
                className={`text-xs mt-1 ${
                  isDark ? "text-dark-400" : "text-gray-500"
                }`}
              >
                Can Ask Again: {notificationStatus?.canAskAgain ? "Yes" : "No"}
              </Text>
            </Card>
          </View>
        )}

        {!__DEV__ && <View className="h-8" />}
      </ScrollView>
    </SafeAreaView>
  );
}
