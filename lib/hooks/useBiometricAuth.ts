import { useCallback, useEffect, useState } from "react";
import * as biometric from "../services/biometric";

interface UseBiometricAuthOptions {
  /** Auto-prompt for authentication on mount */
  autoPrompt?: boolean;
  /** Custom prompt message */
  promptMessage?: string;
}

interface UseBiometricAuthReturn {
  /** Whether authentication was successful */
  isAuthenticated: boolean;
  /** Whether authentication is in progress */
  isAuthenticating: boolean;
  /** Error message if authentication failed */
  error: string | null;
  /** Biometric capabilities of the device */
  capabilities: biometric.BiometricCapabilities | null;
  /** Human-readable name for the biometric type */
  biometricName: string;
  /** Icon name for the biometric type */
  biometricIcon: string;
  /** Trigger authentication */
  authenticate: (message?: string) => Promise<boolean>;
  /** Reset authentication state */
  reset: () => void;
}

/**
 * Hook for biometric authentication in specific screens
 * Use this for one-time authentication flows (e.g., sensitive actions)
 */
export function useBiometricAuth(
  options: UseBiometricAuthOptions = {}
): UseBiometricAuthReturn {
  const { autoPrompt = false, promptMessage } = options;
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<biometric.BiometricCapabilities | null>(null);

  // Load capabilities on mount
  useEffect(() => {
    biometric.getBiometricCapabilities().then(setCapabilities);
  }, []);

  const authenticate = useCallback(async (message?: string): Promise<boolean> => {
    if (isAuthenticating) return false;
    
    setIsAuthenticating(true);
    setError(null);
    
    try {
      const result = await biometric.authenticate(message || promptMessage);
      
      if (result.success) {
        setIsAuthenticated(true);
        return true;
      } else {
        setError(result.error || "Authentication failed");
        return false;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  }, [isAuthenticating, promptMessage]);

  const reset = useCallback(() => {
    setIsAuthenticated(false);
    setError(null);
  }, []);

  // Auto-prompt on mount if enabled
  useEffect(() => {
    if (autoPrompt && capabilities?.isAvailable && capabilities?.isEnrolled) {
      authenticate();
    }
  }, [autoPrompt, capabilities, authenticate]);

  const biometricName = capabilities
    ? biometric.getBiometricName(capabilities.biometricTypes)
    : "Biometrics";
    
  const biometricIcon = capabilities
    ? biometric.getBiometricIcon(capabilities.biometricTypes)
    : "lock-outline";

  return {
    isAuthenticated,
    isAuthenticating,
    error,
    capabilities,
    biometricName,
    biometricIcon,
    authenticate,
    reset,
  };
}

export default useBiometricAuth;
