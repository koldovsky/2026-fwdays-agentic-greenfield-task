// Public API barrel for i18n (NFR-I18N-01). Ukrainian-first, English fallback.
import { en } from "./en";
import type { Dictionary, Locale } from "./types";
import { uk } from "./uk";

export const dictionaries = { uk, en } as const;

/** Resolve a dictionary for the locale; Ukrainian is the default fallback. */
export function t(locale: Locale): Dictionary {
  return dictionaries[locale] ?? uk;
}

export { uk, en };
export type { Dictionary, Locale };
