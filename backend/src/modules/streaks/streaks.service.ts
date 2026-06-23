import { User } from "../users/user.model";
import type { IUser } from "../users/user.model";
import { recordAchievementEvent } from "../achievements";

export interface StreakResult {
  streak: number;
  isNewRecord: boolean;
  rewardEarned: StreakReward | null;
}

export interface StreakReward {
  day: number;
  coins: number;
  xp: number;
  label: string;
  badge?: string;
}

const STREAK_REWARDS: StreakReward[] = [
  { day: 1, coins: 50, xp: 100, label: "First Case!", badge: "badge_day1" },
  { day: 3, coins: 100, xp: 200, label: "3 Day Streak!", badge: "badge_day3" },
  {
    day: 7,
    coins: 250,
    xp: 500,
    label: "Week Detective!",
    badge: "badge_week",
  },
  {
    day: 30,
    coins: 1000,
    xp: 2000,
    label: "Monthly Detective!",
    badge: "badge_month",
  },
  {
    day: 100,
    coins: 5000,
    xp: 10000,
    label: "Legend Detective!",
    badge: "badge_legend",
  },
];

export function getStreakReward(streak: number): StreakReward | null {
  return STREAK_REWARDS.find((r) => r.day === streak) ?? null;
}

export async function updateStreak(userId: string): Promise<StreakResult> {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const today = new Date().toISOString().split("T")[0];
  const lastDate = user.lastStreakDate
    ? user.lastStreakDate.toISOString().split("T")[0]
    : null;

  // Already updated today
  if (lastDate === today) {
    return {
      streak: user.streak,
      isNewRecord: false,
      rewardEarned: null,
    };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  // Consecutive day → increment
  // Missed a day → reset to 1
  const newStreak = lastDate === yesterdayStr ? user.streak + 1 : 1;
  const rewardEarned = getStreakReward(newStreak);

  const update: Partial<IUser> = {
    streak: newStreak,
    lastStreakDate: new Date(),
  };

  if (rewardEarned) {
    await User.findByIdAndUpdate(userId, {
      $set: update,
      $inc: {
        coins: rewardEarned.coins,
        xp: rewardEarned.xp,
      },
    });
  } else {
    await User.findByIdAndUpdate(userId, { $set: update });
  }

  // Achievement progress: streak milestones (value mode — set to current streak).
  recordAchievementEvent(userId, "streak_day", newStreak).catch(() => {});

  return {
    streak: newStreak,
    isNewRecord: newStreak > user.streak,
    rewardEarned,
  };
}
