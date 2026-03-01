import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  useColorScheme,
  Pressable,
  Switch,
  Appearance,
} from "react-native";
import { Stack } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Card } from "../../components/ui";

type ThemeMode = "light" | "dark" | "system";
type AccentColor = "brand" | "green" | "purple" | "orange" | "pink" | "red";

const THEME_KEY = "@hearth_theme_mode";
const ACCENT_KEY = "@hearth_accent_color";
const COMPACT_KEY = "@hearth_compact_mode";
const REDUCED_MOTION_KEY = "@hearth_reduced_motion";

const accentColors: { id: AccentColor; name: string; color: string }[] = [
  { id: "brand", name: "Hearth Blue", color: "#5865f2" },
  { id: "green", name: "Mint Green", color: "#3ba55c" },
  { id: "purple", name: "Violet", color: "#9b59b6" },
  { id: "orange", name: "Sunset", color: "#f39c12" },
  { id: "pink", name: "Rose", color: "#eb459e" },
  { id: "red", name: "Crimson", color: "#ed4245" },
];

export default function AppearanceSettingsScreen() {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [accentColor, setAccentColor] = useState<AccentColor>("brand");
  const [compactMode, setCompactMode] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const isDark =
    themeMode === "system"
      ? systemColorScheme === "dark"
      : themeMode === "dark";

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [savedTheme, savedAccent, savedCompact, savedMotion] =
        await Promise.all([
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(ACCENT_KEY),
          AsyncStorage.getItem(COMPACT_KEY),
          AsyncStorage.getItem(REDUCED_MOTION_KEY),
        ]);

      if (savedTheme) setThemeMode(savedTheme as ThemeMode);
      if (savedAccent) setAccentColor(savedAccent as AccentColor);
      if (savedCompact) setCompactMode(savedCompact === "true");
      if (savedMotion) setReducedMotion(savedMotion === "true");
    } catch (error) {
      console.error("Failed to load appearance settings:", error);
    }
  };

  const saveThemeMode = async (mode: ThemeMode) => {
    setThemeMode(mode);
    try {
      await AsyncStorage.setItem(THEME_KEY, mode);
      // Apply theme change
      if (mode !== "system") {
        Appearance.setColorScheme(mode);
      } else {
        Appearance.setColorScheme(null);
      }
    } catch (error) {
      console.error("Failed to save theme mode:", error);
    }
  };

  const saveAccentColor = async (color: AccentColor) => {
    setAccentColor(color);
    try {
      await AsyncStorage.setItem(ACCENT_KEY, color);
    } catch (error) {
      console.error("Failed to save accent color:", error);
    }
  };

  const toggleCompactMode = async (value: boolean) => {
    setCompactMode(value);
    try {
      await AsyncStorage.setItem(COMPACT_KEY, value.toString());
    } catch (error) {
      console.error("Failed to save compact mode:", error);
    }
  };

  const toggleReducedMotion = async (value: boolean) => {
    setReducedMotion(value);
    try {
      await AsyncStorage.setItem(REDUCED_MOTION_KEY, value.toString());
    } catch (error) {
      console.error("Failed to save reduced motion:", error);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Appearance",
          headerStyle: {
            backgroundColor: isDark ? "#1a1b1e" : "#ffffff",
          },
          headerTintColor: isDark ? "#ffffff" : "#000000",
        }}
      />

      <ScrollView
        className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Theme Mode Section */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <SectionHeader title="Theme" isDark={isDark} />
          <Card className={`mx-4 ${isDark ? "bg-dark-800" : "bg-white"}`}>
            {(["system", "light", "dark"] as ThemeMode[]).map((mode, index) => (
              <ThemeOption
                key={mode}
                mode={mode}
                isSelected={themeMode === mode}
                onSelect={() => saveThemeMode(mode)}
                isDark={isDark}
                isLast={index === 2}
              />
            ))}
          </Card>
        </Animated.View>

        {/* Accent Color Section */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <SectionHeader title="Accent Color" isDark={isDark} />
          <View className="mx-4 flex-row flex-wrap">
            {accentColors.map((accent, index) => (
              <AccentColorOption
                key={accent.id}
                accent={accent}
                isSelected={accentColor === accent.id}
                onSelect={() => saveAccentColor(accent.id)}
                isDark={isDark}
                index={index}
              />
            ))}
          </View>
        </Animated.View>

        {/* Display Options Section */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <SectionHeader title="Display" isDark={isDark} />
          <Card className={`mx-4 ${isDark ? "bg-dark-800" : "bg-white"}`}>
            <SettingRow
              icon="resize"
              title="Compact Mode"
              description="Reduce spacing between messages"
              isDark={isDark}
            >
              <Switch
                value={compactMode}
                onValueChange={toggleCompactMode}
                trackColor={{ false: "#767577", true: "#5865f2" }}
                thumbColor="#ffffff"
              />
            </SettingRow>

            <View
              className={`h-px mx-4 ${isDark ? "bg-dark-700" : "bg-gray-100"}`}
            />

            <SettingRow
              icon="flash-off"
              title="Reduce Motion"
              description="Minimize animations throughout the app"
              isDark={isDark}
              isLast
            >
              <Switch
                value={reducedMotion}
                onValueChange={toggleReducedMotion}
                trackColor={{ false: "#767577", true: "#5865f2" }}
                thumbColor="#ffffff"
              />
            </SettingRow>
          </Card>
        </Animated.View>

        {/* Preview Section */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)}>
          <SectionHeader title="Preview" isDark={isDark} />
          <Card className={`mx-4 ${isDark ? "bg-dark-800" : "bg-white"}`}>
            <View className="p-4">
              <View className="flex-row items-center mb-3">
                <View
                  className="w-10 h-10 rounded-full mr-3"
                  style={{
                    backgroundColor:
                      accentColors.find((a) => a.id === accentColor)?.color ||
                      "#5865f2",
                  }}
                >
                  <View className="flex-1 items-center justify-center">
                    <Text className="text-white font-semibold">A</Text>
                  </View>
                </View>
                <View className="flex-1">
                  <Text
                    className={`font-semibold ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Alex Chen
                  </Text>
                  <Text
                    className={`text-sm ${
                      isDark ? "text-dark-300" : "text-gray-500"
                    }`}
                  >
                    Hey! Check out this preview
                  </Text>
                </View>
              </View>
              <View
                className={`p-3 rounded-xl ${
                  isDark ? "bg-dark-700" : "bg-gray-100"
                }`}
                style={{ marginLeft: 52 }}
              >
                <Text
                  className={`${isDark ? "text-dark-100" : "text-gray-700"}`}
                >
                  This is how your messages will look with the current theme
                  settings.
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>
      </ScrollView>
    </>
  );
}

interface SectionHeaderProps {
  title: string;
  isDark: boolean;
}

function SectionHeader({ title, isDark }: SectionHeaderProps) {
  return (
    <Text
      className={`text-xs font-semibold uppercase tracking-wider mx-4 mt-6 mb-2 ${
        isDark ? "text-dark-400" : "text-gray-500"
      }`}
    >
      {title}
    </Text>
  );
}

interface ThemeOptionProps {
  mode: ThemeMode;
  isSelected: boolean;
  onSelect: () => void;
  isDark: boolean;
  isLast: boolean;
}

function ThemeOption({
  mode,
  isSelected,
  onSelect,
  isDark,
  isLast,
}: ThemeOptionProps) {
  const icons: Record<ThemeMode, React.ComponentProps<typeof Ionicons>["name"]> = {
    system: "phone-portrait",
    light: "sunny",
    dark: "moon",
  };

  const labels: Record<ThemeMode, string> = {
    system: "System Default",
    light: "Light",
    dark: "Dark",
  };

  return (
    <>
      <Pressable
        onPress={onSelect}
        className={`flex-row items-center justify-between px-4 py-3.5 ${
          isSelected ? (isDark ? "bg-dark-700" : "bg-gray-50") : ""
        }`}
      >
        <View className="flex-row items-center">
          <Ionicons
            name={icons[mode]}
            size={22}
            color={isSelected ? "#5865f2" : isDark ? "#72767d" : "#72767d"}
          />
          <Text
            className={`ml-3 text-base ${
              isSelected
                ? "text-brand font-medium"
                : isDark
                ? "text-dark-100"
                : "text-gray-700"
            }`}
          >
            {labels[mode]}
          </Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color="#5865f2" />
        )}
      </Pressable>
      {!isLast && (
        <View
          className={`h-px mx-4 ${isDark ? "bg-dark-700" : "bg-gray-100"}`}
        />
      )}
    </>
  );
}

interface AccentColorOptionProps {
  accent: { id: AccentColor; name: string; color: string };
  isSelected: boolean;
  onSelect: () => void;
  isDark: boolean;
  index: number;
}

function AccentColorOption({
  accent,
  isSelected,
  onSelect,
  isDark,
  index,
}: AccentColorOptionProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(200 + index * 50).duration(300)}
      className="w-1/3 p-2"
    >
      <Pressable
        onPress={onSelect}
        className={`items-center p-3 rounded-xl ${
          isSelected
            ? isDark
              ? "bg-dark-700"
              : "bg-gray-100"
            : ""
        }`}
      >
        <View
          className={`w-12 h-12 rounded-full items-center justify-center mb-2 ${
            isSelected ? "border-2 border-white" : ""
          }`}
          style={{
            backgroundColor: accent.color,
            shadowColor: accent.color,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isSelected ? 0.4 : 0,
            shadowRadius: 8,
            elevation: isSelected ? 4 : 0,
          }}
        >
          {isSelected && (
            <Ionicons name="checkmark" size={24} color="white" />
          )}
        </View>
        <Text
          className={`text-xs text-center ${
            isDark ? "text-dark-200" : "text-gray-600"
          }`}
        >
          {accent.name}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

interface SettingRowProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  description: string;
  isDark: boolean;
  isLast?: boolean;
  children: React.ReactNode;
}

function SettingRow({
  icon,
  title,
  description,
  isDark,
  children,
}: SettingRowProps) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3">
      <View className="flex-row items-center flex-1 mr-4">
        <Ionicons
          name={icon}
          size={22}
          color={isDark ? "#72767d" : "#72767d"}
        />
        <View className="ml-3 flex-1">
          <Text
            className={`text-base ${isDark ? "text-dark-100" : "text-gray-700"}`}
          >
            {title}
          </Text>
          <Text
            className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            {description}
          </Text>
        </View>
      </View>
      {children}
    </View>
  );
}
