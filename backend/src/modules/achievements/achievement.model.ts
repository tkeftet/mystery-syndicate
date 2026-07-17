import mongoose, { Document, Schema } from "mongoose";
import type { LocalizedString } from "../../shared/localized";

// name/description are localizable ({ en, fr?, ar? }); the API resolves them
// returned raw and resolved by the app per language. Stored as Mixed.
const LocalizedText = { type: Schema.Types.Mixed };

export type AchievementCategory =
  | "cases"
  | "accuracy"
  | "streaks"
  | "story"
  | "mega"
  | "social"
  | "seasonal";
export type AchievementRarity =
  | "common"
  | "rare"
  | "epic"
  | "legendary"
  | "mythic";
export type ProgressType = "counter" | "value";

/** Points awarded toward Achievement Score, by rarity. */
export const RARITY_POINTS: Record<AchievementRarity, number> = {
  common: 10,
  rare: 25,
  epic: 50,
  legendary: 100,
  mythic: 250,
};

export interface IAchievement extends Document {
  key: string;
  name: LocalizedString;
  description: LocalizedString;
  icon: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  points: number;
  /** Event this achievement listens to (case_solved, perfect_case, streak_day…). */
  metric: string;
  /** counter = increment by amount; value = set to max(current, amount). */
  progressType: ProgressType;
  target: number;
  rewardXp: number;
  rewardCoins: number;
  rewardBadge?: string;
  rewardTitle?: string;
  /** Hidden achievements are only shown once unlocked. */
  hidden: boolean;
  active: boolean;
  order: number;
}

const achievementSchema = new Schema<IAchievement>(
  {
    key: { type: String, required: true, unique: true },
    name: LocalizedText,
    description: LocalizedText,
    icon: { type: String, default: "trophy" },
    category: {
      type: String,
      enum: ["cases", "accuracy", "streaks", "story", "mega", "social", "seasonal"],
      required: true,
    },
    rarity: {
      type: String,
      enum: ["common", "rare", "epic", "legendary", "mythic"],
      default: "common",
    },
    points: { type: Number, default: 10 },
    metric: { type: String, required: true },
    progressType: { type: String, enum: ["counter", "value"], default: "counter" },
    target: { type: Number, required: true },
    rewardXp: { type: Number, default: 0 },
    rewardCoins: { type: Number, default: 0 },
    rewardBadge: { type: String },
    rewardTitle: { type: String },
    hidden: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

achievementSchema.index({ active: 1, metric: 1 });

export const Achievement = mongoose.model<IAchievement>(
  "Achievement",
  achievementSchema,
);
