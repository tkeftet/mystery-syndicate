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
import { useQueryClient } from "@tanstack/react-query";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { colors, typography, spacing, radii, gradients, shadows } from "../../theme";
import type { AppStackParamList } from "../../screens/HomeScreen";
import { Icon, ProgressBar, AppMenu } from "../../components/ui";
import { useSeasons } from "../seasons/seasons.hooks";
import { useEvents } from "../events/events.hooks";
import { usePassHub } from "../pass/pass.hooks";
import {
  useCountdown,
  EVENT_DIFFICULTY_COLOR,
} from "../events/eventHelpers";

type Nav = NativeStackNavigationProp<AppStackParamList>;

function SeasonCard({ season }: { season: any }) {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const diffColor = EVENT_DIFFICULTY_COLOR[season.difficulty] ?? colors.amber;
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => navigation.navigate("SeasonMap", { seasonId: season._id })}
    >
      <LinearGradient
        colors={gradients.coverGlow}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.seasonCard, shadows.card]}
      >
        <Icon name="folder" size={64} color={colors.amber} style={styles.seasonMark} />
        <Text style={styles.seasonKicker}>
          {season.subtitle || t("play.storyArc")}
        </Text>
        <Text style={styles.seasonTitle}>{season.title}</Text>
        <Text style={styles.seasonDesc} numberOfLines={2}>
          {season.description}
        </Text>
        <View style={styles.seasonFooter}>
          <Text style={[styles.seasonDiff, { color: diffColor }]}>
            {season.difficulty?.toUpperCase()} ·{" "}
            {t("play.chaptersCount", { count: season.totalChapters })}
          </Text>
          <View style={styles.continuePill}>
            <Text style={styles.continueText}>{t("play.continue")}</Text>
            <Icon name="forward" size={14} color={colors.text.inverse} />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function EventCard({ event }: { event: any }) {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const live = event.status === "active";
  const countdown = useCountdown(live ? event.endDate : event.startDate);
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => navigation.navigate("EventDetail", { eventId: event._id })}
    >
      <LinearGradient
        colors={gradients.seal}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.eventCard, shadows.glow]}
      >
        <View style={styles.eventLeft}>
          <View style={styles.eventTagRow}>
            {live && <View style={styles.liveDot} />}
            <Text style={styles.eventTag}>
              {live ? t("home.liveNow") : t("home.startsSoon")}
            </Text>
          </View>
          <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
          <Text style={styles.eventSub}>
            {live
              ? t("play.endsIn", { countdown })
              : t("play.startsIn", { countdown })}
          </Text>
        </View>
        <Icon name="trophy" size={30} color={colors.text.inverse} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

