import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../auth";
import { User } from "./user.model";
import { Investigation } from "../investigations/investigation.model";
import { Case } from "../cases/case.model";
import { NotFoundError, ValidationError } from "../../shared/errors/AppError";
import { getFriendStatus, isOnline } from "../friends";
import { getAchievementScore } from "../achievements";
import { getShowcaseExtras } from "../cosmetics";

export async function getMyProfileController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = await User.findById(req.userId).select("-passwordHash");
    if (!user) throw new NotFoundError("User");

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        rank: user.rank,
        level: user.level,
        xp: user.xp,
        coins: user.coins,
        hints: user.hints ?? 0, // ← ajoute
        inventory: user.inventory ?? [], // ← ajoute
        title: user.title ?? null, // ← ajoute
        streak: user.streak,
        totalSolved: user.totalSolved,
        accuracy: user.accuracy,
        achievementScore: await getAchievementScore(user.id),
        // Equipped cosmetics + social (for the Profile header / showcase).
        activeFrame: user.activeFrame ?? null,
        activeBackground: user.activeBackground ?? null,
        activeNameColor: user.activeNameColor ?? null,
        activePrestigeIcon: user.activePrestigeIcon ?? null,
        featuredBadge: user.featuredBadge ?? null,
        featuredAchievement: user.featuredAchievement ?? null,
        profileLikes: user.profileLikes ?? 0,
        profileViews: user.profileViews ?? 0,
        isGuest: user.isGuest,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyHistoryController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const investigations = await Investigation.find({
      userId: req.userId,
      status: "completed",
    })
      .sort({ completedAt: -1 })
      .limit(20);

    const caseIds = investigations.map((inv) => inv.caseId);
    const cases = await Case.find({ _id: { $in: caseIds } }).select(
      "title type difficulty maxScore",
    );

    const casesMap = new Map(cases.map((c) => [c.id, c]));

    const history = investigations.map((inv) => {
      const case_ = casesMap.get(inv.caseId);
      return {
        caseId: inv.caseId,
        title: case_?.title ?? "Unknown Case",
        type: case_?.type ?? "unknown",
        difficulty: case_?.difficulty ?? "easy",
        score: inv.score,
        isCorrect: inv.isCorrect,
        completedAt: inv.completedAt,
      };
    });

    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
}

export async function updatePushTokenController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { token } = req.body ?? {};
    const isExpoToken =
      typeof token === "string" &&
      (token.startsWith("ExponentPushToken") ||
        token.startsWith("ExpoPushToken"));
    if (!isExpoToken) {
      throw new ValidationError("A valid Expo push token is required");
    }

    await User.findByIdAndUpdate(req.userId, { pushToken: token });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function getPublicProfileController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = await User.findById(req.params.userId).select(
      "username avatar rank level xp streak totalSolved totalCorrect title privacy lastSeenAt",
    );
    if (!user) throw new NotFoundError("User");

    const friendStatus = await getFriendStatus(req.userId!, user.id);
    const isFriend = friendStatus === "friends" || friendStatus === "self";

    // Cosmetic showcase + social (also counts a profile view).
    const showcase = await getShowcaseExtras(user.id, req.userId!);

    // Respect privacy: stats hidden unless public, or you're a friend/self.
    const showStats =
      user.privacy?.showStats !== false &&
      (user.privacy?.profileVisibility !== "private" || isFriend) &&
      (user.privacy?.profileVisibility !== "friends" || isFriend);
    const showOnline = user.privacy?.showOnline !== false;
    const showLastSeen = user.privacy?.showLastSeen !== false;

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        rank: user.rank,
        level: user.level,
        title: user.title ?? null,
        friendStatus,
        online: showOnline ? isOnline(user.lastSeenAt) : false,
        lastSeenAt: showLastSeen ? user.lastSeenAt : null,
        achievementScore: await getAchievementScore(user.id),
        // Stats gated by privacy.
        xp: showStats ? user.xp : null,
        streak: showStats ? user.streak : null,
        totalSolved: showStats ? user.totalSolved : null,
        accuracy: showStats ? user.accuracy : null,
        statsHidden: !showStats,
        // Cosmetic showcase + social.
        ...showcase,
      },
    });
  } catch (err) {
    next(err);
  }
}
