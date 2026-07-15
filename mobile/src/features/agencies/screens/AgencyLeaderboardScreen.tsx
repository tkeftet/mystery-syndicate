import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { type TranslationKey } from "../../../i18n";
import { colors, typography, spacing, radii } from "../../../theme";
import type { AppStackParamList } from "../../../screens/HomeScreen";
import { Icon } from "../../../components/ui";
import { MEDAL_COLORS } from "../../../constants/iconMappings";
import { useAgencyLeaderboard } from "../agencies.hooks";

type Nav = NativeStackNavigationProp<AppStackParamList>;

const SCOPE_LABEL_KEY: Record<"weekly" | "global", TranslationKey> = {
  weekly: "agencies.scopeWeekly",
  global: "agencies.scopeGlobal",
};

export function AgencyLeaderboardScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [scope, setScope] = useState<"weekly" | "global">("weekly");
  const { data: board, isLoading } = useAgencyLeaderboard(scope);

  return (
    <View style={[styles.safeTop, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="back" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.kicker}>{t("agencies.rankingsKicker")}</Text>
          <Text style={styles.headerTitle}>{t("agencies.topAgencies")}</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        {(["weekly", "global"] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.tab, scope === s && styles.tabActive]}
            onPress={() => setScope(s)}
          >
            <Text style={[styles.tabText, scope === s && styles.tabTextActive]}>
              {t(SCOPE_LABEL_KEY[s])}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.amber} style={{ marginTop: spacing[8] }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {board && board.length > 0 ? (
            board.map((a: any) => {
              const medal = MEDAL_COLORS[a.rank];
              return (
                <View key={a.id} style={styles.row}>
                  <View style={styles.rankBox}>
                    {medal ? (
                      <Icon name="medal" size={22} color={medal} />
                    ) : (
                      <Text style={styles.rankText}>{a.rank}</Text>
                    )}
                  </View>
                  <View style={styles.iconWrap}>
                    <Icon name="scales" size={16} color={colors.amber} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>{a.name}</Text>
                    <Text style={styles.sub}>
                      {t("agencies.agencyLbMeta", {
                        level: a.level,
                        members: a.memberCount,
                      })}
                    </Text>
                  </View>
                  <Text style={styles.score}>
                    {scope === "weekly" ? a.weeklyPoints : a.agencyXp}
                  </Text>
                </View>
              );
            })
          ) : (
            <Text style={styles.empty}>{t("agencies.noAgenciesRanked")}</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeTop: { flex: 1, backgroundColor: colors.bg.primary },
  header: { flexDirection: "row", alignItems: "center", gap: spacing[3], paddingHorizontal: spacing[5], paddingTop: spacing[3], paddingBottom: spacing[4] },
  backBtn: { width: 38, height: 38, borderRadius: radii.sm, backgroundColor: colors.bg.secondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border.subtle },
  kicker: { fontFamily: typography.families.mono, fontSize: typography.sizes.xs, letterSpacing: typography.tracking.wider, color: colors.text.label, marginBottom: 2 },
  headerTitle: { fontFamily: typography.families.display, fontSize: typography.sizes["2xl"], color: colors.text.primary },
  tabs: { flexDirection: "row", marginHorizontal: spacing[5], marginBottom: spacing[4], backgroundColor: colors.bg.secondary, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border.subtle, padding: 4 },
  tab: { flex: 1, paddingVertical: spacing[2], alignItems: "center", borderRadius: radii.sm },
  tabActive: { backgroundColor: colors.amber },
  tabText: { fontFamily: typography.families.mono, fontSize: typography.sizes.xs, color: colors.text.muted, letterSpacing: 1 },
  tabTextActive: { color: colors.text.inverse },
  list: { paddingHorizontal: spacing[5], paddingBottom: spacing[16], gap: spacing[2] },
  row: { flexDirection: "row", alignItems: "center", gap: spacing[3], backgroundColor: colors.bg.secondary, borderRadius: radii.md, padding: spacing[3], borderWidth: 1, borderColor: colors.border.subtle },
  rankBox: { width: 28, alignItems: "center" },
  rankText: { fontFamily: typography.families.monoBold, fontSize: typography.sizes.base, color: colors.text.muted },
  iconWrap: { width: 36, height: 36, borderRadius: radii.sm, backgroundColor: colors.amberGlow, alignItems: "center", justifyContent: "center" },
  name: { fontFamily: typography.families.display, fontSize: typography.sizes.md, color: colors.text.primary },
  sub: { fontFamily: typography.families.mono, fontSize: typography.sizes.xs, color: colors.text.muted, marginTop: 2 },
  score: { fontFamily: typography.families.display, fontSize: typography.sizes.lg, color: colors.amberLight },
  empty: { fontFamily: typography.families.body, fontSize: typography.sizes.sm, color: colors.text.muted, textAlign: "center", paddingVertical: spacing[8] },
});
