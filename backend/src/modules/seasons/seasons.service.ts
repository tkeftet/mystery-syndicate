import { Season, type ISeason, type SeasonRewardBundle } from "./season.model";
import { SeasonProgress } from "./seasonProgress.model";
import { Case } from "../cases/case.model";
import { Investigation } from "../investigations/investigation.model";
import { User } from "../users/user.model";
import { startInvestigation } from "../investigations/investigations.service";
import { grantXpAndCoins } from "../../shared/userRewards";
import { awardSeasonXp } from "../pass";
import { recordChallengeEvent } from "../challenges";
import { recordAchievementEvent } from "../achievements";
import { addAgencyContribution } from "../agencies";
import { sendToTokens } from "../notifications";
import { NotFoundError, ValidationError } from "../../shared/errors/AppError";
import { logger } from "../../utils/logger";

const DAY_MS = 86400000;
const norm = (s?: string) => (s ?? "").trim().toLowerCase();

// ── Unlock logic ─────────────────────────────────────────────────────────────

function chapterUnlockDate(season: ISeason, n: number): Date {
  const cadence = season.unlockCadenceDays || 1;
  return new Date(season.startDate.getTime() + (n - 1) * cadence * DAY_MS);
}

/** A chapter opens once its day has arrived AND the previous chapter is done. */
function isChapterAccessible(
  season: ISeason,
  completedChapters: number[],
  n: number,
  now = new Date(),
): boolean {
  if (n < 1 || n > season.totalChapters) return false;
  if (now < chapterUnlockDate(season, n)) return false;
  if (n === 1) return true;
  return completedChapters.includes(n - 1);
}

// ── Reads ────────────────────────────────────────────────────────────────────

export async function listSeasons() {
  return Season.find({ status: { $ne: "archived" } })
    .sort({ startDate: -1 })
    .limit(20);
}

export async function getSeason(seasonId: string) {
  const season = await Season.findById(seasonId);
  if (!season) throw new NotFoundError("Season");
  return season;
}

async function getOrCreateProgress(userId: string, seasonId: string) {
  let progress = await SeasonProgress.findOne({ userId, seasonId });
  if (!progress) {
    progress = await SeasonProgress.create({ userId, seasonId });
  }
  return progress;
}

/** Netflix-style map: every chapter with its per-user status. */
export async function getSeasonMap(userId: string, seasonId: string) {
  const season = await Season.findById(seasonId);
  if (!season) throw new NotFoundError("Season");

  const progress = await getOrCreateProgress(userId, seasonId);
  const chapters = await Case.find({ seasonId, kind: "chapter" })
    .select(
      "chapterNumber title chapterType storyText cliffhanger difficulty",
    )
    .sort({ chapterNumber: 1 });

  const now = new Date();
  const completed = progress.completedChapters;

  const mapped = chapters.map((c) => {
    const n = c.chapterNumber ?? 0;
    const isDone = completed.includes(n);
    const accessible = isChapterAccessible(season, completed, n, now);
    return {
      chapterNumber: n,
      caseId: c.id,
      title: c.title,
      chapterType: c.chapterType,
      difficulty: c.difficulty,
      unlockDate: chapterUnlockDate(season, n),
      status: isDone ? "completed" : accessible ? "available" : "locked",
      // Story + cliffhanger are only revealed once the chapter is completed.
      storyText: isDone ? c.storyText : undefined,
      cliffhanger: isDone ? c.cliffhanger : undefined,
    };
  });

  return {
    season,
    progress: {
      currentChapter: progress.currentChapter,
      completedChapters: completed,
      chaptersCompleted: completed.length,
      seasonScore: progress.seasonScore,
      accuracy: progress.accuracy,
      percent: Math.round((completed.length / season.totalChapters) * 100),
    },
    chapters: mapped,
  };
}

export async function getMyProgress(userId: string, seasonId: string) {
  const progress = await SeasonProgress.findOne({ userId, seasonId });
  if (!progress) return null;
  let rank: number | null = null;
  const ahead = await SeasonProgress.countDocuments({
    seasonId,
    seasonScore: { $gt: progress.seasonScore },
  });
  rank = ahead + 1;
  return { progress, rank };
}

// ── Play: start a chapter ────────────────────────────────────────────────────

export async function startChapter(
  userId: string,
  seasonId: string,
  chapterNumber: number,
) {
  const season = await Season.findById(seasonId);
  if (!season) throw new NotFoundError("Season");
  if (season.status !== "active")
    throw new ValidationError("This season isn't active.");

  const chapter = await Case.findOne({
    seasonId,
    kind: "chapter",
    chapterNumber,
  }).select("-solution");
  if (!chapter) throw new NotFoundError("Chapter");

  const progress = await getOrCreateProgress(userId, seasonId);
  if (
    !isChapterAccessible(season, progress.completedChapters, chapterNumber) &&
    !progress.completedChapters.includes(chapterNumber)
  ) {
    throw new ValidationError(
      "This chapter is still locked. Finish the previous chapter and come back when it unlocks.",
    );
  }

  await startInvestigation(userId, chapter.id);
  return { chapter, alreadyCompleted: progress.completedChapters.includes(chapterNumber) };
}

