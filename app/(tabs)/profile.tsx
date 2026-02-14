import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../lib/stores/auth";
import {
  Avatar,
  Card,
  ListItem,
  ListSection,
  ListDivider,
  SwitchItem,
  Button,
  Badge,
} from "../../components/ui";

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user, logout } = useAuthStore();

  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(isDark);
  const [sounds, setSounds] = useState(true);

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const profileActions = [
    { icon: "person-outline", label: "Edit Profile", onPress: () => {} },
    { icon: "shield-outline", label: "Privacy & Safety", onPress: () => {} },
    {
      icon: "notifications-outline",
      label: "Notifications",
      onPress: () => {},
    },
    { icon: "color-palette-outline", label: "Appearance", onPress: () => {} },
  ];

  const supportActions = [
    { icon: "help-circle-outline", label: "Help Center", onPress: () => {} },
    { icon: "mail-outline", label: "Contact Support", onPress: () => {} },
    { icon: "information-circle-outline", label: "About", onPress: () => {} },
  ];

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Profile",
          headerTitleStyle: {
            color: isDark ? "#ffffff" : "#111827",
            fontSize: 20,
            fontWeight: "bold",
          },
          headerStyle: {
            backgroundColor: isDark ? "#1e1f22" : "#ffffff",
          },
          headerRight: () => (
            <TouchableOpacity className="mr-4">
              <Ionicons
                name="settings-outline"
                size={24}
                color={isDark ? "#80848e" : "#6b7280"}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView className="flex-1">
        {/* Profile Header */}
        <View
          className={`
            mx-4 
            mt-4 
            p-6 
            rounded-2xl
            items-center
            ${isDark ? "bg-dark-800" : "bg-white"}
          `}
        >
          <Avatar
            uri={user?.avatar}
            name={user?.displayName || "User"}
            size="xl"
            status="online"
            showStatus
          />
          <Text
            className={`
              text-xl 
              font-bold 
              mt-4
              ${isDark ? "text-white" : "text-gray-900"}
            `}
          >
            {user?.displayName || "User"}
          </Text>
          <Text
            className={`
              text-sm
              mt-1
              ${isDark ? "text-dark-400" : "text-gray-500"}
            `}
          >
            @{user?.username || "username"}
          </Text>
          <View className="flex-row mt-4 space-x-2">
            <Badge variant="primary" size="sm">
              Online
            </Badge>
            <Badge variant="default" size="sm">
              Member
            </Badge>
          </View>
          <Button
            title="Edit Profile"
            variant="secondary"
            size="sm"
            className="mt-4"
            onPress={() => {}}
            leftIcon={
              <Ionicons
                name="create-outline"
                size={16}
                color={isDark ? "#e0e0e0" : "#374151"}
              />
            }
          />
        </View>

        {/* Stats */}
        <View className="flex-row mx-4 mt-4 space-x-3">
          <Card className="flex-1 items-center py-4" padding="none">
            <Text
              className={`text-2xl font-bold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              12
            </Text>
            <Text
              className={`text-sm mt-1 ${
                isDark ? "text-dark-400" : "text-gray-500"
              }`}
            >
              Servers
            </Text>
          </Card>
          <Card className="flex-1 items-center py-4" padding="none">
            <Text
              className={`text-2xl font-bold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              48
            </Text>
            <Text
              className={`text-sm mt-1 ${
                isDark ? "text-dark-400" : "text-gray-500"
              }`}
            >
              Friends
            </Text>
          </Card>
          <Card className="flex-1 items-center py-4" padding="none">
            <Text
              className={`text-2xl font-bold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              1.2k
            </Text>
            <Text
              className={`text-sm mt-1 ${
                isDark ? "text-dark-400" : "text-gray-500"
              }`}
            >
              Messages
            </Text>
          </Card>
        </View>

        {/* Settings */}
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
            Preferences
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
              title="Push Notifications"
              subtitle="Receive push notifications"
              value={notifications}
              onValueChange={setNotifications}
            />
            <ListDivider />
            <SwitchItem
              title="Dark Mode"
              subtitle="Use dark theme"
              value={darkMode}
              onValueChange={setDarkMode}
            />
            <ListDivider />
            <SwitchItem
              title="Sounds"
              subtitle="Play notification sounds"
              value={sounds}
              onValueChange={setSounds}
            />
          </View>
        </View>

        {/* Quick Actions */}
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
            Quick Actions
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
            {profileActions.map((action, index) => (
              <View key={action.label}>
                <ListItem
                  title={action.label}
                  onPress={action.onPress}
                  showChevron
                  leftIcon={
                    <Ionicons
                      name={action.icon as any}
                      size={22}
                      color={isDark ? "#80848e" : "#6b7280"}
                    />
                  }
                />
                {index < profileActions.length - 1 && <ListDivider inset />}
              </View>
            ))}
          </View>
        </View>

        {/* Support */}
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
            Support
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
            {supportActions.map((action, index) => (
              <View key={action.label}>
                <ListItem
                  title={action.label}
                  onPress={action.onPress}
                  showChevron
                  leftIcon={
                    <Ionicons
                      name={action.icon as any}
                      size={22}
                      color={isDark ? "#80848e" : "#6b7280"}
                    />
                  }
                />
                {index < supportActions.length - 1 && <ListDivider inset />}
              </View>
            ))}
          </View>
        </View>

        {/* Sign Out */}
        <View className="mx-4 mt-6 mb-8">
          <Button
            title="Sign Out"
            variant="danger"
            fullWidth
            onPress={handleLogout}
            leftIcon={
              <Ionicons name="log-out-outline" size={20} color="white" />
            }
          />
        </View>

        {/* App Version */}
        <Text
          className={`
            text-center 
            text-xs 
            mb-8
            ${isDark ? "text-dark-500" : "text-gray-400"}
          `}
        >
          Hearth v0.1.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
