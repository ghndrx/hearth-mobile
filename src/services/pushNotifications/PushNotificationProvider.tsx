/**
 * PushNotificationProvider
 *
 * React context provider that initializes and manages PushNotificationService
 * across the application. Handles auth-aware device registration.
 *
 * Usage:
 *   <PushNotificationProvider>
 *     <App />
 *   </PushNotificationProvider>
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import PushNotificationService from './PushNotificationService';
import { useAuthStore } from '../../../lib/stores/auth';
import { registerDevice } from '../../../lib/services/api';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushNotificationContextValue {
  // Service state
  isInitialized: boolean;
  isRegistering: boolean;
  isRegistered: boolean;

  // Token
  expoPushToken: string | null;
  tokenError: string | null;

  // Permission
  permissionStatus: Notifications.PermissionStatus | null;
  isPermissionGranted: boolean;

  // Actions
  initialize: () => Promise<boolean>;
  registerDevice: () => Promise<boolean>;
  unregisterDevice: () => Promise<void>;

  // Utility
  getPlatform: () => 'ios' | 'android' | 'unknown';
}

const PushNotificationContext = createContext<PushNotificationContextValue | null>(null);

interface PushNotificationProviderProps {
  children: ReactNode;
  /**
   * Automatically register device when user authenticates
   * @default true
   */
  autoRegisterOnAuth?: boolean;

  /**
   * Initialize service immediately on mount
   * @default true
   */
  immediateInit?: boolean;
}

interface DeviceRegistration {
  id: string;
  deviceId: string;
  platform: string;
  registeredAt: number;
}

/**
 * PushNotificationProvider
 *
 * Wraps the application and provides push notification functionality.
 * Automatically handles device registration when the user authenticates.
 */
