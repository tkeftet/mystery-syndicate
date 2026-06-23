import mongoose, { Document, Schema } from "mongoose";

export type EventStatus = "upcoming" | "active" | "completed" | "archived";
export type EventDifficulty = "easy" | "medium" | "hard" | "expert";

export interface RewardConfig {
  /** Rank 1. */
  top1: { title?: string; badge?: string; xp?: number; coins?: number };
  /** Ranks 2–10. */
  top10: { badge?: string; xp?: number; coins?: number };
  /** Ranks 11–100. */
  top100: { xp?: number; coins?: number };
  /** Everyone who submitted. */
  participation: { xp?: number; coins?: number };
}

export interface IEvent extends Document {
  title: string;
  description: string;
  image: string;
  /** The mega Case (Case.kind === "mega") that holds the actual investigation. */
  caseId: string;
  startDate: Date;
  endDate: Date;
  status: EventStatus;
  difficulty: EventDifficulty;
  rewardConfig: RewardConfig;
  leaderboardEnabled: boolean;
  /** Target completion time (seconds) used for the speed bonus. */
  targetCompletionSec: number;
  createdBy: string;
  /** Idempotency guard so end-of-event rewards are distributed exactly once. */
  rewardsDistributed: boolean;
  /** Lifecycle notifications already sent (e.g. "soon", "live", "24h", "last", "ended"). */
  notificationsSent: string[];
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, default: "" },
    caseId: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["upcoming", "active", "completed", "archived"],
      default: "upcoming",
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard", "expert"],
      required: true,
    },
    rewardConfig: {
      top1: {
        title: { type: String },
        badge: { type: String },
        xp: { type: Number },
        coins: { type: Number },
      },
      top10: {
        badge: { type: String },
        xp: { type: Number },
        coins: { type: Number },
      },
      top100: {
        xp: { type: Number },
        coins: { type: Number },
      },
      participation: {
        xp: { type: Number },
        coins: { type: Number },
      },
    },
    leaderboardEnabled: { type: Boolean, default: true },
    targetCompletionSec: { type: Number, default: 1800 },
    createdBy: { type: String, default: "system" },
    rewardsDistributed: { type: Boolean, default: false },
    notificationsSent: { type: [String], default: [] },
  },
  { timestamps: true },
);

eventSchema.index({ status: 1, startDate: 1 });
eventSchema.index({ endDate: 1 });

export const Event = mongoose.model<IEvent>("Event", eventSchema);
