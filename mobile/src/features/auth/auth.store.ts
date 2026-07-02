import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { UserPrivateProfile } from "@mystery-syndicate/shared";
import { queryClient } from "../../services/queryClient";
import { identify, resetAnalytics } from "../../services/analytics";
import { setMonitoringUser, clearMonitoringUser } from "../../services/monitoring";

interface AuthState {
  user: UserPrivateProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  setAuth: (
    user: UserPrivateProfile,
    accessToken: string,
    refreshToken: string,
  ) => Promise<void>;
  clearAuth: () => Promise<void>;
  setAccessToken: (token: string) => void;
  loadFromStorage: () => Promise<void>;
}

const KEYS = {
  accessToken: "dc_access_token",
  refreshToken: "dc_refresh_token",
  user: "dc_user",
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: true,
  isAuthenticated: false,

  setAuth: async (user, accessToken, refreshToken) => {
    await AsyncStorage.setItem(KEYS.accessToken, accessToken);
    await AsyncStorage.setItem(KEYS.refreshToken, refreshToken);
    await AsyncStorage.setItem(KEYS.user, JSON.stringify(user));
    identify(user.id, { is_guest: (user as any).isGuest, level: user.level });
    setMonitoringUser(user.id, { username: user.username });
    set({ user, accessToken, refreshToken, isAuthenticated: true });
  },

  clearAuth: async () => {
    await AsyncStorage.removeItem(KEYS.accessToken);
    await AsyncStorage.removeItem(KEYS.refreshToken);
    await AsyncStorage.removeItem(KEYS.user);
    queryClient.clear();
    resetAnalytics();
    clearMonitoringUser();
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  setAccessToken: (token) => {
    set({ accessToken: token });
    AsyncStorage.setItem(KEYS.accessToken, token);
  },

  loadFromStorage: async () => {
    try {
      const accessToken = await AsyncStorage.getItem(KEYS.accessToken);
      const refreshToken = await AsyncStorage.getItem(KEYS.refreshToken);
      const userRaw = await AsyncStorage.getItem(KEYS.user);

      if (accessToken && refreshToken && userRaw) {
        const user = JSON.parse(userRaw) as UserPrivateProfile;
        identify(user.id, { is_guest: (user as any).isGuest, level: user.level });
        setMonitoringUser(user.id, { username: user.username });
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
