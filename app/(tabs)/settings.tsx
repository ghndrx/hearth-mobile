import { useState } from "react";
import { router } from "expo-router";
import { useAuthStore } from "../../lib/stores/auth";
import { useNotificationContext } from "../../lib/contexts/NotificationContext";
import {
  SettingsScreen,
  SettingsSection,
  type SettingsItem,
} from "../../components/settings";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const {
    settings: notificationSettings,
    updateSettings,
    isPermissionGranted,
  } = useNotificationContext();

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [readReceipts, setReadReceipts] = useState(true);

  const notificationItems: SettingsItem[] = [
    {
      id: "push",
      icon: "notifications-outline",
      label: "Push Notifications",
      subtitle: !isPermissionGranted
        ? "Permission required"
        : notificationSettings.enabled
          ? "Enabled"
          : "Disabled",
      type: "link",
      onPress: () => router.push("/settings/notifications"),
    },
    {
      id: "email",
      icon: "mail-outline",
      label: "Email Notifications",
      subtitle: "Receive email updates",
      type: "switch",
      value: emailNotifications,
      onValueChange: setEmailNotifications,
    },
  ];

  const soundItems: SettingsItem[] = [
    {
      id: "sounds",
      icon: "volume-high-outline",
      label: "Sounds",
      subtitle: "Play notification sounds",
      type: "switch",
      value: notificationSettings.sounds,
      onValueChange: (value) => updateSettings({ sounds: value }),
    },
    {
      id: "haptics",
      icon: "phone-portrait-outline",
      label: "Haptics",
      subtitle: "Enable haptic feedback",
      type: "switch",
      value: haptics,
      onValueChange: setHaptics,
    },
  ];

  const displayItems: SettingsItem[] = [
    {
      id: "compact",
      icon: "contract-outline",
      label: "Compact Mode",
      subtitle: "Show more content with less spacing",
      type: "switch",
      value: compactMode,
      onValueChange: setCompactMode,
    },
    {
      id: "readReceipts",
      icon: "eye-outline",
      label: "Read Receipts",
      subtitle: "Show when you've read messages",
      type: "switch",
      value: readReceipts,
      onValueChange: setReadReceipts,
    },
  ];

  const generalItems: SettingsItem[] = [
    {
      id: "language",
      icon: "language-outline",
      label: "Language",
      subtitle: "English",
      type: "value",
    },
    {
      id: "region",
      icon: "globe-outline",
      label: "Region",
      subtitle: "US",
      type: "value",
    },
  ];

  const privacyItems: SettingsItem[] = [
    {
      id: "password",
      icon: "lock-closed-outline",
      label: "Change Password",
      type: "link",
      showChevron: true,
    },
    {
      id: "biometric",
      icon: "finger-print-outline",
      label: "Biometric Auth",
      type: "link",
      showChevron: true,
    },
    {
      id: "2fa",
      icon: "shield-checkmark-outline",
      label: "Two-Factor Auth",
      type: "link",
      showChevron: true,
    },
  ];

  const accountItems: SettingsItem[] = [
    {
      id: "email",
      icon: "mail-outline",
      label: "Email",
      subtitle: user?.email || "Not set",
      type: "value",
    },
    {
      id: "phone",
      icon: "phone-portrait-outline",
      label: "Phone",
      subtitle: "Not set",
      type: "value",
    },
    {
      id: "joined",
      icon: "calendar-outline",
      label: "Date Joined",
      subtitle: "2024",
      type: "value",
    },
  ];

  const dataItems: SettingsItem[] = [
    {
      id: "media",
      icon: "wifi-outline",
      label: "Media Auto-Download",
      subtitle: "Wi-Fi Only",
      type: "link",
      showChevron: true,
    },
    {
      id: "cache",
      icon: "trash-bin-outline",
      label: "Clear Cache",
      subtitle: "125 MB used",
      type: "link",
      showChevron: true,
    },
  ];

  const dangerItems: SettingsItem[] = [
    {
      id: "delete",
      icon: "warning-outline",
      label: "Delete Account",
      type: "danger",
      destructive: true,
    },
  ];

  const sections: SettingsSection[] = [
    { title: "Notifications", items: notificationItems },
    { title: "Sound & Haptics", items: soundItems },
    { title: "Display", items: displayItems },
    { title: "General", items: generalItems },
    { title: "Privacy & Security", items: privacyItems },
    { title: "Account", items: accountItems },
    {
      title: "Data Usage",
      items: dataItems,
      footer:
        "Media files are automatically downloaded when connected to Wi-Fi",
    },
    { title: "Danger Zone", items: dangerItems },
  ];

  return (
    <SettingsScreen
      header={{
        title: "Settings",
        showBackButton: true,
      }}
      sections={sections}
      footerText="Hearth v0.1.0 • Build 2024.2.14"
    />
  );
}
