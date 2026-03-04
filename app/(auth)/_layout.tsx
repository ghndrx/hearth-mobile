import { Stack, useRouter } from "expo-router";
import { useColorScheme, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function AuthLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: isDark ? "#1e1f22" : "#ffffff",
        },
        animation: "slide_from_right",
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
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              className="p-2 -ml-2"
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={isDark ? "#ffffff" : "#1a1a1a"}
              />
            </TouchableOpacity>
          ),
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
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              className="p-2 -ml-2"
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={isDark ? "#ffffff" : "#1a1a1a"}
              />
            </TouchableOpacity>
          ),
        }}
      />
    </Stack>
  );
}
