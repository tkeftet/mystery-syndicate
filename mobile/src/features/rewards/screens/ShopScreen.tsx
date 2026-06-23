import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography, spacing, radii, shadows, gradients } from "../../../theme";
import { getShopApi, purchaseItemApi, equipItemApi } from "../rewards.service";
import { getMyProfileApi } from "../../profile/profile.service";
import {
  AppPopup,
  type PopupVariant,
  type PopupButton,
} from "../../../components/ui/AppPopup";
import { Icon, type IconName } from "../../../components/ui/Icon";
import { GradientButton, AppMenu } from "../../../components/ui";
import { AVATAR_ICONS, TITLE_META } from "../../../constants/iconMappings";
import { levelForXp } from "../../../utils/leveling";

type ShopTab = "hints" | "avatars" | "titles";

type PopupState = {
  title: string;
  message?: string;
  variant?: PopupVariant;
  buttons?: PopupButton[];
};

function shopItemIcon(item: any): IconName {
  if (item?.type === "avatar") return AVATAR_ICONS[item.id] ?? "user";
  if (item?.type === "title") return TITLE_META[item.id]?.icon ?? "star";
  return "hint";
}

export function ShopScreen() {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<ShopTab>("hints");
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState<any>(null);
  const [popup, setPopup] = useState<PopupState | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ["shop"],
    queryFn: getShopApi,
    staleTime: 1000 * 60 * 10,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: getMyProfileApi,
    staleTime: 1000 * 60 * 2,
  });

  const filteredItems = items?.filter((item: any) => {
    if (activeTab === "hints") return item.type === "hint";
    if (activeTab === "avatars") return item.type === "avatar";
    if (activeTab === "titles") return item.type === "title";
    return true;
  });

  const owned: string[] = profile?.inventory ?? [];
  const userLevel = levelForXp(profile?.xp ?? 0);

  async function handlePurchase(item: any) {
    if (owned.includes(item.id)) {
      handleEquip(item);
      return;
    }

    if (item.requiredLevel && userLevel < item.requiredLevel) {
      setPopup({
        variant: "warning",
        title: "Locked",
        message: `Reach Level ${item.requiredLevel} to unlock ${item.name}. You're Level ${userLevel}.`,
      });
      return;
    }

    if ((profile?.coins ?? 0) < item.price) {
      setPopup({
        variant: "warning",
        title: "Not enough coins",
        message: `${item.name} costs ${item.price} coins, but you only have ${profile?.coins ?? 0}. Solve more cases to earn coins.`,
      });
      return;
    }

    setPopup({
      variant: "info",
      title: `Buy ${item.name}?`,
      message: `This will cost ${item.price} coins.\nYou have ${profile?.coins ?? 0} coins.`,
      buttons: [
        { label: "Cancel", variant: "secondary", onPress: () => setPopup(null) },
        { label: "Buy", variant: "primary", onPress: () => confirmPurchase(item) },
      ],
    });
  }

  async function confirmPurchase(item: any) {
    setPopup(null);
    setPurchasing(item.id);
    try {
      const result = await purchaseItemApi(item.id);
      await queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
      setShowSuccess({ item, result });
    } catch (err: any) {
      setPopup({
        variant: "danger",
        title: "Purchase Failed",
        message: err?.response?.data?.error?.message ?? "Not enough coins",
      });
    } finally {
      setPurchasing(null);
    }
  }

  async function handleEquip(item: any) {
    try {
      const res = await equipItemApi(item.id);
      await queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
      const nowEquipped = !!res?.equipped;
      setPopup({
        variant: "success",
        title: nowEquipped ? "Equipped!" : "Removed",
        message: nowEquipped
          ? `${item.name} is now active.`
          : `${item.name} is no longer active.`,
      });
    } catch (err: any) {
      setPopup({
        variant: "danger",
        title: "Error",
        message: err?.response?.data?.error?.message ?? "Failed to equip",
      });
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.amber} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[3] }]}>
        <View>
          <Text style={styles.kicker}>// SHOP</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.coinsBadge}>
            <Icon name="coin" size={16} color={colors.amber} />
            <Text style={styles.coinsText} allowFontScaling={false}>
              {profile?.coins ?? 0}
            </Text>
          </View>
          <AppMenu />
        </View>
      </View>

      {/* ── Hints Balance ── */}
      <View style={styles.hintsBar}>
        <Icon name="hint" size={15} color={colors.amber} />
        <Text style={styles.hintsText}> Hints available: </Text>
        <Text style={styles.hintsCount} allowFontScaling={false}>
          {Math.max(0, profile?.hints ?? 0)}
        </Text>
      </View>

      {/* ── Tabs ── */}
      <View style={styles.tabs}>
        {(["hints", "avatars", "titles"] as ShopTab[]).map((tab) => {
          const isActive = activeTab === tab;
          const tabIcon: IconName =
            tab === "hints" ? "hint" : tab === "avatars" ? "user" : "tag";
          const tabColor = isActive ? colors.text.inverse : colors.text.muted;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Icon name={tabIcon} size={15} color={tabColor} />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab === "hints"
                  ? "Hints"
                  : tab === "avatars"
                    ? "Avatars"
                    : "Titles"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Items ── */}
      <ScrollView contentContainerStyle={styles.itemsList}>
        {filteredItems?.map((item: any) => {
          const isOwned = owned.includes(item.id);
          const isEquipped =
            (item.type === "avatar" && profile?.avatar === item.id) ||
            (item.type === "title" && profile?.title === item.id);
          const canAfford = (profile?.coins ?? 0) >= item.price;
          const locked =
            !isOwned && !!item.requiredLevel && userLevel < item.requiredLevel;

          return (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemLeft}>
                <LinearGradient
                  colors={gradients.avatar}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.itemIconWrap}
                >
                  <Icon
                    name={shopItemIcon(item)}
                    size={22}
                    color={colors.amberLight}
                  />
                </LinearGradient>
                <View style={styles.itemInfo}>
                  <View style={styles.itemNameRow}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {isEquipped && (
                      <View style={styles.equippedBadge}>
                        <View style={styles.equippedDot} />
                        <Text style={styles.equippedText}>ACTIVE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.itemDesc}>{item.description}</Text>
                  {item.quantity && (
                    <Text style={styles.itemQuantity}>
                      ×{item.quantity} hints
                    </Text>
                  )}
                  {locked && (
                    <View style={styles.lockRow}>
                      <Icon name="lock" size={11} color={colors.text.muted} />
                      <Text style={styles.lockText}>
                        Requires Level {item.requiredLevel}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.buyButton,
                  isOwned && !isEquipped && styles.buyButtonOwned,
                  isEquipped && styles.buyButtonEquipped,
                  !isOwned && (locked || !canAfford) && styles.buyButtonCantAfford,
                ]}
                onPress={() => handlePurchase(item)}
                disabled={purchasing === item.id}
              >
                {purchasing === item.id ? (
                  <ActivityIndicator color={colors.text.inverse} size="small" />
                ) : isEquipped ? (
                  <View style={styles.equippedRow}>
                    <Icon name="check" size={15} color={colors.text.inverse} />
                    <Text style={styles.buyButtonText}>ON</Text>
                  </View>
                ) : isOwned ? (
                  <Text style={styles.buyButtonText}>EQUIP</Text>
                ) : locked ? (
                  <View style={styles.equippedRow}>
                    <Icon name="lock" size={13} color={colors.text.muted} />
                    <Text
                      style={[styles.buyButtonText, styles.buyButtonTextCantAfford]}
                    >
                      LVL {item.requiredLevel}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.priceRow}>
                    <Icon
                      name="coin"
                      size={14}
                      color={canAfford ? colors.text.inverse : colors.text.muted}
                    />
                    <Text
                      style={[
                        styles.buyButtonText,
                        !canAfford && styles.buyButtonTextCantAfford,
                      ]}
                      allowFontScaling={false}
                    >
                      {item.price}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      {/* ── Themed Popup (alerts / confirmations) ── */}
      <AppPopup
        visible={!!popup}
        title={popup?.title ?? ""}
        message={popup?.message}
        variant={popup?.variant}
        buttons={popup?.buttons}
        onClose={() => setPopup(null)}
      />

      {/* ── Success Modal ── */}
      <Modal visible={!!showSuccess} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <LinearGradient
              colors={gradients.seal}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.modalIconWrap, shadows.glow]}
            >
              <Icon
                name={shopItemIcon(showSuccess?.item)}
                size={36}
                color={colors.text.inverse}
              />
            </LinearGradient>
            <Text style={styles.modalKicker}>PURCHASED</Text>
            <Text style={styles.modalTitle}>{showSuccess?.item?.name}</Text>
            <View style={styles.modalCoinsRow}>
              <Icon name="coin" size={15} color={colors.amber} />
              <Text style={styles.modalCoins}>
                {showSuccess?.result?.coinsRemaining} coins remaining
              </Text>
            </View>
            <GradientButton
              label="Continue"
              style={styles.modalButton}
              onPress={() => setShowSuccess(null)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[4],
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  kicker: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    letterSpacing: typography.tracking.wider,
    color: colors.text.label,
    marginBottom: 4,
  },
  title: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes["2xl"],
    color: colors.text.primary,
  },
  coinsBadge: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    backgroundColor: colors.amberGlow,
    borderWidth: 1,
    borderColor: colors.amber,
    borderRadius: 20,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  coinIcon: {
    fontSize: typography.sizes.base,
  },
  coinsText: {
    fontFamily: typography.families.bold,
    fontSize: typography.sizes.base,
    color: colors.amber,
  },
  hintsBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing[5],
    marginBottom: spacing[4],
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  hintsText: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  hintsCount: {
    fontFamily: typography.families.bold,
    fontSize: typography.sizes.sm,
    color: colors.amber,
  },
  tabs: {
    flexDirection: "row",
    marginHorizontal: spacing[5],
    marginBottom: spacing[4],
    backgroundColor: colors.bg.secondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: spacing[2],
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: radii.sm,
  },
  tabActive: {
    backgroundColor: colors.amber,
  },
  tabText: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    letterSpacing: 0.6,
    color: colors.text.muted,
  },
  tabTextActive: {
    color: colors.text.inverse,
  },
  itemsList: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[16],
    gap: spacing[3],
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.secondary,
    borderRadius: radii.lg,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.default,
    ...shadows.card,
  },
  itemLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  itemIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  itemInfo: {
    flex: 1,
  },
  itemNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing[2],
    marginBottom: 2,
  },
  itemName: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    flexShrink: 1,
  },
  equippedBadge: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.success + "1A",
    borderWidth: 1,
    borderColor: colors.success + "66",
    borderRadius: 999,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
  },
  equippedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  equippedText: {
    fontFamily: typography.families.mono,
    fontSize: 9,
    color: colors.success,
    letterSpacing: 1,
  },
  itemDesc: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
    lineHeight: typography.sizes.xs * 1.4,
  },
  itemQuantity: {
    fontFamily: typography.families.medium,
    fontSize: typography.sizes.xs,
    color: colors.amber,
    marginTop: 2,
  },
  lockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  lockText: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
    letterSpacing: 0.4,
  },
  buyButton: {
    flexShrink: 0,
    alignSelf: "center",
    width: 92,
    backgroundColor: colors.amber,
    borderRadius: radii.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    alignItems: "stretch",
    justifyContent: "center",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  equippedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  priceIcon: {
    fontSize: typography.sizes.sm,
  },
  buyButtonOwned: {
    backgroundColor: colors.info,
  },
  buyButtonEquipped: {
    backgroundColor: colors.success,
  },
  buyButtonCantAfford: {
    backgroundColor: colors.bg.tertiary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  buyButtonText: {
    fontFamily: typography.families.monoBold,
    fontSize: typography.sizes.sm,
    color: colors.text.inverse,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  buyButtonTextCantAfford: {
    color: colors.text.muted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing[6],
  },
  modalCard: {
    backgroundColor: colors.bg.elevated,
    borderRadius: radii.xl,
    padding: spacing[8],
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border.amber,
    width: "100%",
    gap: spacing[3],
  },
  modalIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  modalKicker: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    letterSpacing: 2.4,
    color: colors.amberLight,
  },
  modalTitle: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.xl,
    color: colors.text.primary,
  },
  modalCoinsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  modalCoins: {
    fontFamily: typography.families.medium,
    fontSize: typography.sizes.base,
    color: colors.amber,
  },
  modalButton: {
    width: "100%",
    marginTop: spacing[2],
  },
});
