import mongoose, { Document, Schema } from "mongoose";
import type { LocalizedString } from "../../shared/localized";

// title/subtitle/description are localizable ({ en, fr?, ar? }); returned raw and resolved by the app per language. Stored as Mixed.
const LocalizedText = { type: Schema.Types.Mixed };

export type PassStatus = "upcoming" | "active" | "completed" | "archived";
export type RewardTier = "common" | "rare" | "epic" | "legendary";
export type RewardTrack = "free" | "premium";

export interface PassReward {
  level: number;
  tier: RewardTier;
  track: RewardTrack;
  label?: string;
  xp?: number;
  coins?: number;
  badge?: string;
  title?: string;
  avatar?: string;
}

export interface ISeasonPass extends Document {
  title: LocalizedString;
  subtitle: LocalizedString;
  description: LocalizedString;
  coverImage: string;
  bannerImage: string;
  seasonTheme: string;
  startDate: Date;
  endDate: Date;
  status: PassStatus;
  totalLevels: number;
  /** Flat Season XP needed per level (battle-pass style). */
  xpPerLevel: number;
  rewards: PassReward[];
  /** Premium track — schema only, no payment logic yet. */
  premiumEnabled: boolean;
  createdBy: string;
  notificationsSent: string[];
  createdAt: Date;
  updatedAt: Date;
}

const seasonPassSchema = new Schema<ISeasonPass>(
  {
    title: LocalizedText,
    subtitle: LocalizedText,
    description: LocalizedText,
    coverImage: { type: String, default: "" },
    bannerImage: { type: String, default: "" },
    seasonTheme: { type: String, default: "" },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["upcoming", "active", "completed", "archived"],
      default: "upcoming",
    },
    totalLevels: { type: Number, default: 100 },
    xpPerLevel: { type: Number, default: 120 },
    rewards: [
      {
        level: { type: Number, required: true },
        tier: {
          type: String,
          enum: ["common", "rare", "epic", "legendary"],
          default: "common",
        },
        track: { type: String, enum: ["free", "premium"], default: "free" },
        label: { type: String },
        xp: { type: Number },
        coins: { type: Number },
        badge: { type: String },
        title: { type: String },
        avatar: { type: String },
      },
    ],
    premiumEnabled: { type: Boolean, default: false },
    createdBy: { type: String, default: "system" },
    notificationsSent: { type: [String], default: [] },
  },
  { timestamps: true },
);

seasonPassSchema.index({ status: 1, startDate: 1 });
seasonPassSchema.index({ endDate: 1 });

export const SeasonPass = mongoose.model<ISeasonPass>(
  "SeasonPass",
  seasonPassSchema,
);
