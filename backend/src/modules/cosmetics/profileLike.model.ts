import mongoose, { Document, Schema } from "mongoose";

/**
 * One row per (liker → target). The unique compound index makes liking
 * idempotent and lets us toggle. The aggregate count is mirrored on
 * `user.profileLikes` (maintained via $inc) so the showcase reads it cheaply.
 */
export interface IProfileLike extends Document {
  userId: mongoose.Types.ObjectId; // the liker
  targetId: mongoose.Types.ObjectId; // the liked profile
  createdAt: Date;
}

const profileLikeSchema = new Schema<IProfileLike>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    targetId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

profileLikeSchema.index({ userId: 1, targetId: 1 }, { unique: true });

export const ProfileLike = mongoose.model<IProfileLike>(
  "ProfileLike",
  profileLikeSchema,
);
