import { Event, type IEvent } from "./event.model";
import { EventParticipation, type ScoreBreakdown } from "./eventParticipation.model";
import { Case } from "../cases/case.model";
import { Investigation } from "../investigations/investigation.model";
import { User } from "../users/user.model";
import { startInvestigation } from "../investigations/investigations.service";
import { grantXpAndCoins } from "../../shared/userRewards";
import { awardSeasonXp } from "../pass";
import { recordChallengeEvent } from "../challenges";
import { recordAchievementEvent } from "../achievements";
import { addAgencyContribution } from "../agencies";
import { sendToTokens } from "../notifications";
import { NotFoundError, ValidationError } from "../../shared/errors/AppError";
import { logger } from "../../utils/logger";

// ── Reads ────────────────────────────────────────────────────────────────────

/** Events players should see: upcoming, active, and recently completed. */
export async function listEvents() {
  return Event.find({ status: { $ne: "archived" } })
    .sort({ startDate: -1 })
    .limit(20);
}

export async function getEvent(eventId: string) {
  const event = await Event.findById(eventId);
  if (!event) throw new NotFoundError("Event");
  return event;
}

// ── Participation ────────────────────────────────────────────────────────────

/**
 * Enroll the user in an active event. Creates the participation record (the
 * completion clock starts here) and a normal Investigation on the mega case so
 * the existing evidence/suspect/hint flow works. Returns the case WITHOUT the
 * solution.
 */
export async function participate(userId: string, eventId: string) {
  const event = await Event.findById(eventId);
  if (!event) throw new NotFoundError("Event");
  if (event.status !== "active")
    throw new ValidationError("This event is not currently active.");

  const case_ = await Case.findById(event.caseId).select("-solution");
  if (!case_) throw new NotFoundError("Case");

  let participation = await EventParticipation.findOne({ userId, eventId });
  if (participation?.status === "completed") {
    throw new ValidationError("You have already submitted this event.");
  }
  if (!participation) {
    participation = await EventParticipation.create({
      userId,
      eventId,
      caseId: event.caseId,
      startedAt: new Date(),
      status: "in_progress",
    });
  }

  // Reuse the normal investigation for exploration + hints on the mega case.
  await startInvestigation(userId, event.caseId);

  return { participation, case: case_ };
}

// ── Submission + scoring ─────────────────────────────────────────────────────

const norm = (s?: string) => (s ?? "").trim().toLowerCase();

export interface EventAccusation {
  suspectId: string;
  motive: string;
  weapon: string;
  timelineEventId: string;
}

/**
 * Score and finalize an event submission. All scoring is server-side from the
 * stored solution + server-measured completion time; the client never sends a
 * score. One submission per user per event (enforced here + by a unique index).
 *
 * Scoring: suspect +500, motive +200, weapon +200, timeline +100,
 * no-hints +200, speed +0..500. Final placement rewards are granted later, when
 * the event ends (see distributeRewards).
 */
export async function submitEvent(
  userId: string,
  eventId: string,
  accusation: EventAccusation,
) {
  const event = await Event.findById(eventId);
  if (!event) throw new NotFoundError("Event");
  if (event.status !== "active")
    throw new ValidationError("This event is not open for submissions.");

  const participation = await EventParticipation.findOne({ userId, eventId });
  if (!participation)
    throw new ValidationError("Start the event before submitting.");
  if (participation.status === "completed")
    throw new ValidationError("You have already submitted this event.");

  const case_ = await Case.findById(event.caseId);
  if (!case_) throw new NotFoundError("Case");
  const sol = case_.solution;

  const inv = await Investigation.findOne({ userId, caseId: event.caseId });
  const hintsUsed = inv?.hintsUsed ?? 0;
  const adHelpsUsed = inv?.adHelpsUsed ?? 0;
  // "Assist" = any hint OR any rewarded-ad help (eliminate suspect / expose
  // clue). Both forfeit the no-assist bonus so the leaderboard stays fair.
  const usedAnyAssist = hintsUsed > 0 || adHelpsUsed > 0;

  const completedAt = new Date();
  const completionTimeSec = Math.max(
    0,
    Math.floor((completedAt.getTime() - participation.startedAt.getTime()) / 1000),
  );

  const suspectOk = accusation.suspectId === sol.suspectId;
  const motiveOk = norm(accusation.motive) === norm(sol.motive);
  const weaponOk = !!sol.weapon && norm(accusation.weapon) === norm(sol.weapon);
  const timelineOk = accusation.timelineEventId === sol.timelineEventId;

  const target = event.targetCompletionSec || 1800;
  const speedFrac = Math.max(0, Math.min(1, (target - completionTimeSec) / target));

  const scoreBreakdown: ScoreBreakdown = {
    suspect: suspectOk ? 500 : 0,
    motive: motiveOk ? 200 : 0,
    weapon: weaponOk ? 200 : 0,
    timeline: timelineOk ? 100 : 0,
    noAssists: usedAnyAssist ? 0 : 200,
    speed: Math.round(500 * speedFrac),
  };
  const score = Object.values(scoreBreakdown).reduce((a, b) => a + b, 0);
  const correctCount = [suspectOk, motiveOk, weaponOk, timelineOk].filter(
    Boolean,
  ).length;
  const accuracy = Math.round((correctCount / 4) * 100);

  participation.accusation = accusation;
  participation.scoreBreakdown = scoreBreakdown;
  participation.score = score;
  participation.hintsUsed = hintsUsed;
  participation.accuracy = accuracy;
  participation.completedAt = completedAt;
  participation.completionTimeSec = completionTimeSec;
  participation.status = "completed";
  await participation.save();

  // Secondary progression (awaited, concurrent, never throws).
  await Promise.allSettled([
    awardSeasonXp(userId, 250, "mega_case"),
    recordChallengeEvent(userId, "mega_completed", 1),
    recordChallengeEvent(userId, "case_solved", 1),
    recordAchievementEvent(userId, "mega_completed", 1),
    recordAchievementEvent(userId, "case_solved", 1),
    addAgencyContribution(userId, 100, "mega"),
  ]);

  return {
    score,
    scoreBreakdown,
    accuracy,
    completionTimeSec,
    isCorrect: suspectOk,
    solution: sol,
  };
}