export function PushNotificationProvider({
  children,
  autoRegisterOnAuth = true,
  immediateInit = true,
}: PushNotificationProviderProps) {
  const { token: authToken, isAuthenticated, user } = useAuthStore();

  const [isInitialized, setIsInitialized] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<Notifications.PermissionStatus | null>(null);

  // Track registered device for cleanup
  const registeredDeviceRef = useRef<DeviceRegistration | null>(null);

  // Check if permission is granted
  const isPermissionGranted = permissionStatus === 'granted';

  /**
   * Initialize the push notification service
   */
  const initialize = useCallback(async (): Promise<boolean> => {
    try {
      setTokenError(null);

      // Check permission status
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status);

      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        setPermissionStatus(newStatus);

        if (newStatus !== 'granted') {
          setTokenError('Notification permission denied');
          return false;
        }
      }

      // Initialize PushNotificationService
      const success = await PushNotificationService.initialize({
        onTokenReceived: (token) => {
          console.log('[PushNotificationProvider] Token received:', token.substring(0, 20) + '...');
          setExpoPushToken(token);
        },
        onTokenRefresh: (token) => {
          console.log('[PushNotificationProvider] Token refreshed:', token.substring(0, 20) + '...');
          setExpoPushToken(token);
          // Re-register with backend when token refreshes
          if (isAuthenticated && authToken) {
            registerDeviceWithBackend(token, authToken).catch(console.error);
          }
        },
        onNotificationReceived: (notification) => {
          console.log('[PushNotificationProvider] Notification received:', notification.request.content.title);
        },
        onNotificationOpened: (notification) => {
          console.log('[PushNotificationProvider] Notification opened:', notification.request.content.title);
        },
      });

      setIsInitialized(success);

      if (success) {
        console.log('[PushNotificationProvider] Service initialized successfully');
      } else {
        setTokenError('Failed to initialize push notification service');
      }

      return success;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Initialization failed';
      console.error('[PushNotificationProvider] Initialization error:', message);
      setTokenError(message);
      return false;
    }
  }, [isAuthenticated, authToken]);

  /**
   * Register device with backend API
   */
  const registerDeviceWithBackend = async (
    token: string,
    authToken: string
  ): Promise<boolean> => {
    try {
      const deviceId = Constants.sessionId || `${Device.brand}-${Device.modelName}-${Date.now()}`;
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      const deviceName = Device.deviceName || `${Device.brand} ${Device.modelName}`;
      const osVersion = Device.osVersion || Platform.Version.toString();
      const appVersion = Constants.expoConfig?.version || '1.0.0';

      const response = await registerDevice({
        token,
        platform,
        deviceId,
        deviceName,
        osVersion,
        appVersion,
      });

      registeredDeviceRef.current = {
        id: response.id,
        deviceId,
        platform,
        registeredAt: response.registeredAt,
      };

      console.log('[PushNotificationProvider] Device registered with backend:', response.id);
      return true;
    } catch (error) {
      console.error('[PushNotificationProvider] Device registration failed:', error);
      return false;
    }
  };

  /**
   * Register device for push notifications
   */
  const handleRegisterDevice = useCallback(async (): Promise<boolean> => {
    if (!authToken) {
      console.log('[PushNotificationProvider] Cannot register: not authenticated');
      return false;
    }

    if (isRegistering) {
      console.log('[PushNotificationProvider] Registration already in progress');
      return false;
    }

    setIsRegistering(true);
    setTokenError(null);

    try {
      // Ensure service is initialized
      if (!isInitialized) {
        const initSuccess = await initialize();
        if (!initSuccess) {
          setIsRegistering(false);
          return false;
        }
      }

      // Get push token
      const token = await PushNotificationService.getDeviceToken();

      if (!token) {
        setTokenError('Failed to get push token');
        setIsRegistering(false);
        return false;
      }

      setExpoPushToken(token);

      // Register with backend
      const registered = await registerDeviceWithBackend(token, authToken);

      if (registered) {
        setIsRegistered(true);
        console.log('[PushNotificationProvider] Device registered successfully');
      } else {
        setTokenError('Failed to register device with backend');
      }

      setIsRegistering(false);
      return registered;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      console.error('[PushNotificationProvider] Registration error:', message);
      setTokenError(message);
      setIsRegistering(false);
      return false;
    }
  }, [authToken, isRegistering, isInitialized, initialize]);

  /**
   * Unregister device from push notifications
   */
  const handleUnregisterDevice = useCallback(async (): Promise<void> => {
    try {
      // Note: Expo doesn't expose direct token unregistration
      // The backend should handle token invalidation on logout
      if (registeredDeviceRef.current) {
        console.log('[PushNotificationProvider] Unregistering device:',
          registeredDeviceRef.current.id);
        registeredDeviceRef.current = null;
      }

      setIsRegistered(false);
      setExpoPushToken(null);
      console.log('[PushNotificationProvider] Device unregistered');
    } catch (error) {
      console.error('[PushNotificationProvider] Unregister error:', error);
    }
  }, []);

  /**
   * Get current platform
   */
  const getPlatform = useCallback((): 'ios' | 'android' | 'unknown' => {
    return PushNotificationService.getPlatform();
  }, []);

  // Initialize on mount if immediateInit is true
  useEffect(() => {
    if (immediateInit) {
      initialize().catch((error) => {
        console.error('[PushNotificationProvider] Initial setup error:', error);
      });
    }

    // Cleanup on unmount
    return () => {
      PushNotificationService.cleanup().catch((error) => {
        console.error('[PushNotificationProvider] Cleanup error:', error);
      });
    };
  }, [immediateInit, initialize]);

  // Auto-register when user authenticates
  useEffect(() => {
    if (autoRegisterOnAuth && isAuthenticated && authToken && isInitialized && !isRegistered && !isRegistering) {
      console.log('[PushNotificationProvider] Auto-registering device for authenticated user');
      handleRegisterDevice().catch((error) => {
        console.error('[PushNotificationProvider] Auto-registration error:', error);
      });
    }
  }, [autoRegisterOnAuth, isAuthenticated, authToken, isInitialized, isRegistered, isRegistering, handleRegisterDevice]);

  // Cleanup on logout
  useEffect(() => {
    if (!isAuthenticated && isRegistered) {
      console.log('[PushNotificationProvider] User logged out, cleaning up registration');
      handleUnregisterDevice().catch((error) => {
        console.error('[PushNotificationProvider] Logout cleanup error:', error);
      });
    }
  }, [isAuthenticated, isRegistered, handleUnregisterDevice]);

  const value: PushNotificationContextValue = {
    isInitialized,
    isRegistering,
    isRegistered,
    expoPushToken,
    tokenError,
    permissionStatus,
    isPermissionGranted,
    initialize,
    registerDevice: handleRegisterDevice,
    unregisterDevice: handleUnregisterDevice,
    getPlatform,
  };

  return (
    <PushNotificationContext.Provider value={value}>
      {children}
    </PushNotificationContext.Provider>
  );
}

/**
 * Hook to access push notification context
 */
export function usePushNotificationContext(): PushNotificationContextValue {
  const context = useContext(PushNotificationContext);

  if (!context) {
    throw new Error(
      'usePushNotificationContext must be used within a PushNotificationProvider'
    );
  }

  return context;
}

export default PushNotificationProvider;
