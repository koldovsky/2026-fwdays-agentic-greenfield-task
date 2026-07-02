import { FoodSource } from '@prisma/client';
import type { FoodLog } from '@prisma/client';
import { macroBaseFromRow, sumMacros } from './scale.js';
import type { CatalogResult, Confirmation } from './types.js';
import { detectLang, detectLangOrRu, type Lang } from '../util/lang.js';
import { fmt } from '../util/num.js';

// Build the confirmation (§8.2 step 4). The prose CONTAINS the numbers, so it's assembled in code,
// never by the model (invariant #2) — and it shows only THIS entry's own figures, never a hand-summed
// daily total (that's the `query` capability). Prose mirrors the user's language (invariant #6); the
// estimate path is surfaced honestly and offers to save the food to the user's Food DB.

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
const TOTAL_LABEL: Record<Lang, string> = { uk: 'Разом', ru: 'Итого', en: 'Total' };

/**
 * The plate total, summed IN CODE from the rows just written (invariant #2 — the model never emits a
 * number; a per-plate total is a code sum of `food_log` rows, distinct from the daily SUM in `query`).
 * kcal is the Int column; macros come from each row's own basis via `macroBaseFromRow` (no re-scaling).
 */
const totalLine = (lang: Lang, rows: FoodLog[]): string => {
  const totals = sumMacros(rows);
  const p = fmt(totals.proteinG);
  const f = fmt(totals.fatG);
  const c = fmt(totals.carbsG);
  if (lang === 'en') {
    return `${TOTAL_LABEL.en} — ${totals.kcal} kcal · P ${p} / F ${f} / C ${c} g`;
  }
  return `${TOTAL_LABEL[lang]} — ${totals.kcal} ккал · Б ${p} / Ж ${f} / ${lang === 'uk' ? 'В' : 'У'} ${c} г`;
};
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

// Composite-dish: the "save this whole plate as one named product" button label (invariant #6 — the
// label is prose, localized off the caption; the callback data + `per` stay English structural values).
const SAVE_DISH_LABEL: Record<Lang, string> = {
  uk: '➕ Зберегти як страву',
  ru: '➕ Сохранить как блюдо',
  en: '➕ Save as dish',
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

/**
 * Multi-item plate confirmation (food-photo, invariant #2): assembled in code, listing EACH row's
 * own numbers via the same `macroLine`, plus a per-plate TOTAL summed in code from those rows (still
 * never a model-emitted number, and distinct from the daily SUM in `query`). The total is shown only
 * for a multi-item plate (a single item's own line already is the total). One honest estimate note if
 * any row is an `estimate` (invariant #3). Prose language mirrors the caption (default when empty);
 * enum/structural values stay English (invariant #6). No per-item add-to-catalog button in this slice.
 */
export const buildPlateConfirmation = (caption: string, rows: FoodLog[]): Confirmation => {
  const lang = detectLang(caption);
  const lines = rows.map((row) => `• ${macroLine(lang, row)}`);
  const multi = rows.length > 1;
  if (multi) {
    lines.push(totalLine(lang, rows));
  }
  const body = `${LOGGED_VERB[lang]}:\n${lines.join('\n')}`;
  const hasEstimate = rows.some((row) => row.source === FoodSource.estimate);
  const text = hasEstimate ? `${body}${ESTIMATE_NOTE[lang]}` : body;

  // A single-item plate offers no dish save — its own entry already is the product (composite-dish
  // guard). A multi-item plate carries the just-written row ids + a localized "save as dish" button.
  if (!multi) {
    return { text };
  }

  return {
    text,
    dish: {
      rowIds: rows.map((row) => row.id),
      label: SAVE_DISH_LABEL[lang],
    },
  };
};

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
  const lang = detectLangOrRu(result.entryName);
  return result.saved ? CATALOG_SAVED[lang] : CATALOG_SKIPPED[lang];
};

// Composite-dish name prompt + saved reply (invariant #6). The prompt is posed at button-tap time,
// when the only inbound signal is the (stateless) callback — so there is no caption to detect from and
// it defaults to the no-language default (design D6 precedent). The saved reply detects off the dish
// name the user just typed (their own words). `per`/enums stay English; only this prose is localized.
const NAME_PROMPT: Record<Lang, string> = {
  uk: 'Як назвати цю страву? Напиши назву — збережу її як один продукт.',
  ru: 'Как назвать это блюдо? Напиши название — сохраню его как один продукт.',
  en: 'What should I call this dish? Send a name and I’ll save it as one product.',
};
const DISH_SAVED: Record<Lang, string> = {
  uk: '✅ Зберіг страву в твоїй базі продуктів.',
  ru: '✅ Сохранил блюдо в твоей базе продуктов.',
  en: '✅ Saved the dish to your Food DB.',
};
const DISH_NOT_SAVED: Record<Lang, string> = {
  uk: 'Не вдалося зберегти страву — записи не знайдено.',
  ru: 'Не удалось сохранить блюдо — записи не найдены.',
  en: "Couldn't save the dish — the entries weren't found.",
};

/** The localized "name this dish?" prompt (no caption at tap time → the no-signal default, design D6). */
export const dishNamePrompt = (hint?: string): string => NAME_PROMPT[detectLangOrRu(hint)];

/** Reply after a composite-dish save, localized off the dish name the user typed (invariant #6). */
export const dishSavedReply = (result: CatalogResult): Confirmation => {
  const lang = detectLangOrRu(result.entryName);
  return { text: result.saved ? DISH_SAVED[lang] : DISH_NOT_SAVED[lang] };
};
