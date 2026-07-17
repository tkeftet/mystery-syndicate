import mongoose, { Document, Schema } from "mongoose";
import type { LocalizedString } from "../../shared/localized";

// title/subtitle/description are localizable ({ en, fr?, ar? }); the API resolves
// returned raw and resolved by the app per language. Stored as Mixed.
const LocalizedText = { type: Schema.Types.Mixed };

export type SeasonStatus = "upcoming" | "active" | "completed" | "archived";
export type SeasonDifficulty = "easy" | "medium" | "hard" | "expert";

export interface SeasonRewardBundle {
  xp?: number;
  coins?: number;
  badge?: string;
  title?: string;
  avatar?: string;
}

export interface SeasonRewards {
  /** Default reward granted on each chapter completion. */
  chapter: SeasonRewardBundle;
  /** Bonus rewards at N completed chapters (e.g. 5/10/20/30). */
  milestones: Array<{ atChapter: number } & SeasonRewardBundle>;
  /** Granted once when the whole season is completed. */
  completion: SeasonRewardBundle;
}

export interface ISeason extends Document {
  title: LocalizedString;
  subtitle: LocalizedString;
  description: LocalizedString;
  coverImage: string;
  trailerImage: string;
  difficulty: SeasonDifficulty;
  startDate: Date;
  endDate: Date;
  totalChapters: number;
  status: SeasonStatus;
  rewards: SeasonRewards;
  /** Days between chapter unlocks (1 = a new chapter each day). */
  unlockCadenceDays: number;
  leaderboardEnabled: boolean;
  createdBy: string;
  /** Lifecycle notifications already sent (e.g. "live", "chapter_3", "ending"). */
  notificationsSent: string[];
  /** Premium Season Pass — schema only, no payment logic yet. */
  premiumEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const rewardBundle = {
  xp: { type: Number },
  coins: { type: Number },
  badge: { type: String },
  title: { type: String },
  avatar: { type: String },
};

const seasonSchema = new Schema<ISeason>(
  {
    title: LocalizedText,
    subtitle: LocalizedText,
    description: LocalizedText,
    coverImage: { type: String, default: "" },
    trailerImage: { type: String, default: "" },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard", "expert"],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalChapters: { type: Number, required: true },
    status: {
      type: String,
      enum: ["upcoming", "active", "completed", "archived"],
      default: "upcoming",
    },
    rewards: {
      chapter: rewardBundle,
      milestones: [{ atChapter: { type: Number }, ...rewardBundle }],
      completion: rewardBundle,
    },
    unlockCadenceDays: { type: Number, default: 1 },
    leaderboardEnabled: { type: Boolean, default: true },
    createdBy: { type: String, default: "system" },
    notificationsSent: { type: [String], default: [] },
    premiumEnabled: { type: Boolean, default: false },
  },
  { timestamps: true },
);

seasonSchema.index({ status: 1, startDate: 1 });
seasonSchema.index({ endDate: 1 });

export const Season = mongoose.model<ISeason>("Season", seasonSchema);
