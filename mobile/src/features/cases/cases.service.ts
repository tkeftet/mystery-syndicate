import { apiClient } from "../../services/api";

export async function getTodayCaseApi() {
  const { data } = await apiClient.get("/cases/today");
  return data.data;
}

export async function getRecentCasesApi() {
  const { data } = await apiClient.get("/cases/recent");
  return data.data;
}

export async function getTodayMinisApi() {
  const { data } = await apiClient.get("/cases/mini");
  return data.data;
}

export async function getCaseByIdApi(caseId: string) {
  const { data } = await apiClient.get(`/cases/${caseId}`);
  return data.data;
}
