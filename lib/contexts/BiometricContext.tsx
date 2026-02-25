import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import * as biometric from "../services/biometric";

interface BiometricContextValue {
  // State
  isLocked: boolean;
  isLoading: boolean;
  capabilities: biometric.BiometricCapabilities | null;
  settings: biometric.BiometricSettings;
  
  // Actions
  unlock: (promptMessage?: string) => Promise<biometric.AuthenticateResult>;
  lock: () => void;
  checkAndLock: () => Promise<void>;
  refreshCapabilities: () => Promise<void>;
  updateSettings: (settings: Partial<biometric.BiometricSettings>) => Promise<void>;
  
  // Helpers
  biometricName: string;
  biometricIcon: string;
}

const BiometricContext = createContext<BiometricContextValue | null>(null);

interface BiometricProviderProps {
  children: React.ReactNode;
}

export function BiometricProvider({ children }: BiometricProviderProps) {
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [capabilities, setCapabilities] = useState<biometric.BiometricCapabilities | null>(null);
  const [settings, setSettings] = useState<biometric.BiometricSettings>({
    enabled: false,
    timeout: 5,
  });
  const [appStateRef, setAppStateRef] = useState<AppStateStatus>(
    AppState.currentState
  );

  // Refresh capabilities
  const refreshCapabilities = useCallback(async () => {
    try {
      const caps = await biometric.getBiometricCapabilities();
      setCapabilities(caps);
    } catch (error) {
      console.error("Failed to get biometric capabilities:", error);
    }
  }, []);

  // Load initial state
  useEffect(() => {
    const loadInitialState = async () => {
      setIsLoading(true);
      try {
        // Load capabilities and settings in parallel
        const [caps, sets] = await Promise.all([
          biometric.getBiometricCapabilities(),
          biometric.getBiometricSettings(),
        ]);
        
        setCapabilities(caps);
        setSettings(sets);
        
        // Check if auth is required on app launch
        if (sets.enabled && caps.isAvailable && caps.isEnrolled) {
          const required = await biometric.isAuthenticationRequired();
          setIsLocked(required);
        }
      } catch (error) {
        console.error("Failed to load biometric state:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialState();
  }, []);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      // App coming to foreground from background
      if (
        appStateRef.match(/inactive|background/) &&
        nextState === "active"
      ) {
        await checkAndLock();
      }
      setAppStateRef(nextState);
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription?.remove();
  }, [appStateRef, settings.enabled]);

  // Check if lock is needed and lock if so
  const checkAndLock = useCallback(async () => {
    if (!settings.enabled || !capabilities?.isAvailable || !capabilities?.isEnrolled) {
      return;
    }
    
    const required = await biometric.isAuthenticationRequired();
    if (required) {
      setIsLocked(true);
    }
  }, [settings.enabled, capabilities]);

  // Unlock with biometrics
  const unlock = useCallback(async (promptMessage?: string) => {
    const result = await biometric.authenticate(promptMessage);
    if (result.success) {
      setIsLocked(false);
    }
    return result;
  }, []);

  // Manual lock
  const lock = useCallback(() => {
    if (settings.enabled && capabilities?.isAvailable && capabilities?.isEnrolled) {
      setIsLocked(true);
    }
  }, [settings.enabled, capabilities]);

  // Update settings
  const updateSettings = useCallback(async (
    newSettings: Partial<biometric.BiometricSettings>
  ) => {
    try {
      // If enabling, verify authentication first
      if (newSettings.enabled && !settings.enabled) {
        const result = await biometric.authenticate(
          "Authenticate to enable biometric lock"
        );
        if (!result.success) {
          throw new Error(result.error || "Authentication failed");
        }
      }
      
      const updated = await biometric.saveBiometricSettings(newSettings);
      setSettings(updated);
      
      // If disabling, unlock immediately
      if (newSettings.enabled === false) {
        setIsLocked(false);
      }
    } catch (error) {
      console.error("Failed to update biometric settings:", error);
      throw error;
    }
  }, [settings.enabled]);

  // Computed values
  const biometricName = capabilities
    ? biometric.getBiometricName(capabilities.biometricTypes)
    : "Biometrics";
    
  const biometricIcon = capabilities
    ? biometric.getBiometricIcon(capabilities.biometricTypes)
    : "lock-outline";

  const value: BiometricContextValue = {
    isLocked,
    isLoading,
    capabilities,
    settings,
    unlock,
    lock,
    checkAndLock,
    refreshCapabilities,
    updateSettings,
    biometricName,
    biometricIcon,
  };

  return (
    <BiometricContext.Provider value={value}>
      {children}
    </BiometricContext.Provider>
  );
}

export function useBiometric() {
  const context = useContext(BiometricContext);
  if (!context) {
    throw new Error("useBiometric must be used within a BiometricProvider");
  }
  return context;
}

export default BiometricContext;
