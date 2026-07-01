import type Anthropic from '@anthropic-ai/sdk';
import { FoodSource } from '@prisma/client';
import type { FoodLog } from '@prisma/client';
import { decideAskOrLog } from '../clarify/decide.js';
import { buildQuestion } from '../clarify/question.js';
import { resolveAnswer } from '../clarify/resolve.js';
import { toClarification } from '../clarify/types.js';
import type { LogOutcome, OpenQuestion, PhotoOpenQuestion } from '../clarify/types.js';
import { resolveDate } from '../router/date.js';
import { saveLoggedFoodToCatalog } from './addToCatalog.js';
import { buildConfirmation, buildPlateConfirmation, noProductReply } from './confirm.js';
import { correctLast } from './correct.js';
import { inferMeal } from './meal.js';
import { estimatePlate, refinePlate, resolvePlate } from './photo.js';
import { resolveForLog } from './resolve.js';
import { writeFoodLog } from './write.js';
import type {
  CatalogResult,
  Confirmation,
  FoodClient,
  FoodService,
  Meal,
  ParsedFood,
  ResolvedFood,
  RoutedCorrection,
  RoutedLog,
} from './types.js';

// Food-logging service (US-2, §8.2): orchestration only — resolve → infer meal → write → confirm.
// All SQL lives in the lookup/write/catalog modules behind the tenancy choke-point (invariant #8).
// `now` is injectable so meal inference is deterministic under test.

/** Resolve the tenant's internal id from their Telegram chat_id (the chat is the auth). */
const resolveUserId = async (prisma: FoodClient, chatId: bigint): Promise<number | null> => {
  const user = await prisma.user.findUnique({ where: { chatId }, select: { id: true } });
  return user?.id ?? null;
};

/**
 * Write one code-scaled, tenant-scoped `food_log` row per resolved plate item (invariants #2/#8) —
 * ONE home for the plate write loop shared by the log-immediately, answer-refine, and expiry paths
 * (rule #12). No per-plate total is ever computed (invariant #2).
 */
const writePlateRows = async (
  prisma: FoodClient,
  userId: number,
  items: ResolvedFood[],
  date: string,
  meal: Meal,
): Promise<FoodLog[]> => {
  const rows: FoodLog[] = [];
  for (const resolved of items) {
    rows.push(await writeFoodLog(prisma, userId, resolved, date, meal));
  }

  return rows;
};

/**
 * The language anchor for a plate confirmation (invariant #6): the user's own caption when they gave
 * one, else the model-written clarify question (the answer may be a bare id or an English tap that
 * carries no language). Caption is text, not the image — storing it does NOT breach invariant #4.
 */
const plateLangAnchor = (pending: PhotoOpenQuestion): string =>
  pending.caption.trim() !== '' ? pending.caption : pending.clarification.question;

/**
 * Resolve a photo Open Question: ONE text-only refine over the held items + the answer (never
 * re-vision, invariant #4), re-resolve fact/estimate, then one row per item.
 */
const resolvePlateAnswer = async (
  prisma: FoodClient,
  anthropic: Anthropic,
  userId: number,
  pending: PhotoOpenQuestion,
  answer: string,
): Promise<Confirmation> => {
  const refined = await refinePlate(anthropic, pending.items, answer);
  const resolvedItems = await resolvePlate(prisma, userId, refined);
  const rows = await writePlateRows(prisma, userId, resolvedItems, pending.date, pending.meal);

  return buildPlateConfirmation(plateLangAnchor(pending), rows);
};

/**
 * Expiry fallback for a photo Open Question (invariant #3 — never drop): log EVERY held item AS-IS for
 * the captured meal/date, preserving each item's resolved source/foodDbId (a catalog `fact` stays a
 * fact — invariant #3 "catalog match = fact"), with no further model call.
 */
const expirePlateEstimate = async (
  prisma: FoodClient,
  userId: number,
  pending: PhotoOpenQuestion,
): Promise<Confirmation> => {
  const rows = await writePlateRows(prisma, userId, pending.items, pending.date, pending.meal);

  return buildPlateConfirmation(plateLangAnchor(pending), rows);
};

