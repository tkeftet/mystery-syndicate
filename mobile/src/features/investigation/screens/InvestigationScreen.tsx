import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AppStackParamList } from "../../../screens/HomeScreen";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import i18n, { type TranslationKey } from "../../../i18n";
import { colors, typography, spacing, radii, shadows, gradients } from "../../../theme";
import { useCaseById } from "../../cases/cases.hooks";
import { useInvestigationStore } from "../investigation.store";
import {
  startInvestigationApi,
  submitAccusationApi,
  getInvestigationApi,
  syncProgressApi,
} from "../investigation.service";

import { getMyProfileApi } from "../../profile/profile.service";
import { useHintApi, redeemAdRewardApi } from "../investigation.service";
import {
  participateEventApi,
  submitEventApi,
} from "../../events/events.service";
import { formatDuration } from "../../events/eventHelpers";
import {
  startChapterApi,
  submitChapterApi,
} from "../../seasons/seasons.service";
import { showRewardedAd } from "../../../services/ads";
import { track, AnalyticsEvent } from "../../../services/analytics";
import {
  AppPopup,
  type PopupVariant,
  type PopupButton,
} from "../../../components/ui/AppPopup";
import { Icon, type IconName } from "../../../components/ui/Icon";
import {
  GradientButton,
  ProgressBar,
  Avatar,
} from "../../../components/ui";

type Props = {
  navigation: NativeStackNavigationProp<AppStackParamList, "Investigation">;
  route: RouteProp<AppStackParamList, "Investigation">;
};

type PopupState = {
  title: string;
  message?: string;
  icon?: IconName;
  variant?: PopupVariant;
  buttons?: PopupButton[];
};

type Tab = "evidence" | "suspects" | "witnesses" | "timeline";

const TABS: { key: Tab; labelKey: TranslationKey; icon: IconName }[] = [
  { key: "evidence", labelKey: "investigation.tabEvidence", icon: "search" },
  { key: "suspects", labelKey: "investigation.tabSuspects", icon: "people" },
  { key: "witnesses", labelKey: "investigation.tabWitnesses", icon: "chat" },
  { key: "timeline", labelKey: "investigation.tabTimeline", icon: "calendar" },
];

const EVIDENCE_TYPE_COLOR: Record<string, string> = {
  physical: colors.amberLight,
  digital: colors.blue,
  testimonial: colors.green,
  document: "#B58BD6",
};

const EVIDENCE_TYPE_LABEL_KEY: Record<string, TranslationKey> = {
  physical: "evidenceType.physical",
  digital: "evidenceType.digital",
  testimonial: "evidenceType.testimonial",
  document: "evidenceType.document",
};

const RELIABILITY_CONFIG: Record<
  string,
  { color: string; labelKey: TranslationKey; icon: IconName }
> = {
  reliable: {
    color: colors.green,
    labelKey: "investigation.reliabilityReliable",
    icon: "checkCircle",
  },
  unreliable: {
    color: colors.coral,
    labelKey: "investigation.reliabilityUnreliable",
    icon: "closeCircle",
  },
  uncertain: {
    color: colors.warning,
    labelKey: "investigation.reliabilityUncertain",
    icon: "warning",
  },
};

