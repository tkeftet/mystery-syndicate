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
import i18n, { type TranslationKey } from "../../../i18n";
import { colors, typography, spacing, radii, gradients } from "../../../theme";
import type { AppStackParamList } from "../../../screens/HomeScreen";
import { Icon, ProgressBar } from "../../../components/ui";
import type { IconName } from "../../../components/ui/Icon";
import { useAchievements } from "../achievements.hooks";

type Nav = NativeStackNavigationProp<AppStackParamList>;

const RARITY_COLOR: Record<string, string> = {
  common: colors.text.muted,
  rare: colors.info,
  epic: "#B58BD6",
  legendary: colors.amber,
  mythic: "#E0567B",
};

const CATEGORIES: { key: string; labelKey: TranslationKey }[] = [
  { key: "cases", labelKey: "achievements.catCases" },
  { key: "accuracy", labelKey: "achievements.catAccuracy" },
  { key: "streaks", labelKey: "achievements.catStreaks" },
  { key: "story", labelKey: "achievements.catStory" },
  { key: "mega", labelKey: "achievements.catMega" },
  { key: "social", labelKey: "achievements.catSocial" },
  { key: "seasonal", labelKey: "achievements.catSeasonal" },
];

function AchievementCard({ a }: { a: any }) {
  const color = RARITY_COLOR[a.rarity] ?? colors.text.muted;
  const pct = Math.min(a.progress / a.target, 1);
  return (
    <View style={[styles.card, a.unlocked && { borderColor: color }]}>
      <View style={[styles.iconWrap, { borderColor: color }]}>
        <Icon
          name={(a.icon as IconName) ?? "trophy"}
          size={20}
          color={a.unlocked ? color : colors.text.faint}
        />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.cardName} numberOfLines={1}>
            {a.name}
          </Text>
          <Text style={[styles.points, { color }]}>{a.points}</Text>
        </View>
        <Text style={styles.cardDesc} numberOfLines={2}>
          {a.description}
        </Text>
        {a.unlocked ? (
          <View style={styles.unlockedRow}>
            <Icon name="checkCircle" size={12} color={colors.success} />
            <Text style={styles.unlockedText}>
              {a.unlockedAt
                ? i18n.t("achievements.unlockedOn", {
                    date: new Date(a.unlockedAt).toLocaleDateString(
                      i18n.language,
                    ),
                  })
                : i18n.t("achievements.unlocked")}
            </Text>
          </View>
        ) : (
          <View style={styles.progressRow}>
            <View style={styles.barWrap}>
              <ProgressBar progress={pct} />
            </View>
            <Text style={styles.progressText}>
              {a.progress}/{a.target}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export function AchievementsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { data, isLoading } = useAchievements();

  const achievements: any[] = data?.achievements ?? [];

  return (
    <View style={[styles.safeTop, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="back" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.kicker}>{t("achievements.kicker")}</Text>
          <Text style={styles.headerTitle}>{t("achievements.title")}</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.amber} style={{ marginTop: spacing[8] }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Score summary */}
          <LinearGradient
            colors={gradients.seal}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.scoreCard}
          >
            <Text style={styles.scoreValue}>{data?.achievementScore ?? 0}</Text>
            <Text style={styles.scoreLabel}>
              {t("achievements.achievementScore")}
            </Text>
            <Text style={styles.scoreSub}>
              {t("achievements.unlockedCount", {
                unlocked: data?.unlockedCount ?? 0,
                total: data?.totalCount ?? 0,
              })}
            </Text>
          </LinearGradient>

          {CATEGORIES.map((cat) => {
            const items = achievements.filter((a) => a.category === cat.key);
            if (items.length === 0) return null;
            return (
              <View key={cat.key}>
                <Text style={styles.sectionLabel}>{t(cat.labelKey)}</Text>
                {items.map((a) => (
                  <AchievementCard key={a.key} a={a} />
                ))}
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
    fontSize: typography.sizes["2xl"],
    color: colors.text.primary,
  },
  content: { paddingHorizontal: spacing[5], paddingBottom: spacing[16] },
  scoreCard: {
    borderRadius: radii.xl,
    padding: spacing[5],
    alignItems: "center",
    marginBottom: spacing[2],
  },
  scoreValue: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes["4xl"],
    color: colors.text.inverse,
    lineHeight: typography.sizes["4xl"],
  },
  scoreLabel: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.text.inverse,
    marginTop: spacing[1],
  },
  scoreSub: {
    fontFamily: typography.families.medium,
    fontSize: typography.sizes.sm,
    color: colors.text.inverse,
    opacity: 0.9,
    marginTop: spacing[1],
  },
  sectionLabel: {
    fontFamily: typography.families.mono,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.text.label,
    marginTop: spacing[5],
    marginBottom: spacing[3],
  },
  card: {
    flexDirection: "row",
    gap: spacing[3],
    backgroundColor: colors.bg.secondary,
    borderRadius: radii.lg,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.subtle,
    marginBottom: spacing[2],
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg.tertiary,
  },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardName: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    flex: 1,
  },
  points: { fontFamily: typography.families.monoBold, fontSize: typography.sizes.sm },
  cardDesc: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
    marginTop: 2,
    marginBottom: spacing[2],
  },
  progressRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  barWrap: { flex: 1 },
  progressText: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
  },
  unlockedRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  unlockedText: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    color: colors.success,
  },
});
