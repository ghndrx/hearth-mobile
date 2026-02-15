import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  useColorScheme,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../lib/stores/auth";
import { useNotificationContext } from "../../lib/contexts/NotificationContext";
import {
  ListItem,
  ListDivider,
  SwitchItem,
  Button,
  Card,
} from "../../components/ui";

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useAuthStore();
  const { settings: notificationSettings, updateSettings, isPermissionGranted } = useNotificationContext();

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [readReceipts, setReadReceipts] = useState(true);

  const generalSettings = [
    { icon: "language-outline", label: "Language", value: "English" },
    { icon: "globe-outline", label: "Region", value: "US" },
  ];

  const privacySettings = [
    {
      icon: "lock-closed-outline",
      label: "Change Password",
      onPress: () => {},
    },
    {
      icon: "finger-print-outline",
      label: "Biometric Auth",
      onPress: () => {},
    },
    {
      icon: "shield-checkmark-outline",
      label: "Two-Factor Auth",
      onPress: () => {},
    },
  ];

  const accountSettings = [
    { icon: "mail-outline", label: "Email", value: user?.email || "Not set" },
    { icon: "phone-portrait-outline", label: "Phone", value: "Not set" },
    { icon: "calendar-outline", label: "Date Joined", value: "2024" },
  ];

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Settings",
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
        {/* Notifications Section */}
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
            Notifications
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
            <ListItem
              title="Push Notifications"
              subtitle={
                !isPermissionGranted
                  ? "Permission required"
                  : notificationSettings.enabled
                    ? "Enabled"
                    : "Disabled"
              }
              showChevron
              onPress={() => router.push("/settings/notifications")}
              leftIcon={
                <Ionicons
                  name="notifications-outline"
                  size={22}
                  color={isDark ? "#80848e" : "#6b7280"}
                />
              }
              rightIcon={
                !isPermissionGranted ? (
                  <View className="w-2 h-2 rounded-full bg-amber-500 mr-2" />
                ) : undefined
              }
            />
            <ListDivider />
            <SwitchItem
              title="Email Notifications"
              subtitle="Receive email updates"
              value={emailNotifications}
              onValueChange={setEmailNotifications}
            />
          </View>
        </View>

        {/* Sound & Haptics */}
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
            Sound & Haptics
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
              title="Sounds"
              subtitle="Play notification sounds"
              value={notificationSettings.sounds}
              onValueChange={(value) => updateSettings({ sounds: value })}
            />
            <ListDivider />
            <SwitchItem
              title="Haptics"
              subtitle="Enable haptic feedback"
              value={haptics}
              onValueChange={setHaptics}
            />
          </View>
        </View>

        {/* Display */}
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
            Display
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
              title="Compact Mode"
              subtitle="Show more content with less spacing"
              value={compactMode}
              onValueChange={setCompactMode}
            />
            <ListDivider />
            <SwitchItem
              title="Read Receipts"
              subtitle="Show when you've read messages"
              value={readReceipts}
              onValueChange={setReadReceipts}
            />
          </View>
        </View>

        {/* General */}
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
            General
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
            {generalSettings.map((item, index) => (
              <View key={item.label}>
                <ListItem
                  title={item.label}
                  subtitle={item.value}
                  showChevron
                  leftIcon={
                    <Ionicons
                      name={item.icon as any}
                      size={22}
                      color={isDark ? "#80848e" : "#6b7280"}
                    />
                  }
                />
                {index < generalSettings.length - 1 && <ListDivider inset />}
              </View>
            ))}
          </View>
        </View>

        {/* Privacy & Security */}
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
            Privacy & Security
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
            {privacySettings.map((item, index) => (
              <View key={item.label}>
                <ListItem
                  title={item.label}
                  onPress={item.onPress}
                  showChevron
                  leftIcon={
                    <Ionicons
                      name={item.icon as any}
                      size={22}
                      color={isDark ? "#80848e" : "#6b7280"}
                    />
                  }
                />
                {index < privacySettings.length - 1 && <ListDivider inset />}
              </View>
            ))}
          </View>
        </View>

        {/* Account Info */}
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
            Account
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
            {accountSettings.map((item, index) => (
              <View key={item.label}>
                <ListItem
                  title={item.label}
                  subtitle={item.value}
                  leftIcon={
                    <Ionicons
                      name={item.icon as any}
                      size={22}
                      color={isDark ? "#80848e" : "#6b7280"}
                    />
                  }
                />
                {index < accountSettings.length - 1 && <ListDivider inset />}
              </View>
            ))}
          </View>
        </View>

        {/* Data Usage */}
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
            Data Usage
          </Text>
          <Card className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center">
              <Ionicons
                name="wifi-outline"
                size={22}
                color={isDark ? "#80848e" : "#6b7280"}
              />
              <View className="ml-3">
                <Text
                  className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  Media Auto-Download
                </Text>
                <Text
                  className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}
                >
                  Wi-Fi Only
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={isDark ? "#80848e" : "#6b7280"}
            />
          </Card>
        </View>

        {/* Cache Storage */}
        <View className="mx-4 mt-4">
          <Card className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center">
              <Ionicons
                name="trash-bin-outline"
                size={22}
                color={isDark ? "#80848e" : "#6b7280"}
              />
              <View className="ml-3">
                <Text
                  className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  Clear Cache
                </Text>
                <Text
                  className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}
                >
                  125 MB used
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={isDark ? "#80848e" : "#6b7280"}
            />
          </Card>
        </View>

        {/* Danger Zone */}
        <View className="mx-4 mt-6">
          <Text
            className={`
              text-xs 
              font-semibold 
              uppercase 
              mb-2
              text-red-500
            `}
          >
            Danger Zone
          </Text>
          <View className="rounded-xl overflow-hidden">
            <Button
              title="Delete Account"
              variant="danger"
              fullWidth
              onPress={() => {}}
              leftIcon={
                <Ionicons name="warning-outline" size={20} color="white" />
              }
            />
          </View>
        </View>

        {/* Version */}
        <Text
          className={`
            text-center 
            text-xs 
            mt-8
            mb-8
            ${isDark ? "text-dark-500" : "text-gray-400"}
          `}
        >
          Hearth v0.1.0 • Build 2024.2.14
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
