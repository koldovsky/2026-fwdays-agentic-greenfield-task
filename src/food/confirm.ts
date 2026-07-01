import { FoodSource } from '@prisma/client';
import type { FoodLog } from '@prisma/client';
import { macroBaseFromRow } from './scale.js';
import type { CatalogResult, Confirmation } from './types.js';
import { detectLang, type Lang } from '../util/lang.js';

// Build the confirmation (§8.2 step 4). The prose CONTAINS the numbers, so it's assembled in code,
// never by the model (invariant #2) — and it shows only THIS entry's own figures, never a hand-summed
// daily total (that's the `query` capability). Prose mirrors the user's language (invariant #6); the
// estimate path is surfaced honestly and offers to save the food to the user's Food DB.

/** Trim a trailing `.0` so whole grams read cleanly. */
const fmt = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));

const macroLine = (lang: Lang, row: FoodLog): string => {
  const macros = macroBaseFromRow(row);
  const p = fmt(macros.proteinG);
  const f = fmt(macros.fatG);
  const c = fmt(macros.carbsG);
  if (lang === 'en') {
    return `${row.entryName} — ${row.kcal} kcal · P ${p} / F ${f} / C ${c} g`;
  }
  return `${row.entryName} — ${row.kcal} ккал · Б ${p} / Ж ${f} / ${lang === 'uk' ? 'В' : 'У'} ${c} г`;
};

const LOGGED_VERB: Record<Lang, string> = { uk: 'Записав', ru: 'Записал', en: 'Logged' };
const ESTIMATE_NOTE: Record<Lang, string> = {
  uk: ' Це приблизна оцінка (±20–30%).',
  ru: ' Это примерная оценка (±20–30%).',
  en: ' This is an estimate (±20–30%).',
};
const ADD_LABEL: Record<Lang, string> = {
  uk: '➕ До бази продуктів',
  ru: '➕ В базу продуктов',
  en: '➕ Add to Food DB',
};

const NO_PRODUCT: Record<Lang, string> = {
  uk: 'Не зрозумів, що саме записати. Напиши продукт і кількість, напр. «200г куриного філе».',
  ru: 'Не понял, что записать. Напиши продукт и количество, напр. «200г куриного филе».',
  en: "I didn't catch the food. Send a product and amount, e.g. “200g chicken breast”.",
};

const CORRECTED_VERB: Record<Lang, string> = { uk: 'Виправив', ru: 'Исправил', en: 'Corrected' };

const NO_ENTRY: Record<Lang, string> = {
  uk: "Ще немає жодного запису, який можна виправити. Спочатку запиши, що ти з'їв.",
  ru: 'Пока нет ни одной записи, которую можно исправить. Сначала запиши, что ты съел.',
  en: "There's nothing logged yet to correct. Log a food entry first.",
};

/** Log-by-default still needs a product — nudge in the user's language when the parse has none. */
export const noProductReply = (text: string): Confirmation => ({
  text: NO_PRODUCT[detectLang(text)],
});

/** Shared confirmation body for logging and correcting — only the leading verb differs. */
const buildEntryConfirmation = (
  verb: Record<Lang, string>,
  text: string,
  row: FoodLog,
): Confirmation => {
  const lang = detectLang(text);
  const base = `${verb[lang]}: ${macroLine(lang, row)}.`;

  if (row.source === FoodSource.fact) {
    return { text: base };
  }

  return {
    text: `${base}${ESTIMATE_NOTE[lang]}`,
    addToCatalog: { id: row.id, label: ADD_LABEL[lang] },
  };
};

export const buildConfirmation = (text: string, row: FoodLog): Confirmation =>
  buildEntryConfirmation(LOGGED_VERB, text, row);

/** Reply when a `correction` arrives but the user has no `food_log` row yet (honest, no write). */
export const noEntryReply = (text: string): Confirmation => ({
  text: NO_ENTRY[detectLang(text)],
});

/** Confirmation for an in-place correction — same shape as {@link buildConfirmation}, different verb. */
export const buildCorrectionConfirmation = (text: string, row: FoodLog): Confirmation =>
  buildEntryConfirmation(CORRECTED_VERB, text, row);

const CATALOG_SAVED: Record<Lang, string> = {
  uk: '✅ Додав у твою базу продуктів.',
  ru: '✅ Добавил в твою базу продуктов.',
  en: '✅ Added to your Food DB.',
};
const CATALOG_SKIPPED: Record<Lang, string> = {
  uk: 'Уже в базі або запис не знайдено.',
  ru: 'Уже в базе или запись не найдена.',
  en: 'Already in your Food DB, or the entry was not found.',
};

/**
 * Reply for an add-to-catalog tap, localized off the row's `entryName` (the user's own words —
 * invariant #6). Falls back to `ru` only when nothing matched and there is no text to detect from.
 */
export const catalogReply = (result: CatalogResult): string => {
  const lang = result.entryName ? detectLang(result.entryName) : 'ru';
  return result.saved ? CATALOG_SAVED[lang] : CATALOG_SKIPPED[lang];
};
