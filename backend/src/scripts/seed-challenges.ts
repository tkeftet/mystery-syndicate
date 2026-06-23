/**
 * Seed seasonal challenge definitions. Run:  yarn seed:challenges
 *
 * Upserts by `key`, so it's safe to re-run (adds new challenges, updates existing).
 * Definitions recur every period; per-user progress is tracked separately.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database";
import { Challenge } from "../modules/challenges/challenge.model";
import { logger } from "../utils/logger";

const CHALLENGES = [
  // ── Daily ──
  {
    key: "daily_solve_case",
    period: "daily",
    title: "On the Case",
    description: "Solve today's case.",
    metric: "case_solved",
    target: 1,
    rewardSeasonXp: 50,
    rewardCoins: 20,
    order: 1,
  },
  {
    key: "daily_mini_3",
    period: "daily",
    title: "Quick Thinker",
    description: "Solve 3 quick mini cases.",
    metric: "mini_solved",
    target: 3,
    rewardSeasonXp: 60,
    rewardCoins: 20,
    order: 2,
  },
  {
    key: "daily_no_hint",
    period: "daily",
    title: "No Help Needed",
    description: "Solve a case correctly without using a hint.",
    metric: "no_hint_solve",
    target: 1,
    rewardSeasonXp: 40,
    rewardCoins: 10,
    order: 3,
  },
  // ── Weekly ──
  {
    key: "weekly_solve_7",
    period: "weekly",
    title: "Seven Days, Seven Cases",
    description: "Solve 7 cases this week.",
    metric: "case_solved",
    target: 7,
    rewardSeasonXp: 200,
    rewardCoins: 100,
    order: 1,
  },
  {
    key: "weekly_mega",
    period: "weekly",
    title: "Mega Detective",
    description: "Complete this week's Mega Case.",
    metric: "mega_completed",
    target: 1,
    rewardSeasonXp: 250,
    rewardCoins: 150,
    order: 2,
  },
  // ── Monthly ──
  {
    key: "monthly_chapters_6",
    period: "monthly",
    title: "Story So Far",
    description: "Complete 6 Story Arc chapters this season.",
    metric: "chapter_completed",
    target: 6,
    rewardSeasonXp: 500,
    rewardCoins: 250,
    order: 1,
  },
  {
    key: "monthly_solve_30",
    period: "monthly",
    title: "Relentless",
    description: "Solve 30 cases this month.",
    metric: "case_solved",
    target: 30,
    rewardSeasonXp: 800,
    rewardCoins: 400,
    order: 2,
  },
];

async function run() {
  await connectDatabase();

  for (const c of CHALLENGES) {
    await Challenge.updateOne({ key: c.key }, { $set: c }, { upsert: true });
  }

  logger.info(`Seeded/updated ${CHALLENGES.length} challenge definitions.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  logger.error("Challenge seed failed:", err);
  process.exit(1);
});
