import type { PrismaClient } from '@prisma/client';

// Nutrition-query domain shapes (US-4, §nutrition-query). The router resolves `query` + a date but no
// nutrient field — query parses which nutrient(s) are asked from raw text in code (invariant #5, no
// LLM on this path) and answers from a SQL aggregate (invariant #1/#2), never chat history.

/** The four reportable nutrients — an ordered subset is "asked"; no keyword → all four. */
export type Nutrient = 'kcal' | 'protein' | 'fat' | 'carbs';

/** One day's `food_log` SUM, coerced to numbers at the aggregate boundary (no Decimal beyond it). */
export interface DayTotals {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  entryCount: number;
}

/** One day's `food_log` SUM within a range groupBy — numbers coerced at the aggregate boundary. */
export interface DayTotalsRow {
  date: string; // YYYY-MM-DD
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

/** The user's per-day onboarding targets (`users.target_*`) — nullable per-nutrient until set. */
export interface Targets {
  kcal: number | null;
  proteinG: number | null;
  fatG: number | null;
  carbsG: number | null;
}

/** An answer the bot renders: prose only — the numbers are baked in already (invariant #2). */
export interface QueryAnswer {
  text: string;
}

/** The router output fields query reads (intent already known to be `query`). */
export interface RoutedQuery {
  date: string; // resolved YYYY-MM-DD (user TZ) — never recomputed here
}

export interface QueryService {
  answerQuery: (chatId: bigint, text: string, routed: RoutedQuery) => Promise<QueryAnswer | null>;
}

// Narrow structural surface over Prisma — a real PrismaClient satisfies it; tests pass a cast mock.
export type QueryClient = Pick<PrismaClient, 'user' | 'foodLog'>;
