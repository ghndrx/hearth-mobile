import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  useColorScheme,
  Linking,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const faqItems: FaqItem[] = [
  {
    id: "1",
    question: "How do I add a new device to my home?",
    answer:
      "Go to the Devices tab, tap the + button in the top right, and follow the pairing instructions for your device. Make sure your device is in pairing mode and connected to the same Wi-Fi network.",
  },
  {
    id: "2",
    question: "How do I create an automation scene?",
    answer:
      'Navigate to Scenes from the dashboard. Tap "Create Scene" and select the devices and actions you want to include. You can set triggers based on time, device state, or location.',
  },
  {
    id: "3",
    question: "How do I join a server?",
    answer:
      "You can join a server by tapping the + icon on the server list and entering an invite link or code. You can also browse public servers in the Discover tab.",
  },
  {
    id: "4",
    question: "How do I enable push notifications?",
    answer:
      "Go to Settings > Notifications and toggle on the notification types you want to receive. Make sure notifications are also enabled for Hearth in your device settings.",
  },
  {
    id: "5",
    question: "Can I control devices when away from home?",
    answer:
      "Yes! As long as your hub is connected to the internet, you can control all your devices remotely through the Hearth app from anywhere.",
  },
  {
    id: "6",
    question: "How do I set up voice channels?",
    answer:
      "Server admins can create voice channels from the server settings. Go to your server, tap the settings gear, then Channels > Create Channel and select Voice as the channel type.",
  },
];

