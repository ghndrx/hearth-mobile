import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAuthStore } from "../../lib/stores/auth";
import { Avatar, Button } from "../../components/ui";

type StatusType = "online" | "idle" | "dnd" | "invisible";

interface StatusOption {
  key: StatusType;
  label: string;
  description: string;
  color: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    key: "online",
    label: "Online",
    description: "You will appear as online",
    color: "#22c55e",
    icon: "ellipse",
  },
  {
    key: "idle",
    label: "Idle",
    description: "You will appear as away",
    color: "#f59e0b",
    icon: "moon",
  },
  {
    key: "dnd",
    label: "Do Not Disturb",
    description: "Mutes all notification sounds",
    color: "#ef4444",
    icon: "remove-circle",
  },
  {
    key: "invisible",
    label: "Invisible",
    description: "You will appear offline but can still use the app",
    color: "#80848e",
    icon: "ellipse-outline",
  },
];

const SUGGESTED_EMOJIS = [
  "😊",
  "🎮",
  "🎵",
  "💻",
  "📚",
  "🏃",
  "🍕",
  "✈️",
  "🎬",
  "💤",
  "🏠",
  "🔨",
  "☕",
  "🎯",
  "🎉",
  "🤫",
];

const PRESET_STATUSES = [
  { emoji: "🎮", text: "Playing games" },
  { emoji: "💻", text: "Working" },
  { emoji: "📚", text: "Studying" },
  { emoji: "🍕", text: "Eating" },
  { emoji: "🏃", text: "Exercising" },
  { emoji: "🎵", text: "Listening to music" },
  { emoji: "💤", text: "Sleeping" },
  { emoji: "✈️", text: "Traveling" },
];

type ClearAfter = "never" | "30m" | "1h" | "4h" | "today";

const CLEAR_OPTIONS: { key: ClearAfter; label: string }[] = [
  { key: "never", label: "Don't clear" },
  { key: "30m", label: "30 minutes" },
  { key: "1h", label: "1 hour" },
  { key: "4h", label: "4 hours" },
  { key: "today", label: "Today" },
];

