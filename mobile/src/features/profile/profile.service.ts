import { apiClient } from "../../services/api";

export async function getMyProfileApi() {
  const { data } = await apiClient.get("/users/me");
  return data.data;
}

export async function getMyHistoryApi() {
  const { data } = await apiClient.get("/users/me/history");
  return data.data;
}

export async function getPublicProfileApi(userId: string) {
  const { data } = await apiClient.get(`/users/${userId}/public`);
  return data.data;
}

/** Permanently delete the signed-in account and all its data (irreversible). */
export async function deleteAccountApi() {
  const { data } = await apiClient.delete("/users/me");
  return data;
}
