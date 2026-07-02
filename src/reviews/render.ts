import type { Meal } from '@prisma/client';
import type { Lang } from '../util/lang.js';
import { fmt, round1 } from '../util/num.js';
import { FAT_OK_BAND, PROTEIN_HIT_BAND } from './compute.js';
import type { DailyStats, MonthlyStats, ReviewProse, WeeklyStats } from './types.js';

// Deterministic template fill (design D2, docs/review-templates.md): the numbers come from the
// code-computed `*Stats`; the model prose is spliced into named slots. Prose mirrors the user's
// language (invariant #6) — manual detects from the trigger, cron passes Russian (D5). Structural
// labels/units are localized here; enum values (`meal`, `period`) stay English at rest. Edge cases:
// empty period → nudge not zeros; partial → coverage line; missing delta → "—"; missing metric → omit.

const DASH = '—';
const LOCALE: Record<Lang, string> = { ru: 'ru-RU', uk: 'uk-UA', en: 'en-US' };

const T = {
  dailyHeader: { ru: 'Ревью дня', uk: 'Огляд дня', en: 'Daily review' },
  weeklyHeader: { ru: 'Ревью недели', uk: 'Огляд тижня', en: 'Weekly review' },
  monthlyHeader: { ru: 'Ревью месяца', uk: 'Огляд місяця', en: 'Monthly review' },
  kcal: { ru: 'Калории', uk: 'Калорії', en: 'Calories' },
  protein: { ru: 'Белок', uk: 'Білок', en: 'Protein' },
  fat: { ru: 'Жир', uk: 'Жир', en: 'Fat' },
  carbs: { ru: 'Углеводы', uk: 'Вуглеводи', en: 'Carbs' },
  grams: { ru: 'г', uk: 'г', en: 'g' },
  cm: { ru: 'см', uk: 'см', en: 'cm' },
  kg: { ru: 'кг', uk: 'кг', en: 'kg' },
  kcalUnit: { ru: 'ккал', uk: 'ккал', en: 'kcal' },
  meals: { ru: 'Приёмы', uk: 'Прийоми', en: 'Meals' },
  entries: { ru: 'записей', uk: 'записів', en: 'entries' },
  estimates: { ru: 'оценок', uk: 'оцінок', en: 'est.' },
  drivers: { ru: 'Драйверы', uk: 'Драйвери', en: 'Drivers' },
  verdict: { ru: 'Вердикт', uk: 'Вердикт', en: 'Verdict' },
  under: { ru: '⚠️ недобор', uk: '⚠️ недобір', en: '⚠️ under' },
  over: { ru: '⚠️ перебор', uk: '⚠️ перебір', en: '⚠️ over' },
  dailyAvg: { ru: 'Среднее в день', uk: 'Середнє на день', en: 'Daily average' },
  proteinOnTarget: { ru: 'Белок в цель', uk: 'Білок у ціль', en: 'Protein on target' },
  fatInRange: { ru: 'Жир в норме', uk: 'Жир у нормі', en: 'Fat in range' },
  days: { ru: 'дней', uk: 'днів', en: 'days' },
  weeksWord: { ru: 'недель', uk: 'тижнів', en: 'weeks' },
  onAverage: { ru: 'в среднем', uk: 'в середньому', en: 'on average' },
  weight: { ru: 'Вес', uk: 'Вага', en: 'Weight' },
  waist: { ru: 'Талия', uk: 'Талія', en: 'Waist' },
  vsLastWeek: { ru: 'vs прошлой недели', uk: 'vs минулого тижня', en: 'vs last week' },
  whatWorked: { ru: 'Что работало', uk: 'Що працювало', en: 'What worked' },
  heldBack: { ru: 'Что тянуло назад', uk: 'Що тягнуло назад', en: 'What held back' },
  focusWeek: {
    ru: 'Фокус на следующую неделю',
    uk: 'Фокус на наступний тиждень',
    en: 'Focus next week',
  },
  trend: {
    ru: 'Тренд (среднее в день по неделям)',
    uk: 'Тренд (середнє на день по тижнях)',
    en: 'Trend (daily average by week)',
  },
  week: { ru: 'Неделя', uk: 'Тиждень', en: 'Week' },
  calMonthAvg: {
    ru: 'Калории (ср. за месяц)',
    uk: 'Калорії (сер. за місяць)',
    en: 'Calories (monthly avg)',
  },
  composition: { ru: 'Композиция', uk: 'Композиція', en: 'Composition' },
  whatWorkedMonth: {
    ru: 'Что сработало за месяц',
    uk: 'Що спрацювало за місяць',
    en: 'What worked this month',
  },
  stillProblem: {
    ru: 'Что осталось проблемой',
    uk: 'Що лишилось проблемою',
    en: 'Still a problem',
  },
  planMonth: {
    ru: 'План на следующий месяц',
    uk: 'План на наступний місяць',
    en: 'Plan next month',
  },
  logged: { ru: 'дней залогировано', uk: 'днів залоговано', en: 'days logged' },
  noData: { ru: 'нет данных', uk: 'немає даних', en: 'no data' },
  emptyDaily: {
    ru: 'За этот день ничего не записано — залогируй, что ел, и я подведу итог.',
    uk: 'За цей день нічого не записано — залогуй, що їв, і я підведу підсумок.',
    en: 'Nothing logged for this day — log what you ate and I will sum it up.',
  },
  emptyPeriod: {
    ru: 'За этот период ничего не записано — начни логировать, и ревью появится.',
    uk: 'За цей період нічого не записано — почни логувати, і огляд зʼявиться.',
    en: 'Nothing logged this period — start logging and the review will fill in.',
  },
} as const;

