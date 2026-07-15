import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { colors, typography, spacing, radii } from "../../../theme";
import type { AppStackParamList } from "../../../screens/HomeScreen";
import { Icon, GradientButton } from "../../../components/ui";
import { AppPopup } from "../../../components/ui/AppPopup";
import { createAgencyApi } from "../agencies.service";

type Nav = NativeStackNavigationProp<AppStackParamList>;

export function CreateAgencyScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "request">("public");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    try {
      await createAgencyApi({ name, description, privacy });
      queryClient.invalidateQueries({ queryKey: ["agency"] });
      navigation.goBack();
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message ?? t("agencies.couldNotCreate"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.safeTop, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="back" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.kicker}>{t("agencies.newAgencyKicker")}</Text>
          <Text style={styles.headerTitle}>
            {t("agencies.createAgencyTitle")}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>{t("agencies.nameLabel")}</Text>
        <TextInput
          style={styles.input}
          placeholder={t("agencies.namePlaceholder")}
          placeholderTextColor={colors.text.muted}
          value={name}
          onChangeText={setName}
          maxLength={24}
        />

        <Text style={styles.label}>{t("agencies.descriptionLabel")}</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder={t("agencies.descriptionPlaceholder")}
          placeholderTextColor={colors.text.muted}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={200}
        />

        <Text style={styles.label}>{t("agencies.joiningLabel")}</Text>
        <View style={styles.segment}>
          {(["public", "request"] as const).map((p) => {
            const active = privacy === p;
            return (
              <TouchableOpacity
                key={p}
                style={[styles.segItem, active && styles.segItemActive]}
                onPress={() => setPrivacy(p)}
              >
                <Text style={[styles.segText, active && styles.segTextActive]}>
                  {p === "public"
                    ? t("agencies.public")
                    : t("agencies.byRequest")}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.hint}>
          {privacy === "public"
            ? t("agencies.publicHint")
            : t("agencies.requestHint")}
        </Text>

        <GradientButton
          label={t("agencies.createAgency")}
          style={styles.cta}
          loading={busy}
          disabled={name.trim().length < 3}
          onPress={create}
        />
      </ScrollView>

      <AppPopup
        visible={!!error}
        variant="danger"
        title={t("agencies.couldNotCreateTitle")}
        message={error ?? ""}
        onClose={() => setError(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeTop: { flex: 1, backgroundColor: colors.bg.primary },
  header: { flexDirection: "row", alignItems: "center", gap: spacing[3], paddingHorizontal: spacing[5], paddingTop: spacing[3], paddingBottom: spacing[4] },
  backBtn: { width: 38, height: 38, borderRadius: radii.sm, backgroundColor: colors.bg.secondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border.subtle },
  kicker: { fontFamily: typography.families.mono, fontSize: typography.sizes.xs, letterSpacing: typography.tracking.wider, color: colors.text.label, marginBottom: 2 },
  headerTitle: { fontFamily: typography.families.display, fontSize: typography.sizes["2xl"], color: colors.text.primary },
  content: { paddingHorizontal: spacing[5], paddingBottom: spacing[16] },
  label: { fontFamily: typography.families.mono, fontSize: 10, letterSpacing: 1.6, color: colors.text.label, marginTop: spacing[4], marginBottom: spacing[2] },
  input: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.subtle, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[3], fontFamily: typography.families.body, fontSize: typography.sizes.base, color: colors.text.primary },
  textarea: { minHeight: 80, textAlignVertical: "top" },
  segment: { flexDirection: "row", backgroundColor: colors.bg.secondary, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border.subtle, padding: 4 },
  segItem: { flex: 1, paddingVertical: spacing[2], alignItems: "center", borderRadius: radii.sm },
  segItemActive: { backgroundColor: colors.amber },
  segText: { fontFamily: typography.families.mono, fontSize: typography.sizes.xs, color: colors.text.muted, letterSpacing: 1 },
  segTextActive: { color: colors.text.inverse },
  hint: { fontFamily: typography.families.body, fontSize: typography.sizes.xs, color: colors.text.muted, marginTop: spacing[2] },
  cta: { width: "100%", marginTop: spacing[6] },
});
