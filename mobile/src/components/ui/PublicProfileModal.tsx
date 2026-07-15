import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import i18n from "../../i18n";
import { colors, typography, spacing, radii, gradients, shadows } from "../../theme";
import { Icon } from "./Icon";
import { GradientButton } from "./GradientButton";
import { Pill } from "./Badge";
import { Avatar } from "./Avatar";
import {
  rankMeta,
  AVATAR_ICONS,
  TITLE_META,
} from "../../constants/iconMappings";
import { getPublicProfileApi } from "../../features/profile/profile.service";
import {
  sendRequestApi,
  acceptRequestApi,
  cancelRequestApi,
  removeFriendApi,
  blockUserApi,
  unblockUserApi,
} from "../../features/friends/friends.service";
import { likeProfileApi } from "../../features/cosmetics/cosmetics.service";
import {
  frameRingColor,
  backgroundColors,
  nameColorHex,
  iconForCosmetic,
} from "../../features/cosmetics/cosmeticDisplay";

interface Props {
  userId: string | null;
  onClose: () => void;
}

function Stat({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function PublicProfileModal({ userId, onClose }: Props) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const { data: profile, isLoading } = useQuery({
    queryKey: ["publicProfile", userId],
    queryFn: () => getPublicProfileApi(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const rank = profile ? rankMeta(profile.rank) : null;
  const titleMeta =
    profile?.title ? TITLE_META[profile.title] : null;

  // Cosmetic showcase derived display.
  const frameRing = frameRingColor(profile?.activeFrame);
  const bgColors = backgroundColors(profile?.activeBackground);
  const nameHex = nameColorHex(profile?.activeNameColor) ?? colors.text.primary;
  const prestige = iconForCosmetic(profile?.activePrestigeIcon);
  const featuredBadge = iconForCosmetic(profile?.featuredBadge);

  async function like() {
    if (!userId) return;
    setBusy(true);
    try {
      await likeProfileApi(userId);
      queryClient.invalidateQueries({ queryKey: ["publicProfile", userId] });
    } catch {
      // best-effort (e.g. not friends)
    } finally {
      setBusy(false);
    }
  }

  async function act(fn: (id: string) => Promise<unknown>) {
    if (!userId) return;
    setBusy(true);
    try {
      await fn(userId);
      queryClient.invalidateQueries({ queryKey: ["publicProfile", userId] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["user-search"] });
    } catch {
      // best-effort
    } finally {
      setBusy(false);
    }
  }

  function FriendAction() {
    const s = profile?.friendStatus;
    if (!s || s === "self" || s === "blocked_by") return null;
    if (s === "friends") {
      return (
        <View style={styles.actionCol}>
          <GradientButton
            label={i18n.t("publicProfile.removeFriend")}
            variant="outline"
            style={styles.cta}
            loading={busy}
            onPress={() => act(removeFriendApi)}
          />
          <TouchableOpacity onPress={() => act(blockUserApi)} disabled={busy}>
            <Text style={styles.blockText}>
              {i18n.t("publicProfile.block")}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (s === "pending_received") {
      return (
        <GradientButton
          label={i18n.t("publicProfile.acceptRequest")}
          style={styles.cta}
          loading={busy}
          onPress={() => act(acceptRequestApi)}
        />
      );
    }
    if (s === "pending_sent") {
      return (
        <GradientButton
          label={i18n.t("publicProfile.cancelRequest")}
          variant="outline"
          style={styles.cta}
          loading={busy}
          onPress={() => act(cancelRequestApi)}
        />
      );
    }
    if (s === "blocked") {
      return (
        <GradientButton
          label={i18n.t("publicProfile.unblock")}
          variant="outline"
          style={styles.cta}
          loading={busy}
          onPress={() => act(unblockUserApi)}
        />
      );
    }
    // none
    return (
      <GradientButton
        label={i18n.t("publicProfile.addFriend")}
        style={styles.cta}
        loading={busy}
        onPress={() => act(sendRequestApi)}
      />
    );
  }

  return (
    <Modal visible={!!userId} transparent animationType="fade">
      <View style={styles.overlay}>
        <LinearGradient
          colors={[colors.amberLight, colors.amberDim, colors.bg.tertiary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.frame, shadows.hero]}
        >
          <View style={styles.card}>
            {isLoading ? (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.amber} size="large" />
              </View>
            ) : profile && rank ? (
              <>
                {/* holo header — uses the equipped background */}
                <View style={styles.holo}>
                  <LinearGradient
                    colors={bgColors ?? gradients.coverGlow}
                    start={{ x: 0.3, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={styles.holoRank}>
                    {i18n.t("publicProfile.rankGlobal")}
                  </Text>
                  <TouchableOpacity style={styles.holoClose} onPress={onClose}>
                    <Icon name="close" size={14} color={colors.text.primary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.body}>
                  <View style={styles.avatarWrap}>
                    <Avatar
                      size={92}
                      icon={AVATAR_ICONS[profile.avatar]}
                      initials={profile.username.slice(0, 2).toUpperCase()}
                      level={profile.level}
                      borderColor={frameRing ?? colors.border.amber}
                    />
                  </View>

                  <View style={styles.usernameRow}>
                    <Text style={[styles.username, { color: nameHex }]}>
                      {profile.username}
                    </Text>
                    {prestige && <Icon name={prestige} size={17} color={colors.amber} />}
                  </View>
                  <View style={styles.rankRow}>
                    <Pill label={rank.label} icon={rank.icon} color={rank.color} />
                  </View>
                  {titleMeta && (
                    <Text style={styles.titleQuote}>“{titleMeta.label}”</Text>
                  )}

                  {/* Featured badge + achievement score + agency */}
                  <View style={styles.showcaseRow}>
                    {featuredBadge && (
                      <View style={styles.showcaseChip}>
                        <Icon name={featuredBadge} size={12} color={colors.amber} />
                        <Text style={styles.showcaseChipText}>
                          {i18n.t("publicProfile.badge")}
                        </Text>
                      </View>
                    )}
                    {typeof profile.achievementScore === "number" && (
                      <View style={styles.showcaseChip}>
                        <Icon name="trophy" size={12} color={colors.amber} />
                        <Text style={styles.showcaseChipText}>
                          {profile.achievementScore} pts
                        </Text>
                      </View>
                    )}
                    {profile.agency && (
                      <View style={styles.showcaseChip}>
                        <Icon name="scales" size={12} color={colors.amber} />
                        <Text style={styles.showcaseChipText} numberOfLines={1}>
                          {profile.agency.name}
                        </Text>
                      </View>
                    )}
                    {typeof profile.seasonLevel === "number" && profile.seasonLevel > 0 && (
                      <View style={styles.showcaseChip}>
                        <Icon name="sparkles" size={12} color={colors.amber} />
                        <Text style={styles.showcaseChipText}>
                          {i18n.t("publicProfile.seasonLv", {
                            level: profile.seasonLevel,
                          })}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Likes */}
                  {profile.friendStatus === "friends" && (
                    <TouchableOpacity
                      style={[styles.likeBtn, profile.likedByMe && styles.likeBtnActive]}
                      onPress={like}
                      disabled={busy}
                      activeOpacity={0.85}
                    >
                      <Icon
                        name={profile.likedByMe ? "checkCircle" : "star"}
                        size={14}
                        color={profile.likedByMe ? colors.amber : colors.text.secondary}
                      />
                      <Text style={[styles.likeText, profile.likedByMe && styles.likeTextActive]}>
                        {profile.likedByMe
                          ? i18n.t("publicProfile.liked")
                          : i18n.t("publicProfile.like")}{" "}
                        · {profile.profileLikes ?? 0}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {profile.online && (
                    <Text style={styles.onlineText}>
                      {i18n.t("publicProfile.onlineNow")}
                    </Text>
                  )}

                  {profile.statsHidden ? (
                    <Text style={styles.hiddenText}>
                      {i18n.t("publicProfile.statsHidden")}
                    </Text>
                  ) : (
                    <>
                      <View style={styles.statsRow}>
                        <Stat
                          value={`${profile.totalSolved ?? 0}`}
                          label={i18n.t("publicProfile.solvedCaps")}
                        />
                        <View style={styles.statDivider} />
                        <Stat
                          value={`${profile.accuracy ?? 0}%`}
                          label={i18n.t("publicProfile.accuracyCaps")}
                          color={colors.green}
                        />
                        <View style={styles.statDivider} />
                        <Stat
                          value={`${profile.streak ?? 0}`}
                          label={i18n.t("publicProfile.streakCaps")}
                        />
                      </View>
                      <Text style={styles.xpText}>
                        {(profile.xp ?? 0).toLocaleString()} XP
                      </Text>
                    </>
                  )}

                  <FriendAction />

                  <GradientButton
                    label={i18n.t("common.close")}
                    variant="outline"
                    style={styles.cta}
                    onPress={onClose}
                  />
                </View>
              </>
            ) : (
              <View style={styles.loading}>
                <Text style={styles.errorText}>
                  {i18n.t("publicProfile.notFound")}
                </Text>
                <GradientButton
                  label={i18n.t("common.close")}
                  variant="outline"
                  style={styles.cta}
                  onPress={onClose}
                />
              </View>
            )}
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.bg.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing[6],
  },
  frame: {
    borderRadius: radii["2xl"],
    padding: 2,
    width: "100%",
    maxWidth: 340,
  },
  card: {
    borderRadius: radii.xl,
    backgroundColor: colors.bg.elevated,
    overflow: "hidden",
  },
  loading: { padding: spacing[8], alignItems: "center", gap: spacing[4] },

  holo: { height: 96, overflow: "hidden", backgroundColor: colors.bg.tertiary },
  holoRank: {
    position: "absolute",
    top: 13,
    start: 15,
    fontFamily: typography.families.mono,
    fontSize: 9,
    letterSpacing: 1.8,
    color: colors.amberLight,
  },
  holoClose: {
    position: "absolute",
    top: 12,
    end: 12,
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    backgroundColor: "rgba(20,20,24,0.5)",
    borderWidth: 1,
    borderColor: colors.border.strong,
    alignItems: "center",
    justifyContent: "center",
  },

  body: { paddingHorizontal: spacing[5], paddingBottom: spacing[5], alignItems: "center" },
  avatarWrap: { marginTop: -46 },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing[3],
  },
  username: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.xl,
    color: colors.text.primary,
  },
  showcaseRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing[2],
    marginTop: spacing[3],
  },
  showcaseChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: 130,
    backgroundColor: colors.amberGlow,
    borderRadius: radii.pill,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
  },
  showcaseChipText: {
    fontFamily: typography.families.mono,
    fontSize: 9.5,
    color: colors.amberLight,
    letterSpacing: 0.3,
  },
  likeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing[4],
    backgroundColor: colors.bg.sunken,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radii.pill,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  likeBtnActive: { borderColor: colors.border.amber, backgroundColor: colors.amberGlow },
  likeText: {
    fontFamily: typography.families.monoBold,
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  likeTextActive: { color: colors.amber },
  rankRow: { marginTop: spacing[2] },
  titleQuote: {
    fontFamily: typography.families.displayItalic,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginTop: spacing[2],
  },

  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: colors.bg.sunken,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radii.md,
    paddingVertical: spacing[3],
    marginTop: spacing[4],
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statValue: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.lg,
    color: colors.text.primary,
    lineHeight: typography.sizes.lg,
  },
  statLabel: {
    fontFamily: typography.families.mono,
    fontSize: 8,
    letterSpacing: 0.8,
    color: colors.text.label,
  },
  statDivider: { width: 1, height: 30, backgroundColor: colors.border.subtle },

  xpText: {
    fontFamily: typography.families.monoBold,
    fontSize: typography.sizes.sm,
    color: colors.amberLight,
    marginTop: spacing[4],
    letterSpacing: 1,
  },
  errorText: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    color: colors.text.muted,
  },
  cta: { width: "100%", marginTop: spacing[3] },
  actionCol: { width: "100%", alignItems: "center", gap: spacing[2] },
  blockText: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    color: colors.danger,
    paddingVertical: spacing[1],
  },
  onlineText: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    color: colors.green,
    marginTop: spacing[2],
  },
  hiddenText: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
    textAlign: "center",
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
});
