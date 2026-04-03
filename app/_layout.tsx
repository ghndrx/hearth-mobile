import { useEffect, useState } from "react";
import { View, useColorScheme, AppState, AppStateStatus } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "../lib/stores/auth";
import { PushNotificationProvider } from "../src/services/pushNotifications/PushNotificationProvider";
import { BiometricProvider } from "../lib/contexts/BiometricContext";
import { BackgroundProcessingProvider } from "../lib/contexts/BackgroundProcessingContext";
import { NotificationBanner } from "../components/notifications";
import { BiometricLockScreen } from "../components/BiometricLockScreen";
import { LoadingSpinner } from "../components/ui";
import { NetworkStatusBar } from "../components/NetworkStatusBar";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { deepLinkManager, quickActionsService, spotlightService } from "../lib/services";
import { offlineSyncService } from "../lib/services/offlineSync";
import { analytics } from "../lib/services/analytics";
import { backgroundProcessingService } from "../lib/services/backgroundProcessing";
import { batteryOptimizationService } from "../lib/services/batteryOptimization";
import { performanceMonitorService } from "../lib/services/performanceMonitor";
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

        // Initialize performance optimization services (PN-006)
        console.log('[App] Initializing background processing services...');

        // Initialize performance monitoring first as other services depend on it
        await performanceMonitorService.initialize();

        // Initialize battery optimization service
        await batteryOptimizationService.initialize();

        // Initialize background processing service
        await backgroundProcessingService.start();

        // Start enhanced offline sync service (now with intelligent optimization)
        await offlineSyncService.start();

        console.log('[App] Background processing services initialized successfully');

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
      console.log('[App] Cleaning up background processing services...');

      // Stop background processing services (PN-006)
      backgroundProcessingService.stop();
      batteryOptimizationService.stop();
      performanceMonitorService.stop();

      // Stop other services
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

  // Handle app state changes for services and optimization
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log(`[App] App state changed to: ${nextAppState}`);

      if (nextAppState === "active") {
        // Re-check for quick actions when app becomes active
        // This handles shortcuts triggered while app was backgrounded

        // PN-006: Optimization when app becomes active
        // The services will automatically adjust their processing intervals
        // and prioritize tasks when the app becomes active
      } else if (nextAppState === "background") {
        // PN-006: When app goes to background, enable power-saving features
        // The services will automatically adjust to background mode
        console.log('[App] App backgrounded, services will optimize for battery life');

        // Record app backgrounding for analytics
        analytics.logEvent("app_backgrounded", {
          timestamp: Date.now(),
          battery_optimization_enabled: true,
        });
      } else if (nextAppState === "inactive") {
        // App is transitioning between foreground and background
        console.log('[App] App inactive, preparing for potential background mode');
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
          <BackgroundProcessingProvider>
            <PushNotificationProvider>
              <BiometricProvider>
                <BiometricLockScreen>
                  <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
                  <NetworkStatusBar />
                  <RootLayoutNav />
                  <NotificationBanner />
                </BiometricLockScreen>
              </BiometricProvider>
            </PushNotificationProvider>
          </BackgroundProcessingProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
