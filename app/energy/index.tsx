import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

interface EnergyDevice {
  id: string;
  name: string;
  room: string;
  currentWatts: number;
  todayKwh: number;
  monthKwh: number;
  isOn: boolean;
}

interface EnergyPeriod {
  label: string;
  kwh: number;
  cost: number;
}

const MOCK_DEVICES: EnergyDevice[] = [
  { id: "1", name: "Living Room Lights", room: "Living Room", currentWatts: 45, todayKwh: 0.54, monthKwh: 16.2, isOn: true },
  { id: "2", name: "Main Thermostat", room: "Living Room", currentWatts: 1200, todayKwh: 8.4, monthKwh: 252, isOn: true },
  { id: "3", name: "Kitchen Lights", room: "Kitchen", currentWatts: 60, todayKwh: 0.72, monthKwh: 21.6, isOn: true },
  { id: "4", name: "Bedroom Fan", room: "Bedroom", currentWatts: 0, todayKwh: 0.15, monthKwh: 4.5, isOn: false },
  { id: "5", name: "Doorbell Camera", room: "Entrance", currentWatts: 5, todayKwh: 0.12, monthKwh: 3.6, isOn: true },
  { id: "6", name: "Smart Plug", room: "Living Room", currentWatts: 0, todayKwh: 0, monthKwh: 0, isOn: false },
  { id: "7", name: "Window Blinds", room: "Bedroom", currentWatts: 2, todayKwh: 0.02, monthKwh: 0.6, isOn: true },
];

const DAILY_HISTORY: EnergyPeriod[] = [
  { label: "Mon", kwh: 12.3, cost: 1.85 },
  { label: "Tue", kwh: 14.1, cost: 2.12 },
  { label: "Wed", kwh: 11.8, cost: 1.77 },
  { label: "Thu", kwh: 13.5, cost: 2.03 },
  { label: "Fri", kwh: 15.2, cost: 2.28 },
  { label: "Sat", kwh: 16.8, cost: 2.52 },
  { label: "Today", kwh: 9.95, cost: 1.49 },
];

