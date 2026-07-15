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
import { colors, typography, spacing, radii, gradients } from "../../../theme";
import { Icon, type IconName, GradientButton } from "../../../components/ui";
import { AppPopup, type PopupVariant } from "../../../components/ui/AppPopup";
import { getMyProfileApi } from "../../profile/profile.service";
import { showRewardedAd } from "../../../services/ads";
import { useDailyCalendar, useClaimDaily } from "../dailyLogin.hooks";
import type { CalendarReward, LoginRewardKind } from "../dailyLogin.service";

function rewardIcon(kind: LoginRewardKind): IconName {
  switch (kind) {
    case "coins": return "coin";
    case "xp": return "star";
    case "hints": return "hint";
    case "seasonXp": return "sparkles";
    case "title": return "tag";
    case "avatar": return "user";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function DailyLoginScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { data: cal, isLoading, refetch } = useDailyCalendar();
  const { data: profile } = useQuery({ queryKey: ["profile", "me"], queryFn: getMyProfileApi });
  const claim = useClaimDaily();

  const [saving, setSaving] = useState(false);
  const [popup, setPopup] = useState<
    { title: string; message?: string; variant?: PopupVariant; icon?: IconName } | null
  >(null);

  async function onClaim() {
    try {
      const res = await claim.mutateAsync();
      setPopup({
        variant: "success",
        icon: rewardIcon(res.reward.kind),
        title: t("dailyLogin.dayClaimed", { day: res.claimedDay }),
        message: res.streakReset
          ? t("dailyLogin.claimStreakReset", { label: res.reward.label })
          : t("dailyLogin.claimStreak", {
              label: res.reward.label,
              count: res.currentStreak,
            }),
      });
    } catch (err: any) {
      setPopup({
        variant: "warning",
        title: t("dailyLogin.claimFailed"),
        message:
          err?.response?.data?.error?.message ??
          t("dailyLogin.tryAgainMoment"),
      });
    }
  }

  async function onRestore() {
    if (!cal?.catchUp.missedDay) return;
    setSaving(true);
    const ok = await showRewardedAd({
      userId: profile?.id,
      customData: JSON.stringify({ type: "streaksave" }),
    });
    if (!ok) {
      setSaving(false);
      setPopup({
        variant: "warning",
        title: t("dailyLogin.adNotCompleted"),
        message: t("dailyLogin.watchFullAd"),
      });
      return;
    }
    // The reward is granted server-side via AdMob's verified callback (async),
    // so poll the calendar until the catch-up is reflected.
    for (let i = 0; i < 6; i++) {
      await sleep(1500);
      const { data } = await refetch();
      if (data && !data.catchUp.available) break;
    }
    setSaving(false);
    setPopup({
      variant: "success",
      icon: "streak",
      title: t("dailyLogin.streakRestored"),
      message: t("dailyLogin.streakRestoredMsg"),
    });
  }

  if (isLoading || !cal) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.amber} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.safeTop, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="back" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.kicker}>{t("dailyLogin.kicker")}</Text>
          <Text style={styles.headerTitle}>{t("dailyLogin.title")}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Streak summary ── */}
        <LinearGradient
          colors={gradients.darkCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summary}
        >
          <View style={styles.summaryStat}>
            <View style={styles.summaryValueRow}>
              <Icon name="streak" size={18} color={colors.amber} />
              <Text style={styles.summaryValue}>{cal.currentStreak}</Text>
            </View>
            <Text style={styles.summaryLabel}>{t("home.dayStreak")}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{cal.monthlyProgress}/{cal.cycleLength}</Text>
            <Text style={styles.summaryLabel}>
              {t("dailyLogin.thisMonth")}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryValue, { color: colors.amberLight }]}>
              {cal.longestStreak}
            </Text>
            <Text style={styles.summaryLabel}>
              {t("dailyLogin.bestStreak")}
            </Text>
          </View>
        </LinearGradient>

        {cal.nextMilestone && (
          <Text style={styles.milestoneHint}>
            <Icon name="trophy" size={11} color={colors.amber} />{"  "}
            {t("dailyLogin.nextMilestone", { day: cal.nextMilestone })}
          </Text>
        )}

        {/* ── Catch-up (missed a day) ── */}
        {cal.catchUp.available && (
          <View style={styles.catchUp}>
            <View style={styles.catchUpText}>
              <Text style={styles.catchUpTitle}>
                {t("dailyLogin.missedDay")}
              </Text>
              <Text style={styles.catchUpSub}>
                {t("dailyLogin.missedDaySub", {
                  day: cal.catchUp.missedDay,
                })}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.restoreBtn}
              onPress={onRestore}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.text.inverse} />
              ) : (
                <>
                  <Icon name="play" size={13} color={colors.text.inverse} />
                  <Text style={styles.restoreText}>
                    {t("dailyLogin.restore")}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Streak-lost warning (gap too big to catch up) ── */}
        {cal.streakWillReset && !cal.catchUp.available && (
          <View style={styles.warn}>
            <Icon name="warning" size={14} color={colors.warning} />
            <Text style={styles.warnText}>
              {t("dailyLogin.streakLapsed")}
            </Text>
          </View>
        )}

        {/* ── Claim CTA ── */}
        {cal.canClaim ? (
          <GradientButton
            label={t("dailyLogin.claimDay", { day: cal.claimableDay })}
            iconRight="arrowRight"
            loading={claim.isPending}
            onPress={onClaim}
            style={styles.claimBtn}
          />
        ) : (
          <View style={styles.claimedBanner}>
            <Icon name="check" size={15} color={colors.green} />
            <Text style={styles.claimedText}>
              {t("dailyLogin.todayClaimed")}
            </Text>
          </View>
        )}

        {/* ── 30-day grid ── */}
        <View style={styles.grid}>
          {cal.rewards.map((r) => (
            <RewardCell key={r.day} reward={r} />
          ))}
        </View>
      </ScrollView>

      <AppPopup
        visible={!!popup}
        title={popup?.title ?? ""}
        message={popup?.message}
        variant={popup?.variant}
        icon={popup?.icon}
        onClose={() => setPopup(null)}
        buttons={[
          {
            label: t("dailyLogin.nice"),
            variant: "primary",
            onPress: () => setPopup(null),
          },
        ]}
      />
    </View>
  );
}

