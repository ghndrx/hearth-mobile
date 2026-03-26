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
import { NetworkStatusBar } from "../components/NetworkStatusBar";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { deepLinkManager, quickActionsService, spotlightService } from "../lib/services";
import { offlineSyncService } from "../lib/services/offlineSync";
import { MessageQueueProvider } from "../lib/contexts/MessageQueueContext";
import { analytics } from "../lib/services/analytics";
import { useAppStatePerformance } from "../lib/hooks";
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
  const { isAuthenticated, isLoading, loadStoredAuth, user } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const [_servicesInitialized, setServicesInitialized] = useState(false);

  // Track app state changes for analytics
  useAppStatePerformance();

  // Initialize platform services
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Initialize analytics
        await analytics.initialize();

        // Initialize deep linking
        await deepLinkManager.initialize();

        // Initialize quick actions (home screen shortcuts)
        await quickActionsService.initialize();

        // Initialize Spotlight/Siri integration (iOS only)
        await spotlightService.initialize();

        // Start offline sync service
        offlineSyncService.start();

        setServicesInitialized(true);
      } catch (error) {
        console.error("Failed to initialize platform services:", error);
        analytics.logError(error as Error, { context: "service_initialization" });
        setServicesInitialized(true); // Continue anyway
      }
    };

    initializeServices();

    // Cleanup on unmount
    return () => {
      deepLinkManager.cleanup();
      offlineSyncService.stop();
      analytics.cleanup();
    };
  }, []);

  // Update analytics user properties when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      analytics.setUserId(user.id);
      analytics.setUserProperties({
        userId: user.id,
        email: user.email,
        username: user.username,
      });
    } else {
      analytics.setUserId(null);
    }
  }, [isAuthenticated, user]);

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
    <ErrorBoundary
      onError={(error, errorInfo) => {
        analytics.logError(error, {
          component_stack: errorInfo.componentStack,
          error_boundary: "root",
        });
      }}
    >
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NotificationProvider>
            <BiometricProvider>
              <MessageQueueProvider>
                <BiometricLockScreen>
                  <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
                  <NetworkStatusBar />
                  <RootLayoutNav />
                  <NotificationBanner />
                </BiometricLockScreen>
              </MessageQueueProvider>
            </BiometricProvider>
          </NotificationProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
