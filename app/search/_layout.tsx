import { Stack } from "expo-router";
import { useColorScheme } from "../../lib/hooks/useColorScheme";

export default function SearchLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_bottom",
        contentStyle: {
          backgroundColor: isDark ? "#111214" : "#f9fafb",
        },
      }}
    />
  );
}
