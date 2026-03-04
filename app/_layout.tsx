import { useEffect, useState } from "react";
import { View, useColorScheme, AppState, AppStateStatus } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "../lib/stores/auth";
import { NotificationProvider } from "../lib/contexts/NotificationContext";
import { BiometricProvider } from "../lib/contexts/BiometricContext";
import { NotificationBanner } from "../components/notifications";
import { BiometricLockScreen } from "../components/BiometricLockScreen";
import { LoadingSpinner } from "../components/ui";
import { deepLinkManager, quickActionsService, spotlightService } from "../lib/services";
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
  const [_servicesInitialized, setServicesInitialized] = useState(false);

  // Initialize platform services
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Initialize deep linking
        await deepLinkManager.initialize();

        // Initialize quick actions (home screen shortcuts)
        await quickActionsService.initialize();

        // Initialize Spotlight/Siri integration (iOS only)
        await spotlightService.initialize();

        setServicesInitialized(true);
      } catch (error) {
        console.error("Failed to initialize platform services:", error);
        setServicesInitialized(true); // Continue anyway
      }
    };

    initializeServices();

    // Cleanup on unmount
    return () => {
      deepLinkManager.cleanup();
    };
  }, []);

  // Handle app state changes for Quick Actions
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        // Re-check for quick actions when app becomes active
        // This handles shortcuts triggered while app was backgrounded
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const inAuthGroup = segments[0] === "(auth)";

      if (!isAuthenticated && !inAuthGroup) {
        router.replace("/(auth)/login");
      } else if (isAuthenticated && inAuthGroup) {
        router.replace("/(tabs)/dashboard");
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
          <BiometricProvider>
            <BiometricLockScreen>
              <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
              <RootLayoutNav />
              <NotificationBanner />
            </BiometricLockScreen>
          </BiometricProvider>
        </NotificationProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
