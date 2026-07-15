import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import i18n, { type TranslationKey } from "../../../i18n";
import { colors, typography, spacing, radii } from "../../../theme";
import { Icon, type IconName, Avatar } from "../../../components/ui";
import { AppPopup } from "../../../components/ui/AppPopup";
import { AVATAR_ICONS, TITLE_META } from "../../../constants/iconMappings";
import { getMyProfileApi } from "../../profile/profile.service";
import { useCustomization, useEquipCosmetic } from "../cosmetics.hooks";
import type { CosmeticItem } from "../cosmetics.service";
import {
  RARITY_COLORS,
  BACKGROUND_GRADIENTS,
  backgroundColors,
  nameColorHex,
} from "../cosmeticDisplay";

const RARITY_LABEL_KEY: Record<string, TranslationKey> = {
  common: "rarity.common",
  rare: "rarity.rare",
  epic: "rarity.epic",
  legendary: "rarity.legendary",
  mythic: "rarity.mythic",
};

const CATEGORIES = [
  { key: "frame", labelKey: "customize.catFrames", nullable: true },
  { key: "background", labelKey: "customize.catScenes", nullable: true },
  { key: "avatar", labelKey: "customize.catAvatars", nullable: false },
  { key: "title", labelKey: "customize.catTitles", nullable: true },
  { key: "nameColor", labelKey: "customize.catName", nullable: true },
  { key: "prestigeIcon", labelKey: "customize.catPrestige", nullable: true },
  { key: "badge", labelKey: "customize.catBadges", nullable: true },
] as const;

export function CustomizeProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { data, isLoading } = useCustomization();
  const { data: profile } = useQuery({ queryKey: ["profile", "me"], queryFn: getMyProfileApi });
  const equip = useEquipCosmetic();
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]["key"]>("frame");
  const [popup, setPopup] = useState<{ title: string; message?: string } | null>(null);

  if (isLoading || !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.amber} size="large" />
      </View>
    );
  }

  const eq = data.equipped;
  const bg = backgroundColors(eq.background) ?? BACKGROUND_GRADIENTS.midnight;
  const ring = eq.frame ? RARITY_COLORS[itemRarity(data.items, eq.frame)] : null;
  const nameHex = nameColorHex(eq.nameColor) ?? colors.text.primary;
  const prestige = eq.prestigeIcon ? (cosmeticIcon(data.items, eq.prestigeIcon) as IconName | null) : null;
  const badgeIcon = eq.badge ? (cosmeticIcon(data.items, eq.badge) as IconName | null) : null;
  const titleMeta = eq.title ? TITLE_META[eq.title] : null;
  const username = profile?.username ?? t("customize.detectiveFallback");

  const items = data.items.filter((i) => i.category === cat);
  const activeCat = CATEGORIES.find((c) => c.key === cat)!;

  function onPick(item: CosmeticItem) {
    if (item.equipped) return;
    if (!item.owned) {
      setPopup({
        title: item.name,
        message: t("customize.lockedHint", { hint: item.hint }),
      });
      return;
    }
    equip.mutate({ category: item.category, id: item.id });
  }

  return (
    <View style={[styles.safeTop, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="back" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.kicker}>{t("customize.kicker")}</Text>
          <Text style={styles.headerTitle}>{t("customize.title")}</Text>
        </View>
      </View>

      {/* Live preview */}
      <LinearGradient colors={bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.preview}>
        <Avatar
          size={72}
          icon={AVATAR_ICONS[eq.avatar ?? "default"]}
          initials={username.slice(0, 2).toUpperCase()}
          level={profile?.level ?? 1}
          borderColor={ring ?? colors.border.amber}
        />
        <View style={styles.nameRow}>
          <Text style={[styles.previewName, { color: nameHex }]}>{username}</Text>
          {prestige && <Icon name={prestige} size={16} color={colors.amber} />}
        </View>
        {titleMeta && <Text style={styles.previewTitle}>“{titleMeta.label}”</Text>}
        {badgeIcon && (
          <View style={styles.previewBadge}>
            <Icon name={badgeIcon} size={13} color={colors.amber} />
            <Text style={styles.previewBadgeText}>
              {t("customize.featuredBadge")}
            </Text>
          </View>
        )}
        <Text style={styles.collected}>
          {t("customize.collected", {
            owned: data.ownedCount,
            total: data.totalCount,
            likes: data.profileLikes,
          })}
        </Text>
      </LinearGradient>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsBar}
        contentContainerStyle={styles.tabs}
      >
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.key}
            style={[styles.tab, cat === c.key && styles.tabActive]}
            onPress={() => setCat(c.key)}
          >
            <Text style={[styles.tabText, cat === c.key && styles.tabTextActive]}>
              {t(c.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Items */}
      <ScrollView style={styles.gridScroll} contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {activeCat.nullable && (
          <TouchableOpacity
            style={[styles.cell, !eq[cat] && styles.cellEquipped]}
            onPress={() => equip.mutate({ category: cat, id: null })}
          >
            <View style={styles.cellIcon}>
              <Icon name="close" size={20} color={colors.text.muted} />
            </View>
            <Text style={styles.cellName} numberOfLines={1}>
              {t("customize.none")}
            </Text>
            <Text style={styles.cellRarity}>{t("customize.default")}</Text>
          </TouchableOpacity>
        )}
        {items.map((item) => (
          <ItemCell key={item.id} item={item} onPress={() => onPick(item)} />
        ))}
      </ScrollView>

      <AppPopup
        visible={!!popup}
        title={popup?.title ?? ""}
        message={popup?.message}
        variant="info"
        onClose={() => setPopup(null)}
        buttons={[
          {
            label: t("customize.gotIt"),
            variant: "primary",
            onPress: () => setPopup(null),
          },
        ]}
      />
    </View>
  );
}