export default function EnergyScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<"day" | "week" | "month">("week");

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const totalCurrentWatts = MOCK_DEVICES.reduce((sum, d) => sum + d.currentWatts, 0);
  const totalTodayKwh = MOCK_DEVICES.reduce((sum, d) => sum + d.todayKwh, 0);
  const totalMonthKwh = MOCK_DEVICES.reduce((sum, d) => sum + d.monthKwh, 0);
  const totalWeekKwh = DAILY_HISTORY.reduce((sum, d) => sum + d.kwh, 0);
  const totalWeekCost = DAILY_HISTORY.reduce((sum, d) => sum + d.cost, 0);
  const maxDailyKwh = Math.max(...DAILY_HISTORY.map((d) => d.kwh));
  const activeDevices = MOCK_DEVICES.filter((d) => d.isOn).length;
  const sortedDevices = [...MOCK_DEVICES].sort((a, b) => b.currentWatts - a.currentWatts);

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Energy Monitor",
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

      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Current Usage Card */}
        <Animated.View entering={FadeInDown.delay(50).duration(400)} className="px-5 mt-4">
          <View
            className={`p-5 rounded-2xl ${
              isDark ? "bg-dark-800 border border-dark-700" : "bg-white border border-gray-200"
            }`}
          >
            <View className="flex-row items-center mb-1">
              <Ionicons name="flash" size={20} color="#f59e0b" />
              <Text className={`ml-2 text-sm font-medium ${isDark ? "text-dark-300" : "text-gray-500"}`}>
                Current Usage
              </Text>
            </View>
            <View className="flex-row items-baseline">
              <Text className={`text-4xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {totalCurrentWatts.toLocaleString()}
              </Text>
              <Text className={`text-lg ml-1 ${isDark ? "text-dark-400" : "text-gray-500"}`}>W</Text>
            </View>
            <Text className={`text-xs mt-1 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
              {activeDevices} of {MOCK_DEVICES.length} devices active
            </Text>
          </View>
        </Animated.View>

        {/* Summary Stats */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          className="flex-row px-5 mt-3"
          style={{ gap: 12 }}
        >
          <View
            className={`flex-1 p-4 rounded-xl ${
              isDark ? "bg-dark-800 border border-dark-700" : "bg-white border border-gray-200"
            }`}
          >
            <Ionicons name="today-outline" size={18} color="#3b82f6" />
            <Text className={`text-lg font-bold mt-2 ${isDark ? "text-white" : "text-gray-900"}`}>
              {totalTodayKwh.toFixed(1)}
            </Text>
            <Text className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}>kWh today</Text>
          </View>
          <View
            className={`flex-1 p-4 rounded-xl ${
              isDark ? "bg-dark-800 border border-dark-700" : "bg-white border border-gray-200"
            }`}
          >
            <Ionicons name="calendar-outline" size={18} color="#8b5cf6" />
            <Text className={`text-lg font-bold mt-2 ${isDark ? "text-white" : "text-gray-900"}`}>
              {totalMonthKwh.toFixed(0)}
            </Text>
            <Text className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}>kWh this month</Text>
          </View>
          <View
            className={`flex-1 p-4 rounded-xl ${
              isDark ? "bg-dark-800 border border-dark-700" : "bg-white border border-gray-200"
            }`}
          >
            <Ionicons name="cash-outline" size={18} color="#22c55e" />
            <Text className={`text-lg font-bold mt-2 ${isDark ? "text-white" : "text-gray-900"}`}>
              ${totalWeekCost.toFixed(2)}
            </Text>
            <Text className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}>cost this week</Text>
          </View>
        </Animated.View>

        {/* Period Selector */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)} className="px-5 mt-5">
          <View className="flex-row items-center justify-between mb-3">
            <Text className={`text-base font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
              Usage History
            </Text>
            <View className="flex-row">
              {(["day", "week", "month"] as const).map((period) => (
                <TouchableOpacity
                  key={period}
                  onPress={() => setSelectedPeriod(period)}
                  className={`px-3 py-1 rounded-full ml-1 ${
                    selectedPeriod === period
                      ? "bg-hearth-amber"
                      : isDark
                        ? "bg-dark-700"
                        : "bg-gray-200"
                  }`}
                >
                  <Text
                    className={`text-xs font-medium capitalize ${
                      selectedPeriod === period
                        ? "text-white"
                        : isDark
                          ? "text-dark-300"
                          : "text-gray-600"
                    }`}
                  >
                    {period}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Bar Chart */}
          <View
            className={`p-4 rounded-xl ${
              isDark ? "bg-dark-800 border border-dark-700" : "bg-white border border-gray-200"
            }`}
          >
            <View className="flex-row items-end justify-between" style={{ height: 120 }}>
              {DAILY_HISTORY.map((day, index) => {
                const height = maxDailyKwh > 0 ? (day.kwh / maxDailyKwh) * 100 : 0;
                const isToday = index === DAILY_HISTORY.length - 1;
                return (
                  <View key={day.label} className="items-center flex-1">
                    <Text
                      className={`text-[10px] mb-1 ${isDark ? "text-dark-400" : "text-gray-500"}`}
                    >
                      {day.kwh.toFixed(1)}
                    </Text>
                    <View
                      className={`w-6 rounded-t-md ${
                        isToday ? "bg-hearth-amber" : isDark ? "bg-dark-600" : "bg-gray-300"
                      }`}
                      style={{ height: Math.max(height, 4) }}
                    />
                    <Text
                      className={`text-[10px] mt-1 ${
                        isToday
                          ? "text-hearth-amber font-medium"
                          : isDark
                            ? "text-dark-400"
                            : "text-gray-500"
                      }`}
                    >
                      {day.label}
                    </Text>
                  </View>
                );
              })}
            </View>
            <View className="flex-row justify-between mt-3 pt-3 border-t border-dark-700">
              <Text className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                Weekly total: {totalWeekKwh.toFixed(1)} kWh
              </Text>
              <Text className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                Avg: {(totalWeekKwh / DAILY_HISTORY.length).toFixed(1)} kWh/day
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Device Breakdown */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)} className="px-5 mt-5">
          <Text className={`text-base font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
            Device Breakdown
          </Text>
          {sortedDevices.map((device, index) => {
            const maxWatts = sortedDevices[0].currentWatts || 1;
            const barWidth = device.currentWatts > 0 ? (device.currentWatts / maxWatts) * 100 : 0;

            return (
              <Animated.View
                key={device.id}
                entering={FadeInDown.delay(300 + index * 30).duration(300)}
              >
                <View
                  className={`p-3 rounded-xl mb-2 border ${
                    isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"
                  }`}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-1">
                      <Text
                        className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}
                      >
                        {device.name}
                      </Text>
                      <Text className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                        {device.room}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text
                        className={`text-sm font-semibold ${
                          device.isOn
                            ? isDark
                              ? "text-white"
                              : "text-gray-900"
                            : isDark
                              ? "text-dark-500"
                              : "text-gray-400"
                        }`}
                      >
                        {device.currentWatts > 0 ? `${device.currentWatts}W` : "Off"}
                      </Text>
                      <Text className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                        {device.todayKwh.toFixed(2)} kWh today
                      </Text>
                    </View>
                  </View>
                  {device.currentWatts > 0 && (
                    <View className={`h-1.5 rounded-full ${isDark ? "bg-dark-700" : "bg-gray-100"}`}>
                      <View
                        className="h-1.5 rounded-full bg-hearth-amber"
                        style={{ width: `${Math.max(barWidth, 2)}%` }}
                      />
                    </View>
                  )}
                </View>
              </Animated.View>
            );
          })}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
