/**
 * Device Discovery and Registration Service
 * CDH-001: Real-time device discovery and registration
 */

import Constants from "expo-constants";
import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { api, type ApiResponse } from "./api";
import type {
  UserDevice,
  DeviceRegistrationData,
  DeviceCapabilities,
  DeviceDiscoveryResponse,
  DeviceDiscoveryOptions,
  DevicePresenceUpdate,
  CallHandoffManager,
  CallHandoffResult,
  CallState,
  UserDeviceType,
  UserDevicePlatform,
  DeviceHandoffSuggestion,
  DeviceSyncPreferences,
} from "../types/callHandoff";

// Device capability detection
class DeviceCapabilityDetector {
  static async detectCapabilities(): Promise<DeviceCapabilities> {
    const capabilities: DeviceCapabilities = {
      hasCamera: false,
      hasMicrophone: false,
      hasSpeakers: true, // Assume all devices have speakers
      supportsVideo: false,
      supportsScreenShare: false,
      supportsWebRTC: true, // React Native supports WebRTC
      audioCodecs: ["opus", "pcmu", "pcma"],
      videoCodecs: ["VP8", "VP9", "H264"],
    };

    try {
      // On mobile devices, typically have camera and microphone
      if (Platform.OS === "ios" || Platform.OS === "android") {
        capabilities.hasCamera = true;
        capabilities.hasMicrophone = true;
        capabilities.supportsVideo = true;
        capabilities.supportsScreenShare = Platform.OS === "ios" ? true : false; // iOS has better screen share support
        capabilities.maxVideoResolution = "1080p";
      }

      // Web platform capabilities
      if (Platform.OS === "web") {
        // Check if getUserMedia is available
        try {
          if (typeof navigator !== 'undefined' &&
              navigator.mediaDevices &&
              'getUserMedia' in navigator.mediaDevices) {
            capabilities.hasCamera = true;
            capabilities.hasMicrophone = true;
            capabilities.supportsVideo = true;
          }
        } catch {
          // getUserMedia not available
        }

        // Check for screen sharing support
        try {
          if (typeof navigator !== 'undefined' &&
              navigator.mediaDevices &&
              'getDisplayMedia' in navigator.mediaDevices) {
            capabilities.supportsScreenShare = true;
          }
        } catch {
          // getDisplayMedia not available
        }

        capabilities.maxVideoResolution = "1080p";
      }

      return capabilities;
    } catch (error) {
      console.warn("Failed to detect device capabilities:", error);
      return capabilities;
    }
  }
}

// Device info collection
class DeviceInfoCollector {
  static getDeviceType(): UserDeviceType {
    if (Platform.OS === "web") {
      // Try to detect if it's a tablet or desktop based on user agent
      const userAgent = navigator?.userAgent || "";
      if (userAgent.includes("Tablet") || userAgent.includes("iPad")) {
        return "tablet";
      }
      return "desktop";
    }

    if (Device.deviceType === Device.DeviceType.TABLET) {
      return "tablet";
    }

    return "mobile";
  }

  static getDevicePlatform(): UserDevicePlatform {
    switch (Platform.OS) {
      case "ios":
        return "ios";
      case "android":
        return "android";
      case "web":
        return "web";
      default:
        return Platform.OS as UserDevicePlatform;
    }
  }

  static async getDeviceName(): Promise<string> {
    try {
      // Try to get a meaningful device name
      if (Platform.OS === "ios" || Platform.OS === "android") {
        return Device.deviceName || `${Device.brand} ${Device.modelName}` || "Mobile Device";
      }

      if (Platform.OS === "web") {
        // For web, create a name based on browser and OS
        const userAgent = navigator?.userAgent || "";
        if (userAgent.includes("Chrome")) {
          return "Chrome Browser";
        } else if (userAgent.includes("Firefox")) {
          return "Firefox Browser";
        } else if (userAgent.includes("Safari")) {
          return "Safari Browser";
        }
        return "Web Browser";
      }

      return "Unknown Device";
    } catch (error) {
      console.warn("Failed to get device name:", error);
      return "Unknown Device";
    }
  }

