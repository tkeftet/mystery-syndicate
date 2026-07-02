import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Linking,
} from "react-native";
import { PRIVACY_POLICY_URL, TERMS_URL } from "../../../constants/links";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, typography, spacing, radii } from "../../../theme";
import type { AppStackParamList } from "../../../screens/HomeScreen";
import { Icon } from "../../../components/ui";
import { AppPopup } from "../../../components/ui/AppPopup";
import { usePrivacy } from "../friends.hooks";
import { updatePrivacyApi } from "../friends.service";
import { deleteAccountApi } from "../../profile/profile.service";
import { useAuthStore } from "../../auth/auth.store";
import { showAdPrivacyOptions } from "../../../services/ads";

type Nav = NativeStackNavigationProp<AppStackParamList>;
const VISIBILITY = ["public", "friends", "private"] as const;

export function PrivacySettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const { data: privacy, isLoading } = usePrivacy();
  const [local, setLocal] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (privacy && !local) setLocal(privacy);
  }, [privacy, local]);

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccountApi();
      // Auth flips to logged-out; the navigator swaps to the auth flow and this
      // screen unmounts. clearAuth also wipes tokens, caches, and analytics id.
      await useAuthStore.getState().clearAuth();
    } catch (e: any) {
      setDeleting(false);
      setDeleteError(
        e?.response?.data?.message ??
          "Couldn't delete your account. Please try again.",
      );
    }
  }

  async function patch(next: Record<string, unknown>) {
    setLocal((p: any) => ({ ...p, ...next }));
    try {
      const saved = await updatePrivacyApi(next);
      queryClient.setQueryData(["privacy"], saved);
    } catch {
      // revert to server state on failure
      queryClient.invalidateQueries({ queryKey: ["privacy"] });
    }
  }

  const s = local ?? privacy;

  return (
    <View style={[styles.safeTop, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="back" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.kicker}>// PRIVACY</Text>
          <Text style={styles.headerTitle}>Privacy</Text>
        </View>
      </View>

      {isLoading || !s ? (
        <ActivityIndicator color={colors.amber} style={{ marginTop: spacing[8] }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionLabel}>PROFILE VISIBILITY</Text>
          <View style={styles.segment}>
            {VISIBILITY.map((v) => {
              const active = s.profileVisibility === v;
              return (
                <TouchableOpacity
                  key={v}
                  style={[styles.segItem, active && styles.segItemActive]}
                  onPress={() => patch({ profileVisibility: v })}
                >
                  <Text style={[styles.segText, active && styles.segTextActive]}>
                    {v.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.hint}>
            Who can see your full profile and stats.
          </Text>

          <Toggle
            label="Show online status"
            value={s.showOnline}
            onChange={(v) => patch({ showOnline: v })}
          />
          <Toggle
            label="Show last seen"
            value={s.showLastSeen}
            onChange={(v) => patch({ showLastSeen: v })}
          />
          <Toggle
            label="Show statistics"
            value={s.showStats}
            onChange={(v) => patch({ showStats: v })}
          />
          <Toggle
            label="Allow friend requests"
            value={s.allowRequests}
            onChange={(v) => patch({ allowRequests: v })}
          />

          <Text style={styles.sectionLabel}>ADS</Text>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => showAdPrivacyOptions()}
            activeOpacity={0.8}
          >
            <Text style={styles.toggleLabel}>Manage ad privacy</Text>
            <Icon name="arrowRight" size={16} color={colors.text.muted} />
          </TouchableOpacity>
          <Text style={styles.hint}>
            Review or change your consent for personalized ads.
          </Text>

          <Text style={styles.sectionLabel}>LEGAL</Text>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
            activeOpacity={0.8}
          >
            <Text style={styles.toggleLabel}>Privacy Policy</Text>
            <Icon name="arrowRight" size={16} color={colors.text.muted} />
          </TouchableOpacity>
          <View style={{ height: spacing[2] }} />
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => Linking.openURL(TERMS_URL)}
            activeOpacity={0.8}
          >
            <Text style={styles.toggleLabel}>Terms of Service</Text>
            <Icon name="arrowRight" size={16} color={colors.text.muted} />
          </TouchableOpacity>

          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <TouchableOpacity
            style={styles.dangerRow}
            onPress={() => {
              setDeleteError(null);
              setConfirmDelete(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.dangerLabel}>Delete account</Text>
            <Icon name="arrowRight" size={16} color={colors.coral} />
          </TouchableOpacity>
          <Text style={styles.hint}>
            Permanently deletes your account, progress, friends, and purchases.
            This can&apos;t be undone.
          </Text>
        </ScrollView>
      )}

      <AppPopup
        visible={confirmDelete}
        variant="danger"
        title="Delete account?"
        message={
          deleteError ??
          "This permanently erases your profile, progress, friends, and purchases. This cannot be undone."
        }
        onClose={() => {
          if (!deleting) setConfirmDelete(false);
        }}
        buttons={[
          {
            label: "Cancel",
            variant: "secondary",
            onPress: () => {
              if (!deleting) setConfirmDelete(false);
            },
          },
          {
            label: "Delete",
            variant: "danger",
            loading: deleting,
            onPress: handleDeleteAccount,
          },
        ]}
      />
    </View>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={!!value}
        onValueChange={onChange}
        trackColor={{ false: colors.bg.tertiary, true: colors.amber }}
        thumbColor={colors.text.inverse}
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
  content: { paddingHorizontal: spacing[5], paddingBottom: spacing[16] },
  sectionLabel: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.text.label,
    marginBottom: spacing[2],
    marginTop: spacing[3],
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.bg.secondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: 4,
  },
  segItem: { flex: 1, paddingVertical: spacing[2], alignItems: "center", borderRadius: radii.sm },
  segItemActive: { backgroundColor: colors.amber },
  segText: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
    letterSpacing: 1,
  },
  segTextActive: { color: colors.text.inverse },
  hint: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
    marginTop: spacing[2],
    marginBottom: spacing[4],
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bg.secondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    marginBottom: spacing[2],
  },
  toggleLabel: {
    fontFamily: typography.families.medium,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bg.secondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  dangerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bg.secondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.coral + "55",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  dangerLabel: {
    fontFamily: typography.families.medium,
    fontSize: typography.sizes.base,
    color: colors.coral,
  },
});
