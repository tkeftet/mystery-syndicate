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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PublicProfileModal } from "../../../components/ui/PublicProfileModal";
import {
  Icon,
  SurfaceCard,
  Pill,
  Avatar,
  AppMenu,
} from "../../../components/ui";
import {
  AVATAR_ICONS,
  TITLE_META,
  MEDAL_COLORS,
} from "../../../constants/iconMappings";

import { colors, typography, spacing, radii, gradients } from "../../../theme";
import { useAuthStore } from "../../auth/auth.store";
import {
  useDailyLeaderboard,
  useWeeklyLeaderboard,
  useAllTimeLeaderboard,
  useDetectiveOfWeek,
  useMyRank,
} from "../leaderboard.hooks";

type Tab = "daily" | "weekly" | "alltime" | "stars";

const DOTW_SECTIONS: {
  key: "topAccuracy" | "longestStreak" | "mostSolved";
  label: string;
  icon: any;
  suffix: (r: any) => string;
}[] = [
  {
    key: "topAccuracy",
    label: "TOP ACCURACY",
    icon: "target",
    suffix: (r) => `${r.accuracy}%`,
  },
  {
    key: "longestStreak",
    label: "LONGEST STREAK",
    icon: "streak",
    suffix: (r) => `${r.streak} days`,
  },
  {
    key: "mostSolved",
    label: "MOST SOLVED",
    icon: "checkCircle",
    suffix: (r) => `${r.totalSolved}`,
  },
];

