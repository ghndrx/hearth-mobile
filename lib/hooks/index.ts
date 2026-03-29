/**
 * Hooks Index
 * Re-exports all custom hooks for easy importing
 */

// Biometric hooks
export { useBiometricAuth } from "./useBiometricAuth";

// Notification hooks
export * from "./useNotifications";
export { usePushNotifications } from "./usePushNotifications";

// Network status hooks
export { useNetworkStatus, useIsOnline } from "./useNetworkStatus";

// Network intelligence hooks (NET-001)
export {
  useNetworkIntelligence,
  useNetworkQuality,
  useVoiceOptimization,
  useNetworkTransitions,
} from "./useNetworkIntelligence";

// WebSocket hooks
export {
  useWebSocket,
  useWebSocketMessage,
  useTypingIndicator,
  usePresence,
} from "./useWebSocket";

// Performance hooks
export {
  useComponentPerformance,
  usePerformanceTimer,
  useNavigationPerformance,
  useAppStatePerformance,
  useMemoryMonitoring,
  useScrollPerformance,
  useImageLoadPerformance,
  measureNetworkRequest,
} from "./usePerformance";

// Onboarding hooks
export { useOnboarding } from "./useOnboarding";
