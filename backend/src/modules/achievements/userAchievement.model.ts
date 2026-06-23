import mongoose, { Document, Schema } from "mongoose";

export interface IUserAchievement extends Document {
  userId: string;
  achievementKey: string;
  /** Snapshots so score/leaderboard never need a join. */
  category: string;
  rarity: string;
  points: number;
  progress: number;
  target: number;
  unlocked: boolean;
  unlockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userAchievementSchema = new Schema<IUserAchievement>(
  {
    userId: { type: String, required: true },
    achievementKey: { type: String, required: true },
    category: { type: String, required: true },
    rarity: { type: String, required: true },
    points: { type: Number, default: 0 },
    progress: { type: Number, default: 0 },
    target: { type: Number, required: true },
    unlocked: { type: Boolean, default: false },
    unlockedAt: { type: Date },
  },
  { timestamps: true },
);

userAchievementSchema.index(
  { userId: 1, achievementKey: 1 },
  { unique: true },
);
// Achievement Score leaderboard: sum points where unlocked.
userAchievementSchema.index({ userId: 1, unlocked: 1 });

export const UserAchievement = mongoose.model<IUserAchievement>(
  "UserAchievement",
  userAchievementSchema,
);
