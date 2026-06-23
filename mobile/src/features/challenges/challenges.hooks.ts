import { useQuery } from "@tanstack/react-query";
import { getChallengesApi } from "./challenges.service";

export function useChallenges() {
  return useQuery({
    queryKey: ["challenges"],
    queryFn: getChallengesApi,
    staleTime: 30_000,
  });
}
