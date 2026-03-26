import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform} from "react-native";
import { useColorScheme } from "../../lib/hooks/useColorScheme";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Input } from "../ui";
import { Switch } from "react-native";

// ============================================================================
// Types
// ============================================================================

export interface NewChannelData {
  name: string;
  type: "text" | "voice" | "announcement";
  categoryId?: string;
  isPrivate: boolean;
  topic?: string;
  slowMode: boolean;
  slowModeDelay: number;
}

interface CreateChannelScreenProps {
  serverId?: string;
  categoryId?: string;
  onChannelCreated?: (channel: NewChannelData) => void;
}

interface ChannelTypeOption {
  type: "text" | "voice" | "announcement";
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

// ============================================================================
// Constants
// ============================================================================

const channelTypes: ChannelTypeOption[] = [
  {
    type: "text",
    label: "Text Channel",
    description: "Send messages, images, GIFs, and more",
    icon: "chatbubble-outline",
  },
  {
    type: "voice",
    label: "Voice Channel",
    description: "Hang out with voice, video, and screen sharing",
    icon: "volume-high-outline",
  },
  {
    type: "announcement",
    label: "Announcement Channel",
    description: "Important updates that can be followed by other servers",
    icon: "megaphone-outline",
  },
];

const slowModeOptions = [
  { value: 0, label: "Off" },
  { value: 5, label: "5s" },
  { value: 10, label: "10s" },
  { value: 15, label: "15s" },
  { value: 30, label: "30s" },
  { value: 60, label: "1m" },
  { value: 120, label: "2m" },
  { value: 300, label: "5m" },
  { value: 600, label: "10m" },
];

// Mock categories for the demo
const mockCategories = [
  { id: "cat1", name: "GENERAL" },
  { id: "cat2", name: "VOICE CHANNELS" },
  { id: "cat3", name: "COMMUNITY" },
];

// ============================================================================
// Main Component
// ============================================================================

export function CreateChannelScreen({
  serverId: propServerId,
  categoryId: propCategoryId,
  onChannelCreated,
}: CreateChannelScreenProps = {}) {
  const params = useLocalSearchParams<{ serverId: string; categoryId?: string }>();
  const _serverId = propServerId || params.serverId || "1";
  const initialCategoryId = propCategoryId || params.categoryId;

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [isLoading, setIsLoading] = useState(false);
  const [channelData, setChannelData] = useState<NewChannelData>({
    name: "",
    type: "text",
    categoryId: initialCategoryId,
    isPrivate: false,
    topic: "",
    slowMode: false,
    slowModeDelay: 5,
  });

  const [errors, setErrors] = useState<{ name?: string }>({});

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleChange = <K extends keyof NewChannelData>(
    key: K,
    value: NewChannelData[K]
  ) => {
    setChannelData((prev) => ({ ...prev, [key]: value }));
    // Clear error when user starts typing
    if (key === "name" && errors.name) {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
  };

  const formatChannelName = (name: string): string => {
    // Convert to lowercase, replace spaces with hyphens, remove invalid chars
    return name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-_]/g, "")
      .replace(/-+/g, "-")
      .slice(0, 100);
  };