// ── Leaderboards ─────────────────────────────────────────────────────────────

export async function getEventLeaderboard(eventId: string, limit = 100) {
  const parts = await EventParticipation.find({ eventId, status: "completed" })
    .sort({ score: -1, completionTimeSec: 1, completedAt: 1 })
    .limit(limit);

  const users = await User.find({
    _id: { $in: parts.map((p) => p.userId) },
  }).select("username avatar");
  const umap = new Map(users.map((u) => [u.id, u]));

  return parts.map((p, i) => ({
    rank: i + 1,
    userId: p.userId,
    username: umap.get(p.userId)?.username ?? "Unknown",
    avatar: umap.get(p.userId)?.avatar ?? "default",
    score: p.score,
    completionTimeSec: p.completionTimeSec,
  }));
}

/** Cross-event "global" board: total event score per user, all-time. */
export async function getGlobalEventLeaderboard(limit = 100) {
  const agg = await EventParticipation.aggregate([
    { $match: { status: "completed" } },
    {
      $group: {
        _id: "$userId",
        totalScore: { $sum: "$score" },
        eventsPlayed: { $sum: 1 },
      },
    },
    { $sort: { totalScore: -1 } },
    { $limit: limit },
  ]);

  const users = await User.find({
    _id: { $in: agg.map((a) => a._id) },
  }).select("username avatar");
  const umap = new Map(users.map((u) => [u.id, u]));

  return agg.map((a, i) => ({
    rank: i + 1,
    userId: a._id,
    username: umap.get(a._id)?.username ?? "Unknown",
    avatar: umap.get(a._id)?.avatar ?? "default",
    score: a.totalScore,
    eventsPlayed: a.eventsPlayed,
  }));
}

export async function getMyParticipation(userId: string, eventId: string) {
  const p = await EventParticipation.findOne({ userId, eventId });
  if (!p) return null;
  let rank: number | null = p.rank ?? null;
  if (rank === null && p.status === "completed") {
    // Live rank estimate before final distribution.
    const ahead = await EventParticipation.countDocuments({
      eventId,
      status: "completed",
      score: { $gt: p.score },
    });
    rank = ahead + 1;
  }
  return { participation: p, rank };
}

// ── Rewards (granted once, when the event ends) ──────────────────────────────

async function applyReward(
  userId: string,
  r: { title?: string; badge?: string; xp?: number; coins?: number },
) {
  const items = [r.title, r.badge].filter((x): x is string => !!x);
  if (items.length > 0) {
    await User.findByIdAndUpdate(userId, {
      $addToSet: { inventory: { $each: items } },
    });
  }
  if (r.xp || r.coins) {
    await grantXpAndCoins(userId, r.xp ?? 0, r.coins ?? 0);
  }
}

/**
 * Rank all completed submissions and grant each participant their single best
 * reward tier. Idempotent via `event.rewardsDistributed`.
 */
