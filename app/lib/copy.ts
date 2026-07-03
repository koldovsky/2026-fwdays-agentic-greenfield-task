/**
 * User-facing copy — single source of truth for the product's Ukrainian
 * strings that carry quality weight (honesty framing, empty-state guidance,
 * advice). Centralized so components render it and the eval suite can grade the
 * exact same text (evals/cases/*.eval.ts import from here).
 */
import { formatPercent } from "@/app/lib/format";
import { REAL_THRESHOLD, SAFE_THRESHOLD } from "@/app/lib/scoring";

/** Global honesty disclaimer (BC-HONESTY-01), shown on every route. */
export const DISCLAIMER_TEXT =
  "Шанси на вступ — це оцінка на основі історичних даних, а не гарантія " +
  "зарахування. Остаточні рішення ухвалюють заклади освіти; використовуйте " +
  "ці показники лише як орієнтир.";

/** Deadline banner copy (BC-DEADLINE-01, passive surface). */
export const DEADLINE_LEAD = "Дедлайн вступу.";
export const deadlineText = (dateLabel: string) =>
  `Орієнтовна дата завершення подачі заяв — ${dateLabel}. Точні дати уточнюйте ` +
  `на офіційному сайті вступної кампанії.`;

/** Empty states (FR-UX-01) — a title and an actionable hint, never a dead end. */
export const EMPTY = {
  recommendations: {
    title: "У цій категорії поки порожньо",
    text: "Обери іншу категорію ризику вгорі, зміни бали НМТ або познач менше напрямів і міст зліва — список одразу перерахується.",
  },
  comparison: {
    title: "Поки порівнювати нема що",
    text: "Додай 2–3 варіанти кнопкою ⇄ на картках рекомендацій — і побачиш їх поруч за шансом, прохідним балом, вартістю та містом.",
  },
  saved: {
    title: "Список порожній",
    text: "Натисни ★ на картці рекомендацій, щоб зберегти програму. Тут вестимеш заяви за статусами — від «Збережено» до «Зараховано».",
  },
} as const;

/** Sidebar hints. */
export const HINT_RECOMPUTE =
  "Рухай слайдери — рекомендації й шанси перераховуються миттєво.";

/** Category-appropriate advice base (§6 recommendations). */
export function adviceBase(chance: number): string {
  if (chance >= SAFE_THRESHOLD)
    return "Надійний вибір: конкурсний бал упевнено перевищує торішній прохідний, тож ти майже напевно проходиш. Тримай програму запасним пріоритетом — постав нижче за омріяні, щоб не зайняти нею бюджетне місце, якщо пройдеш вище.";
  if (chance >= REAL_THRESHOLD)
    return "Реальний шанс на бюджет: бал близький до прохідного, усе вирішить цьогорічний конкурс. Постав програму пріоритетом 1–2, а поряд додай надійніший варіант для підстраховки.";
  return "Шанс невисокий — бал нижчий за торішній прохідний, — але вступ не виключений. Постав програму нижчим пріоритетом за реалістичні: спроба нічого не коштує, а якщо конкурс просяде, з’явиться нагода.";
}

/**
 * Honesty framing for the detail view (BC-HONESTY-01): states the chance as an
 * estimate WITH its band and an explicit "not a guarantee", never a bare number.
 * A degenerate band (value clamped at 2 %/98 %) drops the range clause rather
 * than printing a self-contradictory "діапазон 98 %".
 */
export function honestyBandSentence(
  chance: number,
  lo: number,
  hi: number,
): string {
  const range = lo === hi ? "" : ` з діапазоном ${lo}–${hi} %`;
  return (
    `Шанс ${formatPercent(chance)} — це оцінка${range}, що враховує коливання ` +
    `прохідного бала за роки, а не гарантія.`
  );
}
