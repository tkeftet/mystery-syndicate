import { apiClient } from "../../services/api";

export async function getPassHubApi() {
  const { data } = await apiClient.get("/pass");
  return data.data; // { pass, progress, unclaimedCount, daysLeft } | { pass: null }
}

export async function getPassRewardsApi() {
  const { data } = await apiClient.get("/pass/rewards");
  return data.data; // { pass, progress, rewards[] }
}

export async function claimLevelApi(level: number) {
  const { data } = await apiClient.post("/pass/claim", { level });
  return data.data;
}

export async function claimAllApi() {
  const { data } = await apiClient.post("/pass/claim-all");
  return data.data; // { claimed[], count }
}

export async function getPassLeaderboardApi(scope: "global" | "friends" = "global") {
  const { data } = await apiClient.get("/pass/leaderboard", {
    params: { scope },
  });
  return data.data;
}
