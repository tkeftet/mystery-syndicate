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
import { colors, typography, spacing, radii, gradients, shadows } from "../../../theme";
import type { AppStackParamList } from "../../../screens/HomeScreen";
import { Icon } from "../../../components/ui";
import { useEvents } from "../events.hooks";
import {
  useCountdown,
  EVENT_STATUS_META,
  EVENT_DIFFICULTY_COLOR,
} from "../eventHelpers";

type Nav = NativeStackNavigationProp<AppStackParamList>;

// ── Featured (live) card ─────────────────────────────────────────────────────
function FeaturedEvent({ event }: { event: any }) {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const countdown = useCountdown(event.endDate);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => navigation.navigate("EventDetail", { eventId: event._id })}
    >
      <LinearGradient
        colors={gradients.seal}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.featured, shadows.glow]}
      >
        <View style={styles.featuredTop}>
          <View style={styles.liveChip}>
            <View style={styles.liveDot} />
            <Text style={styles.liveChipText}>{t("home.liveNow")}</Text>
          </View>
          <Text style={styles.featuredDiff}>{event.difficulty?.toUpperCase()}</Text>
        </View>
        <Text style={styles.featuredTitle} numberOfLines={2}>
          {event.title}
        </Text>
        <Text style={styles.featuredDesc} numberOfLines={2}>
          {event.description}
        </Text>
        <View style={styles.featuredFooter}>
          <View style={styles.featuredMeta}>
            <Icon name="clock" size={14} color={colors.text.inverse} />
            <Text style={styles.featuredMetaText}>
              {t("play.endsIn", { countdown })}
            </Text>
          </View>
          <View style={styles.playPill}>
            <Icon name="play" size={13} color={colors.amber} />
            <Text style={styles.playPillText}>{t("events.investigate")}</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ── Compact row (upcoming / past) ────────────────────────────────────────────
function EventRow({ event }: { event: any }) {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const status = EVENT_STATUS_META[event.status] ?? EVENT_STATUS_META.completed;
  const isUpcoming = event.status === "upcoming";
  const countdown = useCountdown(isUpcoming ? event.startDate : event.endDate);
  const diffColor = EVENT_DIFFICULTY_COLOR[event.difficulty] ?? colors.amber;
  const past = event.status === "completed" || event.status === "archived";

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.row, past && styles.rowPast]}
      onPress={() => navigation.navigate("EventDetail", { eventId: event._id })}
    >
      <View style={styles.rowIcon}>
        <Icon
          name="trophy"
          size={20}
          color={past ? colors.text.faint : colors.amber}
        />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, past && styles.rowTitlePast]} numberOfLines={1}>
          {event.title}
        </Text>
        <View style={styles.rowMetaRow}>
          <View style={[styles.statusChip, { borderColor: status.color }]}>
            <Text style={[styles.statusText, { color: status.color }]}>
              {t(status.labelKey)}
            </Text>
          </View>
          <Text style={[styles.rowDiff, { color: diffColor }]}>
            {event.difficulty?.toUpperCase()}
          </Text>
          <Text style={styles.rowMeta}>
            {past
              ? t("events.finished")
              : isUpcoming
                ? t("events.inCountdown", { countdown })
                : t("events.endsCountdown", { countdown })}
          </Text>
        </View>
      </View>
      <Icon name="forward" size={16} color={colors.text.muted} />
    </TouchableOpacity>
  );
}

function Section({ label, count }: { label: string; count: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Text style={styles.sectionCount}>{count}</Text>
    </View>
  );
}

export function EventListScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const { data: events, isLoading, isRefetching, refetch } = useEvents();

  const list: any[] = (events as any[]) ?? [];
  const active = list.filter((e) => e.status === "active");
  const upcoming = list
    .filter((e) => e.status === "upcoming")
    .sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate));
  const past = list
    .filter((e) => e.status === "completed" || e.status === "archived")
    .sort((a, b) => +new Date(b.endDate) - +new Date(a.endDate));

  function onRefresh() {
    queryClient.invalidateQueries({ queryKey: ["events"] });
    refetch();
  }

  return (
    <View style={[styles.safeTop, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="back" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.kicker}>{t("events.kicker")}</Text>
          <Text style={styles.headerTitle}>{t("events.title")}</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.amber} size="large" />
        </View>
      ) : list.length === 0 ? (
        <View style={styles.centered}>
          <Icon name="trophy" size={40} color={colors.text.faint} />
          <Text style={styles.emptyText}>{t("events.noEvents")}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={colors.amber}
              colors={[colors.amber]}
            />
          }
        >
          {active.length > 0 && (
            <>
              <Section label={t("events.sectionLive")} count={active.length} />
              {active.map((e) => (
                <FeaturedEvent key={e._id} event={e} />
              ))}
            </>
          )}

          {upcoming.length > 0 && (
            <>
              <Section
                label={t("events.sectionUpcoming")}
                count={upcoming.length}
              />
              {upcoming.map((e) => (
                <EventRow key={e._id} event={e} />
              ))}
            </>
          )}

          {past.length > 0 && (
            <>
              <Section label={t("events.sectionPast")} count={past.length} />
              {past.map((e) => (
                <EventRow key={e._id} event={e} />
              ))}
            </>
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
    fontSize: typography.sizes["2xl"],
    color: colors.text.primary,
  },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing[3] },
  emptyText: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    color: colors.text.muted,
  },
  content: { paddingHorizontal: spacing[5], paddingBottom: spacing[16] },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginTop: spacing[5],
    marginBottom: spacing[3],
  },
  sectionLabel: {
    fontFamily: typography.families.mono,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.text.label,
  },
  sectionCount: {
    fontFamily: typography.families.mono,
    fontSize: 11,
    color: colors.text.faint,
  },

  // Featured (live)
  featured: {
    borderRadius: radii.xl,
    padding: spacing[5],
    marginBottom: spacing[2],
  },
  featuredTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[3],
  },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.28)",
    borderRadius: 999,
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.text.inverse },
  liveChipText: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.text.inverse,
  },
  featuredDiff: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.text.inverse,
    opacity: 0.85,
  },
  featuredTitle: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.xl,
    color: colors.text.inverse,
    marginBottom: spacing[1],
  },
  featuredDesc: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.text.inverse,
    opacity: 0.9,
    lineHeight: typography.sizes.sm * 1.4,
    marginBottom: spacing[4],
  },
  featuredFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  featuredMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  featuredMetaText: {
    fontFamily: typography.families.monoBold,
    fontSize: typography.sizes.xs,
    color: colors.text.inverse,
  },
  playPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.text.inverse,
    borderRadius: 999,
    paddingHorizontal: spacing[3],
    paddingVertical: 7,
  },
  playPillText: {
    fontFamily: typography.families.monoBold,
    fontSize: typography.sizes.xs,
    color: colors.amber,
    letterSpacing: 0.5,
  },

  // Rows
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.secondary,
    borderRadius: radii.lg,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: spacing[3],
    marginBottom: spacing[2],
  },
  rowPast: { opacity: 0.7 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.bg.tertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: { flex: 1 },
  rowTitle: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    marginBottom: 4,
  },
  rowTitlePast: { color: colors.text.secondary },
  rowMetaRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  statusChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  statusText: { fontFamily: typography.families.mono, fontSize: 8.5, letterSpacing: 1 },
  rowDiff: { fontFamily: typography.families.mono, fontSize: 8.5, letterSpacing: 1 },
  rowMeta: {
    fontFamily: typography.families.medium,
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
  },
});
