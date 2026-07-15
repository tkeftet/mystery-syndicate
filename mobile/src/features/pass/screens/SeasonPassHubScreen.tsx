import React from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { colors, typography, spacing, radii, gradients, shadows } from "../../../theme";
import type { AppStackParamList } from "../../../screens/HomeScreen";
import { Icon, ProgressBar, GradientButton } from "../../../components/ui";
import { usePassHub } from "../pass.hooks";

type Nav = NativeStackNavigationProp<AppStackParamList>;

export function SeasonPassHubScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { data, isLoading } = usePassHub();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.amber} size="large" />
      </View>
    );
  }

  const pass = data?.pass;
  const progress = data?.progress;

  return (
    <View style={[styles.safeTop, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="back" size={18} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {!pass ? (
        <View style={styles.centered}>
          <Icon name="star" size={40} color={colors.text.faint} />
          <Text style={styles.empty}>{t("pass.noSeason")}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Banner */}
          <LinearGradient
            colors={gradients.seal}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.banner, shadows.glow]}
          >
            <Text style={styles.bannerKicker}>
              {pass.subtitle || t("pass.seasonPass")}
            </Text>
            <Text style={styles.bannerTitle}>{pass.title}</Text>
            <View style={styles.bannerMeta}>
              <Icon name="clock" size={13} color={colors.text.inverse} />
              <Text style={styles.bannerMetaText}>
                {t("pass.daysLeft", { count: data.daysLeft })}
              </Text>
            </View>
          </LinearGradient>

          {/* Level + progress */}
          <View style={styles.levelCard}>
            <View style={styles.levelRow}>
              <View>
                <Text style={styles.levelLabel}>{t("pass.seasonLevel")}</Text>
                <Text style={styles.levelValue}>
                  {progress.level}
                  <Text style={styles.levelMax}> / {pass.totalLevels}</Text>
                </Text>
              </View>
              {data.unclaimedCount > 0 && (
                <View style={styles.unclaimedBadge}>
                  <Text style={styles.unclaimedText}>
                    {t("pass.toClaim", { count: data.unclaimedCount })}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.progressMeta}>
              <Text style={styles.progressText}>
                {t("pass.xpToNext", {
                  current: progress.xpIntoLevel,
                  next: progress.xpForNext,
                })}
              </Text>
              <Text style={styles.progressPct}>{progress.percentToNext}%</Text>
            </View>
            <ProgressBar progress={progress.percentToNext / 100} />
            <Text style={styles.totalXp}>
              {t("pass.totalSeasonXp", {
                count: progress.seasonXp,
              })}
            </Text>
          </View>

          <GradientButton
            label={
              data.unclaimedCount > 0
                ? t("pass.viewRewardTrackCount", {
                    count: data.unclaimedCount,
                  })
                : t("pass.viewRewardTrack")
            }
            style={styles.cta}
            onPress={() => navigation.navigate("PassRewards")}
          />

          <TouchableOpacity
            style={styles.challengesBtn}
            onPress={() => navigation.navigate("ChallengeCenter")}
          >
            <Icon name="checkCircle" size={16} color={colors.amber} />
            <Text style={styles.challengesBtnText}>{t("pass.challenges")}</Text>
            <Icon name="forward" size={16} color={colors.text.muted} />
          </TouchableOpacity>

          <Text style={styles.hint}>{t("pass.xpHint")}</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeTop: { flex: 1, backgroundColor: colors.bg.primary },
  centered: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[3],
  },
  empty: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    color: colors.text.muted,
  },
  headerRow: { paddingHorizontal: spacing[5], paddingTop: spacing[3] },
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
  content: { paddingHorizontal: spacing[5], paddingBottom: spacing[16], paddingTop: spacing[3] },
  banner: {
    borderRadius: radii.xl,
    padding: spacing[5],
    marginBottom: spacing[4],
  },
  bannerKicker: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.text.inverse,
    opacity: 0.85,
    marginBottom: 4,
  },
  bannerTitle: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes["2xl"],
    color: colors.text.inverse,
  },
  bannerMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing[2] },
  bannerMetaText: {
    fontFamily: typography.families.monoBold,
    fontSize: typography.sizes.xs,
    color: colors.text.inverse,
  },
  levelCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.amber,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  levelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing[3],
  },
  levelLabel: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.text.label,
  },
  levelValue: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes["3xl"],
    color: colors.amberLight,
  },
  levelMax: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.lg,
    color: colors.text.muted,
  },
  unclaimedBadge: {
    backgroundColor: colors.amberGlow,
    borderWidth: 1,
    borderColor: colors.amber,
    borderRadius: 999,
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
  },
  unclaimedText: {
    fontFamily: typography.families.monoBold,
    fontSize: typography.sizes.xs,
    color: colors.amber,
  },
  progressMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[2],
  },
  progressText: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
  },
  progressPct: {
    fontFamily: typography.families.monoBold,
    fontSize: typography.sizes.sm,
    color: colors.amber,
  },
  totalXp: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
    marginTop: spacing[2],
  },
  cta: { width: "100%" },
  challengesBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    marginTop: spacing[3],
  },
  challengesBtnText: {
    flex: 1,
    fontFamily: typography.families.semibold,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
  },
  hint: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
    textAlign: "center",
    marginTop: spacing[4],
    lineHeight: typography.sizes.xs * 1.5,
  },
});
