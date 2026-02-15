import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

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

      // Handle no content responses
      if (response.status === 204) {
        return { data: null, error: null };
      }

      const responseData = await response.json();

      if (!response.ok) {
        return {
          data: null,
          error: {
            code: responseData.error || "unknown_error",
            message: responseData.message || "An error occurred",
            status: response.status,
          },
        };
      }

      return { data: responseData as T, error: null };
    } catch (error) {
      // Network error or JSON parse error
      const message =
        error instanceof Error ? error.message : "Network request failed";
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
}

// Export singleton instance
export const api = new ApiClient(API_BASE_URL);

// Re-export types
export type { ApiResponse, ApiError, RequestOptions };