function SeasonPassCard() {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const { data } = usePassHub();
  const pass = data?.pass;
  if (!pass) return null;
  const progress = data.progress;
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => navigation.navigate("SeasonPassHub")}
    >
      <LinearGradient
        colors={gradients.seal}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.passCard, shadows.glow]}
      >
        <View style={styles.passTop}>
          <Text style={styles.passKicker}>
            {t("play.seasonPassKicker", { subtitle: pass.subtitle })}
          </Text>
          {data.unclaimedCount > 0 && (
            <View style={styles.passBadge}>
              <Text style={styles.passBadgeText}>{data.unclaimedCount}</Text>
            </View>
          )}
        </View>
        <Text style={styles.passTitle} numberOfLines={1}>
          {pass.title}
        </Text>
        <View style={styles.passLevelRow}>
          <Text style={styles.passLevel}>
            {t("play.lvl", { level: progress.level })}
          </Text>
          <Text style={styles.passXp}>
            {t("play.xpProgress", {
              current: progress.xpIntoLevel,
              next: progress.xpForNext,
            })}
          </Text>
        </View>
        <ProgressBar progress={progress.percentToNext / 100} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function PlayHubScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const { data: seasons, isLoading: loadingSeasons, refetch: refetchSeasons } =
    useSeasons();
  const { data: events, isLoading: loadingEvents, refetch: refetchEvents } =
    useEvents();

  const seasonList: any[] = (seasons as any[]) ?? [];
  const activeSeasons = seasonList.filter((s) => s.status === "active");
  const eventList: any[] = (events as any[]) ?? [];
  const liveEvent =
    eventList.find((e) => e.status === "active") ??
    eventList.find((e) => e.status === "upcoming");

  function onRefresh() {
    queryClient.invalidateQueries({ queryKey: ["seasons"] });
    queryClient.invalidateQueries({ queryKey: ["events"] });
    refetchSeasons();
    refetchEvents();
  }

  const loading = loadingSeasons || loadingEvents;

  return (
    <View style={[styles.safeTop, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.kicker}>{t("play.kicker")}</Text>
          <Text style={styles.headerTitle}>{t("play.title")}</Text>
        </View>
        <AppMenu />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.amber} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.amber} />
          }
        >
          {/* ── Season Pass ── */}
          <SeasonPassCard />

          {/* ── Story Arc ── */}
          <Text style={styles.sectionLabel}>{t("play.storyArc")}</Text>
          {activeSeasons.length > 0 ? (
            activeSeasons.map((s) => <SeasonCard key={s._id} season={s} />)
          ) : (
            <Text style={styles.emptyHint}>{t("play.noSeason")}</Text>
          )}

          {/* ── Mega Cases ── */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>{t("play.megaCases")}</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("EventList")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.seeAll}>{t("home.seeAll")}</Text>
            </TouchableOpacity>
          </View>
          {liveEvent ? (
            <EventCard event={liveEvent} />
          ) : (
            <Text style={styles.emptyHint}>{t("play.noMegaCase")}</Text>
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
    justifyContent: "space-between",
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
  },
  headerLeft: { flex: 1, paddingEnd: spacing[3] },
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
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: spacing[5], paddingBottom: spacing[16] },
  sectionLabel: {
    fontFamily: typography.families.mono,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.text.label,
    marginTop: spacing[5],
    marginBottom: spacing[3],
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  seeAll: {
    fontFamily: typography.families.medium,
    fontSize: typography.sizes.sm,
    color: colors.amber,
    marginTop: spacing[5],
    marginBottom: spacing[3],
  },
  emptyHint: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
    paddingVertical: spacing[3],
  },

  // Season Pass card
  passCard: {
    borderRadius: radii.xl,
    padding: spacing[4],
    marginTop: spacing[3],
    marginBottom: spacing[1],
  },
  passTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  passKicker: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.text.inverse,
    opacity: 0.85,
  },
  passBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.text.inverse,
    alignItems: "center",
    justifyContent: "center",
  },
  passBadgeText: {
    fontFamily: typography.families.monoBold,
    fontSize: typography.sizes.xs,
    color: colors.amber,
  },
  passTitle: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.lg,
    color: colors.text.inverse,
    marginBottom: spacing[2],
  },
  passLevelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[1],
  },
  passLevel: {
    fontFamily: typography.families.monoBold,
    fontSize: typography.sizes.sm,
    color: colors.text.inverse,
  },
  passXp: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    color: colors.text.inverse,
    opacity: 0.85,
  },

  // Season card
  seasonCard: {
    borderRadius: radii.xl,
    padding: spacing[5],
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border.amber,
  },
  seasonMark: {
    position: "absolute",
    right: spacing[3],
    top: spacing[3],
    opacity: 0.18,
  },
  seasonKicker: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.amberLight,
    marginBottom: 4,
  },
  seasonTitle: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.xl,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  seasonDesc: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: typography.sizes.sm * 1.4,
    marginBottom: spacing[4],
  },
  seasonFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  seasonDiff: { fontFamily: typography.families.mono, fontSize: 9, letterSpacing: 1 },
  continuePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.amber,
    borderRadius: 999,
    paddingHorizontal: spacing[3],
    paddingVertical: 7,
  },
  continueText: {
    fontFamily: typography.families.monoBold,
    fontSize: typography.sizes.xs,
    color: colors.text.inverse,
    letterSpacing: 0.5,
  },

  // Event card
  eventCard: {
    borderRadius: radii.lg,
    padding: spacing[4],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eventLeft: { flex: 1, paddingEnd: spacing[3] },
  eventTagRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.text.inverse },
  eventTag: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.text.inverse,
  },
  eventTitle: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.lg,
    color: colors.text.inverse,
  },
  eventSub: {
    fontFamily: typography.families.medium,
    fontSize: typography.sizes.xs,
    color: colors.text.inverse,
    opacity: 0.85,
    marginTop: 2,
  },
});
