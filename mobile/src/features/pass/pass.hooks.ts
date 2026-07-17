import { useQuery } from "@tanstack/react-query";
import { getPassHubApi, getPassRewardsApi } from "./pass.service";
import { useContentLang, selectLocalized } from "../../i18n/localizeContent";

export function usePassHub() {
  const lang = useContentLang();
  return useQuery({
    queryKey: ["pass", "hub"],
    queryFn: getPassHubApi,
    select: selectLocalized(lang),
    staleTime: 30_000,
  });
}

export function usePassRewards() {
  const lang = useContentLang();
  return useQuery({
    queryKey: ["pass", "rewards"],
    queryFn: getPassRewardsApi,
    select: selectLocalized(lang),
    staleTime: 30_000,
  });
}
