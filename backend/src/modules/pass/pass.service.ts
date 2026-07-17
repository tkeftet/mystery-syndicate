import { SeasonPass, type ISeasonPass, type PassReward } from "./seasonPass.model";
import { PassProgress } from "./passProgress.model";
import { User } from "../users/user.model";
import { Friendship } from "../friends/friendship.model";
import { grantXpAndCoins } from "../investigations/investigations.service";
import { sendToTokens } from "../notifications";
import { NotFoundError, ValidationError } from "../../shared/errors/AppError";
import { DEFAULT_LANG, resolveLocalized } from "../../shared/localized";
import { logger } from "../../utils/logger";

const DAY_MS = 86400000;

function levelForXp(pass: ISeasonPass, seasonXp: number): number {
  return Math.min(Math.floor(seasonXp / pass.xpPerLevel), pass.totalLevels);
}

export async function getActivePass(): Promise<ISeasonPass | null> {
  return SeasonPass.findOne({ status: "active" });
}

async function getOrCreateProgress(userId: string, passId: string) {
  let p = await PassProgress.findOne({ userId, passId });
  if (!p) p = await PassProgress.create({ userId, passId });
  return p;
}

/**
 * Award Season XP from any game activity. No-ops (returns null) when no pass is
 * active. Callers MUST wrap this so a pass error never breaks the core flow.
 */
export async function awardSeasonXp(
  userId: string,
  amount: number,
  source: string,
): Promise<{ seasonXp: number; level: number; leveledUp: boolean } | null> {
  if (amount <= 0) return null;
  const pass = await getActivePass();
  if (!pass) return null;

  const progress = await getOrCreateProgress(userId, pass.id);
  const before = progress.level;
  progress.seasonXp += amount;
  progress.level = levelForXp(pass, progress.seasonXp);
  await progress.save();

  logger.info(`SeasonXP +${amount} (${source}) user=${userId}`);
  return {
    seasonXp: progress.seasonXp,
    level: progress.level,
    leveledUp: progress.level > before,
  };
}

// ── Reads ────────────────────────────────────────────────────────────────────

export async function getHub(userId: string) {
  const pass = await getActivePass();
  if (!pass) return { pass: null };

  const progress = await getOrCreateProgress(userId, pass.id);
  const freeRewards = pass.rewards.filter((r) => r.track === "free");
  const unclaimed = freeRewards.filter(
    (r) => r.level <= progress.level && !progress.claimedLevels.includes(r.level),
  ).length;

  const xpIntoLevel = progress.seasonXp % pass.xpPerLevel;
  const msLeft = pass.endDate.getTime() - Date.now();

  return {
    pass: {
      id: pass.id,
      title: pass.title,
      subtitle: pass.subtitle,
      seasonTheme: pass.seasonTheme,
      bannerImage: pass.bannerImage,
      totalLevels: pass.totalLevels,
      xpPerLevel: pass.xpPerLevel,
      endDate: pass.endDate,
      premiumEnabled: pass.premiumEnabled,
    },
    progress: {
      seasonXp: progress.seasonXp,
      level: progress.level,
      xpIntoLevel,
      xpForNext: pass.xpPerLevel,
      percentToNext: Math.round((xpIntoLevel / pass.xpPerLevel) * 100),
      isPremium: progress.isPremium,
    },
    unclaimedCount: unclaimed,
    daysLeft: Math.max(0, Math.ceil(msLeft / DAY_MS)),
  };
}

export async function getRewards(userId: string) {
  const pass = await getActivePass();
  if (!pass) return { pass: null, rewards: [] };

  const progress = await getOrCreateProgress(userId, pass.id);
  const rewards = [...pass.rewards]
    .sort((a, b) => a.level - b.level)
    .map((r) => {
      const claimed = progress.claimedLevels.includes(r.level);
      const unlocked = progress.level >= r.level;
      const locked = r.track === "premium" && !progress.isPremium;
      return {
        ...(typeof (r as any).toObject === "function"
          ? (r as any).toObject()
          : r),
        status: claimed
          ? "claimed"
          : locked
            ? "premium_locked"
            : unlocked
              ? "claimable"
              : "locked",
      };
    });

  return {
    pass: { id: pass.id, title: pass.title, totalLevels: pass.totalLevels },
    progress: { level: progress.level, isPremium: progress.isPremium },
    rewards,
  };
}

// ── Claiming ─────────────────────────────────────────────────────────────────

async function applyReward(userId: string, r: PassReward) {
  const items = [r.badge, r.title, r.avatar].filter((x): x is string => !!x);
  if (items.length > 0) {
    await User.findByIdAndUpdate(userId, {
      $addToSet: { inventory: { $each: items } },
    });
  }
  if (r.xp || r.coins) {
    await grantXpAndCoins(userId, r.xp ?? 0, r.coins ?? 0);
  }
}

