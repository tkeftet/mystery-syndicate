import { User } from "./user.model";
import { Investigation } from "../investigations/investigation.model";
import { SeasonProgress } from "../seasons/seasonProgress.model";
import { EventParticipation } from "../events/eventParticipation.model";
import { PassProgress } from "../pass/passProgress.model";
import { UserAchievement } from "../achievements/userAchievement.model";
import { ChallengeProgress } from "../challenges/challengeProgress.model";
import { ProcessedAdReward } from "../ads/processedReward.model";
import { DailyLoginState } from "../dailyLogin/dailyLogin.model";
import { Friendship } from "../friends/friendship.model";
import { ProfileLike } from "../cosmetics/profileLike.model";
import { removeMemberForAccountDeletion } from "../agencies/agencies.service";
import { NotFoundError } from "../../shared/errors/AppError";
import { logger } from "../../utils/logger";

/**
 * Permanently delete a user's account and all personal data — required for
 * App Store / Play Store compliance (in-app account deletion) and GDPR.
 *
 * Order matters: agency membership is settled first (auto-transfer leadership
 * or tear the agency down), then every user-keyed satellite collection is
 * purged, and finally the User document itself. Refresh tokens are stateless
 * JWTs (no server session table), so removing the User is enough to lock out
 * any lingering token — protected routes resolve the user by id and 404.
 */
export async function deleteAccount(userId: string): Promise<void> {
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError("User");

  // Settle agency invariants before the user vanishes.
  await removeMemberForAccountDeletion(userId);

  // Purge every collection that stores this user's data.
  await Promise.all([
    Investigation.deleteMany({ userId }),
    SeasonProgress.deleteMany({ userId }),
    EventParticipation.deleteMany({ userId }),
    PassProgress.deleteMany({ userId }),
    UserAchievement.deleteMany({ userId }),
    ChallengeProgress.deleteMany({ userId }),
    ProcessedAdReward.deleteMany({ userId }),
    DailyLoginState.deleteMany({ userId }),
    Friendship.deleteMany({
      $or: [{ requesterId: userId }, { receiverId: userId }],
    }),
    ProfileLike.deleteMany({ $or: [{ userId }, { targetId: userId }] }),
  ]);

  await User.deleteOne({ _id: userId });
  logger.info(`Account permanently deleted: ${userId}`);
}
