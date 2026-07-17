import { apiClient } from "../../services/api";
import type { UserPrivateProfile } from "@mystery-syndicate/shared";

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
  const { data } = await apiClient.post('/auth/register', {
    username,
    email,
    password,
  });
  return data.data;
}

export async function loginApi(
  identifier: string,
  password: string,
): Promise<AuthResponse> {
  // `identifier` is a username or an email.
  const { data } = await apiClient.post("/auth/login", { identifier, password });
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
