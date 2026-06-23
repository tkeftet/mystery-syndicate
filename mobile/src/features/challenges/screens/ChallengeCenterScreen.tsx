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
import { colors, typography, spacing, radii } from "../../../theme";
import type { AppStackParamList } from "../../../screens/HomeScreen";
import { Icon, ProgressBar } from "../../../components/ui";
import { useChallenges } from "../challenges.hooks";
import { claimChallengeApi, claimAllChallengesApi } from "../challenges.service";

type Nav = NativeStackNavigationProp<AppStackParamList>;

const PERIODS: { key: string; label: string }[] = [
  { key: "daily", label: "DAILY" },
  { key: "weekly", label: "WEEKLY" },
  { key: "monthly", label: "MONTHLY" },
];

function ChallengeCard({
  c,
  busy,
  onClaim,
}: {
  c: any;
  busy: boolean;
  onClaim: () => void;
}) {
  const pct = Math.min(c.progress / c.target, 1);
  return (
    <View style={[styles.card, c.completed && !c.claimed && styles.cardReady]}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle}>{c.title}</Text>
        <View style={styles.xpChip}>
          <Icon name="star" size={11} color={colors.amber} />
          <Text style={styles.xpChipText}>+{c.rewardSeasonXp}</Text>
        </View>
      </View>
      <Text style={styles.cardDesc}>{c.description}</Text>
      <View style={styles.progressRow}>
        <View style={styles.barWrap}>
          <ProgressBar progress={pct} />
        </View>
        <Text style={styles.progressText}>
          {Math.min(c.progress, c.target)}/{c.target}
        </Text>
      </View>
      {c.claimed ? (
        <View style={styles.claimedRow}>
          <Icon name="checkCircle" size={13} color={colors.success} />
          <Text style={styles.claimedText}>Claimed</Text>
        </View>
      ) : c.completed ? (
        <TouchableOpacity style={styles.claimBtn} disabled={busy} onPress={onClaim}>
          {busy ? (
            <ActivityIndicator color={colors.text.inverse} size="small" />
          ) : (
            <Text style={styles.claimText}>
              Claim +{c.rewardSeasonXp} XP
              {c.rewardCoins ? ` · ${c.rewardCoins} coins` : ""}
            </Text>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function ChallengeCenterScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const { data: challenges, isLoading } = useChallenges();
  const [busy, setBusy] = useState<string | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["challenges"] });
    queryClient.invalidateQueries({ queryKey: ["pass"] });
    queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
  }

  async function claim(key: string) {
    setBusy(key);
    try {
      await claimChallengeApi(key);
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
      await claimAllChallengesApi();
      invalidate();
    } catch {
      /* ignore */
    } finally {
      setBusy(null);
    }
  }

  const list: any[] = challenges ?? [];
  const hasClaimable = list.some((c) => c.completed && !c.claimed);

  return (
    <View style={[styles.safeTop, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="back" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>// CHALLENGES</Text>
          <Text style={styles.headerTitle}>Challenge Center</Text>
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
              <Text style={styles.claimAllText}>Claim All</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.amber} style={{ marginTop: spacing[8] }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {PERIODS.map((p) => {
            const items = list.filter((c) => c.period === p.key);
            if (items.length === 0) return null;
            return (
              <View key={p.key}>
                <Text style={styles.sectionLabel}>{p.label}</Text>
                {items.map((c) => (
                  <ChallengeCard
                    key={c.key}
                    c={c}
                    busy={busy === c.key}
                    onClaim={() => claim(c.key)}
                  />
                ))}
              </View>
            );
          })}
          {list.length === 0 && (
            <Text style={styles.empty}>No challenges available right now.</Text>
          )}
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
  list: { paddingHorizontal: spacing[5], paddingBottom: spacing[16] },
  sectionLabel: {
    fontFamily: typography.families.mono,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.text.label,
    marginTop: spacing[4],
    marginBottom: spacing[3],
  },
  card: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[4],
    marginBottom: spacing[2],
  },
  cardReady: { borderColor: colors.amber },
  cardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    flex: 1,
  },
  xpChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.amberGlow,
    borderRadius: 999,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
  },
  xpChipText: {
    fontFamily: typography.families.monoBold,
    fontSize: typography.sizes.xs,
    color: colors.amber,
  },
  cardDesc: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing[3],
  },
  progressRow: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  barWrap: { flex: 1 },
  progressText: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
  },
  claimBtn: {
    marginTop: spacing[3],
    backgroundColor: colors.amber,
    borderRadius: radii.sm,
    paddingVertical: spacing[3],
    alignItems: "center",
  },
  claimText: {
    fontFamily: typography.families.monoBold,
    fontSize: typography.sizes.sm,
    color: colors.text.inverse,
  },
  claimedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing[3],
  },
  claimedText: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    color: colors.success,
  },
  empty: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
    textAlign: "center",
    paddingVertical: spacing[8],
  },
});