// ── Play: submit a chapter ───────────────────────────────────────────────────

export interface ChapterAccusation {
  suspectId: string;
  motive: string;
  timelineEventId: string;
}

async function applyReward(userId: string, bundle?: SeasonRewardBundle) {
  if (!bundle) return;
  const items = [bundle.badge, bundle.title, bundle.avatar].filter(
    (x): x is string => !!x,
  );
  if (items.length > 0) {
    await User.findByIdAndUpdate(userId, {
      $addToSet: { inventory: { $each: items } },
    });
  }
  if (bundle.xp || bundle.coins) {
    await grantXpAndCoins(userId, bundle.xp ?? 0, bundle.coins ?? 0);
  }
}

export async function submitChapter(
  userId: string,
  seasonId: string,
  chapterNumber: number,
  accusation: ChapterAccusation,
) {
  const season = await Season.findById(seasonId);
  if (!season) throw new NotFoundError("Season");
  if (season.status !== "active")
    throw new ValidationError("This season isn't open for play.");

  const chapter = await Case.findOne({
    seasonId,
    kind: "chapter",
    chapterNumber,
  });
  if (!chapter) throw new NotFoundError("Chapter");

  const progress = await getOrCreateProgress(userId, seasonId);
  if (progress.completedChapters.includes(chapterNumber)) {
    throw new ValidationError("You already completed this chapter.");
  }
  if (!isChapterAccessible(season, progress.completedChapters, chapterNumber)) {
    throw new ValidationError("This chapter is locked.");
  }

  const sol = chapter.solution;
  const inv = await Investigation.findOne({ userId, caseId: chapter.id });
  const hintsUsed = inv?.hintsUsed ?? 0;
  const adHelpsUsed = inv?.adHelpsUsed ?? 0;
  const completionTimeSec = inv
    ? Math.max(0, Math.floor((Date.now() - inv.startedAt.getTime()) / 1000))
    : 0;

  const suspectOk = accusation.suspectId === sol.suspectId;
  const motiveOk = norm(accusation.motive) === norm(sol.motive);
  const timelineOk = accusation.timelineEventId === sol.timelineEventId;
  const noAssists = hintsUsed === 0 && adHelpsUsed === 0;

  const scoreBreakdown = {
    suspect: suspectOk ? 600 : 0,
    motive: motiveOk ? 200 : 0,
    timeline: timelineOk ? 100 : 0,
    noAssists: noAssists ? 100 : 0,
  };
  const score = Object.values(scoreBreakdown).reduce((a, b) => a + b, 0);
  const accuracy = Math.round(
    (([suspectOk, motiveOk, timelineOk].filter(Boolean).length) / 3) * 100,
  );

  // ── Update progress ──
  progress.completedChapters.push(chapterNumber);
  progress.seasonScore += score;
  progress.accuracySum += accuracy;
  progress.accuracy = Math.round(
    progress.accuracySum / progress.completedChapters.length,
  );
  progress.totalCompletionTimeSec += completionTimeSec;
  progress.chapterStats.push({
    chapter: chapterNumber,
    score,
    accuracy,
    completionTimeSec,
    completedAt: new Date(),
  });
  progress.currentChapter = Math.min(
    Math.max(...progress.completedChapters) + 1,
    season.totalChapters,
  );
  progress.lastPlayedAt = new Date();

  // ── Rewards ──
  const rewardsEarned: Array<{ source: string } & SeasonRewardBundle> = [];

  await applyReward(userId, season.rewards?.chapter);
  if (season.rewards?.chapter) {
    rewardsEarned.push({ source: "chapter", ...season.rewards.chapter });
  }

  const count = progress.completedChapters.length;
  for (const m of season.rewards?.milestones ?? []) {
    if (count >= m.atChapter && !progress.claimedMilestones.includes(m.atChapter)) {
      await applyReward(userId, m);
      progress.claimedMilestones.push(m.atChapter);
      rewardsEarned.push({ source: `milestone_${m.atChapter}`, ...m });
    }
  }

  const seasonCompleted = count >= season.totalChapters;
  if (seasonCompleted && !progress.completionClaimed) {
    await applyReward(userId, season.rewards?.completion);
    progress.completionClaimed = true;
    if (season.rewards?.completion) {
      rewardsEarned.push({ source: "completion", ...season.rewards.completion });
    }
  }

  await progress.save();

  // Secondary progression (awaited, concurrent, never throws).
  await Promise.allSettled([
    awardSeasonXp(userId, 100, "story_chapter"),
    recordChallengeEvent(userId, "chapter_completed", 1),
    recordChallengeEvent(userId, "case_solved", 1),
    recordAchievementEvent(userId, "chapter_completed", 1),
    recordAchievementEvent(userId, "case_solved", 1),
    addAgencyContribution(userId, 20, "chapter"),
  ]);

  const nextNumber = chapterNumber + 1;
  const nextExists = nextNumber <= season.totalChapters;

  return {
    result: { score, scoreBreakdown, accuracy, completionTimeSec, isCorrect: suspectOk, solution: sol },
    cliffhanger: chapter.cliffhanger ?? null,
    seasonCompleted,
    rewardsEarned,
    progress: {
      chaptersCompleted: count,
      percent: Math.round((count / season.totalChapters) * 100),
      seasonScore: progress.seasonScore,
    },
    nextChapter: nextExists
      ? {
          chapterNumber: nextNumber,
          unlockDate: chapterUnlockDate(season, nextNumber),
          unlocked: isChapterAccessible(
            season,
            progress.completedChapters,
            nextNumber,
          ),
        }
      : null,
  };
}

