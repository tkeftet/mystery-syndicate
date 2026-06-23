import mongoose, { Document, Schema } from "mongoose";

/**
 * Records each AdMob SSV transaction we've granted, so retried callbacks (AdMob
 * resends until it gets a 2xx) never double-grant a reward. The unique index on
 * `transactionId` is the dedupe guarantee.
 */
export interface IProcessedAdReward extends Document {
  transactionId: string;
  userId: string;
  caseId?: string;
  type: string;
  createdAt: Date;
}

const processedAdRewardSchema = new Schema<IProcessedAdReward>(
  {
    transactionId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    // Optional: case-scoped rewards set this; account-scoped rewards (e.g. the
    // daily-login streak save) have no case.
    caseId: { type: String, required: false },
    type: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const ProcessedAdReward = mongoose.model<IProcessedAdReward>(
  "ProcessedAdReward",
  processedAdRewardSchema,
);
