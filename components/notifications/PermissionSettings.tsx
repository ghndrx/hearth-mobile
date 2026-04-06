import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Alert,
  Linking,
  Platform,
  useColorScheme,
} from "react-native";
import * as Notifications from "expo-notifications";
import { Ionicons } from "@expo/vector-icons";
import { Card, Button, SwitchItem, ListDivider } from "../ui";
import { useNotificationContext } from "../../lib/contexts/NotificationContext";

interface PermissionSettingsProps {
  onPermissionChanged?: (granted: boolean) => void;
}

export default function PermissionSettings({ onPermissionChanged }: PermissionSettingsProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const {
    permissionStatus,
    isPermissionGranted,
    requestPermission,
    isLoading,
  } = useNotificationContext();

  const [detailedPermissions, setDetailedPermissions] = useState<{
    alert: boolean;
    badge: boolean;
    sound: boolean;
    criticalAlert: boolean;
    announcement: boolean;
  }>({
    alert: false,
    badge: false,
    sound: false,
    criticalAlert: false,
    announcement: false,
  });

  // Load detailed permission status
  useEffect(() => {
    const loadDetailedPermissions = async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status === 'granted') {
          // On iOS, we can check for specific permissions
          if (Platform.OS === 'ios') {
            const permissions = await Notifications.getPermissionsAsync();
            setDetailedPermissions({
              alert: permissions.ios?.allowsAlert ?? false,
              badge: permissions.ios?.allowsBadge ?? false,
              sound: permissions.ios?.allowsSound ?? false,
              criticalAlert: permissions.ios?.allowsCriticalAlerts ?? false,
              announcement: permissions.ios?.allowsAnnouncements ?? false,
            });
          } else {
            // On Android, assume all are granted if notifications are granted
            setDetailedPermissions({
              alert: true,
              badge: true,
              sound: true,
              criticalAlert: false,
              announcement: false,
            });
          }
        }
      } catch (error) {
        console.error("Failed to load detailed permissions:", error);
      }
    };

    if (isPermissionGranted) {
      loadDetailedPermissions();
    }
  }, [isPermissionGranted]);

  const handleRequestPermission = async () => {
    try {
      const granted = await requestPermission();
      onPermissionChanged?.(granted);

      if (!granted) {
        Alert.alert(
          "Permission Required",
          "To receive notifications, please enable notifications for Hearth in your device settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to request notification permission. Please try again.");
    }
  };

  const openSystemSettings = () => {
    Linking.openSettings();
  };

  const getPermissionStatusText = () => {
    switch (permissionStatus) {
      case 'granted':
        return "Granted";
      case 'denied':
        return "Denied";
      case 'undetermined':
        return "Not Set";
      default:
        return "Unknown";
    }
  };

  const getPermissionStatusColor = () => {
    switch (permissionStatus) {
      case 'granted':
        return "#10B981";
      case 'denied':
        return "#EF4444";
      case 'undetermined':
        return "#F59E0B";
      default:
        return "#6B7280";
    }
  };

  return (
    <View>
      {/* Permission Status Card */}
      <Card className={`p-4 ${isDark ? "bg-dark-800" : "bg-white"}`}>
        <View className="flex-row items-center justify-between mb-4">
          <Text className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
            Notification Permissions
          </Text>
          <View className="flex-row items-center">
            <View
              className={`w-3 h-3 rounded-full mr-2`}
              style={{ backgroundColor: getPermissionStatusColor() }}
            />
            <Text className={`font-medium ${isDark ? "text-dark-300" : "text-gray-600"}`}>
              {getPermissionStatusText()}
            </Text>
          </View>
        </View>

        {!isPermissionGranted && (
          <View className={`p-4 rounded-lg mb-4 ${isDark ? "bg-amber-500/10" : "bg-amber-50"}`}>
            <View className="flex-row items-center mb-2">
              <Ionicons
                name="warning-outline"
                size={20}
                color="#F59E0B"
                style={{ marginRight: 8 }}
              />
              <Text className={`font-medium ${isDark ? "text-amber-300" : "text-amber-800"}`}>
                Notifications Disabled
              </Text>
            </View>
            <Text className={`text-sm ${isDark ? "text-amber-200" : "text-amber-700"}`}>
              Enable notifications to receive important updates and messages.
            </Text>
            <Button
              title="Grant Permission"
              variant="primary"
              size="sm"
              className="mt-3"
              onPress={handleRequestPermission}
              disabled={isLoading}
              leftIcon={<Ionicons name="notifications" size={16} color="white" />}
            />
          </View>
        )}

        {isPermissionGranted && Platform.OS === 'ios' && (
          <View>
            <Text className={`text-sm font-medium mb-3 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
              PERMISSION DETAILS
            </Text>

            <View className={`rounded-lg overflow-hidden ${isDark ? "bg-dark-700" : "bg-gray-50"}`}>
              <View className="p-3 flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons
                    name="alert-circle-outline"
                    size={20}
                    color={detailedPermissions.alert ? "#10B981" : "#6B7280"}
                    style={{ marginRight: 12 }}
                  />
                  <Text className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                    Alerts
                  </Text>
                </View>
                <Text className={`text-sm ${detailedPermissions.alert ? "text-green-500" : "text-gray-500"}`}>
                  {detailedPermissions.alert ? "Enabled" : "Disabled"}
                </Text>
              </View>

              <ListDivider />

              <View className="p-3 flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons
                    name="radio-button-on-outline"
                    size={20}
                    color={detailedPermissions.badge ? "#10B981" : "#6B7280"}
                    style={{ marginRight: 12 }}
                  />
                  <Text className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                    Badge Count
                  </Text>
                </View>
                <Text className={`text-sm ${detailedPermissions.badge ? "text-green-500" : "text-gray-500"}`}>
                  {detailedPermissions.badge ? "Enabled" : "Disabled"}
                </Text>
              </View>

              <ListDivider />

              <View className="p-3 flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons
                    name="volume-medium-outline"
                    size={20}
                    color={detailedPermissions.sound ? "#10B981" : "#6B7280"}
                    style={{ marginRight: 12 }}
                  />
                  <Text className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                    Sounds
                  </Text>
                </View>
                <Text className={`text-sm ${detailedPermissions.sound ? "text-green-500" : "text-gray-500"}`}>
                  {detailedPermissions.sound ? "Enabled" : "Disabled"}
                </Text>
              </View>

              {detailedPermissions.criticalAlert && (
                <>
                  <ListDivider />
                  <View className="p-3 flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Ionicons
                        name="flash-outline"
                        size={20}
                        color="#10B981"
                        style={{ marginRight: 12 }}
                      />
                      <Text className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                        Critical Alerts
                      </Text>
                    </View>
                    <Text className="text-sm text-green-500">Enabled</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* System Settings Link */}
        <Button
          title="Open System Settings"
          variant="secondary"
          size="sm"
          className="mt-4"
          onPress={openSystemSettings}
          leftIcon={<Ionicons name="settings-outline" size={16} color={isDark ? "#ffffff" : "#374151"} />}
        />
      </Card>

      {/* Additional Information */}
      {isPermissionGranted && (
        <View className={`mt-4 p-3 rounded-lg ${isDark ? "bg-blue-500/10" : "bg-blue-50"}`}>
          <View className="flex-row items-start">
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#3B82F6"
              style={{ marginTop: 2, marginRight: 8 }}
            />
            <Text className={`text-sm ${isDark ? "text-blue-200" : "text-blue-700"}`}>
              You can further customize notification behavior in the app's notification settings.
              Changes to system-level permissions require using your device's Settings app.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}