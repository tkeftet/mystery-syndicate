import { useQuery } from "@tanstack/react-query";
import { getPassHubApi, getPassRewardsApi } from "./pass.service";

export function usePassHub() {
  return useQuery({
    queryKey: ["pass", "hub"],
    queryFn: getPassHubApi,
    staleTime: 30_000,
  });
}

export function usePassRewards() {
  return useQuery({
    queryKey: ["pass", "rewards"],
    queryFn: getPassRewardsApi,
    staleTime: 30_000,
  });
}
