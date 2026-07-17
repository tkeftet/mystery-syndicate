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

// Every title/description is stored trilingual ({ en, fr, ar }); the API returns
// it raw and the mobile app resolves the current language on render.
const tl = (en: string, fr: string, ar: string) => ({ en, fr, ar });

const CHALLENGES = [
  // ── Daily ──
  {
    key: "daily_solve_case",
    period: "daily",
    title: tl("On the Case", "Sur l'affaire", "على القضية"),
    description: tl("Solve today's case.", "Résolvez l'affaire du jour.", "حُل قضية اليوم."),
    metric: "case_solved",
    target: 1,
    rewardSeasonXp: 50,
    rewardCoins: 20,
    order: 1,
  },
  {
    key: "daily_mini_3",
    period: "daily",
    title: tl("Quick Thinker", "Esprit vif", "سريع البديهة"),
    description: tl("Solve 3 quick mini cases.", "Résolvez 3 mini-affaires rapides.", "حُل 3 قضايا قصيرة سريعة."),
    metric: "mini_solved",
    target: 3,
    rewardSeasonXp: 60,
    rewardCoins: 20,
    order: 2,
  },
  {
    key: "daily_no_hint",
    period: "daily",
    title: tl("No Help Needed", "Sans aucune aide", "بلا أي مساعدة"),
    description: tl("Solve a case correctly without using a hint.", "Résolvez correctement une affaire sans utiliser d'indice.", "حُل قضية بشكل صحيح دون استخدام أي تلميح."),
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
    title: tl("Seven Days, Seven Cases", "Sept jours, sept affaires", "سبعة أيام، سبع قضايا"),
    description: tl("Solve 7 cases this week.", "Résolvez 7 affaires cette semaine.", "حُل 7 قضايا هذا الأسبوع."),
    metric: "case_solved",
    target: 7,
    rewardSeasonXp: 200,
    rewardCoins: 100,
    order: 1,
  },
  {
    key: "weekly_mega",
    period: "weekly",
    title: tl("Mega Detective", "Méga détective", "المحقق الكبير"),
    description: tl("Complete this week's Mega Case.", "Terminez la Méga Affaire de la semaine.", "أكمل القضية الكبرى لهذا الأسبوع."),
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
    title: tl("Story So Far", "L'histoire en marche", "الحكاية حتى الآن"),
    description: tl("Complete 6 Story Arc chapters this season.", "Terminez 6 chapitres de la saga cette saison.", "أكمل 6 فصول من القصة هذا الموسم."),
    metric: "chapter_completed",
    target: 6,
    rewardSeasonXp: 500,
    rewardCoins: 250,
    order: 1,
  },
  {
    key: "monthly_solve_30",
    period: "monthly",
    title: tl("Relentless", "Infatigable", "بلا هوادة"),
    description: tl("Solve 30 cases this month.", "Résolvez 30 affaires ce mois-ci.", "حُل 30 قضية هذا الشهر."),
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
