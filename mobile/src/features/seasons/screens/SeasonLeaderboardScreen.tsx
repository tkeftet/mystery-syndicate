import React from "react";
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
import type { RouteProp } from "@react-navigation/native";
import { colors, typography, spacing, radii } from "../../../theme";
import type { AppStackParamList } from "../../../screens/HomeScreen";
import { Icon } from "../../../components/ui";
import { MEDAL_COLORS } from "../../../constants/iconMappings";
import { useSeasonLeaderboard, useSeasonProgress } from "../seasons.hooks";

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Rt = RouteProp<AppStackParamList, "SeasonLeaderboard">;

export function SeasonLeaderboardScreen({ route }: { route: Rt }) {
  const { seasonId } = route.params;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { data: board, isLoading } = useSeasonLeaderboard(seasonId);
  const { data: mine } = useSeasonProgress(seasonId);
  const myUserId = mine?.progress?.userId;

  return (
    <View style={[styles.safeTop, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="back" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.kicker}>// SEASON LEADERBOARD</Text>
          <Text style={styles.headerTitle}>Rankings</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.amber} size="large" />
        </View>
      ) : !board || board.length === 0 ? (
        <View style={styles.centered}>
          <Icon name="trophy" size={40} color={colors.text.faint} />
          <Text style={styles.emptyText}>No detectives ranked yet.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {board.map((row: any) => {
            const medal = MEDAL_COLORS[row.rank];
            const isMe = row.userId === myUserId;
            return (
              <View key={row.userId} style={[styles.row, isMe && styles.rowMe]}>
                <View style={styles.rankBox}>
                  {medal ? (
                    <Icon name="medal" size={20} color={medal} />
                  ) : (
                    <Text style={styles.rankText}>{row.rank}</Text>
                  )}
                </View>
                <View style={styles.nameCol}>
                  <Text style={styles.username} numberOfLines={1}>
                    {row.username}
                    {isMe ? "  (you)" : ""}
                  </Text>
                  <Text style={styles.sub}>
                    {row.chaptersCompleted} chapters · {row.accuracy}% acc
                  </Text>
                </View>
                <Text style={styles.score}>{row.seasonScore}</Text>
              </View>
            );
          })}
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
  list: { paddingHorizontal: spacing[5], paddingBottom: spacing[16], gap: spacing[2] },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.secondary,
    borderRadius: radii.md,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: spacing[3],
  },
  rowMe: { borderColor: colors.amber, backgroundColor: colors.amberGlow },
  rankBox: { width: 30, alignItems: "center" },
  rankText: {
    fontFamily: typography.families.monoBold,
    fontSize: typography.sizes.base,
    color: colors.text.muted,
  },
  nameCol: { flex: 1 },
  username: {
    fontFamily: typography.families.semibold,
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
  },
  sub: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
    marginTop: 2,
  },
  score: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.lg,
    color: colors.amberLight,
  },
});
