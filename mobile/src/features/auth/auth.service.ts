import { apiClient } from "../../services/api";
import type { UserPrivateProfile } from "@detective-club/shared";

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserPrivateProfile;
}

export async function registerApi(
  username: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  console.warn('registerApi called with:', { username, email });
  console.warn('API URL:', process.env.EXPO_PUBLIC_API_URL);
  try {
    const { data } = await apiClient.post('/auth/register', {
      username,
      email,
      password,
    });
    console.warn('registerApi response:', data);
    return data.data;
  } catch (err: any) {
    console.warn('registerApi error:', err?.message);
    console.warn('registerApi error code:', err?.code);
    console.warn('registerApi error response:', err?.response?.data);
    throw err;
  }
}

export async function loginApi(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const { data } = await apiClient.post("/auth/login", { email, password });
  return data.data;
}

export async function refreshApi(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const { data } = await apiClient.post("/auth/refresh", { refreshToken });
  return data.data;
}

export async function guestApi(): Promise<AuthResponse> {
  const { data } = await apiClient.post("/auth/guest");
  return data.data;
}
