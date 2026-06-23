import mongoose, { Document, Schema } from "mongoose";

/**
 * Daily Login Calendar — per-user streak state.
 *
 * Model is STREAK-BASED: `dayIndex` is the next calendar slot (1..30) the player
 * will claim. Claiming on consecutive UTC days advances the index and grows the
 * streak; missing a day (without an ad catch-up) resets the streak to Day 1.
 * After Day 30 the cycle wraps back to Day 1 (`cyclesCompleted++`).
 *
 * The solve-streak (`User.streak` / `lastStreakDate`) is a SEPARATE thing — that
 * tracks consecutive case solves. This tracks consecutive app opens/claims.
 */

export const CYCLE_LENGTH = 30;
export const MILESTONE_DAYS = [7, 14, 21, 30];

export interface IDailyLoginState extends Document {
  userId: mongoose.Types.ObjectId;
  /** Next slot to claim, 1..30. */
  dayIndex: number;
  currentStreak: number;
  longestStreak: number;
  /** Last claimed UTC day, "YYYY-MM-DD", or null if never claimed. */
  lastClaimDate: string | null;
  cyclesCompleted: number;
  totalClaims: number;
  /** Days skipped over the lifetime (analytics / missed-day frequency). */
  missedDays: number;
  /** How many times the player saved a broken streak via a rewarded ad. */
  catchUpsUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

const dailyLoginStateSchema = new Schema<IDailyLoginState>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    dayIndex: { type: Number, default: 1, min: 1, max: CYCLE_LENGTH },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastClaimDate: { type: String, default: null },
    cyclesCompleted: { type: Number, default: 0 },
    totalClaims: { type: Number, default: 0 },
    missedDays: { type: Number, default: 0 },
    catchUpsUsed: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const DailyLoginState = mongoose.model<IDailyLoginState>(
  "DailyLoginState",
  dailyLoginStateSchema,
);

// ── Reward table ───────────────────────────────────────────────────────────────

export type LoginRewardKind =
  | "coins"
  | "xp"
  | "hints"
  | "seasonXp"
  | "title"
  | "avatar";

export interface LoginReward {
  day: number;
  kind: LoginRewardKind;
  /** Amount for coins / xp / hints / seasonXp. */
  amount?: number;
  /** Cosmetic id for title / avatar (added to inventory). */
  itemId?: string;
  /** Display category (maps to the spec's reward categories). */
  category: string;
  label: string;
  /** Day 7/14/21/30 — exclusive reward. */
  milestone?: boolean;
  /** Extra coins granted alongside a milestone cosmetic. */
  bonusCoins?: number;
  /** Extra Season-Pass XP granted alongside a milestone cosmetic. */
  bonusSeasonXp?: number;
}

/**
 * 30-day balanced progression. Every reward is grounded in a system that exists
 * today (coins, account XP, hints, Season-Pass XP, and inventory cosmetics for
 * milestones) so nothing here is dead data. Categories mirror the design spec;
 * "Evidence Pack" is a flavored hint bundle, milestone cosmetics stand in for
 * fragments/frames/collectibles until those systems ship.
 */
export const LOGIN_REWARDS: LoginReward[] = [
  { day: 1, kind: "coins", amount: 100, category: "Coins", label: "100 Coins" },
  { day: 2, kind: "xp", amount: 150, category: "XP", label: "150 XP" },
  { day: 3, kind: "hints", amount: 1, category: "Hint Tokens", label: "1 Hint" },
  { day: 4, kind: "coins", amount: 150, category: "Coins", label: "150 Coins" },
  { day: 5, kind: "seasonXp", amount: 50, category: "Season XP", label: "50 Season XP" },
  { day: 6, kind: "xp", amount: 250, category: "XP", label: "250 XP" },
  {
    day: 7,
    kind: "title",
    itemId: "title_shadow",
    category: "Title",
    label: "“Shadow Detective” Title",
    milestone: true,
    bonusCoins: 250,
    bonusSeasonXp: 100,
  },
  { day: 8, kind: "coins", amount: 200, category: "Coins", label: "200 Coins" },
  { day: 9, kind: "hints", amount: 1, category: "Hint Tokens", label: "1 Hint" },
  { day: 10, kind: "xp", amount: 300, category: "XP", label: "300 XP" },
  { day: 11, kind: "coins", amount: 250, category: "Coins", label: "250 Coins" },
  { day: 12, kind: "seasonXp", amount: 75, category: "Season XP", label: "75 Season XP" },
  { day: 13, kind: "hints", amount: 2, category: "Evidence Pack", label: "Evidence Pack · 2 Hints" },
  {
    day: 14,
    kind: "avatar",
    itemId: "avatar_masked",
    category: "Avatar",
    label: "“Masked Sleuth” Avatar",
    milestone: true,
    bonusCoins: 400,
    bonusSeasonXp: 150,
  },
  { day: 15, kind: "coins", amount: 300, category: "Coins", label: "300 Coins" },
  { day: 16, kind: "xp", amount: 400, category: "XP", label: "400 XP" },
  { day: 17, kind: "hints", amount: 2, category: "Hint Tokens", label: "2 Hints" },
  { day: 18, kind: "coins", amount: 350, category: "Coins", label: "350 Coins" },
  { day: 19, kind: "seasonXp", amount: 100, category: "Season XP", label: "100 Season XP" },
  { day: 20, kind: "xp", amount: 500, category: "XP", label: "500 XP" },
  {
    day: 21,
    kind: "title",
    itemId: "title_arbiter",
    category: "Title",
    label: "“The Arbiter” Title",
    milestone: true,
    bonusCoins: 600,
    bonusSeasonXp: 200,
  },
  { day: 22, kind: "coins", amount: 400, category: "Coins", label: "400 Coins" },
  { day: 23, kind: "hints", amount: 2, category: "Evidence Pack", label: "Evidence Pack · 2 Hints" },
  { day: 24, kind: "xp", amount: 600, category: "XP", label: "600 XP" },
  { day: 25, kind: "coins", amount: 500, category: "Coins", label: "500 Coins" },
  { day: 26, kind: "seasonXp", amount: 125, category: "Season XP", label: "125 Season XP" },
  { day: 27, kind: "hints", amount: 3, category: "Hint Tokens", label: "3 Hints" },
  { day: 28, kind: "xp", amount: 800, category: "XP", label: "800 XP" },
  { day: 29, kind: "coins", amount: 700, category: "Coins", label: "700 Coins" },
  {
    day: 30,
    kind: "avatar",
    itemId: "avatar_ace",
    category: "Rare Reward",
    label: "“Ace Detective” Avatar",
    milestone: true,
    bonusCoins: 1000,
    bonusSeasonXp: 400,
  },
];

export function rewardForDay(day: number): LoginReward {
  const idx = ((day - 1) % CYCLE_LENGTH + CYCLE_LENGTH) % CYCLE_LENGTH;
  return LOGIN_REWARDS[idx];
}

// ── UTC day helpers (server-authoritative — never trust client clocks) ─────────

export function dayKeyUTC(d = new Date()): string {
  return d.toISOString().split("T")[0];
}

export function daysBetween(a: string, b: string): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86400000);
}

export function addDaysKey(key: string, delta: number): string {
  const t = Date.parse(`${key}T00:00:00Z`) + delta * 86400000;
  return new Date(t).toISOString().split("T")[0];
}

/** After claiming `day`, return the next slot and whether the cycle wrapped. */
export function advanceDay(day: number): { next: number; wrapped: boolean } {
  if (day >= CYCLE_LENGTH) return { next: 1, wrapped: true };
  return { next: day + 1, wrapped: false };
}
