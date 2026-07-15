import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { colors, typography, spacing, radii, gradients, shadows } from "../../../theme";
import { Icon } from "../../../components/ui/Icon";
import { GradientButton } from "../../../components/ui";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { track, AnalyticsEvent } from "../../../services/analytics";

const SLIDES = [
  {
    icon: "search",
    titleKey: "onboarding.slide1Title",
    descriptionKey: "onboarding.slide1Desc",
  },
  {
    icon: "folder",
    titleKey: "onboarding.slide2Title",
    descriptionKey: "onboarding.slide2Desc",
  },
  {
    icon: "trophy",
    titleKey: "onboarding.slide3Title",
    descriptionKey: "onboarding.slide3Desc",
  },
] as const;

const ONBOARDING_KEY = "dc_onboarding_done";

export async function isOnboardingDone(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value === "true";
  } catch {
    return true;
  }
}

export async function markOnboardingDone(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
  } catch {}
}

interface Props {
  onDone: () => void;
}

export function OnboardingScreen({ onDone }: Props) {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const insets = useSafeAreaInsets();
  const isLast = currentSlide === SLIDES.length - 1;

  async function handleNext() {
    if (isLast) {
      track(AnalyticsEvent.TUTORIAL_COMPLETED, { skipped: false });
      await markOnboardingDone();
      onDone();
    } else {
      setCurrentSlide((s) => s + 1);
    }
  }

  function handleSkip() {
    track(AnalyticsEvent.TUTORIAL_COMPLETED, { skipped: true });
    markOnboardingDone();
    onDone();
  }

  const slide = SLIDES[currentSlide];

  return (
    <View style={styles.container}>
      {/* ── Skip ── */}
      {!isLast && (
        <TouchableOpacity
          style={[styles.skipButton, { top: insets.top + spacing[2] }]}
          onPress={handleSkip}
        >
          <Text style={styles.skipText}>{t("onboarding.skip")}</Text>
        </TouchableOpacity>
      )}

      {/* ── Slide ── */}
      <View style={styles.slideContainer}>
        <LinearGradient
          colors={gradients.seal}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.iconSeal, shadows.glow]}
        >
          <Icon name={slide.icon} size={56} color={colors.text.inverse} />
        </LinearGradient>
        <Text style={styles.title}>{t(slide.titleKey)}</Text>
        <Text style={styles.description}>{t(slide.descriptionKey)}</Text>
      </View>

      {/* ── Dots ── */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === currentSlide && styles.dotActive]}
          />
        ))}
      </View>

      {/* ── Button ── */}
      <GradientButton
        label={isLast ? t("onboarding.start") : t("onboarding.next")}
        iconRight="arrowRight"
        onPress={handleNext}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing[6],
  },
  skipButton: {
    position: "absolute",
    top: spacing[10],
    end: spacing[6],
  },
  skipText: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
    letterSpacing: 0.5,
  },
  slideContainer: {
    alignItems: "center",
    paddingHorizontal: spacing[4],
    marginBottom: spacing[12],
  },
  iconSeal: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[8],
  },
  title: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes["2xl"],
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: spacing[4],
    lineHeight: typography.sizes["2xl"] * 1.1,
  },
  description: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: typography.sizes.base * 1.6,
  },
  dots: {
    flexDirection: "row",
    gap: spacing[2],
    marginBottom: spacing[8],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border.strong,
  },
  dotActive: {
    backgroundColor: colors.amber,
    width: 24,
  },
  button: {
    width: "100%",
  },
});
