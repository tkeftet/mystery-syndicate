import mongoose, { Document, Schema } from "mongoose";
import type { LocalizedString } from "../../shared/localized";

// title/description are localizable ({ en, fr?, ar? }); the API resolves them
// returned raw and resolved by the app per language. Stored as Mixed.
const LocalizedText = { type: Schema.Types.Mixed };

export type ChallengePeriod = "daily" | "weekly" | "monthly";

/**
 * A reusable challenge definition. The same definition recurs every period;
 * per-user, per-period progress lives in ChallengeProgress.
 */
export interface IChallenge extends Document {
  key: string;
  period: ChallengePeriod;
  title: LocalizedString;
  description: LocalizedString;
  /** Counter event this challenge listens to (e.g. case_solved, mini_solved). */
  metric: string;
  target: number;
  rewardSeasonXp: number;
  rewardCoins: number;
  active: boolean;
  order: number;
}

const challengeSchema = new Schema<IChallenge>(
  {
    key: { type: String, required: true, unique: true },
    period: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      required: true,
    },
    title: LocalizedText,
    description: LocalizedText,
    metric: { type: String, required: true },
    target: { type: Number, required: true },
    rewardSeasonXp: { type: Number, default: 0 },
    rewardCoins: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

challengeSchema.index({ active: 1, metric: 1 });

export const Challenge = mongoose.model<IChallenge>("Challenge", challengeSchema);
