import { User } from "../users/user.model";
import { grantXpAndCoins } from "../../shared/userRewards";
import { awardSeasonXp } from "../pass";
import { sendToTokens } from "../notifications";
import { ValidationError } from "../../shared/errors/AppError";
import { logger } from "../../utils/logger";
import {
  DailyLoginState,
  type IDailyLoginState,
  type LoginReward,
  LOGIN_REWARDS,
  MILESTONE_DAYS,
  CYCLE_LENGTH,
  rewardForDay,
  dayKeyUTC,
  daysBetween,
  addDaysKey,
  advanceDay,
} from "./dailyLogin.model";

// ── State ──────────────────────────────────────────────────────────────────────

async function getOrCreateState(userId: string): Promise<IDailyLoginState> {
  const existing = await DailyLoginState.findOne({ userId });
  if (existing) return existing;
  return DailyLoginState.create({ userId });
}

// ── Status (pure — derives what's claimable today without mutating) ─────────────

interface CatchUp {
  available: boolean;
  missedDate: string | null;
  missedDay: number | null;
}

interface LoginStatus {
  alreadyClaimedToday: boolean;
  /** The day the player would claim right now, or null if nothing to claim. */
  claimableDay: number | null;
  /** True when claiming now would reset the streak to Day 1 (gap >= 2). */
  willReset: boolean;
  /** Whole days skipped since last claim (0 when consecutive / fresh). */
  gap: number;
  catchUp: CatchUp;
}

function computeStatus(state: IDailyLoginState, today: string): LoginStatus {
  const last = state.lastClaimDate;
  const catchUp: CatchUp = { available: false, missedDate: null, missedDay: null };

  if (last === today) {
    return { alreadyClaimedToday: true, claimableDay: null, willReset: false, gap: 0, catchUp };
  }
  if (!last) {
    // First ever login — claim the current slot (default Day 1).
    return { alreadyClaimedToday: false, claimableDay: state.dayIndex, willReset: false, gap: 0, catchUp };
  }

  const gap = daysBetween(last, today);
  if (gap <= 0) {
    // Clock skew / future lastClaimDate — treat as already handled, never double.
    return { alreadyClaimedToday: true, claimableDay: null, willReset: false, gap: 0, catchUp };
  }
  if (gap === 1) {
    return { alreadyClaimedToday: false, claimableDay: state.dayIndex, willReset: false, gap, catchUp };
  }

  // gap >= 2 → at least one day missed. Claiming now restarts at Day 1.
  // Catch-up is offered only for a SINGLE missed day (the safe, non-exploitable
  // window) and restores the pending slot via a rewarded ad.
  if (gap === 2) {
    catchUp.available = true;
    catchUp.missedDate = addDaysKey(today, -1);
    catchUp.missedDay = state.dayIndex;
  }
  return { alreadyClaimedToday: false, claimableDay: 1, willReset: true, gap, catchUp };
}

// ── Reward granting (grounded in existing systems) ──────────────────────────────

async function grantLoginReward(userId: string, r: LoginReward): Promise<void> {
  switch (r.kind) {
    case "coins":
      await grantXpAndCoins(userId, 0, r.amount ?? 0);
      break;
    case "xp":
      await grantXpAndCoins(userId, r.amount ?? 0, 0);
      break;
    case "hints":
      await User.findByIdAndUpdate(userId, { $inc: { hints: r.amount ?? 0 } });
      break;
    case "seasonXp":
      await awardSeasonXp(userId, r.amount ?? 0, `daily_login_${r.day}`);
      break;
    case "title":
    case "avatar":
      if (r.itemId)
        await User.findByIdAndUpdate(userId, { $addToSet: { inventory: r.itemId } });
      break;
  }
  // Milestone cosmetics also carry a coin / season-xp bonus.
  if (r.bonusCoins) await grantXpAndCoins(userId, 0, r.bonusCoins);
  if (r.bonusSeasonXp)
    await awardSeasonXp(userId, r.bonusSeasonXp, `daily_login_milestone_${r.day}`);
}

// ── Reads ────────────────────────────────────────────────────────────────────

