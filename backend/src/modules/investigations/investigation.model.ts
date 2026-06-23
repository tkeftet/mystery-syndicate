import mongoose, { Document, Schema } from "mongoose";

export interface IInvestigation extends Document {
  userId: string;
  caseId: string;
  inspectedEvidenceIds: string[];
  reviewedStatementIds: string[];
  reviewedSuspectIds: string[];
  hintsUsed: number;
  startedAt: Date;
  completedAt?: Date;
  accusation?: {
    suspectId: string;
    motive: string;
  };
  score?: number;
  isCorrect?: boolean;
  status: "in_progress" | "completed";
  clearedSuspectIds: string[];
  /** Red herrings exposed via a rewarded ad. */
  revealedRedHerringIds: string[];
  /** Count of rewarded-ad helps used (eliminate suspect / expose herring). */
  adHelpsUsed: number;
  /** True once the case reward (XP + coins) was doubled via a rewarded ad. */
  rewardDoubled: boolean;
}

const investigationSchema = new Schema<IInvestigation>(
  {
    userId: { type: String, required: true },
    caseId: { type: String, required: true },
    inspectedEvidenceIds: [{ type: String }],
    reviewedStatementIds: [{ type: String }],
    reviewedSuspectIds: [{ type: String }],
    hintsUsed: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    accusation: {
      suspectId: { type: String },
      motive: { type: String },
    },
    score: { type: Number },
    isCorrect: { type: Boolean },
    status: {
      type: String,
      enum: ["in_progress", "completed"],
      default: "in_progress",
    },
    clearedSuspectIds: [{ type: String }],
    revealedRedHerringIds: [{ type: String }],
    adHelpsUsed: { type: Number, default: 0 },
    rewardDoubled: { type: Boolean, default: false },
  },
  { timestamps: true },
);

investigationSchema.index({ userId: 1, caseId: 1 }, { unique: true });

export const Investigation = mongoose.model<IInvestigation>(
  "Investigation",
  investigationSchema,
);
