import type { Lang } from '../util/lang.js';
import type { DailyStats, MonthlyStats, ReviewStats, WeeklyStats } from './types.js';

// Serialize the code-computed numbers into the user message for the ONE prose call (design D2). The
// model is told the numbers are already rendered and must write ONLY the prose slots — it never emits
// them. The coach voice comes from the cached system prefix, so no persona text is added here; only a
// language instruction (invariant #6) — manual mirrors the trigger, cron defaults to Russian (D5).

const langLine = (lang: Lang): string => {
  if (lang === 'uk') {
    return 'Пиши українською.';
  }
  if (lang === 'en') {
    return 'Write in English.';
  }
  // TEMPORAL DEMO HACK (drop after demo): cron/no-signal reviews in Ukrainian, not Russian.
  return 'Пиши українською.';
};

const targetOf = (value: number | null): string => (value === null ? 'no target' : String(value));

const dailyPrompt = (stats: DailyStats, lang: Lang): string => {
  const { totals, targets } = stats;
  return [
    'Daily nutrition review for a user on a cut. The numbers below are ALREADY rendered in the',
    'message — do NOT restate them. Write only the prose slots.',
    `Calories: ${totals.kcal} / ${targetOf(targets.kcal)}`,
    `Protein: ${totals.proteinG} / ${targetOf(targets.proteinG)} g`,
    `Fat: ${totals.fatG} / ${targetOf(targets.fatG)} g`,
    `Carbs: ${totals.carbsG} / ${targetOf(targets.carbsG)} g`,
    `Entries: ${stats.entryCount} (${stats.estimateCount} estimated)`,
    'drivers: name the concrete culprit if a macro is notably off (fat over / protein under), else "—".',
    'verdict: 1–2 honest lines. Flag an extreme deficit as a problem, not a win. No cheerleading.',
    langLine(lang),
  ].join('\n');
};

const rollupPrompt = (label: string, stats: WeeklyStats | MonthlyStats, lang: Lang): string => {
  const { avg, targets } = stats;
  return [
    `${label} nutrition review for a user on a cut. The numbers below are ALREADY rendered — do NOT`,
    'restate them. Write only the prose slots.',
    `Daily average kcal: ${avg.kcal} / ${targetOf(targets.kcal)}`,
    `Daily average protein: ${avg.proteinG} / ${targetOf(targets.proteinG)} g`,
    `Daily average fat: ${avg.fatG} / ${targetOf(targets.fatG)} g`,
    `Daily average carbs: ${avg.carbsG} / ${targetOf(targets.carbsG)} g`,
    `Logged ${stats.loggedDays}/${stats.periodDays} days.`,
    'whatWorked / draggedBack / focus: honest, concrete, recurring drivers over the period.',
    langLine(lang),
  ].join('\n');
};

/** Build the user message for a review's single prose call. */
export const buildPrompt = (stats: ReviewStats, lang: Lang): string => {
  if (stats.period === 'daily') {
    return dailyPrompt(stats, lang);
  }
  if (stats.period === 'weekly') {
    return rollupPrompt('Weekly', stats, lang);
  }
  return rollupPrompt('Monthly', stats, lang);
};
