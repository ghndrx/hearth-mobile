import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  Alert} from "react-native";
import { useColorScheme } from "../../lib/hooks/useColorScheme";
import { Stack, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useBiometric } from "../../lib/contexts/BiometricContext";
import { TIMEOUT_PRESETS } from "../../lib/services/biometric";

export default function SecuritySettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  
  const {
    capabilities,
    settings,
    updateSettings,
    biometricName,
    biometricIcon,
    lock,
  } = useBiometric();
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [showTimeoutPicker, setShowTimeoutPicker] = useState(false);

  const handleToggleBiometric = async (value: boolean) => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      await updateSettings({ enabled: value });
      
      if (value) {
        Alert.alert(
          "Biometric Lock Enabled",
          `${biometricName} is now required to unlock Hearth.`,
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update settings";
      Alert.alert("Error", message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSelectTimeout = async (value: number) => {
    setShowTimeoutPicker(false);
    
    if (value === settings.timeout) return;
    
    setIsUpdating(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      await updateSettings({ timeout: value });
    } catch (error) {
      Alert.alert("Error", "Failed to update timeout setting");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLockNow = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    lock();
    router.back();
  };

  const currentTimeoutLabel = TIMEOUT_PRESETS.find(
    (p) => p.value === settings.timeout
  )?.label || `After ${settings.timeout} minutes`;

  const biometricsAvailable = capabilities?.isAvailable && capabilities?.isEnrolled;

  return (
    <View className={`flex-1 ${isDark ? "bg-black" : "bg-gray-50"}`}>
      <Stack.Screen
        options={{
          title: "Security",
          headerStyle: {
            backgroundColor: isDark ? "#0a0a0a" : "#ffffff",
          },
          headerTintColor: isDark ? "#ffffff" : "#1a1a1a",
        }}
      />

      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        {/* Biometric Lock Section */}
        <View className="mt-6">
          <Text
            className={`px-4 pb-2 text-xs uppercase tracking-wide ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Biometric Authentication
          </Text>

          <View
            className={`mx-4 rounded-xl overflow-hidden ${
              isDark ? "bg-gray-900" : "bg-white"
            }`}
          >
            {/* Enable/Disable Toggle */}
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-800">
              <View className="flex-row items-center flex-1 mr-4">
                <View
                  className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                    isDark ? "bg-gray-800" : "bg-gray-100"
                  }`}
                >
                  <MaterialCommunityIcons
                    name={biometricIcon as keyof typeof MaterialCommunityIcons.glyphMap}
                    size={24}
                    color={biometricsAvailable ? "#10b981" : "#6b7280"}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className={`text-base font-medium ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {biometricName} Lock
                  </Text>
                  <Text
                    className={`text-sm ${
                      isDark ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    {biometricsAvailable
                      ? "Require authentication to open app"
                      : "Not available on this device"}
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.enabled}
                onValueChange={handleToggleBiometric}
                disabled={!biometricsAvailable || isUpdating}
                trackColor={{ false: "#767577", true: "#10b981" }}
                thumbColor="#ffffff"
              />
            </View>

            {/* Timeout Setting */}
            {settings.enabled && (
              <Pressable
                onPress={() => setShowTimeoutPicker(true)}
                className="flex-row items-center justify-between px-4 py-4 active:opacity-70"
              >
                <View className="flex-row items-center flex-1">
                  <View
                    className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                      isDark ? "bg-gray-800" : "bg-gray-100"
                    }`}
                  >
                    <MaterialCommunityIcons
                      name="timer-outline"
                      size={24}
                      color={isDark ? "#9ca3af" : "#6b7280"}
                    />
                  </View>
                  <View>
                    <Text
                      className={`text-base font-medium ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Require Authentication
                    </Text>
                    <Text
                      className={`text-sm ${
                        isDark ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {currentTimeoutLabel}
                    </Text>
                  </View>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={isDark ? "#4b5563" : "#9ca3af"}
                />
              </Pressable>
            )}
          </View>
        </View>

        {/* Lock Now Button */}
        {settings.enabled && (
          <View className="mt-6 px-4">
            <Pressable
              onPress={handleLockNow}
              className={`flex-row items-center justify-center py-4 rounded-xl ${
                isDark ? "bg-gray-900" : "bg-white"
              }`}
            >
              <MaterialCommunityIcons
                name="lock"
                size={20}
                color="#ef4444"
              />
              <Text className="ml-2 text-base font-medium text-red-500">
                Lock Now
              </Text>
            </Pressable>
          </View>
        )}

        {/* Password Section */}
        <View className="mt-6">
          <Text
            className={`px-4 pb-2 text-xs uppercase tracking-wide ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Password
          </Text>

          <View
            className={`mx-4 rounded-xl overflow-hidden ${
              isDark ? "bg-gray-900" : "bg-white"
            }`}
          >
            <Pressable
              onPress={() => router.push("/settings/change-password")}
              className="flex-row items-center justify-between px-4 py-4 active:opacity-70"
            >
              <View className="flex-row items-center flex-1">
                <View
                  className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                    isDark ? "bg-gray-800" : "bg-gray-100"
                  }`}
                >
                  <MaterialCommunityIcons
                    name="lock-reset"
                    size={24}
                    color={isDark ? "#9ca3af" : "#6b7280"}
                  />
                </View>
                <View>
                  <Text
                    className={`text-base font-medium ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Change Password
                  </Text>
                  <Text
                    className={`text-sm ${
                      isDark ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    Update your account password
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={isDark ? "#4b5563" : "#9ca3af"}
              />
            </Pressable>
          </View>
        </View>

        {/* Device Status */}
        <View className="mt-6">
          <Text
            className={`px-4 pb-2 text-xs uppercase tracking-wide ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Device Status
          </Text>

          <View
            className={`mx-4 rounded-xl overflow-hidden ${
              isDark ? "bg-gray-900" : "bg-white"
            }`}
          >
            <View className="px-4 py-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text
                  className={`text-sm ${
                    isDark ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Hardware Support
                </Text>
                <Text
                  className={`text-sm font-medium ${
                    capabilities?.isAvailable
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {capabilities?.isAvailable ? "Available" : "Not Available"}
                </Text>
              </View>

              <View className="flex-row items-center justify-between mb-3">
                <Text
                  className={`text-sm ${
                    isDark ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Biometrics Enrolled
                </Text>
                <Text
                  className={`text-sm font-medium ${
                    capabilities?.isEnrolled
                      ? "text-green-500"
                      : "text-yellow-500"
                  }`}
                >
                  {capabilities?.isEnrolled ? "Yes" : "No"}
                </Text>
              </View>

              <View className="flex-row items-center justify-between">
                <Text
                  className={`text-sm ${
                    isDark ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Authentication Types
                </Text>
                <Text
                  className={`text-sm font-medium ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {capabilities?.biometricTypes.length
                    ? capabilities.biometricTypes.join(", ")
                    : "None"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Help Text */}
        <Text
          className={`mx-4 mt-4 text-sm ${
            isDark ? "text-gray-500" : "text-gray-400"
          }`}
        >
          When enabled, you&apos;ll need to use {biometricName} to access Hearth
          after the app has been in the background for the selected time period.
        </Text>
      </ScrollView>

      {/* Timeout Picker Modal */}
      {showTimeoutPicker && (
        <Pressable
          onPress={() => setShowTimeoutPicker(false)}
          className="absolute inset-0 bg-black/50 justify-end"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className={`rounded-t-3xl pb-8 ${
              isDark ? "bg-gray-900" : "bg-white"
            }`}
          >
            <View className="w-12 h-1 bg-gray-400 rounded-full self-center mt-3 mb-4" />
            
            <Text
              className={`text-center text-lg font-semibold mb-4 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Require Authentication
            </Text>

            {TIMEOUT_PRESETS.map((preset) => (
              <Pressable
                key={preset.value}
                onPress={() => handleSelectTimeout(preset.value)}
                className="flex-row items-center justify-between px-6 py-4"
              >
                <Text
                  className={`text-base ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {preset.label}
                </Text>
                {settings.timeout === preset.value && (
                  <MaterialCommunityIcons
                    name="check"
                    size={24}
                    color="#10b981"
                  />
                )}
              </Pressable>
            ))}

            <Pressable
              onPress={() => setShowTimeoutPicker(false)}
              className="mx-6 mt-4 py-4 rounded-xl bg-gray-100 dark:bg-gray-800"
            >
              <Text
                className={`text-center text-base font-medium ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Cancel
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      )}
    </View>
  );
}
