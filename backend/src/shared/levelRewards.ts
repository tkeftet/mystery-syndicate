/**
 * Per-level-up rewards. Granted in investigations.service when a solve pushes the
 * player past one or more level thresholds. Designed to make leveling feel worth
 * it: every level pays scaling coins (level * 100), and every 5th level is a
 * milestone jackpot — coins doubled + a free hint.
 *
 *   L2  -> 200          L5  -> 1000 + 1 hint   (milestone)
 *   L3  -> 300          L10 -> 2000 + 1 hint   (milestone)
 *   L4  -> 400          ...
 *
 * The loop sums rewards for every level crossed, so it stays correct even if a
 * future change lets a single gain span multiple levels.
 */

export const MILESTONE_EVERY = 5;
const COINS_PER_LEVEL = 100;

export interface LevelUpReward {
  oldLevel: number;
  newLevel: number;
  coins: number;
  hints: number;
  /** Milestone levels reached in this jump (e.g. [5]). */
  milestones: number[];
}

export function levelUpRewards(
  oldLevel: number,
  newLevel: number,
): LevelUpReward {
  let coins = 0;
  let hints = 0;
  const milestones: number[] = [];

  for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
    coins += lvl * COINS_PER_LEVEL;
    if (lvl % MILESTONE_EVERY === 0) {
      coins += lvl * COINS_PER_LEVEL; // milestone doubles the coin reward
      hints += 1;
      milestones.push(lvl);
    }
  }

  return { oldLevel, newLevel, coins, hints, milestones };
}