// ── Leaderboard ──────────────────────────────────────────────────────────────

export async function getSeasonLeaderboard(seasonId: string, limit = 100) {
  const rows = await SeasonProgress.find({ seasonId })
    .sort({ seasonScore: -1, accuracy: -1, totalCompletionTimeSec: 1 })
    .limit(limit);

  const users = await User.find({
    _id: { $in: rows.map((r) => r.userId) },
  }).select("username avatar");
  const umap = new Map(users.map((u) => [u.id, u]));

  return rows.map((r, i) => ({
    rank: i + 1,
    userId: r.userId,
    username: umap.get(r.userId)?.username ?? "Unknown",
    avatar: umap.get(r.userId)?.avatar ?? "default",
    seasonScore: r.seasonScore,
    accuracy: r.accuracy,
    chaptersCompleted: r.completedChapters.length,
    totalCompletionTimeSec: r.totalCompletionTimeSec,
  }));
}

// ── Lifecycle + notifications ────────────────────────────────────────────────

async function tokensForAllUsers(): Promise<string[]> {
  const users = await User.find({ pushToken: { $ne: null } }).select("pushToken");
  return users.map((u) => u.pushToken).filter((t): t is string => !!t);
}

async function notifySeasonOnce(
  season: ISeason,
  tag: string,
  title: string,
  body: string,
) {
  if (season.notificationsSent.includes(tag)) return;
  const tokens = await tokensForAllUsers();
  await sendToTokens(tokens, {
    title,
    body,
    data: { type: "season", seasonId: season.id, tag },
  });
  season.notificationsSent.push(tag);
  await season.save();
}

/** Advance season statuses + fire chapter/finale/ending notifications. */
export async function processSeasonLifecycle() {
  const now = new Date();

  const toActivate = await Season.find({
    status: "upcoming",
    startDate: { $lte: now },
  });
  for (const s of toActivate) {
    s.status = "active";
    await s.save();
    await notifySeasonOnce(
      s,
      "live",
      "🎬 New season has begun!",
      `"${s.title}" — Chapter 1 is live. Start the investigation.`,
    );
  }

  const toComplete = await Season.find({
    status: "active",
    endDate: { $lte: now },
  });
  for (const s of toComplete) {
    s.status = "completed";
    await s.save();
    await notifySeasonOnce(
      s,
      "ended",
      "🏁 Season finished",
      `"${s.title}" has ended. See where you placed on the season leaderboard.`,
    );
  }

  // Daily "new chapter available" + finale/ending teasers for active seasons.
  const active = await Season.find({ status: "active" });
  for (const s of active) {
    for (let n = 2; n <= s.totalChapters; n++) {
      if (chapterUnlockDate(s, n) <= now) {
        await notifySeasonOnce(
          s,
          `chapter_${n}`,
          "📖 A new chapter is unlocked",
          `Chapter ${n} of "${s.title}" is now available. What happens next?`,
        );
      }
    }
    const finaleUnlock = chapterUnlockDate(s, s.totalChapters);
    if (
      finaleUnlock > now &&
      finaleUnlock.getTime() - now.getTime() <= DAY_MS
    ) {
      await notifySeasonOnce(
        s,
        "finale_soon",
        "🔥 Season finale tomorrow",
        `The final chapter of "${s.title}" unlocks tomorrow. The mastermind will be revealed.`,
      );
    }
    if (s.endDate.getTime() - now.getTime() <= DAY_MS) {
      await notifySeasonOnce(
        s,
        "ending_soon",
        "⏳ Season ending soon",
        `"${s.title}" closes in under 24h — finish your chapters before it ends.`,
      );
    }
  }
}
