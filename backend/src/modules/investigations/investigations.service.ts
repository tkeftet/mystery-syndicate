import { Investigation } from "./investigation.model";
import { Case } from "../cases/case.model";
import { User } from "../users/user.model";
import { updateStreak } from "../streaks/streaks.service";
import { NotFoundError, ValidationError } from "../../shared/errors/AppError";
import { grantXpAndCoins } from "../../shared/userRewards";
import { awardSeasonXp } from "../pass";
import { recordChallengeEvent } from "../challenges";
import { recordAchievementEvent } from "../achievements";
import { addAgencyContribution } from "../agencies";
import { syncUnlocks } from "../cosmetics";

// Re-exported for modules that historically imported it from here.
export { grantXpAndCoins };

function calculateScore(
  isCorrect: boolean,
  hintsUsed: number,
  timeSeconds: number,
  maxScore: number,
): number {
  if (!isCorrect) return Math.floor(maxScore * 0.1);

  const hintPenalty = hintsUsed * 50;
  const timePenalty = Math.floor(timeSeconds / 60) * 10;
  const score = maxScore - hintPenalty - timePenalty;

  return Math.max(score, Math.floor(maxScore * 0.3));
}

export async function startInvestigation(userId: string, caseId: string) {
  const existing = await Investigation.findOne({ userId, caseId });
  if (existing) return existing;

  const case_ = await Case.findById(caseId);
  if (!case_) throw new NotFoundError("Case");

  return Investigation.create({ userId, caseId });
}

export async function submitAccusation(
  userId: string,
  caseId: string,
  suspectId: string,
  motive: string,
) {
  const [inv, case_] = await Promise.all([
    Investigation.findOne({ userId, caseId }),
    Case.findById(caseId),
  ]);

  if (!inv) throw new NotFoundError("Investigation");
  if (!case_) throw new NotFoundError("Case");
  if (inv.status === "completed")
    throw new ValidationError("Already submitted");

  const isCorrect = case_.solution.suspectId === suspectId;
  const timeSeconds = Math.floor((Date.now() - inv.startedAt.getTime()) / 1000);
  const score = calculateScore(
    isCorrect,
    inv.hintsUsed,
    timeSeconds,
    case_.maxScore,
  );

  // Perfect Case: correct accusation, every clue inspected, every suspect
  // questioned, and no hints used.
  const allEvidenceInspected = case_.evidence.every((e) =>
    inv.inspectedEvidenceIds.includes(e.id),
  );
  const allSuspectsReviewed = case_.suspects.every((s) =>
    inv.reviewedSuspectIds.includes(s.id),
  );
  const isPerfect =
    isCorrect &&
    inv.hintsUsed === 0 &&
    (inv.adHelpsUsed ?? 0) === 0 &&
    allEvidenceInspected &&
    allSuspectsReviewed;

  // Red Herring Tracker: a decoy only "fools" you if it misled you to the WRONG
  // culprit. A correct accusation means you saw through every red herring — even
  // the ones you inspected (a thorough detective examines the decoys too), so a
  // perfect/correct run never reports being fooled.
  const redHerrings = case_.evidence.filter((e) => e.isRedHerring);
  const fooledBy = isCorrect
    ? []
    : redHerrings
        .filter((e) => inv.inspectedEvidenceIds.includes(e.id))
        .map((e) => e.title);
  const redHerringStats = {
    total: redHerrings.length,
    avoided: redHerrings.length - fooledBy.length,
    fooledBy,
  };

  inv.accusation = { suspectId, motive };
  inv.isCorrect = isCorrect;
  inv.score = score;
  inv.status = "completed";
  inv.completedAt = new Date();
  await inv.save();

  await User.findByIdAndUpdate(userId, {
    $inc: { totalSolved: 1, totalCorrect: isCorrect ? 1 : 0 },
  });

  // Grant the case reward (XP = score, coins = score/20) + any level-up reward.
  const levelUpReward = await grantXpAndCoins(
    userId,
    score,
    Math.floor(score / 20),
  );

  // Secondary progression (season pass / challenges / achievements). Run
  // concurrently and awaited (allSettled never rejects), so a refetch right after
  // submit sees fresh values and one failing hook can't break the others.
  await Promise.allSettled([
    awardSeasonXp(userId, case_.kind === "mini" ? 20 : 50, `case_${case_.kind}`),
    recordChallengeEvent(userId, "case_solved", 1),
    case_.kind === "mini"
      ? recordChallengeEvent(userId, "mini_solved", 1)
      : Promise.resolve(),
    isCorrect && inv.hintsUsed === 0
      ? recordChallengeEvent(userId, "no_hint_solve", 1)
      : Promise.resolve(),
    recordAchievementEvent(userId, "case_solved", 1),
    isPerfect
      ? recordAchievementEvent(userId, "perfect_case", 1)
      : Promise.resolve(),
    addAgencyContribution(userId, case_.kind === "mini" ? 5 : 10, "case"),
    // Reconcile cosmetic unlocks (account level / achievements just earned).
    syncUnlocks(userId),
  ]);

  const streakResult = await updateStreak(userId);

  return {
    isCorrect,
    score,
    solution: case_.solution,
    explanation: case_.solution.explanation,
    streakResult,
    levelUp: levelUpReward,
    isPerfect,
    redHerringStats,
  };
}

