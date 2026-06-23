/**
 * Progressive level curve (keep in sync with the backend copy at
 * backend/src/shared/leveling.ts).
 *
 * Cost to advance from level n -> n+1 is `3000 + (n-1) * 2000`:
 *   L1->2 = 3000, L2->3 = 5000, L3->4 = 7000, ...
 * Denominated in thousands to match thousand-scale XP income (case scores are
 * 1000-3000, XP gained = full score), so an average case is ~half a level rather
 * than skipping several. Early levels are still cheaper than later ones (depth).
 * Closed forms:
 *   totalXpForLevel(L) = 1000 * (L^2 - 1)   // cumulative XP to REACH level L
 *   levelForXp(xp)     = floor(sqrt(xp / 1000 + 1))
 */

export function levelForXp(xp: number): number {
  if (xp <= 0) return 1;
  return Math.floor(Math.sqrt(xp / 1000 + 1));
}

/** Cumulative XP required to reach the start of `level`. */
export function totalXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return 1000 * (level * level - 1);
}

/** XP accumulated within the current level. */
export function xpIntoLevel(xp: number, level = levelForXp(xp)): number {
  return Math.max(0, xp - totalXpForLevel(level));
}

/** Total XP needed to clear the current level (level -> level + 1). */
export function xpForLevelSpan(level: number): number {
  return totalXpForLevel(level + 1) - totalXpForLevel(level);
}
