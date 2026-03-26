import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl} from "react-native";
import { useColorScheme } from "../../lib/hooks/useColorScheme";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import type { Scene, Automation } from "../../lib/types/iot";

const MOCK_SCENES: Scene[] = [
  {
    id: "s1",
    name: "Movie Night",
    icon: "movie",
    color: "#8b5cf6",
    deviceActions: [
      { deviceId: "1", state: { brightness: 20, isOn: true } },
      { deviceId: "4", state: { isOn: false } },
    ],
    isActive: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "s2",
    name: "Good Night",
    icon: "sleep",
    color: "#3b82f6",
    deviceActions: [
      { deviceId: "1", state: { isOn: false } },
      { deviceId: "3", state: { lockState: "locked" } },
    ],
    isActive: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "s3",
    name: "Morning Routine",
    icon: "morning",
    color: "#f59e0b",
    deviceActions: [
      { deviceId: "1", state: { brightness: 80, isOn: true } },
      { deviceId: "2", state: { targetTemperature: 23, isOn: true } },
    ],
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "s4",
    name: "Away Mode",
    icon: "away",
    color: "#6b7280",
    deviceActions: [
      { deviceId: "1", state: { isOn: false } },
      { deviceId: "3", state: { lockState: "locked" } },
      { deviceId: "5", state: { garageDoorState: "closed" } },
    ],
    isActive: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "s5",
    name: "Party Mode",
    icon: "party",
    color: "#ec4899",
    deviceActions: [
      { deviceId: "1", state: { brightness: 100, isOn: true, color: "#ec4899" } },
    ],
    isActive: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "s6",
    name: "Focus Time",
    icon: "focus",
    color: "#06b6d4",
    deviceActions: [
      { deviceId: "1", state: { brightness: 60, isOn: true } },
      { deviceId: "4", state: { isOn: false } },
    ],
    isActive: false,
    createdAt: new Date().toISOString(),
  },
];

const MOCK_AUTOMATIONS: Automation[] = [
  {
    id: "a1",
    name: "Morning Lights",
    trigger: { type: "sunrise", time: "06:30" },
    actions: [
      { deviceId: "1", state: { brightness: 60, isOn: true } },
      { deviceId: "6", state: { brightness: 80, isOn: true } },
    ],
    isEnabled: true,
    lastTriggered: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: "a2",
    name: "Lock at Night",
    trigger: { type: "time", time: "23:00" },
    actions: [{ deviceId: "3", state: { lockState: "locked" } }],
    isEnabled: true,
    lastTriggered: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: "a3",
    name: "Motion Night Light",
    trigger: {
      type: "device_state",
      deviceId: "8",
      condition: "motionDetected",
      value: "true",
    },
    actions: [{ deviceId: "1", state: { brightness: 10, isOn: true } }],
    isEnabled: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "a4",
    name: "Welcome Home",
    trigger: { type: "location", value: "home" },
    actions: [
      { deviceId: "1", state: { brightness: 80, isOn: true } },
      { deviceId: "3", state: { lockState: "unlocked" } },
    ],
    isEnabled: true,
    createdAt: new Date().toISOString(),
  },
];

const SCENE_ICONS: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
  movie: "film-outline",
  sleep: "moon-outline",
  morning: "sunny-outline",
  away: "exit-outline",
  party: "musical-notes-outline",
  focus: "glasses-outline",
  relax: "cafe-outline",
  dinner: "restaurant-outline",
};

const TRIGGER_ICONS: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
  time: "time-outline",
  device_state: "hardware-chip-outline",
  location: "location-outline",
  sunrise: "sunny-outline",
  sunset: "partly-sunny-outline",
};

function getTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ScenesScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"scenes" | "automations">("scenes");
  const [scenes, setScenes] = useState(MOCK_SCENES);
  const [automations, setAutomations] = useState(MOCK_AUTOMATIONS);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const toggleScene = useCallback((sceneId: string) => {
    setScenes((prev) =>
      prev.map((s) =>
        s.id === sceneId ? { ...s, isActive: !s.isActive } : s
      )
    );
  }, []);

  const toggleAutomation = useCallback((automationId: string) => {
    setAutomations((prev) =>
      prev.map((a) =>
        a.id === automationId ? { ...a, isEnabled: !a.isEnabled } : a
      )
    );
  }, []);

  const activeScenes = scenes.filter((s) => s.isActive);

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Scenes & Automations",
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
          headerRight: () => (
            <TouchableOpacity className="mr-4">
              <Ionicons
                name="add-circle-outline"
                size={26}
                color="#f59e0b"
              />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Tab Switcher */}
      <View
        className={`flex-row border-b ${isDark ? "border-dark-700" : "border-gray-200"}`}
      >
        <TouchableOpacity
          onPress={() => setActiveTab("scenes")}
          className={`flex-1 py-3 items-center ${
            activeTab === "scenes" ? "border-b-2 border-hearth-amber" : ""
          }`}
        >
          <Text
            className={`font-medium ${
              activeTab === "scenes"
                ? "text-hearth-amber"
                : isDark
                  ? "text-dark-400"
                  : "text-gray-500"
            }`}
          >
            Scenes ({scenes.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("automations")}
          className={`flex-1 py-3 items-center ${
            activeTab === "automations" ? "border-b-2 border-hearth-amber" : ""
          }`}
        >
          <Text
            className={`font-medium ${
              activeTab === "automations"
                ? "text-hearth-amber"
                : isDark
                  ? "text-dark-400"
                  : "text-gray-500"
            }`}
          >
            Automations ({automations.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === "scenes" ? (
          <>
            {/* Active scenes banner */}
            {activeScenes.length > 0 && (
              <Animated.View
                entering={FadeInDown.delay(50).duration(400)}
                className="px-5 mt-4"
              >
                <View
                  className={`p-4 rounded-xl ${
                    isDark ? "bg-hearth-amber/10 border border-hearth-amber/20" : "bg-amber-50 border border-amber-200"
                  }`}
                >
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="flash" size={18} color="#f59e0b" />
                    <Text
                      className={`ml-2 text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
                    >
                      {activeScenes.length} Active Scene{activeScenes.length > 1 ? "s" : ""}
                    </Text>
                  </View>
                  <Text className={`text-xs ${isDark ? "text-dark-300" : "text-gray-500"}`}>
                    {activeScenes.map((s) => s.name).join(", ")}
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* Scene Grid */}
            <View className="px-5 mt-4 flex-row flex-wrap" style={{ gap: 12 }}>
              {scenes.map((scene, index) => (
                <Animated.View
                  key={scene.id}
                  entering={FadeInDown.delay(100 + index * 50).duration(400)}
                  style={{ width: "47%" }}
                >
                  <TouchableOpacity
                    onPress={() => toggleScene(scene.id)}
                    activeOpacity={0.7}
                    className={`p-4 rounded-2xl border ${
                      scene.isActive
                        ? "border-2"
                        : isDark
                          ? "border-dark-700"
                          : "border-gray-200"
                    } ${isDark ? "bg-dark-800" : "bg-white"}`}
                    style={scene.isActive ? { borderColor: scene.color || "#f59e0b" } : undefined}
                  >
                    <View className="flex-row items-center justify-between mb-3">
                      <View
                        className="w-10 h-10 rounded-full items-center justify-center"
                        style={{
                          backgroundColor: (scene.color || "#f59e0b") + "20",
                        }}
                      >
                        <Ionicons
                          name={
                            (scene.icon && SCENE_ICONS[scene.icon]) ||
                            "color-wand-outline"
                          }
                          size={20}
                          color={scene.color || "#f59e0b"}
                        />
                      </View>
                      <View
                        className={`w-3 h-3 rounded-full ${
                          scene.isActive ? "bg-iot-online" : isDark ? "bg-dark-600" : "bg-gray-300"
                        }`}
                      />
                    </View>
                    <Text
                      className={`text-sm font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                      numberOfLines={1}
                    >
                      {scene.name}
                    </Text>
                    <Text
                      className={`text-xs mt-1 ${isDark ? "text-dark-400" : "text-gray-500"}`}
                    >
                      {scene.deviceActions.length} device{scene.deviceActions.length !== 1 ? "s" : ""}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </>
        ) : (
          <>
            {/* Automations List */}
            <View className="px-5 mt-4">
              {automations.map((automation, index) => (
                <Animated.View
                  key={automation.id}
                  entering={FadeInDown.delay(100 + index * 50).duration(400)}
                >
                  <View
                    className={`p-4 rounded-xl mb-3 border ${
                      isDark
                        ? "bg-dark-800 border-dark-700"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1">
                        <View
                          className={`w-10 h-10 rounded-full items-center justify-center ${
                            automation.isEnabled
                              ? "bg-hearth-amber/20"
                              : isDark
                                ? "bg-dark-700"
                                : "bg-gray-100"
                          }`}
                        >
                          <Ionicons
                            name={TRIGGER_ICONS[automation.trigger.type] || "flash-outline"}
                            size={20}
                            color={automation.isEnabled ? "#f59e0b" : isDark ? "#80848e" : "#9ca3af"}
                          />
                        </View>
                        <View className="ml-3 flex-1">
                          <Text
                            className={`text-sm font-semibold ${
                              isDark ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {automation.name}
                          </Text>
                          <View className="flex-row items-center mt-1">
                            <Text
                              className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}
                            >
                              {automation.trigger.type === "time" && `At ${automation.trigger.time}`}
                              {automation.trigger.type === "sunrise" && `Sunrise (${automation.trigger.time})`}
                              {automation.trigger.type === "sunset" && "At sunset"}
                              {automation.trigger.type === "device_state" && "When device changes"}
                              {automation.trigger.type === "location" && "Location-based"}
                            </Text>
                            <Text
                              className={`text-xs mx-1 ${isDark ? "text-dark-500" : "text-gray-300"}`}
                            >
                              ·
                            </Text>
                            <Text
                              className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}
                            >
                              {automation.actions.length} action{automation.actions.length !== 1 ? "s" : ""}
                            </Text>
                          </View>
                          {automation.lastTriggered && (
                            <Text
                              className={`text-xs mt-0.5 ${isDark ? "text-dark-500" : "text-gray-400"}`}
                            >
                              Last run: {getTimeAgo(automation.lastTriggered)}
                            </Text>
                          )}
                        </View>
                      </View>

                      <TouchableOpacity
                        onPress={() => toggleAutomation(automation.id)}
                        className={`w-12 h-7 rounded-full justify-center ${
                          automation.isEnabled ? "bg-hearth-amber" : isDark ? "bg-dark-600" : "bg-gray-300"
                        }`}
                      >
                        <View
                          className={`w-5 h-5 rounded-full bg-white shadow-sm ${
                            automation.isEnabled ? "ml-6" : "ml-1"
                          }`}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Animated.View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
