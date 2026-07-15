import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import i18n, { type TranslationKey } from "../../../i18n";
import { colors, typography, spacing, radii } from "../../../theme";
import type { AppStackParamList } from "../../../screens/HomeScreen";
import { Icon, Avatar } from "../../../components/ui";
import { PublicProfileModal } from "../../../components/ui/PublicProfileModal";
import { AVATAR_ICONS, rankMeta } from "../../../constants/iconMappings";
import { useFriends, useFriendRequests, useUserSearch } from "../friends.hooks";
import {
  sendRequestApi,
  acceptRequestApi,
  rejectRequestApi,
  cancelRequestApi,
} from "../friends.service";

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Tab = "friends" | "requests" | "find";

const TAB_LABEL_KEY: Record<Tab, TranslationKey> = {
  friends: "friends.tabFriends",
  requests: "friends.tabRequests",
  find: "friends.tabFind",
};

function PresenceDot({ online }: { online: boolean }) {
  return (
    <View
      style={[
        styles.dot,
        { backgroundColor: online ? colors.green : colors.text.faint },
      ]}
    />
  );
}

function UserRow({
  u,
  onPress,
  right,
}: {
  u: any;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  const rank = rankMeta(u.rank);
  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={onPress ? 0.8 : 1}
      disabled={!onPress}
      onPress={onPress}
    >
      <View>
        <Avatar
          size={42}
          icon={AVATAR_ICONS[u.avatar]}
          initials={u.username.slice(0, 2).toUpperCase()}
        />
        <View style={styles.dotWrap}>
          <PresenceDot online={!!u.online} />
        </View>
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>
          {u.username}
        </Text>
        <Text style={[styles.rowMeta, { color: rank.color }]}>
          {rank.label} · {i18n.t("friends.lvShort", { level: u.level ?? 1 })}
          {u.streak
            ? ` · ${i18n.t("friends.streakShort", { count: u.streak })}`
            : ""}
        </Text>
      </View>
      {right}
    </TouchableOpacity>
  );
}

