import { useQuery } from "@tanstack/react-query";
import {
  getTodayCaseApi,
  getRecentCasesApi,
  getCaseByIdApi,
  getTodayMinisApi,
} from "./cases.service";

export function useTodayCase() {
  return useQuery({
    queryKey: ["cases", "today"],
    queryFn: getTodayCaseApi,
    staleTime: 1000 * 60 * 10,
  });
}

export function useTodayMinis() {
  return useQuery({
    queryKey: ["cases", "mini"],
    queryFn: getTodayMinisApi,
    staleTime: 1000 * 60 * 10,
  });
}

export function useRecentCases() {
  return useQuery({
    queryKey: ["cases", "recent"],
    queryFn: getRecentCasesApi,
    staleTime: 1000 * 60 * 10,
  });
}

export function useCaseById(caseId: string) {
  return useQuery({
    queryKey: ["cases", caseId],
    queryFn: () => getCaseByIdApi(caseId),
    enabled: !!caseId,
  });
}
