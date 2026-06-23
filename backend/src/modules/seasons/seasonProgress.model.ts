import mongoose, { Document, Schema } from "mongoose";

export interface ChapterStat {
  chapter: number;
  score: number;
  accuracy: number;
  completionTimeSec: number;
  completedAt: Date;
}

export interface ISeasonProgress extends Document {
  userId: string;
  seasonId: string;
  /** Next chapter to play (highest completed + 1). */
  currentChapter: number;
  completedChapters: number[];
  seasonScore: number;
  /** Running average accuracy across completed chapters (0–100). */
  accuracy: number;
  /** Internal: sum of per-chapter accuracy, for the running average. */
  accuracySum: number;
  /** Sum of chapter completion times — leaderboard speed tiebreaker. */
  totalCompletionTimeSec: number;
  chapterStats: ChapterStat[];
  /** Milestone `atChapter` values already granted (idempotency). */
  claimedMilestones: number[];
  completionClaimed: boolean;
  /** Premium Season Pass — schema only for now. */
  isPremium: boolean;
  startedAt: Date;
  lastPlayedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const seasonProgressSchema = new Schema<ISeasonProgress>(
  {
    userId: { type: String, required: true },
    seasonId: { type: String, required: true },
    currentChapter: { type: Number, default: 1 },
    completedChapters: { type: [Number], default: [] },
    seasonScore: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    accuracySum: { type: Number, default: 0 },
    totalCompletionTimeSec: { type: Number, default: 0 },
    chapterStats: [
      {
        chapter: { type: Number },
        score: { type: Number },
        accuracy: { type: Number },
        completionTimeSec: { type: Number },
        completedAt: { type: Date },
      },
    ],
    claimedMilestones: { type: [Number], default: [] },
    completionClaimed: { type: Boolean, default: false },
    isPremium: { type: Boolean, default: false },
    startedAt: { type: Date, default: Date.now },
    lastPlayedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// One progress doc per user per season.
seasonProgressSchema.index({ userId: 1, seasonId: 1 }, { unique: true });
// Leaderboard ordering.
seasonProgressSchema.index({ seasonId: 1, seasonScore: -1 });

export const SeasonProgress = mongoose.model<ISeasonProgress>(
  "SeasonProgress",
  seasonProgressSchema,
);
