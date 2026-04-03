/**
 * Performance Settings Screen
 * Battery optimization and performance controls
 * Part of PN-006: Background processing and delivery optimization
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  useColorScheme,
  TouchableOpacity,
  Alert,
  Platform,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card, Button, SwitchItem, ListDivider } from "../../components/ui";
import { PowerManagementDashboard } from "../../components/power";
import {
  useBatteryOptimization,
  type PowerMode,
  type PowerSavingFeatures
} from "../../lib/services/batteryOptimization";
import { usePerformanceMonitor } from "../../lib/services/performanceMonitor";
import { useBackgroundProcessing } from "../../lib/services/backgroundProcessing";

export default function PerformanceSettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const {
    setPowerMode,
    getPowerMode,
    getFeatures,
    updateFeature,
    getCurrentBatteryData,
    getRecommendations,
    getBatteryHealth,
  } = useBatteryOptimization();

  const {
    getCapabilities,
    getCurrentPerformance,
    getRecommendations: getPerformanceRecommendations,
  } = usePerformanceMonitor();

  const {
    getMetrics,
    getTaskStats,
    updateThresholds,
  } = useBackgroundProcessing();

  const [currentPowerMode, setCurrentPowerMode] = useState<PowerMode>(getPowerMode());
  const [features, setFeatures] = useState<PowerSavingFeatures>(getFeatures());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const batteryData = getCurrentBatteryData();
  const recommendations = getRecommendations();
  const batteryHealth = getBatteryHealth();
  const deviceCapabilities = getCapabilities();
  const performanceData = getCurrentPerformance();
  const performanceRecommendations = getPerformanceRecommendations();
  const backgroundMetrics = getMetrics();
  const taskStats = getTaskStats();

  // Refresh data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refresh all data
      setCurrentPowerMode(getPowerMode());
      setFeatures(getFeatures());
    } catch (error) {
      console.error('Failed to refresh performance data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle power mode change
  const handlePowerModeChange = async (mode: PowerMode) => {
    if (isUpdating) return;

    setIsUpdating(true);
    try {
      await setPowerMode(mode);
      setCurrentPowerMode(mode);
      setFeatures(getFeatures()); // Refresh features after mode change

      Alert.alert(
        "Power Mode Updated",
        `Switched to ${mode.replace('_', ' ')} mode. Battery optimization settings have been updated.`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error('Failed to update power mode:', error);
      Alert.alert(
        "Error",
        "Failed to update power mode. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle feature toggle
  const handleFeatureToggle = async <K extends keyof PowerSavingFeatures>(
    feature: K,
    value: PowerSavingFeatures[K]
  ) => {
    if (isUpdating) return;

    // Optimistic update
    setFeatures(prev => ({ ...prev, [feature]: value }));

    try {
      await updateFeature(feature, value);
    } catch (error) {
      // Revert on error
      setFeatures(prev => ({ ...prev, [feature]: !value }));
      console.error('Failed to update feature:', error);
      Alert.alert(
        "Error",
        "Failed to update setting. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  // Quick actions for common scenarios
  const handleQuickAction = async (action: 'optimize_battery' | 'max_performance' | 'emergency_saver') => {
    setIsUpdating(true);
    try {
      switch (action) {
        case 'optimize_battery':
          await setPowerMode('balanced');
          break;
        case 'max_performance':
          await setPowerMode('maximum');
          break;
        case 'emergency_saver':
          await setPowerMode('ultra_saver');
          break;
      }

      setCurrentPowerMode(getPowerMode());
      setFeatures(getFeatures());

      Alert.alert(
        "Settings Applied",
        `Quick action applied successfully.`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error('Failed to apply quick action:', error);
      Alert.alert(
        "Error",
        "Failed to apply settings. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Performance & Battery",
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
      >
        {/* Critical Alerts */}
        {batteryData && batteryData.batteryLevel < 15 && (
          <View className="mx-4 mt-4">
            <Card className="p-4 bg-red-500/10 border-red-500/30">
              <View className="flex-row items-center">
                <Ionicons name="battery-dead" size={24} color="#ef4444" />
                <View className="flex-1 ml-3">
                  <Text className="text-red-600 font-semibold">
                    Critical Battery Level
                  </Text>
                  <Text className={`text-sm mt-0.5 ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                    Your battery is critically low. Consider enabling Ultra Saver mode.
                  </Text>
                </View>
              </View>
              <Button
                title="Enable Ultra Saver"
                variant="primary"
                size="sm"
                className="mt-3 bg-red-600"
                onPress={() => handleQuickAction('emergency_saver')}
                disabled={isUpdating}
              />
            </Card>
          </View>
        )}

        {/* Performance Warnings */}
        {performanceData?.thermalState === 'critical' && (
          <View className="mx-4 mt-4">
            <Card className="p-4 bg-orange-500/10 border-orange-500/30">
              <View className="flex-row items-center">
                <Ionicons name="warning" size={24} color="#f97316" />
                <View className="flex-1 ml-3">
                  <Text className="text-orange-600 font-semibold">
                    Device Overheating
                  </Text>
                  <Text className={`text-sm mt-0.5 ${isDark ? 'text-orange-400' : 'text-orange-500'}`}>
                    Your device is running hot. Performance may be throttled.
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* Quick Actions */}
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
            Quick Actions
          </Text>
          <View className="flex-row space-x-2">
            <TouchableOpacity
              onPress={() => handleQuickAction('optimize_battery')}
              disabled={isUpdating}
              className={`flex-1 p-3 rounded-xl border ${
                isUpdating ? 'opacity-50' : ''
              } ${isDark ? 'bg-dark-800 border-dark-700' : 'bg-white border-gray-200'}`}
            >
              <Text className="text-center text-2xl mb-1">🔋</Text>
              <Text className={`text-center text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Optimize Battery
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleQuickAction('max_performance')}
              disabled={isUpdating}
              className={`flex-1 p-3 rounded-xl border ${
                isUpdating ? 'opacity-50' : ''
              } ${isDark ? 'bg-dark-800 border-dark-700' : 'bg-white border-gray-200'}`}
            >
              <Text className="text-center text-2xl mb-1">⚡</Text>
              <Text className={`text-center text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Max Performance
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleQuickAction('emergency_saver')}
              disabled={isUpdating}
              className={`flex-1 p-3 rounded-xl border ${
                isUpdating ? 'opacity-50' : ''
              } ${isDark ? 'bg-dark-800 border-dark-700' : 'bg-white border-gray-200'}`}
            >
              <Text className="text-center text-2xl mb-1">🟢</Text>
              <Text className={`text-center text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Ultra Saver
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Power Mode Selection */}
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
            Power Mode
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
            {['maximum', 'balanced', 'power_saver', 'ultra_saver'].map((mode, index, array) => (
              <View key={mode}>
                <TouchableOpacity
                  onPress={() => handlePowerModeChange(mode as PowerMode)}
                  disabled={isUpdating}
                  className={`p-4 ${isUpdating ? 'opacity-50' : ''}`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className={`text-base font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {mode === 'power_saver' ? 'Power Saver' :
                         mode === 'ultra_saver' ? 'Ultra Saver' :
                         mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </Text>
                      <Text className={`text-sm mt-0.5 ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
                        {mode === 'maximum' && 'Best performance, higher battery usage'}
                        {mode === 'balanced' && 'Good balance of performance and battery life'}
                        {mode === 'power_saver' && 'Extended battery life with reduced features'}
                        {mode === 'ultra_saver' && 'Maximum battery life, minimal features'}
                      </Text>
                    </View>
                    {currentPowerMode === mode && (
                      <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                    )}
                  </View>
                </TouchableOpacity>
                {index < array.length - 1 && <ListDivider />}
              </View>
            ))}
          </View>
        </View>

        {/* Critical Features */}
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
            Critical Features
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
              subtitle="Receive important notifications"
              value={features.enablePushNotifications}
              onValueChange={(value) => handleFeatureToggle('enablePushNotifications', value)}
              disabled={isUpdating}
            />
            <ListDivider />
            <SwitchItem
              title="Background Sync"
              subtitle="Keep messages synchronized"
              value={features.enableBackgroundSync}
              onValueChange={(value) => handleFeatureToggle('enableBackgroundSync', value)}
              disabled={isUpdating}
            />
          </View>
        </View>

        {/* Battery Optimization Features */}
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
            Battery Optimization
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
              title="Aggressive Batching"
              subtitle="Group network requests for efficiency"
              value={features.aggressiveBatching}
              onValueChange={(value) => handleFeatureToggle('aggressiveBatching', value)}
              disabled={isUpdating}
            />
            <ListDivider />
            <SwitchItem
              title="Limit Background Tasks"
              subtitle="Restrict background processing"
              value={features.limitBackgroundTasks}
              onValueChange={(value) => handleFeatureToggle('limitBackgroundTasks', value)}
              disabled={isUpdating}
            />
            <ListDivider />
            <SwitchItem
              title="Reduce Sync Frequency"
              subtitle="Sync messages less frequently"
              value={features.reduceSyncFrequency}
              onValueChange={(value) => handleFeatureToggle('reduceSyncFrequency', value)}
              disabled={isUpdating}
            />
          </View>
        </View>

        {/* Media & Performance */}
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
            Media & Performance
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
              title="Video Autoplay"
              subtitle="Automatically play videos (high battery impact)"
              value={features.enableVideoAutoplay}
              onValueChange={(value) => handleFeatureToggle('enableVideoAutoplay', value)}
              disabled={isUpdating}
            />
            <ListDivider />
            <SwitchItem
              title="Rich Notifications"
              subtitle="Show images in notifications"
              value={features.enableRichNotifications}
              onValueChange={(value) => handleFeatureToggle('enableRichNotifications', value)}
              disabled={isUpdating}
            />
            <ListDivider />
            <SwitchItem
              title="Reduce Animations"
              subtitle="Use simpler animations"
              value={features.reduceAnimations}
              onValueChange={(value) => handleFeatureToggle('reduceAnimations', value)}
              disabled={isUpdating}
            />
          </View>
        </View>

        {/* Advanced Settings Link */}
        <View className="mx-4 mt-6">
          <TouchableOpacity
            onPress={() => router.push('/settings/performance-advanced')}
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
                Advanced Performance Settings
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={isDark ? "#80848e" : "#6b7280"}
            />
          </TouchableOpacity>
        </View>

        {/* Performance Stats */}
        {(batteryData || deviceCapabilities || backgroundMetrics) && (
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
              Performance Stats
            </Text>
            <View
              className={`
                rounded-xl
                overflow-hidden
                ${isDark ? "bg-dark-800" : "bg-white"}
                border
                ${isDark ? "border-dark-700" : "border-gray-200"}
                p-4
              `}
            >
              <View className="space-y-2">
                {batteryData && (
                  <View className="flex-row justify-between">
                    <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-600'}`}>
                      Battery Level
                    </Text>
                    <Text className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {batteryData.batteryLevel}%
                    </Text>
                  </View>
                )}

                {deviceCapabilities && (
                  <View className="flex-row justify-between">
                    <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-600'}`}>
                      Device Tier
                    </Text>
                    <Text className={`text-sm font-medium capitalize ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {deviceCapabilities.performanceTier}
                    </Text>
                  </View>
                )}

                {backgroundMetrics && (
                  <View className="flex-row justify-between">
                    <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-600'}`}>
                      Background Tasks
                    </Text>
                    <Text className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {taskStats.pending} pending
                    </Text>
                  </View>
                )}

                <View className="flex-row justify-between">
                  <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-600'}`}>
                    Battery Health
                  </Text>
                  <Text className={`text-sm font-medium capitalize ${
                    batteryHealth === 'excellent' ? 'text-green-600' :
                    batteryHealth === 'good' ? 'text-blue-600' :
                    batteryHealth === 'fair' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {batteryHealth}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Bottom spacing */}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}