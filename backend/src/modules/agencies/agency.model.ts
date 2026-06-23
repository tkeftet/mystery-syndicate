import mongoose, { Document, Schema } from "mongoose";

export type AgencyPrivacy = "public" | "request";

export interface IAgency extends Document {
  name: string;
  nameLower: string;
  description: string;
  badge: string;
  banner: string;
  privacy: AgencyPrivacy;
  minLevel: number;
  language: string;
  region: string;
  leaderId: string;
  memberCount: number;
  agencyXp: number;
  level: number;
  weeklyPoints: number;
  seasonalPoints: number;
  /** ISO week key of the last weekly reset, e.g. "2026-W25". */
  lastWeekKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const agencySchema = new Schema<IAgency>(
  {
    name: { type: String, required: true },
    nameLower: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    badge: { type: String, default: "default" },
    banner: { type: String, default: "default" },
    privacy: { type: String, enum: ["public", "request"], default: "public" },
    minLevel: { type: Number, default: 1 },
    language: { type: String, default: "en" },
    region: { type: String, default: "global" },
    leaderId: { type: String, required: true },
    memberCount: { type: Number, default: 1 },
    agencyXp: { type: Number, default: 0 },
    level: { type: Number, default: 0 },
    weeklyPoints: { type: Number, default: 0 },
    seasonalPoints: { type: Number, default: 0 },
    lastWeekKey: { type: String, default: "" },
  },
  { timestamps: true },
);

agencySchema.index({ weeklyPoints: -1 });
agencySchema.index({ agencyXp: -1 });

export const Agency = mongoose.model<IAgency>("Agency", agencySchema);

/** Member-cap grows with agency level (base 20, +5/level, capped 100). */
export function memberCapForLevel(level: number): number {
  return Math.min(20 + level * 5, 100);
}

/** Cumulative agency-level curve: level n→n+1 costs 1000*(n+1) XP. */
export function agencyLevelForXp(xp: number): number {
  let level = 0;
  let acc = 0;
  let need = 1000;
  while (acc + need <= xp) {
    acc += need;
    level++;
    need += 1000;
  }
  return level;
}
