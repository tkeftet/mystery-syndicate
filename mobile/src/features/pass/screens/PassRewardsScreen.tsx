import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import i18n from "../../../i18n";
import { colors, typography, spacing, radii } from "../../../theme";
import type { AppStackParamList } from "../../../screens/HomeScreen";
import { Icon } from "../../../components/ui";
import { usePassRewards } from "../pass.hooks";
import { claimLevelApi, claimAllApi } from "../pass.service";

type Nav = NativeStackNavigationProp<AppStackParamList>;

const TIER_COLOR: Record<string, string> = {
  common: colors.text.muted,
  rare: colors.info,
  epic: "#B58BD6",
  legendary: colors.amber,
};

function rewardSummary(r: any): string {
  const parts: string[] = [];
  if (r.coins) parts.push(i18n.t("pass.coinsUnit", { count: r.coins }));
  if (r.xp) parts.push(i18n.t("pass.xpUnit", { count: r.xp }));
  if (r.badge) parts.push(i18n.t("pass.badge"));
  if (r.title) parts.push(i18n.t("pass.title"));
  if (r.avatar) parts.push(i18n.t("pass.avatar"));
  return parts.join(" · ") || i18n.t("pass.reward");
}

export function PassRewardsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const { data, isLoading } = usePassRewards();
  const [busy, setBusy] = useState<number | "all" | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["pass"] });
    queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
  }

  async function claim(level: number) {
    setBusy(level);
    try {
      await claimLevelApi(level);
      invalidate();
    } catch {
      /* ignore */
    } finally {
      setBusy(null);
    }
  }

  async function claimAll() {
    setBusy("all");
    try {
      await claimAllApi();
      invalidate();
    } catch {
      /* ignore */
    } finally {
      setBusy(null);
    }
  }

  const rewards: any[] = data?.rewards ?? [];
  const hasClaimable = rewards.some((r) => r.status === "claimable");

  return (
    <View style={[styles.safeTop, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="back" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>{t("pass.rewardTrackKicker")}</Text>
          <Text style={styles.headerTitle}>
            {data?.pass?.title ?? t("pass.rewardsTitle")}
          </Text>
        </View>
        {hasClaimable && (
          <TouchableOpacity
            style={styles.claimAllBtn}
            disabled={busy === "all"}
            onPress={claimAll}
          >
            {busy === "all" ? (
              <ActivityIndicator color={colors.text.inverse} size="small" />
            ) : (
              <Text style={styles.claimAllText}>{t("pass.claimAll")}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.amber} style={{ marginTop: spacing[8] }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {rewards.map((r) => {
            const tierColor = TIER_COLOR[r.tier] ?? colors.text.muted;
            const claimed = r.status === "claimed";
            const claimable = r.status === "claimable";
            return (
              <View
                key={r.level}
                style={[styles.row, claimable && styles.rowClaimable]}
              >
                <View style={[styles.levelChip, { borderColor: tierColor }]}>
                  <Text style={[styles.levelChipText, { color: tierColor }]}>
                    {r.level}
                  </Text>
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rewardText}>{rewardSummary(r)}</Text>
                  <Text style={[styles.tierText, { color: tierColor }]}>
                    {String(r.tier).toUpperCase()}
                  </Text>
                </View>
                {claimed ? (
                  <View style={styles.claimedTag}>
                    <Icon name="check" size={13} color={colors.success} />
                  </View>
                ) : claimable ? (
                  <TouchableOpacity
                    style={styles.claimBtn}
                    disabled={busy === r.level}
                    onPress={() => claim(r.level)}
                  >
                    {busy === r.level ? (
                      <ActivityIndicator color={colors.text.inverse} size="small" />
                    ) : (
                      <Text style={styles.claimText}>{t("pass.claim")}</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <Icon name="lock" size={15} color={colors.text.faint} />
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeTop: { flex: 1, backgroundColor: colors.bg.primary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[4],
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    backgroundColor: colors.bg.secondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  kicker: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    letterSpacing: typography.tracking.wider,
    color: colors.text.label,
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.xl,
    color: colors.text.primary,
  },
  claimAllBtn: {
    backgroundColor: colors.amber,
    borderRadius: 999,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  claimAllText: {
    fontFamily: typography.families.monoBold,
    fontSize: typography.sizes.xs,
    color: colors.text.inverse,
  },
  list: { paddingHorizontal: spacing[5], paddingBottom: spacing[16], gap: spacing[2] },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    backgroundColor: colors.bg.secondary,
    borderRadius: radii.md,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  rowClaimable: { borderColor: colors.amber, backgroundColor: colors.amberGlow },
  levelChip: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg.tertiary,
  },
  levelChipText: {
    fontFamily: typography.families.monoBold,
    fontSize: typography.sizes.sm,
  },
  rowInfo: { flex: 1 },
  rewardText: {
    fontFamily: typography.families.medium,
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
  },
  tierText: {
    fontFamily: typography.families.mono,
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 2,
  },
  claimBtn: {
    backgroundColor: colors.amber,
    borderRadius: radii.sm,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    minWidth: 64,
    alignItems: "center",
  },
  claimText: {
    fontFamily: typography.families.monoBold,
    fontSize: typography.sizes.xs,
    color: colors.text.inverse,
  },
  claimedTag: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.success + "1A",
    alignItems: "center",
    justifyContent: "center",
  },
});
