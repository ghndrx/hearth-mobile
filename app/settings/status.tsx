import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Stack } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

type PresenceStatus = "online" | "idle" | "dnd" | "invisible";

interface StatusPreset {
  emoji: string;
  text: string;
  clearAfter?: number; // minutes, 0 = don't auto-clear
}

const PRESENCE_OPTIONS: {
  value: PresenceStatus;
  label: string;
  description: string;
  color: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  {
    value: "online",
    label: "Online",
    description: "You appear as online to others",
    color: "#22c55e",
    icon: "circle",
  },
  {
    value: "idle",
    label: "Idle",
    description: "You appear as away",
    color: "#f59e0b",
    icon: "moon-waning-crescent",
  },
  {
    value: "dnd",
    label: "Do Not Disturb",
    description: "Notifications are silenced",
    color: "#ef4444",
    icon: "minus-circle",
  },
  {
    value: "invisible",
    label: "Invisible",
    description: "You appear offline but can use Hearth",
    color: "#6b7280",
    icon: "circle-outline",
  },
];

const STATUS_PRESETS: StatusPreset[] = [
  { emoji: "🎮", text: "Playing games" },
  { emoji: "💻", text: "Working" },
  { emoji: "🎧", text: "Listening to music" },
  { emoji: "📚", text: "Studying" },
  { emoji: "😴", text: "Sleeping", clearAfter: 480 },
  { emoji: "🍽️", text: "Eating", clearAfter: 60 },
  { emoji: "🏃", text: "At the gym", clearAfter: 120 },
  { emoji: "🎬", text: "Watching a movie", clearAfter: 180 },
];

const CLEAR_AFTER_OPTIONS = [
  { value: 0, label: "Don't clear" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 240, label: "4 hours" },
  { value: 480, label: "8 hours" },
  { value: 1440, label: "24 hours" },
];

const COMMON_EMOJIS = [
  "😊", "😎", "🎉", "🔥", "💪", "🎯", "✨", "🌟",
  "☕", "🎵", "📱", "💡", "🚀", "⚡", "🌈", "🎨",
];