export default function StatusScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useAuthStore();

  const [selectedStatus, setSelectedStatus] = useState<StatusType>(
    (user?.status as StatusType) || "online",
  );
  const [customEmoji, setCustomEmoji] = useState("");
  const [customText, setCustomText] = useState("");
  const [clearAfter, setClearAfter] = useState<ClearAfter>("never");
  const [showClearOptions, setShowClearOptions] = useState(false);

  const handleSelectPreset = useCallback(
    (preset: { emoji: string; text: string }) => {
      setCustomEmoji(preset.emoji);
      setCustomText(preset.text);
    },
    [],
  );

  const handleSave = useCallback(() => {
    // In production: api.patch('/users/me/status', { status, customEmoji, customText, clearAfter })
    router.back();
  }, []);

  const handleClearCustom = useCallback(() => {
    setCustomEmoji("");
    setCustomText("");
  }, []);

  const selectedClearLabel =
    CLEAR_OPTIONS.find((o) => o.key === clearAfter)?.label || "Don't clear";

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Set Status",
          headerTitleStyle: {
            color: isDark ? "#ffffff" : "#111827",
            fontSize: 18,
            fontWeight: "bold",
          },
          headerStyle: {
            backgroundColor: isDark ? "#1e1f22" : "#ffffff",
          },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="ml-2">
              <Ionicons
                name="close"
                size={28}
                color={isDark ? "#80848e" : "#6b7280"}
              />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleSave} className="mr-4">
              <Text className="text-brand text-base font-semibold">Done</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-8"
          keyboardShouldPersistTaps="handled"
        >
          {/* Preview */}
          <Animated.View
            entering={FadeInDown.delay(50).duration(300)}
            className={`mx-4 mt-4 p-4 rounded-2xl flex-row items-center ${
              isDark ? "bg-dark-800" : "bg-white"
            }`}
          >
            <View className="relative">
              <Avatar
                uri={user?.avatar}
                name={user?.displayName || "User"}
                size="lg"
              />
              <View
                className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-[3px]"
                style={{
                  backgroundColor:
                    STATUS_OPTIONS.find((s) => s.key === selectedStatus)
                      ?.color || "#22c55e",
                  borderColor: isDark ? "#232428" : "#ffffff",
                }}
              />
            </View>
            <View className="ml-4 flex-1">
              <Text
                className={`text-base font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
              >
                {user?.displayName || "User"}
              </Text>
              {customText ? (
                <Text
                  className={`text-sm mt-0.5 ${isDark ? "text-dark-300" : "text-gray-600"}`}
                  numberOfLines={1}
                >
                  {customEmoji} {customText}
                </Text>
              ) : (
                <Text
                  className={`text-sm mt-0.5 ${isDark ? "text-dark-400" : "text-gray-500"}`}
                >
                  {
                    STATUS_OPTIONS.find((s) => s.key === selectedStatus)?.label
                  }
                </Text>
              )}
            </View>
          </Animated.View>

          {/* Online Status */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(300)}
            className="mx-4 mt-6"
          >
            <Text
              className={`text-xs font-semibold uppercase mb-3 ${
                isDark ? "text-dark-400" : "text-gray-500"
              }`}
            >
              Online Status
            </Text>
            <View
              className={`rounded-xl overflow-hidden border ${
                isDark
                  ? "bg-dark-800 border-dark-700"
                  : "bg-white border-gray-200"
              }`}
            >
              {STATUS_OPTIONS.map((option, index) => (
                <TouchableOpacity
                  key={option.key}
                  onPress={() => setSelectedStatus(option.key)}
                  className={`flex-row items-center px-4 py-3.5 ${
                    index < STATUS_OPTIONS.length - 1
                      ? `border-b ${isDark ? "border-dark-700" : "border-gray-100"}`
                      : ""
                  }`}
                  activeOpacity={0.7}
                >
                  <View
                    className="w-8 h-8 rounded-full items-center justify-center"
                    style={{ backgroundColor: option.color + "20" }}
                  >
                    <Ionicons
                      name={option.icon}
                      size={option.key === "dnd" ? 18 : 14}
                      color={option.color}
                    />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text
                      className={`text-base font-medium ${isDark ? "text-white" : "text-gray-900"}`}
                    >
                      {option.label}
                    </Text>
                    <Text
                      className={`text-xs mt-0.5 ${isDark ? "text-dark-400" : "text-gray-500"}`}
                    >
                      {option.description}
                    </Text>
                  </View>
                  {selectedStatus === option.key && (
                    <Ionicons name="checkmark" size={22} color="#5865f2" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* Custom Status */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(300)}
            className="mx-4 mt-6"
          >
            <View className="flex-row items-center justify-between mb-3">
              <Text
                className={`text-xs font-semibold uppercase ${
                  isDark ? "text-dark-400" : "text-gray-500"
                }`}
              >
                Custom Status
              </Text>
              {(customEmoji || customText) && (
                <TouchableOpacity onPress={handleClearCustom}>
                  <Text className="text-red-500 text-xs font-medium">
                    Clear
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View
              className={`rounded-xl overflow-hidden border ${
                isDark
                  ? "bg-dark-800 border-dark-700"
                  : "bg-white border-gray-200"
              }`}
            >
              {/* Emoji + Text Input */}
              <View className="flex-row items-center px-4 py-3">
                <TouchableOpacity
                  className={`w-10 h-10 rounded-lg items-center justify-center ${
                    isDark ? "bg-dark-700" : "bg-gray-100"
                  }`}
                >
                  {customEmoji ? (
                    <Text className="text-xl">{customEmoji}</Text>
                  ) : (
                    <Ionicons
                      name="happy-outline"
                      size={22}
                      color={isDark ? "#80848e" : "#9ca3af"}
                    />
                  )}
                </TouchableOpacity>
                <TextInput
                  className={`flex-1 ml-3 text-base ${isDark ? "text-white" : "text-gray-900"}`}
                  placeholder="What are you up to?"
                  placeholderTextColor={isDark ? "#80848e" : "#9ca3af"}
                  value={customText}
                  onChangeText={setCustomText}
                  maxLength={128}
                />
              </View>

              {/* Suggested Emojis */}
              <View
                className={`px-4 py-3 border-t ${isDark ? "border-dark-700" : "border-gray-100"}`}
              >
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                >
                  {SUGGESTED_EMOJIS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      onPress={() => setCustomEmoji(emoji)}
                      className={`w-10 h-10 rounded-lg items-center justify-center mr-2 ${
                        customEmoji === emoji
                          ? "bg-brand/20"
                          : isDark
                            ? "bg-dark-700"
                            : "bg-gray-100"
                      }`}
                    >
                      <Text className="text-lg">{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Clear After */}
              <TouchableOpacity
                onPress={() => setShowClearOptions(!showClearOptions)}
                className={`flex-row items-center justify-between px-4 py-3 border-t ${
                  isDark ? "border-dark-700" : "border-gray-100"
                }`}
              >
                <Text
                  className={`text-sm ${isDark ? "text-dark-300" : "text-gray-600"}`}
                >
                  Clear after
                </Text>
                <View className="flex-row items-center">
                  <Text
                    className={`text-sm mr-1 ${isDark ? "text-dark-200" : "text-gray-700"}`}
                  >
                    {selectedClearLabel}
                  </Text>
                  <Ionicons
                    name={showClearOptions ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={isDark ? "#80848e" : "#6b7280"}
                  />
                </View>
              </TouchableOpacity>

              {showClearOptions &&
                CLEAR_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    onPress={() => {
                      setClearAfter(option.key);
                      setShowClearOptions(false);
                    }}
                    className={`flex-row items-center justify-between px-4 py-3 border-t ${
                      isDark ? "border-dark-700" : "border-gray-100"
                    }`}
                  >
                    <Text
                      className={`text-sm pl-4 ${isDark ? "text-dark-200" : "text-gray-700"}`}
                    >
                      {option.label}
                    </Text>
                    {clearAfter === option.key && (
                      <Ionicons name="checkmark" size={18} color="#5865f2" />
                    )}
                  </TouchableOpacity>
                ))}
            </View>
          </Animated.View>

          {/* Preset Statuses */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(300)}
            className="mx-4 mt-6"
          >
            <Text
              className={`text-xs font-semibold uppercase mb-3 ${
                isDark ? "text-dark-400" : "text-gray-500"
              }`}
            >
              Suggested
            </Text>
            <View
              className={`rounded-xl overflow-hidden border ${
                isDark
                  ? "bg-dark-800 border-dark-700"
                  : "bg-white border-gray-200"
              }`}
            >
              {PRESET_STATUSES.map((preset, index) => (
                <TouchableOpacity
                  key={preset.text}
                  onPress={() => handleSelectPreset(preset)}
                  className={`flex-row items-center px-4 py-3 ${
                    index < PRESET_STATUSES.length - 1
                      ? `border-b ${isDark ? "border-dark-700" : "border-gray-100"}`
                      : ""
                  }`}
                  activeOpacity={0.7}
                >
                  <Text className="text-xl mr-3">{preset.emoji}</Text>
                  <Text
                    className={`text-base ${isDark ? "text-dark-200" : "text-gray-700"}`}
                  >
                    {preset.text}
                  </Text>
                  {customEmoji === preset.emoji &&
                    customText === preset.text && (
                      <View className="ml-auto">
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color="#5865f2"
                        />
                      </View>
                    )}
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* Save Button */}
          <Animated.View
            entering={FadeInDown.delay(400).duration(300)}
            className="mx-4 mt-6"
          >
            <Button
              title="Save Status"
              variant="primary"
              fullWidth
              onPress={handleSave}
              leftIcon={
                <Ionicons name="checkmark" size={20} color="white" />
              }
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
