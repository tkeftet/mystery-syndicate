import { create } from "zustand";

interface InvestigationState {
  inspectedEvidenceIds: string[];
  reviewedSuspectIds: string[];
  reviewedStatementIds: string[];
  selectedSuspectId: string | null;
  selectedMotive: string | null;

  markEvidenceInspected: (id: string) => void;
  markSuspectReviewed: (id: string) => void;
  markStatementReviewed: (id: string) => void;
  setAccusation: (suspectId: string, motive: string) => void;
  reset: () => void;
  canAccuse: (totalEvidence: number, totalSuspects: number) => boolean;
  clearedSuspectIds: string[];
  markSuspectCleared: (id: string) => void;
  revealedRedHerringIds: string[];
  markRedHerringRevealed: (id: string) => void;
}

export const useInvestigationStore = create<InvestigationState>((set, get) => ({
  inspectedEvidenceIds: [],
  reviewedSuspectIds: [],
  reviewedStatementIds: [],
  selectedSuspectId: null,
  selectedMotive: null,
  clearedSuspectIds: [],
  revealedRedHerringIds: [],

  markSuspectCleared: (id) =>
    set((s) => ({
      clearedSuspectIds: s.clearedSuspectIds.includes(id)
        ? s.clearedSuspectIds
        : [...s.clearedSuspectIds, id],
    })),

  markRedHerringRevealed: (id) =>
    set((s) => ({
      revealedRedHerringIds: s.revealedRedHerringIds.includes(id)
        ? s.revealedRedHerringIds
        : [...s.revealedRedHerringIds, id],
    })),

  markEvidenceInspected: (id) =>
    set((s) => ({
      inspectedEvidenceIds: s.inspectedEvidenceIds.includes(id)
        ? s.inspectedEvidenceIds
        : [...s.inspectedEvidenceIds, id],
    })),

  markSuspectReviewed: (id) =>
    set((s) => ({
      reviewedSuspectIds: s.reviewedSuspectIds.includes(id)
        ? s.reviewedSuspectIds
        : [...s.reviewedSuspectIds, id],
    })),

  markStatementReviewed: (id) =>
    set((s) => ({
      reviewedStatementIds: s.reviewedStatementIds.includes(id)
        ? s.reviewedStatementIds
        : [...s.reviewedStatementIds, id],
    })),

  setAccusation: (suspectId, motive) =>
    set({ selectedSuspectId: suspectId, selectedMotive: motive }),

  reset: () =>
    set({
      inspectedEvidenceIds: [],
      reviewedSuspectIds: [],
      reviewedStatementIds: [],
      selectedSuspectId: null,
      selectedMotive: null,
      clearedSuspectIds: [],
      revealedRedHerringIds: [],
    }),

  canAccuse: (totalEvidence, totalSuspects) => {
    const s = get();
    return (
      s.inspectedEvidenceIds.length >= Math.ceil(totalEvidence * 0.5) &&
      s.reviewedSuspectIds.length >= totalSuspects
    );
  },
}));
