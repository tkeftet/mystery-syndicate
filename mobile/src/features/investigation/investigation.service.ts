import { apiClient } from "../../services/api";

export async function startInvestigationApi(caseId: string) {
  const { data } = await apiClient.post(`/investigations/${caseId}/start`);
  return data.data;
}

export async function getInvestigationApi(caseId: string) {
  const { data } = await apiClient.get(`/investigations/${caseId}`);
  return data.data;
}

export async function submitAccusationApi(
  caseId: string,
  suspectId: string,
  motive: string,
) {
  const { data } = await apiClient.post(`/investigations/${caseId}/accuse`, {
    suspectId,
    motive,
  });
  return data.data;
}
export async function useHintApi(caseId: string) {
  const { data } = await apiClient.post(`/investigations/${caseId}/hint`);
  return data.data;
}

// NOTE: ad rewards are granted server-side via AdMob SSV (not a client call).
// After a rewarded ad earns, the client re-reads investigation/profile state to
// pick up the server-granted reward — see InvestigationScreen.

export async function syncProgressApi(
  caseId: string,
  progress: {
    inspectedEvidenceIds: string[];
    reviewedSuspectIds: string[];
    reviewedStatementIds: string[];
  },
) {
  const { data } = await apiClient.patch(
    `/investigations/${caseId}/progress`,
    progress,
  );
  return data.data;
}