export default function StatusSettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // State
  const [presence, setPresence] = useState<PresenceStatus>("online");
  const [customStatusText, setCustomStatusText] = useState("");
  const [customStatusEmoji, setCustomStatusEmoji] = useState("");
  const [clearAfter, setClearAfter] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPresencePicker, setShowPresencePicker] = useState(false);
  const [showClearAfterPicker, setShowClearAfterPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handlePresenceChange = useCallback(async (newPresence: PresenceStatus) => {
    setShowPresencePicker(false);
    if (newPresence === presence) return;

    setIsUpdating(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // TODO: Call API to update presence
      setPresence(newPresence);
    } catch (error) {
      Alert.alert("Error", "Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  }, [presence]);

  const handlePresetSelect = useCallback(async (preset: StatusPreset) => {
    setIsUpdating(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      setCustomStatusEmoji(preset.emoji);
      setCustomStatusText(preset.text);
      if (preset.clearAfter !== undefined) {
        setClearAfter(preset.clearAfter);
      }
      // TODO: Call API to update status
    } catch (error) {
      Alert.alert("Error", "Failed to set status");
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const handleSaveCustomStatus = useCallback(async () => {
    if (!customStatusText.trim() && !customStatusEmoji) {
      Alert.alert("Error", "Please enter a status message or emoji");
      return;
    }

    setIsUpdating(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // TODO: Call API to save custom status
      Alert.alert("Success", "Your status has been updated!");
    } catch (error) {
      Alert.alert("Error", "Failed to save status");
    } finally {
      setIsUpdating(false);
    }
  }, [customStatusText, customStatusEmoji]);

  const handleClearStatus = useCallback(async () => {
    setIsUpdating(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      setCustomStatusEmoji("");
      setCustomStatusText("");
      setClearAfter(0);
      // TODO: Call API to clear status
    } catch (error) {
      Alert.alert("Error", "Failed to clear status");
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const handleEmojiSelect = useCallback((emoji: string) => {
    setCustomStatusEmoji(emoji);
    setShowEmojiPicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const currentPresenceOption = PRESENCE_OPTIONS.find((p) => p.value === presence);
  const currentClearAfterLabel = CLEAR_AFTER_OPTIONS.find(
    (o) => o.value === clearAfter
  )?.label || "Don't clear";

  const hasCustomStatus = customStatusText.trim() || customStatusEmoji;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <View className={`flex-1 ${isDark ? "bg-black" : "bg-gray-50"}`}>
        <Stack.Screen
          options={{
            title: "Status",
            headerStyle: {
              backgroundColor: isDark ? "#0a0a0a" : "#ffffff",
            },
            headerTintColor: isDark ? "#ffffff" : "#1a1a1a",
          }}
        />

        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-8"
          keyboardShouldPersistTaps="handled"
        >
          {/* Current Status Preview */}
          <View className="mt-6">
            <View
              className={`mx-4 p-4 rounded-xl ${
                isDark ? "bg-gray-900" : "bg-white"
              }`}
            >
              <View className="flex-row items-center">
                <View className="relative">
                  <View
                    className={`w-14 h-14 rounded-full items-center justify-center ${
                      isDark ? "bg-gray-800" : "bg-gray-100"
                    }`}
                  >
                    <Text className="text-2xl">
                      {customStatusEmoji || "👤"}
                    </Text>
                  </View>
                  <View
                    className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2"
                    style={{
                      backgroundColor: currentPresenceOption?.color,
                      borderColor: isDark ? "#111827" : "#ffffff",
                    }}
                  />
                </View>
                <View className="ml-4 flex-1">
                  <Text
                    className={`text-lg font-semibold ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Your Status
                  </Text>
                  {hasCustomStatus ? (
                    <Text
                      className={`text-sm ${
                        isDark ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {customStatusEmoji} {customStatusText}
                    </Text>
                  ) : (
                    <Text
                      className={`text-sm italic ${
                        isDark ? "text-gray-500" : "text-gray-400"
                      }`}
                    >
                      No status set
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Presence Section */}
          <View className="mt-6">
            <Text
              className={`px-4 pb-2 text-xs uppercase tracking-wide ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Presence
            </Text>

            <View
              className={`mx-4 rounded-xl overflow-hidden ${
                isDark ? "bg-gray-900" : "bg-white"
              }`}
            >
              <Pressable
                onPress={() => setShowPresencePicker(true)}
                disabled={isUpdating}
                className="flex-row items-center justify-between px-4 py-4 active:opacity-70"
              >
                <View className="flex-row items-center flex-1">
                  <View
                    className={`w-10 h-10 rounded-full items-center justify-center mr-3`}
                    style={{ backgroundColor: currentPresenceOption?.color + "20" }}
                  >
                    <MaterialCommunityIcons
                      name={currentPresenceOption?.icon || "circle"}
                      size={24}
                      color={currentPresenceOption?.color}
                    />
                  </View>
                  <View>
                    <Text
                      className={`text-base font-medium ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {currentPresenceOption?.label}
                    </Text>
                    <Text
                      className={`text-sm ${
                        isDark ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {currentPresenceOption?.description}
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

          {/* Custom Status Section */}
          <View className="mt-6">
            <Text
              className={`px-4 pb-2 text-xs uppercase tracking-wide ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Custom Status
            </Text>

            <View
              className={`mx-4 rounded-xl overflow-hidden ${
                isDark ? "bg-gray-900" : "bg-white"
              }`}
            >
              {/* Emoji & Text Input */}
              <View className="flex-row items-center px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                <Pressable
                  onPress={() => setShowEmojiPicker(true)}
                  className={`w-12 h-12 rounded-xl items-center justify-center mr-3 ${
                    isDark ? "bg-gray-800" : "bg-gray-100"
                  }`}
                >
                  <Text className="text-2xl">
                    {customStatusEmoji || "😀"}
                  </Text>
                </Pressable>
                <TextInput
                  value={customStatusText}
                  onChangeText={setCustomStatusText}
                  placeholder="What's happening?"
                  placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
                  maxLength={128}
                  className={`flex-1 text-base ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                />
              </View>

              {/* Clear After */}
              <Pressable
                onPress={() => setShowClearAfterPicker(true)}
                className="flex-row items-center justify-between px-4 py-4 active:opacity-70"
              >
                <View className="flex-row items-center">
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={20}
                    color={isDark ? "#9ca3af" : "#6b7280"}
                  />
                  <Text
                    className={`ml-3 text-base ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Clear after
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Text
                    className={`mr-2 text-sm ${
                      isDark ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    {currentClearAfterLabel}
                  </Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={isDark ? "#4b5563" : "#9ca3af"}
                  />
                </View>
              </Pressable>
            </View>

            {/* Save/Clear Buttons */}
            <View className="mx-4 mt-4 flex-row gap-3">
              <Pressable
                onPress={handleSaveCustomStatus}
                disabled={isUpdating || !hasCustomStatus}
                className={`flex-1 py-3 rounded-xl items-center ${
                  hasCustomStatus
                    ? "bg-emerald-500"
                    : isDark
                    ? "bg-gray-800"
                    : "bg-gray-200"
                }`}
              >
                <Text
                  className={`font-medium ${
                    hasCustomStatus ? "text-white" : "text-gray-400"
                  }`}
                >
                  Save Status
                </Text>
              </Pressable>
              {hasCustomStatus && (
                <Pressable
                  onPress={handleClearStatus}
                  disabled={isUpdating}
                  className={`py-3 px-6 rounded-xl items-center ${
                    isDark ? "bg-gray-800" : "bg-gray-200"
                  }`}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={20}
                    color={isDark ? "#9ca3af" : "#6b7280"}
                  />
                </Pressable>
              )}
            </View>
          </View>

          {/* Quick Status Presets */}
          <View className="mt-6">
            <Text
              className={`px-4 pb-2 text-xs uppercase tracking-wide ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Quick Status
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="px-4 gap-2"
            >
              {STATUS_PRESETS.map((preset, index) => (
                <Pressable
                  key={index}
                  onPress={() => handlePresetSelect(preset)}
                  disabled={isUpdating}
                  className={`px-4 py-3 rounded-xl flex-row items-center active:opacity-70 ${
                    isDark ? "bg-gray-900" : "bg-white"
                  }`}
                >
                  <Text className="text-xl mr-2">{preset.emoji}</Text>
                  <Text
                    className={`text-sm ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    {preset.text}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Info Text */}
          <Text
            className={`mx-4 mt-6 text-sm ${
              isDark ? "text-gray-500" : "text-gray-400"
            }`}
          >
            Your status is visible to friends and server members. Use custom
            statuses to let others know what you&apos;re up to.
          </Text>
        </ScrollView>

        {/* Presence Picker Modal */}
        {showPresencePicker && (
          <Pressable
            onPress={() => setShowPresencePicker(false)}
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
                Set Presence
              </Text>

              {PRESENCE_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => handlePresenceChange(option.value)}
                  className="flex-row items-center px-6 py-4"
                >
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center mr-4"
                    style={{ backgroundColor: option.color + "20" }}
                  >
                    <MaterialCommunityIcons
                      name={option.icon}
                      size={24}
                      color={option.color}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`text-base font-medium ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {option.label}
                    </Text>
                    <Text
                      className={`text-sm ${
                        isDark ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {option.description}
                    </Text>
                  </View>
                  {presence === option.value && (
                    <MaterialCommunityIcons
                      name="check"
                      size={24}
                      color="#10b981"
                    />
                  )}
                </Pressable>
              ))}

              <Pressable
                onPress={() => setShowPresencePicker(false)}
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

        {/* Clear After Picker Modal */}
        {showClearAfterPicker && (
          <Pressable
            onPress={() => setShowClearAfterPicker(false)}
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
                Clear Status After
              </Text>

              {CLEAR_AFTER_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    setClearAfter(option.value);
                    setShowClearAfterPicker(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  className="flex-row items-center justify-between px-6 py-4"
                >
                  <Text
                    className={`text-base ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {option.label}
                  </Text>
                  {clearAfter === option.value && (
                    <MaterialCommunityIcons
                      name="check"
                      size={24}
                      color="#10b981"
                    />
                  )}
                </Pressable>
              ))}

              <Pressable
                onPress={() => setShowClearAfterPicker(false)}
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

        {/* Emoji Picker Modal */}
        {showEmojiPicker && (
          <Pressable
            onPress={() => setShowEmojiPicker(false)}
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
                Choose Emoji
              </Text>

              <View className="flex-row flex-wrap justify-center px-4 gap-2">
                {COMMON_EMOJIS.map((emoji) => (
                  <Pressable
                    key={emoji}
                    onPress={() => handleEmojiSelect(emoji)}
                    className={`w-14 h-14 rounded-xl items-center justify-center ${
                      customStatusEmoji === emoji
                        ? "bg-emerald-500/20"
                        : isDark
                        ? "bg-gray-800"
                        : "bg-gray-100"
                    }`}
                  >
                    <Text className="text-2xl">{emoji}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Clear emoji option */}
              <Pressable
                onPress={() => handleEmojiSelect("")}
                className="mx-6 mt-4 py-4 rounded-xl bg-gray-100 dark:bg-gray-800 flex-row items-center justify-center"
              >
                <MaterialCommunityIcons
                  name="close-circle-outline"
                  size={20}
                  color={isDark ? "#9ca3af" : "#6b7280"}
                />
                <Text
                  className={`ml-2 text-base font-medium ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Remove Emoji
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setShowEmojiPicker(false)}
                className="mx-6 mt-2 py-4 rounded-xl"
              >
                <Text className="text-center text-base font-medium text-gray-400">
                  Cancel
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
