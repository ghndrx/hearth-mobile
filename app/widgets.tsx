import React from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  useColorScheme,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  UnreadMessagesWidget,
  MentionsWidget,
  DirectMessagesWidget,
} from "../components/widgets";
import { useWidgets } from "../lib/hooks/useWidgets";
import { LoadingSpinner } from "../components/ui";

export default function WidgetsScreen() {
  const isDark = useColorScheme() === "dark";
  const {
    unreadMessages,
    mentions,
    directMessages,
    isLoading,
    isRefreshing,
    refresh,
    refreshSingle,
  } = useWidgets();

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Widgets",
          headerTitleStyle: {
            color: isDark ? "#ffffff" : "#111827",
            fontSize: 20,
            fontWeight: "bold",
          },
          headerStyle: {
            backgroundColor: isDark ? "#1e1f22" : "#ffffff",
          },
        }}
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <LoadingSpinner size="lg" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refresh}
              tintColor={isDark ? "#5865f2" : "#4f46e5"}
            />
          }
        >
          {/* Info banner */}
          <Animated.View entering={FadeInDown.delay(50).duration(400)}>
            <View
              className={`flex-row items-center p-3 rounded-xl mb-4 ${isDark ? "bg-brand/10 border border-brand/20" : "bg-indigo-50 border border-indigo-200"}`}
            >
              <Ionicons
                name={Platform.OS === "ios" ? "phone-portrait" : "phone-portrait-outline"}
                size={18}
                color="#5865f2"
              />
              <Text
                className={`text-sm ml-2 flex-1 ${isDark ? "text-dark-200" : "text-gray-700"}`}
              >
                Add these widgets to your {Platform.OS === "ios" ? "iOS" : "Android"} home
                screen for quick access.
              </Text>
            </View>
          </Animated.View>

          {/* Small widgets row */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <Text
              className={`text-base font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}
            >
              Quick Glance
            </Text>
            <View className="flex-row" style={{ gap: 12 }}>
              <View className="flex-1">
                {unreadMessages && (
                  <UnreadMessagesWidget
                    data={unreadMessages}
                    size="small"
                    onRefresh={() => refreshSingle("unread_messages")}
                  />
                )}
              </View>
              <View className="flex-1">
                {mentions && (
                  <MentionsWidget
                    data={mentions}
                    size="small"
                    onRefresh={() => refreshSingle("mentions")}
                  />
                )}
              </View>
              <View className="flex-1">
                {directMessages && (
                  <DirectMessagesWidget
                    data={directMessages}
                    size="small"
                    onRefresh={() => refreshSingle("direct_messages")}
                  />
                )}
              </View>
            </View>
          </Animated.View>

          {/* Medium widgets */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <Text
              className={`text-base font-semibold mt-6 mb-3 ${isDark ? "text-white" : "text-gray-900"}`}
            >
              Detailed View
            </Text>
            <View style={{ gap: 12 }}>
              {unreadMessages && (
                <UnreadMessagesWidget
                  data={unreadMessages}
                  size="medium"
                  onRefresh={() => refreshSingle("unread_messages")}
                />
              )}
              {mentions && (
                <MentionsWidget
                  data={mentions}
                  size="medium"
                  onRefresh={() => refreshSingle("mentions")}
                />
              )}
              {directMessages && (
                <DirectMessagesWidget
                  data={directMessages}
                  size="medium"
                  onRefresh={() => refreshSingle("direct_messages")}
                />
              )}
            </View>
          </Animated.View>

          {/* Native widget instructions */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <View
              className={`mt-6 p-4 rounded-2xl ${isDark ? "bg-dark-800" : "bg-white"} border ${isDark ? "border-dark-700" : "border-gray-200"}`}
            >
              <Text
                className={`text-base font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}
              >
                Add to Home Screen
              </Text>
              {Platform.OS === "ios" ? (
                <View>
                  <InstructionStep
                    step={1}
                    text="Long-press on your home screen"
                    isDark={isDark}
                  />
                  <InstructionStep
                    step={2}
                    text='Tap the "+" button in the top-left corner'
                    isDark={isDark}
                  />
                  <InstructionStep
                    step={3}
                    text='Search for "Hearth" in the widget gallery'
                    isDark={isDark}
                  />
                  <InstructionStep
                    step={4}
                    text="Choose a widget size and tap Add Widget"
                    isDark={isDark}
                  />
                </View>
              ) : (
                <View>
                  <InstructionStep
                    step={1}
                    text="Long-press on your home screen"
                    isDark={isDark}
                  />
                  <InstructionStep
                    step={2}
                    text='Select "Widgets" from the menu'
                    isDark={isDark}
                  />
                  <InstructionStep
                    step={3}
                    text='Find "Hearth" in the widget list'
                    isDark={isDark}
                  />
                  <InstructionStep
                    step={4}
                    text="Drag the widget to your home screen"
                    isDark={isDark}
                  />
                </View>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function InstructionStep({
  step,
  text,
  isDark,
}: {
  step: number;
  text: string;
  isDark: boolean;
}) {
  return (
    <View className="flex-row items-center py-1.5">
      <View className="w-6 h-6 rounded-full bg-brand/20 items-center justify-center mr-3">
        <Text className="text-brand text-xs font-bold">{step}</Text>
      </View>
      <Text
        className={`text-sm flex-1 ${isDark ? "text-dark-200" : "text-gray-700"}`}
      >
        {text}
      </Text>
    </View>
  );
}
