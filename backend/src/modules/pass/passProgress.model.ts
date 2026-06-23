import mongoose, { Document, Schema } from "mongoose";

export interface IPassProgress extends Document {
  userId: string;
  passId: string;
  /** Season XP for THIS pass — resets each season (a new pass = new doc). */
  seasonXp: number;
  level: number;
  /** Free-track levels whose reward has been claimed. */
  claimedLevels: number[];
  /** Premium Season Pass — schema only for now. */
  isPremium: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const passProgressSchema = new Schema<IPassProgress>(
  {
    userId: { type: String, required: true },
    passId: { type: String, required: true },
    seasonXp: { type: Number, default: 0 },
    level: { type: Number, default: 0 },
    claimedLevels: { type: [Number], default: [] },
    isPremium: { type: Boolean, default: false },
  },
  { timestamps: true },
);

passProgressSchema.index({ userId: 1, passId: 1 }, { unique: true });
passProgressSchema.index({ passId: 1, seasonXp: -1 });

export const PassProgress = mongoose.model<IPassProgress>(
  "PassProgress",
  passProgressSchema,
);
