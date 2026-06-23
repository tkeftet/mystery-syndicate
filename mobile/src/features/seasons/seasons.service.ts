import { apiClient } from "../../services/api";

export interface ChapterAccusation {
  suspectId: string;
  motive: string;
  timelineEventId: string;
}

export async function listSeasonsApi() {
  const { data } = await apiClient.get("/seasons");
  return data.data;
}

export async function getSeasonApi(seasonId: string) {
  const { data } = await apiClient.get(`/seasons/${seasonId}`);
  return data.data;
}

export async function getSeasonMapApi(seasonId: string) {
  const { data } = await apiClient.get(`/seasons/${seasonId}/map`);
  return data.data; // { season, progress, chapters[] }
}

export async function getSeasonProgressApi(seasonId: string) {
  const { data } = await apiClient.get(`/seasons/${seasonId}/me`);
  return data.data; // { progress, rank } | null
}

export async function getSeasonLeaderboardApi(seasonId: string) {
  const { data } = await apiClient.get(`/seasons/${seasonId}/leaderboard`);
  return data.data;
}

export async function startChapterApi(seasonId: string, n: number) {
  const { data } = await apiClient.post(
    `/seasons/${seasonId}/chapters/${n}/start`,
  );
  return data.data; // { chapter, alreadyCompleted }
}

export async function submitChapterApi(
  seasonId: string,
  n: number,
  accusation: ChapterAccusation,
) {
  const { data } = await apiClient.post(
    `/seasons/${seasonId}/chapters/${n}/submit`,
    accusation,
  );
  return data.data; // { result, cliffhanger, seasonCompleted, rewardsEarned, progress, nextChapter }
}
