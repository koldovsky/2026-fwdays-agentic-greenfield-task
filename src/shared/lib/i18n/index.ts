// Public API barrel for i18n (NFR-I18N-01). Ukrainian-first, English fallback.
import { en } from "./en";
import type { Dictionary, Locale, SectionHeadCopy } from "./types";
import { ua } from "./ua";

export const dictionaries = { ua, en } as const;

/** Resolve a dictionary for the locale; Ukrainian is the default fallback. */
export function t(locale: Locale): Dictionary {
  return dictionaries[locale] ?? ua;
}

/** Supported locales, Ukrainian-first (NFR-I18N-01). */
export const LOCALES = ["ua", "en"] as const;

/** Name of the cookie that persists the visitor's locale choice. */
export const LOCALE_COOKIE = "locale";

/** BCP-47 `lang` attribute value for each locale (`ua` -> `uk`). */
export const HTML_LANG: Readonly<Record<Locale, string>> = { ua: "uk", en: "en" };

/**
 * Coerce an arbitrary cookie value to a valid locale. Anything that is not
 * exactly "en" falls back to Ukrainian (Ukrainian-first default). Framework-free
 * so it stays testable off the request (TC-PURE-01).
 */
export function parseLocale(raw: string | null | undefined): Locale {
  return raw === "en" ? "en" : "ua";
}

export { ua, en };
export type { Dictionary, Locale, SectionHeadCopy };