export function LeaderboardScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("daily");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();

  const { data: daily, isLoading: ld } = useDailyLeaderboard();
  const { data: weekly, isLoading: lw } = useWeeklyLeaderboard();
  const { data: allTime, isLoading: la } = useAllTimeLeaderboard();
  const { data: detective, isLoading: lstars } = useDetectiveOfWeek();
  const { data: myRank } = useMyRank();

  const isLoading =
    (activeTab === "daily" && ld) ||
    (activeTab === "weekly" && lw) ||
    (activeTab === "alltime" && la) ||
    (activeTab === "stars" && lstars);

  const entries =
    activeTab === "daily" ? daily : activeTab === "weekly" ? weekly : allTime;

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[3] }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.kicker}>// LEADERBOARD</Text>
          <Text style={styles.title}>Rankings</Text>
        </View>
        <AppMenu />
      </View>

      {/* ── My Rank ── */}
      {myRank && (
        <LinearGradient
          colors={gradients.darkCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.myRankCard}
        >
          <Text style={styles.myRankLabel}>YOUR GLOBAL RANK</Text>
          <Text style={styles.myRankValue}>#{myRank.allTime}</Text>
          <View style={styles.myRankStats}>
            <View style={styles.myRankStat}>
              <Text style={styles.myRankStatValue}>
                {myRank.xp.toLocaleString()}
              </Text>
              <Text style={styles.myRankStatLabel}>XP</Text>
            </View>
            <View style={styles.myRankStatDivider} />
            <View style={styles.myRankStat}>
              <Text style={styles.myRankStatValue}>{myRank.totalSolved}</Text>
              <Text style={styles.myRankStatLabel}>SOLVED</Text>
            </View>
            <View style={styles.myRankStatDivider} />
            <View style={styles.myRankStat}>
              <View style={styles.myRankStatValueRow}>
                <Icon name="streak" size={15} color={colors.amber} />
                <Text style={styles.myRankStatValue}>{myRank.streak}</Text>
              </View>
              <Text style={styles.myRankStatLabel}>STREAK</Text>
            </View>
          </View>
        </LinearGradient>
      )}

      {/* ── Tabs ── */}
      <View style={styles.tabs}>
        {(["daily", "weekly", "alltime", "stars"] as Tab[]).map((tab) => {
          const active = activeTab === tab;
          const label =
            tab === "alltime"
              ? "ALL TIME"
              : tab === "stars"
                ? "STARS"
                : tab.toUpperCase();
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── List ── */}
      {isLoading ? (
        <ActivityIndicator
          color={colors.amber}
          style={{ marginTop: spacing[8] }}
        />
      ) : activeTab === "stars" ? (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {DOTW_SECTIONS.map((sec) => {
            const rows: any[] = detective?.[sec.key] ?? [];
            return (
              <View key={sec.key} style={styles.dotwSection}>
                <View style={styles.dotwHeader}>
                  <Icon name={sec.icon} size={14} color={colors.amber} />
                  <Text style={styles.dotwLabel}>{sec.label}</Text>
                </View>
                {rows.length > 0 ? (
                  rows.map((r, i) => (
                    <SurfaceCard
                      key={r.userId}
                      radius={radii.md}
                      style={styles.row}
                    >
                      <TouchableOpacity
                        style={styles.rowTouch}
                        onPress={() => setSelectedUserId(r.userId)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.rowMedal}>
                          {MEDAL_COLORS[i + 1] ? (
                            <Icon name="medal" size={24} color={MEDAL_COLORS[i + 1]} />
                          ) : (
                            <Text style={styles.rowPos}>{i + 1}</Text>
                          )}
                        </View>
                        <Avatar
                          size={40}
                          icon={AVATAR_ICONS[r.avatar]}
                          initials={r.username.slice(0, 2).toUpperCase()}
                        />
                        <View style={styles.rowInfo}>
                          <Text style={styles.rowName} numberOfLines={1}>
                            {r.username}
                          </Text>
                        </View>
                        <Text style={styles.rowScore}>{sec.suffix(r)}</Text>
                      </TouchableOpacity>
                    </SurfaceCard>
                  ))
                ) : (
                  <Text style={styles.dotwEmpty}>No detectives yet.</Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {entries && entries.length > 0 ? (
            entries.map((entry: any, i: number) => {
              const isMe = entry.username === user?.username;
              const score =
                activeTab === "daily"
                  ? entry.score
                  : activeTab === "weekly"
                    ? entry.totalScore
                    : entry.xp;
              const avatarIcon = AVATAR_ICONS[entry.avatar];
              const titleMeta = entry.title ? TITLE_META[entry.title] : null;
              const medal = MEDAL_COLORS[i + 1];

              return (
                <SurfaceCard
                  key={entry.userId}
                  accent={isMe ? colors.amber : undefined}
                  radius={radii.md}
                  style={[styles.row, isMe && styles.rowMe]}
                >
                  <TouchableOpacity
                    style={styles.rowTouch}
                    onPress={() => setSelectedUserId(entry.userId)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.rowMedal}>
                      {medal ? (
                        <Icon name="medal" size={24} color={medal} />
                      ) : (
                        <Text style={styles.rowPos}>{i + 1}</Text>
                      )}
                    </View>
                    <Avatar
                      size={40}
                      icon={avatarIcon}
                      initials={entry.username.slice(0, 2).toUpperCase()}
                    />
                    <View style={styles.rowInfo}>
                      <Text
                        style={[styles.rowName, isMe && styles.rowNameMe]}
                        numberOfLines={1}
                      >
                        {entry.username}
                        {isMe ? " (you)" : ""}
                      </Text>
                      {titleMeta ? (
                        <View style={styles.rowTitleRow}>
                          <Pill
                            label={titleMeta.label}
                            icon={titleMeta.icon}
                          />
                        </View>
                      ) : activeTab === "daily" ? (
                        <View style={styles.rowSubRow}>
                          <Icon
                            name={entry.isCorrect ? "check" : "close"}
                            size={12}
                            color={entry.isCorrect ? colors.green : colors.coral}
                          />
                          <Text style={styles.rowSub}>
                            {entry.isCorrect ? "Correct" : "Wrong"}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.rowSub}>
                          {activeTab === "weekly"
                            ? `${entry.casesSolved} cases`
                            : `Level ${entry.level}`}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.rowScore}>
                      {score?.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                </SurfaceCard>
              );
            })
          ) : (
            <View style={styles.empty}>
              <Icon name="trophy" size={40} color={colors.text.muted} />
              <Text style={styles.emptyTitle}>No detectives yet</Text>
              <Text style={styles.emptySub}>
                Be the first to claim the top spot
              </Text>
            </View>
          )}
        </ScrollView>
      )}
      <PublicProfileModal
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[4],
  },
  headerLeft: { flex: 1, paddingRight: spacing[3] },
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

  myRankCard: {
    marginHorizontal: spacing[5],
    marginBottom: spacing[5],
    borderWidth: 1,
    borderColor: colors.border.amber,
    borderRadius: radii.lg,
    padding: spacing[5],
    alignItems: "center",
  },
  myRankLabel: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    color: colors.amberDeep,
    letterSpacing: 1.8,
    marginBottom: spacing[1],
  },
  myRankValue: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes["3xl"],
    color: colors.amberLight,
    marginBottom: spacing[3],
  },
  myRankStats: { flexDirection: "row", alignItems: "center", gap: spacing[5] },
  myRankStat: { alignItems: "center", gap: 3 },
  myRankStatValueRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  myRankStatValue: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.lg,
    color: colors.text.primary,
  },
  myRankStatLabel: {
    fontFamily: typography.families.mono,
    fontSize: 9,
    letterSpacing: 0.8,
    color: colors.text.label,
  },
  myRankStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border.strong,
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
    paddingVertical: spacing[2],
    alignItems: "center",
    borderRadius: radii.sm,
  },
  tabActive: { backgroundColor: colors.amber },
  tabText: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
    letterSpacing: 1,
  },
  tabTextActive: { color: colors.text.inverse },

  list: { paddingHorizontal: spacing[5], paddingBottom: spacing[16] },
  row: { marginBottom: spacing[2], padding: 0 },
  rowMe: { borderColor: colors.border.amber },
  rowTouch: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[3],
    gap: spacing[3],
  },
  rowMedal: { width: 30, alignItems: "center", justifyContent: "center" },
  rowPos: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
  },
  rowInfo: { flex: 1 },
  rowName: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
  },
  rowNameMe: { color: colors.amberLight },
  rowTitleRow: { flexDirection: "row", marginTop: 4 },
  rowSubRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  rowSub: {
    fontFamily: typography.families.mono,
    fontSize: 9.5,
    color: colors.text.muted,
  },
  rowScore: {
    fontFamily: typography.families.bold,
    fontSize: typography.sizes.md,
    color: colors.amber,
  },

  dotwSection: { marginBottom: spacing[5] },
  dotwHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing[2],
  },
  dotwLabel: {
    fontFamily: typography.families.mono,
    fontSize: 11,
    letterSpacing: 1.6,
    color: colors.text.label,
  },
  dotwEmpty: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
    paddingVertical: spacing[2],
  },
  empty: { alignItems: "center", paddingTop: spacing[12], gap: spacing[2] },
  emptyTitle: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.lg,
    color: colors.text.secondary,
  },
  emptySub: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
    textAlign: "center",
  },
});
