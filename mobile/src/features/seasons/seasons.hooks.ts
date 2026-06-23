import { useQuery } from "@tanstack/react-query";
import {
  listSeasonsApi,
  getSeasonMapApi,
  getSeasonProgressApi,
  getSeasonLeaderboardApi,
} from "./seasons.service";

export function useSeasons() {
  return useQuery({
    queryKey: ["seasons"],
    queryFn: listSeasonsApi,
    staleTime: 60_000,
  });
}

export function useSeasonMap(seasonId?: string) {
  return useQuery({
    queryKey: ["season-map", seasonId],
    queryFn: () => getSeasonMapApi(seasonId as string),
    enabled: !!seasonId,
  });
}

export function useSeasonProgress(seasonId?: string) {
  return useQuery({
    queryKey: ["season-me", seasonId],
    queryFn: () => getSeasonProgressApi(seasonId as string),
    enabled: !!seasonId,
  });
}

export function useSeasonLeaderboard(seasonId?: string) {
  return useQuery({
    queryKey: ["season-leaderboard", seasonId],
    queryFn: () => getSeasonLeaderboardApi(seasonId as string),
    enabled: !!seasonId,
    staleTime: 30_000,
  });
}
