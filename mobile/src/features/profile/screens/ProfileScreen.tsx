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
import { useQuery } from "@tanstack/react-query";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AppStackParamList } from "../../../screens/HomeScreen";
import { colors, typography, spacing, radii, gradients } from "../../../theme";
import {
  frameRingColor,
  nameColorHex,
  iconForCosmetic,
  backgroundColors,
} from "../../cosmetics/cosmeticDisplay";
import {
  Icon,
  GradientButton,
  SurfaceCard,
  SectionLabel,
  Pill,
  StatTile,
  ProgressBar,
  Avatar,
  AppMenu,
} from "../../../components/ui";
import {
  rankMeta,
  AVATAR_ICONS,
  TITLE_META,
} from "../../../constants/iconMappings";
import { useAuthStore } from "../../auth/auth.store";
import { getMyProfileApi, getMyHistoryApi } from "../profile.service";
import {
  levelForXp,
  xpIntoLevel,
  xpForLevelSpan,
} from "../../../utils/leveling";

export function ProfileScreen() {
  const { clearAuth } = useAuthStore();
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const {
    data: profile,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: getMyProfileApi,
    staleTime: 1000 * 60 * 2,
  });

  const { data: history } = useQuery({
    queryKey: ["history", "me"],
    queryFn: getMyHistoryApi,
    staleTime: 1000 * 60 * 2,
  });

  // Refresh equipped cosmetics/stats whenever we return to the profile
  // (e.g. after equipping something on the Customize screen).
  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch]),
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.amber} size="large" />
      </View>
    );
  }

  if (isError || !profile) {
    return (
      <View style={[styles.centered, { padding: spacing[6] }]}>
        <Icon name="warning" size={40} color={colors.coral} />
        <Text style={styles.errorTitle}>Couldn't load your profile</Text>
        <Text style={styles.errorSub}>
          Check your connection and try again.
        </Text>
        <GradientButton
          label="Retry"
          icon="search"
          loading={isFetching}
          onPress={() => refetch()}
          style={styles.errorBtn}
        />
        <TouchableOpacity style={styles.errorSignOut} onPress={clearAuth}>
          <Text style={styles.errorSignOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const rankConfig = rankMeta(profile.rank);
  const avatarIcon = AVATAR_ICONS[profile.avatar];
  const titleMeta = profile.title ? TITLE_META[profile.title] : null;
  // Derive the level straight from XP so the bar is correct even before the
  // backend re-persists the level on the next solve.
  const level = levelForXp(profile.xp);
  const xpInLevel = xpIntoLevel(profile.xp, level);
  const levelSpan = xpForLevelSpan(level);
  const xpProgress = Math.min(xpInLevel / levelSpan, 1);

  return (
    <View style={[styles.safeTop, { paddingTop: insets.top }]}>
      {/* ── Header (fixed) ── */}
      <View style={styles.header}>
        <Text style={styles.kicker}>// PROFILE</Text>
        <AppMenu />
      </View>

      {/* ── Identity (fixed) ── */}
      <View style={styles.cover}>
        <LinearGradient
          colors={backgroundColors(profile.activeBackground) ?? gradients.coverGlow}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Icon name="incognito" size={64} color={colors.amber} style={styles.coverMark} />
      </View>
      <View style={styles.identity}>
        <Avatar
          size={84}
          icon={avatarIcon}
          initials={profile.username.slice(0, 2).toUpperCase()}
          level={level}
          borderColor={frameRingColor(profile.activeFrame) ?? colors.border.amber}
        />
        <View style={styles.identityInfo}>
          <View style={styles.usernameRow}>
            <Text
              style={[
                styles.username,
                { color: nameColorHex(profile.activeNameColor) ?? colors.text.primary },
              ]}
            >
              {profile.username}
            </Text>
            {iconForCosmetic(profile.activePrestigeIcon) && (
              <Icon name={iconForCosmetic(profile.activePrestigeIcon)!} size={16} color={colors.amber} />
            )}
          </View>
          <View style={styles.badgeRow}>
            <Pill
              label={rankConfig.label}
              icon={rankConfig.icon}
              color={rankConfig.color}
            />
          </View>
          {titleMeta && (
            <Text style={styles.titleQuote}>“{titleMeta.label}”</Text>
          )}
          <TouchableOpacity
            style={styles.customizeBtn}
            onPress={() => navigation.navigate("CustomizeProfile")}
            activeOpacity={0.8}
          >
            <Icon name="sparkles" size={12} color={colors.amber} />
            <Text style={styles.customizeText}>Customize</Text>
            {!!profile.profileLikes && (
              <Text style={styles.likesText}>· ♥ {profile.profileLikes}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── XP (fixed) ── */}
      <View style={styles.xpSection}>
        <View style={styles.xpHeader}>
          <Text style={styles.xpLevel}>LEVEL {level}</Text>
          <Text style={styles.xpCount}>
            {xpInLevel} / {levelSpan} XP
          </Text>
        </View>
        <ProgressBar progress={xpProgress} height={8} />
        <Text style={styles.xpNext}>
          {levelSpan - xpInLevel} XP to Level {level + 1}
        </Text>
      </View>

      {/* ── Stats (fixed) ── */}
      <View style={styles.statsRow}>
        <StatTile value={profile.totalSolved} label="Solved" accent={colors.amber} />
        <StatTile
          value={`${profile.accuracy}%`}
          label="Accuracy"
          valueColor={colors.green}
          accent={colors.green}
        />
        <StatTile value={profile.streak} label="Streak" accent={colors.amberLight} />
        <StatTile value={profile.coins} label="Coins" accent={colors.blue} />
      </View>

      {/* ── Case History (only this scrolls) ── */}
      <SectionLabel style={styles.historyLabel}>CASE HISTORY</SectionLabel>
      <ScrollView
        style={styles.historyScroll}
        contentContainerStyle={styles.historyContent}
        showsVerticalScrollIndicator={false}
      >
        {history && history.length > 0 ? (
          history.map((item: any, index: number) => {
            const color = item.isCorrect ? colors.green : colors.coral;
            return (
              <SurfaceCard
                key={index}
                accent={color}
                radius={radii.md}
                style={styles.historyItem}
              >
                <View style={[styles.historyDot, { backgroundColor: color }]} />
                <View style={styles.historyInfo}>
                  <Text style={styles.historyTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.historyMeta}>
                    {String(item.type).toUpperCase()} ·{" "}
                    {String(item.difficulty).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={[styles.historyStatus, { color }]}>
                    {item.isCorrect ? "SOLVED" : "MISSED"}
                  </Text>
                  <Text style={styles.historyScore}>{item.score}</Text>
                </View>
              </SurfaceCard>
            );
          })
        ) : (
          <View style={styles.empty}>
            <Icon name="search" size={40} color={colors.text.muted} />
            <Text style={styles.emptyTitle}>No cases solved yet</Text>
            <Text style={styles.emptySub}>
              Solve your first case to start building your record
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeTop: { flex: 1, backgroundColor: colors.bg.primary },
  container: { flex: 1, backgroundColor: colors.bg.primary },
  content: { paddingBottom: spacing[16] },
  centered: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  errorTitle: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.lg,
    color: colors.text.primary,
    marginTop: spacing[4],
  },
  errorSub: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
    textAlign: "center",
    marginTop: spacing[2],
  },
  errorBtn: { alignSelf: "stretch", marginTop: spacing[6] },
  errorSignOut: { padding: spacing[3], marginTop: spacing[2] },
  errorSignOutText: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
    letterSpacing: 0.5,
    textDecorationLine: "underline",
  },

  header: {
    paddingTop: spacing[3],
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[3],
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kicker: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    letterSpacing: typography.tracking.wider,
    color: colors.text.label,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButton: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radii.pill,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderWidth: 1,
    borderColor: colors.coral + "66",
  },
  logoutText: {
    fontFamily: typography.families.medium,
    fontSize: typography.sizes.sm,
    color: colors.coral,
  },

  cover: {
    height: 92,
    marginTop: spacing[2],
    backgroundColor: colors.bg.elevated,
    overflow: "hidden",
  },
  coverMark: { position: "absolute", right: 18, top: 16, opacity: 0.12 },
  identity: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing[4],
    paddingHorizontal: spacing[5],
    marginTop: -42,
  },
  identityInfo: { flex: 1, paddingBottom: spacing[1] },
  usernameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  username: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.xl,
    color: colors.text.primary,
  },
  badgeRow: { flexDirection: "row", marginTop: spacing[2] },
  customizeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: spacing[3],
    alignSelf: "flex-start",
    backgroundColor: colors.amberGlow,
    borderRadius: radii.pill,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  customizeText: {
    fontFamily: typography.families.monoBold,
    fontSize: typography.sizes.xs,
    color: colors.amber,
    letterSpacing: 0.5,
  },
  likesText: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
  },
  titleQuote: {
    fontFamily: typography.families.displayItalic,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginTop: spacing[2],
  },

  xpSection: {
    gap: spacing[2],
    paddingHorizontal: spacing[5],
    marginTop: spacing[5],
  },
  xpHeader: { flexDirection: "row", justifyContent: "space-between" },
  xpLevel: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.text.label,
  },
  xpCount: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.amber,
  },
  xpNext: {
    fontFamily: typography.families.mono,
    fontSize: 9.5,
    color: colors.text.muted,
    textAlign: "right",
  },

  statsRow: {
    flexDirection: "row",
    gap: spacing[2],
    paddingHorizontal: spacing[5],
    marginTop: spacing[5],
  },

  historyLabel: { marginTop: spacing[6], marginBottom: spacing[2] },
  historyScroll: { flex: 1 },
  historyContent: { paddingHorizontal: spacing[5], paddingBottom: spacing[16], gap: spacing[2] },
  historyStack: { paddingHorizontal: spacing[5], gap: spacing[2] },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing[3],
    paddingLeft: spacing[4],
    paddingRight: spacing[4],
    gap: spacing[3],
  },
  historyDot: { width: 8, height: 8, borderRadius: 4 },
  historyInfo: { flex: 1 },
  historyTitle: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
  },
  historyMeta: {
    fontFamily: typography.families.mono,
    fontSize: 9,
    color: colors.text.muted,
    marginTop: 3,
    letterSpacing: 0.4,
  },
  historyRight: { alignItems: "flex-end" },
  historyStatus: {
    fontFamily: typography.families.mono,
    fontSize: 8.5,
    letterSpacing: 0.6,
  },
  historyScore: {
    fontFamily: typography.families.bold,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    marginTop: 2,
  },

  empty: { alignItems: "center", paddingVertical: spacing[10], paddingHorizontal: spacing[6] },
  emptyTitle: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.lg,
    color: colors.text.secondary,
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  emptySub: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
    textAlign: "center",
  },
});