  const validateForm = (): boolean => {
    const newErrors: { name?: string } = {};

    if (!channelData.name.trim()) {
      newErrors.name = "Channel name is required";
    } else if (channelData.name.length < 1) {
      newErrors.name = "Channel name must be at least 1 character";
    } else if (channelData.name.length > 100) {
      newErrors.name = "Channel name must be 100 characters or less";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const formattedName = formatChannelName(channelData.name);

      if (onChannelCreated) {
        onChannelCreated({ ...channelData, name: formattedName });
      }

      Alert.alert(
        "Success",
        `Channel #${formattedName} has been created!`,
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch {
      Alert.alert("Error", "Failed to create channel. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Create Channel",
          headerTitleStyle: {
            color: isDark ? "#ffffff" : "#111827",
            fontSize: 18,
            fontWeight: "bold",
          },
          headerStyle: {
            backgroundColor: isDark ? "#1e1f22" : "#ffffff",
          },
          headerLeft: () => (
            <TouchableOpacity className="ml-4" onPress={() => router.back()}>
              <Ionicons
                name="close"
                size={28}
                color={isDark ? "#80848e" : "#6b7280"}
              />
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
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Channel Type Selection */}
          <View className="px-4 pt-4">
            <Text
              className={`text-sm font-semibold uppercase mb-3 ${
                isDark ? "text-dark-400" : "text-gray-500"
              }`}
            >
              Channel Type
            </Text>
            <View
              className={`
                rounded-2xl overflow-hidden
                ${isDark ? "bg-dark-800" : "bg-white"}
                border ${isDark ? "border-dark-700" : "border-gray-200"}
              `}
            >
              {channelTypes.map((option, index) => (
                <TouchableOpacity
                  key={option.type}
                  onPress={() => handleChange("type", option.type)}
                  className={`
                    p-4 flex-row items-center
                    ${index !== channelTypes.length - 1 ? "border-b" : ""}
                    ${isDark ? "border-dark-700" : "border-gray-200"}
                  `}
                >
                  <View
                    className={`
                      w-12 h-12 rounded-xl items-center justify-center mr-4
                      ${
                        channelData.type === option.type
                          ? "bg-brand"
                          : isDark
                            ? "bg-dark-700"
                            : "bg-gray-100"
                      }
                    `}
                  >
                    <Ionicons
                      name={option.icon}
                      size={24}
                      color={
                        channelData.type === option.type
                          ? "#ffffff"
                          : isDark
                            ? "#80848e"
                            : "#6b7280"
                      }
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {option.label}
                    </Text>
                    <Text
                      className={`text-sm mt-0.5 ${
                        isDark ? "text-dark-400" : "text-gray-500"
                      }`}
                    >
                      {option.description}
                    </Text>
                  </View>
                  <View
                    className={`
                      w-6 h-6 rounded-full border-2 items-center justify-center
                      ${
                        channelData.type === option.type
                          ? "border-brand bg-brand"
                          : isDark
                            ? "border-dark-500"
                            : "border-gray-300"
                      }
                    `}
                  >
                    {channelData.type === option.type && (
                      <Ionicons name="checkmark" size={14} color="#ffffff" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Channel Name */}
          <View className="px-4 mt-6">
            <Text
              className={`text-sm font-semibold uppercase mb-3 ${
                isDark ? "text-dark-400" : "text-gray-500"
              }`}
            >
              Channel Name
            </Text>
            <View
              className={`
                rounded-2xl overflow-hidden p-4
                ${isDark ? "bg-dark-800" : "bg-white"}
                border ${isDark ? "border-dark-700" : "border-gray-200"}
                ${errors.name ? "border-red-500" : ""}
              `}
            >
              <View className="flex-row items-center">
                <Ionicons
                  name={
                    channelData.type === "voice"
                      ? "volume-high-outline"
                      : channelData.type === "announcement"
                        ? "megaphone-outline"
                        : "chatbubble-outline"
                  }
                  size={20}
                  color={isDark ? "#80848e" : "#6b7280"}
                />
                <Input
                  value={channelData.name}
                  onChangeText={(text) => handleChange("name", text)}
                  placeholder="new-channel"
                  maxLength={100}
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="flex-1 ml-2 border-0 bg-transparent"
                />
              </View>
              {errors.name && (
                <Text className="text-red-500 text-sm mt-2">{errors.name}</Text>
              )}
              <Text
                className={`text-xs mt-2 ${
                  isDark ? "text-dark-500" : "text-gray-400"
                }`}
              >
                Channel names can&apos;t contain spaces. Use hyphens instead.
              </Text>
            </View>
          </View>

          {/* Category Selection */}
          <View className="px-4 mt-6">
            <Text
              className={`text-sm font-semibold uppercase mb-3 ${
                isDark ? "text-dark-400" : "text-gray-500"
              }`}
            >
              Category (Optional)
            </Text>
            <View
              className={`
                rounded-2xl overflow-hidden
                ${isDark ? "bg-dark-800" : "bg-white"}
                border ${isDark ? "border-dark-700" : "border-gray-200"}
              `}
            >
              <TouchableOpacity
                onPress={() => handleChange("categoryId", undefined)}
                className={`
                  p-4 flex-row items-center justify-between border-b
                  ${isDark ? "border-dark-700" : "border-gray-200"}
                `}
              >
                <Text
                  className={`${isDark ? "text-dark-200" : "text-gray-700"}`}
                >
                  No Category
                </Text>
                {!channelData.categoryId && (
                  <Ionicons name="checkmark" size={20} color="#5865f2" />
                )}
              </TouchableOpacity>
              {mockCategories.map((category, index) => (
                <TouchableOpacity
                  key={category.id}
                  onPress={() => handleChange("categoryId", category.id)}
                  className={`
                    p-4 flex-row items-center justify-between
                    ${
                      index !== mockCategories.length - 1
                        ? "border-b"
                        : ""
                    }
                    ${isDark ? "border-dark-700" : "border-gray-200"}
                  `}
                >
                  <Text
                    className={`${isDark ? "text-dark-200" : "text-gray-700"}`}
                  >
                    {category.name}
                  </Text>
                  {channelData.categoryId === category.id && (
                    <Ionicons name="checkmark" size={20} color="#5865f2" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Topic (for text channels) */}
          {channelData.type !== "voice" && (
            <View className="px-4 mt-6">
              <Text
                className={`text-sm font-semibold uppercase mb-3 ${
                  isDark ? "text-dark-400" : "text-gray-500"
                }`}
              >
                Topic (Optional)
              </Text>
              <View
                className={`
                  rounded-2xl overflow-hidden p-4
                  ${isDark ? "bg-dark-800" : "bg-white"}
                  border ${isDark ? "border-dark-700" : "border-gray-200"}
                `}
              >
                <Input
                  value={channelData.topic}
                  onChangeText={(text) => handleChange("topic", text)}
                  placeholder="What is this channel about?"
                  maxLength={1024}
                  multiline
                  numberOfLines={3}
                  className="border-0 bg-transparent"
                />
                <Text
                  className={`text-xs mt-2 ${
                    isDark ? "text-dark-500" : "text-gray-400"
                  }`}
                >
                  {channelData.topic?.length || 0}/1024
                </Text>
              </View>
            </View>
          )}

          {/* Privacy Settings */}
          <View className="px-4 mt-6">
            <Text
              className={`text-sm font-semibold uppercase mb-3 ${
                isDark ? "text-dark-400" : "text-gray-500"
              }`}
            >
              Privacy
            </Text>
            <View
              className={`
                rounded-2xl overflow-hidden
                ${isDark ? "bg-dark-800" : "bg-white"}
                border ${isDark ? "border-dark-700" : "border-gray-200"}
              `}
            >
              <View className="p-4 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View
                    className={`
                      w-10 h-10 rounded-xl items-center justify-center mr-3
                      ${isDark ? "bg-dark-700" : "bg-gray-100"}
                    `}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={isDark ? "#80848e" : "#6b7280"}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`font-medium ${
                        isDark ? "text-dark-100" : "text-gray-900"
                      }`}
                    >
                      Private Channel
                    </Text>
                    <Text
                      className={`text-sm ${
                        isDark ? "text-dark-400" : "text-gray-500"
                      }`}
                    >
                      Only selected members and roles can view
                    </Text>
                  </View>
                </View>
                <Switch
                  value={channelData.isPrivate}
                  onValueChange={(value: boolean) =>
                    handleChange("isPrivate", value)
                  }
                />
              </View>
            </View>
          </View>

          {/* Slow Mode (for text channels) */}
          {channelData.type === "text" && (
            <View className="px-4 mt-6">
              <Text
                className={`text-sm font-semibold uppercase mb-3 ${
                  isDark ? "text-dark-400" : "text-gray-500"
                }`}
              >
                Slow Mode
              </Text>
              <View
                className={`
                  rounded-2xl overflow-hidden
                  ${isDark ? "bg-dark-800" : "bg-white"}
                  border ${isDark ? "border-dark-700" : "border-gray-200"}
                `}
              >
                <View className="p-4 flex-row items-center justify-between border-b border-dark-700">
                  <View className="flex-row items-center flex-1">
                    <View
                      className={`
                        w-10 h-10 rounded-xl items-center justify-center mr-3
                        ${isDark ? "bg-dark-700" : "bg-gray-100"}
                      `}
                    >
                      <Ionicons
                        name="timer-outline"
                        size={20}
                        color={isDark ? "#80848e" : "#6b7280"}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`font-medium ${
                          isDark ? "text-dark-100" : "text-gray-900"
                        }`}
                      >
                        Enable Slow Mode
                      </Text>
                      <Text
                        className={`text-sm ${
                          isDark ? "text-dark-400" : "text-gray-500"
                        }`}
                      >
                        Limit how often users can send messages
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={channelData.slowMode}
                    onValueChange={(value: boolean) =>
                      handleChange("slowMode", value)
                    }
                  />
                </View>

                {channelData.slowMode && (
                  <View className="p-4">
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      className="flex-row"
                    >
                      {slowModeOptions
                        .filter((opt) => opt.value > 0)
                        .map((option) => (
                          <TouchableOpacity
                            key={option.value}
                            onPress={() =>
                              handleChange("slowModeDelay", option.value)
                            }
                            className={`
                              px-4 py-2 rounded-lg mr-2
                              ${
                                channelData.slowModeDelay === option.value
                                  ? "bg-brand"
                                  : isDark
                                    ? "bg-dark-700"
                                    : "bg-gray-100"
                              }
                            `}
                          >
                            <Text
                              className={`font-medium ${
                                channelData.slowModeDelay === option.value
                                  ? "text-white"
                                  : isDark
                                    ? "text-dark-200"
                                    : "text-gray-700"
                              }`}
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Create Button */}
        <View
          className={`
            absolute bottom-0 left-0 right-0
            px-4 py-4 border-t
            ${isDark ? "bg-dark-900 border-dark-700" : "bg-white border-gray-200"}
          `}
        >
          <Button
            title="Create Channel"
            onPress={handleCreate}
            isLoading={isLoading}
            disabled={!channelData.name.trim()}
            fullWidth
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default CreateChannelScreen;
