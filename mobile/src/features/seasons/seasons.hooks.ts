import { useQuery } from "@tanstack/react-query";
import {
  listSeasonsApi,
  getSeasonMapApi,
  getSeasonProgressApi,
  getSeasonLeaderboardApi,
} from "./seasons.service";
import { useContentLang, selectLocalized } from "../../i18n/localizeContent";

// Season/chapter content arrives raw ({en,fr,ar}); `select` resolves it to the
// current language so switching is instant (no refetch).
export function useSeasons() {
  const lang = useContentLang();
  return useQuery({
    queryKey: ["seasons"],
    queryFn: listSeasonsApi,
    select: selectLocalized(lang),
    staleTime: 60_000,
  });
}

export function useSeasonMap(seasonId?: string) {
  const lang = useContentLang();
  return useQuery({
    queryKey: ["season-map", seasonId],
    queryFn: () => getSeasonMapApi(seasonId as string),
    select: selectLocalized(lang),
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
