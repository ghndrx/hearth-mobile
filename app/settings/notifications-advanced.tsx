import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  useColorScheme,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  ListDivider,
  SwitchItem,
  Card,
  Button,
  SelectItem,
} from "../../components/ui";
import { useNotificationContext } from "../../lib/contexts/NotificationContext";
import {
  notificationPermissions,
  NotificationPermissions,
  DEFAULT_PERMISSION_SETTINGS,
  PermissionLevel,
  ServerNotificationSettings,
  PriorityContact,
} from "../../lib/services/notificationPermissions";
import ServerNotificationSettingsCard from "../../components/notifications/ServerNotificationSettings";
import PriorityContactsManager from "../../components/notifications/PriorityContacts";
import { Server, User } from "../../lib/types";

declare const __DEV__: boolean;

export default function AdvancedNotificationSettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const {
    settings: basicSettings,
    updateSettings: updateBasicSettings,
    permissionStatus,
    isPermissionGranted,
    requestPermission,
    expoPushToken,
    isLoading: contextLoading,
    error,
  } = useNotificationContext();

  const [permissions, setPermissions] = useState<NotificationPermissions>(DEFAULT_PERMISSION_SETTINGS);
  const [serverSettings, setServerSettings] = useState<ServerNotificationSettings[]>([]);
  const [priorityContacts, setPriorityContacts] = useState<PriorityContact[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'servers' | 'contacts' | 'advanced'>('general');

  useFocusEffect(
    useCallback(() => {
      loadAllSettings();
    }, [])
  );

  const loadAllSettings = async () => {
    try {
      setIsLoading(true);
      const [permissionSettings, serverList, contactList] = await Promise.all([
        notificationPermissions.getPermissionSettings(),
        notificationPermissions.getServerSettings(),
        notificationPermissions.getPriorityContacts(),
      ]);

      setPermissions(permissionSettings);
      setServerSettings(serverList);
      setPriorityContacts(contactList);

      // TODO: Load actual servers and users from API
      // For now, use mock data
      setServers([
        { id: '1', name: 'Gaming Discord', icon: '', description: '', ownerId: '', memberCount: 150, unreadCount: 5, isOnline: true, createdAt: '' },
        { id: '2', name: 'Work Team', icon: '', description: '', ownerId: '', memberCount: 25, unreadCount: 2, isOnline: true, createdAt: '' },
        { id: '3', name: 'Friends', icon: '', description: '', ownerId: '', memberCount: 8, unreadCount: 0, isOnline: true, createdAt: '' },
      ]);

      setUsers([
        { id: '1', username: 'alice', displayName: 'Alice Johnson', email: 'alice@example.com' },
        { id: '2', username: 'bob', displayName: 'Bob Smith', email: 'bob@example.com' },
        { id: '3', username: 'charlie', displayName: 'Charlie Brown', email: 'charlie@example.com' },
      ]);

    } catch (error) {
      console.error("Failed to load settings:", error);
      Alert.alert("Error", "Failed to load notification settings");
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllSettings();
    setRefreshing(false);
  }, []);

  const updatePermissionSetting = async (
    key: keyof NotificationPermissions,
    value: any
  ) => {
    try {
      const updated = await notificationPermissions.updatePermissionSettings({ [key]: value });
      setPermissions(updated);
    } catch (error) {
      console.error("Failed to update permission setting:", error);
      Alert.alert("Error", "Failed to update setting. Please try again.");
    }
  };

  const handleToggle = async (
    key: keyof NotificationPermissions,
    value: boolean
  ) => {
    await updatePermissionSetting(key, value);
  };

  const handlePermissionLevelChange = async (
    key: keyof NotificationPermissions,
    value: PermissionLevel
  ) => {
    await updatePermissionSetting(key, value);
  };

  const handleRequestPermission = async () => {
    if (permissionStatus === "denied") {
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

  const permissionLevelOptions = [
    { value: 'all', label: 'All', description: 'All notifications' },
    { value: 'mentions_only', label: 'Mentions Only', description: 'Only @mentions and replies' },
    { value: 'dm_only', label: 'DMs Only', description: 'Only direct messages' },
    { value: 'none', label: 'None', description: 'No notifications' },
  ];

  const renderTabButton = (
    tab: typeof activeTab,
    icon: string,
    label: string,
    count?: number
  ) => (
    <TouchableOpacity
      onPress={() => setActiveTab(tab)}
      className={`flex-1 items-center py-3 border-b-2 ${
        activeTab === tab
          ? 'border-blue-500'
          : (isDark ? 'border-dark-700' : 'border-gray-200')
      }`}
    >
      <View className="flex-row items-center">
        <Ionicons
          name={icon as any}
          size={20}
          color={activeTab === tab ? '#3b82f6' : (isDark ? '#80848e' : '#6b7280')}
        />
        {count !== undefined && count > 0 && (
          <View className="ml-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center">
            <Text className="text-white text-xs font-bold">{count > 9 ? '9+' : count}</Text>
          </View>
        )}
      </View>
      <Text className={`text-xs mt-1 ${
        activeTab === tab
          ? 'text-blue-500 font-medium'
          : (isDark ? 'text-dark-400' : 'text-gray-500')
      }`}>
        {label}
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

      {/* Tab Navigation */}
      <View className={`flex-row ${isDark ? 'bg-dark-800' : 'bg-white'} border-b ${
        isDark ? 'border-dark-700' : 'border-gray-200'
      }`}>
        {renderTabButton('general', 'settings-outline', 'General')}
        {renderTabButton('servers', 'server-outline', 'Servers', serverSettings.filter(s => s.enabled).length)}
        {renderTabButton('contacts', 'star-outline', 'Priority', priorityContacts.length)}
        {renderTabButton('advanced', 'options-outline', 'Advanced')}
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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
                    Enable notifications to use advanced features
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

        {/* Tab Content */}
        {activeTab === 'general' && (
          <View className="space-y-6">
            {/* General Permission Levels */}
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
                Permission Levels
              </Text>
              <View
                className={`
                  rounded-xl
                  overflow-hidden
                  ${isDark ? "bg-dark-800" : "bg-white"}
                  border
                  ${isDark ? "border-dark-700" : "border-gray-200"}
                  ${!isPermissionGranted ? "opacity-50" : ""}
                `}
              >
                <SelectItem
                  title="Direct Messages"
                  subtitle="Private messages from friends"
                  value={permissions.directMessagePermission}
                  options={permissionLevelOptions}
                  onValueChange={(value) =>
                    handlePermissionLevelChange("directMessagePermission", value as PermissionLevel)
                  }
                  disabled={!isPermissionGranted}
                />
                <ListDivider />
                <SelectItem
                  title="Server Messages"
                  subtitle="Default for all server messages"
                  value={permissions.serverMessagePermission}
                  options={permissionLevelOptions}
                  onValueChange={(value) =>
                    handlePermissionLevelChange("serverMessagePermission", value as PermissionLevel)
                  }
                  disabled={!isPermissionGranted}
                />
                <ListDivider />
                <SelectItem
                  title="Mentions"
                  subtitle="When someone @mentions you"
                  value={permissions.mentionPermission}
                  options={permissionLevelOptions}
                  onValueChange={(value) =>
                    handlePermissionLevelChange("mentionPermission", value as PermissionLevel)
                  }
                  disabled={!isPermissionGranted}
                />
                <ListDivider />
                <SelectItem
                  title="Calls"
                  subtitle="Voice and video call notifications"
                  value={permissions.callPermission}
                  options={permissionLevelOptions}
                  onValueChange={(value) =>
                    handlePermissionLevelChange("callPermission", value as PermissionLevel)
                  }
                  disabled={!isPermissionGranted}
                />
              </View>
            </View>

            {/* Content & Privacy */}
            <View className="mx-4">
              <Text
                className={`
                  text-xs
                  font-semibold
                  uppercase
                  mb-2
                  ${isDark ? "text-dark-400" : "text-gray-500"}
                `}
              >
                Content & Privacy
              </Text>
              <View
                className={`
                  rounded-xl
                  overflow-hidden
                  ${isDark ? "bg-dark-800" : "bg-white"}
                  border
                  ${isDark ? "border-dark-700" : "border-gray-200"}
                  ${!isPermissionGranted ? "opacity-50" : ""}
                `}
              >
                <SwitchItem
                  title="Show Sender Names"
                  subtitle="Display who sent the message"
                  value={permissions.showSenderNames}
                  onValueChange={(value) => handleToggle("showSenderNames", value)}
                  disabled={!isPermissionGranted}
                />
                <ListDivider />
                <SwitchItem
                  title="Show Message Previews"
                  subtitle="Display message content in notifications"
                  value={permissions.showMessagePreviews}
                  onValueChange={(value) => handleToggle("showMessagePreviews", value)}
                  disabled={!isPermissionGranted}
                />
                <ListDivider />
                <SwitchItem
                  title="Hide Content in Lock Screen"
                  subtitle="Hide sensitive content when locked"
                  value={permissions.hideContentInLockScreen}
                  onValueChange={(value) => handleToggle("hideContentInLockScreen", value)}
                  disabled={!isPermissionGranted}
                />
              </View>
            </View>

            {/* Enhanced Features */}
            <View className="mx-4">
              <Text
                className={`
                  text-xs
                  font-semibold
                  uppercase
                  mb-2
                  ${isDark ? "text-dark-400" : "text-gray-500"}
                `}
              >
                Enhanced Features
              </Text>
              <View
                className={`
                  rounded-xl
                  overflow-hidden
                  ${isDark ? "bg-dark-800" : "bg-white"}
                  border
                  ${isDark ? "border-dark-700" : "border-gray-200"}
                  ${!isPermissionGranted ? "opacity-50" : ""}
                `}
              >
                <SwitchItem
                  title="Smart Batching"
                  subtitle="Group related notifications together"
                  value={permissions.smartBatching}
                  onValueChange={(value) => handleToggle("smartBatching", value)}
                  disabled={!isPermissionGranted}
                />
                <ListDivider />
                <SwitchItem
                  title="Inline Replies"
                  subtitle="Reply directly from notifications"
                  value={permissions.allowInlineReplies}
                  onValueChange={(value) => handleToggle("allowInlineReplies", value)}
                  disabled={!isPermissionGranted}
                />
                <ListDivider />
                <SwitchItem
                  title="Rich Media"
                  subtitle="Show images and videos in notifications"
                  value={permissions.allowRichMedia}
                  onValueChange={(value) => handleToggle("allowRichMedia", value)}
                  disabled={!isPermissionGranted}
                />
              </View>
            </View>
          </View>
        )}

        {activeTab === 'servers' && (
          <View className="mx-4 mt-4 space-y-3">
            <View>
              <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Server Notifications
              </Text>
              <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
                Customize notifications for each server
              </Text>
            </View>

            {servers.map((server) => (
              <ServerNotificationSettingsCard
                key={server.id}
                server={server}
                onSettingsChange={(settings) => {
                  setServerSettings(prev =>
                    prev.some(s => s.serverId === server.id)
                      ? prev.map(s => s.serverId === server.id ? settings : s)
                      : [...prev, settings]
                  );
                }}
              />
            ))}
          </View>
        )}

        {activeTab === 'contacts' && (
          <View className="mx-4 mt-4">
            <PriorityContactsManager
              users={users}
              onContactsChange={setPriorityContacts}
            />
          </View>
        )}

        {activeTab === 'advanced' && (
          <View className="space-y-6">
            {/* Security & Biometrics */}
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
                Security & Privacy
              </Text>
              <View
                className={`
                  rounded-xl
                  overflow-hidden
                  ${isDark ? "bg-dark-800" : "bg-white"}
                  border
                  ${isDark ? "border-dark-700" : "border-gray-200"}
                  ${!isPermissionGranted ? "opacity-50" : ""}
                `}
              >
                <SwitchItem
                  title="Biometric Authentication"
                  subtitle="Require biometric auth for sensitive notifications"
                  value={permissions.requireBiometricForSensitive}
                  onValueChange={(value) => handleToggle("requireBiometricForSensitive", value)}
                  disabled={!isPermissionGranted}
                />
                <ListDivider />
                <SwitchItem
                  title="Hide from Other Apps"
                  subtitle="Hide notifications when Hearth is active"
                  value={permissions.hideNotificationsFromOtherApps}
                  onValueChange={(value) => handleToggle("hideNotificationsFromOtherApps", value)}
                  disabled={!isPermissionGranted}
                />
              </View>
            </View>

            {/* Data & Storage */}
            <View className="mx-4">
              <Text
                className={`
                  text-xs
                  font-semibold
                  uppercase
                  mb-2
                  ${isDark ? "text-dark-400" : "text-gray-500"}
                `}
              >
                Data & Storage
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
                <TouchableOpacity
                  className="p-4"
                  onPress={() => {
                    Alert.alert(
                      'Export Settings',
                      'Export all notification settings as a backup file?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Export', onPress: async () => {
                          try {
                            const exported = await notificationPermissions.exportSettings();
                            console.log('Exported settings:', exported);
                            Alert.alert('Success', 'Settings exported successfully');
                          } catch (error) {
                            Alert.alert('Error', 'Failed to export settings');
                          }
                        }},
                      ]
                    );
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Export Settings
                      </Text>
                      <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
                        Backup all notification preferences
                      </Text>
                    </View>
                    <Ionicons name="download-outline" size={20} color={isDark ? '#80848e' : '#6b7280'} />
                  </View>
                </TouchableOpacity>
                <ListDivider />
                <TouchableOpacity
                  className="p-4"
                  onPress={() => {
                    Alert.alert(
                      'Reset All Settings',
                      'This will reset all notification settings to default values. This action cannot be undone.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Reset All',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await notificationPermissions.resetAllSettings();
                              await loadAllSettings();
                              Alert.alert('Success', 'All settings have been reset');
                            } catch (error) {
                              Alert.alert('Error', 'Failed to reset settings');
                            }
                          },
                        },
                      ]
                    );
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className={`font-medium text-red-500`}>
                        Reset All Settings
                      </Text>
                      <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
                        Restore default notification preferences
                      </Text>
                    </View>
                    <Ionicons name="refresh" size={20} color="#ef4444" />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

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