import mongoose, { Document, Schema } from "mongoose";

export interface IAgencyJoinRequest extends Document {
  agencyId: string;
  userId: string;
  createdAt: Date;
}

const agencyJoinRequestSchema = new Schema<IAgencyJoinRequest>(
  {
    agencyId: { type: String, required: true },
    userId: { type: String, required: true },
  },
  { timestamps: true },
);

agencyJoinRequestSchema.index({ agencyId: 1, userId: 1 }, { unique: true });

export const AgencyJoinRequest = mongoose.model<IAgencyJoinRequest>(
  "AgencyJoinRequest",
  agencyJoinRequestSchema,
);
