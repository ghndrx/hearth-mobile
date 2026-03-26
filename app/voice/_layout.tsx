import { Stack } from "expo-router";
import { useColorScheme } from "../../lib/hooks/useColorScheme";

export default function VoiceLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
        contentStyle: {
          backgroundColor: isDark ? "#111214" : "#f9fafb",
        },
      }}
    />
  );
}
