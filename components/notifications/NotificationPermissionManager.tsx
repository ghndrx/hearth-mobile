import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Alert,
  Linking,
  Platform,
  useColorScheme,
  TouchableOpacity,
} from "react-native";
import * as Notifications from "expo-notifications";
import { Ionicons } from "@expo/vector-icons";
import { Card, Button, SwitchItem, ListDivider } from "../ui";
import { useNotificationContext } from "../../lib/contexts/NotificationContext";

/**
 * Comprehensive notification permission manager that handles:
 * - Initial permission requests
 * - Permission status monitoring
 * - Granular permission settings (iOS)
 * - Fallback to system settings
 * - Permission troubleshooting
 */
export default function NotificationPermissionManager() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const {
    permissionStatus,
    isPermissionGranted,
    requestPermission,
    settings,
    updateSettings,
    isLoading,
    error,
  } = useNotificationContext();

  const [permissionSteps, setPermissionSteps] = useState({
    systemPermission: false,
    appEnabled: false,
    settingsConfigured: false,
  });

  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  // Monitor permission status and update steps
  useEffect(() => {
    setPermissionSteps({
      systemPermission: isPermissionGranted,
      appEnabled: settings?.enabled ?? false,
      settingsConfigured: Object.values(settings || {}).some(Boolean),
    });
  }, [isPermissionGranted, settings]);

  const handleRequestPermission = async () => {
    try {
      const granted = await requestPermission();

      if (granted) {
        Alert.alert(
          "Permission Granted",
          "Notifications are now enabled. You can customize your notification preferences below.",
          [{ text: "OK" }]
        );
      } else {
        setShowTroubleshooting(true);
      }
    } catch (error) {
      console.error("Permission request failed:", error);
      Alert.alert(
        "Error",
        "Failed to request notification permission. Please try again or check your device settings."
      );
    }
  };

  const handleEnableNotifications = async () => {
    try {
      await updateSettings({ enabled: true });
    } catch (error) {
      Alert.alert("Error", "Failed to enable notifications. Please try again.");
    }
  };

  const openSystemSettings = () => {
    Linking.openSettings();
  };

  const getStepIcon = (completed: boolean) => (
    <View
      className={`
        w-6 h-6 rounded-full items-center justify-center
        ${completed
          ? (isDark ? "bg-green-500" : "bg-green-500")
          : (isDark ? "bg-dark-600" : "bg-gray-300")
        }
      `}
    >
      {completed ? (
        <Ionicons name="checkmark" size={14} color="white" />
      ) : (
        <Text className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}>
          {permissionSteps.systemPermission ? "2" : "1"}
        </Text>
      )}
    </View>
  );

  const PermissionStep = ({
    number,
    title,
    description,
    completed,
    action,
    actionTitle,
    loading = false
  }: {
    number: number;
    title: string;
    description: string;
    completed: boolean;
    action?: () => void;
    actionTitle?: string;
    loading?: boolean;
  }) => (
    <View className="flex-row items-start space-x-3 mb-4">
      {getStepIcon(completed)}
      <View className="flex-1">
        <Text className={`font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
          {title}
        </Text>
        <Text className={`text-sm mb-2 ${isDark ? "text-dark-400" : "text-gray-600"}`}>
          {description}
        </Text>
        {action && actionTitle && !completed && (
          <Button
            title={actionTitle}
            variant="primary"
            size="sm"
            onPress={action}
            disabled={loading}
            className="self-start"
          />
        )}
      </View>
    </View>
  );

  if (error) {
    return (
      <Card className={`p-4 ${isDark ? "bg-red-500/10 border-red-500/30" : "bg-red-50 border-red-200"}`}>
        <View className="flex-row items-center mb-2">
          <Ionicons name="alert-circle" size={20} color="#EF4444" style={{ marginRight: 8 }} />
          <Text className="font-semibold text-red-600">Notification Error</Text>
        </View>
        <Text className={`text-sm ${isDark ? "text-red-300" : "text-red-700"}`}>
          {error}
        </Text>
        <Button
          title="Retry"
          variant="primary"
          size="sm"
          className="mt-3"
          onPress={handleRequestPermission}
        />
      </Card>
    );
  }

  return (
    <View>
      {/* Setup Progress */}
      <Card className={`p-4 mb-4 ${isDark ? "bg-dark-800" : "bg-white"}`}>
        <Text className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Notification Setup
        </Text>

        <PermissionStep
          number={1}
          title="Grant System Permission"
          description="Allow Hearth to send notifications through your device's notification system."
          completed={permissionSteps.systemPermission}
          action={handleRequestPermission}
          actionTitle="Grant Permission"
          loading={isLoading}
        />

        <PermissionStep
          number={2}
          title="Enable App Notifications"
          description="Turn on notifications within the Hearth app to receive alerts."
          completed={permissionSteps.appEnabled}
          action={handleEnableNotifications}
          actionTitle="Enable Notifications"
        />

        <PermissionStep
          number={3}
          title="Configure Preferences"
          description="Customize which types of notifications you want to receive."
          completed={permissionSteps.settingsConfigured}
        />
      </Card>

      {/* Current Status */}
      <Card className={`p-4 mb-4 ${isDark ? "bg-dark-800" : "bg-white"}`}>
        <View className="flex-row items-center justify-between mb-3">
          <Text className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
            Current Status
          </Text>
          <View className="flex-row items-center">
            <View
              className={`w-3 h-3 rounded-full mr-2`}
              style={{
                backgroundColor: isPermissionGranted ? "#10B981" : "#EF4444"
              }}
            />
            <Text className={`text-sm font-medium ${isDark ? "text-dark-300" : "text-gray-600"}`}>
              {isPermissionGranted ? "Active" : "Disabled"}
            </Text>
          </View>
        </View>

        <View className={`p-3 rounded-lg ${isDark ? "bg-dark-700" : "bg-gray-50"}`}>
          <View className="flex-row justify-between items-center mb-2">
            <Text className={`text-sm ${isDark ? "text-dark-400" : "text-gray-600"}`}>
              System Permission:
            </Text>
            <Text className={`text-sm font-medium ${
              permissionStatus === 'granted' ? "text-green-500" :
              permissionStatus === 'denied' ? "text-red-500" : "text-amber-500"
            }`}>
              {permissionStatus === 'granted' ? "Granted" :
               permissionStatus === 'denied' ? "Denied" : "Not Set"}
            </Text>
          </View>

          <View className="flex-row justify-between items-center mb-2">
            <Text className={`text-sm ${isDark ? "text-dark-400" : "text-gray-600"}`}>
              App Setting:
            </Text>
            <Text className={`text-sm font-medium ${
              settings?.enabled ? "text-green-500" : "text-gray-500"
            }`}>
              {settings?.enabled ? "Enabled" : "Disabled"}
            </Text>
          </View>

          <View className="flex-row justify-between items-center">
            <Text className={`text-sm ${isDark ? "text-dark-400" : "text-gray-600"}`}>
              Platform:
            </Text>
            <Text className={`text-sm ${isDark ? "text-dark-300" : "text-gray-600"}`}>
              {Platform.OS === 'ios' ? 'iOS' : 'Android'} {Platform.Version}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={openSystemSettings}
          className={`
            mt-3 p-3 rounded-lg border border-dashed
            ${isDark ? "border-dark-600" : "border-gray-300"}
          `}
        >
          <View className="flex-row items-center justify-center">
            <Ionicons
              name="settings-outline"
              size={16}
              color={isDark ? "#80848e" : "#6b7280"}
              style={{ marginRight: 8 }}
            />
            <Text className={`text-sm font-medium ${isDark ? "text-dark-300" : "text-gray-700"}`}>
              Open System Settings
            </Text>
          </View>
        </TouchableOpacity>
      </Card>

      {/* Troubleshooting */}
      {(showTroubleshooting || permissionStatus === 'denied') && (
        <Card className={`p-4 ${isDark ? "bg-amber-500/10 border-amber-500/30" : "bg-amber-50 border-amber-200"}`}>
          <View className="flex-row items-center mb-3">
            <Ionicons name="help-circle" size={20} color="#F59E0B" style={{ marginRight: 8 }} />
            <Text className="font-semibold text-amber-600">Troubleshooting</Text>
          </View>

          <Text className={`text-sm mb-3 ${isDark ? "text-amber-200" : "text-amber-800"}`}>
            If notifications aren't working, try these steps:
          </Text>

          <View className="space-y-2">
            <Text className={`text-sm ${isDark ? "text-amber-300" : "text-amber-700"}`}>
              • Check that notifications are enabled in your device's Settings app
            </Text>
            <Text className={`text-sm ${isDark ? "text-amber-300" : "text-amber-700"}`}>
              • Ensure "Do Not Disturb" mode is disabled
            </Text>
            <Text className={`text-sm ${isDark ? "text-amber-300" : "text-amber-700"}`}>
              • Restart the app if permissions were recently changed
            </Text>
            <Text className={`text-sm ${isDark ? "text-amber-300" : "text-amber-700"}`}>
              • Try turning airplane mode on and off to refresh connection
            </Text>
          </View>

          <View className="flex-row mt-4 space-x-2">
            <Button
              title="Open Settings"
              variant="secondary"
              size="sm"
              onPress={openSystemSettings}
              className="flex-1"
            />
            <Button
              title="Retry"
              variant="primary"
              size="sm"
              onPress={handleRequestPermission}
              className="flex-1"
            />
          </View>
        </Card>
      )}
    </View>
  );
}