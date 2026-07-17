import { useQuery } from "@tanstack/react-query";
import { getChallengesApi } from "./challenges.service";
import { useContentLang, selectLocalized } from "../../i18n/localizeContent";

export function useChallenges() {
  const lang = useContentLang();
  return useQuery({
    queryKey: ["challenges"],
    queryFn: getChallengesApi,
    select: selectLocalized(lang),
    staleTime: 30_000,
  });
}
