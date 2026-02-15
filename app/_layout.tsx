import { useEffect, useState } from "react";
import { View, useColorScheme } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "../lib/stores/auth";
import { NotificationProvider } from "../lib/contexts/NotificationContext";
import { NotificationBanner } from "../components/notifications";
import { LoadingSpinner } from "../components/ui";
import "../global.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 2,
    },
  },
});

function RootLayoutNav() {
  const segments = useSegments();
  const router = useRouter();
  const { isAuthenticated, isLoading, loadStoredAuth } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const inAuthGroup = segments[0] === "(auth)";

      if (!isAuthenticated && !inAuthGroup) {
        router.replace("/(auth)/login");
      } else if (isAuthenticated && inAuthGroup) {
        router.replace("/(tabs)");
      }

      setIsReady(true);
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading || !isReady) {
    return (
      <View className="flex-1 items-center justify-center bg-dark-900">
        <LoadingSpinner size="large" text="Loading..." />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>
          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
          <RootLayoutNav />
          <NotificationBanner />
        </NotificationProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
