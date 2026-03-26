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

// Widget hooks
export { useWidgets } from "./useWidgets";