  static async generateDeviceId(): Promise<string> {
    try {
      // Try to get a persistent device identifier
      let deviceId = await SecureStore.getItemAsync("device_id");

      if (!deviceId) {
        // Generate a new unique device ID
        deviceId = `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        await SecureStore.setItemAsync("device_id", deviceId);
      }

      return deviceId;
    } catch (error) {
      console.warn("Failed to generate device ID:", error);
      // Fallback to a session-based ID
      return `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    }
  }

  static getBatteryLevel(): Promise<number | undefined> {
    return new Promise((resolve) => {
      try {
        if (Platform.OS === "web" && "getBattery" in navigator) {
          (navigator as any).getBattery().then((battery: any) => {
            resolve(Math.round(battery.level * 100));
          }).catch(() => resolve(undefined));
        } else {
          resolve(undefined);
        }
      } catch {
        resolve(undefined);
      }
    });
  }

  static getNetworkType(): "wifi" | "cellular" | "ethernet" | undefined {
    try {
      if (Platform.OS === "web") {
        // For web, we can't reliably detect network type
        return "ethernet";
      }

      // On mobile, assume cellular unless we can detect WiFi
      // This would need native module integration for accurate detection
      return "cellular";
    } catch {
      return undefined;
    }
  }
}

// Main Device Discovery Service
class DeviceDiscoveryService {
  private static instance: DeviceDiscoveryService;
  private currentDevice: UserDevice | null = null;
  private discoveredDevices: UserDevice[] = [];
  private presenceInterval: NodeJS.Timeout | null = null;

  static getInstance(): DeviceDiscoveryService {
    if (!DeviceDiscoveryService.instance) {
      DeviceDiscoveryService.instance = new DeviceDiscoveryService();
    }
    return DeviceDiscoveryService.instance;
  }

  // Register this device
  async registerDevice(): Promise<UserDevice> {
    try {
      const capabilities = await DeviceCapabilityDetector.detectCapabilities();
      const deviceName = await DeviceInfoCollector.getDeviceName();
      const deviceId = await DeviceInfoCollector.generateDeviceId();

      const registrationData: DeviceRegistrationData = {
        name: deviceName,
        type: DeviceInfoCollector.getDeviceType(),
        platform: DeviceInfoCollector.getDevicePlatform(),
        capabilities,
        userAgent: Platform.OS === "web" ? navigator?.userAgent : undefined,
        location: Constants.expoConfig?.extra?.deviceLocation,
      };

      const { data, error } = await api.post<UserDevice>(
        "/devices/register-for-handoff",
        {
          deviceId,
          ...registrationData,
        },
        true
      );

      if (error) {
        throw new Error(`Device registration failed: ${error.message}`);
      }

      if (!data) {
        throw new Error("No device data returned from registration");
      }

      this.currentDevice = data;

      // Start presence updates
      this.startPresenceUpdates();

      return data;
    } catch (error) {
      console.error("Device registration failed:", error);
      throw error;
    }
  }

  // Get current device
  getCurrentDevice(): UserDevice | null {
    return this.currentDevice;
  }

  // Discover available devices
  async discoverDevices(options: DeviceDiscoveryOptions = {}): Promise<DeviceDiscoveryResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (options.includeOfflineDevices !== undefined) {
        queryParams.append("includeOffline", options.includeOfflineDevices.toString());
      }

      if (options.proximity) {
        queryParams.append("proximity", options.proximity);
      }