function ItemCell({ item, onPress }: { item: CosmeticItem; onPress: () => void }) {
  const rarity = RARITY_COLORS[item.rarity];
  const isSwatch = item.category === "nameColor";
  const isBg = item.category === "background";
  const bgColors = isBg ? backgroundColors(item.id) : null;

  return (
    <TouchableOpacity
      style={[styles.cell, { borderColor: item.equipped ? colors.amber : colors.border.subtle }, !item.owned && styles.cellLocked]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={[styles.cellIcon, { borderColor: rarity }]}>
        {isSwatch ? (
          <View style={[styles.swatch, { backgroundColor: item.value ?? "#fff" }]} />
        ) : isBg && bgColors ? (
          <LinearGradient colors={bgColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.swatch} />
        ) : (
          <Icon name={(item.value as IconName) ?? "star"} size={20} color={item.owned ? rarity : colors.text.faint} />
        )}
        {!item.owned && (
          <View style={styles.lockBadge}>
            <Icon name="lock" size={10} color={colors.text.primary} />
          </View>
        )}
        {item.equipped && (
          <View style={styles.equippedBadge}>
            <Icon name="check" size={10} color={colors.text.inverse} />
          </View>
        )}
      </View>
      <Text style={styles.cellName} numberOfLines={1}>{item.name}</Text>
      <Text style={[styles.cellRarity, { color: rarity }]}>
        {RARITY_LABEL_KEY[item.rarity]
          ? i18n.t(RARITY_LABEL_KEY[item.rarity])
          : item.rarity}
      </Text>
    </TouchableOpacity>
  );
}

function itemRarity(items: CosmeticItem[], id: string) {
  return items.find((i) => i.id === id)?.rarity ?? "common";
}
function cosmeticIcon(items: CosmeticItem[], id: string): string | null {
  return items.find((i) => i.id === id)?.value ?? null;
}

const CELL = "30%";

const styles = StyleSheet.create({
  safeTop: { flex: 1, backgroundColor: colors.bg.primary },
  centered: { flex: 1, backgroundColor: colors.bg.primary, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[3],
  },
  backBtn: {
    width: 38, height: 38, borderRadius: radii.sm,
    backgroundColor: colors.bg.secondary, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  kicker: {
    fontFamily: typography.families.mono, fontSize: typography.sizes.xs,
    letterSpacing: typography.tracking.wider, color: colors.text.label, marginBottom: 2,
  },
  headerTitle: {
    fontFamily: typography.families.display, fontSize: typography.sizes["2xl"], color: colors.text.primary,
  },

  preview: {
    marginHorizontal: spacing[5],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: "center",
    paddingVertical: spacing[5],
    marginBottom: spacing[3],
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing[3] },
  previewName: { fontFamily: typography.families.display, fontSize: typography.sizes.xl },
  previewTitle: {
    fontFamily: typography.families.displayItalic, fontSize: typography.sizes.sm,
    color: colors.text.secondary, marginTop: 2,
  },
  previewBadge: {
    flexDirection: "row", alignItems: "center", gap: 5, marginTop: spacing[3],
    backgroundColor: colors.amberGlow, borderRadius: radii.pill,
    paddingHorizontal: spacing[3], paddingVertical: spacing[1],
  },
  previewBadgeText: { fontFamily: typography.families.mono, fontSize: 9.5, color: colors.amber, letterSpacing: 0.5 },
  collected: {
    fontFamily: typography.families.mono, fontSize: typography.sizes.xs,
    color: colors.text.muted, marginTop: spacing[3],
  },

  tabsBar: { flexGrow: 0, flexShrink: 0 },
  tabs: { paddingHorizontal: spacing[5], gap: spacing[2], paddingBottom: spacing[3], alignItems: "center" },
  tab: {
    paddingHorizontal: spacing[3], paddingVertical: spacing[2],
    borderRadius: radii.pill, backgroundColor: colors.bg.secondary,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  tabActive: { backgroundColor: colors.amber, borderColor: colors.amber },
  tabText: { fontFamily: typography.families.mono, fontSize: typography.sizes.xs, color: colors.text.muted, letterSpacing: 0.5 },
  tabTextActive: { color: colors.text.inverse },

  gridScroll: { flex: 1 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    columnGap: spacing[3],
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[16],
    rowGap: spacing[3],
  },
  cell: {
    width: CELL,
    backgroundColor: colors.bg.secondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: "center",
    paddingVertical: spacing[3],
    gap: 4,
  },
  cellEquipped: { borderColor: colors.amber },
  cellLocked: { opacity: 0.6 },
  cellIcon: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.bg.elevated,
  },
  swatch: { width: 26, height: 26, borderRadius: 13 },
  lockBadge: {
    position: "absolute", bottom: -2, end: -2,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.bg.tertiary, borderWidth: 1, borderColor: colors.border.strong,
    alignItems: "center", justifyContent: "center",
  },
  equippedBadge: {
    position: "absolute", bottom: -2, end: -2,
    width: 18, height: 18, borderRadius: 9, backgroundColor: colors.amber,
    alignItems: "center", justifyContent: "center",
  },
  cellName: {
    fontFamily: typography.families.display, fontSize: typography.sizes.sm,
    color: colors.text.primary, textAlign: "center", paddingHorizontal: 4,
  },
  cellRarity: { fontFamily: typography.families.mono, fontSize: 8.5, letterSpacing: 0.6, color: colors.text.muted },
});
