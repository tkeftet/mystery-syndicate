import mongoose, { Document, Schema } from "mongoose";
import type { ChallengePeriod } from "./challenge.model";

export interface IChallengeProgress extends Document {
  userId: string;
  challengeKey: string;
  period: ChallengePeriod;
  /** The period instance: "2026-06-21" / "2026-W25" / "2026-06". */
  periodKey: string;
  progress: number;
  target: number;
  completed: boolean;
  claimed: boolean;
  rewardSeasonXp: number;
  rewardCoins: number;
  createdAt: Date;
  updatedAt: Date;
}

const challengeProgressSchema = new Schema<IChallengeProgress>(
  {
    userId: { type: String, required: true },
    challengeKey: { type: String, required: true },
    period: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      required: true,
    },
    periodKey: { type: String, required: true },
    progress: { type: Number, default: 0 },
    target: { type: Number, required: true },
    completed: { type: Boolean, default: false },
    claimed: { type: Boolean, default: false },
    rewardSeasonXp: { type: Number, default: 0 },
    rewardCoins: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// One row per user per challenge per period instance.
challengeProgressSchema.index(
  { userId: 1, challengeKey: 1, periodKey: 1 },
  { unique: true },
);

export const ChallengeProgress = mongoose.model<IChallengeProgress>(
  "ChallengeProgress",
  challengeProgressSchema,
);
