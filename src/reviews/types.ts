import type { Meal, PrismaClient } from '@prisma/client';
import type { DayTotals, Targets } from '../query/types.js';

// Review-generation domain shapes (US-9, §review-generation). Numbers live in `*Stats` (computed in
// code from SQL — invariants #1/#2); the model fills only the prose slots in `ReviewProse`. `period`
// and the six metric columns stay English structural literals (invariant #6). The client is a narrow
// structural `Pick` over Prisma so tests pass a cast fake (backend-conventions rule 6).

export type ReviewPeriod = 'daily' | 'weekly' | 'monthly';

/** Narrow structural surface over Prisma — a real client satisfies it; tests pass a cast mock. */
export type ReviewClient = Pick<PrismaClient, 'user' | 'foodLog' | 'bodyMetric' | 'review'>;

/** Per-day averages over the LOGGED days of a period (never a hand-summed period total). */
export interface MacroAverages {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

/** One week's per-day averages for the monthly trend table. */
export interface WeekTrend {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

export interface DailyStats {
  period: 'daily';
  date: string; // YYYY-MM-DD (user TZ, already resolved)
  totals: DayTotals;
  targets: Targets;
  meals: Meal[]; // distinct meals present, in canonical order
  entryCount: number;
  estimateCount: number;
  empty: boolean; // no food logged → nudge, not zeros
}

export interface WeeklyStats {
  period: 'weekly';
  start: string; // Monday YYYY-MM-DD
  end: string; // Sunday YYYY-MM-DD
  targets: Targets;
  avg: MacroAverages;
  loggedDays: number;
  periodDays: number; // 7
  daysHitProtein: number | null; // null when no protein target set
  daysFatOk: number | null; // null when no fat target set
  weekStartWeight: number | null;
  weekEndWeight: number | null;
  weightDelta: number | null; // vs prior week's weight; null when no baseline
}

export interface MonthlyStats {
  period: 'monthly';
  start: string; // first of month YYYY-MM-DD
  end: string; // last day of month YYYY-MM-DD
  year: number;
  monthIndex: number; // 0-11
  targets: Targets;
  avg: MacroAverages;
  loggedDays: number;
  periodDays: number; // days in the month
  weeks: WeekTrend[]; // per-ISO-week averages within the month, in order
  weeksHitProtein: number | null;
  weekCount: number;
  weightStart: number | null;
  weightEnd: number | null;
  weightDelta: number | null; // end − start within the month
  waistStart: number | null;
  waistEnd: number | null;
  waistDelta: number | null;
}

export type ReviewStats = DailyStats | WeeklyStats | MonthlyStats;

/** Prose-only slots the model fills — NO numeric fields (invariant #2). Slots vary by period. */
export interface ReviewProse {
  drivers?: string;
  verdict?: string;
  whatWorked?: string;
  draggedBack?: string;
  focus?: string;
}

/** The one structured LLM call per review (invariant #5); injected so tests can spy the call count. */
export type ProseGenerator = (period: ReviewPeriod, promptText: string) => Promise<ReviewProse>;

/** What the caller controls per trigger: language source, the target day, and the reviewed flag. */
export interface GenerateOptions {
  triggerText?: string; // manual → detect language from it; absent → cron → Russian default (D5)
  date?: string; // explicit finished day (cron); absent → user-local today (manual)
  reviewed?: boolean; // manual = true; cron = false; default true
}

export interface ReviewResult {
  text: string; // the daily review body (the primary reply)
  rollups: string[]; // weekly and/or monthly bodies generated alongside it, in order — also delivered
}

export interface ReviewService {
  generateDaily: (chatId: bigint, opts?: GenerateOptions) => Promise<ReviewResult | null>;
}

export type { Meal, Targets, DayTotals };
