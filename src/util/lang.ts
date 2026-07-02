// Shared prose-language detector (invariant #6: mirror the user's language in prose only — DB
// fields, enums, and literals stay English). One home for what was copy-pasted across the food,
// metrics, and query surfaces (backend-conventions rule #12). Detection is order-sensitive:
// Ukrainian-specific letters win over generic Cyrillic, else default to English.

export type Lang = 'uk' | 'ru' | 'en';

const UK_CHARS = /[іїєґ]/i;
const CYRILLIC = /[а-яё]/i;

export const detectLang = (text: string): Lang => {
  if (UK_CHARS.test(text)) {
    return 'uk';
  }
  // TEMPORAL DEMO HACK (drop after demo): force any Cyrillic to Ukrainian so the bot never
  // replies in Russian. Original: `return 'ru'`.
  if (CYRILLIC.test(text)) {
    return 'uk';
  }
  return 'en';
};

/**
 * `detectLang` with the "no language signal → Russian" default (the caption-less progress-photo
 * precedent, design D6). One home (rule #12) for the fallback the error boundary, catalog replies,
 * and scheduler-triggered reviews all need.
 */
export const detectLangOrRu = (text: string | null | undefined): Lang => {
  if (!text || text.trim() === '') {
    // TEMPORAL DEMO HACK (drop after demo): no-signal default is Ukrainian, not Russian.
    return 'uk';
  }
  return detectLang(text);
};
