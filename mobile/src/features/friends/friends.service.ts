import { apiClient } from "../../services/api";

export async function listFriendsApi(sort = "online") {
  const { data } = await apiClient.get("/friends", { params: { sort } });
  return data.data;
}

export async function listRequestsApi() {
  const { data } = await apiClient.get("/friends/requests");
  return data.data; // { incoming[], outgoing[] }
}

export async function searchUsersApi(q: string, page = 1) {
  const { data } = await apiClient.get("/friends/search", {
    params: { q, page },
  });
  return data.data; // { results[], page, hasMore }
}

const action = (path: string) => async (userId: string) => {
  const { data } = await apiClient.post(`/friends/${path}`, { userId });
  return data.data;
};

export const sendRequestApi = action("request");
export const acceptRequestApi = action("accept");
export const rejectRequestApi = action("reject");
export const cancelRequestApi = action("cancel");
export const removeFriendApi = action("remove");
export const blockUserApi = action("block");
export const unblockUserApi = action("unblock");

export async function getPrivacyApi() {
  const { data } = await apiClient.get("/friends/privacy");
  return data.data;
}

export async function updatePrivacyApi(patch: Record<string, unknown>) {
  const { data } = await apiClient.put("/friends/privacy", patch);
  return data.data;
}

export async function heartbeatApi() {
  try {
    await apiClient.post("/friends/heartbeat");
  } catch {
    // presence is best-effort
  }
}
