import { apiClient } from "../../services/api";

export type CosmeticCategory =
  | "frame"
  | "background"
  | "nameColor"
  | "prestigeIcon"
  | "badge"
  | "avatar"
  | "title";

export type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic";

export interface CosmeticItem {
  id: string;
  category: CosmeticCategory;
  name: string;
  rarity: Rarity;
  source: string;
  value: string | null;
  hint: string;
  owned: boolean;
  equipped: boolean;
}

export interface CustomizationData {
  items: CosmeticItem[];
  equipped: Record<string, string | null>;
  profileLikes: number;
  profileViews: number;
  ownedCount: number;
  totalCount: number;
}

export async function getCustomizationApi(): Promise<CustomizationData> {
  const { data } = await apiClient.get("/cosmetics");
  return data.data;
}

export async function equipCosmeticApi(category: string, id: string | null) {
  const { data } = await apiClient.post("/cosmetics/equip", { category, id });
  return data.data;
}

export async function likeProfileApi(userId: string) {
  const { data } = await apiClient.post(`/cosmetics/like/${userId}`);
  return data.data as { liked: boolean };
}
