import { apiClient } from "../../services/api";

export type LoginRewardKind =
  | "coins"
  | "xp"
  | "hints"
  | "seasonXp"
  | "title"
  | "avatar";

export interface CalendarReward {
  day: number;
  kind: LoginRewardKind;
  amount: number | null;
  itemId: string | null;
  category: string;
  label: string;
  milestone: boolean;
  bonusCoins: number | null;
  bonusSeasonXp: number | null;
  claimed: boolean;
  current: boolean;
  upcoming: boolean;
}

export interface CalendarData {
  date: string;
  cycleLength: number;
  dayIndex: number;
  claimableDay: number | null;
  canClaim: boolean;
  alreadyClaimedToday: boolean;
  currentStreak: number;
  longestStreak: number;
  streakWillReset: boolean;
  catchUp: { available: boolean; missedDate: string | null; missedDay: number | null };
  monthlyProgress: number;
  remainingDays: number;
  cyclesCompleted: number;
  nextMilestone: number | null;
  rewards: CalendarReward[];
}

export async function getDailyCalendarApi(): Promise<CalendarData> {
  const { data } = await apiClient.get("/daily-login");
  return data.data;
}

export interface ClaimResult {
  claimedDay: number;
  reward: CalendarReward;
  streakReset: boolean;
  currentStreak: number;
  longestStreak: number;
  cycleCompleted: boolean;
}

export async function claimDailyApi(): Promise<ClaimResult> {
  const { data } = await apiClient.post("/daily-login/claim");
  return data.data;
}
