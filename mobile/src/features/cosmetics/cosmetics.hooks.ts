import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCustomizationApi, equipCosmeticApi } from "./cosmetics.service";

export function useCustomization() {
  return useQuery({
    queryKey: ["cosmetics"],
    queryFn: getCustomizationApi,
    staleTime: 30_000,
  });
}

export function useEquipCosmetic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ category, id }: { category: string; id: string | null }) =>
      equipCosmeticApi(category, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cosmetics"] });
      queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
    },
  });
}
