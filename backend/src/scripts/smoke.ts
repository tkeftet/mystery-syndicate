/**
 * Smoke test — exercises the core progression chain end-to-end and reports
 * PASS/FAIL. Run:  yarn smoke
 *
 * Runs against a THROWAWAY database (detective-club-smoketest) which is dropped
 * at the end, so it never touches real data. Verifies that one case submission
 * still fans out correctly to: account XP/coins, Season-Pass XP + level, and
 * challenge progress — and that claims work and are idempotent.
 *
 * Exits non-zero if any check fails (CI-friendly).
 */
import "dotenv/config";
import mongoose from "mongoose";
import { logger } from "../utils/logger";

import { User } from "../modules/users/user.model";
import { Case } from "../modules/cases/case.model";
import { SeasonPass } from "../modules/pass/seasonPass.model";
import { PassProgress } from "../modules/pass/passProgress.model";
import { Challenge } from "../modules/challenges/challenge.model";
import { ChallengeProgress } from "../modules/challenges/challengeProgress.model";
import {
  startInvestigation,
  submitAccusation,
} from "../modules/investigations/investigations.service";
import { claimChallenge } from "../modules/challenges/challenges.service";
import { claimLevel } from "../modules/pass/pass.service";
import { Achievement } from "../modules/achievements/achievement.model";
import { UserAchievement } from "../modules/achievements/userAchievement.model";
import { getAchievementScore } from "../modules/achievements/achievements.service";
import { Agency } from "../modules/agencies/agency.model";
import { AgencyMember } from "../modules/agencies/agencyMember.model";
import { createAgency } from "../modules/agencies/agencies.service";
import { DailyLoginState } from "../modules/dailyLogin/dailyLogin.model";
import {
  claimToday,
  applyStreakSave,
  getCalendar,
  getLoginAnalytics,
} from "../modules/dailyLogin/dailyLogin.service";
import {
  getCustomization,
  equipCosmetic,
  syncUnlocks,
  toggleLike,
  getShowcaseExtras,
  getCosmeticsAnalytics,
} from "../modules/cosmetics/cosmetics.service";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    logger.info(`  PASS  ${name}`);
  } else {
    failures++;
    logger.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function expectThrow(name: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    check(name, false, "expected an error but none was thrown");
  } catch {
    check(name, true);
  }
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  await mongoose.connect(uri, {
    dbName: "detective-club-smoketest",
    tls: true,
    tlsAllowInvalidCertificates: true,
  });
  logger.info("Smoke test DB connected (detective-club-smoketest).");

  try {
    // ── Fixtures ──
    const user = await User.create({
      username: `smoke_${Date.now()}`,
      email: `smoke_${Date.now()}@test.local`,
      isGuest: true,
    });
    const userId = user.id;
    const coinsBefore = user.coins;

    const today = new Date().toISOString().split("T")[0];
    const case_ = await Case.create({
      kind: "daily",
      title: "Smoke Case",
      description: "Smoke test case.",
      type: "theft",
      difficulty: "easy",
      status: "active",
      availableDate: today,
      estimatedMinutes: 5,
      maxScore: 1000,
      victim: { name: "V", description: "v", avatar: "default_victim" },
      suspects: [
        { id: "s1", name: "Suspect One", description: "d", alibi: "a", relationship: "r", avatar: "default_suspect" },
        { id: "s2", name: "Suspect Two", description: "d", alibi: "a", relationship: "r", avatar: "default_suspect" },
      ],
      evidence: [{ id: "e1", title: "E", description: "d", type: "physical", isRedHerring: false }],
      witnessStatements: [],
      timeline: [{ id: "t1", time: "1:00", description: "d", involvedSuspects: [] }],
      solution: { suspectId: "s1", motive: "Greed", timelineEventId: "t1", explanation: "x" },
    });

    await SeasonPass.create({
      title: "Smoke Pass",
      startDate: new Date(Date.now() - 86400000),
      endDate: new Date(Date.now() + 86400000),
      status: "active",
      totalLevels: 10,
      xpPerLevel: 50,
      rewards: [
        { level: 1, tier: "common", track: "free", coins: 100 },
        { level: 2, tier: "rare", track: "free", coins: 200 },
      ],
    });

    await Challenge.create({
      key: "smoke_case_solved",
      period: "daily",
      title: "Smoke: solve a case",
      metric: "case_solved",
      target: 1,
      rewardSeasonXp: 50,
      rewardCoins: 0,
    });

    await Achievement.create({
      key: "smoke_cases_1",
      name: "Smoke: First Case",
      category: "cases",
      rarity: "common",
      points: 10,
      metric: "case_solved",
      progressType: "counter",
      target: 1,
    });

    const agency = await createAgency(userId, { name: `Smoke ${Date.now() % 100000}` });

    // ── Act: solve the case ──
    await startInvestigation(userId, case_.id);
    const result = await submitAccusation(userId, case_.id, "s1", "Greed");

    // ── Assert: scoring ──
    check("submit returns correct=true", result.isCorrect === true);
    check("score > 0", result.score > 0, `score=${result.score}`);

    const afterUser = await User.findById(userId);
    check("account XP increased", (afterUser?.xp ?? 0) > 0, `xp=${afterUser?.xp}`);
    check(
      "coins increased",
      (afterUser?.coins ?? 0) > coinsBefore,
      `coins ${coinsBefore} -> ${afterUser?.coins}`,
    );

    // ── Assert: season pass XP + level ──
    const pp = await PassProgress.findOne({ userId });
    check("season pass progress created", !!pp);
    check("season XP == 50 (daily case)", pp?.seasonXp === 50, `seasonXp=${pp?.seasonXp}`);
    check("pass level == 1 (50/50)", pp?.level === 1, `level=${pp?.level}`);

    // ── Assert: challenge progress ──
    const cp = await ChallengeProgress.findOne({ userId, challengeKey: "smoke_case_solved" });
    check("challenge progress recorded", cp?.progress === 1, `progress=${cp?.progress}`);
    check("challenge completed", cp?.completed === true);
    check("challenge not yet claimed", cp?.claimed === false);

    // ── Assert: achievement auto-unlock + score ──
    const ua = await UserAchievement.findOne({
      userId,
      achievementKey: "smoke_cases_1",
    });
    check("achievement auto-unlocked", ua?.unlocked === true);
    const achScore = await getAchievementScore(userId);
    check("achievement score == 10", achScore === 10, `score=${achScore}`);

    // ── Assert: agency contribution ──
    const ag = await Agency.findById(agency.id);
    check("agency weekly points += 10", ag?.weeklyPoints === 10, `weekly=${ag?.weeklyPoints}`);
    check("agency XP += 10", ag?.agencyXp === 10, `xp=${ag?.agencyXp}`);
    const mem = await AgencyMember.findOne({ userId });
    check("member contribution += 10", mem?.contributionTotal === 10, `contrib=${mem?.contributionTotal}`);

    // ── Act + assert: claim challenge (grants Season XP) ──
    await claimChallenge(userId, "smoke_case_solved");
    const ppAfterChallenge = await PassProgress.findOne({ userId });
    check(
      "claiming challenge added Season XP (50 -> 100)",
      ppAfterChallenge?.seasonXp === 100,
      `seasonXp=${ppAfterChallenge?.seasonXp}`,
    );
    await expectThrow("challenge claim is idempotent (2nd throws)", () =>
      claimChallenge(userId, "smoke_case_solved"),
    );

    // ── Act + assert: claim a pass level ──
    const coinsBeforePassClaim = (await User.findById(userId))?.coins ?? 0;
    await claimLevel(userId, 1);
    const coinsAfterPassClaim = (await User.findById(userId))?.coins ?? 0;
    check(
      "claiming pass level 1 granted coins (+100)",
      coinsAfterPassClaim === coinsBeforePassClaim + 100,
      `${coinsBeforePassClaim} -> ${coinsAfterPassClaim}`,
    );
    await expectThrow("pass claim is idempotent (2nd throws)", () =>
      claimLevel(userId, 1),
    );
    await expectThrow("can't claim a locked pass level (10)", () =>
      claimLevel(userId, 10),
    );

    // ── Daily Login Calendar ──
    const shift = (days: number) =>
      new Date(Date.now() + days * 86400000).toISOString().split("T")[0];

    // Day 1 — first claim grants 100 coins.
    const coinsBeforeD1 = (await User.findById(userId))?.coins ?? 0;
    const d1 = await claimToday(userId);
    const coinsAfterD1 = (await User.findById(userId))?.coins ?? 0;
    check("daily login: day 1 claimed", d1.claimedDay === 1, `day=${d1.claimedDay}`);
    check("daily login: streak == 1", d1.currentStreak === 1, `streak=${d1.currentStreak}`);
    check(
      "daily login: day 1 granted +100 coins",
      coinsAfterD1 === coinsBeforeD1 + 100,
      `${coinsBeforeD1} -> ${coinsAfterD1}`,
    );
    await expectThrow("daily login: second claim same day throws", () =>
      claimToday(userId),
    );

    // Day 2 (consecutive) — grants 150 account XP, streak grows.
    await DailyLoginState.updateOne({ userId }, { lastClaimDate: shift(-1) });
    const xpBeforeD2 = (await User.findById(userId))?.xp ?? 0;
    const d2 = await claimToday(userId);
    const xpAfterD2 = (await User.findById(userId))?.xp ?? 0;
    check("daily login: day 2 claimed consecutively", d2.claimedDay === 2, `day=${d2.claimedDay}`);
    check("daily login: streak == 2", d2.currentStreak === 2, `streak=${d2.currentStreak}`);
    check(
      "daily login: day 2 granted +150 XP",
      xpAfterD2 === xpBeforeD2 + 150,
      `${xpBeforeD2} -> ${xpAfterD2}`,
    );

    // Simulate one missed day (gap = 2) → catch-up should be offered.
    await DailyLoginState.updateOne({ userId }, { lastClaimDate: shift(-2) });
    const calMissed = await getCalendar(userId);
    check("daily login: catch-up offered after 1 missed day", calMissed.catchUp.available === true);
    check("daily login: streak flagged to reset", calMissed.streakWillReset === true);

    // Restore via ad (applyStreakSave) — grants the missed Day 3 (1 hint), keeps streak.
    const hintsBeforeSave = (await User.findById(userId))?.hints ?? 0;
    const save = await applyStreakSave(userId);
    const hintsAfterSave = (await User.findById(userId))?.hints ?? 0;
    check("daily login: streak save applied", save.applied === true);
    check("daily login: catch-up restored day 3", save.missedDay === 3, `missedDay=${save.missedDay}`);
    check(
      "daily login: catch-up granted +1 hint",
      hintsAfterSave === hintsBeforeSave + 1,
      `${hintsBeforeSave} -> ${hintsAfterSave}`,
    );

    // Today's normal claim is still available → Day 4, streak preserved (no reset).
    const d4 = await claimToday(userId);
    check("daily login: day 4 claimed after catch-up", d4.claimedDay === 4, `day=${d4.claimedDay}`);
    check("daily login: streak preserved == 4", d4.currentStreak === 4, `streak=${d4.currentStreak}`);
    check("daily login: streak did NOT reset", d4.streakReset === false);

    // Analytics aggregate is well-formed.
    const analytics = await getLoginAnalytics();
    check("daily login: analytics counts player", analytics.totalPlayers >= 1, `players=${analytics.totalPlayers}`);
    check("daily login: analytics totalClaims >= 4", analytics.totalClaims >= 4, `claims=${analytics.totalClaims}`);
    check("daily login: analytics totalCatchUps >= 1", analytics.totalCatchUps >= 1, `catchUps=${analytics.totalCatchUps}`);

    // ── Profile Customization (cosmetics) ──
    const customization = await getCustomization(userId);
    check(
      "cosmetics: default items auto-owned",
      customization.items.find((i) => i.id === "frame_default")?.owned === true &&
        customization.items.find((i) => i.id === "badge_rookie")?.owned === true,
    );
    check("cosmetics: ownedCount >= 5 defaults", customization.ownedCount >= 5, `owned=${customization.ownedCount}`);

    // Equip an owned default frame.
    await equipCosmetic(userId, "frame", "frame_default");
    const afterEquip = await getCustomization(userId);
    check("cosmetics: frame equipped", afterEquip.equipped.frame === "frame_default");

    // Equipping an unowned item is rejected (anti-cheat).
    await expectThrow("cosmetics: can't equip unowned item", () =>
      equipCosmetic(userId, "frame", "frame_gold"),
    );

    // Unequip (null) works.
    await equipCosmetic(userId, "frame", null);
    const afterUnequip = await getCustomization(userId);
    check("cosmetics: frame unequipped", afterUnequip.equipped.frame === null);

    // Achievement-driven unlock: granting cases_10 unlocks name_green + badge_sleuth.
    await UserAchievement.create({
      userId,
      achievementKey: "cases_10",
      category: "cases",
      rarity: "rare",
      points: 25,
      progress: 10,
      target: 10,
      unlocked: true,
      unlockedAt: new Date(),
    });
    const newlyUnlocked = await syncUnlocks(userId);
    check(
      "cosmetics: achievement unlock grants name_green",
      newlyUnlocked.some((c) => c.id === "name_green"),
      newlyUnlocked.map((c) => c.id).join(","),
    );

    // A second user (for showcase view + like rules).
    const viewer = await User.create({
      username: `smoke_v_${Date.now() % 1000000}`,
      email: `smoke_v_${Date.now()}@test.local`,
      isGuest: true,
    });
    const viewsBefore = (await User.findById(userId))?.profileViews ?? 0;
    const showcase = await getShowcaseExtras(userId, viewer.id);
    check("cosmetics: showcase extras returned", !!showcase);
    const viewsAfter = (await User.findById(userId))?.profileViews ?? 0;
    check("cosmetics: profile view counted", viewsAfter === viewsBefore + 1, `${viewsBefore} -> ${viewsAfter}`);

    await expectThrow("cosmetics: can't like your own profile", () =>
      toggleLike(userId, userId),
    );
    await expectThrow("cosmetics: can't like a non-friend", () =>
      toggleLike(viewer.id, userId),
    );

    const cosAnalytics = await getCosmeticsAnalytics();
    check("cosmetics: analytics totalUsers >= 2", cosAnalytics.totalUsers >= 2, `users=${cosAnalytics.totalUsers}`);
    check("cosmetics: analytics totalProfileViews >= 1", cosAnalytics.totalProfileViews >= 1, `views=${cosAnalytics.totalProfileViews}`);
  } finally {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    logger.info("Smoke test DB dropped + disconnected.");
  }

  if (failures > 0) {
    logger.error(`SMOKE TEST FAILED — ${failures} check(s) failed.`);
    process.exit(1);
  }
  logger.info("SMOKE TEST PASSED — all checks green.");
  process.exit(0);
}

run().catch((err) => {
  logger.error("Smoke test crashed:", err);
  process.exit(1);
});
