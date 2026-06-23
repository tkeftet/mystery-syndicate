import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getDailyCalendarApi, claimDailyApi } from "./dailyLogin.service";
import { track, AnalyticsEvent } from "../../services/analytics";

export function useDailyCalendar() {
  return useQuery({
    queryKey: ["dailyLogin"],
    queryFn: getDailyCalendarApi,
    staleTime: 60_000,
  });
}

export function useClaimDaily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: claimDailyApi,
    onSuccess: (res) => {
      track(AnalyticsEvent.DAILY_LOGIN_CLAIMED, {
        day_index: res.claimedDay,
        streak: res.currentStreak,
        was_catch_up: false,
      });
      // Reward touches coins/xp/hints/inventory + season pass.
      queryClient.invalidateQueries({ queryKey: ["dailyLogin"] });
      queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
      queryClient.invalidateQueries({ queryKey: ["pass"] });
    },
  });
}
