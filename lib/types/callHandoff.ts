/**
 * Types for real-time device discovery and cross-device call handoff
 * CDH-001: Real-time device discovery and registration
 */

// Device platform types for cross-device handoff
export type UserDeviceType = "mobile" | "desktop" | "tablet" | "web";

export type UserDevicePlatform = "ios" | "android" | "macos" | "windows" | "linux" | "web";

export type DevicePresenceStatus = "online" | "idle" | "busy" | "offline";

export type CallHandoffStatus = "idle" | "initiating" | "transferring" | "completed" | "failed";

// Device capabilities for call handoff
export interface DeviceCapabilities {
  hasCamera: boolean;
  hasMicrophone: boolean;
  hasSpeakers: boolean;
  supportsVideo: boolean;
  supportsScreenShare: boolean;
  supportsWebRTC: boolean;
  maxVideoResolution?: string;
  audioCodecs: string[];
  videoCodecs: string[];
}

// User device for cross-device communication
export interface UserDevice {
  id: string;
  name: string;
  type: UserDeviceType;
  platform: UserDevicePlatform;
  userId: string;
  capabilities: DeviceCapabilities;
  presence: DevicePresenceStatus;
  lastSeen: string;
  isCurrentDevice: boolean;
  deviceToken?: string;
  userAgent?: string;
  ipAddress?: string;
  location?: string;
  batteryLevel?: number;
  networkType?: "wifi" | "cellular" | "ethernet";
  createdAt: string;
  updatedAt: string;
}

// Device registration data
export interface DeviceRegistrationData {
  name: string;
  type: UserDeviceType;
  platform: UserDevicePlatform;
  capabilities: DeviceCapabilities;
  deviceToken?: string;
  userAgent?: string;
  location?: string;
}

// Call state for handoff preservation
export interface CallState {
  callId: string;
  channelId: string;
  serverId?: string;
  participants: CallParticipant[];
  isScreenSharing: boolean;
  screenSharingUserId?: string;
  recordingState: "inactive" | "recording" | "paused";
  audioSettings: AudioSettings;
  videoSettings: VideoSettings;
  startedAt: string;
  duration: number;
}

export interface CallParticipant {
  userId: string;
  deviceId: string;
  isMuted: boolean;
  isDeafened: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  joinedAt: string;
  connectionQuality: "excellent" | "good" | "poor" | "disconnected";
}

export interface AudioSettings {
  inputDeviceId?: string;
  outputDeviceId?: string;
  inputVolume: number;
  outputVolume: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

export interface VideoSettings {
  cameraDeviceId?: string;
  resolution: string;
  frameRate: number;
  quality: "low" | "medium" | "high";
  backgroundBlur: boolean;
}

// Call handoff management
export interface CallHandoffManager {
  sourceDeviceId: string;
  targetDeviceId: string;
  callState: CallState;
  status: CallHandoffStatus;
  progress: number; // 0-100
  estimatedTimeRemaining?: number;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

// Device discovery and presence
export interface DeviceDiscoveryOptions {
  includeOfflineDevices?: boolean;
  filterByCapabilities?: Partial<DeviceCapabilities>;
  refreshInterval?: number;
  proximity?: "local" | "all";
}

export interface DevicePresenceUpdate {
  deviceId: string;
  presence: DevicePresenceStatus;
  lastSeen: string;
  batteryLevel?: number;
  networkType?: "wifi" | "cellular" | "ethernet";
}

// Real-time events for WebSocket
export type DeviceDiscoveryEvent =
  | { type: "device_discovered"; device: UserDevice }
  | { type: "device_updated"; device: UserDevice }
  | { type: "device_presence_changed"; update: DevicePresenceUpdate }
  | { type: "device_disconnected"; deviceId: string }
  | { type: "call_handoff_initiated"; handoff: CallHandoffManager }
  | { type: "call_handoff_progress"; handoff: CallHandoffManager }
  | { type: "call_handoff_completed"; handoff: CallHandoffManager }
  | { type: "call_handoff_failed"; handoff: CallHandoffManager };

// API response types
export interface DeviceDiscoveryResponse {
  devices: UserDevice[];
  currentDevice: UserDevice;
  totalCount: number;
  onlineCount: number;
  lastUpdated: string;
}

export interface CallHandoffResult {
  success: boolean;
  handoffId: string;
  targetDevice: UserDevice;
  estimatedDuration: number;
  error?: string;
}

// Smart suggestions for device handoff
export interface DeviceHandoffSuggestion {
  device: UserDevice;
  confidence: number; // 0-1
  reason: "usage_pattern" | "proximity" | "capabilities" | "availability";
  description: string;
}

// Device sync preferences
export interface DeviceSyncPreferences {
  autoHandoff: boolean;
  handoffConfirmation: boolean;
  preferredDeviceOrder: string[];
  syncCallHistory: boolean;
  syncContactList: boolean;
  notifyOnHandoffAvailable: boolean;
}