/**
 * Seed achievement definitions. Run:  yarn seed:achievements
 *
 * A representative set across categories (not the full 200 — extend this array
 * or manage via the future admin). Upserts by `key`, so it's safe to re-run.
 * Points are derived from rarity (RARITY_POINTS).
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database";
import {
  Achievement,
  RARITY_POINTS,
  type AchievementRarity,
} from "../modules/achievements/achievement.model";
import { logger } from "../utils/logger";

type Def = {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: AchievementRarity;
  metric: string;
  progressType: "counter" | "value";
  target: number;
  rewardXp?: number;
  rewardCoins?: number;
  rewardTitle?: string;
  rewardBadge?: string;
  order: number;
};

const DEFS: Def[] = [
  // ── Cases (case_solved, counter) ──
  { key: "cases_1", name: "First Case", description: "Solve your first case.", icon: "search", category: "cases", rarity: "common", metric: "case_solved", progressType: "counter", target: 1, order: 1 },
  { key: "cases_10", name: "Getting Started", description: "Solve 10 cases.", icon: "search", category: "cases", rarity: "common", metric: "case_solved", progressType: "counter", target: 10, order: 2 },
  { key: "cases_100", name: "Crime Solver", description: "Solve 100 cases.", icon: "search", category: "cases", rarity: "rare", metric: "case_solved", progressType: "counter", target: 100, rewardCoins: 500, order: 3 },
  { key: "cases_1000", name: "Master Detective", description: "Solve 1000 cases.", icon: "search", category: "cases", rarity: "legendary", metric: "case_solved", progressType: "counter", target: 1000, rewardCoins: 5000, rewardTitle: "ach_title_master_detective", order: 4 },

  // ── Accuracy (perfect_case, counter) ──
  { key: "perfect_5", name: "Flawless Five", description: "Solve 5 perfect cases.", icon: "target", category: "accuracy", rarity: "rare", metric: "perfect_case", progressType: "counter", target: 5, order: 1 },
  { key: "perfect_25", name: "Precision Detective", description: "Solve 25 perfect cases.", icon: "target", category: "accuracy", rarity: "epic", metric: "perfect_case", progressType: "counter", target: 25, rewardCoins: 1000, order: 2 },
  { key: "perfect_100", name: "Perfect Investigator", description: "Solve 100 perfect cases.", icon: "target", category: "accuracy", rarity: "legendary", metric: "perfect_case", progressType: "counter", target: 100, rewardTitle: "ach_title_perfect_investigator", order: 3 },

  // ── Streaks (streak_day, value) ──
  { key: "streak_3", name: "Warming Up", description: "Reach a 3-day streak.", icon: "streak", category: "streaks", rarity: "common", metric: "streak_day", progressType: "value", target: 3, order: 1 },
  { key: "streak_7", name: "Week Detective", description: "Reach a 7-day streak.", icon: "streak", category: "streaks", rarity: "common", metric: "streak_day", progressType: "value", target: 7, order: 2 },
  { key: "streak_30", name: "Dedicated", description: "Reach a 30-day streak.", icon: "streak", category: "streaks", rarity: "rare", metric: "streak_day", progressType: "value", target: 30, rewardCoins: 500, order: 3 },
  { key: "streak_100", name: "Unstoppable", description: "Reach a 100-day streak.", icon: "streak", category: "streaks", rarity: "epic", metric: "streak_day", progressType: "value", target: 100, rewardCoins: 2000, order: 4 },
  { key: "streak_365", name: "Year of Mysteries", description: "Reach a 365-day streak.", icon: "streak", category: "streaks", rarity: "mythic", metric: "streak_day", progressType: "value", target: 365, rewardTitle: "ach_title_legend_of_cases", order: 5 },

  // ── Story Arc (chapter_completed, counter) ──
  { key: "story_1", name: "Chapter One", description: "Complete your first chapter.", icon: "folder", category: "story", rarity: "common", metric: "chapter_completed", progressType: "counter", target: 1, order: 1 },
  { key: "story_arc", name: "Story So Far", description: "Complete a full Story Arc (6 chapters).", icon: "folder", category: "story", rarity: "rare", metric: "chapter_completed", progressType: "counter", target: 6, rewardCoins: 750, order: 2 },
  { key: "story_25", name: "Lore Keeper", description: "Complete 25 chapters.", icon: "folder", category: "story", rarity: "epic", metric: "chapter_completed", progressType: "counter", target: 25, order: 3 },

  // ── Mega Cases (mega_completed, counter) ──
  { key: "mega_1", name: "Mega Detective", description: "Complete your first Mega Case.", icon: "trophy", category: "mega", rarity: "rare", metric: "mega_completed", progressType: "counter", target: 1, order: 1 },
  { key: "mega_10", name: "Mega Veteran", description: "Complete 10 Mega Cases.", icon: "trophy", category: "mega", rarity: "epic", metric: "mega_completed", progressType: "counter", target: 10, rewardCoins: 1500, order: 2 },

  // ── Social (friend_added, counter) ──
  { key: "social_1", name: "Not Alone", description: "Add your first friend.", icon: "people", category: "social", rarity: "common", metric: "friend_added", progressType: "counter", target: 1, order: 1 },
  { key: "social_10", name: "Well Connected", description: "Have 10 friends.", icon: "people", category: "social", rarity: "rare", metric: "friend_added", progressType: "counter", target: 10, rewardCoins: 300, order: 2 },
];

async function run() {
  await connectDatabase();
  for (const d of DEFS) {
    await Achievement.updateOne(
      { key: d.key },
      { $set: { ...d, points: RARITY_POINTS[d.rarity], active: true } },
      { upsert: true },
    );
  }
  logger.info(`Seeded/updated ${DEFS.length} achievements.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  logger.error("Achievement seed failed:", err);
  process.exit(1);
});
