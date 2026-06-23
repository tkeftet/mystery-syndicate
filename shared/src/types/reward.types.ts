export type RewardType = "xp" | "coins" | "badge" | "avatar" | "title";

export interface Reward {
  type: RewardType;
  amount?: number;
  itemId?: string;
  label: string;
}

export interface StreakReward {
  day: number;
  rewards: Reward[];
}
