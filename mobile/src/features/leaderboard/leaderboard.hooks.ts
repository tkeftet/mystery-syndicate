import { useQuery } from "@tanstack/react-query";
import {
  getDailyLeaderboardApi,
  getWeeklyLeaderboardApi,
  getAllTimeLeaderboardApi,
  getMyRankApi,
  getDetectiveOfWeekApi,
} from "./leaderboard.service";

export function useDailyLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard", "daily"],
    queryFn: getDailyLeaderboardApi,
    staleTime: 1000 * 60 * 5,
  });
}

export function useWeeklyLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard", "weekly"],
    queryFn: getWeeklyLeaderboardApi,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAllTimeLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard", "all-time"],
    queryFn: getAllTimeLeaderboardApi,
    staleTime: 1000 * 60 * 5,
  });
}

export function useDetectiveOfWeek() {
  return useQuery({
    queryKey: ["leaderboard", "detective-of-week"],
    queryFn: getDetectiveOfWeekApi,
    staleTime: 1000 * 60 * 5,
  });
}

export function useMyRank() {
  return useQuery({
    queryKey: ["leaderboard", "me"],
    queryFn: getMyRankApi,
    staleTime: 1000 * 60 * 5,
  });
}
