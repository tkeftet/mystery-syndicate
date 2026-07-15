import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { DIFFICULTY_CONFIG } from "../constants/difficulty";
import { colors, typography, spacing, radii, gradients, shadows } from "../theme";
import { useAuthStore } from "../features/auth/auth.store";
import {
  useTodayCase,
  useRecentCases,
  useTodayMinis,
} from "../features/cases/cases.hooks";
import { getInvestigationApi } from "../features/investigation/investigation.service";
import { getMyProfileApi } from "../features/profile/profile.service";
import {
  Icon,
  GradientButton,
  SurfaceCard,
  Pill,
  StatusPill,
  DifficultyPips,
  Avatar,
  AppMenu,
} from "../components/ui";
import { caseTypeIcon } from "../constants/iconMappings";
import { useEvents } from "../features/events/events.hooks";
import { useCountdown as useEventCountdown } from "../features/events/eventHelpers";
import { useDailyCalendar } from "../features/dailyLogin/dailyLogin.hooks";

export type AppStackParamList = {
  Home: undefined;
  CaseDetail: { caseId: string };
  Investigation: {
    caseId: string;
    eventId?: string;
    seasonId?: string;
    chapterNumber?: number;
  };
  PlayHub: undefined;
  EventList: undefined;
  EventDetail: { eventId: string };
  EventLeaderboard: { eventId: string };
  SeasonMap: { seasonId: string };
  SeasonLeaderboard: { seasonId: string };
  Profile: undefined;
  Friends: undefined;
  PrivacySettings: undefined;
  Achievements: undefined;
  SeasonPassHub: undefined;
  PassRewards: undefined;
  ChallengeCenter: undefined;
  Agencies: undefined;
  CreateAgency: undefined;
  AgencyLeaderboard: undefined;
  DailyLogin: undefined;
  CustomizeProfile: undefined;
};

type Nav = NativeStackNavigationProp<AppStackParamList>;

