import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { createApiMiddleware } from "./apiMonitoring";

// API base URL - configurable via app.config.js extra or default
const API_BASE_URL =
  Constants.expoConfig?.extra?.apiUrl ||
  process.env.EXPO_PUBLIC_API_URL ||
  "https://hearth.local/api/v1";

interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

interface ApiError {
  code: string;
  message: string;
  status: number;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  requireAuth?: boolean;
}

class ApiClient {
  private baseUrl: string;
  private monitoring = createApiMiddleware();

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync("auth_token");
    } catch {
      return null;
    }
  }

  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { method = "GET", body, headers = {}, requireAuth = false } = options;
    const startTime = Date.now();
    const requestTracker = this.monitoring.onRequest(endpoint, method, startTime);

    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...headers,
    };

    // Add auth token if required or available
    if (requireAuth) {
      const token = await this.getAuthToken();
      if (token) {
        requestHeaders["Authorization"] = `Bearer ${token}`;
      } else if (requireAuth) {
        return {
          data: null,
          error: {
            code: "unauthorized",
            message: "Authentication required",
            status: 401,
          },
        };
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      const endTime = Date.now();

      // Handle no content responses
      if (response.status === 204) {
        requestTracker.trackResponse(response.status, endTime);
        return { data: null, error: null };
      }

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData.message || "An error occurred";
        requestTracker.trackResponse(response.status, endTime, errorMessage);

        // Check for rate limit headers
        if (response.status === 429) {
          const resetTime = response.headers.get('X-RateLimit-Reset') ||
                           response.headers.get('Retry-After');
          this.monitoring.onRateLimit(endpoint, method, resetTime || undefined);
        }

        return {
          data: null,
          error: {
            code: responseData.error || "unknown_error",
            message: errorMessage,
            status: response.status,
          },
        };
      }

      requestTracker.trackResponse(response.status, endTime);
      return { data: responseData as T, error: null };
    } catch (error) {
      // Network error or JSON parse error
      const endTime = Date.now();
      const message =
        error instanceof Error ? error.message : "Network request failed";

      requestTracker.trackResponse(0, endTime, message);

      return {
        data: null,
        error: {
          code: "network_error",
          message,
          status: 0,
        },
      };
    }
  }

  // Convenience methods
  async get<T>(
    endpoint: string,
    requireAuth = false
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET", requireAuth });
  }

  async post<T>(
    endpoint: string,
    body: unknown,
    requireAuth = false
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "POST", body, requireAuth });
  }

  async put<T>(
    endpoint: string,
    body: unknown,
    requireAuth = true
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "PUT", body, requireAuth });
  }

  async patch<T>(
    endpoint: string,
    body: unknown,
    requireAuth = true
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "PATCH", body, requireAuth });
  }

  async delete<T>(
    endpoint: string,
    requireAuth = true
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE", requireAuth });
  }

  /**
   * Upload file with progress tracking
   */
  async upload<T>(
    endpoint: string,
    formData: FormData,
    options: {
      onProgress?: (event: { loaded: number; total?: number }) => void;
      requireAuth?: boolean;
    } = {}
  ): Promise<ApiResponse<T>> {
    const { onProgress, requireAuth = true } = options;

    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
      };

      // Add auth token if required
      if (requireAuth) {
        const token = await this.getAuthToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        } else {
          return {
            data: null,
            error: {
              code: "unauthorized",
              message: "Authentication required",
              status: 401,
            },
          };
        }
      }

      // Use XMLHttpRequest for progress tracking
      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${this.baseUrl}${endpoint}`);

        // Set headers
        Object.entries(headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });

        // Track upload progress
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            onProgress?.({ loaded: event.loaded, total: event.total });
          }
        };

        xhr.onload = () => {
          try {
            const responseData = JSON.parse(xhr.responseText);

            if (xhr.status >= 200 && xhr.status < 300) {
              resolve({ data: responseData as T, error: null });
            } else {
              resolve({
                data: null,
                error: {
                  code: responseData.error || "upload_error",
                  message: responseData.message || "Upload failed",
                  status: xhr.status,
                },
              });
            }
          } catch {
            resolve({
              data: null,
              error: {
                code: "parse_error",
                message: "Failed to parse response",
                status: xhr.status,
              },
            });
          }
        };

        xhr.onerror = () => {
          resolve({
            data: null,
            error: {
              code: "network_error",
              message: "Upload failed due to network error",
              status: 0,
            },
          });
        };

        xhr.send(formData);
      });
    } catch (error) {
      return {
        data: null,
        error: {
          code: "upload_error",
          message: error instanceof Error ? error.message : "Upload failed",
          status: 0,
        },
      };
    }
  }
}

// Export singleton instance
export const api = new ApiClient(API_BASE_URL);

// Create a named export for compatibility
export const apiClient = api;

// Re-export types
export type { ApiResponse, ApiError, RequestOptions };

/**
 * API Methods for specific features
 */

interface SendMessageParams {
  channelId: string;
  content: string;
  attachmentIds?: string[];
  replyToId?: string;
}

interface MessageResponse {
  id: string;
  content: string;
  channelId: string;
  authorId: string;
  createdAt: number;
  updatedAt?: number;
  attachments?: Array<{
    id: string;
    filename: string;
    contentType: string;
    size: number;
    url: string;
  }>;
  replyTo?: {
    id: string;
    content: string;
    authorName: string;
  };
}

/**
 * Send a message to a channel
 */
export async function sendMessage(
  params: SendMessageParams
): Promise<MessageResponse> {
  const { data, error } = await api.post<MessageResponse>(
    "/messages",
    params,
    true // requireAuth
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("No response data from server");
  }

  return data;
}

/**
 * Upload an attachment
 */
export async function uploadAttachment(
  file: {
    uri: string;
    name: string;
    type: string;
  },
  onProgress?: (progress: number) => void
): Promise<{
  id: string;
  filename: string;
  contentType: string;
  size: number;
  url: string;
  createdAt: number;
}> {
  const formData = new FormData();
  formData.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as any);

  const { data, error } = await api.upload(
    "/attachments",
    formData,
    {
      requireAuth: true,
      onProgress: (event) => {
        if (event.total) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress?.(progress);
        }
      },
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("No response data from server");
  }

  return data as {
    id: string;
    filename: string;
    contentType: string;
    size: number;
    url: string;
    createdAt: number;
  };
}

/**
 * Device Registration for Push Notifications
 */
interface DeviceRegistrationParams {
  token: string;
  platform: 'ios' | 'android';
  deviceId: string;
  deviceName?: string;
  osVersion?: string;
  appVersion?: string;
}

interface DeviceRegistrationResponse {
  id: string;
  token: string;
  platform: string;
  deviceId: string;
  registeredAt: number;
  lastActiveAt: number;
}

/**
 * Register device for push notifications
 */
export async function registerDevice(
  params: DeviceRegistrationParams
): Promise<DeviceRegistrationResponse> {
  const { data, error } = await api.post<DeviceRegistrationResponse>(
    "/devices/register",
    params,
    true // requireAuth
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("No response data from server");
  }

  return data;
}

/**
 * Unregister device (for logout or app uninstall)
 */
export async function unregisterDevice(deviceId: string): Promise<void> {
  const { error } = await api.delete<void>(`/devices/${deviceId}`, true);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Update push token for the current user's device
 */
export async function registerPushToken(token: string): Promise<void> {
  const { error } = await api.post<void>(
    "/devices/token",
    { token },
    true // requireAuth
  );

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Disable push notifications for the current user's device
 */
export async function disablePushNotifications(): Promise<void> {
  const { error } = await api.patch<void>(
    "/devices/notifications/disable",
    {},
    true // requireAuth
  );

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Enable push notifications for the current user's device
 */
export async function enablePushNotifications(token: string): Promise<void> {
  const { error } = await api.patch<void>(
    "/devices/notifications/enable",
    { token },
    true // requireAuth
  );

  if (error) {
    throw new Error(error.message);
  }
}
