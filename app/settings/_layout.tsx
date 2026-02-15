import { Stack } from "expo-router";
import { useColorScheme } from "react-native";

export default function SettingsLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: isDark ? "#1e1f22" : "#ffffff",
        },
        headerTintColor: isDark ? "#ffffff" : "#111827",
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: isDark ? "#111214" : "#f9fafb",
        },
      }}
    />
  );
}
