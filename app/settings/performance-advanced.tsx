/**
 * Advanced Performance Settings Screen
 * Detailed analytics and advanced controls for power users
 * Part of PN-006: Background processing and delivery optimization
 */

import React from "react";
import {
  View,
  Text,
  ScrollView,
  useColorScheme,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PowerManagementDashboard } from "../../components/power";

export default function AdvancedPerformanceSettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // The PowerManagementDashboard components will handle their own data refresh
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Advanced Performance",
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
          headerRight: () => (
            <TouchableOpacity className="mr-4" onPress={handleRefresh}>
              <Ionicons
                name="refresh"
                size={24}
                color={isDark ? "#80848e" : "#6b7280"}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={isDark ? "#80848e" : "#6b7280"}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Information Header */}
        <View className="mx-4 mt-4 mb-2">
          <View className={`p-4 rounded-xl ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
            <View className="flex-row items-center">
              <Ionicons name="information-circle" size={24} color="#3b82f6" />
              <View className="flex-1 ml-3">
                <Text className={`font-medium ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
                  Advanced Analytics
                </Text>
                <Text className={`text-sm mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                  Detailed performance metrics and battery optimization controls for power users.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Power Management Dashboard */}
        <PowerManagementDashboard />
      </ScrollView>
    </SafeAreaView>
  );
}