export function InvestigationScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { caseId, eventId, seasonId, chapterNumber } = route.params;
  const isEvent = !!eventId;
  const isChapter = !!seasonId;
  const isStructured = isEvent || isChapter; // option-picker accusation
  const insets = useSafeAreaInsets();
  const { data: case_, isLoading } = useCaseById(caseId);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("evidence");
  const [showAccuseModal, setShowAccuseModal] = useState(false);
  const [selectedSuspect, setSelectedSuspect] = useState<any>(null);
  const [motive, setMotive] = useState("");
  // Event-mode accusation (mega cases also pick motive/weapon/timeline from lists)
  const [eventMotive, setEventMotive] = useState<string | null>(null);
  const [eventWeapon, setEventWeapon] = useState<string | null>(null);
  const [eventTimelineId, setEventTimelineId] = useState<string | null>(null);
  const [eventResult, setEventResult] = useState<any>(null);
  const [chapterResult, setChapterResult] = useState<any>(null);
  const [chapterCompleted, setChapterCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpData, setLevelUpData] = useState<{
    newLevel: number;
    oldLevel: number;
    coins?: number;
    hints?: number;
    milestones?: number[];
  } | null>(null);
  const [usingHint, setUsingHint] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [watchingAd, setWatchingAd] = useState(false);
  const [rewardDoubled, setRewardDoubled] = useState(false);

  const {
    inspectedEvidenceIds,
    reviewedSuspectIds,
    reviewedStatementIds,
    clearedSuspectIds,
    revealedRedHerringIds,
    markEvidenceInspected,
    markSuspectReviewed,
    markStatementReviewed,
    markSuspectCleared,
    markRedHerringRevealed,
    canAccuse,
    reset,
  } = useInvestigationStore();

  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: getMyProfileApi,
    staleTime: 1000 * 60 * 2,
  });

  useEffect(() => {
    reset();
    async function init() {
      try {
        // Event mode: enroll first (starts the clock + the investigation).
        if (isEvent && eventId) {
          try {
            await participateEventApi(eventId);
          } catch (e: any) {
            const msg = e?.response?.data?.error?.message ?? "";
            if (/already submitted/i.test(msg)) {
              navigation.replace("EventLeaderboard", { eventId });
              return;
            }
            setPopup({
              variant: "warning",
              title: i18n.t("investigation.cantStartEvent"),
              message: msg || i18n.t("investigation.eventUnavailable"),
            });
            navigation.goBack();
            return;
          }
        }

        // Chapter mode: enroll in the season chapter (starts clock + investigation).
        if (isChapter && seasonId && chapterNumber) {
          try {
            const r = await startChapterApi(seasonId, chapterNumber);
            if (r?.alreadyCompleted) setChapterCompleted(true);
          } catch (e: any) {
            setPopup({
              variant: "warning",
              title: i18n.t("investigation.chapterLocked"),
              message:
                e?.response?.data?.error?.message ??
                i18n.t("investigation.chapterUnavailable"),
            });
            navigation.goBack();
            return;
          }
        }

        const existing = await getInvestigationApi(caseId);

        if (!existing || !existing.status) {
          if (!isEvent && !isChapter) await startInvestigationApi(caseId);
          track(AnalyticsEvent.CASE_STARTED, {
            case_id: caseId,
            kind: isEvent ? "event" : isChapter ? "chapter" : "daily",
          });
          setInitialLoading(false);
          return;
        }

        if (existing.status === "completed") {
          setResult({
            isCorrect: existing.isCorrect,
            score: existing.score,
            solution: { suspectId: existing.accusation?.suspectId },
            explanation: i18n.t("investigation.alreadySolved"),
            streakResult: null,
          });
          if (existing.rewardDoubled) setRewardDoubled(true);
          setInitialLoading(false);
          return;
        }

        existing.inspectedEvidenceIds?.forEach((id: string) =>
          markEvidenceInspected(id),
        );
        existing.reviewedSuspectIds?.forEach((id: string) =>
          markSuspectReviewed(id),
        );
        existing.reviewedStatementIds?.forEach((id: string) =>
          markStatementReviewed(id),
        );
        existing.clearedSuspectIds?.forEach((id: string) =>
          markSuspectCleared(id),
        );
        existing.revealedRedHerringIds?.forEach((id: string) =>
          markRedHerringRevealed(id),
        );
        if (existing.hintsUsed >= 1) setHintUsed(true);

        setInitialLoading(false);
      } catch {
        try {
          await startInvestigationApi(caseId);
        } catch (e: any) {
          console.warn("Failed to start:", e?.message);
        } finally {
          setInitialLoading(false);
        }
      }
    }
    init();
  }, [caseId]);
  // Local-only: progress is synced to the backend in batch on goBack and
  // right before submitting an accusation (see syncProgress / handleGoBack).
  function handleInspectEvidence(evidenceId: string) {
    markEvidenceInspected(evidenceId);
  }

  function handleReviewSuspect(suspectId: string) {
    markSuspectReviewed(suspectId);
  }

  function handleReviewStatement(statementId: string) {
    markStatementReviewed(statementId);
  }

  async function syncProgress() {
    const { inspectedEvidenceIds, reviewedSuspectIds, reviewedStatementIds } =
      useInvestigationStore.getState();
    await syncProgressApi(caseId, {
      inspectedEvidenceIds,
      reviewedSuspectIds,
      reviewedStatementIds,
    }).catch(() => {});
  }

  async function handleGoBack() {
    await syncProgress();
    navigation.goBack();
  }

  async function handleSubmitEvent() {
    if (
      !selectedSuspect ||
      !eventMotive ||
      !eventWeapon ||
      !eventTimelineId ||
      !eventId
    ) {
      setPopup({
        variant: "warning",
        title: t("investigation.missingInfo"),
        message: t("investigation.missingEventFields"),
      });
      return;
    }
    setSubmitting(true);
    try {
      await syncProgress();
      const res = await submitEventApi(eventId, {
        suspectId: selectedSuspect.id,
        motive: eventMotive,
        weapon: eventWeapon,
        timelineEventId: eventTimelineId,
      });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["event-leaderboard", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-me", eventId] });
      queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
      queryClient.invalidateQueries({ queryKey: ["pass"] });
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      track(AnalyticsEvent.CASE_COMPLETED, {
        case_id: caseId,
        kind: "event",
        is_correct: res?.isCorrect,
        score: res?.score,
      });
      setShowAccuseModal(false);
      setEventResult(res);
    } catch (err: any) {
      setPopup({
        variant: "danger",
        title: t("investigation.submissionFailed"),
        message:
          err?.response?.data?.error?.message ??
          t("investigation.couldNotSubmit"),
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitChapter() {
    if (!selectedSuspect || !eventMotive || !eventTimelineId || !seasonId) {
      setPopup({
        variant: "warning",
        title: t("investigation.missingInfo"),
        message: t("investigation.missingChapterFields"),
      });
      return;
    }
    setSubmitting(true);
    try {
      await syncProgress();
      const res = await submitChapterApi(seasonId, chapterNumber as number, {
        suspectId: selectedSuspect.id,
        motive: eventMotive,
        timelineEventId: eventTimelineId,
      });
      queryClient.invalidateQueries({ queryKey: ["seasons"] });
      queryClient.invalidateQueries({ queryKey: ["season-map", seasonId] });
      queryClient.invalidateQueries({ queryKey: ["season-me", seasonId] });
      queryClient.invalidateQueries({ queryKey: ["season-leaderboard", seasonId] });
      queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
      queryClient.invalidateQueries({ queryKey: ["pass"] });
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      track(AnalyticsEvent.STORY_CHAPTER_COMPLETED, {
        season_id: seasonId,
        chapter: chapterNumber,
        is_correct: res?.isCorrect,
        score: res?.score,
      });
      setShowAccuseModal(false);
      setChapterResult(res);
    } catch (err: any) {
      setPopup({
        variant: "danger",
        title: t("investigation.submissionFailed"),
        message:
          err?.response?.data?.error?.message ??
          t("investigation.couldNotSubmit"),
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitAccusation() {
    if (!selectedSuspect || !motive.trim()) {
      setPopup({
        variant: "warning",
        title: t("investigation.missingInfo"),
        message: t("investigation.missingAccusationFields"),
      });
      return;
    }
    setSubmitting(true);
    try {
      await syncProgress();
      const res = await submitAccusationApi(caseId, selectedSuspect.id, motive);
      queryClient.invalidateQueries({ queryKey: ["investigation", caseId] });
      queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      // Progression (pass XP / challenges / achievements update server-side on solve)
      queryClient.invalidateQueries({ queryKey: ["pass"] });
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      queryClient.invalidateQueries({ queryKey: ["achievements"] });

      if (res.levelUp) {
        setLevelUpData(res.levelUp);
        setShowLevelUp(true);
      }

      track(AnalyticsEvent.CASE_COMPLETED, {
        case_id: caseId,
        kind: case_?.kind ?? "daily",
        is_correct: res?.isCorrect,
        score: res?.score,
      });
      setResult(res);
      setShowAccuseModal(false);
    } catch {
      setPopup({
        variant: "danger",
        title: t("common.error"),
        message: t("investigation.accusationFailed"),
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUseHint() {
    const totalEvidence = case_.evidence?.length ?? 0;
    const totalSuspects = case_.suspects?.length ?? 0;

    if (
      inspectedEvidenceIds.length < totalEvidence ||
      reviewedSuspectIds.length < totalSuspects
    ) {
      setPopup({
        variant: "warning",
        title: t("investigation.investigateFirst"),
        message: t("investigation.investigateFirstMsg"),
      });
      return;
    }

    if ((profile?.hints ?? 0) <= 0) {
      setPopup({
        variant: "warning",
        title: t("investigation.noHints"),
        message: t("investigation.buyHints"),
      });
      return;
    }

    // hintsUsed comes from the investigation, track locally via a state
    setPopup({
      variant: "info",
      icon: "hint",
      title: t("investigation.useHintTitle"),
      message: t("investigation.useHintMsg"),
      buttons: [
        {
          label: t("common.cancel"),
          variant: "secondary",
          onPress: () => setPopup(null),
        },
        {
          label: t("investigation.useHint"),
          variant: "primary",
          onPress: confirmUseHint,
        },
      ],
    });
  }

  async function confirmUseHint() {
    setPopup(null);
    setUsingHint(true);
    try {
      // Card taps live only in the local store; push them so the backend sees
      // all evidence/suspects as reviewed before it validates the hint.
      await syncProgress();
      const result = await useHintApi(caseId);
      markSuspectCleared(result.clearedSuspect.id);
      // Drop a stale selection if the hint just cleared the suspect we picked.
      if (selectedSuspect?.id === result.clearedSuspect.id) {
        setSelectedSuspect(null);
      }
      setHintUsed(true);
      await refetchProfile();
      setPopup({
        variant: "success",
        icon: "hint",
        title: t("investigation.suspectCleared"),
        message: t("investigation.suspectInnocent", {
          name: result.clearedSuspect.name,
        }),
      });
    } catch (err: any) {
      setPopup({
        variant: "danger",
        title: t("common.error"),
        message:
          err?.response?.data?.error?.message ??
          t("investigation.hintFailed"),
      });
    } finally {
      setUsingHint(false);
    }
  }

  // ── Rewarded-ad helpers ─────────────────────────────────────────────────
  // After the ad earns, the help is redeemed via an authenticated call that
  // applies it instantly and returns the updated investigation. The suspect /
  // red-herring choice stays server-side (the solution never reaches the
  // client). We intentionally don't send an SSV user_id, so AdMob's async
  // callback won't also grant it — this direct path is the single source of
  // truth for case helps (streak-save still uses SSV; see DailyLoginScreen).
  async function runRewardedAd(
    type: "eliminate" | "reveal" | "double",
  ): Promise<boolean> {
    setWatchingAd(true);
    try {
      // customData carries only the placement label for ad analytics; with no
      // user_id, the SSV callback has nothing to grant.
      return await showRewardedAd({ customData: JSON.stringify({ type }) });
    } finally {
      setWatchingAd(false);
    }
  }

  const APPLYING_POPUP: PopupState = {
    variant: "info",
    icon: "hint",
    title: t("investigation.applyingReward"),
    message: t("investigation.oneMoment"),
  };

  const adRewardError = (err: any): PopupState => ({
    variant: "warning",
    title: t("investigation.rewardFailed"),
    message:
      err?.response?.data?.error?.message ?? t("investigation.tryAgainSoon"),
  });

  async function handleAdEliminate() {
    const before = clearedSuspectIds;
    const earned = await runRewardedAd("eliminate");
    if (!earned) return;
    setPopup(APPLYING_POPUP);
    try {
      const inv = await redeemAdRewardApi(caseId, "eliminate");
      const cleared: string[] = inv?.clearedSuspectIds ?? [];
      cleared.forEach((id) => markSuspectCleared(id));
      const newId = cleared.find((id) => !before.includes(id));
      if (newId && selectedSuspect?.id === newId) setSelectedSuspect(null);
      const name = case_.suspects?.find((s: any) => s.id === newId)?.name;
      setPopup({
        variant: "success",
        icon: "hint",
        title: t("investigation.suspectCleared"),
        message: name
          ? t("investigation.suspectInnocent", { name })
          : t("investigation.aSuspectCleared"),
      });
    } catch (err) {
      setPopup(adRewardError(err));
    }
  }

  async function handleAdRevealHerring() {
    const before = revealedRedHerringIds;
    const earned = await runRewardedAd("reveal");
    if (!earned) return;
    setPopup(APPLYING_POPUP);
    try {
      const inv = await redeemAdRewardApi(caseId, "reveal");
      const revealed: string[] = inv?.revealedRedHerringIds ?? [];
      revealed.forEach((id) => markRedHerringRevealed(id));
      const newId = revealed.find((id) => !before.includes(id));
      const title = case_.evidence?.find((e: any) => e.id === newId)?.title;
      setPopup({
        variant: "warning",
        icon: "warning",
        title: t("investigation.redHerringExposed"),
        message: title
          ? t("investigation.decoyWarning", { title })
          : t("investigation.aRedHerringExposed"),
      });
    } catch (err) {
      setPopup(adRewardError(err));
    }
  }

  async function handleDoubleReward() {
    const earned = await runRewardedAd("double");
    if (!earned) return;
    setPopup(APPLYING_POPUP);
    try {
      const inv = await redeemAdRewardApi(caseId, "double");
      if (!inv?.rewardDoubled) throw new Error("Reward not doubled");
      setRewardDoubled(true);
      setResult((r: any) => (r ? { ...r, score: (r.score ?? 0) * 2 } : r));
      queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      refetchProfile();
      setPopup({
        variant: "success",
        icon: "coin",
        title: t("investigation.rewardDoubledTitle"),
        message: t("investigation.rewardDoubledMsg"),
      });
    } catch (err) {
      setPopup(adRewardError(err));
    }
  }

  if (isLoading || initialLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.amber} size="large" />
      </View>
    );
  }

  if (!case_) return null;

  const accuseUnlocked = canAccuse(
    case_.evidence?.length ?? 0,
    case_.suspects?.length ?? 0,
  );

  const evidenceProgress =
    inspectedEvidenceIds.length / (case_.evidence?.length ?? 1);
  const suspectsProgress =
    reviewedSuspectIds.length / (case_.suspects?.length ?? 1);
  const overallProgress = (evidenceProgress + suspectsProgress) / 2;

  // ── Result popup ──────────────────────────────────────────────────────────
  const streakResult = result?.streakResult;
  const redHerringStats = result?.redHerringStats;
  const resultModal = result ? (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => {
        setResult(null);
        navigation.navigate("Home");
      }}
    >
      <View style={styles.resultPopupOverlay}>
        <View
          style={[
            styles.resultPopupCard,
            {
              borderColor: result.isCorrect
                ? colors.border.amber
                : colors.coral + "66",
            },
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.resultPopupContent}
            showsVerticalScrollIndicator={false}
          >
            {/* seal */}
            <LinearGradient
              colors={
                result.isCorrect
                  ? gradients.seal
                  : [colors.coral, "#8E3B33"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.seal, shadows.glow]}
            >
              <Icon
                name={result.isCorrect ? "check" : "close"}
                size={44}
                color={result.isCorrect ? colors.text.inverse : "#1A0E0C"}
              />
            </LinearGradient>
            <Text style={styles.resultKicker}>
              {result.isCorrect
                ? t("investigation.caseClosed")
                : t("investigation.caseReopened")}
            </Text>
            <Text style={styles.resultTitle}>
              {result.isPerfect
                ? t("investigation.perfectInvestigationTitle")
                : result.isCorrect
                  ? t("cases.caseSolved")
                  : t("cases.wrongAccusation")}
            </Text>

            <View style={styles.scoreBox}>
              <Text style={styles.scoreLabel}>
                {t("investigation.finalScore")}
              </Text>
              <Text style={styles.scoreValue}>{result.score}</Text>
            </View>

            {/* ── Rewarded ad: double XP + coins ── */}
            {!rewardDoubled ? (
              <TouchableOpacity
                style={styles.doubleAdButton}
                onPress={handleDoubleReward}
                disabled={watchingAd}
              >
                {watchingAd ? (
                  <ActivityIndicator color={colors.text.inverse} size="small" />
                ) : (
                  <View style={styles.doubleAdRow}>
                    <Icon name="play" size={15} color={colors.text.inverse} />
                    <Text style={styles.doubleAdText}>
                      {t("investigation.watchAdDouble")}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.doubledBadge}>
                <Icon name="checkCircle" size={14} color={colors.success} />
                <Text style={styles.doubledBadgeText}>
                  {t("investigation.rewardDoubledBadge")}
                </Text>
              </View>
            )}

            <View style={styles.explanationCard}>
          <Text style={styles.explanationLabel}>
            {t("investigation.whatHappened")}
          </Text>
          <Text style={styles.resultExplanation}>{result.explanation}</Text>
          <Text style={styles.resultSolution}>
            {t("investigation.culprit", {
              name: case_.suspects?.find(
                (s: any) => s.id === result.solution.suspectId,
              )?.name,
            })}
          </Text>
        </View>

        {/* ── Perfect Case badge ── */}
        {result.isPerfect && (
          <View style={styles.perfectCard}>
            <View style={styles.perfectBadgeRow}>
              <Icon name="medal" size={16} color={colors.amber} />
              <Text style={styles.perfectBadge}>
                {t("investigation.perfectBadge")}
              </Text>
            </View>
            <Text style={styles.perfectDesc}>
              {t("investigation.perfectDesc")}
            </Text>
          </View>
        )}

        {/* ── Red Herring Tracker ── */}
        {redHerringStats && redHerringStats.total > 0 && (
          <View
            style={[
              styles.redHerringCard,
              redHerringStats.fooledBy.length === 0
                ? styles.redHerringCardClean
                : styles.redHerringCardFooled,
            ]}
          >
            <Text style={styles.redHerringLabel}>
              {t("investigation.redHerrings")}
            </Text>
            {redHerringStats.fooledBy.length === 0 ? (
              <View style={styles.redHerringRow}>
                <Icon name="target" size={16} color={colors.amber} />
                <Text style={styles.redHerringClean}>
                  {t("investigation.avoidedHerrings", {
                    avoided: redHerringStats.avoided,
                    total: redHerringStats.total,
                  })}
                </Text>
              </View>
            ) : (
              <View style={styles.redHerringFooledList}>
                {redHerringStats.fooledBy.map((title: string, i: number) => (
                  <View key={`${title}-${i}`} style={styles.redHerringRow}>
                    <Icon name="warning" size={16} color={colors.danger} />
                    <Text style={styles.redHerringFooled}>
                      {t("investigation.fooledBy", { title })}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {streakResult && (
          <View style={styles.streakCard}>
            <Icon
              name="streak"
              size={32}
              color={colors.amber}
              style={styles.streakEmoji}
            />
            <Text style={styles.streakCount}>
              {t("investigation.dayStreakCount", {
                count: streakResult.streak,
              })}
            </Text>
            {streakResult.isNewRecord && (
              <Text style={styles.streakRecord}>
                {t("investigation.newRecord")}
              </Text>
            )}
          </View>
        )}

        {streakResult?.rewardEarned && (
          <View style={styles.rewardCard}>
            <View style={styles.rewardLabelRow}>
              <Icon name="trophy" size={13} color={colors.amber} />
              <Text style={styles.rewardLabel}>
                {t("investigation.streakReward")}
              </Text>
            </View>
            <Text style={styles.rewardTitle}>
              {streakResult.rewardEarned.label}
            </Text>
            <View style={styles.rewardRow}>
              <View style={styles.rewardItem}>
                <Text style={styles.rewardValue}>
                  +{streakResult.rewardEarned.coins}
                </Text>
                <Text style={styles.rewardType}>
                  {t("investigation.coinsUnit")}
                </Text>
              </View>
              <View style={styles.rewardItem}>
                <Text style={styles.rewardValue}>
                  +{streakResult.rewardEarned.xp}
                </Text>
                <Text style={styles.rewardType}>
                  {t("investigation.xpUnit")}
                </Text>
              </View>
            </View>
          </View>
        )}

          </ScrollView>

          <GradientButton
            label={t("investigation.backToHome")}
            style={styles.doneButton}
            onPress={() => {
              setResult(null);
              navigation.navigate("Home");
            }}
          />
        </View>
      </View>
    </Modal>
  ) : null;

  return (
    <View style={styles.container}>
      {/* ── App bar ── */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <TouchableOpacity onPress={handleGoBack} style={styles.iconTile}>
          <Icon name="back" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {case_.title}
        </Text>
        {chapterCompleted || result ? (
          <View style={styles.iconTile} />
        ) : (
          <TouchableOpacity
            style={[styles.hintButton, hintUsed && styles.hintButtonUsed]}
            onPress={handleUseHint}
            disabled={usingHint || hintUsed}
          >
            {usingHint ? (
              <ActivityIndicator color={colors.amber} size="small" />
            ) : (
              <View style={styles.hintButtonContent}>
                <Icon name="hint" size={15} color={colors.amber} />
                <Text style={styles.hintButtonText}>
                  {hintUsed
                    ? t("investigation.hintUsedLabel")
                    : `${Math.max(0, profile?.hints ?? 0)}`}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* ── Progress ── */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>
            {t("investigation.progressLabel")}
          </Text>
          <Text style={styles.progressPct}>
            {Math.round(overallProgress * 100)}%
          </Text>
        </View>
        <ProgressBar progress={overallProgress} />
      </View>

      {/* ── Rewarded-ad help (opt-in) — hidden once the case can't be acted on ── */}
      {!chapterCompleted && !result && (
      <View style={styles.adHelpRow}>
        <TouchableOpacity
          style={styles.adHelpButton}
          onPress={handleAdEliminate}
          disabled={watchingAd}
        >
          {watchingAd ? (
            <ActivityIndicator color={colors.amber} size="small" />
          ) : (
            <>
              <Icon name="play" size={13} color={colors.amber} />
              <Text style={styles.adHelpText}>
                {t("investigation.adEliminate")}
              </Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.adHelpButton}
          onPress={handleAdRevealHerring}
          disabled={watchingAd}
        >
          {watchingAd ? (
            <ActivityIndicator color={colors.amber} size="small" />
          ) : (
            <>
              <Icon name="play" size={13} color={colors.amber} />
              <Text style={styles.adHelpText}>
                {t("investigation.adReveal")}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      )}

      {/* ── Tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabs}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          let count = 0;
          let total = 0;
          if (tab.key === "evidence") {
            count = inspectedEvidenceIds.length;
            total = case_.evidence?.length ?? 0;
          }
          if (tab.key === "suspects") {
            count = reviewedSuspectIds.length;
            total = case_.suspects?.length ?? 0;
          }
          if (tab.key === "witnesses") {
            count = reviewedStatementIds.length;
            total = case_.witnessStatements?.length ?? 0;
          }

          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Icon
                name={tab.icon}
                size={18}
                color={isActive ? colors.amber : colors.text.muted}
              />
              <Text
                style={[styles.tabLabel, isActive && styles.tabLabelActive]}
              >
                {t(tab.labelKey)}
              </Text>
              {total > 0 && (
                <View
                  style={[
                    styles.tabBadge,
                    count === total && styles.tabBadgeDone,
                  ]}
                >
                  <Text style={styles.tabBadgeText}>
                    {count}/{total}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Content ── */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentPadding}
      >
        {/* Victim briefing (shown on the landing tab; some cases skip CaseDetail) */}
        {activeTab === "evidence" && case_.victim?.name && (
          <View style={styles.victimCard}>
            <View style={styles.victimHeader}>
              <Icon name="user" size={14} color={colors.coral} />
              <Text style={styles.victimLabel}>{t("cases.victim")}</Text>
            </View>
            <Text style={styles.victimName}>{case_.victim.name}</Text>
            {!!case_.victim.description && (
              <Text style={styles.victimDesc}>{case_.victim.description}</Text>
            )}
          </View>
        )}

        {/* Evidence */}
        {activeTab === "evidence" &&
          case_.evidence?.map((e: any) => {
            const inspected = inspectedEvidenceIds.includes(e.id);
            const typeColor = EVIDENCE_TYPE_COLOR[e.type] ?? colors.amber;
            return (
              <TouchableOpacity
                key={e.id}
                style={[styles.card, inspected && styles.cardDone]}
                onPress={() => handleInspectEvidence(e.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[styles.cardAccent, { backgroundColor: typeColor }]}
                />
                <View style={styles.cardBody}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{e.title}</Text>
                    {inspected ? (
                      <View style={styles.doneBadge}>
                        <Icon name="check" size={11} color={colors.success} />
                        <Text style={styles.doneBadgeText}>
                          {t("investigation.inspected")}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.tapBadge}>
                        <Text style={styles.tapBadgeText}>
                          {t("investigation.tapToInspect")}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.cardTag, { color: typeColor }]}>
                    {EVIDENCE_TYPE_LABEL_KEY[e.type]
                      ? t(EVIDENCE_TYPE_LABEL_KEY[e.type])
                      : e.type.toUpperCase()}
                  </Text>
                  {inspected && (
                    <Text style={styles.cardDesc}>{e.description}</Text>
                  )}
                  {!inspected && (
                    <Text style={styles.cardLocked}>
                      {t("investigation.tapToReveal")}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

        {/* Suspects */}
        {activeTab === "suspects" &&
          case_.suspects?.map((s: any) => {
            const reviewed = reviewedSuspectIds.includes(s.id);
            const cleared = clearedSuspectIds.includes(s.id);
            return (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.card,
                  reviewed && styles.cardDone,
                  cleared && styles.cardCleared,
                ]}
                onPress={() => handleReviewSuspect(s.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.cardAccent,
                    { backgroundColor: cleared ? colors.success : colors.info },
                  ]}
                />
                <View style={styles.cardBody}>
                  <View style={styles.cardHeader}>
                    <View style={styles.suspectNameRow}>
                      <Avatar
                        size={38}
                        initials={s.name.slice(0, 2).toUpperCase()}
                      />
                      <View>
                        <Text
                          style={[
                            styles.cardTitle,
                            cleared && styles.cardTitleCleared,
                          ]}
                        >
                          {s.name}
                        </Text>
                        <Text style={[styles.cardTag, { color: colors.info }]}>
                          {s.relationship.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    {cleared ? (
                      <View style={styles.clearedBadge}>
                        <Icon name="check" size={11} color={colors.success} />
                        <Text style={styles.clearedBadgeText}>
                          {t("investigation.cleared")}
                        </Text>
                      </View>
                    ) : reviewed ? (
                      <View style={styles.doneBadge}>
                        <Icon name="check" size={11} color={colors.success} />
                        <Text style={styles.doneBadgeText}>
                          {t("investigation.questioned")}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.tapBadge}>
                        <Text style={styles.tapBadgeText}>
                          {t("investigation.tap")}
                        </Text>
                      </View>
                    )}
                  </View>
                  {reviewed && (
                    <>
                      <Text style={styles.cardDesc}>{s.description}</Text>
                      <View style={styles.alibiBox}>
                        <Text style={styles.alibiLabel}>
                          {t("investigation.alibi")}
                        </Text>
                        <Text style={styles.alibiText}>{s.alibi}</Text>
                      </View>
                    </>
                  )}
                  {!reviewed && (
                    <Text style={styles.cardLocked}>
                      {t("investigation.tapToQuestion")}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

        {/* Witnesses */}
        {activeTab === "witnesses" &&
          case_.witnessStatements?.map((w: any) => {
            const reviewed = reviewedStatementIds.includes(w.id);
            const relConfig = RELIABILITY_CONFIG[w.reliability];
            return (
              <TouchableOpacity
                key={w.id}
                style={[styles.card, reviewed && styles.cardDone]}
                onPress={() => handleReviewStatement(w.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.cardAccent,
                    { backgroundColor: relConfig.color },
                  ]}
                />
                <View style={styles.cardBody}>
                  <View style={styles.cardHeader}>
                    <View style={styles.witnessNameRow}>
                      <Icon
                        name="chat"
                        size={15}
                        color={colors.text.primary}
                      />
                      <Text style={styles.cardTitle}>{w.witnessName}</Text>
                    </View>
                    {reviewed ? (
                      <View style={styles.doneBadge}>
                        <Icon name="check" size={11} color={colors.success} />
                        <Text style={styles.doneBadgeText}>
                          {t("investigation.read")}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.tapBadge}>
                        <Text style={styles.tapBadgeText}>
                          {t("investigation.tap")}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.cardTagRow}>
                    <Icon
                      name={relConfig.icon}
                      size={12}
                      color={relConfig.color}
                    />
                    <Text
                      style={[
                        styles.cardTag,
                        { color: relConfig.color, marginBottom: 0 },
                      ]}
                    >
                      {t(relConfig.labelKey)}
                    </Text>
                  </View>
                  {reviewed ? (
                    <Text style={styles.statementText}>"{w.statement}"</Text>
                  ) : (
                    <Text style={styles.cardLocked}>
                      {t("investigation.tapToRead")}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

        {/* Timeline */}
        {activeTab === "timeline" && (
          <View style={styles.timeline}>
            {case_.timeline?.map((t: any, index: number) => (
              <View key={t.id} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={styles.timelineDot} />
                  {index < case_.timeline.length - 1 && (
                    <View style={styles.timelineLine} />
                  )}
                </View>
                <View style={styles.timelineCard}>
                  <Text style={styles.timelineTime}>{t.time}</Text>
                  <Text style={styles.timelineDesc}>{t.description}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Accuse Button ── */}
      <View
        style={[styles.accuseBar, { paddingBottom: spacing[4] + insets.bottom }]}
      >
        {isChapter && chapterCompleted ? (
          <View style={styles.accuseLocked}>
            <Icon name="checkCircle" size={15} color={colors.success} />
            <Text style={[styles.accuseLockedText, { color: colors.success }]}>
              {t("investigation.chapterCompletedReview")}
            </Text>
          </View>
        ) : accuseUnlocked ? (
          <GradientButton
            label={t("investigation.makeAccusation")}
            icon="scales"
            onPress={() => setShowAccuseModal(true)}
          />
        ) : (
          <View style={styles.accuseLocked}>
            <Icon name="lock" size={15} color={colors.text.muted} />
            <Text style={styles.accuseLockedText}>
              {t("investigation.investigateMore", {
                percent: Math.round(overallProgress * 100),
              })}
            </Text>
          </View>
        )}
      </View>

      {/* ── Accuse Modal ── */}
      <Modal visible={showAccuseModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalTitleRow}>
              <Icon name="scales" size={20} color={colors.text.primary} />
              <Text style={styles.modalTitle}>
                {t("investigation.makeYourAccusation")}
              </Text>
            </View>
            <Text style={styles.modalSubtitle}>
              {t("investigation.chooseWisely")}
            </Text>

            <Text style={styles.modalLabel}>
              {t("investigation.whoIsGuilty")}
            </Text>
            {case_.suspects?.map((s: any) => {
              const cleared = clearedSuspectIds.includes(s.id);
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.suspectOption,
                    selectedSuspect?.id === s.id && styles.suspectOptionSelected,
                    cleared && styles.cardCleared,
                  ]}
                  onPress={() => !cleared && setSelectedSuspect(s)}
                  disabled={cleared}
                >
                  <Avatar
                    size={36}
                    initials={s.name.slice(0, 2).toUpperCase()}
                  />
                  <Text
                    style={[
                      styles.suspectOptionText,
                      cleared && styles.cardTitleCleared,
                    ]}
                  >
                    {s.name}
                  </Text>
                  {cleared ? (
                    <View style={styles.clearedBadge}>
                      <Icon name="check" size={11} color={colors.success} />
                      <Text style={styles.clearedBadgeText}>
                        {t("investigation.cleared")}
                      </Text>
                    </View>
                  ) : (
                    selectedSuspect?.id === s.id && (
                      <Icon name="check" size={18} color={colors.amber} />
                    )
                  )}
                </TouchableOpacity>
              );
            })}

            {isStructured ? (
              <>
                <Text style={styles.modalLabel}>
                  {t("investigation.whatMotive")}
                </Text>
                <View style={styles.optionWrap}>
                  {(case_.megaOptions?.motives ?? []).map((m: string) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.optionChip,
                        eventMotive === m && styles.optionChipSel,
                      ]}
                      onPress={() => setEventMotive(m)}
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          eventMotive === m && styles.optionChipTextSel,
                        ]}
                      >
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {isEvent && (
                  <>
                    <Text style={styles.modalLabel}>
                      {t("investigation.whichWeapon")}
                    </Text>
                    <View style={styles.optionWrap}>
                      {(case_.megaOptions?.weapons ?? []).map((w: string) => (
                        <TouchableOpacity
                          key={w}
                          style={[
                            styles.optionChip,
                            eventWeapon === w && styles.optionChipSel,
                          ]}
                          onPress={() => setEventWeapon(w)}
                        >
                          <Text
                            style={[
                              styles.optionChipText,
                              eventWeapon === w && styles.optionChipTextSel,
                            ]}
                          >
                            {w}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                <Text style={styles.modalLabel}>
                  {t("investigation.keyMoment")}
                </Text>
                {(case_.timeline ?? []).map((t: any) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.optionChipWide,
                      eventTimelineId === t.id && styles.optionChipSel,
                    ]}
                    onPress={() => setEventTimelineId(t.id)}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        eventTimelineId === t.id && styles.optionChipTextSel,
                      ]}
                    >
                      {t.time} — {t.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <>
                <Text style={styles.modalLabel}>
                  {t("investigation.whatMotive")}
                </Text>
                <TextInput
                  style={styles.motiveInput}
                  placeholder={t("investigation.motivePlaceholder")}
                  placeholderTextColor={colors.text.muted}
                  value={motive}
                  onChangeText={setMotive}
                  multiline
                  numberOfLines={3}
                />
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAccuseModal(false)}
              >
                <Text style={styles.cancelButtonText}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
              <GradientButton
                label={
                  isStructured
                    ? t("investigation.submit")
                    : t("investigation.accuse")
                }
                style={styles.submitButton}
                loading={submitting}
                disabled={
                  isChapter
                    ? !selectedSuspect || !eventMotive || !eventTimelineId
                    : isEvent
                      ? !selectedSuspect ||
                        !eventMotive ||
                        !eventWeapon ||
                        !eventTimelineId
                      : !selectedSuspect || !motive.trim()
                }
                onPress={
                  isChapter
                    ? handleSubmitChapter
                    : isEvent
                      ? handleSubmitEvent
                      : handleSubmitAccusation
                }
              />
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Result Popup ── */}
      {resultModal}

      {/* ── Event Result Modal ── */}
      <Modal visible={!!eventResult} transparent animationType="fade">
        <View style={styles.levelUpOverlay}>
          <View style={styles.levelUpCard}>
            <LinearGradient
              colors={gradients.seal}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.seal, shadows.glow, styles.levelUpEmoji]}
            >
              <Icon
                name={eventResult?.isCorrect ? "trophy" : "closeCircle"}
                size={42}
                color={colors.text.inverse}
              />
            </LinearGradient>
            <Text style={styles.levelUpTitle}>
              {eventResult?.isCorrect
                ? t("investigation.caseSolvedCaps")
                : t("investigation.submitted")}
            </Text>
            <Text style={styles.levelUpSub}>
              {t("investigation.ptsValue", { score: eventResult?.score })}
            </Text>
            <Text style={styles.levelUpDesc}>
              {t("investigation.accuracyDuration", {
                accuracy: eventResult?.accuracy,
                duration: formatDuration(eventResult?.completionTimeSec),
              })}
            </Text>

            {eventResult?.scoreBreakdown && (
              <View style={styles.levelUpRewards}>
                {Object.entries(eventResult.scoreBreakdown)
                  .filter(([, v]) => (v as number) > 0)
                  .map(([k, v]) => (
                    <View key={k} style={styles.levelUpRewardRow}>
                      <Icon name="checkCircle" size={15} color={colors.amber} />
                      <Text style={styles.levelUpRewardText}>
                        +{v as number} {k}
                      </Text>
                    </View>
                  ))}
              </View>
            )}

            <GradientButton
              label={t("investigation.viewLeaderboard")}
              style={styles.levelUpButton}
              onPress={() => {
                setEventResult(null);
                navigation.replace("EventLeaderboard", { eventId: eventId! });
              }}
            />
            <TouchableOpacity
              style={styles.eventResultHome}
              onPress={() => {
                setEventResult(null);
                navigation.navigate("Home");
              }}
            >
              <Text style={styles.eventResultHomeText}>
                {t("investigation.backToHome")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Chapter Result Modal (Story Arc) ── */}
      <Modal visible={!!chapterResult} transparent animationType="fade">
        <View style={styles.levelUpOverlay}>
          <View style={styles.levelUpCard}>
            <LinearGradient
              colors={gradients.seal}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.seal, shadows.glow, styles.levelUpEmoji]}
            >
              <Icon
                name={chapterResult?.result?.isCorrect ? "checkCircle" : "search"}
                size={42}
                color={colors.text.inverse}
              />
            </LinearGradient>
            <Text style={styles.levelUpTitle}>
              {chapterResult?.seasonCompleted
                ? t("investigation.seasonComplete")
                : t("investigation.chapterComplete")}
            </Text>
            <Text style={styles.levelUpSub}>
              {t("investigation.ptsValue", {
                score: chapterResult?.result?.score,
              })}
            </Text>
            <Text style={styles.levelUpDesc}>
              {t("investigation.accuracyOnly", {
                accuracy: chapterResult?.result?.accuracy,
              })}
            </Text>

            {!!chapterResult?.cliffhanger && (
              <View style={styles.cliffhangerCard}>
                <Text style={styles.cliffhangerLabel}>
                  {t("investigation.cliffhanger")}
                </Text>
                <Text style={styles.cliffhangerBody}>
                  “{chapterResult.cliffhanger}”
                </Text>
              </View>
            )}

            {!!chapterResult?.nextChapter && (
              <Text style={styles.nextTease}>
                {chapterResult.nextChapter.unlocked
                  ? t("investigation.nextChapterReady")
                  : t("investigation.chapterUnlocks", {
                      number: chapterResult.nextChapter.chapterNumber,
                      date: new Date(
                        chapterResult.nextChapter.unlockDate,
                      ).toLocaleDateString(i18n.language),
                    })}
              </Text>
            )}

            {!!chapterResult?.rewardsEarned?.length && (
              <View style={styles.levelUpRewards}>
                {chapterResult.rewardsEarned.map((r: any, i: number) => (
                  <View key={i} style={styles.levelUpRewardRow}>
                    <Icon name="coin" size={15} color={colors.amber} />
                    <Text style={styles.levelUpRewardText}>
                      {[
                        r.xp && t("investigation.xpReward", { count: r.xp }),
                        r.coins &&
                          t("investigation.coinsReward", { count: r.coins }),
                        r.title && t("investigation.rewardTitle"),
                        r.badge && t("investigation.rewardBadge"),
                        r.avatar && t("investigation.rewardAvatar"),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <GradientButton
              label={t("play.continue")}
              style={styles.levelUpButton}
              onPress={() => {
                setChapterResult(null);
                navigation.goBack();
              }}
            />
            <TouchableOpacity
              style={styles.eventResultHome}
              onPress={() => {
                setChapterResult(null);
                // replace (not navigate) so back doesn't return to the
                // already-completed chapter.
                if (seasonId)
                  navigation.replace("SeasonLeaderboard", { seasonId });
              }}
            >
              <Text style={styles.eventResultHomeText}>
                {t("investigation.viewLeaderboard")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Level Up Modal ── */}
      <Modal visible={showLevelUp} transparent animationType="fade">
        <View style={styles.levelUpOverlay}>
          <View style={styles.levelUpCard}>
            <LinearGradient
              colors={gradients.seal}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.seal, shadows.glow, styles.levelUpEmoji]}
            >
              <Icon name="star" size={42} color={colors.text.inverse} />
            </LinearGradient>
            <Text style={styles.levelUpTitle}>
              {t("investigation.levelUp")}
            </Text>
            <Text style={styles.levelUpSub}>
              {levelUpData?.oldLevel} → {levelUpData?.newLevel}
            </Text>
            <Text style={styles.levelUpDesc}>
              {t("investigation.reachedLevel", {
                level: levelUpData?.newLevel,
              })}
            </Text>
            {!!levelUpData?.milestones?.length && (
              <Text style={styles.levelUpMilestone}>
                {t("investigation.milestoneUnlocked")}
              </Text>
            )}
            {!!(levelUpData?.coins || levelUpData?.hints) && (
              <View style={styles.levelUpRewards}>
                {!!levelUpData?.coins && (
                  <View style={styles.levelUpRewardRow}>
                    <Icon name="coin" size={18} color={colors.amber} />
                    <Text style={styles.levelUpRewardText}>
                      {t("investigation.coinsReward", {
                        count: levelUpData.coins,
                      })}
                    </Text>
                  </View>
                )}
                {!!levelUpData?.hints && (
                  <View style={styles.levelUpRewardRow}>
                    <Icon name="hint" size={18} color={colors.amber} />
                    <Text style={styles.levelUpRewardText}>
                      {t("investigation.hintsReward", {
                        count: levelUpData.hints,
                      })}
                    </Text>
                  </View>
                )}
              </View>
            )}
            <GradientButton
              label={t("play.continue")}
              style={styles.levelUpButton}
              onPress={() => setShowLevelUp(false)}
            />
          </View>
        </View>
      </Modal>

      {/* ── Themed Popup (alerts / confirmations) ── */}
      <AppPopup
        visible={!!popup}
        title={popup?.title ?? ""}
        message={popup?.message}
        icon={popup?.icon}
        variant={popup?.variant}
        buttons={popup?.buttons}
        onClose={() => setPopup(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[3],
    gap: spacing[3],
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
  headerTitle: {
    flex: 1,
    fontFamily: typography.families.display,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    textAlign: "center",
  },
  progressSection: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.text.label,
  },
  progressPct: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.amber,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    maxHeight: 70,
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: spacing[2],
    gap: spacing[2],
    alignItems: "center",
    paddingVertical: spacing[2],
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: 20,
    backgroundColor: colors.bg.secondary,
  },
  tabActive: {
    backgroundColor: colors.amberGlow,
    borderWidth: 1,
    borderColor: colors.amber,
  },
  tabEmoji: {
    fontSize: 16,
  },
  tabLabel: {
    fontFamily: typography.families.medium,
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
  },
  tabLabelActive: {
    color: colors.amber,
  },
  tabBadge: {
    backgroundColor: colors.bg.tertiary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tabBadgeDone: {
    backgroundColor: colors.success + "30",
  },
  tabBadgeText: {
    fontFamily: typography.families.mono,
    fontSize: 9.5,
    color: colors.text.muted,
  },
  content: {
    flex: 1,
  },
  contentPadding: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  victimCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.coral + "55",
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  victimHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing[2],
  },
  victimLabel: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.coral,
  },
  victimName: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.lg,
    color: colors.text.primary,
  },
  victimDesc: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: typography.sizes.sm * 1.5,
    marginTop: 4,
  },
  card: {
    flexDirection: "row",
    backgroundColor: colors.bg.secondary,
    borderRadius: radii.lg,
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: "hidden",
    ...shadows.card,
  },
  cardDone: {
    borderColor: colors.border.default,
    backgroundColor: colors.bg.elevated,
  },
  cardAccent: {
    width: 4,
  },
  cardBody: {
    flex: 1,
    padding: spacing[4],
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing[2],
    gap: spacing[2],
  },
  cardTitle: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    flex: 1,
  },
  cardTag: {
    fontFamily: typography.families.mono,
    fontSize: 9.5,
    letterSpacing: 1,
    marginBottom: spacing[2],
  },
  cardTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: spacing[2],
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  hintButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  accuseButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  perfectBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing[2],
  },
  redHerringRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  rewardLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: spacing[2],
  },
  witnessNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardDesc: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: typography.sizes.sm * 1.5,
  },
  cardLocked: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
    fontStyle: "italic",
  },
  doneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.success + "20",
    borderRadius: 8,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
  },
  doneBadgeText: {
    fontFamily: typography.families.mono,
    fontSize: 9,
    color: colors.success,
    letterSpacing: 0.5,
  },
  tapBadge: {
    backgroundColor: colors.amberGlow,
    borderRadius: 8,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
  },
  tapBadgeText: {
    fontFamily: typography.families.mono,
    fontSize: 9,
    color: colors.amber,
    letterSpacing: 0.5,
  },
  suspectNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    flex: 1,
  },
  suspectAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bg.tertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  suspectAvatarText: {
    fontFamily: typography.families.bold,
    fontSize: typography.sizes.xs,
    color: colors.info,
  },
  alibiBox: {
    marginTop: spacing[3],
    backgroundColor: colors.bg.primary,
    borderRadius: 8,
    padding: spacing[3],
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  alibiLabel: {
    fontFamily: typography.families.mono,
    fontSize: 9.5,
    color: colors.warning,
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  alibiText: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    fontStyle: "italic",
  },
  statementText: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: typography.sizes.sm * 1.6,
    fontStyle: "italic",
  },
  timeline: {
    paddingTop: spacing[2],
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: spacing[4],
  },
  timelineLeft: {
    alignItems: "center",
    marginEnd: spacing[4],
    width: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.amber,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border.default,
    marginTop: 4,
    minHeight: 30,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  timelineTime: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    color: colors.amber,
    letterSpacing: 1.2,
    marginBottom: spacing[1],
  },
  timelineDesc: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: typography.sizes.sm * 1.5,
  },
  accuseBar: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    backgroundColor: colors.bg.primary,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  accuseLocked: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radii.md,
    paddingVertical: 15,
  },
  accuseLockedText: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.bg.overlay,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.bg.secondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing[6],
    maxHeight: "90%",
  },
  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  optionChip: {
    backgroundColor: colors.bg.tertiary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 999,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  optionChipWide: {
    backgroundColor: colors.bg.tertiary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radii.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    marginBottom: spacing[2],
  },
  optionChipSel: {
    backgroundColor: colors.amberGlow,
    borderColor: colors.amber,
  },
  optionChipText: {
    fontFamily: typography.families.medium,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  optionChipTextSel: {
    color: colors.amber,
  },
  cliffhangerCard: {
    width: "100%",
    backgroundColor: colors.bg.tertiary,
    borderRadius: radii.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.amber,
    padding: spacing[3],
    marginTop: spacing[2],
    marginBottom: spacing[3],
  },
  cliffhangerLabel: {
    fontFamily: typography.families.mono,
    fontSize: 9,
    letterSpacing: 2,
    color: colors.amberLight,
    marginBottom: 4,
  },
  cliffhangerBody: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
    fontStyle: "italic",
    lineHeight: typography.sizes.sm * 1.4,
  },
  nextTease: {
    fontFamily: typography.families.medium,
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing[4],
  },
  eventResultHome: {
    marginTop: spacing[3],
    paddingVertical: spacing[2],
  },
  eventResultHomeText: {
    fontFamily: typography.families.medium,
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
  },
  modalTitle: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.xl,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  modalSubtitle: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
    marginBottom: spacing[5],
  },
  modalLabel: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    color: colors.text.label,
    letterSpacing: 1.6,
    marginBottom: spacing[2],
    marginTop: spacing[3],
  },
  suspectOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.tertiary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 12,
    padding: spacing[3],
    marginBottom: spacing[2],
    gap: spacing[3],
  },
  suspectOptionSelected: {
    borderColor: colors.amber,
    backgroundColor: colors.amberGlow,
  },
  suspectOptionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bg.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  suspectOptionAvatarText: {
    fontFamily: typography.families.bold,
    fontSize: typography.sizes.xs,
    color: colors.amber,
  },
  suspectOptionText: {
    fontFamily: typography.families.medium,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    flex: 1,
  },
  suspectOptionCheck: {
    fontFamily: typography.families.bold,
    fontSize: typography.sizes.base,
    color: colors.amber,
  },
  motiveInput: {
    backgroundColor: colors.bg.tertiary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 12,
    padding: spacing[4],
    color: colors.text.primary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    textAlignVertical: "top",
    minHeight: 80,
    marginBottom: spacing[4],
  },
  modalButtons: {
    flexDirection: "row",
    gap: spacing[3],
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.bg.tertiary,
    borderRadius: 12,
    padding: spacing[4],
    alignItems: "center",
  },
  cancelButtonText: {
    fontFamily: typography.families.medium,
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
  },
  submitButton: {
    flex: 2,
  },
  resultPopupOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing[5],
  },
  resultPopupCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 24,
    borderWidth: 2,
    width: "100%",
    maxHeight: "88%",
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[5],
  },
  resultPopupContent: {
    alignItems: "center",
    paddingBottom: spacing[4],
  },
  seal: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[4],
  },
  resultKicker: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    letterSpacing: 3,
    color: colors.amberLight,
    marginBottom: spacing[2],
  },
  resultTitle: {
    fontFamily: typography.families.displayItalic,
    fontSize: typography.sizes["2xl"],
    color: colors.text.primary,
    marginBottom: spacing[5],
    textAlign: "center",
    lineHeight: typography.sizes["2xl"] * 1.05,
  },
  scoreBox: {
    width: "100%",
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.amber,
    borderRadius: radii.lg,
    paddingVertical: spacing[5],
    alignItems: "center",
    marginBottom: spacing[4],
  },
  scoreLabel: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.text.label,
  },
  scoreValue: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes["4xl"],
    color: colors.amberLight,
    lineHeight: typography.sizes["4xl"],
    marginTop: spacing[1],
  },
  doubleAdButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.amber,
    borderRadius: radii.md,
    paddingVertical: spacing[3],
    marginBottom: spacing[4],
    ...shadows.glow,
  },
  doubleAdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  doubleAdText: {
    fontFamily: typography.families.monoBold,
    fontSize: typography.sizes.sm,
    color: colors.text.inverse,
    letterSpacing: 0.5,
  },
  doubledBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  doubledBadgeText: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.sm,
    color: colors.success,
    letterSpacing: 0.5,
  },
  adHelpRow: {
    flexDirection: "row",
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    marginBottom: spacing[3],
  },
  adHelpButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 38,
    backgroundColor: colors.amberGlow,
    borderWidth: 1,
    borderColor: colors.amber,
    borderRadius: radii.md,
    paddingVertical: spacing[2],
  },
  adHelpText: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    color: colors.amber,
    letterSpacing: 0.3,
  },
  explanationCard: {
    backgroundColor: colors.bg.tertiary,
    borderRadius: 16,
    padding: spacing[5],
    width: "100%",
    marginBottom: spacing[3],
  },
  explanationLabel: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    color: colors.text.label,
    letterSpacing: 1.8,
    marginBottom: spacing[2],
  },
  resultExplanation: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.text.soft,
    lineHeight: typography.sizes.sm * 1.6,
    marginBottom: spacing[3],
  },
  resultSolution: {
    fontFamily: typography.families.semibold,
    fontSize: typography.sizes.base,
    color: colors.amberLight,
  },
  perfectCard: {
    backgroundColor: colors.amberGlow,
    borderWidth: 1,
    borderColor: colors.amber,
    borderRadius: 16,
    padding: spacing[5],
    width: "100%",
    alignItems: "center",
    marginBottom: spacing[4],
  },
  perfectBadge: {
    fontFamily: typography.families.monoBold,
    fontSize: 11,
    color: colors.amber,
    letterSpacing: 1.5,
  },
  perfectDesc: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: typography.sizes.sm * 1.5,
  },
  redHerringCard: {
    backgroundColor: colors.bg.tertiary,
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing[5],
    width: "100%",
    marginBottom: spacing[3],
  },
  redHerringCardClean: {
    borderColor: colors.amber,
  },
  redHerringCardFooled: {
    borderColor: colors.danger,
  },
  redHerringLabel: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    color: colors.text.label,
    letterSpacing: 1.8,
    marginBottom: spacing[2],
  },
  redHerringClean: {
    flex: 1,
    fontFamily: typography.families.semibold,
    fontSize: typography.sizes.base,
    color: colors.amber,
  },
  redHerringFooledList: {
    gap: spacing[2],
  },
  redHerringFooled: {
    flex: 1,
    fontFamily: typography.families.medium,
    fontSize: typography.sizes.base,
    color: colors.danger,
    lineHeight: typography.sizes.base * 1.4,
  },
  streakCard: {
    backgroundColor: colors.bg.tertiary,
    borderRadius: 16,
    padding: spacing[5],
    width: "100%",
    alignItems: "center",
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  streakEmoji: {
    fontSize: 32,
    marginBottom: spacing[2],
  },
  streakCount: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.xl,
    color: colors.text.primary,
  },
  streakRecord: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    color: colors.amber,
    letterSpacing: 1.2,
    marginTop: spacing[1],
  },
  rewardCard: {
    backgroundColor: colors.amberGlow,
    borderWidth: 1,
    borderColor: colors.amber,
    borderRadius: 16,
    padding: spacing[5],
    width: "100%",
    alignItems: "center",
    marginBottom: spacing[6],
  },
  rewardLabel: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    color: colors.amber,
    letterSpacing: 1.6,
  },
  rewardTitle: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.lg,
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  rewardRow: {
    flexDirection: "row",
    gap: spacing[8],
  },
  rewardItem: {
    alignItems: "center",
  },
  rewardValue: {
    fontFamily: typography.families.bold,
    fontSize: typography.sizes.xl,
    color: colors.amber,
  },
  rewardType: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
  },
  doneButton: {
    width: "100%",
    marginTop: spacing[2],
  },
  levelUpOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing[6],
  },
  levelUpCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 24,
    padding: spacing[8],
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.amber,
    width: "100%",
  },
  levelUpEmoji: {
    marginBottom: spacing[4],
  },
  levelUpTitle: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.md,
    color: colors.amber,
    letterSpacing: 4,
    marginBottom: spacing[2],
  },
  levelUpSub: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes["2xl"],
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  levelUpDesc: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    marginBottom: spacing[4],
    textAlign: "center",
  },
  levelUpMilestone: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.sm,
    color: colors.amber,
    letterSpacing: 1.5,
    textAlign: "center",
    marginBottom: spacing[3],
  },
  levelUpRewards: {
    width: "100%",
    gap: spacing[2],
    marginBottom: spacing[6],
    alignItems: "center",
  },
  levelUpRewardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
  },
  levelUpRewardText: {
    fontFamily: typography.families.bold,
    fontSize: typography.sizes.base,
    color: colors.amber,
  },
  levelUpButton: {
    width: "100%",
  },
  hintButton: {
    backgroundColor: colors.amberGlow,
    borderWidth: 1,
    borderColor: colors.amber,
    borderRadius: 20,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  hintButtonText: {
    fontFamily: typography.families.bold,
    fontSize: typography.sizes.sm,
    color: colors.amber,
  },
  cardCleared: {
    opacity: 0.5,
  },
  cardTitleCleared: {
    textDecorationLine: "line-through",
  },
  clearedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.success + "20",
    borderRadius: 8,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
  },
  clearedBadgeText: {
    fontFamily: typography.families.mono,
    fontSize: 9,
    color: colors.success,
    letterSpacing: 0.5,
  },
  hintButtonUsed: {
    opacity: 0.4,
    borderColor: colors.text.muted,
  },
});
