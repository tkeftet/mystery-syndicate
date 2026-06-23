import { useQuery } from "@tanstack/react-query";
import { getAchievementsApi } from "./achievements.service";

export function useAchievements() {
  return useQuery({
    queryKey: ["achievements"],
    queryFn: getAchievementsApi,
    staleTime: 30_000,
  });
}