export async function distributeRewards(eventId: string) {
  const event = await Event.findById(eventId);
  if (!event) return;
  if (event.rewardsDistributed) return;
  if (!event.leaderboardEnabled) {
    event.rewardsDistributed = true;
    await event.save();
    return;
  }

  const parts = await EventParticipation.find({
    eventId,
    status: "completed",
  }).sort({ score: -1, completionTimeSec: 1, completedAt: 1 });

  const rc = event.rewardConfig;

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const rank = i + 1;
    p.rank = rank;

    let tier: string;
    if (rank === 1) {
      tier = "top1";
      await applyReward(p.userId, rc.top1 ?? {});
    } else if (rank <= 10) {
      tier = "top10";
      await applyReward(p.userId, rc.top10 ?? {});
    } else if (rank <= 100) {
      tier = "top100";
      await applyReward(p.userId, rc.top100 ?? {});
    } else {
      tier = "participation";
      await applyReward(p.userId, rc.participation ?? {});
    }
    p.rewardTier = tier;
    await p.save();
  }

  event.rewardsDistributed = true;
  await event.save();
  logger.info(`Event ${eventId}: rewards distributed to ${parts.length} players.`);
}

// ── Lifecycle + notifications ────────────────────────────────────────────────

const NOTIF_COPY: Record<
  string,
  (e: IEvent) => { title: string; body: string }
> = {
  soon: (e) => ({
    title: "🎟️ Mega Case starts soon!",
    body: `"${e.title}" begins in under an hour. Get ready, detective.`,
  }),
  live: (e) => ({
    title: "🚨 Mega Case is LIVE",
    body: `"${e.title}" is open — solve it and climb the event leaderboard!`,
  }),
  "24h": (e) => ({
    title: "⏳ 24 hours left",
    body: `"${e.title}" ends tomorrow. Don't miss your shot at the rewards.`,
  }),
  last: (e) => ({
    title: "⌛ Last chance!",
    body: `"${e.title}" ends in a few hours — submit before it's too late.`,
  }),
  ended: (e) => ({
    title: "🏁 Mega Case finished",
    body: `"${e.title}" has ended. Check the leaderboard and your rewards!`,
  }),
};

async function tokensForAllUsers(): Promise<string[]> {
  const users = await User.find({ pushToken: { $ne: null } }).select("pushToken");
  return users.map((u) => u.pushToken).filter((t): t is string => !!t);
}

async function tokensForActiveParticipants(eventId: string): Promise<string[]> {
  const parts = await EventParticipation.find({
    eventId,
    status: "in_progress",
  }).select("userId");
  const users = await User.find({
    _id: { $in: parts.map((p) => p.userId) },
    pushToken: { $ne: null },
  }).select("pushToken");
  return users.map((u) => u.pushToken).filter((t): t is string => !!t);
}

/** Send a lifecycle notification once (deduped via event.notificationsSent). */
async function notifyEvent(event: IEvent, tag: keyof typeof NOTIF_COPY) {
  if (event.notificationsSent.includes(tag)) return;

  const copy = NOTIF_COPY[tag](event);
  const tokens =
    tag === "24h" || tag === "last"
      ? await tokensForActiveParticipants(event.id)
      : await tokensForAllUsers();

  await sendToTokens(tokens, {
    title: copy.title,
    body: copy.body,
    data: { type: "event", eventId: event.id, phase: tag },
  });

  event.notificationsSent.push(tag);
  await event.save();
}

/**
 * Advance event statuses and fire lifecycle notifications. Safe to run on a
 * short interval — all transitions and notifications are deduped.
 */
export async function processEventLifecycle() {
  const now = new Date();
  const HOUR = 3600 * 1000;

  // upcoming → active
  const toActivate = await Event.find({
    status: "upcoming",
    startDate: { $lte: now },
  });
  for (const e of toActivate) {
    e.status = "active";
    await e.save();
    await notifyEvent(e, "live");
  }

  // "starting soon" (within 1h, still upcoming)
  const soon = await Event.find({
    status: "upcoming",
    startDate: { $gt: now, $lte: new Date(now.getTime() + HOUR) },
  });
  for (const e of soon) await notifyEvent(e, "soon");

  // active → completed (and distribute rewards)
  const toComplete = await Event.find({
    status: "active",
    endDate: { $lte: now },
  });
  for (const e of toComplete) {
    e.status = "completed";
    await e.save();
    await distributeRewards(e.id);
    // re-fetch so notificationsSent reflects distribute's save
    const fresh = await Event.findById(e.id);
    if (fresh) await notifyEvent(fresh, "ended");
  }

  // reminders for still-active events
  const active = await Event.find({ status: "active" });
  for (const e of active) {
    const msLeft = e.endDate.getTime() - now.getTime();
    if (msLeft <= 24 * HOUR) await notifyEvent(e, "24h");
    if (msLeft <= 3 * HOUR) await notifyEvent(e, "last");
  }
}
