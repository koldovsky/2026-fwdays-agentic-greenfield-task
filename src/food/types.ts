import type { PrismaClient, FoodPer, Meal, FoodSource } from '@prisma/client';
import type { LogOutcome, OpenQuestion } from '../clarify/types.js';

// Food-logging domain shapes (US-2, §8.2). The fact path (Food DB match) and the estimate path
// (one LLM call) both converge on ResolvedFood, so scaling + write + confirm run once for either.
// `per`/`meal`/`source` are the Prisma enums — English structural literals (invariant #6).

export type { FoodPer, Meal, FoodSource };

/** Macros per the `per` basis (e.g. per 100 g, or per one piece). */
export interface MacroBase {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

/** Scaled macros for the logged quantity — the row's OWN numbers (kcal is Int per schema). */
export interface ScaledMacros {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

/** The unified resolution either path produces before a single scale → write. */
export interface ResolvedFood {
  name: string;
  per: FoodPer;
  base: MacroBase;
  qty: number;
  unit: string; // canonical English label derived from `per` (g/ml/portion/piece/dish)
  source: FoodSource;
  foodDbId: number | null; // set iff resolved from a Food DB match (fact)
}

/** What the router handed us for a `log` message (the fields food-text consumes). */
export interface ParsedFood {
  product: string;
  qty: number | undefined; // absent when the user gave no quantity — defaulted per basis at resolve
  unit: string;
}

/** A confirmation the bot renders: prose (the row's own numbers) + an optional add-to-catalog offer. */
export interface Confirmation {
  text: string;
  addToCatalog?: { id: number; label: string }; // present iff estimate path
  // Present iff a MULTI-item plate (composite-dish): the just-written row ids the "save as dish" button
  // carries (macros are re-read from them at save — invariant #1) and the localized button label
  // (invariant #6, mirroring `addToCatalog.label`). The name is asked for at tap time, not carried here.
  dish?: { rowIds: number[]; label: string };
}

/** Outcome of an add-to-catalog tap. `entryName` (the row's, in the user's language) localizes the reply. */
export interface CatalogResult {
  saved: boolean;
  entryName: string | null; // null only when no matching row was found
}

export interface FoodService {
  logFood: (chatId: bigint, text: string, routed: RoutedLog) => Promise<LogOutcome | null>;
  /**
   * Log a plate photo (food-photo): one vision call → one row per item → multi-item confirmation, OR
   * defer to a photo-variant Open Question when the vision call flags a hidden high-leverage mover.
   */
  logPhoto: (chatId: bigint, caption: string, images: string[]) => Promise<LogOutcome | null>;
  saveToCatalog: (chatId: bigint, foodLogId: number) => Promise<CatalogResult>;
  correctLast: (
    chatId: bigint,
    text: string,
    routed: RoutedCorrection,
  ) => Promise<Confirmation | null>;
  /** Refine the pending Open Question with the user's answer and log it (clarify capability). */
  resolveAnswer: (
    chatId: bigint,
    pending: OpenQuestion,
    answer: string,
  ) => Promise<Confirmation | null>;
  /** Expiry/no-answer fallback: log the pending resolved-so-far food as an honest `estimate`. */
  logExpiredEstimate: (chatId: bigint, pending: OpenQuestion) => Promise<Confirmation | null>;
}

/** The router output fields food-text reads (intent already known to be `log`). */
export interface RoutedLog {
  date: string; // resolved YYYY-MM-DD (user TZ) — never recomputed here
  product?: string | undefined;
  quantity?: number | undefined;
  unit?: string | undefined;
}

/** Same shape as {@link RoutedLog} — the router emits identical fields for `correction` (design D3). */
export type RoutedCorrection = RoutedLog;

// Narrow structural surface over Prisma — a real PrismaClient satisfies it; tests pass a cast mock.
export type FoodClient = Pick<PrismaClient, 'user' | 'foodDatabase' | 'foodLog'>;
