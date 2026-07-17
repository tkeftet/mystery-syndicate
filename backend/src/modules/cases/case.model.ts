import mongoose, { Document, Schema } from "mongoose";
import type {
  CaseType,
  CaseDifficulty,
  CaseStatus,
} from "../../shared/types/domain.types";
import type { LocalizedString } from "../../shared/localized";

// Localizable text fields accept a plain string (English-only / legacy content)
// or a { en, fr?, ar? } object; the API resolves them per request language.
// Stored as Mixed so Mongoose keeps the object shape instead of coercing to a
// string. See shared/localized.ts.
const LocalizedText = { type: Schema.Types.Mixed };

export interface ICase extends Document {
  title: LocalizedString;
  description: LocalizedString;
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
  /** Mega/chapter cases let players also pick motive + weapon; these are the choices.
   * Options are localizable for display; scoring resolves the solution to the
   * caller's language before comparing (see events/seasons services). */
  megaOptions?: {
    motives: LocalizedString[];
    weapons: LocalizedString[];
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
  storyText?: LocalizedString;
  /** Teaser revealed on the completion summary to bait the next chapter. */
  cliffhanger?: LocalizedString;
  victim: {
    name: LocalizedString;
    description: LocalizedString;
    avatar: string;
  };
  suspects: Array<{
    id: string;
    name: LocalizedString;
    description: LocalizedString;
    alibi: LocalizedString;
    relationship: LocalizedString;
    avatar: string;
  }>;
  evidence: Array<{
    id: string;
    title: LocalizedString;
    description: LocalizedString;
    type: "physical" | "digital" | "testimonial" | "document";
    imageUrl?: string;
    isRedHerring: boolean;
  }>;
  witnessStatements: Array<{
    id: string;
    witnessName: LocalizedString;
    statement: LocalizedString;
    reliability: "reliable" | "unreliable" | "uncertain";
  }>;
  timeline: Array<{
    id: string;
    time: LocalizedString;
    description: LocalizedString;
    involvedSuspects: string[];
  }>;
  solution: {
    suspectId: string;
    // motive/weapon are localizable; mega/chapter scoring resolves them to the
    // caller's language before string-comparing against the submitted option.
    motive: LocalizedString;
    weapon?: LocalizedString;
    timelineEventId: string;
    explanation: LocalizedString;
  };
  createdAt: Date;
  updatedAt: Date;
}

const caseSchema = new Schema<ICase>(
  {
    title: LocalizedText,
    description: LocalizedText,
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
      motives: [Schema.Types.Mixed],
      weapons: [Schema.Types.Mixed],
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
    storyText: LocalizedText,
    cliffhanger: LocalizedText,
    victim: {
      name: LocalizedText,
      description: LocalizedText,
      avatar: { type: String, default: "default_victim" },
    },
    suspects: [
      {
        id: { type: String, required: true },
        name: LocalizedText,
        description: LocalizedText,
        alibi: LocalizedText,
        relationship: LocalizedText,
        avatar: { type: String, default: "default_suspect" },
      },
    ],
    evidence: [
      {
        id: { type: String, required: true },
        title: LocalizedText,
        description: LocalizedText,
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
        witnessName: LocalizedText,
        statement: LocalizedText,
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
        time: LocalizedText,
        description: LocalizedText,
        involvedSuspects: [{ type: String }],
      },
    ],
    solution: {
      suspectId: { type: String, required: true },
      motive: LocalizedText,
      weapon: LocalizedText,
      timelineEventId: { type: String, required: true },
      explanation: LocalizedText,
    },
  },
  { timestamps: true },
);

caseSchema.index({ availableDate: 1 });
caseSchema.index({ status: 1 });

export const Case = mongoose.model<ICase>("Case", caseSchema);
