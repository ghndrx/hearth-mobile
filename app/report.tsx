import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert} from "react-native";
import { useColorScheme } from "../lib/hooks/useColorScheme";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

type ReportType = "user" | "message" | "server" | "channel";

interface ReportReason {
  id: string;
  label: string;
  description: string;
}

const reportReasons: ReportReason[] = [
  {
    id: "harassment",
    label: "Harassment",
    description: "Bullying, threats, or targeted abuse",
  },
  {
    id: "spam",
    label: "Spam",
    description: "Unsolicited advertising or repetitive messages",
  },
  {
    id: "inappropriate",
    label: "Inappropriate Content",
    description: "NSFW, violent, or disturbing content",
  },
  {
    id: "impersonation",
    label: "Impersonation",
    description: "Pretending to be someone else",
  },
  {
    id: "misinformation",
    label: "Misinformation",
    description: "Deliberately false or misleading information",
  },
  {
    id: "other",
    label: "Other",
    description: "Something else not listed above",
  },
];

export default function ReportScreen() {
  const params = useLocalSearchParams<{
    type?: string;
    targetId?: string;
    targetName?: string;
  }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const reportType = (params.type as ReportType) || "user";
  const targetName = params.targetName || "Unknown";

  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const typeLabel = {
    user: "User",
    message: "Message",
    server: "Server",
    channel: "Channel",
  }[reportType];

  const typeIcon = {
    user: "person" as const,
    message: "chatbubble" as const,
    server: "server" as const,
    channel: "chatbubbles" as const,
  }[reportType];

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert("Select a Reason", "Please select a reason for your report.");
      return;
    }

    setIsSubmitting(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setTimeout(() => {
      setIsSubmitting(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Report Submitted",
        "Thank you for your report. Our moderation team will review it shortly.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }, 1000);
  };

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: `Report ${typeLabel}`,
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
                name="chevron-back"
                size={28}
                color={isDark ? "#80848e" : "#6b7280"}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        {/* Target Info */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(300)}
          className={`mx-4 mt-4 p-4 rounded-xl flex-row items-center ${
            isDark ? "bg-dark-800" : "bg-white"
          }`}
        >
          <View
            className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${
              isDark ? "bg-red-500/10" : "bg-red-50"
            }`}
          >
            <Ionicons name={typeIcon} size={24} color="#ef4444" />
          </View>
          <View className="flex-1">
            <Text
              className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}
            >
              Reporting {typeLabel.toLowerCase()}
            </Text>
            <Text
              className={`text-base font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              {targetName}
            </Text>
          </View>
        </Animated.View>

        {/* Reason Selection */}
        <Animated.View entering={FadeInDown.delay(100).duration(300)} className="mt-6">
          <Text
            className={`px-4 pb-2 text-xs uppercase tracking-wide ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Reason for Report
          </Text>
          <View
            className={`mx-4 rounded-xl overflow-hidden ${
              isDark ? "bg-dark-800" : "bg-white"
            }`}
          >
            {reportReasons.map((reason, index) => (
              <TouchableOpacity
                key={reason.id}
                onPress={() => {
                  setSelectedReason(reason.id);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.7}
                className={`flex-row items-center px-4 py-4 ${
                  index > 0
                    ? `border-t ${isDark ? "border-dark-700" : "border-gray-100"}`
                    : ""
                }`}
              >
                <View className="flex-1">
                  <Text
                    className={`text-base font-medium ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {reason.label}
                  </Text>
                  <Text
                    className={`text-sm ${
                      isDark ? "text-dark-400" : "text-gray-500"
                    }`}
                  >
                    {reason.description}
                  </Text>
                </View>
                <View
                  className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    selectedReason === reason.id
                      ? "border-brand bg-brand"
                      : isDark
                      ? "border-dark-600"
                      : "border-gray-300"
                  }`}
                >
                  {selectedReason === reason.id && (
                    <Ionicons name="checkmark" size={14} color="#ffffff" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Additional Details */}
        <Animated.View entering={FadeInDown.delay(150).duration(300)} className="mt-6">
          <Text
            className={`px-4 pb-2 text-xs uppercase tracking-wide ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Additional Details (Optional)
          </Text>
          <View
            className={`mx-4 rounded-xl overflow-hidden ${
              isDark ? "bg-dark-800" : "bg-white"
            }`}
          >
            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder="Provide additional context about this report..."
              placeholderTextColor={isDark ? "#4e5058" : "#9ca3af"}
              className={`px-4 py-3 text-base ${
                isDark ? "text-white" : "text-gray-900"
              }`}
              multiline
              numberOfLines={4}
              style={{ minHeight: 100, textAlignVertical: "top" }}
            />
          </View>
          <Text
            className={`px-4 mt-2 text-xs ${
              isDark ? "text-gray-500" : "text-gray-400"
            }`}
          >
            Reports are reviewed by our moderation team. False reports may result
            in action against your account.
          </Text>
        </Animated.View>

        {/* Submit */}
        <Animated.View entering={FadeInDown.delay(200).duration(300)} className="mt-6 mx-4">
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting || !selectedReason}
            className={`py-4 rounded-xl items-center ${
              selectedReason && !isSubmitting
                ? "bg-red-500"
                : isDark
                ? "bg-dark-700"
                : "bg-gray-200"
            }`}
            activeOpacity={0.7}
          >
            <Text
              className={`text-base font-semibold ${
                selectedReason && !isSubmitting
                  ? "text-white"
                  : isDark
                  ? "text-dark-400"
                  : "text-gray-400"
              }`}
            >
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