const MACRO_INITIALS: Record<Lang, { p: string; f: string; c: string }> = {
  ru: { p: 'Б', f: 'Ж', c: 'У' },
  uk: { p: 'Б', f: 'Ж', c: 'В' },
  en: { p: 'P', f: 'F', c: 'C' },
};

const MEAL_NAME: Record<Meal, Record<Lang, string>> = {
  breakfast: { ru: 'завтрак', uk: 'сніданок', en: 'breakfast' },
  lunch: { ru: 'обед', uk: 'обід', en: 'lunch' },
  dinner: { ru: 'ужин', uk: 'вечеря', en: 'dinner' },
  snack: { ru: 'перекус', uk: 'перекус', en: 'snack' },
};

const signed = (n: number): string => `${n > 0 ? '+' : ''}${fmt(round1(n))}`;

/** ` (±diff)` vs a target, or empty when no target is set (never invent a baseline). */
const diffTag = (actual: number, target: number | null): string =>
  target === null ? '' : ` (${signed(actual - target)})`;

const formatDmy = (iso: string): string => {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
};

const formatDm = (iso: string): string => {
  const [, m, d] = iso.split('-');
  return `${d}.${m}`;
};

const monthName = (year: number, monthIndex: number, lang: Lang): string =>
  new Intl.DateTimeFormat(LOCALE[lang], { month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, monthIndex, 1)),
  );

const macroLine = (
  label: string,
  actual: number,
  target: number | null,
  unit: string,
  flag = '',
): string => {
  const targetPart = target === null ? DASH : fmt(target);
  const suffix = flag === '' ? '' : `  ${flag}`;
  return `${label}: ${fmt(actual)} / ${targetPart} ${unit}${diffTag(actual, target)}${suffix}`;
};

const proteinFlag = (actual: number, target: number | null, lang: Lang): string =>
  target !== null && actual < target * PROTEIN_HIT_BAND ? T.under[lang] : '';

const fatFlag = (actual: number, target: number | null, lang: Lang): string =>
  target !== null && actual > target * FAT_OK_BAND ? T.over[lang] : '';

const countOf = (value: number | null): string => (value === null ? DASH : String(value));

/** `start → end unit (delta …)`, or null when the metric was never measured in the period. */
const metricLine = (
  label: string,
  unit: string,
  start: number | null,
  end: number | null,
  delta: number | null,
  deltaSuffix: string,
  lang: Lang,
): string | null => {
  if (start === null && end === null) {
    return null;
  }
  const startStr = start === null ? T.noData[lang] : fmt(start);
  const endStr = end === null ? T.noData[lang] : fmt(end);
  const deltaStr = delta === null ? DASH : signed(delta);
  return `${label}: ${startStr} → ${endStr} ${unit}  (${deltaStr}${deltaSuffix})`;
};

const renderDaily = (stats: DailyStats, prose: ReviewProse, lang: Lang): string => {
  const header = `${T.dailyHeader[lang]} — ${formatDmy(stats.date)}`;
  if (stats.empty) {
    return `${header}\n\n${T.emptyDaily[lang]}`;
  }

  const { totals, targets } = stats;
  const g = T.grams[lang];
  const mealList = stats.meals.map((meal) => MEAL_NAME[meal][lang]).join(', ');
  const estimatePart =
    stats.estimateCount > 0 ? `, ${stats.estimateCount} ${T.estimates[lang]}` : '';

  return [
    header,
    '',
    macroLine(T.kcal[lang], totals.kcal, targets.kcal, ''),
    macroLine(
      T.protein[lang],
      totals.proteinG,
      targets.proteinG,
      g,
      proteinFlag(totals.proteinG, targets.proteinG, lang),
    ),
    macroLine(T.fat[lang], totals.fatG, targets.fatG, g, fatFlag(totals.fatG, targets.fatG, lang)),
    macroLine(T.carbs[lang], totals.carbsG, targets.carbsG, g),
    '',
    `${T.meals[lang]}: ${mealList} (${stats.entryCount} ${T.entries[lang]}${estimatePart})`,
    `${T.drivers[lang]}: ${prose.drivers ?? DASH}`,
    `${T.verdict[lang]}: ${prose.verdict ?? ''}`,
  ].join('\n');
};

const coverageLine = (loggedDays: number, periodDays: number, lang: Lang): string =>
  `${loggedDays}/${periodDays} ${T.logged[lang]}`;

