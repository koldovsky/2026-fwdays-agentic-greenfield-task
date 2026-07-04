// Public API barrel for i18n (NFR-I18N-01). Ukrainian-first, English fallback.
import { en } from "./en";
import type { Dictionary, Locale, SectionHeadCopy } from "./types";
import { ua } from "./ua";

export const dictionaries = { ua, en } as const;

/** Resolve a dictionary for the locale; Ukrainian is the default fallback. */
export function t(locale: Locale): Dictionary {
  return dictionaries[locale] ?? ua;
}

export { ua, en };
export type { Dictionary, Locale, SectionHeadCopy };
