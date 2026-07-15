import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
} from "react-native";
import { PRIVACY_POLICY_URL, TERMS_URL } from "../../../constants/links";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../../navigation/AuthNavigator";
import { useTranslation } from "react-i18next";
import { colors, typography, spacing, radii } from "../../../theme";
import { GradientButton, LanguagePicker } from "../../../components/ui";
import { useAuthStore } from "../auth.store";
import { registerApi } from "../auth.service";
import { track, AnalyticsEvent } from "../../../services/analytics";

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, "Register">;
};

export function RegisterScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { setAuth } = useAuthStore();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function validateFields(): string | null {
    if (!username || !email || !password) {
      return t("auth.fillAllFields");
    }
    if (username.length < 3 || username.length > 20) {
      return t("auth.usernameLength");
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return t("auth.usernameCharset");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return t("auth.emailInvalid");
    }
    if (password.length < 8) {
      return t("auth.passwordLength");
    }
    return null;
  }

  async function handleRegister() {
    const validationError = validateFields();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { user, accessToken, refreshToken } = await registerApi(
        username,
        email,
        password,
      );
      await setAuth(user, accessToken, refreshToken);
      track(AnalyticsEvent.USER_REGISTERED, { method: "email" });
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message ?? t("auth.registrationFailed"),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <LanguagePicker style={styles.langBar} />
        <Text style={styles.kicker}>{t("auth.registerKicker")}</Text>
        <Text style={styles.title}>
          {t("auth.registerTitlePrefix")}{" "}
          <Text style={styles.titleAccent}>Syndicate</Text>
        </Text>
        <Text style={styles.subtitle}>{t("auth.registerSubtitle")}</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder={t("auth.usernamePlaceholder")}
            placeholderTextColor={colors.text.muted}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder={t("auth.emailPlaceholder")}
            placeholderTextColor={colors.text.muted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder={t("auth.passwordPlaceholder")}
            placeholderTextColor={colors.text.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <GradientButton
            label={t("auth.createAccount")}
            loading={loading}
            onPress={handleRegister}
            style={styles.primaryButton}
          />

          <Text style={styles.legal}>
            {t("auth.legalPrefix")}{" "}
            <Text
              style={styles.legalLink}
              onPress={() => Linking.openURL(TERMS_URL)}
            >
              {t("auth.legalTerms")}
            </Text>{" "}
            {t("auth.legalAnd")}{" "}
            <Text
              style={styles.legalLink}
              onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
            >
              {t("auth.legalPrivacy")}
            </Text>
            .
          </Text>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>
              {t("auth.alreadyHaveAccount")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing[6],
  },
  langBar: {
    marginBottom: spacing[6],
  },
  kicker: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    letterSpacing: 3,
    color: colors.text.label,
    textAlign: "center",
    marginBottom: spacing[2],
  },
  title: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes["3xl"],
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: spacing[2],
  },
  titleAccent: {
    fontFamily: typography.families.displayItalic,
    color: colors.amber,
  },
  subtitle: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing[8],
  },
  form: {
    gap: spacing[3],
  },
  legal: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
    textAlign: "center",
    lineHeight: typography.sizes.xs * 1.5,
    marginTop: spacing[1],
  },
  legalLink: {
    color: colors.amber,
    textDecorationLine: "underline",
  },
  input: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radii.md,
    padding: spacing[4],
    color: colors.text.primary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
  },
  error: {
    color: colors.coral,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    textAlign: "center",
  },
  primaryButton: {
    marginTop: spacing[2],
  },
  backButton: {
    padding: spacing[3],
    alignItems: "center",
  },
  backButtonText: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
    letterSpacing: 0.5,
    textDecorationLine: "underline",
  },
});