function FaqAccordion({
  item,
  isDark,
  index,
}: {
  item: FaqItem;
  isDark: boolean;
  index: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(300)}>
      <TouchableOpacity
        onPress={() => {
          setIsOpen(!isOpen);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        activeOpacity={0.7}
        className={`flex-row items-center justify-between px-4 py-4 ${
          index > 0
            ? `border-t ${isDark ? "border-dark-700" : "border-gray-100"}`
            : ""
        }`}
      >
        <Text
          className={`text-base font-medium flex-1 mr-3 ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          {item.question}
        </Text>
        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={20}
          color={isDark ? "#80848e" : "#9ca3af"}
        />
      </TouchableOpacity>
      {isOpen && (
        <View
          className={`px-4 pb-4 ${
            isDark ? "bg-dark-700/30" : "bg-gray-50"
          }`}
        >
          <Text
            className={`text-sm leading-5 ${
              isDark ? "text-dark-300" : "text-gray-600"
            }`}
          >
            {item.answer}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

export default function HelpSupportScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [searchQuery, setSearchQuery] = useState("");
  const [feedbackText, setFeedbackText] = useState("");

  const filteredFaq = searchQuery
    ? faqItems.filter(
        (item) =>
          item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : faqItems;

  const handleSendFeedback = () => {
    if (!feedbackText.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      "Feedback Sent",
      "Thank you for your feedback! We'll review it shortly."
    );
    setFeedbackText("");
  };

  return (
    <View className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}>
      <Stack.Screen
        options={{
          title: "Help & Support",
          headerStyle: {
            backgroundColor: isDark ? "#1e1f22" : "#ffffff",
          },
          headerTintColor: isDark ? "#ffffff" : "#1a1a1a",
        }}
      />

      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        {/* Search */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(300)}
          className="mx-4 mt-4"
        >
          <View
            className={`flex-row items-center px-4 py-3 rounded-xl ${
              isDark ? "bg-dark-800" : "bg-white"
            }`}
          >
            <Ionicons
              name="search"
              size={20}
              color={isDark ? "#80848e" : "#9ca3af"}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search help articles..."
              placeholderTextColor={isDark ? "#4e5058" : "#9ca3af"}
              className={`flex-1 ml-2 text-base ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={isDark ? "#80848e" : "#9ca3af"}
                />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.delay(100).duration(300)} className="mt-6">
          <Text
            className={`px-4 pb-2 text-xs uppercase tracking-wide ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Quick Actions
          </Text>
          <View className="flex-row mx-4" style={{ gap: 12 }}>
            <TouchableOpacity
              onPress={() =>
                Linking.openURL("mailto:support@hearth.app")
              }
              className={`flex-1 items-center py-4 rounded-xl ${
                isDark ? "bg-dark-800" : "bg-white"
              }`}
              activeOpacity={0.7}
            >
              <View className="w-12 h-12 rounded-full bg-brand/10 items-center justify-center mb-2">
                <Ionicons name="mail-outline" size={24} color="#5865f2" />
              </View>
              <Text
                className={`text-sm font-medium ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Email Us
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                Linking.openURL("https://docs.hearth.app")
              }
              className={`flex-1 items-center py-4 rounded-xl ${
                isDark ? "bg-dark-800" : "bg-white"
              }`}
              activeOpacity={0.7}
            >
              <View className="w-12 h-12 rounded-full bg-green-500/10 items-center justify-center mb-2">
                <Ionicons name="book-outline" size={24} color="#22c55e" />
              </View>
              <Text
                className={`text-sm font-medium ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Docs
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                Linking.openURL("https://status.hearth.app")
              }
              className={`flex-1 items-center py-4 rounded-xl ${
                isDark ? "bg-dark-800" : "bg-white"
              }`}
              activeOpacity={0.7}
            >
              <View className="w-12 h-12 rounded-full bg-hearth-amber/10 items-center justify-center mb-2">
                <Ionicons
                  name="pulse-outline"
                  size={24}
                  color="#f59e0b"
                />
              </View>
              <Text
                className={`text-sm font-medium ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Status
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* FAQ */}
        <View className="mt-6">
          <Text
            className={`px-4 pb-2 text-xs uppercase tracking-wide ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Frequently Asked Questions
          </Text>
          <View
            className={`mx-4 rounded-xl overflow-hidden ${
              isDark ? "bg-dark-800" : "bg-white"
            }`}
          >
            {filteredFaq.length > 0 ? (
              filteredFaq.map((item, index) => (
                <FaqAccordion
                  key={item.id}
                  item={item}
                  isDark={isDark}
                  index={index}
                />
              ))
            ) : (
              <View className="items-center py-8">
                <Ionicons
                  name="help-circle-outline"
                  size={40}
                  color={isDark ? "#4e5058" : "#d1d5db"}
                />
                <Text
                  className={`mt-2 text-sm ${
                    isDark ? "text-dark-400" : "text-gray-400"
                  }`}
                >
                  No matching questions found
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Send Feedback */}
        <View className="mt-6">
          <Text
            className={`px-4 pb-2 text-xs uppercase tracking-wide ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Send Feedback
          </Text>
          <View
            className={`mx-4 rounded-xl overflow-hidden ${
              isDark ? "bg-dark-800" : "bg-white"
            }`}
          >
            <TextInput
              value={feedbackText}
              onChangeText={setFeedbackText}
              placeholder="Tell us what you think or report an issue..."
              placeholderTextColor={isDark ? "#4e5058" : "#9ca3af"}
              className={`px-4 py-3 text-base ${
                isDark ? "text-white" : "text-gray-900"
              }`}
              multiline
              numberOfLines={4}
              style={{ minHeight: 100, textAlignVertical: "top" }}
            />
            <View
              className={`border-t px-4 py-3 ${
                isDark ? "border-dark-700" : "border-gray-100"
              }`}
            >
              <TouchableOpacity
                onPress={handleSendFeedback}
                disabled={!feedbackText.trim()}
                className={`py-3 rounded-xl items-center ${
                  feedbackText.trim() ? "bg-brand" : isDark ? "bg-dark-700" : "bg-gray-100"
                }`}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-base font-semibold ${
                    feedbackText.trim() ? "text-white" : isDark ? "text-dark-400" : "text-gray-400"
                  }`}
                >
                  Send Feedback
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* App Info */}
        <View className="items-center mt-8">
          <Text
            className={`text-xs ${isDark ? "text-dark-500" : "text-gray-400"}`}
          >
            Hearth v1.0.0 (Build 42)
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