      const endpoint = `/devices/discover${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

      const { data, error } = await api.get<DeviceDiscoveryResponse>(endpoint, true);

      if (error) {
        throw new Error(`Device discovery failed: ${error.message}`);
      }

      if (!data) {
        throw new Error("No device discovery data returned");
      }

      this.discoveredDevices = data.devices;

      return data;
    } catch (error) {
      console.error("Device discovery failed:", error);
      throw error;
    }
  }

  // Update device presence
  async updatePresence(presence: Omit<DevicePresenceUpdate, "deviceId">): Promise<void> {
    if (!this.currentDevice) {
      throw new Error("Device not registered");
    }

    try {
      const { error } = await api.patch<void>(
        `/devices/${this.currentDevice.id}/presence`,
        presence,
        true
      );

      if (error) {
        throw new Error(`Presence update failed: ${error.message}`);
      }
    } catch (error) {
      console.error("Presence update failed:", error);
      throw error;
    }
  }

  // Start automatic presence updates
  private startPresenceUpdates(): void {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
    }

    this.presenceInterval = setInterval(async () => {
      try {
        const batteryLevel = await DeviceInfoCollector.getBatteryLevel();
        const networkType = DeviceInfoCollector.getNetworkType();

        await this.updatePresence({
          presence: "online",
          lastSeen: new Date().toISOString(),
          batteryLevel,
          networkType,
        });
      } catch (error) {
        console.warn("Failed to update presence:", error);
      }
    }, 30000); // Update every 30 seconds
  }

  // Stop presence updates
  stopPresenceUpdates(): void {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
      this.presenceInterval = null;
    }
  }

  // Get handoff suggestions
  async getHandoffSuggestions(): Promise<DeviceHandoffSuggestion[]> {
    try {
      const { data, error } = await api.get<DeviceHandoffSuggestion[]>(
        "/devices/handoff-suggestions",
        true
      );

      if (error) {
        throw new Error(`Failed to get handoff suggestions: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error("Failed to get handoff suggestions:", error);
      return [];
    }
  }

  // Initiate call handoff
  async initiateCallHandoff(
    targetDeviceId: string,
    callState: CallState
  ): Promise<CallHandoffResult> {
    try {
      const { data, error } = await api.post<CallHandoffResult>(
        "/calls/handoff/initiate",
        {
          targetDeviceId,
          callState,
          sourceDeviceId: this.currentDevice?.id,
        },
        true
      );

      if (error) {
        throw new Error(`Call handoff initiation failed: ${error.message}`);
      }

      if (!data) {
        throw new Error("No handoff result returned");
      }

      return data;
    } catch (error) {
      console.error("Call handoff initiation failed:", error);
      throw error;
    }
  }

  // Accept call handoff
  async acceptCallHandoff(handoffId: string): Promise<CallHandoffManager> {
    try {
      const { data, error } = await api.post<CallHandoffManager>(
        `/calls/handoff/${handoffId}/accept`,
        {},
        true
      );

      if (error) {
        throw new Error(`Call handoff acceptance failed: ${error.message}`);
      }

      if (!data) {
        throw new Error("No handoff manager data returned");
      }

      return data;
    } catch (error) {
      console.error("Call handoff acceptance failed:", error);
      throw error;
    }
  }

  // Get device sync preferences
  async getSyncPreferences(): Promise<DeviceSyncPreferences> {
    try {
      const { data, error } = await api.get<DeviceSyncPreferences>(
        "/devices/sync-preferences",
        true
      );

      if (error) {
        throw new Error(`Failed to get sync preferences: ${error.message}`);
      }

      return data || {
        autoHandoff: false,
        handoffConfirmation: true,
        preferredDeviceOrder: [],
        syncCallHistory: true,
        syncContactList: true,
        notifyOnHandoffAvailable: true,
      };
    } catch (error) {
      console.error("Failed to get sync preferences:", error);
      // Return default preferences
      return {
        autoHandoff: false,
        handoffConfirmation: true,
        preferredDeviceOrder: [],
        syncCallHistory: true,
        syncContactList: true,
        notifyOnHandoffAvailable: true,
      };
    }
  }

  // Update device sync preferences
  async updateSyncPreferences(preferences: Partial<DeviceSyncPreferences>): Promise<void> {
    try {
      const { error } = await api.patch<void>(
        "/devices/sync-preferences",
        preferences,
        true
      );

      if (error) {
        throw new Error(`Failed to update sync preferences: ${error.message}`);
      }
    } catch (error) {
      console.error("Failed to update sync preferences:", error);
      throw error;
    }
  }

  // Cleanup when service is destroyed
  destroy(): void {
    this.stopPresenceUpdates();
    this.currentDevice = null;
    this.discoveredDevices = [];
  }
}

// Export singleton instance
export const deviceDiscoveryService = DeviceDiscoveryService.getInstance();

// Export utility functions
export {
  DeviceCapabilityDetector,
  DeviceInfoCollector,
};