export async function claimLevel(userId: string, level: number) {
  const pass = await getActivePass();
  if (!pass) throw new NotFoundError("Season pass");

  const progress = await getOrCreateProgress(userId, pass.id);
  if (progress.level < level)
    throw new ValidationError(`Reach level ${level} to claim this reward.`);
  if (progress.claimedLevels.includes(level))
    throw new ValidationError("Reward already claimed.");

  const reward = pass.rewards.find((r) => r.level === level && r.track === "free");
  if (!reward) throw new NotFoundError("Reward");

  await applyReward(userId, reward);
  progress.claimedLevels.push(level);
  await progress.save();
  return { claimed: [level], reward };
}

export async function claimAll(userId: string) {
  const pass = await getActivePass();
  if (!pass) throw new NotFoundError("Season pass");

  const progress = await getOrCreateProgress(userId, pass.id);
  const toClaim = pass.rewards.filter(
    (r) =>
      r.track === "free" &&
      r.level <= progress.level &&
      !progress.claimedLevels.includes(r.level),
  );

  for (const reward of toClaim) {
    await applyReward(userId, reward);
    progress.claimedLevels.push(reward.level);
  }
  await progress.save();
  return { claimed: toClaim.map((r) => r.level), count: toClaim.length };
}

// ── Leaderboard ──────────────────────────────────────────────────────────────

export async function getLeaderboard(
  userId: string,
  scope: "global" | "friends" = "global",
  limit = 100,
) {
  const pass = await getActivePass();
  if (!pass) return [];

  const filter: Record<string, unknown> = { passId: pass.id };

  if (scope === "friends") {
    const rows = await Friendship.find({
      status: "accepted",
      $or: [{ requesterId: userId }, { receiverId: userId }],
    });
    const friendIds = rows.map((r) =>
      r.requesterId === userId ? r.receiverId : r.requesterId,
    );
    friendIds.push(userId); // include self
    filter.userId = { $in: friendIds };
  }

  const progresses = await PassProgress.find(filter)
    .sort({ seasonXp: -1 })
    .limit(limit);

  const users = await User.find({
    _id: { $in: progresses.map((p) => p.userId) },
  }).select("username avatar");
  const umap = new Map(users.map((u) => [u.id, u]));

  return progresses.map((p, i) => ({
    rank: i + 1,
    userId: p.userId,
    username: umap.get(p.userId)?.username ?? "Unknown",
    avatar: umap.get(p.userId)?.avatar ?? "default",
    seasonXp: p.seasonXp,
    level: p.level,
  }));
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

async function tokensForAllUsers(): Promise<string[]> {
  const users = await User.find({ pushToken: { $ne: null } }).select("pushToken");
  return users.map((u) => u.pushToken).filter((t): t is string => !!t);
}

async function notifyOnce(
  pass: ISeasonPass,
  tag: string,
  title: string,
  body: string,
) {
  if (pass.notificationsSent.includes(tag)) return;
  await sendToTokens(await tokensForAllUsers(), {
    title,
    body,
    data: { type: "pass", passId: pass.id, tag },
  });
  pass.notificationsSent.push(tag);
  await pass.save();
}

export async function processPassLifecycle() {
  const now = new Date();

  // Pass title is localized ({en,fr,ar}); pushes go out in English (the push
  // language is unknown per recipient at broadcast time).
  const titleOf = (p: { title: unknown }) =>
    resolveLocalized(p.title as any, DEFAULT_LANG);

  const toActivate = await SeasonPass.find({
    status: "upcoming",
    startDate: { $lte: now },
  });
  for (const p of toActivate) {
    p.status = "active";
    await p.save();
    await notifyOnce(
      p,
      "started",
      "🎟️ New season has begun!",
      `"${titleOf(p)}" is live — earn Season XP and climb the reward track.`,
    );
  }

  const toComplete = await SeasonPass.find({
    status: "active",
    endDate: { $lte: now },
  });
  for (const p of toComplete) {
    p.status = "completed";
    await p.save();
    await notifyOnce(
      p,
      "ended",
      "🏁 Season complete",
      `"${titleOf(p)}" has ended. Check your final rank and rewards.`,
    );
  }

  const active = await SeasonPass.find({ status: "active" });
  for (const p of active) {
    const msLeft = p.endDate.getTime() - now.getTime();
    if (msLeft <= 7 * DAY_MS)
      await notifyOnce(
        p,
        "final_week",
        "⏳ Final week!",
        `One week left in "${titleOf(p)}" — finish your reward track.`,
      );
    if (msLeft <= DAY_MS)
      await notifyOnce(
        p,
        "last_day",
        "🚨 Last day!",
        `"${titleOf(p)}" ends today. Claim your rewards before it's gone.`,
      );
  }
}
