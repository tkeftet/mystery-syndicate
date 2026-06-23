import axios, {
  AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { queryClient } from "./queryClient";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://10.240.159.145:4000/api/v1";

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10_000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("dc_access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Single-flight refresh: if several requests 401 at once (the app fires a few
 * queries on each screen), they all wait on the same refresh call instead of
 * each kicking off their own.
 */
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = await AsyncStorage.getItem("dc_refresh_token");
  if (!refreshToken) throw new Error("No refresh token");

  // Use the resolved API_URL (not the bare env var, which may be undefined) and
  // a bare axios instance so this call never loops back through this interceptor.
  const { data } = await axios.post(
    `${API_URL}/auth/refresh`,
    { refreshToken },
    { timeout: 10_000 },
  );

  const newAccessToken: string = data.data.accessToken;
  const newRefreshToken: string = data.data.refreshToken;

  await AsyncStorage.setItem("dc_access_token", newAccessToken);
  await AsyncStorage.setItem("dc_refresh_token", newRefreshToken);
  return newAccessToken;
}

let loggingOut = false;

async function forceLogout() {
  // Guard against several failing requests all triggering logout at once.
  if (loggingOut) return;
  loggingOut = true;
  try {
    await AsyncStorage.multiRemove([
      "dc_access_token",
      "dc_refresh_token",
      "dc_user",
    ]);
    // Flag read by the login screen to explain why the user landed there.
    await AsyncStorage.setItem("dc_session_expired", "1");
    queryClient.clear();
    // Imported lazily to avoid a circular import at module load.
    const { useAuthStore } = await import("../features/auth/auth.store");
    await useAuthStore.getState().clearAuth();
  } finally {
    loggingOut = false;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    const isAuthError = error.response?.status === 401;

    // Network errors / timeouts have no `response` — they are NOT auth problems,
    // so don't touch the session, just surface the error.
    if (!isAuthError || !original) {
      return Promise.reject(error);
    }

    // We already refreshed once for this request and the server STILL rejects it
    // → the session is unrecoverable. Log out directly.
    if (original._retry) {
      await forceLogout();
      return Promise.reject(error);
    }

    // First 401 for this request: try exactly one refresh.
    original._retry = true;
    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newAccessToken = await refreshPromise;
      original.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(original);
    } catch {
      // Refresh token is missing / expired / rejected → can't recover, log out.
      await forceLogout();
      return Promise.reject(error);
    }
  },
);
