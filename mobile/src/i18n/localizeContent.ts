import { useSyncExternalStore } from "react";
import i18n from "i18next";
import type { LanguageCode } from "./index";

/**
 * Client-side content localization.
 *
 * Backend content endpoints return every text field RAW as `{ en, fr, ar }`
 * (see backend/src/shared/localized.ts). `localizeContent` deep-resolves those
 * objects to plain strings in the chosen language, so the app can switch
 * language instantly from the cached response — no refetch. Anything that isn't
 * an `{en,fr,ar}`-shaped object (ids, numbers, usernames, dates…) passes
 * through untouched.
 */
const LANGS: LanguageCode[] = ["en", "fr", "ar"];

/** True for a plain object shaped like a localized field: keys ⊆ {en,fr,ar}, string values. */
function isLocalized(v: unknown): v is Record<LanguageCode, string> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const keys = Object.keys(v);
  if (keys.length === 0) return false;
  return keys.every(
    (k) =>
      (LANGS as string[]).includes(k) &&
      typeof (v as Record<string, unknown>)[k] === "string",
  );
}

function resolveOne(v: Record<LanguageCode, string>, lang: LanguageCode): string {
  return v[lang] ?? v.en ?? Object.values(v).find(Boolean) ?? "";
}

/** Recursively resolve every `{en,fr,ar}` value in `value` to `lang`. */
export function localizeContent<T>(value: T, lang: LanguageCode): T {
  if (isLocalized(value)) return resolveOne(value, lang) as unknown as T;
  if (Array.isArray(value)) {
    return value.map((v) => localizeContent(v, lang)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = localizeContent(v, lang);
    }
    return out as unknown as T;
  }
  return value;
}

function normalizeLang(raw: string | undefined): LanguageCode {
  const primary = (raw || "en").split("-")[0] as LanguageCode;
  return (LANGS as string[]).includes(primary) ? primary : "en";
}

// Stable subscribe/snapshot for useSyncExternalStore (module scope = no
// re-subscribe churn across renders).
function subscribeToLang(onChange: () => void): () => void {
  i18n.on("languageChanged", onChange);
  return () => i18n.off("languageChanged", onChange);
}
function getLangSnapshot(): LanguageCode {
  return normalizeLang(i18n.language);
}

/**
 * The current content language, normalized to a supported code.
 *
 * Subscribes DIRECTLY to i18next's `languageChanged` event via
 * `useSyncExternalStore`, so every component that calls this hook is guaranteed
 * to re-render the instant the language changes — which re-runs any `select`
 * that closes over the value. This is deliberately independent of
 * `useTranslation`'s re-render behavior: content (daily/quick/previous cases,
 * events, seasons…) must update immediately on switch, with no manual refresh.
 */
export function useContentLang(): LanguageCode {
  return useSyncExternalStore(subscribeToLang, getLangSnapshot, getLangSnapshot);
}

/**
 * A React Query `select` that deep-resolves a raw content response into the
 * current language. Pass the value from `useContentLang()` so switching
 * language re-resolves the cached data with no refetch.
 */
export function selectLocalized<T>(lang: LanguageCode) {
  return (data: T): T => localizeContent(data, lang);
}
