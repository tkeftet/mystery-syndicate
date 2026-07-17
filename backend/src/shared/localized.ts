/**
 * Case content localization.
 *
 * A localizable text field is either a plain `string` (legacy / English-only
 * content) or a `{ en, fr?, ar? }` object. The API resolves each field to the
 * caller's language on the way out, falling back to English (then to any
 * available value) so English-only cases keep working unchanged and partially
 * translated cases degrade gracefully.
 *
 * `megaOptions.motives/weapons` are localized for DISPLAY too, so the accusation
 * chips render in the caller's language. Scoring stays correct because the
 * events/seasons services resolve `solution.motive/weapon` to the same language
 * (via the request's Accept-Language) before string-comparing the submitted
 * option — see those services. `solution` itself is normally stripped on reads.
 */

export const SUPPORTED_LANGS = ["en", "fr", "ar"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];
export const DEFAULT_LANG: Lang = "en";

export type LocalizedString = string | Partial<Record<Lang, string>>;

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (SUPPORTED_LANGS as readonly string[]).includes(value);
}

/** Resolve the caller's language from an Express request (?lang= wins, else Accept-Language). */
export function resolveLang(req: {
  query?: Record<string, unknown>;
  headers?: Record<string, unknown>;
}): Lang {
  const q = req.query?.lang;
  if (isLang(q)) return q;
  // Accept-Language: take the first tag's primary subtag, e.g. "fr-FR,fr;q=0.9" -> "fr".
  const header = req.headers?.["accept-language"];
  if (typeof header === "string") {
    const primary = header.split(",")[0]?.trim().split("-")[0]?.toLowerCase();
    if (isLang(primary)) return primary;
  }
  return DEFAULT_LANG;
}

/** Resolve one localizable value to a plain string in the requested language. */
export function resolveLocalized(value: LocalizedString | undefined, lang: Lang): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return value[lang] ?? value[DEFAULT_LANG] ?? Object.values(value).find(Boolean) ?? "";
}

function mapLocalizedArray(arr: LocalizedString[] | undefined, lang: Lang): string[] {
  return (arr ?? []).map((v) => resolveLocalized(v, lang));
}

/**
 * Deep-resolve every localizable *display* field of a case (plain object, e.g.
 * from `.lean()` / `.toObject()`) into `lang`. Ids, enums, numbers, dates, and
 * answer-bearing option strings are passed through untouched.
 */
export function localizeCase<T extends Record<string, any>>(c: T, lang: Lang): T {
  if (!c || typeof c !== "object") return c;
  const out: any = { ...c };

  const L = (v: LocalizedString | undefined) => resolveLocalized(v, lang);

  if ("title" in c) out.title = L(c.title);
  if ("description" in c) out.description = L(c.description);
  if ("storyText" in c && c.storyText != null) out.storyText = L(c.storyText);
  if ("cliffhanger" in c && c.cliffhanger != null) out.cliffhanger = L(c.cliffhanger);

  if (c.victim) {
    out.victim = {
      ...c.victim,
      name: L(c.victim.name),
      description: L(c.victim.description),
    };
  }

  if (Array.isArray(c.suspects)) {
    out.suspects = c.suspects.map((s: any) => ({
      ...s,
      name: L(s.name),
      description: L(s.description),
      alibi: L(s.alibi),
      relationship: L(s.relationship),
    }));
  }

  if (Array.isArray(c.evidence)) {
    out.evidence = c.evidence.map((e: any) => ({
      ...e,
      title: L(e.title),
      description: L(e.description),
    }));
  }

  if (Array.isArray(c.witnessStatements)) {
    out.witnessStatements = c.witnessStatements.map((w: any) => ({
      ...w,
      witnessName: L(w.witnessName),
      statement: L(w.statement),
    }));
  }

  if (Array.isArray(c.timeline)) {
    out.timeline = c.timeline.map((t: any) => ({
      ...t,
      time: L(t.time),
      description: L(t.description),
    }));
  }

  // Mega/chapter accusation options — localized for display. The matching
  // solution.motive/weapon are resolved to the same language at scoring time.
  if (c.megaOptions && typeof c.megaOptions === "object") {
    out.megaOptions = {
      ...c.megaOptions,
      motives: mapLocalizedArray(c.megaOptions.motives, lang),
      weapons: mapLocalizedArray(c.megaOptions.weapons, lang),
    };
  }

  // Solution is stripped on most reads (.select("-solution")); localize only its
  // display-safe explanation when present. motive/weapon stay raw (see header note).
  if (c.solution && typeof c.solution === "object") {
    out.solution = { ...c.solution, explanation: L(c.solution.explanation) };
  }

  return out;
}

/** Localize a list of case objects. */
export function localizeCases<T extends Record<string, any>>(cases: T[], lang: Lang): T[] {
  return cases.map((c) => localizeCase(c, lang));
}

/** True for a plain object shaped like a LocalizedString: keys ⊆ langs, string values. */
function isLocalizedObject(v: unknown): v is Partial<Record<Lang, string>> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const keys = Object.keys(v);
  if (keys.length === 0) return false;
  return keys.every(
    (k) => isLang(k) && typeof (v as Record<string, unknown>)[k] === "string",
  );
}

/**
 * Recursively resolve any `{en,fr,ar}`-shaped value inside an arbitrary response
 * object to a plain string in `lang`. Plain strings (e.g. the answer-bearing
 * motive/weapon option strings) and all other data pass through untouched. Used
 * to localize submit/hint/ad responses that embed assorted case text (solution
 * explanation, red-herring titles, cleared-suspect names) without threading a
 * `lang` param through every service.
 */
export function localizeDeep<T>(value: T, lang: Lang): T {
  if (isLocalizedObject(value)) {
    return resolveLocalized(value, lang) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => localizeDeep(v, lang)) as unknown as T;
  }
  if (value && typeof value === "object") {
    // Skip Mongoose documents — callers should pass plain objects (.toObject()).
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = localizeDeep(v, lang);
    }
    return out as unknown as T;
  }
  return value;
}
