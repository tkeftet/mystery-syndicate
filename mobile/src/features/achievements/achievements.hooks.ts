import { useQuery } from "@tanstack/react-query";
import { getAchievementsApi } from "./achievements.service";
import { useContentLang, selectLocalized } from "../../i18n/localizeContent";

export function useAchievements() {
  const lang = useContentLang();
  return useQuery({
    queryKey: ["achievements"],
    queryFn: getAchievementsApi,
    select: selectLocalized(lang),
    staleTime: 30_000,
  });
}
