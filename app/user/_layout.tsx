import { Stack } from "expo-router";
import { useColorScheme } from "../../lib/hooks/useColorScheme";

export default function UserLayout() {
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
      }}
    />
  );
}
