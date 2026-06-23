import { apiClient } from "../../services/api";

export async function getAchievementsApi() {
  const { data } = await apiClient.get("/achievements");
  return data.data; // { achievementScore, unlockedCount, totalCount, achievements[] }
}

export async function getAchievementLeaderboardApi() {
  const { data } = await apiClient.get("/achievements/leaderboard");
  return data.data;
}
