import { Challenge, type ChallengePeriod } from "./challenge.model";
import { ChallengeProgress } from "./challengeProgress.model";
import { awardSeasonXp } from "../pass";
import { grantXpAndCoins } from "../../shared/userRewards";
import { NotFoundError, ValidationError } from "../../shared/errors/AppError";
import { logger } from "../../utils/logger";

// ── Period keys ──────────────────────────────────────────────────────────────

function dayKey(d = new Date()): string {
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}
function monthKey(d = new Date()): string {
  return d.toISOString().slice(0, 7); // YYYY-MM
}
function weekKey(d = new Date()): string {
  // ISO week (UTC).
  const date = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((date.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function periodKeyFor(period: ChallengePeriod): string {
  if (period === "daily") return dayKey();
  if (period === "weekly") return weekKey();
  return monthKey();
}

// ── Progress tracking ────────────────────────────────────────────────────────

/**
 * Increment progress on every active challenge listening to `metric`, for the
 * current period. Counter-based; completing does NOT auto-grant — the player
 * claims the reward. Best-effort: callers wrap so a challenge error never breaks
 * the core flow.
 */
export async function recordChallengeEvent(
  userId: string,
  metric: string,
  amount = 1,
): Promise<void> {
  if (amount <= 0) return;
  const defs = await Challenge.find({ active: true, metric });
  if (defs.length === 0) return;

  for (const def of defs) {
    const periodKey = periodKeyFor(def.period);
    const existing = await ChallengeProgress.findOne({
      userId,
      challengeKey: def.key,
      periodKey,
    });

    if (!existing) {
      const progress = Math.min(amount, def.target);
      await ChallengeProgress.create({
        userId,
        challengeKey: def.key,
        period: def.period,
        periodKey,
        progress,
        target: def.target,
        completed: progress >= def.target,
        rewardSeasonXp: def.rewardSeasonXp,
        rewardCoins: def.rewardCoins,
      });
      continue;
    }
    if (existing.completed) continue;
    existing.progress = Math.min(existing.progress + amount, def.target);
    if (existing.progress >= existing.target) existing.completed = true;
    await existing.save();
  }
}

// ── Reads ────────────────────────────────────────────────────────────────────

export async function getChallenges(userId: string) {
  const defs = await Challenge.find({ active: true }).sort({
    period: 1,
    order: 1,
  });

  // Fetch this period's progress rows for the user in one query per needed key.
  const keys = Array.from(new Set(defs.map((d) => periodKeyFor(d.period))));
  const rows = await ChallengeProgress.find({
    userId,
    periodKey: { $in: keys },
  });
  const rowMap = new Map(rows.map((r) => [`${r.challengeKey}:${r.periodKey}`, r]));

  return defs.map((d) => {
    const periodKey = periodKeyFor(d.period);
    const row = rowMap.get(`${d.key}:${periodKey}`);
    return {
      key: d.key,
      period: d.period,
      title: d.title,
      description: d.description,
      target: d.target,
      rewardSeasonXp: d.rewardSeasonXp,
      rewardCoins: d.rewardCoins,
      progress: row?.progress ?? 0,
      completed: row?.completed ?? false,
      claimed: row?.claimed ?? false,
    };
  });
}

// ── Claiming ─────────────────────────────────────────────────────────────────

export async function claimChallenge(userId: string, challengeKey: string) {
  const def = await Challenge.findOne({ key: challengeKey, active: true });
  if (!def) throw new NotFoundError("Challenge");

  const periodKey = periodKeyFor(def.period);
  const row = await ChallengeProgress.findOne({
    userId,
    challengeKey,
    periodKey,
  });
  if (!row || !row.completed)
    throw new ValidationError("Challenge not completed yet.");
  if (row.claimed) throw new ValidationError("Reward already claimed.");

  row.claimed = true;
  await row.save();

  await awardSeasonXp(userId, def.rewardSeasonXp, `challenge_${def.key}`);
  if (def.rewardCoins) await grantXpAndCoins(userId, 0, def.rewardCoins);

  logger.info(`Challenge claimed: ${challengeKey} by ${userId}`);
  return {
    claimed: [challengeKey],
    rewardSeasonXp: def.rewardSeasonXp,
    rewardCoins: def.rewardCoins,
  };
}

export async function claimAllChallenges(userId: string) {
  const challenges = await getChallenges(userId);
  const claimable = challenges.filter((c) => c.completed && !c.claimed);

  let seasonXp = 0;
  let coins = 0;
  const claimed: string[] = [];
  for (const c of claimable) {
    try {
      const res = await claimChallenge(userId, c.key);
      seasonXp += res.rewardSeasonXp;
      coins += res.rewardCoins;
      claimed.push(c.key);
    } catch {
      // skip any that raced to claimed
    }
  }
  return { claimed, count: claimed.length, rewardSeasonXp: seasonXp, rewardCoins: coins };
}