const renderWeekly = (stats: WeeklyStats, prose: ReviewProse, lang: Lang): string => {
  const header = `${T.weeklyHeader[lang]} — ${formatDm(stats.start)} – ${formatDmy(stats.end)}`;
  if (stats.loggedDays === 0) {
    return `${header}\n\n${T.emptyPeriod[lang]}`;
  }

  const { avg, targets } = stats;
  const g = T.grams[lang];
  const weightLine = metricLine(
    T.weight[lang],
    T.kg[lang],
    stats.weekStartWeight,
    stats.weekEndWeight,
    stats.weightDelta,
    ` ${T.vsLastWeek[lang]}`,
    lang,
  );

  const lines = [
    header,
    '',
    `${T.dailyAvg[lang]}:`,
    `  ${macroLine(T.kcal[lang], avg.kcal, targets.kcal, '')}`,
    `  ${macroLine(T.protein[lang], avg.proteinG, targets.proteinG, g)}`,
    `  ${macroLine(T.fat[lang], avg.fatG, targets.fatG, g)}`,
    `  ${macroLine(T.carbs[lang], avg.carbsG, targets.carbsG, g)}`,
    '',
    `${T.proteinOnTarget[lang]}: ${countOf(stats.daysHitProtein)} / ${stats.periodDays} ${T.days[lang]}`,
    `${T.fatInRange[lang]}: ${countOf(stats.daysFatOk)} / ${stats.periodDays} ${T.days[lang]}`,
  ];
  if (weightLine !== null) {
    lines.push(weightLine);
  }
  if (stats.loggedDays < stats.periodDays) {
    lines.push(coverageLine(stats.loggedDays, stats.periodDays, lang));
  }
  lines.push(
    '',
    `${T.whatWorked[lang]}: ${prose.whatWorked ?? ''}`,
    `${T.heldBack[lang]}: ${prose.draggedBack ?? ''}`,
    `${T.focusWeek[lang]}: ${prose.focus ?? ''}`,
  );

  return lines.join('\n');
};

const weekTrendLine = (label: string, week: MonthlyStats['weeks'][number], lang: Lang): string => {
  const m = MACRO_INITIALS[lang];
  return `  ${label}: ${week.kcal} ${T.kcalUnit[lang]} · ${m.p} ${fmt(week.proteinG)} · ${m.f} ${fmt(week.fatG)} · ${m.c} ${fmt(week.carbsG)}`;
};

const renderMonthly = (stats: MonthlyStats, prose: ReviewProse, lang: Lang): string => {
  const header = `${T.monthlyHeader[lang]} — ${monthName(stats.year, stats.monthIndex, lang)} ${stats.year}`;
  if (stats.loggedDays === 0) {
    return `${header}\n\n${T.emptyPeriod[lang]}`;
  }

  const { avg, targets } = stats;
  const trendLines = stats.weeks.map((week, index) =>
    weekTrendLine(`${T.week[lang]} ${index + 1}`, week, lang),
  );
  const weightLine = metricLine(
    T.weight[lang],
    T.kg[lang],
    stats.weightStart,
    stats.weightEnd,
    stats.weightDelta,
    '',
    lang,
  );
  const waistLine = metricLine(
    T.waist[lang],
    T.cm[lang],
    stats.waistStart,
    stats.waistEnd,
    stats.waistDelta,
    '',
    lang,
  );

  const lines = [header, '', `${T.trend[lang]}:`, ...trendLines, ''];
  lines.push(macroLine(T.calMonthAvg[lang], avg.kcal, targets.kcal, ''));
  lines.push(
    `${T.proteinOnTarget[lang]}: ${countOf(stats.weeksHitProtein)} / ${stats.weekCount} ${T.weeksWord[lang]} ${T.onAverage[lang]}`,
  );
  lines.push(`${T.composition[lang]}:`);
  if (weightLine !== null) {
    lines.push(`  ${weightLine}`);
  }
  if (waistLine !== null) {
    lines.push(`  ${waistLine}`);
  }
  if (stats.loggedDays < stats.periodDays) {
    lines.push(coverageLine(stats.loggedDays, stats.periodDays, lang));
  }
  lines.push(
    '',
    `${T.whatWorkedMonth[lang]}: ${prose.whatWorked ?? ''}`,
    `${T.stillProblem[lang]}: ${prose.draggedBack ?? ''}`,
    `${T.planMonth[lang]}: ${prose.focus ?? ''}`,
  );

  return lines.join('\n');
};

/** Render a review body from code-computed stats + spliced prose, in the given language. */
export const renderReview = (
  stats: DailyStats | WeeklyStats | MonthlyStats,
  prose: ReviewProse,
  lang: Lang,
): string => {
  if (stats.period === 'daily') {
    return renderDaily(stats, prose, lang);
  }
  if (stats.period === 'weekly') {
    return renderWeekly(stats, prose, lang);
  }
  return renderMonthly(stats, prose, lang);
};
