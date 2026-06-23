import mongoose, { Document, Schema } from "mongoose";

export interface ScoreBreakdown {
  suspect: number;
  motive: number;
  weapon: number;
  timeline: number;
  /** Bonus for using no assists at all — zero hints AND zero rewarded-ad helps. */
  noAssists: number;
  speed: number;
}

export interface IEventParticipation extends Document {
  userId: string;
  eventId: string;
  caseId: string;
  startedAt: Date;
  completedAt?: Date;
  /** Seconds from startedAt to completedAt. */
  completionTimeSec?: number;
  status: "in_progress" | "completed";
  accusation?: {
    suspectId: string;
    motive: string;
    weapon: string;
    timelineEventId: string;
  };
  scoreBreakdown?: ScoreBreakdown;
  score: number;
  hintsUsed: number;
  /** 0–100, fraction of the four solution parts guessed correctly. */
  accuracy: number;
  /** Final placement, set when the event ends and rewards are distributed. */
  rank?: number;
  /** "top1" | "top10" | "top100" | "participation" once rewards are granted. */
  rewardTier?: string;
  createdAt: Date;
  updatedAt: Date;
}

const eventParticipationSchema = new Schema<IEventParticipation>(
  {
    userId: { type: String, required: true },
    eventId: { type: String, required: true },
    caseId: { type: String, required: true },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    completionTimeSec: { type: Number },
    status: {
      type: String,
      enum: ["in_progress", "completed"],
      default: "in_progress",
    },
    accusation: {
      suspectId: { type: String },
      motive: { type: String },
      weapon: { type: String },
      timelineEventId: { type: String },
    },
    scoreBreakdown: {
      suspect: { type: Number },
      motive: { type: Number },
      weapon: { type: Number },
      timeline: { type: Number },
      noAssists: { type: Number },
      speed: { type: Number },
    },
    score: { type: Number, default: 0 },
    hintsUsed: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    rank: { type: Number },
    rewardTier: { type: String },
  },
  { timestamps: true },
);

// One participation per user per event — the single-submission guarantee.
eventParticipationSchema.index({ userId: 1, eventId: 1 }, { unique: true });
// Leaderboard ordering: highest score, then fastest, then earliest finish.
eventParticipationSchema.index({ eventId: 1, score: -1, completionTimeSec: 1 });

export const EventParticipation = mongoose.model<IEventParticipation>(
  "EventParticipation",
  eventParticipationSchema,
);
