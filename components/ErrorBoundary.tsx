/**
 * Error Boundary Component
 * 
 * Catches and handles errors in the component tree, providing a fallback UI
 * and logging errors to analytics/crash reporting services.
 */

import React, { Component, type ReactNode, type ErrorInfo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { analytics } from "../lib/services/analytics";
import * as Updates from "expo-updates";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log to analytics
    analytics.logError(error, {
      component_stack: errorInfo.componentStack,
      error_boundary: true,
    });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // In production, you might send this to a crash reporting service
    if (!__DEV__) {
      this.sendToCrashReporting(error, errorInfo);
    }
  }

  private sendToCrashReporting(error: Error, errorInfo: ErrorInfo): void {
    // TODO: Integrate with crash reporting service (Sentry, Bugsnag, etc.)
    console.error("Error caught by boundary:", error, errorInfo);
    
    // Example: Send to backend
    // fetch('https://api.hearth.app/crash-reports', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     error: {
    //       message: error.message,
    //       stack: error.stack,
    //       name: error.name,
    //     },
    //     errorInfo: {
    //       componentStack: errorInfo.componentStack,
    //     },
    //     platform: Platform.OS,
    //     timestamp: new Date().toISOString(),
    //   }),
    // });
  }

  private resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleReload = async (): Promise<void> => {
    try {
      await Updates.reloadAsync();
    } catch (error) {
      console.error("Failed to reload app:", error);
      this.resetError();
    }
  };

  private handleGoHome = (): void => {
    this.resetError();
    try {
      router.replace("/(tabs)/dashboard");
    } catch (error) {
      console.error("Failed to navigate home:", error);
    }
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error,
          this.state.errorInfo!,
          this.resetError
        );
      }

      // Default error UI
      return <DefaultErrorFallback error={this.state.error} errorInfo={this.state.errorInfo} onReset={this.resetError} onReload={this.handleReload} onGoHome={this.handleGoHome} />;
    }

    return this.props.children;
  }
}

interface FallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
  onReload: () => void;
  onGoHome: () => void;
}

function DefaultErrorFallback({
  error,
  errorInfo,
  onReset,
  onReload,
  onGoHome,
}: FallbackProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-dark-900" : "bg-white"}`}
    >
      <View className="flex-1 items-center justify-center px-6">
        <View
          className={`
            w-20 h-20 
            rounded-full 
            items-center 
            justify-center 
            mb-6
            ${isDark ? "bg-red-500/20" : "bg-red-100"}
          `}
        >
          <Ionicons
            name="alert-circle"
            size={48}
            color={isDark ? "#f87171" : "#dc2626"}
          />
        </View>

        <Text
          className={`text-2xl font-bold mb-3 text-center ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          Something went wrong
        </Text>

        <Text
          className={`text-base text-center mb-8 ${
            isDark ? "text-dark-200" : "text-gray-600"
          }`}
        >
          We're sorry for the inconvenience. The error has been reported and we'll look into it.
        </Text>

        {__DEV__ && (
          <ScrollView
            className={`
              w-full 
              max-h-64 
              mb-6 
              p-4 
              rounded-xl
              ${isDark ? "bg-dark-800" : "bg-gray-100"}
            `}
          >
            <Text
              className={`text-xs font-mono mb-4 ${
                isDark ? "text-red-400" : "text-red-600"
              }`}
            >
              {error.toString()}
            </Text>
            {error.stack && (
              <Text
                className={`text-xs font-mono ${
                  isDark ? "text-dark-300" : "text-gray-700"
                }`}
              >
                {error.stack}
              </Text>
            )}
            {errorInfo?.componentStack && (
              <>
                <Text
                  className={`text-xs font-mono mt-4 mb-2 ${
                    isDark ? "text-dark-200" : "text-gray-800"
                  }`}
                >
                  Component Stack:
                </Text>
                <Text
                  className={`text-xs font-mono ${
                    isDark ? "text-dark-300" : "text-gray-700"
                  }`}
                >
                  {errorInfo.componentStack}
                </Text>
              </>
            )}
          </ScrollView>
        )}

        <View className="w-full space-y-3">
          <TouchableOpacity
            onPress={onReset}
            className="w-full bg-brand py-4 rounded-xl"
            activeOpacity={0.8}
          >
            <Text className="text-white text-center font-semibold text-base">
              Try Again
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onGoHome}
            className={`
              w-full py-4 rounded-xl
              ${isDark ? "bg-dark-800" : "bg-gray-100"}
            `}
            activeOpacity={0.8}
          >
            <Text
              className={`text-center font-semibold text-base ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Go to Home
            </Text>
          </TouchableOpacity>

          {!__DEV__ && Platform.OS !== "web" && (
            <TouchableOpacity
              onPress={onReload}
              className={`
                w-full py-4 rounded-xl
                ${isDark ? "bg-dark-800" : "bg-gray-100"}
              `}
              activeOpacity={0.8}
            >
              <Text
                className={`text-center font-medium text-base ${
                  isDark ? "text-dark-200" : "text-gray-600"
                }`}
              >
                Reload App
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {!__DEV__ && (
          <Text
            className={`mt-8 text-sm text-center ${
              isDark ? "text-dark-400" : "text-gray-400"
            }`}
          >
            Error ID: {Date.now().toString(36).toUpperCase()}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

/**
 * Hook to programmatically trigger error boundary
 */
export function useErrorHandler() {
  const [, setError] = React.useState();

  return React.useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);
}
