import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import i18n, { type TranslationKey } from "../../../i18n";
import { colors, typography, spacing, radii, gradients, shadows } from "../../../theme";
import type { AppStackParamList } from "../../../screens/HomeScreen";
import { Icon, ProgressBar, Avatar } from "../../../components/ui";
import { AppPopup, type PopupButton } from "../../../components/ui/AppPopup";
import { AVATAR_ICONS } from "../../../constants/iconMappings";
import {
  useMyAgency,
  useAgencyList,
  useAgencyRequests,
} from "../agencies.hooks";
import {
  joinAgencyApi,
  leaveAgencyApi,
  deleteAgencyApi,
  approveRequestApi,
  rejectRequestApi,
  kickMemberApi,
  transferLeadershipApi,
  setMemberRoleApi,
} from "../agencies.service";

type Nav = NativeStackNavigationProp<AppStackParamList>;
const RANK: Record<string, number> = { leader: 4, coleader: 3, officer: 2, member: 1 };
const ROLE_LABEL_KEY: Record<string, TranslationKey> = {
  leader: "agencies.roleLeader",
  coleader: "agencies.roleColeader",
  officer: "agencies.roleOfficer",
  member: "agencies.roleMember",
};
const roleLabel = (role: string) =>
  ROLE_LABEL_KEY[role] ? i18n.t(ROLE_LABEL_KEY[role]) : role;

