import mongoose, { Document, Schema } from "mongoose";

export type AgencyRole = "leader" | "coleader" | "officer" | "member";

export const ROLE_RANK: Record<AgencyRole, number> = {
  leader: 4,
  coleader: 3,
  officer: 2,
  member: 1,
};

export interface IAgencyMember extends Document {
  agencyId: string;
  userId: string;
  role: AgencyRole;
  contributionTotal: number;
  weeklyContribution: number;
  joinedAt: Date;
}

const agencyMemberSchema = new Schema<IAgencyMember>(
  {
    agencyId: { type: String, required: true },
    // One agency per user — unique across the collection.
    userId: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: ["leader", "coleader", "officer", "member"],
      default: "member",
    },
    contributionTotal: { type: Number, default: 0 },
    weeklyContribution: { type: Number, default: 0 },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

agencyMemberSchema.index({ agencyId: 1, weeklyContribution: -1 });

export const AgencyMember = mongoose.model<IAgencyMember>(
  "AgencyMember",
  agencyMemberSchema,
);
