import mongoose, { Document, Schema } from "mongoose";
import type {
  CaseType,
  CaseDifficulty,
  CaseStatus,
} from "@detective-club/shared";

export interface ICase extends Document {
  title: string;
  description: string;
  type: CaseType;
  difficulty: CaseDifficulty;
  status: CaseStatus;
  availableDate: string;
  estimatedMinutes: number;
  maxScore: number;
  /**
   * "daily" = normal daily case; "mega" = weekly Mega Case event;
   * "chapter" = an episode inside a Story Arc Season; "mini" = quick 1-2 min case.
   */
  kind: "daily" | "mega" | "chapter" | "mini";
  /** Set for mega cases — links back to the owning Event. */
  eventId?: string;
  /** Mega/chapter cases let players also pick motive + weapon; these are the choices. */
  megaOptions?: {
    motives: string[];
    weapons: string[];
  };
  // ── Story Arc (chapter) fields ─────────────────────────────────────────────
  /** Set for chapters — links back to the owning Season. */
  seasonId?: string;
  /** 1-based position within the season. */
  chapterNumber?: number;
  chapterType?:
    | "investigation"
    | "interrogation"
    | "discovery"
    | "twist"
    | "final_reveal";
  /** Narrative shown before the investigation. */
  storyText?: string;
  /** Teaser revealed on the completion summary to bait the next chapter. */
  cliffhanger?: string;
  victim: {
    name: string;
    description: string;
    avatar: string;
  };
  suspects: Array<{
    id: string;
    name: string;
    description: string;
    alibi: string;
    relationship: string;
    avatar: string;
  }>;
  evidence: Array<{
    id: string;
    title: string;
    description: string;
    type: "physical" | "digital" | "testimonial" | "document";
    imageUrl?: string;
    isRedHerring: boolean;
  }>;
  witnessStatements: Array<{
    id: string;
    witnessName: string;
    statement: string;
    reliability: "reliable" | "unreliable" | "uncertain";
  }>;
  timeline: Array<{
    id: string;
    time: string;
    description: string;
    involvedSuspects: string[];
  }>;
  solution: {
    suspectId: string;
    motive: string;
    weapon?: string;
    timelineEventId: string;
    explanation: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const caseSchema = new Schema<ICase>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: {
      type: String,
      enum: ["murder", "theft", "disappearance", "sabotage", "fraud"],
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard", "expert"],
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "active", "archived"],
      default: "scheduled",
    },
    availableDate: { type: String, required: true },
    estimatedMinutes: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    kind: {
      type: String,
      enum: ["daily", "mega", "chapter", "mini"],
      default: "daily",
    },
    eventId: { type: String },
    megaOptions: {
      motives: [{ type: String }],
      weapons: [{ type: String }],
    },
    seasonId: { type: String },
    chapterNumber: { type: Number },
    chapterType: {
      type: String,
      enum: [
        "investigation",
        "interrogation",
        "discovery",
        "twist",
        "final_reveal",
      ],
    },
    storyText: { type: String },
    cliffhanger: { type: String },
    victim: {
      name: { type: String, required: true },
      description: { type: String, required: true },
      avatar: { type: String, default: "default_victim" },
    },
    suspects: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        description: { type: String, required: true },
        alibi: { type: String, required: true },
        relationship: { type: String, required: true },
        avatar: { type: String, default: "default_suspect" },
      },
    ],
    evidence: [
      {
        id: { type: String, required: true },
        title: { type: String, required: true },
        description: { type: String, required: true },
        type: {
          type: String,
          enum: ["physical", "digital", "testimonial", "document"],
          required: true,
        },
        imageUrl: { type: String },
        isRedHerring: { type: Boolean, default: false },
      },
    ],
    witnessStatements: [
      {
        id: { type: String, required: true },
        witnessName: { type: String, required: true },
        statement: { type: String, required: true },
        reliability: {
          type: String,
          enum: ["reliable", "unreliable", "uncertain"],
          required: true,
        },
      },
    ],
    timeline: [
      {
        id: { type: String, required: true },
        time: { type: String, required: true },
        description: { type: String, required: true },
        involvedSuspects: [{ type: String }],
      },
    ],
    solution: {
      suspectId: { type: String, required: true },
      motive: { type: String, required: true },
      weapon: { type: String },
      timelineEventId: { type: String, required: true },
      explanation: { type: String, required: true },
    },
  },
  { timestamps: true },
);

caseSchema.index({ availableDate: 1 });
caseSchema.index({ status: 1 });

export const Case = mongoose.model<ICase>("Case", caseSchema);