export function AgenciesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const { data: mine, isLoading } = useMyAgency();
  const inAgency = !!mine?.agency;
  const myRole = mine?.myRole ?? "member";
  const canManage = RANK[myRole] >= RANK.officer;

  const [query, setQuery] = useState("");
  const { data: list } = useAgencyList(inAgency ? "" : query);
  const { data: requests } = useAgencyRequests(canManage && inAgency);
  const [popup, setPopup] = useState<{ title: string; message?: string; buttons?: PopupButton[] } | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["agency"] });
  }
  async function run(fn: () => Promise<unknown>) {
    try {
      await fn();
      invalidate();
    } catch {
      /* ignore */
    }
  }

  function manageMember(m: any) {
    if (!canManage || m.userId === mine?.members?.find((x: any) => x.role === myRole && x.userId === m.userId)?.userId) {
      // fallthrough; permission handled per-action below
    }
    if (RANK[m.role] >= RANK[myRole]) return; // can't manage equal/higher
    const buttons: PopupButton[] = [];
    if (RANK[myRole] >= RANK.coleader) {
      if (m.role === "member")
        buttons.push({ label: t("agencies.promoteOfficer"), variant: "primary", onPress: () => { setPopup(null); run(() => setMemberRoleApi(m.userId, "officer")); } });
      if (m.role === "officer")
        buttons.push({ label: t("agencies.demoteMember"), variant: "secondary", onPress: () => { setPopup(null); run(() => setMemberRoleApi(m.userId, "member")); } });
    }
    if (myRole === "leader")
      buttons.push({ label: t("agencies.transferLeadership"), variant: "secondary", onPress: () => { setPopup(null); run(() => transferLeadershipApi(m.userId)); } });
    buttons.push({ label: t("agencies.kick"), variant: "danger", onPress: () => { setPopup(null); run(() => kickMemberApi(m.userId)); } });
    buttons.push({ label: t("common.cancel"), variant: "secondary", onPress: () => setPopup(null) });
    setPopup({ title: m.username, message: roleLabel(m.role), buttons });
  }

  if (isLoading) {
    return (
      <View style={[styles.safeTop, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.amber} style={{ marginTop: spacing[10] }} />
      </View>
    );
  }

  return (
    <View style={[styles.safeTop, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="back" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>{t("agencies.kicker")}</Text>
          <Text style={styles.headerTitle}>{t("agencies.title")}</Text>
        </View>
        <TouchableOpacity
          style={styles.rankBtn}
          onPress={() => navigation.navigate("AgencyLeaderboard")}
        >
          <Icon name="trophy" size={16} color={colors.amber} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {inAgency ? (
          <>
            {/* Dashboard */}
            <LinearGradient colors={gradients.seal} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.banner, shadows.glow]}>
              <Text style={styles.bannerName}>{mine.agency.name}</Text>
              <Text style={styles.bannerDesc} numberOfLines={2}>{mine.agency.description || t("agencies.noDescription")}</Text>
              <View style={styles.bannerStats}>
                <View style={styles.bStat}><Text style={styles.bVal}>{t("agencies.levelShort", { level: mine.agency.level })}</Text><Text style={styles.bLbl}>{t("agencies.levelCaps")}</Text></View>
                <View style={styles.bStat}><Text style={styles.bVal}>{mine.agency.weeklyPoints}</Text><Text style={styles.bLbl}>{t("agencies.weeklyCaps")}</Text></View>
                <View style={styles.bStat}><Text style={styles.bVal}>{mine.agency.memberCount}/{mine.agency.memberCap}</Text><Text style={styles.bLbl}>{t("agencies.membersCaps")}</Text></View>
              </View>
              <View style={styles.barWrap}>
                <ProgressBar
                  progress={Math.min(
                    1,
                    (mine.agency.agencyXp - 500 * mine.agency.level * (mine.agency.level + 1)) /
                      (1000 * (mine.agency.level + 1)),
                  )}
                />
              </View>
            </LinearGradient>

            {/* Requests (officer+) */}
            {canManage && requests && requests.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>
                  {t("agencies.joinRequests")}
                </Text>
                {requests.map((r: any) => (
                  <View key={r.userId} style={styles.row}>
                    <Avatar size={36} icon={AVATAR_ICONS[r.avatar]} initials={r.username.slice(0, 2).toUpperCase()} />
                    <Text style={styles.rowName}>{r.username}</Text>
                    <TouchableOpacity style={[styles.pill, styles.pillPrimary]} onPress={() => run(() => approveRequestApi(r.userId))}>
                      <Text style={styles.pillPrimaryText}>
                        {t("agencies.approve")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.pill} onPress={() => run(() => rejectRequestApi(r.userId))}>
                      <Text style={styles.pillText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}

            {/* Members */}
            <Text style={styles.sectionLabel}>
              {t("agencies.membersCount", { count: mine.members.length })}
            </Text>
            {mine.members.map((m: any) => (
              <TouchableOpacity
                key={m.userId}
                style={styles.row}
                activeOpacity={canManage && RANK[m.role] < RANK[myRole] ? 0.7 : 1}
                onPress={() => manageMember(m)}
              >
                <View>
                  <Avatar size={36} icon={AVATAR_ICONS[m.avatar]} initials={m.username.slice(0, 2).toUpperCase()} />
                  {m.online && <View style={styles.onlineDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{m.username}</Text>
                  <Text style={styles.rowSub}>
                    {t("agencies.roleContribution", {
                      role: roleLabel(m.role),
                      points: m.contributionTotal,
                    })}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Footer actions */}
            <TouchableOpacity
              style={styles.dangerBtn}
              onPress={() =>
                setPopup({
                  title: myRole === "leader" ? t("agencies.leaveDeleteTitle") : t("agencies.leaveTitle"),
                  message:
                    myRole === "leader"
                      ? t("agencies.leaderLeaveMsg")
                      : t("agencies.memberLeaveMsg"),
                  buttons:
                    myRole === "leader"
                      ? [
                          { label: t("agencies.deleteAgency"), variant: "danger", onPress: () => { setPopup(null); run(() => deleteAgencyApi()); } },
                          { label: t("common.cancel"), variant: "secondary", onPress: () => setPopup(null) },
                        ]
                      : [
                          { label: t("agencies.leave"), variant: "danger", onPress: () => { setPopup(null); run(() => leaveAgencyApi()); } },
                          { label: t("common.cancel"), variant: "secondary", onPress: () => setPopup(null) },
                        ],
                })
              }
            >
              <Text style={styles.dangerText}>
                {myRole === "leader" ? t("agencies.leaveDeleteAgency") : t("agencies.leaveAgency")}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Browse + create */}
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => navigation.navigate("CreateAgency")}
            >
              <Icon name="sparkles" size={16} color={colors.text.inverse} />
              <Text style={styles.createText}>{t("agencies.createAgency")}</Text>
            </TouchableOpacity>

            <View style={styles.searchBar}>
              <Icon name="search" size={16} color={colors.text.muted} />
              <TextInput
                style={styles.searchInput}
                placeholder={t("agencies.searchPlaceholder")}
                placeholderTextColor={colors.text.muted}
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
              />
            </View>

            {list?.results?.length ? (
              list.results.map((a: any) => (
                <View key={a.id} style={styles.row}>
                  <View style={styles.agencyIcon}>
                    <Icon name="scales" size={18} color={colors.amber} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName} numberOfLines={1}>{a.name}</Text>
                    <Text style={styles.rowSub}>
                      {t("agencies.agencyMeta", {
                        level: a.level,
                        members: a.memberCount,
                        cap: a.memberCap,
                        weekly: a.weeklyPoints,
                      })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.pill, styles.pillPrimary]}
                    onPress={() =>
                      run(async () => {
                        const res: any = await joinAgencyApi(a.id);
                        if (res?.status === "requested")
                          setPopup({ title: t("agencies.requestSent"), message: t("agencies.requestSentMsg") });
                      })
                    }
                  >
                    <Text style={styles.pillPrimaryText}>
                      {a.privacy === "request" ? t("agencies.request") : t("agencies.join")}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.empty}>{t("agencies.noAgencies")}</Text>
            )}
          </>
        )}
      </ScrollView>

      <AppPopup
        visible={!!popup}
        title={popup?.title ?? ""}
        message={popup?.message}
        buttons={popup?.buttons}
        onClose={() => setPopup(null)}
      />
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
    width: 38, height: 38, borderRadius: radii.sm, backgroundColor: colors.bg.secondary,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border.subtle,
  },
  rankBtn: {
    width: 38, height: 38, borderRadius: radii.sm, backgroundColor: colors.bg.secondary,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border.subtle,
  },
  kicker: { fontFamily: typography.families.mono, fontSize: typography.sizes.xs, letterSpacing: typography.tracking.wider, color: colors.text.label, marginBottom: 2 },
  headerTitle: { fontFamily: typography.families.display, fontSize: typography.sizes.xl, color: colors.text.primary },
  content: { paddingHorizontal: spacing[5], paddingBottom: spacing[16] },
  banner: { borderRadius: radii.xl, padding: spacing[5], marginBottom: spacing[4] },
  bannerName: { fontFamily: typography.families.display, fontSize: typography.sizes["2xl"], color: colors.text.inverse },
  bannerDesc: { fontFamily: typography.families.body, fontSize: typography.sizes.sm, color: colors.text.inverse, opacity: 0.9, marginTop: 2, marginBottom: spacing[3] },
  bannerStats: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing[3] },
  bStat: { alignItems: "center" },
  bVal: { fontFamily: typography.families.display, fontSize: typography.sizes.lg, color: colors.text.inverse },
  bLbl: { fontFamily: typography.families.mono, fontSize: 9, letterSpacing: 1, color: colors.text.inverse, opacity: 0.8 },
  barWrap: {},
  sectionLabel: { fontFamily: typography.families.mono, fontSize: 11, letterSpacing: 2, color: colors.text.label, marginTop: spacing[4], marginBottom: spacing[3] },
  row: {
    flexDirection: "row", alignItems: "center", gap: spacing[3],
    backgroundColor: colors.bg.secondary, borderRadius: radii.md, padding: spacing[3],
    borderWidth: 1, borderColor: colors.border.subtle, marginBottom: spacing[2],
  },
  onlineDot: { position: "absolute", end: -1, bottom: -1, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.green, borderWidth: 2, borderColor: colors.bg.secondary },
  rowName: { fontFamily: typography.families.display, fontSize: typography.sizes.md, color: colors.text.primary },
  rowSub: { fontFamily: typography.families.mono, fontSize: typography.sizes.xs, color: colors.text.muted, marginTop: 2 },
  agencyIcon: { width: 40, height: 40, borderRadius: radii.sm, backgroundColor: colors.amberGlow, alignItems: "center", justifyContent: "center" },
  pill: { paddingHorizontal: spacing[3], paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.bg.tertiary },
  pillText: { fontFamily: typography.families.mono, fontSize: typography.sizes.xs, color: colors.text.secondary },
  pillPrimary: { backgroundColor: colors.amber, borderColor: colors.amber },
  pillPrimaryText: { fontFamily: typography.families.monoBold, fontSize: typography.sizes.xs, color: colors.text.inverse },
  createBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing[2],
    backgroundColor: colors.amber, borderRadius: radii.md, paddingVertical: spacing[3], marginBottom: spacing[4],
  },
  createText: { fontFamily: typography.families.monoBold, fontSize: typography.sizes.sm, color: colors.text.inverse },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: spacing[2], paddingHorizontal: spacing[3],
    backgroundColor: colors.bg.secondary, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border.subtle, marginBottom: spacing[3],
  },
  searchInput: { flex: 1, paddingVertical: spacing[3], fontFamily: typography.families.body, fontSize: typography.sizes.base, color: colors.text.primary },
  dangerBtn: { marginTop: spacing[5], alignItems: "center", paddingVertical: spacing[3], borderRadius: radii.md, borderWidth: 1, borderColor: colors.danger + "66" },
  dangerText: { fontFamily: typography.families.mono, fontSize: typography.sizes.sm, color: colors.danger },
  empty: { fontFamily: typography.families.body, fontSize: typography.sizes.sm, color: colors.text.muted, textAlign: "center", paddingVertical: spacing[6] },
});
