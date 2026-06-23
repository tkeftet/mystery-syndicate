import { User } from "../modules/users/user.model";
import { levelForXp } from "./leveling";
import { levelUpRewards, type LevelUpReward } from "./levelRewards";

/**
 * Increment a user's account XP + coins, then recompute their level and grant the
 * per-level reward (scaling coins + milestone hints) for any levels gained.
 * Shared by accusation scoring, the rewarded-ad "double reward", season/event/
 * chapter rewards, and season-pass reward claims.
 */
export async function grantXpAndCoins(
  userId: string,
  xpGain: number,
  coinGain: number,
): Promise<LevelUpReward | null> {
  const userBefore = await User.findById(userId);
  const levelBefore = userBefore?.level ?? 1;

  await User.findByIdAndUpdate(userId, {
    $inc: { xp: xpGain, coins: coinGain },
  });

  const userAfter = await User.findById(userId);
  const newLevel = levelForXp(userAfter?.xp ?? 0);
  if (newLevel === levelBefore) return null;

  const update: any = { $set: { level: newLevel } };
  let levelUpReward: LevelUpReward | null = null;
  if (newLevel > levelBefore) {
    const reward = levelUpRewards(levelBefore, newLevel);
    if (reward.coins || reward.hints) {
      update.$inc = {};
      if (reward.coins) update.$inc.coins = reward.coins;
      if (reward.hints) update.$inc.hints = reward.hints;
    }
    levelUpReward = reward;
  }
  await User.findByIdAndUpdate(userId, update);
  return levelUpReward;
}
