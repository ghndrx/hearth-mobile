import { Stack } from "expo-router";
import { useColorScheme } from "../../lib/hooks/useColorScheme";

export default function RoomLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: isDark ? "#1e1f22" : "#ffffff",
        },
        headerTintColor: isDark ? "#ffffff" : "#000000",
        headerShadowVisible: false,
      }}
    />
  );
}
