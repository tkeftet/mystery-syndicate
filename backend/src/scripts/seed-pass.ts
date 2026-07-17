/**
 * Seed an active Season Pass. Run:  yarn seed:pass
 *
 * "The Crimson Conspiracy" — 100 levels, flat 120 Season XP per level. Rewards
 * are formula-driven (no 100 hand-authored drops): every level gives coins, with
 * rarer cosmetics (badge/title/avatar) at milestone levels. Active immediately.
 *
 * Idempotent — skips if a SeasonPass already exists.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database";
import { SeasonPass, type PassReward } from "../modules/pass/seasonPass.model";
import { logger } from "../utils/logger";

const now = new Date();
const DAY = 86400000;
const TOTAL_LEVELS = 100;

function buildRewards(): PassReward[] {
  const rewards: PassReward[] = [];
  for (let level = 1; level <= TOTAL_LEVELS; level++) {
    // Coins scale gently with level.
    const coins = 50 + Math.floor(level / 5) * 25;

    let tier: PassReward["tier"] = "common";
    const reward: PassReward = { level, tier, track: "free", coins };

    if (level % 25 === 0) {
      // Legendary milestones — avatar/title.
      tier = "legendary";
      reward.tier = tier;
      reward.coins = coins + 500;
      if (level === 100) reward.avatar = "pass_s1_avatar_kingpin";
      else if (level === 75) reward.title = "pass_s1_title_conspirator";
      else if (level === 50) reward.avatar = "pass_s1_avatar_crimson";
      else reward.title = "pass_s1_title_initiate";
      reward.label = "Legendary reward";
    } else if (level % 10 === 0) {
      // Epic — a badge.
      tier = "epic";
      reward.tier = tier;
      reward.coins = coins + 150;
      reward.badge = `pass_s1_badge_l${level}`;
      reward.label = "Epic badge";
    } else if (level % 5 === 0) {
      // Rare — bonus coins + account XP.
      tier = "rare";
      reward.tier = tier;
      reward.xp = 500;
      reward.label = "Rare cache";
    }

    rewards.push(reward);
  }
  return rewards;
}

async function run() {
  await connectDatabase();

  const existing = await SeasonPass.countDocuments();
  if (existing > 0) {
    logger.info(`Season passes already seeded (${existing}). Skipping.`);
    await mongoose.disconnect();
    return;
  }

  // title/subtitle/description are stored trilingual ({ en, fr, ar }); the API
  // returns them raw and the mobile app resolves the current language on render.
  const pass = await SeasonPass.create({
    title: {
      en: "The Crimson Conspiracy",
      fr: "La Conspiration écarlate",
      ar: "المؤامرة القرمزية",
    },
    subtitle: { en: "Season 1", fr: "Saison 1", ar: "الموسم الأول" },
    description: {
      en: "A shadow network pulls the city's strings. Earn Season XP across every case to climb 100 levels of rewards before the trail goes cold.",
      fr: "Un réseau de l'ombre tire les ficelles de la ville. Gagnez de l'XP de saison sur chaque affaire pour gravir 100 niveaux de récompenses avant que la piste ne refroidisse.",
      ar: "شبكة خفية تحرّك خيوط المدينة. اجمع نقاط خبرة الموسم من كل قضية لتتسلق 100 مستوى من المكافآت قبل أن يبرد الأثر.",
    },
    seasonTheme: "crimson",
    startDate: new Date(now.getTime() - 1 * DAY), // active now
    endDate: new Date(now.getTime() + 29 * DAY), // ~30-day season
    status: "active",
    totalLevels: TOTAL_LEVELS,
    xpPerLevel: 120,
    rewards: buildRewards(),
    premiumEnabled: false,
    createdBy: "seed",
  });

  logger.info(
    `Seeded Season Pass "${(pass.title as { en: string }).en}" — ${TOTAL_LEVELS} levels, ${pass.rewards.length} rewards.`,
  );
  await mongoose.disconnect();
}

run().catch((err) => {
  logger.error("Season pass seed failed:", err);
  process.exit(1);
});
