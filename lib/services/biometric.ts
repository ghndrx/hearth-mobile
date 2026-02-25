import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const BIOMETRIC_ENABLED_KEY = "@hearth/biometric_enabled";
const BIOMETRIC_TIMEOUT_KEY = "@hearth/biometric_timeout";
const LAST_AUTHENTICATED_KEY = "@hearth/last_authenticated";

export type BiometricType = "fingerprint" | "face" | "iris" | "none";

export interface BiometricCapabilities {
  isAvailable: boolean;
  isEnrolled: boolean;
  biometricTypes: BiometricType[];
  securityLevel: LocalAuthentication.SecurityLevel;
}

export interface BiometricSettings {
  enabled: boolean;
  timeout: number; // minutes before requiring re-auth (0 = always)
}

const DEFAULT_SETTINGS: BiometricSettings = {
  enabled: false,
  timeout: 5, // 5 minutes
};

// Timeout presets in minutes
export const TIMEOUT_PRESETS = [
  { label: "Immediately", value: 0 },
  { label: "After 1 minute", value: 1 },
  { label: "After 5 minutes", value: 5 },
  { label: "After 15 minutes", value: 15 },
  { label: "After 30 minutes", value: 30 },
  { label: "After 1 hour", value: 60 },
] as const;

/**
 * Check device biometric capabilities
 */
export async function getBiometricCapabilities(): Promise<BiometricCapabilities> {
  // Check if hardware supports biometrics
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  
  // Check if biometrics are enrolled
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  
  // Get available authentication types
  const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
  
  // Get security level
  const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();
  
  // Map to our types
  const biometricTypes: BiometricType[] = supportedTypes.map((type) => {
    switch (type) {
      case LocalAuthentication.AuthenticationType.FINGERPRINT:
        return "fingerprint";
      case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
        return "face";
      case LocalAuthentication.AuthenticationType.IRIS:
        return "iris";
      default:
        return "none";
    }
  }).filter((t): t is BiometricType => t !== "none");

  return {
    isAvailable: hasHardware,
    isEnrolled,
    biometricTypes,
    securityLevel,
  };
}

/**
 * Get human-readable name for biometric type
 */
export function getBiometricName(types: BiometricType[]): string {
  if (types.includes("face")) {
    return Platform.OS === "ios" ? "Face ID" : "Face Recognition";
  }
  if (types.includes("fingerprint")) {
    return Platform.OS === "ios" ? "Touch ID" : "Fingerprint";
  }
  if (types.includes("iris")) {
    return "Iris Recognition";
  }
  return "Biometrics";
}

/**
 * Get icon name for biometric type
 */
export function getBiometricIcon(types: BiometricType[]): string {
  if (types.includes("face")) {
    return "face-recognition";
  }
  if (types.includes("fingerprint")) {
    return "fingerprint";
  }
  if (types.includes("iris")) {
    return "eye-outline";
  }
  return "lock-outline";
}

/**
 * Get biometric settings from secure storage
 */
export async function getBiometricSettings(): Promise<BiometricSettings> {
  try {
    const enabledStr = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    const timeoutStr = await SecureStore.getItemAsync(BIOMETRIC_TIMEOUT_KEY);
    
    return {
      enabled: enabledStr === "true",
      timeout: timeoutStr ? parseInt(timeoutStr, 10) : DEFAULT_SETTINGS.timeout,
    };
  } catch (error) {
    console.error("Failed to get biometric settings:", error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save biometric settings to secure storage
 */
export async function saveBiometricSettings(
  settings: Partial<BiometricSettings>
): Promise<BiometricSettings> {
  try {
    const current = await getBiometricSettings();
    const updated = { ...current, ...settings };
    
    await SecureStore.setItemAsync(
      BIOMETRIC_ENABLED_KEY,
      String(updated.enabled)
    );
    await SecureStore.setItemAsync(
      BIOMETRIC_TIMEOUT_KEY,
      String(updated.timeout)
    );
    
    // If enabling, update last authenticated to now
    if (settings.enabled) {
      await updateLastAuthenticated();
    }
    
    return updated;
  } catch (error) {
    console.error("Failed to save biometric settings:", error);
    throw error;
  }
}

/**
 * Update the last authenticated timestamp
 */
export async function updateLastAuthenticated(): Promise<void> {
  try {
    await SecureStore.setItemAsync(
      LAST_AUTHENTICATED_KEY,
      String(Date.now())
    );
  } catch (error) {
    console.error("Failed to update last authenticated:", error);
  }
}

/**
 * Get the last authenticated timestamp
 */
export async function getLastAuthenticated(): Promise<number | null> {
  try {
    const timestamp = await SecureStore.getItemAsync(LAST_AUTHENTICATED_KEY);
    return timestamp ? parseInt(timestamp, 10) : null;
  } catch {
    return null;
  }
}

/**
 * Check if biometric authentication is required based on timeout
 */
export async function isAuthenticationRequired(): Promise<boolean> {
  try {
    const settings = await getBiometricSettings();
    
    // Biometrics not enabled
    if (!settings.enabled) {
      return false;
    }
    
    // Timeout of 0 means always require auth
    if (settings.timeout === 0) {
      return true;
    }
    
    const lastAuth = await getLastAuthenticated();
    if (!lastAuth) {
      return true;
    }
    
    const timeoutMs = settings.timeout * 60 * 1000;
    const elapsed = Date.now() - lastAuth;
    
    return elapsed > timeoutMs;
  } catch (error) {
    console.error("Failed to check authentication required:", error);
    return false;
  }
}

export interface AuthenticateResult {
  success: boolean;
  error?: string;
  warning?: string;
}

/**
 * Authenticate user with biometrics
 */
export async function authenticate(
  promptMessage?: string
): Promise<AuthenticateResult> {
  try {
    const capabilities = await getBiometricCapabilities();
    
    if (!capabilities.isAvailable) {
      return {
        success: false,
        error: "Biometric authentication is not available on this device",
      };
    }
    
    if (!capabilities.isEnrolled) {
      return {
        success: false,
        error: "No biometrics enrolled. Please set up biometrics in your device settings.",
      };
    }
    
    const biometricName = getBiometricName(capabilities.biometricTypes);
    
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: promptMessage || `Unlock Hearth with ${biometricName}`,
      cancelLabel: "Cancel",
      disableDeviceFallback: false, // Allow PIN/pattern as fallback
      fallbackLabel: "Use Passcode",
    });
    
    if (result.success) {
      await updateLastAuthenticated();
      return { success: true };
    }
    
    // Handle different error types
    switch (result.error) {
      case "user_cancel":
        return {
          success: false,
          error: "Authentication cancelled",
        };
      case "user_fallback":
        return {
          success: false,
          warning: "Using device passcode instead",
        };
      case "system_cancel":
        return {
          success: false,
          error: "Authentication was cancelled by the system",
        };
      case "not_enrolled":
        return {
          success: false,
          error: "No biometrics enrolled on this device",
        };
      case "lockout":
        return {
          success: false,
          error: "Too many failed attempts. Please try again later.",
        };
      case "lockout_permanent":
        return {
          success: false,
          error: "Biometrics locked. Please use your device passcode.",
        };
      default:
        return {
          success: false,
          error: "Authentication failed. Please try again.",
        };
    }
  } catch (error) {
    console.error("Biometric authentication error:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Clear biometric settings (for logout)
 */
export async function clearBiometricSettings(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_TIMEOUT_KEY);
    await SecureStore.deleteItemAsync(LAST_AUTHENTICATED_KEY);
  } catch (error) {
    console.error("Failed to clear biometric settings:", error);
  }
}
