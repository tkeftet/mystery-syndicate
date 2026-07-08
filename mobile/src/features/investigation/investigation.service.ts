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

/**
 * Redeem a rewarded-ad help after the ad earns. Authenticated; the server picks
 * the innocent suspect / red herring (solution never leaves the server) and
 * returns the updated investigation immediately — no SSV round-trip to wait on.
 */
export async function redeemAdRewardApi(
  caseId: string,
  type: "eliminate" | "reveal" | "double",
) {
  const { data } = await apiClient.post(`/investigations/${caseId}/ad-reward`, {
    type,
  });
  return data.data;
}

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
