import { useQuery } from "@tanstack/react-query";
import {
  listEventsApi,
  getEventApi,
  getEventLeaderboardApi,
  getMyParticipationApi,
} from "./events.service";
import { useContentLang, selectLocalized } from "../../i18n/localizeContent";

// Event content arrives raw ({en,fr,ar}); `select` resolves it to the current
// language so switching is instant (no refetch).
export function useEvents() {
  const lang = useContentLang();
  return useQuery({
    queryKey: ["events"],
    queryFn: listEventsApi,
    select: selectLocalized(lang),
    staleTime: 60_000,
  });
}

export function useEvent(eventId?: string) {
  const lang = useContentLang();
  return useQuery({
    queryKey: ["event", eventId],
    queryFn: () => getEventApi(eventId as string),
    select: selectLocalized(lang),
    enabled: !!eventId,
  });
}

export function useEventLeaderboard(eventId?: string) {
  return useQuery({
    queryKey: ["event-leaderboard", eventId],
    queryFn: () => getEventLeaderboardApi(eventId as string),
    enabled: !!eventId,
    staleTime: 30_000,
  });
}

export function useMyParticipation(eventId?: string) {
  return useQuery({
    queryKey: ["event-me", eventId],
    queryFn: () => getMyParticipationApi(eventId as string),
    enabled: !!eventId,
  });
}
