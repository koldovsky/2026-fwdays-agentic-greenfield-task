// Ukrainian plural-form selection (NFR-LOC-01). Ukrainian nouns have three
// numeric forms; the standard rule keys off the last two digits of the count:
//   - "one"   form: count % 10 === 1 AND count % 100 !== 11        (1, 21, 31…)
//   - "few"   form: count % 10 in 2..4 AND count % 100 not in 12..14 (2–4, 22…)
//   - "many"  form: everything else                                 (0, 5–20, 11…)
// Pure + deterministic so it is unit-tested directly.

export type UkPluralForm = "one" | "few" | "many";

/** The three Ukrainian forms of one noun, keyed by plural category. */
export interface UkPluralForms {
  /** e.g. "рослина" — used for 1, 21, 31… */
  one: string;
  /** e.g. "рослини" — used for 2–4, 22–24… */
  few: string;
  /** e.g. "рослин" — used for 0, 5–20, 11–14, 25… */
  many: string;
}

/** Select the Ukrainian plural CATEGORY for a non-negative integer count. */
export function ukPluralForm(count: number): UkPluralForm {
  const n = Math.abs(Math.trunc(count));
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "one";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "few";
  return "many";
}

/** Pick the correct Ukrainian noun form for a count (1→one, 2-4→few, else many). */
export function ukPlural(count: number, forms: UkPluralForms): string {
  return forms[ukPluralForm(count)];
}
