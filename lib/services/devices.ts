import { api, type ApiResponse } from "./api";
import type {
  Device,
  DeviceState,
  Room,
  Scene,
  HomeOverview,
  Automation,
} from "../types/iot";

// ── Devices ──────────────────────────────────────────────────────────

export async function getDevices(): Promise<ApiResponse<Device[]>> {
  return api.get<Device[]>("/devices", true);
}

export async function getDevice(id: string): Promise<ApiResponse<Device>> {
  return api.get<Device>(`/devices/${id}`, true);
}

export async function getDevicesByRoom(
  roomId: string
): Promise<ApiResponse<Device[]>> {
  return api.get<Device[]>(`/rooms/${roomId}/devices`, true);
}

export async function updateDeviceState(
  deviceId: string,
  state: Partial<DeviceState>
): Promise<ApiResponse<Device>> {
  return api.patch<Device>(`/devices/${deviceId}/state`, state);
}

export async function toggleDevice(
  deviceId: string
): Promise<ApiResponse<Device>> {
  return api.post<Device>(`/devices/${deviceId}/toggle`, {}, true);
}

export async function renameDevice(
  deviceId: string,
  name: string
): Promise<ApiResponse<Device>> {
  return api.patch<Device>(`/devices/${deviceId}`, { name });
}

export async function moveDevice(
  deviceId: string,
  roomId: string
): Promise<ApiResponse<Device>> {
  return api.patch<Device>(`/devices/${deviceId}`, { roomId });
}

export async function removeDevice(
  deviceId: string
): Promise<ApiResponse<void>> {
  return api.delete<void>(`/devices/${deviceId}`);
}

// ── Rooms ────────────────────────────────────────────────────────────

export async function getRooms(): Promise<ApiResponse<Room[]>> {
  return api.get<Room[]>("/rooms", true);
}

export async function getRoom(id: string): Promise<ApiResponse<Room>> {
  return api.get<Room>(`/rooms/${id}`, true);
}

export async function createRoom(data: {
  name: string;
  icon?: string;
  color?: string;
}): Promise<ApiResponse<Room>> {
  return api.post<Room>("/rooms", data, true);
}

export async function updateRoom(
  id: string,
  data: Partial<Pick<Room, "name" | "icon" | "color" | "order">>
): Promise<ApiResponse<Room>> {
  return api.patch<Room>(`/rooms/${id}`, data);
}

export async function deleteRoom(id: string): Promise<ApiResponse<void>> {
  return api.delete<void>(`/rooms/${id}`);
}

// ── Scenes ───────────────────────────────────────────────────────────

export async function getScenes(): Promise<ApiResponse<Scene[]>> {
  return api.get<Scene[]>("/scenes", true);
}

export async function activateScene(
  sceneId: string
): Promise<ApiResponse<Scene>> {
  return api.post<Scene>(`/scenes/${sceneId}/activate`, {}, true);
}

export async function createScene(data: {
  name: string;
  icon?: string;
  color?: string;
  deviceActions: Scene["deviceActions"];
}): Promise<ApiResponse<Scene>> {
  return api.post<Scene>("/scenes", data, true);
}

export async function deleteScene(id: string): Promise<ApiResponse<void>> {
  return api.delete<void>(`/scenes/${id}`);
}

// ── Automations ──────────────────────────────────────────────────────

export async function getAutomations(): Promise<ApiResponse<Automation[]>> {
  return api.get<Automation[]>("/automations", true);
}

export async function toggleAutomation(
  id: string,
  isEnabled: boolean
): Promise<ApiResponse<Automation>> {
  return api.patch<Automation>(`/automations/${id}`, { isEnabled });
}

// ── Home Overview ────────────────────────────────────────────────────

export async function getHomeOverview(): Promise<ApiResponse<HomeOverview>> {
  return api.get<HomeOverview>("/home/overview", true);
}
