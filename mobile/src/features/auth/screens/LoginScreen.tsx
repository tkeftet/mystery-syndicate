import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../../navigation/AuthNavigator";
import { useTranslation } from "react-i18next";
import { colors, typography, spacing, radii, gradients, shadows } from "../../../theme";
import { Icon, GradientButton, LanguagePicker } from "../../../components/ui";
import { useAuthStore } from "../auth.store";
import { loginApi, guestApi } from "../auth.service";
import { track, AnalyticsEvent } from "../../../services/analytics";

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, "Login">;
};

export function LoginScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("dc_session_expired").then((v) => {
      if (v) {
        setSessionExpired(true);
        AsyncStorage.removeItem("dc_session_expired");
      }
    });
  }, []);

  async function handleLogin() {
    if (!email || !password) {
      setError(t("auth.fillAllFields"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { user, accessToken, refreshToken } = await loginApi(
        email,
        password,
      );
      await setAuth(user, accessToken, refreshToken);
      track(AnalyticsEvent.USER_LOGGED_IN, { method: "email" });
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? t("auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleGuest() {
    setLoading(true);
    setError("");

    try {
      const { user, accessToken, refreshToken } = await guestApi();
      await setAuth(user, accessToken, refreshToken);
      track(AnalyticsEvent.USER_REGISTERED, { method: "guest" });
    } catch {
      setError(t("auth.guestFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LanguagePicker
        style={[styles.langBar, { top: insets.top + spacing[2] }]}
      />

      <View style={styles.brand}>
        <LinearGradient
          colors={gradients.seal}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.logo, shadows.glow]}
        >
          <Icon name="search" size={32} color={colors.text.inverse} />
        </LinearGradient>
        <Text style={styles.kicker}>EST. MIDNIGHT</Text>
        <Text style={styles.title}>
          Mystery <Text style={styles.titleAccent}>Syndicate</Text>
        </Text>
        <Text style={styles.subtitle}>{t("auth.loginSubtitle")}</Text>
      </View>

      {sessionExpired && (
        <View style={styles.notice}>
          <Icon name="warning" size={15} color={colors.amber} />
          <Text style={styles.noticeText}>{t("auth.sessionExpired")}</Text>
        </View>
      )}

      <View style={styles.form}>
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
          label={t("auth.signIn")}
          loading={loading}
          onPress={handleLogin}
          style={styles.primaryButton}
        />

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("Register")}
        >
          <Text style={styles.secondaryButtonText}>
            {t("auth.createAccount")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.guestButton} onPress={handleGuest}>
          <Text style={styles.guestButtonText}>
            {t("auth.continueAsGuest")}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    justifyContent: "center",
    padding: spacing[6],
  },
  langBar: {
    position: "absolute",
    left: spacing[6],
    right: spacing[6],
  },
  brand: { alignItems: "center", marginBottom: spacing[8] },
  logo: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[5],
  },
  kicker: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    letterSpacing: 3,
    color: colors.text.label,
    marginBottom: spacing[2],
  },
  title: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes["3xl"],
    color: colors.text.primary,
    textAlign: "center",
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
    marginTop: spacing[2],
  },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    backgroundColor: colors.amberFaint,
    borderWidth: 1,
    borderColor: colors.border.amber,
    borderRadius: radii.md,
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  noticeText: {
    flex: 1,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.amberLight,
  },
  form: { gap: spacing[3] },
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
  primaryButton: { marginTop: spacing[2] },
  secondaryButton: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radii.md,
    padding: spacing[4],
    alignItems: "center",
  },
  secondaryButtonText: {
    fontFamily: typography.families.medium,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
  },
  guestButton: { padding: spacing[3], alignItems: "center" },
  guestButtonText: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
    letterSpacing: 0.5,
    textDecorationLine: "underline",
  },
});
