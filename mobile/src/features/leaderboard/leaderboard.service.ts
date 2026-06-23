import { apiClient } from "../../services/api";

export async function getDailyLeaderboardApi() {
  const { data } = await apiClient.get("/rankings/daily");
  return data.data;
}

export async function getWeeklyLeaderboardApi() {
  const { data } = await apiClient.get("/rankings/weekly");
  return data.data;
}

export async function getAllTimeLeaderboardApi() {
  const { data } = await apiClient.get("/rankings/all-time");
  return data.data;
}

export async function getMyRankApi() {
  const { data } = await apiClient.get("/rankings/me");
  return data.data;
}

export async function getDetectiveOfWeekApi() {
  const { data } = await apiClient.get("/rankings/detective-of-week");
  return data.data; // { topAccuracy[], longestStreak[], mostSolved[] }
}
