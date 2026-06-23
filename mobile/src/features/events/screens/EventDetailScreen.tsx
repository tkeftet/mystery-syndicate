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
import type { RouteProp } from "@react-navigation/native";
import { colors, typography, spacing, radii, gradients, shadows } from "../../../theme";
import type { AppStackParamList } from "../../../screens/HomeScreen";
import { Icon, GradientButton } from "../../../components/ui";
import { useEvent, useMyParticipation } from "../events.hooks";
import {
  useCountdown,
  EVENT_STATUS_META,
  EVENT_DIFFICULTY_COLOR,
  formatDuration,
} from "../eventHelpers";

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Rt = RouteProp<AppStackParamList, "EventDetail">;

function RewardRow({
  icon,
  tier,
  reward,
}: {
  icon: any;
  tier: string;
  reward?: { title?: string; badge?: string; xp?: number; coins?: number };
}) {
  if (!reward) return null;
  const parts: string[] = [];
  if (reward.title) parts.push("Exclusive Title");
  if (reward.badge) parts.push("Exclusive Badge");
  if (reward.xp) parts.push(`${reward.xp} XP`);
  if (reward.coins) parts.push(`${reward.coins} coins`);
  if (parts.length === 0) return null;
  return (
    <View style={styles.rewardRow}>
      <Icon name={icon} size={15} color={colors.amber} />
      <Text style={styles.rewardTier}>{tier}</Text>
      <Text style={styles.rewardValue}>{parts.join(" + ")}</Text>
    </View>
  );
}