export const createFoodService = (
  prisma: FoodClient,
  anthropic: Anthropic,
  userTz: string,
  now: () => Date = () => new Date(),
): FoodService => ({
  async logFood(chatId: bigint, text: string, routed: RoutedLog): Promise<LogOutcome | null> {
    const userId = await resolveUserId(prisma, chatId);
    if (userId === null) {
      return null;
    }
    if (!routed.product) {
      return { kind: 'logged', confirmation: noProductReply(text) };
    }

    const parsed: ParsedFood = {
      product: routed.product,
      qty: routed.quantity, // undefined → reconcileQty defaults to one serving of the resolved basis
      unit: routed.unit ?? '',
    };
    const { resolved, clarify, candidates } = await resolveForLog(
      prisma,
      anthropic,
      userId,
      parsed,
    );

    const meal = inferMeal(now(), userTz);
    const clarification = decideAskOrLog(resolved, clarify, candidates);
    if (clarification) {
      // Capture the meal at ASK time so a boundary-crossing answer/expiry logs the meal the user ate
      // in, not the one they answered in; carry the original `parsed` so the answer re-scales/-resolves
      // from the right basis (design D3, revised).
      const pending: OpenQuestion = {
        variant: 'text',
        resolved,
        parsed,
        clarification,
        meal,
        date: routed.date,
        askedAt: now(),
      };
      return { kind: 'ask', question: buildQuestion(clarification, text), pending };
    }

    const row = await writeFoodLog(prisma, userId, resolved, routed.date, meal);

    return { kind: 'logged', confirmation: buildConfirmation(text, row) };
  },

  // Photo front door (US-3, §8.3): ONE vision call → itemized macros → either log-immediately (one
  // code-scaled `food_log` row per item → multi-item confirmation) OR, when the vision call flags a
  // hidden high-leverage mover (`clarify`, riding the SAME response — invariant #5), hold the resolved
  // item LIST as a photo-variant Open Question and ask (design D2). The image arrives as base64 and is
  // never persisted (invariant #4 — enforced upstream + by the fs-spy test). Meal from the user clock,
  // date = today (user TZ, via the shared resolveDate). Rows go through writeFoodLog, so macros are
  // scaled in code and tenant-scoped (invariants #2/#8); no per-plate total anywhere.
  async logPhoto(chatId: bigint, caption: string, imageBase64: string): Promise<LogOutcome | null> {
    const userId = await resolveUserId(prisma, chatId);
    if (userId === null) {
      return null;
    }

    const { items, clarify } = await estimatePlate(anthropic, imageBase64, caption);
    if (items.length === 0) {
      return null;
    }

    const resolvedItems = await resolvePlate(prisma, userId, items);
    const meal = inferMeal(now(), userTz);
    const date = resolveDate('today', userTz, now());

    if (clarify) {
      // Capture the item list + meal/date at ASK time so a boundary-crossing answer/expiry logs the
      // meal the user ate in. No image is held — it was already discarded (invariant #4).
      const clarification = toClarification(clarify);
      const pending: PhotoOpenQuestion = {
        variant: 'photo',
        items: resolvedItems,
        caption, // text only (invariant #4 forbids the image bytes, not the caption)
        clarification,
        meal,
        date,
        askedAt: now(),
      };
      return { kind: 'ask', question: buildQuestion(clarification, caption), pending };
    }

    const rows = await writePlateRows(prisma, userId, resolvedItems, date, meal);

    return { kind: 'logged', confirmation: buildPlateConfirmation(caption, rows) };
  },

  async saveToCatalog(chatId: bigint, foodLogId: number): Promise<CatalogResult> {
    const userId = await resolveUserId(prisma, chatId);
    if (userId === null) {
      return { saved: false, entryName: null };
    }

    return saveLoggedFoodToCatalog(prisma, userId, foodLogId);
  },

  async correctLast(
    chatId: bigint,
    text: string,
    routed: RoutedCorrection,
  ): Promise<Confirmation | null> {
    const userId = await resolveUserId(prisma, chatId);
    if (userId === null) {
      return null;
    }

    return correctLast(prisma, anthropic, userId, text, routed);
  },

  async resolveAnswer(
    chatId: bigint,
    pending: OpenQuestion,
    answer: string,
  ): Promise<Confirmation | null> {
    const userId = await resolveUserId(prisma, chatId);
    if (userId === null) {
      return null;
    }

    // Branch on the variant (design D5) — the text/callback handlers stay variant-agnostic. Meal comes
    // from the pending question (captured at ask time), not re-inferred now — see logFood.
    if (pending.variant === 'photo') {
      return resolvePlateAnswer(prisma, anthropic, userId, pending, answer);
    }

    return resolveAnswer(prisma, anthropic, userId, pending, answer);
  },

  // Expiry/no-answer fallback (invariants #3/#8): write the resolved-so-far food as `estimate` for
  // its original date and meal — never drop the entry. Returns the confirmation so a late tap can
  // surface it; the food service stays the single writer of food_log.
  async logExpiredEstimate(chatId: bigint, pending: OpenQuestion): Promise<Confirmation | null> {
    const userId = await resolveUserId(prisma, chatId);
    if (userId === null) {
      return null;
    }

    // Branch on the variant (design D5): a photo logs EVERY held item, a text logs the one food.
    if (pending.variant === 'photo') {
      return expirePlateEstimate(prisma, userId, pending);
    }

    const fallback = { ...pending.resolved, source: FoodSource.estimate, foodDbId: null };
    const row = await writeFoodLog(prisma, userId, fallback, pending.date, pending.meal);

    return buildConfirmation(pending.parsed.product, row);
  },
});
