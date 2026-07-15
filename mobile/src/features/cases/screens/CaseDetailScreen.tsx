import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { AppStackParamList } from "../../../screens/HomeScreen";
import { useTranslation } from "react-i18next";
import i18n from "../../../i18n";
import { colors, typography, spacing, radii } from "../../../theme";
import { DIFFICULTY_CONFIG } from "../../../constants/difficulty";
import {
  Icon,
  GradientButton,
  SurfaceCard,
  SectionLabel,
  Pill,
  DifficultyPips,
  Avatar,
} from "../../../components/ui";
import { caseTypeIcon } from "../../../constants/iconMappings";
import { useCaseById } from "../cases.hooks";
import { getInvestigationApi } from "../../investigation/investigation.service";

type Props = {
  navigation: NativeStackNavigationProp<AppStackParamList, "CaseDetail">;
  route: RouteProp<AppStackParamList, "CaseDetail">;
};

export function CaseDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { caseId } = route.params;
  const insets = useSafeAreaInsets();
  const { data: case_, isLoading } = useCaseById(caseId);

  const { data: investigation } = useQuery({
    queryKey: ["investigation", caseId],
    queryFn: () => getInvestigationApi(caseId),
    enabled: !!caseId,
    retry: false,
  });

  const isCompleted = investigation?.status === "completed";
  const isCorrect = isCompleted && investigation?.isCorrect;
  const isInProgress = investigation?.status === "in_progress";
  const diff = case_ ? DIFFICULTY_CONFIG[case_.difficulty] : null;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.amber} size="large" />
      </View>
    );
  }

  if (!case_) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t("cases.caseNotFound")}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.safeTop, { paddingTop: insets.top }]}>
      {/* ── App bar ── */}
      <View style={styles.appBar}>
        <TouchableOpacity
          style={styles.iconTile}
          onPress={() => navigation.goBack()}
        >
          <Icon name="back" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>{t("cases.appBarTitle")}</Text>
        <View style={styles.iconTile}>
          <Icon name="search" size={17} color={colors.amber} />
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Case Header ── */}
        <View style={styles.caseHeader}>
          <Pill label={case_.type} icon={caseTypeIcon(case_.type)} />
          {diff && (
            <DifficultyPips level={diff.level} label={t(diff.labelKey)} />
          )}
        </View>

        <Text style={styles.caseTitle}>{case_.title}</Text>
        <Text style={styles.caseDescription}>{case_.description}</Text>

        {/* ── Meta ── */}
        <View style={styles.metaRow}>
          <Meta
            icon="clock"
            text={t("home.minutesCount", { count: case_.estimatedMinutes })}
          />
          <Dot />
          <Meta
            icon="trophy"
            text={t("cases.pointsCount", { count: case_.maxScore })}
          />
          <Dot />
          <Meta
            icon="people"
            text={t("home.suspectsCount", {
              count: case_.suspects?.length ?? 0,
            })}
          />
          <Dot />
          <Meta
            icon="search"
            text={t("home.cluesCount", { count: case_.evidence?.length ?? 0 })}
          />
        </View>

        {/* ── Victim ── */}
        {case_.victim?.name && (
          <>
            <SectionLabel style={styles.flushLabel}>
              {t("cases.victim")}
            </SectionLabel>
            <SurfaceCard style={styles.card}>
              <View style={styles.cardNameRow}>
                <Icon name="user" size={16} color={colors.amberLight} />
                <Text style={styles.cardName}>{case_.victim.name}</Text>
              </View>
              {!!case_.victim.description && (
                <Text style={styles.cardDesc}>{case_.victim.description}</Text>
              )}
            </SurfaceCard>
          </>
        )}

        {/* ── Suspects Preview ── */}
        <SectionLabel style={styles.flushLabel}>
          {t("cases.suspectsHeader", { count: case_.suspects?.length ?? 0 })}
        </SectionLabel>
        <View style={styles.stack}>
          {case_.suspects?.map((s: any) => (
            <SurfaceCard key={s.id} style={styles.suspectCard}>
              <Avatar
                size={42}
                shape="square"
                initials={s.name.slice(0, 2).toUpperCase()}
              />
              <View style={styles.suspectInfo}>
                <Text style={styles.suspectName}>{s.name}</Text>
                <Text style={styles.suspectRelation}>{s.relationship}</Text>
              </View>
              <Icon name="lock" size={16} color={colors.text.muted} />
            </SurfaceCard>
          ))}
        </View>

        {/* ── Locked Sections ── */}
        <SectionLabel style={styles.flushLabel}>
          {t("cases.unlockOnStart")}
        </SectionLabel>
        <View style={styles.stack}>
          <LockedRow
            icon="search"
            title={t("cases.evidenceTitle")}
            desc={t("cases.evidenceDesc", {
              count: case_.evidence?.length ?? 0,
            })}
          />
          <LockedRow
            icon="chat"
            title={t("cases.witnessTitle")}
            desc={t("cases.witnessDesc", {
              count: case_.witnessStatements?.length ?? 0,
            })}
          />
          <LockedRow
            icon="calendar"
            title={t("cases.timelineTitle")}
            desc={t("cases.timelineDesc", {
              count: case_.timeline?.length ?? 0,
            })}
          />
        </View>

        {/* ── CTA ── */}
        <View style={styles.ctaWrap}>
          {isCompleted ? (
            isCorrect ? (
              <View style={styles.solvedBanner}>
                <Icon name="checkCircle" size={32} color={colors.green} />
                <View>
                  <Text style={styles.solvedTitle}>
                    {t("cases.caseSolved")}
                  </Text>
                  <Text style={styles.solvedScore}>
                    {t("cases.ptsEarned", { score: investigation.score })}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.failedBanner}>
                <Icon name="closeCircle" size={32} color={colors.coral} />
                <View>
                  <Text style={styles.failedTitle}>
                    {t("cases.wrongAccusation")}
                  </Text>
                  <Text style={styles.solvedScore}>
                    {t("cases.ptsEarned", { score: investigation.score })}
                  </Text>
                </View>
              </View>
            )
          ) : (
            <>
              <GradientButton
                label={
                  isInProgress
                    ? t("home.continueInvestigation")
                    : t("home.startInvestigation")
                }
                iconRight="arrowRight"
                onPress={() =>
                  navigation.navigate("Investigation", { caseId: case_._id })
                }
              />
              <Text style={styles.hint}>{t("cases.ctaHint")}</Text>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Meta({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.metaItem}>
      <Icon name={icon} size={13} color={colors.text.label} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

function Dot() {
  return <View style={styles.metaDot} />;
}

function LockedRow({
  icon,
  title,
  desc,
}: {
  icon: any;
  title: string;
  desc: string;
}) {
  return (
    <SurfaceCard elevation="none" style={styles.lockedSection}>
      <View style={styles.lockedIconTile}>
        <Icon name={icon} size={18} color={colors.text.muted} />
      </View>
      <View style={styles.lockedInfo}>
        <Text style={styles.lockedTitle}>{title}</Text>
        <Text style={styles.lockedDesc}>{desc}</Text>
      </View>
      <View style={styles.lockedBadge}>
        <Icon name="lock" size={11} color={colors.text.muted} />
        <Text style={styles.lockedBadgeText}>{i18n.t("cases.locked")}</Text>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  safeTop: { flex: 1, backgroundColor: colors.bg.primary },
  container: { flex: 1, backgroundColor: colors.bg.primary },
  content: { paddingHorizontal: spacing[5], paddingBottom: spacing[16] },
  centered: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: { fontFamily: typography.families.body, color: colors.text.muted },

  appBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[5],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
  },
  iconTile: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: "center",
    justifyContent: "center",
  },
  appBarTitle: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    letterSpacing: typography.tracking.wider,
    color: colors.text.label,
  },

  caseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing[2],
    marginBottom: spacing[3],
  },
  caseTitle: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes["2xl"],
    color: colors.text.primary,
    lineHeight: typography.sizes["2xl"] * 1.05,
    marginBottom: spacing[3],
  },
  caseDescription: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    lineHeight: typography.sizes.base * 1.6,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing[3],
    marginTop: spacing[4],
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: {
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

  flushLabel: { paddingHorizontal: 0, marginTop: spacing[6] },
  stack: { gap: spacing[2] },

  card: { padding: spacing[4] },
  cardNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  cardName: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
  },
  cardDesc: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: typography.sizes.sm * 1.5,
  },

  suspectCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[3],
    gap: spacing[3],
  },
  suspectInfo: { flex: 1 },
  suspectName: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
  },
  suspectRelation: {
    fontFamily: typography.families.mono,
    fontSize: 9.5,
    color: colors.text.muted,
    marginTop: 3,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  lockedSection: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[3],
    gap: spacing[3],
    backgroundColor: colors.bg.sunken,
    opacity: 0.75,
  },
  lockedIconTile: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    backgroundColor: colors.bg.tertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  lockedInfo: { flex: 1 },
  lockedTitle: {
    fontFamily: typography.families.semibold,
    fontSize: typography.sizes.base,
    color: colors.text.soft,
  },
  lockedDesc: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
    marginTop: 2,
  },
  lockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.bg.tertiary,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radii.sm,
  },
  lockedBadgeText: {
    fontFamily: typography.families.mono,
    fontSize: 9,
    color: colors.text.muted,
    letterSpacing: 0.8,
  },

  ctaWrap: { marginTop: spacing[8] },
  solvedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.green + "1A",
    borderWidth: 1,
    borderColor: colors.green + "66",
    borderRadius: radii.md,
    padding: spacing[5],
    gap: spacing[4],
  },
  solvedTitle: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.lg,
    color: colors.green,
  },
  solvedScore: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
    marginTop: 3,
  },
  failedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.coral + "1A",
    borderWidth: 1,
    borderColor: colors.coral + "66",
    borderRadius: radii.md,
    padding: spacing[5],
    gap: spacing[4],
  },
  failedTitle: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.lg,
    color: colors.coral,
  },
  hint: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
    textAlign: "center",
    marginTop: spacing[4],
    lineHeight: typography.sizes.sm * 1.5,
  },
});
