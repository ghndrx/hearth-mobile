import React from "react";
import {
  View,
  Text,
  ScrollView,
  useColorScheme,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ListItem, ListDivider, SwitchItem } from "../ui";

export interface SettingsSection {
  title: string;
  items: SettingsItem[];
  footer?: string;
}

export interface SettingsItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  type: "link" | "switch" | "value" | "danger";
  value?: boolean | string;
  onPress?: () => void;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
  showChevron?: boolean;
  destructive?: boolean;
  badge?: string | number;
}

export interface SettingsHeaderProps {
  title: string;
  showBackButton?: boolean;
}

export interface SettingsScreenProps {
  sections: SettingsSection[];
  header?: SettingsHeaderProps;
  footerText?: string;
  onBackPress?: () => void;
}

function SettingsHeader({
  title,
  showBackButton = true,
  onBackPress,
}: SettingsHeaderProps & { onBackPress?: () => void }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Stack.Screen
      options={{
        headerShown: true,
        headerTitle: title,
        headerTitleStyle: {
          color: isDark ? "#ffffff" : "#111827",
          fontSize: 20,
          fontWeight: "bold",
        },
        headerStyle: {
          backgroundColor: isDark ? "#1e1f22" : "#ffffff",
        },
        headerLeft: showBackButton
          ? () => (
              <TouchableOpacity
                className="ml-4"
                onPress={onBackPress || (() => router.back())}
              >
                <Ionicons
                  name="chevron-back"
                  size={28}
                  color={isDark ? "#80848e" : "#6b7280"}
                />
              </TouchableOpacity>
            )
          : undefined,
      }}
    />
  );
}

function SettingsSectionComponent({
  section,
  isDark,
}: {
  section: SettingsSection;
  isDark: boolean;
}) {
  return (
    <View className="mb-6">
      <Text
        className={`
          text-xs 
          font-semibold 
          uppercase 
          mb-2
          px-4
          ${isDark ? "text-dark-400" : "text-gray-500"}
        `}
      >
        {section.title}
      </Text>
      <View
        className={`
          mx-4
          rounded-xl
          overflow-hidden
          ${isDark ? "bg-dark-800" : "bg-white"}
          border
          ${isDark ? "border-dark-700" : "border-gray-200"}
        `}
      >
        {section.items.map((item, index) => (
          <React.Fragment key={item.id}>
            {item.type === "switch" ? (
              <SwitchItem
                title={item.label}
                subtitle={item.subtitle}
                value={(item.value as boolean) ?? false}
                onValueChange={item.onValueChange ?? (() => {})}
                disabled={item.disabled}
              />
            ) : item.type === "danger" ? (
              <ListItem
                title={item.label}
                subtitle={item.subtitle}
                onPress={item.onPress}
                destructive
                leftIcon={
                  <Ionicons name={item.icon} size={22} color="#ef4444" />
                }
                showChevron={item.showChevron}
              />
            ) : (
              <ListItem
                title={item.label}
                subtitle={item.subtitle}
                onPress={item.onPress}
                showChevron={item.showChevron ?? item.type === "link"}
                leftIcon={
                  <Ionicons
                    name={item.icon}
                    size={22}
                    color={isDark ? "#80848e" : "#6b7280"}
                  />
                }
                rightIcon={
                  item.badge ? (
                    <View className="bg-brand rounded-full min-w-[20px] h-5 items-center justify-center px-1.5 mr-2">
                      <Text className="text-white text-xs font-bold">
                        {item.badge}
                      </Text>
                    </View>
                  ) : undefined
                }
              />
            )}
            {index < section.items.length - 1 && <ListDivider inset />}
          </React.Fragment>
        ))}
      </View>
      {section.footer && (
        <Text
          className={`
            text-xs 
            px-4 
            mt-2
            ${isDark ? "text-dark-400" : "text-gray-500"}
          `}
        >
          {section.footer}
        </Text>
      )}
    </View>
  );
}

export function SettingsScreen({
  sections,
  header,
  footerText,
  onBackPress,
}: SettingsScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}>
      {header && (
        <SettingsHeader
          title={header.title}
          showBackButton={header.showBackButton}
          onBackPress={onBackPress}
        />
      )}

      <ScrollView className="flex-1">
        {sections.map((section, index) => (
          <SettingsSectionComponent
            key={`${section.title}-${index}`}
            section={section}
            isDark={isDark}
          />
        ))}

        {footerText && (
          <Text
            className={`
              text-center 
              text-xs 
              mt-4
              mb-8
              ${isDark ? "text-dark-500" : "text-gray-400"}
            `}
          >
            {footerText}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default SettingsScreen;
