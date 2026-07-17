import { Achievement } from "./achievement.model";
import { UserAchievement } from "./userAchievement.model";
import { User } from "../users/user.model";
import { grantXpAndCoins } from "../../shared/userRewards";
import { sendToTokens } from "../notifications";
import { type LocalizedString, DEFAULT_LANG, resolveLocalized } from "../../shared/localized";
import { logger } from "../../utils/logger";

/**
 * Record a game event and update matching achievements. Auto-unlocks (Xbox/Steam
 * style): when the target is hit, points + reward are granted instantly and a
 * push is sent. Best-effort — callers wrap so an achievement error never breaks
 * the core flow.
 *
 * mode "counter": progress += amount.  mode "value": progress = max(current, amount).
 */
export async function recordAchievementEvent(
  userId: string,
  metric: string,
  amount = 1,
): Promise<void> {
  const defs = await Achievement.find({ active: true, metric });
  if (defs.length === 0) return;

  for (const def of defs) {
    let ua = await UserAchievement.findOne({
      userId,
      achievementKey: def.key,
    });
    if (!ua) {
      ua = await UserAchievement.create({
        userId,
        achievementKey: def.key,
        category: def.category,
        rarity: def.rarity,
        points: def.points,
        progress: 0,
        target: def.target,
      });
    }
    if (ua.unlocked) continue;

    ua.progress =
      def.progressType === "value"
        ? Math.max(ua.progress, amount)
        : Math.min(ua.progress + amount, def.target);

    if (ua.progress >= ua.target) {
      ua.unlocked = true;
      ua.unlockedAt = new Date();
      await ua.save();
      await grantAchievementReward(userId, def);
    } else {
      await ua.save();
    }
  }
}

async function grantAchievementReward(
  userId: string,
  def: {
    key: string;
    name: LocalizedString;
    rewardXp: number;
    rewardCoins: number;
    rewardBadge?: string;
    rewardTitle?: string;
  },
) {
  const items = [def.rewardBadge, def.rewardTitle].filter(
    (x): x is string => !!x,
  );
  if (items.length > 0) {
    await User.findByIdAndUpdate(userId, {
      $addToSet: { inventory: { $each: items } },
    });
  }
  if (def.rewardXp || def.rewardCoins) {
    await grantXpAndCoins(userId, def.rewardXp ?? 0, def.rewardCoins ?? 0);
  }
  logger.info(`Achievement unlocked: ${def.key} by ${userId}`);

  // Best-effort push.
  try {
    const user = await User.findById(userId).select("pushToken");
    if (user?.pushToken) {
      await sendToTokens([user.pushToken], {
        title: "🏆 Achievement unlocked!",
        // Push language is unknown at grant time; fall back to English.
        body: resolveLocalized(def.name, DEFAULT_LANG),
        data: { type: "achievement", key: def.key },
      });
    }
  } catch {
    /* ignore */
  }
}

/** Total Achievement Score = sum of points across unlocked achievements. */
export async function getAchievementScore(userId: string): Promise<number> {
  const agg = await UserAchievement.aggregate([
    { $match: { userId, unlocked: true } },
    { $group: { _id: null, score: { $sum: "$points" } } },
  ]);
  return agg[0]?.score ?? 0;
}

export async function getAchievements(userId: string) {
  const defs = await Achievement.find({ active: true }).sort({
    category: 1,
    order: 1,
  });
  const rows = await UserAchievement.find({ userId });
  const rowMap = new Map(rows.map((r) => [r.achievementKey, r]));

  let score = 0;
  let unlockedCount = 0;
  const achievements = defs
    .map((d) => {
      const row = rowMap.get(d.key);
      const unlocked = row?.unlocked ?? false;
      if (unlocked) {
        score += d.points;
        unlockedCount++;
      }
      // Hidden + still locked → masked entry.
      if (d.hidden && !unlocked) {
        return {
          key: d.key,
          category: d.category,
          rarity: d.rarity,
          points: d.points,
          name: "???",
          description: "Hidden achievement",
          icon: "lock",
          progress: 0,
          target: d.target,
          unlocked: false,
          hidden: true,
        };
      }
      return {
        key: d.key,
        category: d.category,
        rarity: d.rarity,
        points: d.points,
        name: d.name,
        description: d.description,
        icon: d.icon,
        progress: Math.min(row?.progress ?? 0, d.target),
        target: d.target,
        unlocked,
        unlockedAt: row?.unlockedAt ?? null,
        hidden: false,
      };
    });

  return {
    achievementScore: score,
    unlockedCount,
    totalCount: defs.length,
    achievements,
  };
}

export async function getAchievementLeaderboard(limit = 100) {
  const agg = await UserAchievement.aggregate([
    { $match: { unlocked: true } },
    { $group: { _id: "$userId", score: { $sum: "$points" }, count: { $sum: 1 } } },
    { $sort: { score: -1 } },
    { $limit: limit },
  ]);

  const users = await User.find({ _id: { $in: agg.map((a) => a._id) } }).select(
    "username avatar",
  );
  const umap = new Map(users.map((u) => [u.id, u]));

  return agg.map((a, i) => ({
    rank: i + 1,
    userId: a._id,
    username: umap.get(a._id)?.username ?? "Unknown",
    avatar: umap.get(a._id)?.avatar ?? "default",
    achievementScore: a.score,
    unlockedCount: a.count,
  }));
}
