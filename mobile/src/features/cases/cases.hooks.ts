import { useQuery } from "@tanstack/react-query";
import {
  getTodayCaseApi,
  getRecentCasesApi,
  getCaseByIdApi,
  getTodayMinisApi,
} from "./cases.service";
import { useContentLang, selectLocalized } from "../../i18n/localizeContent";

// Case content arrives raw ({en,fr,ar}); `select` resolves it to the current
// language. Switching language re-runs select on the cached data (no refetch),
// so the case text changes instantly.
export function useTodayCase() {
  const lang = useContentLang();
  return useQuery({
    queryKey: ["cases", "today"],
    queryFn: getTodayCaseApi,
    select: selectLocalized(lang),
    staleTime: 1000 * 60 * 10,
  });
}

export function useTodayMinis() {
  const lang = useContentLang();
  return useQuery({
    queryKey: ["cases", "mini"],
    queryFn: getTodayMinisApi,
    select: selectLocalized(lang),
    staleTime: 1000 * 60 * 10,
  });
}

export function useRecentCases() {
  const lang = useContentLang();
  return useQuery({
    queryKey: ["cases", "recent"],
    queryFn: getRecentCasesApi,
    select: selectLocalized(lang),
    staleTime: 1000 * 60 * 10,
  });
}

export function useCaseById(caseId: string) {
  const lang = useContentLang();
  return useQuery({
    queryKey: ["cases", caseId],
    queryFn: () => getCaseByIdApi(caseId),
    select: selectLocalized(lang),
    enabled: !!caseId,
  });
}
