import mongoose, { Document, Schema } from "mongoose";

export type FriendshipStatus = "pending" | "accepted" | "rejected" | "blocked";

export interface IFriendship extends Document {
  /** Who initiated (for blocks, the blocker). */
  requesterId: string;
  receiverId: string;
  status: FriendshipStatus;
  createdAt: Date;
  updatedAt: Date;
}

const friendshipSchema = new Schema<IFriendship>(
  {
    requesterId: { type: String, required: true },
    receiverId: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "blocked"],
      default: "pending",
    },
  },
  { timestamps: true },
);

// One relationship row per ordered pair.
friendshipSchema.index({ requesterId: 1, receiverId: 1 }, { unique: true });
friendshipSchema.index({ receiverId: 1, status: 1 });
friendshipSchema.index({ requesterId: 1, status: 1 });

export const Friendship = mongoose.model<IFriendship>(
  "Friendship",
  friendshipSchema,
);
