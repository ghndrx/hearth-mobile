import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  useColorScheme,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  ListDivider,
  Card,
  Button,
} from "../../components/ui";
import { useNotificationContext } from "../../lib/contexts/NotificationContext";
import NotificationPermissionManager from "../../components/notifications/NotificationPermissionManager";
import PermissionSettings from "../../components/notifications/PermissionSettings";

export default function AdvancedNotificationSettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const {
    settings,
    updateSettings,
    permissionStatus,
    isPermissionGranted,
    isLoading,
    error,
  } = useNotificationContext();

  const [localSettings, setLocalSettings] = useState(settings);
  const [selectedTab, setSelectedTab] = useState<'permissions' | 'settings' | 'advanced'>('permissions');

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

  const handleQuietHoursToggle = async (enabled: boolean) => {
    try {
      await updateSettings({
        quietHoursEnabled: enabled,
        quietHoursStart: enabled ? "22:00" : localSettings?.quietHoursStart || "22:00",
        quietHoursEnd: enabled ? "08:00" : localSettings?.quietHoursEnd || "08:00",
      });
    } catch {
      Alert.alert("Error", "Failed to update quiet hours setting. Please try again.");
    }
  };

  const CustomSwitch = ({
    value,
    onValueChange,
    disabled = false
  }: {
    value: boolean;
    onValueChange: (value: boolean) => void;
    disabled?: boolean;
  }) => (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{
        false: isDark ? "#374151" : "#d1d5db",
        true: "#3b82f6"
      }}
      thumbColor={value ? "#ffffff" : isDark ? "#9ca3af" : "#ffffff"}
      ios_backgroundColor={isDark ? "#374151" : "#d1d5db"}
    />
  );

  const SettingsItem = ({
    title,
    subtitle,
    value,
    onToggle,
    disabled = false,
    icon,
  }: {
    title: string;
    subtitle?: string;
    value: boolean;
    onToggle: (value: boolean) => void;
    disabled?: boolean;
    icon?: string;
  }) => (
    <View className={`p-4 flex-row items-center justify-between ${disabled ? "opacity-50" : ""}`}>
      <View className="flex-1 flex-row items-center">
        {icon && (
          <Ionicons
            name={icon as any}
            size={20}
            color={isDark ? "#80848e" : "#6b7280"}
            style={{ marginRight: 12 }}
          />
        )}
        <View className="flex-1">
          <Text className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
            {title}
          </Text>
          {subtitle && (
            <Text className={`text-sm mt-0.5 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <CustomSwitch
        value={value}
        onValueChange={onToggle}
        disabled={disabled || isLoading}
      />
    </View>
  );

  const TabButton = ({
    id,
    title,
    active,
    onPress
  }: {
    id: string;
    title: string;
    active: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      className={`
        flex-1 py-3 px-4 rounded-lg
        ${active
          ? (isDark ? "bg-blue-500" : "bg-blue-500")
          : (isDark ? "bg-dark-700" : "bg-gray-100")
        }
      `}
    >
      <Text className={`
        text-center font-medium text-sm
        ${active ? "text-white" : (isDark ? "text-dark-300" : "text-gray-600")}
      `}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Advanced Notifications",
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

      {/* Error Banner */}
      {error && (
        <View className="mx-4 mt-4">
          <Card className="p-4 bg-red-500/10 border-red-500/30">
            <Text className="text-red-500">{error}</Text>
          </Card>
        </View>
      )}

      {/* Tab Navigation */}
      <View className="mx-4 mt-4">
        <View className={`
          flex-row p-1 rounded-xl
          ${isDark ? "bg-dark-800" : "bg-white"}
        `}>
          <TabButton
            id="permissions"
            title="Permissions"
            active={selectedTab === 'permissions'}
            onPress={() => setSelectedTab('permissions')}
          />
          <TabButton
            id="settings"
            title="Settings"
            active={selectedTab === 'settings'}
            onPress={() => setSelectedTab('settings')}
          />
          <TabButton
            id="advanced"
            title="Advanced"
            active={selectedTab === 'advanced'}
            onPress={() => setSelectedTab('advanced')}
          />
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Permissions Tab */}
        {selectedTab === 'permissions' && (
          <View className="mx-4 mt-4">
            <NotificationPermissionManager />
            <PermissionSettings onPermissionChanged={(granted) => {
              if (granted) {
                setSelectedTab('settings');
              }
            }} />
          </View>
        )}

        {/* Settings Tab */}
        {selectedTab === 'settings' && (
          <View className="mx-4 mt-4">
            {/* Master Toggle */}
            <View className="mb-6">
              <Text className={`text-xs font-semibold uppercase mb-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                Master Control
              </Text>
              <Card>
                <SettingsItem
                  title="Enable All Notifications"
                  subtitle={
                    localSettings?.enabled
                      ? "You will receive notifications"
                      : "All notifications are disabled"
                  }
                  value={localSettings?.enabled ?? false}
                  onToggle={(value) => handleToggle("enabled", value)}
                  disabled={!isPermissionGranted}
                  icon="notifications-outline"
                />
              </Card>
            </View>

            {/* Notification Types */}
            <View className="mb-6">
              <Text className={`text-xs font-semibold uppercase mb-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                Notification Types
              </Text>
              <Card className={!localSettings?.enabled ? "opacity-50" : ""}>
                <SettingsItem
                  title="Direct Messages"
                  subtitle="Private messages from friends"
                  value={localSettings?.dms ?? false}
                  onToggle={(value) => handleToggle("dms", value)}
                  disabled={!localSettings?.enabled}
                  icon="chatbubble-outline"
                />
                <ListDivider />
                <SettingsItem
                  title="Channel Messages"
                  subtitle="Messages in server channels"
                  value={localSettings?.messages ?? false}
                  onToggle={(value) => handleToggle("messages", value)}
                  disabled={!localSettings?.enabled}
                  icon="chatbubbles-outline"
                />
                <ListDivider />
                <SettingsItem
                  title="Mentions"
                  subtitle="When someone @mentions you"
                  value={localSettings?.mentions ?? false}
                  onToggle={(value) => handleToggle("mentions", value)}
                  disabled={!localSettings?.enabled}
                  icon="at-outline"
                />
                <ListDivider />
                <SettingsItem
                  title="Calls"
                  subtitle="Incoming voice and video calls"
                  value={localSettings?.calls ?? false}
                  onToggle={(value) => handleToggle("calls", value)}
                  disabled={!localSettings?.enabled}
                  icon="call-outline"
                />
                <ListDivider />
                <SettingsItem
                  title="Server Activity"
                  subtitle="Events and updates from servers"
                  value={localSettings?.serverActivity ?? false}
                  onToggle={(value) => handleToggle("serverActivity", value)}
                  disabled={!localSettings?.enabled}
                  icon="server-outline"
                />
                <ListDivider />
                <SettingsItem
                  title="Friend Requests"
                  subtitle="New friend requests and social updates"
                  value={localSettings?.friendRequests ?? false}
                  onToggle={(value) => handleToggle("friendRequests", value)}
                  disabled={!localSettings?.enabled}
                  icon="people-outline"
                />
              </Card>
            </View>

            {/* Alerts */}
            <View className="mb-6">
              <Text className={`text-xs font-semibold uppercase mb-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                Alert Settings
              </Text>
              <Card className={!localSettings?.enabled ? "opacity-50" : ""}>
                <SettingsItem
                  title="Show Previews"
                  subtitle="Show message content in notifications"
                  value={localSettings?.showPreviews ?? false}
                  onToggle={(value) => handleToggle("showPreviews", value)}
                  disabled={!localSettings?.enabled}
                  icon="eye-outline"
                />
                <ListDivider />
                <SettingsItem
                  title="Sounds"
                  subtitle="Play notification sounds"
                  value={localSettings?.sounds ?? false}
                  onToggle={(value) => handleToggle("sounds", value)}
                  disabled={!localSettings?.enabled}
                  icon="volume-medium-outline"
                />
                <ListDivider />
                <SettingsItem
                  title="Vibration"
                  subtitle="Vibrate on notifications"
                  value={localSettings?.vibration ?? false}
                  onToggle={(value) => handleToggle("vibration", value)}
                  disabled={!localSettings?.enabled}
                  icon="phone-portrait-outline"
                />
                <ListDivider />
                <SettingsItem
                  title="Badge Count"
                  subtitle="Show unread count on app icon"
                  value={localSettings?.badgeCount ?? false}
                  onToggle={(value) => handleToggle("badgeCount", value)}
                  disabled={!localSettings?.enabled}
                  icon="radio-button-on-outline"
                />
              </Card>
            </View>
          </View>
        )}

        {/* Advanced Tab */}
        {selectedTab === 'advanced' && (
          <View className="mx-4 mt-4">
            {/* Quiet Hours */}
            <View className="mb-6">
              <Text className={`text-xs font-semibold uppercase mb-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                Quiet Hours
              </Text>
              <Card className={!localSettings?.enabled ? "opacity-50" : ""}>
                <SettingsItem
                  title="Enable Quiet Hours"
                  subtitle={
                    localSettings?.quietHoursEnabled
                      ? `${localSettings.quietHoursStart} - ${localSettings.quietHoursEnd}`
                      : "Disable notifications during set times"
                  }
                  value={localSettings?.quietHoursEnabled ?? false}
                  onToggle={handleQuietHoursToggle}
                  disabled={!localSettings?.enabled}
                  icon="moon-outline"
                />
              </Card>

              {localSettings?.quietHoursEnabled && localSettings?.enabled && (
                <Text className={`text-xs mt-2 ${isDark ? "text-dark-500" : "text-gray-400"}`}>
                  During quiet hours, notifications will be silenced but still appear in your notification center.
                </Text>
              )}
            </View>

            {/* Platform-specific Settings */}
            {Platform.OS === 'ios' && (
              <View className="mb-6">
                <Text className={`text-xs font-semibold uppercase mb-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                  iOS Settings
                </Text>
                <Card>
                  <View className="p-4">
                    <Text className={`font-medium mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                      Critical Alerts
                    </Text>
                    <Text className={`text-sm ${isDark ? "text-dark-400" : "text-gray-600"}`}>
                      Critical alerts can override Do Not Disturb and silent mode.
                      This requires special permissions and is only available for emergency notifications.
                    </Text>
                    <Button
                      title="Learn More"
                      variant="secondary"
                      size="sm"
                      className="mt-3 self-start"
                      onPress={() => {
                        Alert.alert(
                          "Critical Alerts",
                          "Critical alerts are reserved for urgent, time-sensitive information that is important to you. They can override Do Not Disturb and silent mode. This feature requires special authorization from Apple."
                        );
                      }}
                    />
                  </View>
                </Card>
              </View>
            )}

            {/* Testing & Debugging */}
            <View className="mb-6">
              <Text className={`text-xs font-semibold uppercase mb-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                Testing & Debugging
              </Text>
              <Card>
                <TouchableOpacity
                  className="p-4 flex-row items-center justify-between"
                  onPress={() => {
                    Alert.alert(
                      "Test Notification",
                      "A test notification will be sent immediately.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Send",
                          onPress: async () => {
                            // Schedule a test notification
                            try {
                              // This would typically use the notification service
                              Alert.alert("Test Sent", "Check your notification center for the test notification.");
                            } catch (error) {
                              Alert.alert("Error", "Failed to send test notification.");
                            }
                          }
                        }
                      ]
                    );
                  }}
                  disabled={!isPermissionGranted}
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name="send-outline"
                      size={20}
                      color={isDark ? "#80848e" : "#6b7280"}
                      style={{ marginRight: 12 }}
                    />
                    <Text className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                      Send Test Notification
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={isDark ? "#80848e" : "#6b7280"}
                  />
                </TouchableOpacity>

                <ListDivider />

                <TouchableOpacity
                  className="p-4 flex-row items-center justify-between"
                  onPress={() => Linking.openSettings()}
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name="settings-outline"
                      size={20}
                      color={isDark ? "#80848e" : "#6b7280"}
                      style={{ marginRight: 12 }}
                    />
                    <Text className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                      Open System Settings
                    </Text>
                  </View>
                  <Ionicons
                    name="open-outline"
                    size={20}
                    color={isDark ? "#80848e" : "#6b7280"}
                  />
                </TouchableOpacity>
              </Card>
            </View>
          </View>
        )}

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}