function nextMilestoneAfter(day: number): number | null {
  return MILESTONE_DAYS.find((m) => m >= day) ?? null;
}

export async function getCalendar(userId: string) {
  const state = await getOrCreateState(userId);
  const today = dayKeyUTC();
  const status = computeStatus(state, today);

  // Days completed in the CURRENT cycle (for the grid + monthly progress).
  let claimedThrough: number;
  if (status.willReset) claimedThrough = 0;
  else if (status.alreadyClaimedToday) claimedThrough = state.dayIndex - 1;
  else claimedThrough = state.dayIndex - 1;

  const rewards = LOGIN_REWARDS.map((r) => ({
    day: r.day,
    kind: r.kind,
    amount: r.amount ?? null,
    itemId: r.itemId ?? null,
    category: r.category,
    label: r.label,
    milestone: !!r.milestone,
    bonusCoins: r.bonusCoins ?? null,
    bonusSeasonXp: r.bonusSeasonXp ?? null,
    claimed: r.day <= claimedThrough,
    current: status.claimableDay != null && r.day === status.claimableDay,
    upcoming: r.day > claimedThrough && r.day !== status.claimableDay,
  }));

  const referenceDay = status.claimableDay ?? claimedThrough + 1;

  return {
    date: today,
    cycleLength: CYCLE_LENGTH,
    dayIndex: state.dayIndex,
    claimableDay: status.claimableDay,
    canClaim: status.claimableDay != null,
    alreadyClaimedToday: status.alreadyClaimedToday,
    currentStreak: state.currentStreak,
    longestStreak: state.longestStreak,
    streakWillReset: status.willReset,
    catchUp: status.catchUp,
    monthlyProgress: claimedThrough,
    remainingDays: CYCLE_LENGTH - claimedThrough,
    cyclesCompleted: state.cyclesCompleted,
    nextMilestone: nextMilestoneAfter(referenceDay),
    rewards,
  };
}

// ── Claim ───────────────────────────────────────────────────────────────────

export async function claimToday(userId: string) {
  const state = await getOrCreateState(userId);
  const today = dayKeyUTC();
  const status = computeStatus(state, today);

  if (status.claimableDay == null)
    throw new ValidationError("You've already claimed today's reward.");

  let claimedDay: number;
  let wrapped: boolean;

  if (status.willReset) {
    // Missed day(s) without a catch-up → streak resets, start a fresh cycle.
    state.missedDays += status.gap - 1;
    claimedDay = 1;
    state.currentStreak = 1;
    const adv = advanceDay(1);
    state.dayIndex = adv.next;
    wrapped = adv.wrapped;
  } else {
    claimedDay = status.claimableDay;
    state.currentStreak += 1;
    const adv = advanceDay(claimedDay);
    state.dayIndex = adv.next;
    wrapped = adv.wrapped;
  }

  state.lastClaimDate = today;
  state.longestStreak = Math.max(state.longestStreak, state.currentStreak);
  state.totalClaims += 1;
  if (wrapped) state.cyclesCompleted += 1;
  await state.save();

  const reward = rewardForDay(claimedDay);
  await grantLoginReward(userId, reward);

  logger.info(`Daily login claimed: day=${claimedDay} streak=${state.currentStreak} user=${userId}`);

  return {
    claimedDay,
    reward,
    streakReset: status.willReset,
    currentStreak: state.currentStreak,
    longestStreak: state.longestStreak,
    cycleCompleted: wrapped,
  };
}

// ── Streak catch-up (granted ONLY via verified rewarded ad — see ads.service) ──

/**
 * Restore a single missed day: grant the missed slot's reward, keep the streak
 * alive, and rewind `lastClaimDate` to yesterday so today's normal claim is
 * still available. Re-validates eligibility, so an ad watched when it no longer
 * applies is a harmless no-op (the reward simply can't be applied).
 */
