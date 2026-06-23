import { useQuery } from "@tanstack/react-query";
import {
  listEventsApi,
  getEventApi,
  getEventLeaderboardApi,
  getMyParticipationApi,
} from "./events.service";

export function useEvents() {
  return useQuery({
    queryKey: ["events"],
    queryFn: listEventsApi,
    staleTime: 60_000,
  });
}

export function useEvent(eventId?: string) {
  return useQuery({
    queryKey: ["event", eventId],
    queryFn: () => getEventApi(eventId as string),
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
