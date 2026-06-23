export interface DeductionLink {
  id: string;
  fromId: string;
  toId: string;
  linkType: "suspect_motive" | "suspect_evidence" | "suspect_opportunity";
  note?: string;
}

export interface Accusation {
  suspectId: string;
  motive: string;
  weaponId?: string;
  timelineEventId: string;
}

export interface InvestigationProgress {
  caseId: string;
  userId: string;
  inspectedEvidenceIds: string[];
  reviewedStatementIds: string[];
  deductionLinks: DeductionLink[];
  hintsUsed: number;
  startedAt: string;
  completedAt?: string;
  accusation?: Accusation;
  score?: number;
  isCorrect?: boolean;
}
