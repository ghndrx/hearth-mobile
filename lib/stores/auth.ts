import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

interface User {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  email: string;
  bio?: string;
}

interface ProfileUpdate {
  displayName?: string;
  username?: string;
  avatar?: string;
  bio?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  updateProfile: (updates: ProfileUpdate) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, _get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (token: string, user: User) => {
    await SecureStore.setItemAsync("auth_token", token);
    await SecureStore.setItemAsync("user", JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("auth_token");
    await SecureStore.deleteItemAsync("user");
    set({ token: null, user: null, isAuthenticated: false });
  },

  loadStoredAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync("auth_token");
      const userJson = await SecureStore.getItemAsync("user");

      if (token && userJson) {
        const user = JSON.parse(userJson);
        set({ token, user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error("Failed to load auth:", error);
      set({ isLoading: false });
    }
  },

  updateProfile: async (updates: ProfileUpdate) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) {
      throw new Error("No user logged in");
    }

    const updatedUser: User = {
      ...currentUser,
      ...updates,
    };

    // Persist to secure store
    await SecureStore.setItemAsync("user", JSON.stringify(updatedUser));

    // Update state
    set({ user: updatedUser });
  },
}));
