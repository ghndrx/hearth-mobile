import { api, ApiResponse } from "./api";

// Request types
export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  display_name?: string;
  invite_code?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// Response types
export interface UserResponse {
  id: string;
  username: string;
  discriminator: string;
  email?: string;
  avatar_url?: string;
  banner_url?: string;
  bio?: string;
  custom_status?: string;
  flags: number;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
}

export interface AuthResponse {
  user: UserResponse;
  tokens?: TokenResponse;
}

// Error codes from backend
export type AuthErrorCode =
  | "invalid_request"
  | "validation_error"
  | "registration_closed"
  | "invite_required"
  | "email_taken"
  | "username_taken"
  | "invalid_credentials"
  | "internal_error"
  | "network_error";

// Normalized user for app use
export interface AppUser {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  email: string;
  bio?: string;
}

// Transform backend user to app user format
function toAppUser(user: UserResponse, email?: string): AppUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.username, // Backend uses username as display name
    avatar: user.avatar_url || undefined,
    email: user.email || email || "",
    bio: user.bio || undefined,
  };
}

/**
 * Register a new user account
 */
export async function register(
  email: string,
  username: string,
  password: string,
  displayName?: string
): Promise<ApiResponse<{ user: AppUser; token?: string }>> {
  const response = await api.post<AuthResponse>("/auth/register", {
    email,
    username,
    password,
    display_name: displayName || username,
  });

  if (response.error) {
    return { data: null, error: response.error };
  }

  if (!response.data?.user) {
    return {
      data: null,
      error: {
        code: "invalid_response",
        message: "Invalid response from server",
        status: 500,
      },
    };
  }

  return {
    data: {
      user: toAppUser(response.data.user, email),
      token: response.data.tokens?.access_token,
    },
    error: null,
  };
}

/**
 * Login with email and password
 */
export async function login(
  email: string,
  password: string
): Promise<ApiResponse<{ user: AppUser; token: string }>> {
  const response = await api.post<AuthResponse>("/auth/login", {
    email,
    password,
  });

  if (response.error) {
    return { data: null, error: response.error };
  }

  if (!response.data?.user || !response.data?.tokens?.access_token) {
    return {
      data: null,
      error: {
        code: "invalid_response",
        message: "Invalid response from server",
        status: 500,
      },
    };
  }

  return {
    data: {
      user: toAppUser(response.data.user, email),
      token: response.data.tokens.access_token,
    },
    error: null,
  };
}

/**
 * Logout the current user
 */
export async function logout(): Promise<ApiResponse<void>> {
  const response = await api.post<void>("/auth/logout", {}, true);
  // We don't care about the response - just clear local state
  return response;
}

/**
 * Refresh the access token
 */
export async function refreshToken(
  refreshToken: string
): Promise<ApiResponse<TokenResponse>> {
  return api.post<TokenResponse>("/auth/refresh", {
    refresh_token: refreshToken,
  });
}

/**
 * Get user-friendly error message from error code
 */
export function getAuthErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    invalid_request: "Invalid request. Please try again.",
    validation_error: "Please check your input and try again.",
    registration_closed: "Registration is currently closed.",
    invite_required: "An invite code is required to register.",
    email_taken: "This email is already registered.",
    username_taken: "This username is already taken.",
    invalid_credentials: "Invalid email or password.",
    internal_error: "Something went wrong. Please try again later.",
    network_error: "Unable to connect. Please check your internet connection.",
    unauthorized: "Please log in to continue.",
    invalid_response: "Received an invalid response from the server.",
  };

  return messages[code] || "An unexpected error occurred.";
}
