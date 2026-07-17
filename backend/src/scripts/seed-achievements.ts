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

// Every name/description is stored trilingual ({ en, fr, ar }); the API returns
// it raw and the mobile app resolves the current language on render.
const tl = (en: string, fr: string, ar: string) => ({ en, fr, ar });
type L = ReturnType<typeof tl>;

type Def = {
  key: string;
  name: L;
  description: L;
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
  { key: "cases_1", name: tl("First Case", "Première affaire", "أول قضية"), description: tl("Solve your first case.", "Résolvez votre première affaire.", "حُل قضيتك الأولى."), icon: "search", category: "cases", rarity: "common", metric: "case_solved", progressType: "counter", target: 1, order: 1 },
  { key: "cases_10", name: tl("Getting Started", "Bien lancé", "بداية الطريق"), description: tl("Solve 10 cases.", "Résolvez 10 affaires.", "حُل 10 قضايا."), icon: "search", category: "cases", rarity: "common", metric: "case_solved", progressType: "counter", target: 10, order: 2 },
  { key: "cases_100", name: tl("Crime Solver", "Résolveur de crimes", "حلاّل الجرائم"), description: tl("Solve 100 cases.", "Résolvez 100 affaires.", "حُل 100 قضية."), icon: "search", category: "cases", rarity: "rare", metric: "case_solved", progressType: "counter", target: 100, rewardCoins: 500, order: 3 },
  { key: "cases_1000", name: tl("Master Detective", "Maître détective", "المحقق الأسطوري"), description: tl("Solve 1000 cases.", "Résolvez 1000 affaires.", "حُل 1000 قضية."), icon: "search", category: "cases", rarity: "legendary", metric: "case_solved", progressType: "counter", target: 1000, rewardCoins: 5000, rewardTitle: "ach_title_master_detective", order: 4 },

  // ── Accuracy (perfect_case, counter) ──
  { key: "perfect_5", name: tl("Flawless Five", "Cinq sans faute", "خمسة بلا خطأ"), description: tl("Solve 5 perfect cases.", "Résolvez 5 affaires parfaites.", "حُل 5 قضايا بشكل مثالي."), icon: "target", category: "accuracy", rarity: "rare", metric: "perfect_case", progressType: "counter", target: 5, order: 1 },
  { key: "perfect_25", name: tl("Precision Detective", "Détective de précision", "محقق الدقة"), description: tl("Solve 25 perfect cases.", "Résolvez 25 affaires parfaites.", "حُل 25 قضية بشكل مثالي."), icon: "target", category: "accuracy", rarity: "epic", metric: "perfect_case", progressType: "counter", target: 25, rewardCoins: 1000, order: 2 },
  { key: "perfect_100", name: tl("Perfect Investigator", "Enquêteur parfait", "المحقق المثالي"), description: tl("Solve 100 perfect cases.", "Résolvez 100 affaires parfaites.", "حُل 100 قضية بشكل مثالي."), icon: "target", category: "accuracy", rarity: "legendary", metric: "perfect_case", progressType: "counter", target: 100, rewardTitle: "ach_title_perfect_investigator", order: 3 },

  // ── Streaks (streak_day, value) ──
  { key: "streak_3", name: tl("Warming Up", "Échauffement", "إحماء"), description: tl("Reach a 3-day streak.", "Atteignez une série de 3 jours.", "حقق سلسلة 3 أيام متتالية."), icon: "streak", category: "streaks", rarity: "common", metric: "streak_day", progressType: "value", target: 3, order: 1 },
  { key: "streak_7", name: tl("Week Detective", "Détective de la semaine", "محقق الأسبوع"), description: tl("Reach a 7-day streak.", "Atteignez une série de 7 jours.", "حقق سلسلة 7 أيام متتالية."), icon: "streak", category: "streaks", rarity: "common", metric: "streak_day", progressType: "value", target: 7, order: 2 },
  { key: "streak_30", name: tl("Dedicated", "Assidu", "مواظب"), description: tl("Reach a 30-day streak.", "Atteignez une série de 30 jours.", "حقق سلسلة 30 يومًا متتاليًا."), icon: "streak", category: "streaks", rarity: "rare", metric: "streak_day", progressType: "value", target: 30, rewardCoins: 500, order: 3 },
  { key: "streak_100", name: tl("Unstoppable", "Inarrêtable", "لا يُوقف"), description: tl("Reach a 100-day streak.", "Atteignez une série de 100 jours.", "حقق سلسلة 100 يوم متتالٍ."), icon: "streak", category: "streaks", rarity: "epic", metric: "streak_day", progressType: "value", target: 100, rewardCoins: 2000, order: 4 },
  { key: "streak_365", name: tl("Year of Mysteries", "Une année de mystères", "عام من الألغاز"), description: tl("Reach a 365-day streak.", "Atteignez une série de 365 jours.", "حقق سلسلة 365 يومًا متتاليًا."), icon: "streak", category: "streaks", rarity: "mythic", metric: "streak_day", progressType: "value", target: 365, rewardTitle: "ach_title_legend_of_cases", order: 5 },

  // ── Story Arc (chapter_completed, counter) ──
  { key: "story_1", name: tl("Chapter One", "Chapitre un", "الفصل الأول"), description: tl("Complete your first chapter.", "Terminez votre premier chapitre.", "أكمل فصلك الأول."), icon: "folder", category: "story", rarity: "common", metric: "chapter_completed", progressType: "counter", target: 1, order: 1 },
  { key: "story_arc", name: tl("Story So Far", "L'histoire en marche", "الحكاية حتى الآن"), description: tl("Complete a full Story Arc (6 chapters).", "Terminez une saga complète (6 chapitres).", "أكمل قصة كاملة (6 فصول)."), icon: "folder", category: "story", rarity: "rare", metric: "chapter_completed", progressType: "counter", target: 6, rewardCoins: 750, order: 2 },
  { key: "story_25", name: tl("Lore Keeper", "Gardien des récits", "حافظ الحكايات"), description: tl("Complete 25 chapters.", "Terminez 25 chapitres.", "أكمل 25 فصلًا."), icon: "folder", category: "story", rarity: "epic", metric: "chapter_completed", progressType: "counter", target: 25, order: 3 },

  // ── Mega Cases (mega_completed, counter) ──
  { key: "mega_1", name: tl("Mega Detective", "Méga détective", "المحقق الكبير"), description: tl("Complete your first Mega Case.", "Terminez votre première Méga Affaire.", "أكمل قضيتك الكبرى الأولى."), icon: "trophy", category: "mega", rarity: "rare", metric: "mega_completed", progressType: "counter", target: 1, order: 1 },
  { key: "mega_10", name: tl("Mega Veteran", "Vétéran des Méga Affaires", "محارب القضايا الكبرى"), description: tl("Complete 10 Mega Cases.", "Terminez 10 Méga Affaires.", "أكمل 10 قضايا كبرى."), icon: "trophy", category: "mega", rarity: "epic", metric: "mega_completed", progressType: "counter", target: 10, rewardCoins: 1500, order: 2 },

  // ── Social (friend_added, counter) ──
  { key: "social_1", name: tl("Not Alone", "Pas seul", "لست وحدك"), description: tl("Add your first friend.", "Ajoutez votre premier ami.", "أضف صديقك الأول."), icon: "people", category: "social", rarity: "common", metric: "friend_added", progressType: "counter", target: 1, order: 1 },
  { key: "social_10", name: tl("Well Connected", "Bien entouré", "واسع المعارف"), description: tl("Have 10 friends.", "Ayez 10 amis.", "اجمع 10 أصدقاء."), icon: "people", category: "social", rarity: "rare", metric: "friend_added", progressType: "counter", target: 10, rewardCoins: 300, order: 2 },
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
