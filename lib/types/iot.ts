export type DeviceType =
  | "light"
  | "thermostat"
  | "lock"
  | "camera"
  | "sensor"
  | "switch"
  | "plug"
  | "speaker"
  | "blinds"
  | "fan"
  | "garage"
  | "doorbell";

export type DeviceStatus = "online" | "offline" | "error" | "updating";

export type LockState = "locked" | "unlocked" | "jammed";

export type BlindsState = "open" | "closed" | "partial";

export type GarageDoorState = "open" | "closed" | "opening" | "closing";

export interface DeviceCapability {
  type: "toggle" | "brightness" | "color" | "temperature" | "lock" | "blinds" | "fan_speed" | "garage";
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export interface DeviceState {
  isOn?: boolean;
  brightness?: number;
  color?: string;
  colorTemperature?: number;
  currentTemperature?: number;
  targetTemperature?: number;
  humidity?: number;
  lockState?: LockState;
  blindsPosition?: number;
  blindsState?: BlindsState;
  fanSpeed?: number;
  garageDoorState?: GarageDoorState;
  batteryLevel?: number;
  motionDetected?: boolean;
  doorOpen?: boolean;
  windowOpen?: boolean;
  lastTriggered?: string;
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  roomId: string;
  status: DeviceStatus;
  state: DeviceState;
  capabilities: DeviceCapability[];
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  deviceCount: number;
  activeDeviceCount: number;
  temperature?: number;
  humidity?: number;
  devices?: Device[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Scene {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  deviceActions: SceneAction[];
  isActive: boolean;
  createdAt: string;
}

export interface SceneAction {
  deviceId: string;
  state: Partial<DeviceState>;
}

export interface Automation {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  actions: SceneAction[];
  isEnabled: boolean;
  lastTriggered?: string;
  createdAt: string;
}

export interface AutomationTrigger {
  type: "time" | "device_state" | "location" | "sunrise" | "sunset";
  deviceId?: string;
  condition?: string;
  value?: string;
  time?: string;
}

export interface HomeOverview {
  totalDevices: number;
  onlineDevices: number;
  rooms: Room[];
  activeScenes: Scene[];
  recentActivity: ActivityEvent[];
  alerts: HomeAlert[];
}

export interface ActivityEvent {
  id: string;
  type: "device_state_change" | "automation_triggered" | "scene_activated" | "alert";
  deviceId?: string;
  deviceName?: string;
  roomName?: string;
  description: string;
  timestamp: string;
}

export interface HomeAlert {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  deviceId?: string;
  acknowledged: boolean;
  createdAt: string;
}