export function FriendsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("friends");
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const { data: friends, isLoading: lf, refetch: refetchFriends, isRefetching } =
    useFriends();
  const { data: requests, isLoading: lr } = useFriendRequests();
  const { data: search, isLoading: ls } = useUserSearch(query);

  const incomingCount = requests?.incoming?.length ?? 0;

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["friends"] });
    queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
    queryClient.invalidateQueries({ queryKey: ["user-search"] });
  }

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    try {
      await fn();
      invalidateAll();
    } catch {
      // surfaced minimally; the lists just won't change
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={[styles.safeTop, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="back" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.kicker}>{t("friends.kicker")}</Text>
          <Text style={styles.headerTitle}>{t("friends.title")}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(["friends", "requests", "find"] as Tab[]).map((tabKey) => {
          const active = tab === tabKey;
          return (
            <TouchableOpacity
              key={tabKey}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(tabKey)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {t(TAB_LABEL_KEY[tabKey])}
                {tabKey === "requests" && incomingCount > 0
                  ? ` (${incomingCount})`
                  : ""}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Friends ── */}
      {tab === "friends" &&
        (lf ? (
          <ActivityIndicator color={colors.amber} style={styles.loader} />
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetchFriends}
                tintColor={colors.amber}
              />
            }
          >
            {friends && friends.length > 0 ? (
              friends.map((u: any) => (
                <UserRow
                  key={u.userId}
                  u={u}
                  onPress={() => setSelectedUserId(u.userId)}
                />
              ))
            ) : (
              <Text style={styles.empty}>{t("friends.noFriends")}</Text>
            )}
          </ScrollView>
        ))}

      {/* ── Requests ── */}
      {tab === "requests" &&
        (lr ? (
          <ActivityIndicator color={colors.amber} style={styles.loader} />
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            <Text style={styles.sectionLabel}>{t("friends.incoming")}</Text>
            {requests?.incoming?.length ? (
              requests.incoming.map((u: any) => (
                <UserRow
                  key={u.userId}
                  u={u}
                  right={
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.pill, styles.pillPrimary]}
                        disabled={busy === u.userId}
                        onPress={() =>
                          run(u.userId, () => acceptRequestApi(u.userId))
                        }
                      >
                        <Text style={styles.pillPrimaryText}>
                          {t("friends.accept")}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.pill}
                        disabled={busy === u.userId}
                        onPress={() =>
                          run(u.userId, () => rejectRequestApi(u.userId))
                        }
                      >
                        <Text style={styles.pillText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  }
                />
              ))
            ) : (
              <Text style={styles.empty}>{t("friends.noIncoming")}</Text>
            )}

            <Text style={[styles.sectionLabel, { marginTop: spacing[5] }]}>
              {t("friends.sent")}
            </Text>
            {requests?.outgoing?.length ? (
              requests.outgoing.map((u: any) => (
                <UserRow
                  key={u.userId}
                  u={u}
                  right={
                    <TouchableOpacity
                      style={styles.pill}
                      disabled={busy === u.userId}
                      onPress={() =>
                        run(u.userId, () => cancelRequestApi(u.userId))
                      }
                    >
                      <Text style={styles.pillText}>{t("common.cancel")}</Text>
                    </TouchableOpacity>
                  }
                />
              ))
            ) : (
              <Text style={styles.empty}>{t("friends.noSent")}</Text>
            )}
          </ScrollView>
        ))}

      {/* ── Find ── */}
      {tab === "find" && (
        <View style={{ flex: 1 }}>
          <View style={styles.searchBar}>
            <Icon name="search" size={16} color={colors.text.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder={t("friends.searchPlaceholder")}
              placeholderTextColor={colors.text.muted}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
            />
          </View>
          <ScrollView contentContainerStyle={styles.list}>
            {query.trim().length < 2 ? (
              <Text style={styles.empty}>{t("friends.typeMore")}</Text>
            ) : ls ? (
              <ActivityIndicator color={colors.amber} style={styles.loader} />
            ) : search?.results?.length ? (
              search.results.map((u: any) => (
                <UserRow
                  key={u.userId}
                  u={u}
                  onPress={() => setSelectedUserId(u.userId)}
                  right={
                    u.friendStatus === "friends" ? (
                      <Text style={styles.statusText}>
                        {t("friends.statusFriends")}
                      </Text>
                    ) : u.friendStatus === "pending_sent" ? (
                      <Text style={styles.statusText}>
                        {t("friends.statusPending")}
                      </Text>
                    ) : u.friendStatus === "pending_received" ? (
                      <TouchableOpacity
                        style={[styles.pill, styles.pillPrimary]}
                        disabled={busy === u.userId}
                        onPress={() =>
                          run(u.userId, () => acceptRequestApi(u.userId))
                        }
                      >
                        <Text style={styles.pillPrimaryText}>
                          {t("friends.accept")}
                        </Text>
                      </TouchableOpacity>
                    ) : u.friendStatus === "none" ? (
                      <TouchableOpacity
                        style={[styles.pill, styles.pillPrimary]}
                        disabled={busy === u.userId}
                        onPress={() =>
                          run(u.userId, () => sendRequestApi(u.userId))
                        }
                      >
                        <Text style={styles.pillPrimaryText}>
                          {t("friends.add")}
                        </Text>
                      </TouchableOpacity>
                    ) : null
                  }
                />
              ))
            ) : (
              <Text style={styles.empty}>{t("friends.noUsers")}</Text>
            )}
          </ScrollView>
        </View>
      )}

      <PublicProfileModal
        userId={selectedUserId}
        onClose={() => {
          setSelectedUserId(null);
          invalidateAll();
        }}
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
  tab: { flex: 1, paddingVertical: spacing[2], alignItems: "center", borderRadius: radii.sm },
  tabActive: { backgroundColor: colors.amber },
  tabText: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
    letterSpacing: 1,
  },
  tabTextActive: { color: colors.text.inverse },
  loader: { marginTop: spacing[8] },
  list: { paddingHorizontal: spacing[5], paddingBottom: spacing[16] },
  sectionLabel: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.text.label,
    marginBottom: spacing[2],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    backgroundColor: colors.bg.secondary,
    borderRadius: radii.md,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.subtle,
    marginBottom: spacing[2],
  },
  dotWrap: {
    position: "absolute",
    end: -1,
    bottom: -1,
    backgroundColor: colors.bg.secondary,
    borderRadius: 8,
    padding: 2,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowInfo: { flex: 1 },
  rowName: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
  },
  rowMeta: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  actionRow: { flexDirection: "row", gap: spacing[2] },
  pill: {
    paddingHorizontal: spacing[3],
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.tertiary,
  },
  pillText: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
  },
  pillPrimary: { backgroundColor: colors.amber, borderColor: colors.amber },
  pillPrimaryText: {
    fontFamily: typography.families.monoBold,
    fontSize: typography.sizes.xs,
    color: colors.text.inverse,
  },
  statusText: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginHorizontal: spacing[5],
    marginBottom: spacing[3],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.bg.secondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing[3],
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
  },
  empty: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
    textAlign: "center",
    paddingVertical: spacing[6],
  },
});
