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
import { colors, typography, spacing, radii, gradients } from "../../../theme";
import type { AppStackParamList } from "../../../screens/HomeScreen";
import { Icon, ProgressBar } from "../../../components/ui";
import { useSeasonMap } from "../seasons.hooks";

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Rt = RouteProp<AppStackParamList, "SeasonMap">;

const CHAPTER_TYPE_LABEL: Record<string, string> = {
  investigation: "Investigation",
  interrogation: "Interrogation",
  discovery: "Discovery",
  twist: "Twist",
  final_reveal: "Final Reveal",
};

function ChapterRow({
  chapter,
  seasonId,
}: {
  chapter: any;
  seasonId: string;
}) {
  const navigation = useNavigation<Nav>();
  const status = chapter.status as "completed" | "available" | "locked";
  const locked = status === "locked";
  const done = status === "completed";

  const accent = done ? colors.success : locked ? colors.text.faint : colors.amber;

  function open() {
    if (locked) return;
    navigation.navigate("Investigation", {
      caseId: chapter.caseId,
      seasonId,
      chapterNumber: chapter.chapterNumber,
    });
  }

  return (
    <TouchableOpacity
      activeOpacity={locked ? 1 : 0.85}
      disabled={locked}
      onPress={open}
      style={[styles.row, locked && styles.rowLocked]}
    >
      <View style={styles.rail}>
        <View style={[styles.node, { borderColor: accent }]}>
          <Icon
            name={done ? "check" : locked ? "lock" : "play"}
            size={14}
            color={accent}
          />
        </View>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.chapterKicker}>
          CHAPTER {chapter.chapterNumber} ·{" "}
          {CHAPTER_TYPE_LABEL[chapter.chapterType] ?? "Investigation"}
        </Text>
        <Text style={[styles.chapterTitle, locked && styles.lockedText]}>
          {locked ? "Locked" : chapter.title}
        </Text>
        {done && chapter.cliffhanger ? (
          <Text style={styles.cliffhanger} numberOfLines={2}>
            “{chapter.cliffhanger}”
          </Text>
        ) : locked ? (
          <Text style={styles.unlockText}>
            Unlocks {new Date(chapter.unlockDate).toLocaleDateString()}
          </Text>
        ) : (
          <Text style={styles.availableText}>Tap to investigate →</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export function SeasonMapScreen({ route }: { route: Rt }) {
  const { seasonId } = route.params;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { data, isLoading } = useSeasonMap(seasonId);

  if (isLoading || !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.amber} size="large" />
      </View>
    );
  }

  const { season, progress, chapters } = data;

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

        {/* ── Season hero ── */}
        <LinearGradient
          colors={gradients.coverGlow}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.hero}
        >
          <Icon name="folder" size={64} color={colors.amber} style={styles.heroMark} />
        </LinearGradient>

        <Text style={styles.kicker}>{season.subtitle || "STORY ARC"}</Text>
        <Text style={styles.title}>{season.title}</Text>
        <Text style={styles.desc}>{season.description}</Text>

        {/* ── Progress ── */}
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>
            {progress.chaptersCompleted} / {season.totalChapters} chapters
          </Text>
          <Text style={styles.progressPct}>{progress.percent}%</Text>
        </View>
        <ProgressBar progress={progress.percent / 100} />

        <TouchableOpacity
          style={styles.lbLink}
          onPress={() => navigation.navigate("SeasonLeaderboard", { seasonId })}
        >
          <Icon name="trophy" size={16} color={colors.amber} />
          <Text style={styles.lbText}>
            Season leaderboard · your score {progress.seasonScore}
          </Text>
          <Icon name="back" size={16} color={colors.text.muted} style={styles.chevron} />
        </TouchableOpacity>

        {/* ── Chapters ── */}
        <Text style={styles.sectionLabel}>CHAPTERS</Text>
        {chapters.map((c: any) => (
          <ChapterRow key={c.chapterNumber} chapter={c} seasonId={seasonId} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeTop: { flex: 1, backgroundColor: colors.bg.primary },
  container: { flex: 1 },
  content: { paddingHorizontal: spacing[5], paddingBottom: spacing[16] },
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
    height: 120,
    borderRadius: radii.xl,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: spacing[4],
  },
  heroMark: { opacity: 0.85 },
  kicker: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.amberLight,
    marginBottom: 4,
  },
  title: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes["2xl"],
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  desc: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: typography.sizes.sm * 1.5,
    marginBottom: spacing[5],
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[2],
  },
  progressLabel: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
    letterSpacing: 0.5,
  },
  progressPct: {
    fontFamily: typography.families.monoBold,
    fontSize: typography.sizes.sm,
    color: colors.amber,
  },
  lbLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingVertical: spacing[4],
  },
  lbText: {
    flex: 1,
    fontFamily: typography.families.medium,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  chevron: { transform: [{ rotate: "180deg" }] },
  sectionLabel: {
    fontFamily: typography.families.mono,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.text.label,
    marginTop: spacing[2],
    marginBottom: spacing[3],
  },
  row: {
    flexDirection: "row",
    backgroundColor: colors.bg.secondary,
    borderRadius: radii.lg,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.subtle,
    marginBottom: spacing[2],
    gap: spacing[3],
  },
  rowLocked: { opacity: 0.6 },
  rail: { width: 32, alignItems: "center" },
  node: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg.tertiary,
  },
  rowBody: { flex: 1 },
  chapterKicker: {
    fontFamily: typography.families.mono,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.text.label,
    marginBottom: 2,
  },
  chapterTitle: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    marginBottom: 2,
  },
  lockedText: { color: colors.text.muted },
  cliffhanger: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
    color: colors.amberLight,
    fontStyle: "italic",
  },
  unlockText: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
  },
  availableText: {
    fontFamily: typography.families.medium,
    fontSize: typography.sizes.xs,
    color: colors.amber,
  },
});