function useCountdown() {
  const [timeLeft, setTimeLeft] = React.useState("");

  React.useEffect(() => {
    function calculate() {
      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const diff = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${hours}h ${minutes}m`);
    }

    calculate();
    const interval = setInterval(calculate, 60000);
    return () => clearInterval(interval);
  }, []);

  return timeLeft;
}

function todayKicker() {
  const d = new Date();
  try {
    const weekday = d.toLocaleDateString(i18n.language, { weekday: "short" });
    const month = d.toLocaleDateString(i18n.language, { month: "long" });
    return `${weekday} · ${month} ${d.getDate()}`.toUpperCase();
  } catch {
    return d.toDateString().toUpperCase();
  }
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return i18n.t("home.goodMorning");
  if (h < 18) return i18n.t("home.goodAfternoon");
  return i18n.t("home.goodEvening");
}

function MegaCaseBanner() {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const { data: events } = useEvents();
  const list: any[] = (events as any[]) ?? [];
  const active = list.find((e) => e.status === "active");
  const upcoming = list.find((e) => e.status === "upcoming");
  const event = active ?? upcoming;
  const live = event?.status === "active";
  const countdown = useEventCountdown(
    event ? (live ? event.endDate : event.startDate) : undefined,
  );
  // No active/upcoming event → render nothing (Home just omits the banner).
  if (!event) return null;

  function seeAll() {
    (navigation.getParent() as any)?.navigate("EventsTab");
  }

  return (
    <View style={styles.megaSection}>
      <View style={styles.megaHeader}>
        <Text style={styles.megaHeaderLabel}>{t("home.megaHeader")}</Text>
        <TouchableOpacity
          onPress={seeAll}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.megaSeeAll}>{t("home.seeAll")}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate("EventDetail", { eventId: event._id })
        }
      >
        <LinearGradient
          colors={gradients.seal}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.megaBanner}
        >
          <View style={styles.megaLeft}>
            <View style={styles.megaTagRow}>
              {live && <View style={styles.megaLiveDot} />}
              <Text style={styles.megaTag}>
                {live ? t("home.liveNow") : t("home.startsSoon")}
              </Text>
            </View>
            <Text style={styles.megaTitle} numberOfLines={1}>
              {event.title}
            </Text>
            <Text style={styles.megaSub}>
              {live
                ? t("home.endsIn", { countdown })
                : t("home.startsIn", { countdown })}
            </Text>
          </View>
          <Icon name="trophy" size={34} color={colors.text.inverse} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

export function HomeScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = React.useState(false);
  const [tab, setTab] = React.useState<"daily" | "quick" | "previous">("daily");
  const timeLeft = useCountdown();

  const { data: todayCase, isLoading: loadingToday } = useTodayCase();
  const { data: recentCases } = useRecentCases();
  const { data: minis } = useTodayMinis();
  const { data: dailyLogin } = useDailyCalendar();

  const { data: freshProfile } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: getMyProfileApi,
    staleTime: 1000 * 60 * 2,
  });

  const { data: todayInvestigation, isLoading: loadingInvestigation } =
    useQuery({
      queryKey: ["investigation", todayCase?._id],
      queryFn: () => getInvestigationApi(todayCase!._id),
      enabled: !!todayCase?._id,
      retry: false,
      staleTime: 0,
      refetchOnWindowFocus: true,
    });

  const todayIsCompleted = todayInvestigation?.status === "completed";
  const todayIsInProgress = todayInvestigation?.status === "in_progress";
  const diff = todayCase ? DIFFICULTY_CONFIG[todayCase.difficulty] : null;

  async function onRefresh() {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["cases"] });
    await queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
    await queryClient.invalidateQueries({ queryKey: ["investigation"] });
    await queryClient.invalidateQueries({ queryKey: ["history"] });
    setRefreshing(false);
  }

  const username =
    freshProfile?.username ?? user?.username ?? t("home.detectiveFallback");
  const streak = freshProfile?.streak ?? user?.streak ?? 0;
  const accuracy = freshProfile?.accuracy ?? 0;
  const level = freshProfile?.level ?? 1;

  const miniCount = minis?.length ?? 0;
  const recentCount = recentCases?.length ?? 0;

  return (
    <View style={[styles.safeTop, { paddingTop: insets.top }]}>
      {/* ── Header (fixed) ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.kicker}>{todayKicker()}</Text>
          <Text style={styles.greeting}>
            {greeting()}{" "}
            <Text style={styles.greetingName}>{username}</Text>
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Avatar
            size={44}
            shape="circle"
            initials={username.charAt(0).toUpperCase()}
          />
          <AppMenu />
        </View>
      </View>

      {/* ── Streak Banner (fixed) ── */}
      <LinearGradient
        colors={gradients.darkCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.streakBanner}
      >
        <View style={styles.streakStat}>
          <View style={styles.streakValueRow}>
            <Icon name="streak" size={15} color={colors.amber} />
            <Text style={styles.streakValue}>{streak}</Text>
          </View>
          <Text style={styles.streakLabel}>{t("home.dayStreak")}</Text>
        </View>
        <View style={styles.streakDivider} />
        <View style={styles.streakStat}>
          <Text style={[styles.streakValue, { color: colors.green }]}>
            {accuracy}%
          </Text>
          <Text style={styles.streakLabel}>{t("home.accuracy")}</Text>
        </View>
        <View style={styles.streakDivider} />
        <View style={styles.streakStat}>
          <Text style={styles.streakValue}>{level}</Text>
          <Text style={styles.streakLabel}>{t("home.level")}</Text>
        </View>
      </LinearGradient>

      {/* ── Weekly Mega Case banner (fixed) ── */}
      <MegaCaseBanner />

      {/* ── Daily Login banner (fixed) ── */}
      {dailyLogin && (
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.dailyBanner}
          onPress={() => navigation.navigate("DailyLogin")}
        >
          <View style={styles.dailyIconWrap}>
            <Icon name="calendar" size={18} color={colors.amber} />
            {dailyLogin.canClaim && <View style={styles.dailyDot} />}
          </View>
          <View style={styles.dailyText}>
            <Text style={styles.dailyTitle}>{t("home.dailyReward")}</Text>
            <Text style={styles.dailySub}>
              {dailyLogin.canClaim
                ? t("home.dailyReady", { day: dailyLogin.claimableDay })
                : t("home.dailyStreakBack", {
                    count: dailyLogin.currentStreak,
                  })}
            </Text>
          </View>
          {dailyLogin.canClaim ? (
            <View style={styles.dailyChip}>
              <Text style={styles.dailyChipText}>{t("home.claim")}</Text>
            </View>
          ) : (
            <Icon name="arrowRight" size={16} color={colors.text.muted} />
          )}
        </TouchableOpacity>
      )}

      {/* ── Section Tabs (fixed) ── */}
      <View style={styles.tabs}>
        {(
          [
            {
              key: "daily",
              label: t("home.tabToday"),
              icon: "search",
              badge: !todayIsCompleted && !!todayCase,
              count: null,
            },
            {
              key: "quick",
              label: t("home.tabQuick"),
              icon: "bolt",
              badge: false,
              count: miniCount,
            },
            {
              key: "previous",
              label: t("home.tabPrevious"),
              icon: "folder",
              badge: false,
              count: recentCount,
            },
          ] as const
        ).map((t) => {
          const isActive = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, isActive && styles.tabActive]}
              activeOpacity={0.85}
              onPress={() => setTab(t.key)}
            >
              <Icon
                name={t.icon}
                size={14}
                color={isActive ? colors.text.inverse : colors.text.muted}
              />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {t.label}
              </Text>
              {t.badge ? <View style={styles.tabDot} /> : null}
              {t.count ? (
                <Text style={[styles.tabCount, isActive && styles.tabCountActive]}>
                  {t.count}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Active tab content (only this scrolls) ── */}
      <ScrollView
        style={styles.tabScroll}
        contentContainerStyle={styles.tabContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.amber}
            colors={[colors.amber]}
          />
        }
      >
        {/* ── Today ── */}
        {tab === "daily" &&
          (loadingToday ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={colors.amber} />
            </View>
          ) : todayCase ? (
            <SurfaceCard
              elevation="hero"
              radius={radii.xl}
              style={styles.todayCard}
            >
              {/* cover band */}
              <View style={styles.cover}>
                <LinearGradient
                  colors={gradients.coverGlow}
                  start={{ x: 1, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Icon
                  name="search"
                  size={120}
                  color={colors.amber}
                  style={styles.coverWatermark}
                />
                <View style={styles.coverTop}>
                  <Pill label={todayCase.type} icon={caseTypeIcon(todayCase.type)} />
                  {diff && (
                    <DifficultyPips level={diff.level} label={t(diff.labelKey)} />
                  )}
                </View>
              </View>

              {/* body */}
              <View style={styles.todayBody}>
                <Text style={styles.caseTitle}>{todayCase.title}</Text>
                <Text style={styles.caseDesc} numberOfLines={2}>
                  {todayCase.description}
                </Text>

                <View style={styles.caseStats}>
                  <CaseStat
                    icon="people"
                    text={t("home.suspectsCount", {
                      count: todayCase.suspects?.length ?? 0,
                    })}
                  />
                  <Dot />
                  <CaseStat
                    icon="search"
                    text={t("home.cluesCount", {
                      count: todayCase.evidence?.length ?? 0,
                    })}
                  />
                  <Dot />
                  <CaseStat
                    icon="clock"
                    text={t("home.minutesCount", {
                      count: todayCase.estimatedMinutes,
                    })}
                  />
                </View>

                {todayIsCompleted ? (
                  <View style={styles.solvedBanner}>
                    <View>
                      <View style={styles.solvedTextRow}>
                        <Icon
                          name={todayInvestigation.isCorrect ? "check" : "close"}
                          size={15}
                          color={
                            todayInvestigation.isCorrect
                              ? colors.green
                              : colors.coral
                          }
                        />
                        <Text
                          style={[
                            styles.solvedText,
                            !todayInvestigation.isCorrect && {
                              color: colors.coral,
                            },
                          ]}
                        >
                          {todayInvestigation.isCorrect
                            ? t("home.solved")
                            : t("home.missed")}
                        </Text>
                      </View>
                      <Text style={styles.solvedScore}>
                        {t("home.pointsEarned", {
                          score: todayInvestigation.score,
                        })}
                      </Text>
                    </View>
                    <View style={styles.countdownBox}>
                      <Text style={styles.countdownLabel}>
                        {t("home.nextCaseIn")}
                      </Text>
                      <Text style={styles.countdownTime}>{timeLeft}</Text>
                    </View>
                  </View>
                ) : (
                  <GradientButton
                    label={
                      todayIsInProgress
                        ? t("home.continueInvestigation")
                        : t("home.startInvestigation")
                    }
                    iconRight="arrowRight"
                    loading={loadingInvestigation}
                    onPress={() =>
                      navigation.navigate("CaseDetail", { caseId: todayCase._id })
                    }
                  />
                )}
              </View>
            </SurfaceCard>
          ) : (
            <SurfaceCard style={styles.noCaseCard}>
              <Icon name="moon" size={44} color={colors.text.muted} />
              <Text style={styles.noCaseTitle}>{t("home.noCaseTitle")}</Text>
              <Text style={styles.noCaseDesc}>{t("home.noCaseDesc")}</Text>
            </SurfaceCard>
          ))}

        {/* ── Quick Cases (mini) ── */}
        {tab === "quick" &&
          (minis && minis.length > 0 ? (
            <View style={styles.grid}>
              {minis.map((m: any) => (
                <TouchableOpacity
                  key={m._id}
                  style={styles.gridWrap}
                  activeOpacity={0.85}
                  onPress={() =>
                    navigation.navigate("Investigation", { caseId: m._id })
                  }
                >
                  <View style={[styles.miniCard, styles.miniCardFull]}>
                    <View style={styles.miniIconWrap}>
                      <Icon name={caseTypeIcon(m.type)} size={18} color={colors.amber} />
                    </View>
                    <Text style={styles.miniTitle} numberOfLines={2}>
                      {m.title}
                    </Text>
                    <View style={styles.miniMetaRow}>
                      <Icon name="bolt" size={11} color={colors.text.muted} />
                      <Text style={styles.miniMeta}>
                        {t("home.miniMeta", { count: m.suspects?.length ?? 0 })}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyRecent}>
              <Icon name="bolt" size={18} color={colors.text.muted} />
              <Text style={styles.emptyRecentText}>
                {t("home.noQuickCases")}
              </Text>
            </View>
          ))}

        {/* ── Previous Cases ── */}
        {tab === "previous" &&
          (recentCases && recentCases.length > 0 ? (
            <View style={styles.grid}>
              {recentCases.map((c: any) => {
                const cDiff = DIFFICULTY_CONFIG[c.difficulty];
                return (
                  <TouchableOpacity
                    key={c._id}
                    activeOpacity={0.85}
                    style={styles.gridWrap}
                    onPress={() =>
                      navigation.navigate("CaseDetail", { caseId: c._id })
                    }
                  >
                    <SurfaceCard style={styles.recentCard}>
                      <View style={styles.recentTopRow}>
                        <View style={styles.recentIconTile}>
                          <Icon
                            name={caseTypeIcon(c.type)}
                            size={16}
                            color={colors.amberDeep}
                          />
                        </View>
                        {c.investigationStatus === "correct" && (
                          <StatusPill
                            label={t("home.solved")}
                            color={colors.green}
                          />
                        )}
                        {c.investigationStatus === "wrong" && (
                          <StatusPill
                            label={t("home.missed")}
                            color={colors.coral}
                          />
                        )}
                      </View>
                      <Text style={styles.recentTitle} numberOfLines={2}>
                        {c.title}
                      </Text>
                      <Text
                        style={[
                          styles.recentMeta,
                          { color: cDiff?.color ?? colors.text.muted },
                        ]}
                      >
                        {cDiff ? t(cDiff.labelKey) : c.difficulty.toUpperCase()}
                      </Text>
                    </SurfaceCard>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyRecent}>
              <Icon name="folder" size={18} color={colors.text.muted} />
              <Text style={styles.emptyRecentText}>
                {t("home.noPreviousCases")}
              </Text>
            </View>
          ))}
      </ScrollView>
    </View>
  );
}

function CaseStat({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.caseStat}>
      <Icon name={icon} size={13} color={colors.text.label} />
      <Text style={styles.caseStatText}>{text}</Text>
    </View>
  );
}

function Dot() {
  return <View style={styles.metaDot} />;
}

const styles = StyleSheet.create({
  safeTop: { flex: 1, backgroundColor: colors.bg.primary },
  container: { flex: 1, backgroundColor: colors.bg.primary },
  content: { paddingBottom: spacing[16] },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[5],
  },
  headerLeft: { flex: 1, paddingEnd: spacing[3] },
  headerRight: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  kicker: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    letterSpacing: typography.tracking.wider,
    color: colors.text.muted,
    marginBottom: 4,
  },
  greeting: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.xl,
    color: colors.text.primary,
    lineHeight: typography.sizes.xl * 1.1,
  },
  greetingName: {
    fontFamily: typography.families.displayItalic,
    color: colors.amber,
  },

  streakBanner: {
    marginHorizontal: spacing[5],
    marginBottom: spacing[6],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.amber,
    paddingVertical: spacing[4],
    flexDirection: "row",
    alignItems: "center",
    ...shadows.card,
  },
  dailyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    marginHorizontal: spacing[5],
    marginBottom: spacing[5],
    backgroundColor: colors.bg.secondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[3],
  },
  dailyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.amberGlow,
    alignItems: "center",
    justifyContent: "center",
  },
  dailyDot: {
    position: "absolute",
    top: 4,
    end: 4,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.amber,
    borderWidth: 1.5,
    borderColor: colors.bg.secondary,
  },
  dailyText: { flex: 1 },
  dailyTitle: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
  },
  dailySub: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
    marginTop: 2,
  },
  dailyChip: {
    backgroundColor: colors.amber,
    borderRadius: radii.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  dailyChipText: {
    fontFamily: typography.families.monoBold,
    fontSize: typography.sizes.xs,
    color: colors.text.inverse,
    letterSpacing: 0.8,
  },

  megaSection: {
    marginHorizontal: spacing[5],
    marginBottom: spacing[6],
  },
  megaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[2],
  },
  megaHeaderLabel: {
    fontFamily: typography.families.mono,
    fontSize: 11,
    letterSpacing: 1.6,
    color: colors.text.label,
  },
  megaSeeAll: {
    fontFamily: typography.families.medium,
    fontSize: typography.sizes.sm,
    color: colors.amber,
  },
  megaBanner: {
    borderRadius: radii.lg,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...shadows.glow,
  },
  megaLeft: { flex: 1, paddingEnd: spacing[3] },
  megaTagRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  megaLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.text.inverse,
  },
  megaTag: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.text.inverse,
  },
  megaTitle: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.lg,
    color: colors.text.inverse,
  },
  megaSub: {
    fontFamily: typography.families.medium,
    fontSize: typography.sizes.xs,
    color: colors.text.inverse,
    opacity: 0.85,
    marginTop: 2,
  },
  streakStat: { flex: 1, alignItems: "center", gap: 3 },
  streakValueRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  streakValue: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.xl,
    color: colors.text.primary,
    lineHeight: typography.sizes.xl,
  },
  streakLabel: {
    fontFamily: typography.families.mono,
    fontSize: 9,
    letterSpacing: 0.8,
    color: colors.text.label,
    textTransform: "uppercase",
  },
  streakDivider: {
    width: 1,
    height: 34,
    backgroundColor: colors.border.strong,
  },

  loadingCard: {
    marginHorizontal: spacing[5],
    marginBottom: spacing[6],
    backgroundColor: colors.bg.secondary,
    borderRadius: radii.xl,
    padding: spacing[10],
    alignItems: "center",
  },

  todayCard: {
    marginHorizontal: spacing[5],
    marginBottom: spacing[8],
    padding: 0,
  },
  cover: {
    height: 124,
    backgroundColor: colors.bg.elevated,
    overflow: "hidden",
    justifyContent: "flex-start",
  },
  coverWatermark: {
    position: "absolute",
    end: -14,
    bottom: -28,
    opacity: 0.1,
  },
  coverTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing[4],
  },
  todayBody: { padding: spacing[5] },
  caseTitle: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.xl,
    color: colors.text.primary,
    lineHeight: typography.sizes.xl * 1.1,
  },
  caseDesc: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: typography.sizes.sm * 1.5,
    marginTop: spacing[2],
  },
  caseStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    marginTop: spacing[4],
    marginBottom: spacing[4],
  },
  caseStat: { flexDirection: "row", alignItems: "center", gap: 5 },
  caseStatText: {
    fontFamily: typography.families.mono,
    fontSize: 10.5,
    color: colors.text.label,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.text.faint,
  },

  solvedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.green + "1A",
    borderWidth: 1,
    borderColor: colors.green + "55",
    borderRadius: radii.md,
    padding: spacing[4],
  },
  solvedTextRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  solvedText: {
    fontFamily: typography.families.monoBold,
    fontSize: typography.sizes.sm,
    color: colors.green,
    letterSpacing: 1,
  },
  solvedScore: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
    marginTop: 4,
  },
  countdownBox: { alignItems: "flex-end" },
  countdownLabel: {
    fontFamily: typography.families.mono,
    fontSize: 9,
    color: colors.text.muted,
  },
  countdownTime: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.lg,
    color: colors.amber,
  },

  noCaseCard: {
    marginHorizontal: spacing[5],
    marginBottom: spacing[8],
    padding: spacing[10],
    alignItems: "center",
  },
  noCaseTitle: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.lg,
    color: colors.text.primary,
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  noCaseDesc: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
    textAlign: "center",
  },

  // ── Section tabs ──
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
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing[2],
    borderRadius: radii.sm,
  },
  tabActive: { backgroundColor: colors.amber },
  tabText: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    letterSpacing: 0.5,
    color: colors.text.muted,
  },
  tabTextActive: { color: colors.text.inverse },
  tabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.amber,
  },
  tabCount: {
    fontFamily: typography.families.monoBold,
    fontSize: 9.5,
    color: colors.text.muted,
    minWidth: 16,
    textAlign: "center",
    backgroundColor: colors.bg.elevated,
    borderRadius: radii.sm,
    paddingHorizontal: 4,
    paddingVertical: 1,
    overflow: "hidden",
  },
  tabCountActive: {
    color: colors.amber,
    backgroundColor: colors.bg.primary,
  },

  tabScroll: { flex: 1 },
  tabContent: { paddingBottom: spacing[10] },

  // ── Shared 2-col grid (quick + previous) ──
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing[5],
    gap: spacing[3],
  },
  gridWrap: { width: "47.5%" },
  miniCardFull: { width: "100%" },

  miniCard: {
    width: 150,
    backgroundColor: colors.bg.secondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[3],
    gap: spacing[2],
  },
  miniIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    backgroundColor: colors.amberGlow,
    alignItems: "center",
    justifyContent: "center",
  },
  miniTitle: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    minHeight: typography.sizes.md * 2.2,
  },
  miniMetaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  miniMeta: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
  },
  recentCard: { padding: spacing[3], width: "100%" },
  recentTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[3],
  },
  recentIconTile: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    backgroundColor: colors.bg.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  recentTitle: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    lineHeight: typography.sizes.base * 1.15,
  },
  recentMeta: {
    fontFamily: typography.families.mono,
    fontSize: 9.5,
    letterSpacing: 0.6,
    marginTop: 5,
  },

  emptyRecent: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing[2],
    marginHorizontal: spacing[5],
    backgroundColor: colors.bg.secondary,
    borderRadius: radii.md,
    padding: spacing[5],
    alignItems: "center",
  },
  emptyRecentText: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    color: colors.text.muted,
  },
});
