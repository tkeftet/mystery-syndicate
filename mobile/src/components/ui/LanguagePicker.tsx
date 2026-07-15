import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StyleProp,
  ViewStyle,
} from "react-native";
import { useTranslation } from "react-i18next";
import { colors, typography, spacing, radii } from "../../theme";
import { Icon } from "./Icon";
import {
  SUPPORTED_LANGUAGES,
  setAppLanguage,
  getCurrentLanguage,
  type LanguageCode,
} from "../../i18n";

interface Props {
  /** "row" (default) renders an inline pill row; "labeled" adds a globe + title header above it. */
  variant?: "row" | "labeled";
  style?: StyleProp<ViewStyle>;
  /** Called after the language actually changes in-place (not when a reload is triggered). */
  onChanged?: (code: LanguageCode) => void;
}

/**
 * Reusable three-pill language switcher. Switching to/from Arabic flips the
 * writing direction and reloads the app; when reload isn't available (Expo Go)
 * it surfaces a "please restart" alert. Shared by the auth screens and AppMenu.
 */
export function LanguagePicker({ variant = "row", style, onChanged }: Props) {
  const { t } = useTranslation();
  const current = getCurrentLanguage();

  async function change(code: LanguageCode) {
    if (code === current) return;
    const result = await setAppLanguage(code);
    if (result === "restart-required") {
      Alert.alert(t("language.title"), t("language.restartRequired"));
    } else {
      onChanged?.(code);
    }
  }

  return (
    <View style={style}>
      {variant === "labeled" && (
        <View style={styles.header}>
          <Icon name="globe" size={18} color={colors.amber} />
          <Text style={styles.headerText}>{t("language.title")}</Text>
        </View>
      )}
      <View style={styles.pills}>
        {SUPPORTED_LANGUAGES.map((lang) => {
          const active = lang.code === current;
          return (
            <TouchableOpacity
              key={lang.code}
              style={[styles.pill, active && styles.pillActive]}
              activeOpacity={0.7}
              onPress={() => change(lang.code)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {lang.nativeLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  headerText: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
  },
  pills: {
    flexDirection: "row",
    gap: spacing[2],
  },
  pill: {
    flex: 1,
    paddingVertical: spacing[2],
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: "center",
  },
  pillActive: {
    borderColor: colors.amber,
    backgroundColor: colors.bg.secondary,
  },
  pillText: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
  },
  pillTextActive: {
    color: colors.amber,
  },
});
