import { apiClient } from "../../services/api";

export async function getChallengesApi() {
  const { data } = await apiClient.get("/challenges");
  return data.data; // [{ key, period, title, description, target, progress, completed, claimed, rewardSeasonXp, rewardCoins }]
}

export async function claimChallengeApi(key: string) {
  const { data } = await apiClient.post("/challenges/claim", { key });
  return data.data;
}

export async function claimAllChallengesApi() {
  const { data } = await apiClient.post("/challenges/claim-all");
  return data.data;
}
