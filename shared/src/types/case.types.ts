export type CaseType =
  | "murder"
  | "theft"
  | "disappearance"
  | "sabotage"
  | "fraud";
export type CaseDifficulty = "easy" | "medium" | "hard" | "expert";
export type CaseStatus = "draft" | "scheduled" | "active" | "archived";

export interface Suspect {
  id: string;
  name: string;
  description: string;
  alibi: string;
  relationship: string;
  avatar: string;
}

export interface Evidence {
  id: string;
  title: string;
  description: string;
  type: "physical" | "digital" | "testimonial" | "document";
  imageUrl?: string;
  isRedHerring: boolean;
}

export interface WitnessStatement {
  id: string;
  witnessName: string;
  statement: string;
  reliability: "reliable" | "unreliable" | "uncertain";
}

export interface TimelineEvent {
  id: string;
  time: string;
  description: string;
  involvedSuspects: string[];
}

export interface CaseSolution {
  suspectId: string;
  motive: string;
  weapon?: string;
  timelineEventId: string;
}

export interface DailyCase {
  id: string;
  title: string;
  description: string;
  type: CaseType;
  difficulty: CaseDifficulty;
  victim: {
    name: string;
    description: string;
    avatar: string;
  };
  suspects: Suspect[];
  evidence: Evidence[];
  witnessStatements: WitnessStatement[];
  timeline: TimelineEvent[];
  availableDate: string;
  estimatedMinutes: number;
  maxScore: number;
}
