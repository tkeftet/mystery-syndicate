import { apiClient } from "../../services/api";

export async function getMyAgencyApi() {
  const { data } = await apiClient.get("/agencies/me");
  return data.data; // { agency, myRole, members } | { agency: null }
}

export async function listAgenciesApi(q = "", page = 1) {
  const { data } = await apiClient.get("/agencies", { params: { q, page } });
  return data.data; // { results, page, hasMore }
}

export async function createAgencyApi(payload: {
  name: string;
  description?: string;
  privacy?: "public" | "request";
  minLevel?: number;
}) {
  const { data } = await apiClient.post("/agencies", payload);
  return data.data;
}

export async function joinAgencyApi(agencyId: string) {
  const { data } = await apiClient.post(`/agencies/${agencyId}/join`);
  return data.data; // { status: "joined" | "requested" }
}

export async function leaveAgencyApi() {
  const { data } = await apiClient.post("/agencies/leave");
  return data.data;
}

export async function getAgencyLeaderboardApi(scope: "weekly" | "global" = "weekly") {
  const { data } = await apiClient.get("/agencies/leaderboard", {
    params: { scope },
  });
  return data.data;
}

export async function getAgencyRequestsApi() {
  const { data } = await apiClient.get("/agencies/requests");
  return data.data;
}

const memberAction = (path: string) => async (userId: string) => {
  const { data } = await apiClient.post(`/agencies/${path}`, { userId });
  return data.data;
};

export const approveRequestApi = memberAction("requests/approve");
export const rejectRequestApi = memberAction("requests/reject");
export const kickMemberApi = memberAction("members/kick");
export const transferLeadershipApi = memberAction("members/transfer");

export async function setMemberRoleApi(userId: string, role: string) {
  const { data } = await apiClient.post("/agencies/members/role", { userId, role });
  return data.data;
}

export async function deleteAgencyApi() {
  const { data } = await apiClient.post("/agencies/delete");
  return data.data;
}
