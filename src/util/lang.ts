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
  if (CYRILLIC.test(text)) {
    return 'ru';
  }
  return 'en';
};