export async function getInvestigation(userId: string, caseId: string) {
  return Investigation.findOne({ userId, caseId });
}

export async function useHint(userId: string, caseId: string) {
  const [inv, case_, user] = await Promise.all([
    Investigation.findOne({ userId, caseId }),
    Case.findById(caseId),
    User.findById(userId),
  ]);

  if (!inv) throw new NotFoundError("Investigation");
  if (!case_) throw new NotFoundError("Case");
  if (!user) throw new NotFoundError("User");
  if (inv.status === "completed")
    throw new ValidationError("Investigation already completed");

  if ((user.hints ?? 0) <= 0) {
    throw new ValidationError("No hints remaining. Buy more in the Shop.");
  }

  if (inv.hintsUsed >= 1) {
    throw new ValidationError("You can only use 1 hint per case.");
  }

  const totalEvidence = case_.evidence?.length ?? 0;
  const totalSuspects = case_.suspects?.length ?? 0;
  const inspectedEvidence = inv.inspectedEvidenceIds.length;
  const reviewedSuspects = inv.reviewedSuspectIds.length;

  if (inspectedEvidence < totalEvidence || reviewedSuspects < totalSuspects) {
    throw new ValidationError(
      "Review all evidence and suspects before using a hint.",
    );
  }

  const clearedSuspects = inv.clearedSuspectIds ?? [];
  const guiltySuspectId = case_.solution.suspectId;

  const candidates = case_.suspects
    .filter((s) => s.id !== guiltySuspectId && !clearedSuspects.includes(s.id))
    .map((s) => s.id);

  if (candidates.length === 0) {
    throw new ValidationError("No suspects left to eliminate.");
  }

  const clearedId = candidates[Math.floor(Math.random() * candidates.length)];
  const clearedSuspect = case_.suspects.find((s) => s.id === clearedId)!;

  // Reserve the hint with a single atomic, conditional decrement. The earlier
  // read-then-check above is not race-safe on its own — two near-simultaneous
  // requests could both pass it and both decrement, driving the balance below 0.
  // The `hints: { $gt: 0 }` filter guarantees we only ever charge a hint that
  // actually exists, so the balance can never go negative.
  const charged = await User.findOneAndUpdate(
    { _id: userId, hints: { $gt: 0 } },
    { $inc: { hints: -1 } },
    { new: true },
  );
  if (!charged) {
    throw new ValidationError("No hints remaining. Buy more in the Shop.");
  }

  inv.clearedSuspectIds = [...clearedSuspects, clearedId];
  inv.hintsUsed += 1;
  await inv.save();

  return {
    clearedSuspect: { id: clearedSuspect.id, name: clearedSuspect.name },
    hintsRemaining: charged.hints,
  };
}

// ── Rewarded-ad helps ───────────────────────────────────────────────────────
// These mirror the in-investigation helps but are paid for by watching a
// rewarded ad instead of spending a hint. They count toward `adHelpsUsed`, which
// disqualifies the Perfect badge. The client is trusted to only call these after
// the ad's reward fires (server-side verification can be layered on later).

