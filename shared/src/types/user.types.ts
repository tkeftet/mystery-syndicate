export type UserRank =
  | "rookie"
  | "junior_detective"
  | "detective"
  | "senior_detective"
  | "inspector"
  | "chief_inspector"
  | "legend";

export interface UserPublicProfile {
  id: string;
  username: string;
  avatar: string;
  rank: UserRank;
  level: number;
  xp: number;
  streak: number;
  totalSolved: number;
  accuracy: number;
}

export interface UserPrivateProfile extends UserPublicProfile {
  email: string;
  coins: number;
  createdAt: string;
  lastActiveAt: string;
}