export function EventDetailScreen({ route }: { route: Rt }) {
  const { eventId } = route.params;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { data: event, isLoading } = useEvent(eventId);
  const { data: mine } = useMyParticipation(eventId);

  const isUpcoming = event?.status === "upcoming";
  const countdown = useCountdown(
    isUpcoming ? event?.startDate : event?.endDate,
  );

  if (isLoading || !event) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.amber} size="large" />
      </View>
    );
  }

  const status = EVENT_STATUS_META[event.status] ?? EVENT_STATUS_META.completed;
  const diffColor = EVENT_DIFFICULTY_COLOR[event.difficulty] ?? colors.amber;
  const submitted = mine?.participation?.status === "completed";
  const ended = event.status === "completed" || event.status === "archived";
  const rc = event.rewardConfig ?? {};

  function renderCta() {
    if (isUpcoming) {
      return (
        <View style={styles.ctaDisabled}>
          <Icon name="clock" size={16} color={colors.text.muted} />
          <Text style={styles.ctaDisabledText}>Starts in {countdown}</Text>
        </View>
      );
    }
    if (submitted) {
      return (
        <GradientButton
          label="View Leaderboard"
          onPress={() =>
            navigation.navigate("EventLeaderboard", { eventId })
          }
        />
      );
    }
    if (event.status === "active") {
      return (
        <GradientButton
          label="Investigate"
          onPress={() =>
            navigation.navigate("Investigation", {
              caseId: event.caseId,
              eventId,
            })
          }
        />
      );
    }
    // ended, didn't play
    return (
      <GradientButton
        label="View Leaderboard"
        onPress={() => navigation.navigate("EventLeaderboard", { eventId })}
      />
    );
  }

  return (
    <View style={[styles.safeTop, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="back" size={18} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* ── Hero ── */}
        <LinearGradient
          colors={gradients.coverGlow}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.hero}
        >
          <Icon name="trophy" size={72} color={colors.amber} style={styles.heroMark} />
          <View style={styles.heroChips}>
            <View style={[styles.statusChip, { borderColor: status.color }]}>
              {event.status === "active" && (
                <View style={[styles.liveDot, { backgroundColor: status.color }]} />
              )}
              <Text style={[styles.statusText, { color: status.color }]}>
                {status.label}
              </Text>
            </View>
            <Text style={[styles.difficulty, { color: diffColor }]}>
              {event.difficulty?.toUpperCase()}
            </Text>
          </View>
        </LinearGradient>

        <Text style={styles.title}>{event.title}</Text>

        {!ended && (
          <View style={styles.countdownPill}>
            <Icon name="clock" size={14} color={colors.amber} />
            <Text style={styles.countdownText}>
              {isUpcoming ? `Starts in ${countdown}` : `Ends in ${countdown}`}
            </Text>
          </View>
        )}

        <Text style={styles.story}>{event.description}</Text>

        {/* ── Your result (if submitted) ── */}
        {submitted && mine && (
          <View style={styles.resultCard}>
            <Text style={styles.sectionLabel}>YOUR RESULT</Text>
            <View style={styles.resultStats}>
              <View style={styles.resultStat}>
                <Text style={styles.resultValue}>{mine.participation.score}</Text>
                <Text style={styles.resultStatLabel}>score</Text>
              </View>
              <View style={styles.resultStat}>
                <Text style={styles.resultValue}>#{mine.rank ?? "—"}</Text>
                <Text style={styles.resultStatLabel}>rank</Text>
              </View>
              <View style={styles.resultStat}>
                <Text style={styles.resultValue}>
                  {formatDuration(mine.participation.completionTimeSec)}
                </Text>
                <Text style={styles.resultStatLabel}>time</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Rewards ── */}
        {event.leaderboardEnabled && (
          <View style={styles.rewardsCard}>
            <Text style={styles.sectionLabel}>REWARDS</Text>
            <RewardRow icon="crown" tier="Rank 1" reward={rc.top1} />
            <RewardRow icon="medal" tier="Top 10" reward={rc.top10} />
            <RewardRow icon="star" tier="Top 100" reward={rc.top100} />
            <RewardRow icon="checkCircle" tier="All players" reward={rc.participation} />
          </View>
        )}

        {/* ── Leaderboard link ── */}
        {event.leaderboardEnabled && (
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate("EventLeaderboard", { eventId })}
          >
            <Icon name="trophy" size={16} color={colors.amber} />
            <Text style={styles.linkText}>View event leaderboard</Text>
            <Icon name="back" size={16} color={colors.text.muted} style={styles.chevron} />
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={[styles.ctaBar, { paddingBottom: insets.bottom + spacing[3] }]}>
        {renderCta()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeTop: { flex: 1, backgroundColor: colors.bg.primary },
  container: { flex: 1 },
  content: { paddingHorizontal: spacing[5], paddingBottom: spacing[8] },
  centered: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerRow: { paddingTop: spacing[3], paddingBottom: spacing[2] },
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
  hero: {
    height: 140,
    borderRadius: radii.xl,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: spacing[4],
  },
  heroMark: { opacity: 0.9 },
  heroChips: {
    position: "absolute",
    top: spacing[3],
    left: spacing[3],
    right: spacing[3],
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: typography.families.mono, fontSize: 9, letterSpacing: 1 },
  difficulty: { fontFamily: typography.families.mono, fontSize: 9, letterSpacing: 1 },
  title: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes["2xl"],
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  countdownPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: colors.amberGlow,
    borderWidth: 1,
    borderColor: colors.amber,
    borderRadius: 999,
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
    marginBottom: spacing[4],
  },
  countdownText: {
    fontFamily: typography.families.monoBold,
    fontSize: typography.sizes.xs,
    color: colors.amber,
  },
  story: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    lineHeight: typography.sizes.base * 1.5,
    marginBottom: spacing[5],
  },
  sectionLabel: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.text.label,
    marginBottom: spacing[3],
  },
  resultCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.amber,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  resultStats: { flexDirection: "row", justifyContent: "space-around" },
  resultStat: { alignItems: "center" },
  resultValue: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.xl,
    color: colors.amberLight,
  },
  resultStatLabel: {
    fontFamily: typography.families.mono,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.text.muted,
    marginTop: 2,
  },
  rewardsCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[4],
    marginBottom: spacing[4],
    gap: spacing[3],
  },
  rewardRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  rewardTier: {
    fontFamily: typography.families.semibold,
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
    width: 78,
  },
  rewardValue: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    flex: 1,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingVertical: spacing[3],
  },
  linkText: {
    fontFamily: typography.families.medium,
    fontSize: typography.sizes.sm,
    color: colors.amber,
    flex: 1,
  },
  chevron: { transform: [{ rotate: "180deg" }] },
  ctaBar: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.bg.primary,
  },
  ctaDisabled: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    backgroundColor: colors.bg.tertiary,
    borderRadius: radii.md,
    paddingVertical: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  ctaDisabledText: {
    fontFamily: typography.families.monoBold,
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
  },
});
