import { apiClient } from "../../services/api";

export async function getShopApi() {
  const { data } = await apiClient.get("/rewards/shop");
  return data.data;
}

export async function purchaseItemApi(itemId: string) {
  const { data } = await apiClient.post("/rewards/purchase", { itemId });
  return data.data;
}

export async function equipItemApi(itemId: string) {
  const { data } = await apiClient.post("/rewards/equip", { itemId });
  return data.data;
}
