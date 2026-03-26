/**
 * Unified Permission Management Service
 *
 * Centralizes all permission requests and management across the app:
 * - Push notifications
 * - Camera/media library
 * - Microphone (audio)
 * - Location (future)
 *
 * Features:
 * - Real-time permission status monitoring
 * - Contextual permission requests with rationale
 * - Retry logic with backoff
 * - System settings integration
 * - Permission state caching
 */

import * as Notifications from "expo-notifications";
import * as MediaLibrary from "expo-media-library";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import { Platform, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Storage keys
const PERMISSION_STATE_KEY = "@hearth/permission_states";
const PERMISSION_RETRY_KEY = "@hearth/permission_retry";

// Permission types supported by the manager
export type PermissionType =
  | "notifications"
  | "camera"
  | "mediaLibrary"
  | "microphone"
  | "cameraRoll";

// Permission status extended with more granular states
export type ExtendedPermissionStatus =
  | "granted"
  | "denied"
  | "undetermined"
  | "restricted"
  | "provisional" // iOS notifications only
  | "never_ask_again"; // Android only

// Permission request result
export interface PermissionResult {
  status: ExtendedPermissionStatus;
  granted: boolean;
  canAskAgain: boolean;
  message?: string;
}

// Permission rationale for user education
export interface PermissionRationale {
  title: string;
  description: string;
  benefits: string[];
  alternatives?: string;
}

// Permission retry state
interface PermissionRetryState {
  [key: string]: {
    attempts: number;
    lastAttempt: number;
    backoffUntil: number;
  };
}

// Permission state cache
interface PermissionStateCache {
  [key: string]: {
    status: ExtendedPermissionStatus;
    lastChecked: number;
    granted: boolean;
  };
}

class PermissionManagerService {
  private cache: PermissionStateCache = {};
  private retryState: PermissionRetryState = {};
  private listeners: Map<PermissionType, Set<(result: PermissionResult) => void>> = new Map();

  // Cache expiry time (5 minutes)
  private readonly CACHE_EXPIRY = 5 * 60 * 1000;

  // Retry configuration
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_BACKOFF_BASE = 60000; // 1 minute base

  constructor() {
    this.loadCachedStates();
    this.loadRetryStates();
  }

  /**
   * Permission rationales for user education
   */
  private readonly rationales: Record<PermissionType, PermissionRationale> = {
    notifications: {
      title: "Enable Notifications",
      description: "Stay connected with your friends and communities",
      benefits: [
        "Get notified when friends message you",
        "Never miss important server announcements",
        "Receive calls even when the app is closed"
      ],
      alternatives: "You can manually check for new messages by opening the app"
    },
    camera: {
      title: "Camera Access",
      description: "Take photos to share with your friends",
      benefits: [
        "Capture and share moments instantly",
        "Take profile pictures and server icons",
        "Share photos in your conversations"
      ],
      alternatives: "You can select photos from your gallery instead"
    },
    mediaLibrary: {
      title: "Photo Library Access",
      description: "Save and share photos from your device",
      benefits: [
        "Save important images shared in chats",
        "Upload existing photos to share",
        "Create a backup of memorable conversations"
      ],
      alternatives: "You can use the camera to take new photos"
    },
    microphone: {
      title: "Microphone Access",
      description: "Send voice messages and join voice chats",
      benefits: [
        "Send voice messages to friends",
        "Participate in voice channels",
        "Make voice calls with friends"
      ],
      alternatives: "You can use text messaging instead"
    },
    cameraRoll: {
      title: "Photo Access",
      description: "Select photos and videos to share",
      benefits: [
        "Share photos from your gallery",
        "Send videos to friends",
        "Set profile pictures"
      ]
    }
  };

  /**
   * Get cached permission status or check fresh
   */
  async getPermissionStatus(
    type: PermissionType,
    useCache: boolean = true
  ): Promise<PermissionResult> {
    const now = Date.now();
    const cached = this.cache[type];

    // Use cache if valid and requested
    if (useCache && cached && (now - cached.lastChecked) < this.CACHE_EXPIRY) {
      return {
        status: cached.status,
        granted: cached.granted,
        canAskAgain: this.canAskForPermission(type)
      };
    }

    // Check fresh status
    const result = await this.checkPermissionFresh(type);

    // Update cache
    this.cache[type] = {
      status: result.status,
      granted: result.granted,
      lastChecked: now
    };

    await this.saveCachedStates();
    return result;
  }

  /**
   * Request permission with rationale and retry logic
   */
  async requestPermission(
    type: PermissionType,
    showRationale: boolean = true
  ): Promise<PermissionResult> {
    // Check if we can request (retry logic)
    if (!this.canAskForPermission(type)) {
      const retryInfo = this.retryState[type];
      const waitTime = Math.ceil((retryInfo.backoffUntil - Date.now()) / 1000 / 60);
      return {
        status: "denied",
        granted: false,
        canAskAgain: false,
        message: `Please wait ${waitTime} minutes before requesting again`
      };
    }

    // Check current status first
    const currentStatus = await this.getPermissionStatus(type, false);
    if (currentStatus.granted) {
      return currentStatus;
    }

    // Show rationale if needed (implement in UI layer)
    if (showRationale && currentStatus.status === "undetermined") {
      // UI layer should show rationale using this.getRationale(type)
      // This method just handles the actual permission request
    }

    // Perform the actual request
    const result = await this.performPermissionRequest(type);

    // Update retry state
    await this.updateRetryState(type, result);

    // Notify listeners
    this.notifyListeners(type, result);

    // Update cache
    this.cache[type] = {
      status: result.status,
      granted: result.granted,
      lastChecked: Date.now()
    };

    await this.saveCachedStates();
    return result;
  }

  /**
   * Get permission rationale for UI display
   */
  getRationale(type: PermissionType): PermissionRationale {
    return this.rationales[type];
  }

  /**
   * Open system settings for the app
   */
  async openSystemSettings(): Promise<void> {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error("Failed to open system settings:", error);
      throw new Error("Could not open system settings");
    }
  }

  /**
   * Check if we can ask for permission (respects retry backoff)
   */
  private canAskForPermission(type: PermissionType): boolean {
    const retryInfo = this.retryState[type];
    if (!retryInfo) return true;

    return (
      retryInfo.attempts < this.MAX_RETRY_ATTEMPTS &&
      Date.now() >= retryInfo.backoffUntil
    );
  }

  /**
   * Fresh permission status check (no cache)
   */
  private async checkPermissionFresh(type: PermissionType): Promise<PermissionResult> {
    let status: ExtendedPermissionStatus;
    let granted = false;

    try {
      switch (type) {
        case "notifications": {
          const result = await Notifications.getPermissionsAsync();
          status = this.mapNotificationStatus(result.status);
          granted = result.granted;
          break;
        }
        case "camera": {
          const result = await ImagePicker.getCameraPermissionsAsync();
          status = this.mapMediaStatus(result.status);
          granted = result.granted;
          break;
        }
        case "cameraRoll": {
          const result = await ImagePicker.getMediaLibraryPermissionsAsync();
          status = this.mapMediaStatus(result.status);
          granted = result.granted;
          break;
        }
        case "mediaLibrary": {
          const result = await MediaLibrary.getPermissionsAsync();
          status = this.mapMediaStatus(result.status);
          granted = result.granted;
          break;
        }
        case "microphone": {
          const result = await Audio.getPermissionsAsync();
          status = this.mapAudioStatus(result.status);
          granted = result.granted;
          break;
        }
        default:
          throw new Error(`Unsupported permission type: ${type}`);
      }
    } catch (error) {
      console.error(`Failed to check ${type} permission:`, error);
      status = "denied";
      granted = false;
    }

    return {
      status,
      granted,
      canAskAgain: this.canAskForPermission(type)
    };
  }

  /**
   * Perform the actual permission request
   */
  private async performPermissionRequest(type: PermissionType): Promise<PermissionResult> {
    let status: ExtendedPermissionStatus;
    let granted = false;
    let message: string | undefined;

    try {
      switch (type) {
        case "notifications": {
          const result = await Notifications.requestPermissionsAsync({
            ios: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
              allowDisplayInCarPlay: true,
              allowCriticalAlerts: false,
              allowProvisional: false,
              provideAppNotificationSettings: true,
            },
          });
          status = this.mapNotificationStatus(result.status);
          granted = result.granted;
          break;
        }
        case "camera": {
          const result = await ImagePicker.requestCameraPermissionsAsync();
          status = this.mapMediaStatus(result.status);
          granted = result.granted;
          if (!granted && result.canAskAgain === false) {
            message = "Camera permission was permanently denied. Please enable it in Settings.";
          }
          break;
        }
        case "cameraRoll": {
          const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
          status = this.mapMediaStatus(result.status);
          granted = result.granted;
          if (!granted && result.canAskAgain === false) {
            message = "Photo library permission was permanently denied. Please enable it in Settings.";
          }
          break;
        }
        case "mediaLibrary": {
          const result = await MediaLibrary.requestPermissionsAsync();
          status = this.mapMediaStatus(result.status);
          granted = result.granted;
          break;
        }
        case "microphone": {
          const result = await Audio.requestPermissionsAsync();
          status = this.mapAudioStatus(result.status);
          granted = result.granted;
          if (!granted) {
            message = "Microphone access is required for voice messages and calls.";
          }
          break;
        }
        default:
          throw new Error(`Unsupported permission type: ${type}`);
      }
    } catch (error) {
      console.error(`Failed to request ${type} permission:`, error);
      status = "denied";
      granted = false;
      message = `Failed to request ${type} permission: ${error}`;
    }

    return {
      status,
      granted,
      canAskAgain: this.canAskForPermission(type),
      message
    };
  }

  /**
   * Map notification permission status to extended status
   */
  private mapNotificationStatus(status: Notifications.PermissionStatus): ExtendedPermissionStatus {
    // Handle iOS provisional notifications
    if (Platform.OS === "ios" && status === "granted") {
      // Could be provisional - would need to check settings details
      return "granted";
    }

    switch (status) {
      case "granted":
        return "granted";
      case "denied":
        return "denied";
      case "undetermined":
        return "undetermined";
      default:
        return "denied";
    }
  }

  /**
   * Map media permission status to extended status
   */
  private mapMediaStatus(status: string): ExtendedPermissionStatus {
    switch (status) {
      case "granted":
        return "granted";
      case "denied":
        return "denied";
      case "undetermined":
        return "undetermined";
      case "restricted":
        return "restricted";
      default:
        return "denied";
    }
  }

  /**
   * Map audio permission status to extended status
   */
  private mapAudioStatus(status: string): ExtendedPermissionStatus {
    switch (status) {
      case "granted":
        return "granted";
      case "denied":
        return "denied";
      case "undetermined":
        return "undetermined";
      default:
        return "denied";
    }
  }

  /**
   * Update retry state after permission request
   */
  private async updateRetryState(type: PermissionType, result: PermissionResult): Promise<void> {
    if (result.granted) {
      // Reset retry state on success
      delete this.retryState[type];
    } else {
      // Update retry state
      const current = this.retryState[type] || { attempts: 0, lastAttempt: 0, backoffUntil: 0 };
      const now = Date.now();

      current.attempts += 1;
      current.lastAttempt = now;

      // Exponential backoff: 1min, 5min, 30min
      const backoffMultiplier = Math.pow(2, current.attempts - 1);
      const backoffTime = this.RETRY_BACKOFF_BASE * backoffMultiplier;
      current.backoffUntil = now + backoffTime;

      this.retryState[type] = current;
    }

    await this.saveRetryStates();
  }

  /**
   * Add listener for permission status changes
   */
  addListener(
    type: PermissionType,
    listener: (result: PermissionResult) => void
  ): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    this.listeners.get(type)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(listener);
      if (this.listeners.get(type)?.size === 0) {
        this.listeners.delete(type);
      }
    };
  }

  /**
   * Notify all listeners of permission change
   */
  private notifyListeners(type: PermissionType, result: PermissionResult): void {
    this.listeners.get(type)?.forEach(listener => {
      try {
        listener(result);
      } catch (error) {
        console.error(`Permission listener error for ${type}:`, error);
      }
    });
  }

  /**
   * Load cached permission states from storage
   */
  private async loadCachedStates(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(PERMISSION_STATE_KEY);
      if (stored) {
        this.cache = JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to load cached permission states:", error);
      this.cache = {};
    }
  }

  /**
   * Save cached permission states to storage
   */
  private async saveCachedStates(): Promise<void> {
    try {
      await AsyncStorage.setItem(PERMISSION_STATE_KEY, JSON.stringify(this.cache));
    } catch (error) {
      console.error("Failed to save cached permission states:", error);
    }
  }

  /**
   * Load retry states from storage
   */
  private async loadRetryStates(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(PERMISSION_RETRY_KEY);
      if (stored) {
        this.retryState = JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to load permission retry states:", error);
      this.retryState = {};
    }
  }

  /**
   * Save retry states to storage
   */
  private async saveRetryStates(): Promise<void> {
    try {
      await AsyncStorage.setItem(PERMISSION_RETRY_KEY, JSON.stringify(this.retryState));
    } catch (error) {
      console.error("Failed to save permission retry states:", error);
    }
  }

  /**
   * Clear all cached data (useful for debugging)
   */
  async clearCache(): Promise<void> {
    this.cache = {};
    this.retryState = {};
    await AsyncStorage.removeItem(PERMISSION_STATE_KEY);
    await AsyncStorage.removeItem(PERMISSION_RETRY_KEY);
  }

  /**
   * Get all permission statuses at once
   */
  async getAllPermissionStatuses(): Promise<Record<PermissionType, PermissionResult>> {
    const types: PermissionType[] = ["notifications", "camera", "mediaLibrary", "microphone", "cameraRoll"];
    const results: Partial<Record<PermissionType, PermissionResult>> = {};

    await Promise.all(
      types.map(async (type) => {
        try {
          results[type] = await this.getPermissionStatus(type);
        } catch (error) {
          console.error(`Failed to get ${type} permission:`, error);
          results[type] = {
            status: "denied",
            granted: false,
            canAskAgain: false,
            message: `Error checking ${type} permission`
          };
        }
      })
    );

    return results as Record<PermissionType, PermissionResult>;
  }
}

// Export singleton instance
export const permissionManager = new PermissionManagerService();