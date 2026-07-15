import i18n from "i18next";
import type { ParseKeys } from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import { I18nManager } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import ar from "./locales/ar.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", nativeLabel: "English", isRTL: false },
  { code: "fr", nativeLabel: "Français", isRTL: false },
  { code: "ar", nativeLabel: "العربية", isRTL: true },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

/** Union of every valid translation key — use for configs that store keys. */
export type TranslationKey = ParseKeys;

const STORAGE_KEY = "app.language";

function isSupported(code: string | null | undefined): code is LanguageCode {
  return SUPPORTED_LANGUAGES.some((l) => l.code === code);
}

export function isRTLLanguage(code: string): boolean {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.isRTL ?? false;
}

function detectDeviceLanguage(): LanguageCode {
  const deviceCode = getLocales()[0]?.languageCode;
  return isSupported(deviceCode) ? deviceCode : "en";
}

export function getCurrentLanguage(): LanguageCode {
  return isSupported(i18n.language) ? i18n.language : "en";
}

/**
 * Initialize i18next: stored preference wins, otherwise device locale,
 * fallback English. Must resolve before the first screen renders.
 */
export async function initI18n(): Promise<void> {
  let stored: string | null = null;
  try {
    stored = await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    // storage unavailable — fall through to device locale
  }
  const lng = isSupported(stored) ? stored : detectDeviceLanguage();

  await i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      ar: { translation: ar },
    },
    lng,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    returnNull: false,
  });

  // If the resolved language's direction disagrees with the native RTL flag
  // (e.g. first launch on an Arabic device), record the correct direction so
  // the next cold start lays out properly. No forced reload at boot.
  const shouldBeRTL = isRTLLanguage(lng);
  if (shouldBeRTL !== I18nManager.isRTL) {
    I18nManager.allowRTL(shouldBeRTL);
    I18nManager.forceRTL(shouldBeRTL);
  }
}

export type LanguageChangeResult = "changed" | "restart-required";

/**
 * Persist + apply a language choice. When the writing direction flips
 * (en/fr <-> ar) the app is reloaded so React Native re-lays out in the new
 * direction; in environments where reload is unavailable (Expo Go) the caller
 * gets "restart-required" and should tell the user to restart manually.
 */
export async function setAppLanguage(
  code: LanguageCode,
): Promise<LanguageChangeResult> {
  await AsyncStorage.setItem(STORAGE_KEY, code);
  await i18n.changeLanguage(code);

  const shouldBeRTL = isRTLLanguage(code);
  if (shouldBeRTL === I18nManager.isRTL) {
    return "changed";
  }

  I18nManager.allowRTL(shouldBeRTL);
  I18nManager.forceRTL(shouldBeRTL);
  try {
    const Updates = await import("expo-updates");
    await Updates.reloadAsync();
    return "changed";
  } catch {
    return "restart-required";
  }
}

export default i18n;
