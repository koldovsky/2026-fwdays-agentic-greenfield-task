import type Anthropic from '@anthropic-ai/sdk';
import { FoodSource } from '@prisma/client';
import { decideAskOrLog } from '../clarify/decide.js';
import { buildQuestion } from '../clarify/question.js';
import { resolveAnswer } from '../clarify/resolve.js';
import type { LogOutcome, OpenQuestion } from '../clarify/types.js';
import { saveLoggedFoodToCatalog } from './addToCatalog.js';
import { buildConfirmation, noProductReply } from './confirm.js';
import { correctLast } from './correct.js';
import { inferMeal } from './meal.js';
import { resolveForLog } from './resolve.js';
import { writeFoodLog } from './write.js';
import type {
  CatalogResult,
  Confirmation,
  FoodClient,
  FoodService,
  ParsedFood,
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

    // Meal comes from the pending question (captured at ask time), not re-inferred now — see logFood.
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

    const fallback = { ...pending.resolved, source: FoodSource.estimate, foodDbId: null };
    const row = await writeFoodLog(prisma, userId, fallback, pending.date, pending.meal);

    return buildConfirmation(pending.parsed.product, row);
  },
});