export async function applyStreakSave(
  userId: string,
): Promise<{ applied: boolean; missedDay?: number; reward?: LoginReward }> {
  const state = await getOrCreateState(userId);
  const today = dayKeyUTC();
  const status = computeStatus(state, today);

  if (!status.catchUp.available || status.catchUp.missedDay == null) {
    logger.info(`Streak save not applicable for user=${userId} (no single-day gap).`);
    return { applied: false };
  }

  const missedDay = status.catchUp.missedDay;
  const reward = rewardForDay(missedDay);

  await grantLoginReward(userId, reward);

  state.currentStreak += 1;
  state.longestStreak = Math.max(state.longestStreak, state.currentStreak);
  state.totalClaims += 1;
  state.catchUpsUsed += 1;
  const adv = advanceDay(missedDay);
  state.dayIndex = adv.next;
  if (adv.wrapped) state.cyclesCompleted += 1;
  // Rewind to yesterday so the player can still claim TODAY consecutively.
  state.lastClaimDate = addDaysKey(today, -1);
  await state.save();

  logger.info(`Streak saved (catch-up day=${missedDay}) user=${userId}`);
  return { applied: true, missedDay, reward };
}

// ── Analytics ────────────────────────────────────────────────────────────────

export async function getLoginAnalytics() {
  const today = dayKeyUTC();
  const totalPlayers = await DailyLoginState.countDocuments();
  const claimedToday = await DailyLoginState.countDocuments({ lastClaimDate: today });

  const agg = await DailyLoginState.aggregate([
    {
      $group: {
        _id: null,
        avgCurrentStreak: { $avg: "$currentStreak" },
        avgLongestStreak: { $avg: "$longestStreak" },
        totalMissedDays: { $sum: "$missedDays" },
        totalClaims: { $sum: "$totalClaims" },
        totalCycles: { $sum: "$cyclesCompleted" },
        totalCatchUps: { $sum: "$catchUpsUsed" },
      },
    },
  ]);
  const a = agg[0] ?? {};
  const safe = (n: number) => Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;

  return {
    totalPlayers,
    dailyClaimRate: totalPlayers ? safe(claimedToday / totalPlayers) : 0,
    monthlyCompletionRate: totalPlayers ? safe((a.totalCycles ?? 0) / totalPlayers) : 0,
    averageLoginStreak: safe(a.avgCurrentStreak ?? 0),
    averageLongestStreak: safe(a.avgLongestStreak ?? 0),
    missedDayFrequency: totalPlayers ? safe((a.totalMissedDays ?? 0) / totalPlayers) : 0,
    totalClaims: a.totalClaims ?? 0,
    totalCatchUps: a.totalCatchUps ?? 0,
    claimedToday,
  };
}

// ── Notifications ──────────────────────────────────────────────────────────────

async function tokensFor(filter: Record<string, unknown>): Promise<string[]> {
  const states = await DailyLoginState.find(filter).select("userId").lean();
  if (states.length === 0) return [];
  const ids = states.map((s) => s.userId);
  const users = await User.find({ _id: { $in: ids }, pushToken: { $ne: null } })
    .select("pushToken")
    .lean();
  return users.map((u) => u.pushToken as string).filter(Boolean);
}

/** "Your daily reward is ready" — players who haven't claimed today. */
export async function notifyRewardAvailable(): Promise<void> {
  const today = dayKeyUTC();
  const tokens = await tokensFor({ lastClaimDate: { $ne: today } });
  if (tokens.length === 0) return;
  await sendToTokens(tokens, {
    title: "🎁 Your daily reward is ready",
    body: "Open Detective Club and claim today's login reward.",
    data: { screen: "DailyLogin" },
  });
  logger.info(`notifyRewardAvailable: pushed to ${tokens.length} players.`);
}

/** "Your streak is at risk" — players with a live streak who haven't claimed. */
export async function notifyStreakRisk(): Promise<void> {
  const today = dayKeyUTC();
  const tokens = await tokensFor({
    lastClaimDate: { $ne: today },
    currentStreak: { $gte: 1 },
  });
  if (tokens.length === 0) return;
  await sendToTokens(tokens, {
    title: "🔥 Don't lose your streak!",
    body: "Claim today's reward before midnight to keep your login streak alive.",
    data: { screen: "DailyLogin" },
  });
  logger.info(`notifyStreakRisk: pushed to ${tokens.length} players.`);
}
