import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  useColorScheme,
  TouchableOpacity,
  Alert,
  Linking,
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

  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleToggle = async (
    key: keyof typeof settings,
    value: boolean
  ) => {
    // Optimistic update
    setLocalSettings((prev) => ({ ...prev, [key]: value }));

    try {
      await updateSettings({ [key]: value });
    } catch {
      // Revert on error
      setLocalSettings((prev) => ({ ...prev, [key]: !value }));
      Alert.alert("Error", "Failed to update setting. Please try again.");
    }
  };

  const handleRequestPermission = async () => {
    if (permissionStatus === "denied") {
      // Permission was denied, need to go to settings
      Alert.alert(
        "Notifications Disabled",
        "To enable notifications, please go to Settings and allow notifications for Hearth.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => Linking.openSettings(),
          },
        ]
      );
    } else {
      await requestPermission();
    }
  };

  const openSystemSettings = () => {
    Linking.openSettings();
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
        {/* Permission Banner */}
        {!isPermissionGranted && (
          <View className="mx-4 mt-4">
            <Card className="p-4">
              <View className="flex-row items-center">
                <View
                  className={`
                    w-12 h-12 rounded-full items-center justify-center mr-4
                    ${isDark ? "bg-amber-500/20" : "bg-amber-100"}
                  `}
                >
                  <Ionicons
                    name="notifications-off-outline"
                    size={24}
                    color="#f59e0b"
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className={`font-semibold ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Notifications Disabled
                  </Text>
                  <Text
                    className={`text-sm mt-0.5 ${
                      isDark ? "text-dark-400" : "text-gray-500"
                    }`}
                  >
                    Enable notifications to stay updated
                  </Text>
                </View>
              </View>
              <Button
                title="Enable Notifications"
                variant="primary"
                size="sm"
                className="mt-4"
                onPress={handleRequestPermission}
                leftIcon={
                  <Ionicons name="notifications" size={16} color="white" />
                }
              />
            </Card>
          </View>
        )}

        {/* Error Banner */}
        {error && (
          <View className="mx-4 mt-4">
            <Card className="p-4 bg-red-500/10 border-red-500/30">
              <Text className="text-red-500">{error}</Text>
            </Card>
          </View>
        )}

        {/* Master Toggle */}
        <View className="mx-4 mt-4">
          <Text
            className={`
              text-xs 
              font-semibold 
              uppercase 
              mb-2
              ${isDark ? "text-dark-400" : "text-gray-500"}
            `}
          >
            Master Control
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
            <SwitchItem
              title="Enable All Notifications"
              subtitle={
                localSettings.enabled
                  ? "You will receive notifications"
                  : "All notifications are disabled"
              }
              value={localSettings.enabled}
              onValueChange={(value) => handleToggle("enabled", value)}
              disabled={!isPermissionGranted || isLoading}
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
              ${!localSettings.enabled ? "opacity-50" : ""}
            `}
          >
            <SwitchItem
              title="Messages"
              subtitle="Direct messages and channel messages"
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

        {/* Alerts */}
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
            Alerts
          </Text>
          <View
            className={`
              rounded-xl
              overflow-hidden
              ${isDark ? "bg-dark-800" : "bg-white"}
              border
              ${isDark ? "border-dark-700" : "border-gray-200"}
              ${!localSettings.enabled ? "opacity-50" : ""}
            `}
          >
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
              ${!localSettings.enabled ? "opacity-50" : ""}
            `}
          >
            <SwitchItem
              title="Enable Quiet Hours"
              subtitle={
                localSettings.quietHoursEnabled
                  ? `${localSettings.quietHoursStart} - ${localSettings.quietHoursEnd}`
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
              appear in your notification center.
            </Text>
          )}
        </View>

        {/* System Settings Link */}
        <View className="mx-4 mt-6">
          <TouchableOpacity
            onPress={openSystemSettings}
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
                name="settings-outline"
                size={22}
                color={isDark ? "#80848e" : "#6b7280"}
              />
              <Text
                className={`ml-3 font-medium ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                System Notification Settings
              </Text>
            </View>
            <Ionicons
              name="open-outline"
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
              Debug
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
                Permission: {permissionStatus}
              </Text>
              <Text
                className={`text-xs mt-1 ${
                  isDark ? "text-dark-400" : "text-gray-500"
                }`}
              >
                Platform: {Platform.OS} {Platform.Version}
              </Text>
            </Card>
          </View>
        )}

        {!__DEV__ && <View className="h-8" />}
      </ScrollView>
    </SafeAreaView>
  );
}