/** Ad reward: eliminate one innocent suspect (same effect as a hint, no charge). */
export async function adEliminateSuspect(userId: string, caseId: string) {
  const [inv, case_] = await Promise.all([
    Investigation.findOne({ userId, caseId }),
    Case.findById(caseId),
  ]);
  if (!inv) throw new NotFoundError("Investigation");
  if (!case_) throw new NotFoundError("Case");
  if (inv.status === "completed")
    throw new ValidationError("Investigation already completed");

  const cleared = inv.clearedSuspectIds ?? [];
  const guiltySuspectId = case_.solution.suspectId;
  const candidates = case_.suspects
    .filter((s) => s.id !== guiltySuspectId && !cleared.includes(s.id))
    .map((s) => s.id);

  if (candidates.length === 0) {
    throw new ValidationError("No suspects left to eliminate.");
  }

  const clearedId = candidates[Math.floor(Math.random() * candidates.length)];
  const clearedSuspect = case_.suspects.find((s) => s.id === clearedId)!;

  inv.clearedSuspectIds = [...cleared, clearedId];
  inv.adHelpsUsed = (inv.adHelpsUsed ?? 0) + 1;
  await inv.save();

  return { clearedSuspect: { id: clearedSuspect.id, name: clearedSuspect.name } };
}

/** Ad reward: expose one red-herring clue so the player knows to ignore it. */
export async function adRevealRedHerring(userId: string, caseId: string) {
  const [inv, case_] = await Promise.all([
    Investigation.findOne({ userId, caseId }),
    Case.findById(caseId),
  ]);
  if (!inv) throw new NotFoundError("Investigation");
  if (!case_) throw new NotFoundError("Case");
  if (inv.status === "completed")
    throw new ValidationError("Investigation already completed");

  const revealed = inv.revealedRedHerringIds ?? [];
  const remaining = case_.evidence.filter(
    (e) => e.isRedHerring && !revealed.includes(e.id),
  );

  if (remaining.length === 0) {
    throw new ValidationError("No red herrings left to expose.");
  }

  const pick = remaining[Math.floor(Math.random() * remaining.length)];

  inv.revealedRedHerringIds = [...revealed, pick.id];
  inv.adHelpsUsed = (inv.adHelpsUsed ?? 0) + 1;
  await inv.save();

  return { redHerring: { id: pick.id, title: pick.title } };
}

/** Ad reward: double the case reward (XP + coins) once, after completion. */
export async function claimDoubleReward(userId: string, caseId: string) {
  const inv = await Investigation.findOne({ userId, caseId });
  if (!inv) throw new NotFoundError("Investigation");
  if (inv.status !== "completed")
    throw new ValidationError("Finish the case before doubling its reward.");
  if (inv.rewardDoubled)
    throw new ValidationError("This case's reward was already doubled.");

  const bonusXp = inv.score ?? 0;
  const bonusCoins = Math.floor((inv.score ?? 0) / 20);

  inv.rewardDoubled = true;
  await inv.save();

  // Granting the bonus XP can itself trigger a level-up (and its reward).
  const levelUp = await grantXpAndCoins(userId, bonusXp, bonusCoins);

  return { bonusXp, bonusCoins, levelUp };
}

export async function syncProgress(
  userId: string,
  caseId: string,
  progress: {
    inspectedEvidenceIds?: string[];
    reviewedSuspectIds?: string[];
    reviewedStatementIds?: string[];
  },
) {
  const inv = await Investigation.findOne({ userId, caseId });
  if (!inv) throw new NotFoundError("Investigation");
  if (inv.status === "completed") return inv;

  if (progress.inspectedEvidenceIds)
    inv.inspectedEvidenceIds = progress.inspectedEvidenceIds;
  if (progress.reviewedSuspectIds)
    inv.reviewedSuspectIds = progress.reviewedSuspectIds;
  if (progress.reviewedStatementIds)
    inv.reviewedStatementIds = progress.reviewedStatementIds;

  await inv.save();
  return inv;
}
