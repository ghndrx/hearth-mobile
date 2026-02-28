import { Stack } from "expo-router";
import { useColorScheme } from "react-native";

export default function AuthLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: isDark ? "#1e1f22" : "#ffffff",
        },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen
        name="reset-password"
        options={{
          headerShown: true,
          title: "Reset Password",
          headerStyle: {
            backgroundColor: isDark ? "#1e1f22" : "#ffffff",
          },
          headerTintColor: isDark ? "#ffffff" : "#1a1a1a",
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="verify-email"
        options={{
          headerShown: true,
          title: "",
          headerStyle: {
            backgroundColor: isDark ? "#1e1f22" : "#ffffff",
          },
          headerTintColor: isDark ? "#ffffff" : "#1a1a1a",
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}
