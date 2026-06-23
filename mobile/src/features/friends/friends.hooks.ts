import { useQuery } from "@tanstack/react-query";
import {
  listFriendsApi,
  listRequestsApi,
  searchUsersApi,
  getPrivacyApi,
} from "./friends.service";

export function useFriends(sort = "online") {
  return useQuery({
    queryKey: ["friends", sort],
    queryFn: () => listFriendsApi(sort),
    staleTime: 30_000,
  });
}

export function useFriendRequests() {
  return useQuery({
    queryKey: ["friend-requests"],
    queryFn: listRequestsApi,
    staleTime: 15_000,
  });
}

export function useUserSearch(q: string) {
  return useQuery({
    queryKey: ["user-search", q],
    queryFn: () => searchUsersApi(q),
    enabled: q.trim().length >= 2,
    staleTime: 15_000,
  });
}

export function usePrivacy() {
  return useQuery({
    queryKey: ["privacy"],
    queryFn: getPrivacyApi,
    staleTime: 60_000,
  });
}