function RewardCell({ reward: r }: { reward: CalendarReward }) {
  const accent = r.milestone ? colors.amber : colors.text.muted;
  return (
    <View
      style={[
        styles.cell,
        r.milestone && styles.cellMilestone,
        r.current && styles.cellCurrent,
        r.claimed && styles.cellClaimed,
      ]}
    >
      <Text style={[styles.cellDay, r.current && { color: colors.text.inverse }]}>
        {r.day}
      </Text>
      <Icon
        name={r.claimed ? "check" : rewardIcon(r.kind)}
        size={18}
        color={r.claimed ? colors.green : r.current ? colors.text.inverse : accent}
      />
      <Text
        style={[styles.cellLabel, r.current && { color: colors.text.inverse }]}
        numberOfLines={1}
      >
        {r.kind === "coins" || r.kind === "xp" || r.kind === "hints" || r.kind === "seasonXp"
          ? `${r.amount}`
          : r.category}
      </Text>
      {r.milestone && !r.current && <View style={styles.milestoneDot} />}
    </View>
  );
}

const styles = StyleSheet.create({
  safeTop: { flex: 1, backgroundColor: colors.bg.primary },
  centered: { flex: 1, backgroundColor: colors.bg.primary, justifyContent: "center", alignItems: "center" },
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
    fontSize: typography.sizes["2xl"],
    color: colors.text.primary,
  },
  content: { paddingHorizontal: spacing[5], paddingBottom: spacing[16] },

  summary: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.amber,
    paddingVertical: spacing[4],
    marginBottom: spacing[3],
  },
  summaryStat: { flex: 1, alignItems: "center", gap: 3 },
  summaryValueRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  summaryValue: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.xl,
    color: colors.text.primary,
  },
  summaryLabel: {
    fontFamily: typography.families.mono,
    fontSize: 9,
    letterSpacing: 0.8,
    color: colors.text.label,
    textTransform: "uppercase",
  },
  summaryDivider: { width: 1, height: 34, backgroundColor: colors.border.strong },

  milestoneHint: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
    marginBottom: spacing[4],
  },

  catchUp: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[3],
    backgroundColor: colors.amberGlow,
    borderWidth: 1,
    borderColor: colors.border.amber,
    borderRadius: radii.md,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  catchUpText: { flex: 1 },
  catchUpTitle: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
  },
  catchUpSub: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  restoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.amber,
    borderRadius: radii.sm,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    minWidth: 86,
    justifyContent: "center",
  },
  restoreText: {
    fontFamily: typography.families.monoBold,
    fontSize: typography.sizes.xs,
    color: colors.text.inverse,
    letterSpacing: 0.5,
  },

  warn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    backgroundColor: colors.warning + "1A",
    borderWidth: 1,
    borderColor: colors.warning + "55",
    borderRadius: radii.md,
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  warnText: {
    flex: 1,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
  },

  claimBtn: { marginBottom: spacing[5] },
  claimedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    backgroundColor: colors.green + "14",
    borderWidth: 1,
    borderColor: colors.green + "44",
    borderRadius: radii.md,
    padding: spacing[3],
    marginBottom: spacing[5],
  },
  claimedText: {
    fontFamily: typography.families.medium,
    fontSize: typography.sizes.sm,
    color: colors.green,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: spacing[2],
  },
  cell: {
    width: "18.5%",
    aspectRatio: 0.82,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: spacing[2],
  },
  cellMilestone: { borderColor: colors.border.amber, backgroundColor: colors.amberGlow },
  cellCurrent: { backgroundColor: colors.amber, borderColor: colors.amber },
  cellClaimed: { opacity: 0.45 },
  cellDay: {
    fontFamily: typography.families.monoBold,
    fontSize: 10,
    color: colors.text.muted,
  },
  cellLabel: {
    fontFamily: typography.families.mono,
    fontSize: 8.5,
    color: colors.text.label,
  },
  milestoneDot: {
    position: "absolute",
    top: 5,
    end: 5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.amber,
  },
});
