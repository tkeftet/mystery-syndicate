import { useQuery } from "@tanstack/react-query";
import {
  getMyAgencyApi,
  listAgenciesApi,
  getAgencyLeaderboardApi,
  getAgencyRequestsApi,
} from "./agencies.service";

export function useMyAgency() {
  return useQuery({
    queryKey: ["agency", "me"],
    queryFn: getMyAgencyApi,
    staleTime: 20_000,
  });
}

export function useAgencyList(q: string) {
  return useQuery({
    queryKey: ["agency", "list", q],
    queryFn: () => listAgenciesApi(q),
    staleTime: 20_000,
  });
}

export function useAgencyLeaderboard(scope: "weekly" | "global" = "weekly") {
  return useQuery({
    queryKey: ["agency", "leaderboard", scope],
    queryFn: () => getAgencyLeaderboardApi(scope),
    staleTime: 30_000,
  });
}

export function useAgencyRequests(enabled: boolean) {
  return useQuery({
    queryKey: ["agency", "requests"],
    queryFn: getAgencyRequestsApi,
    enabled,
    staleTime: 15_000,
  });
}
