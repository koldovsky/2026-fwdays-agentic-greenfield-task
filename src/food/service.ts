import type Anthropic from '@anthropic-ai/sdk';
import { saveLoggedFoodToCatalog } from './addToCatalog.js';
import { buildConfirmation, noProductReply } from './confirm.js';
import { inferMeal } from './meal.js';
import { resolveFood } from './resolve.js';
import { writeFoodLog } from './write.js';
import type {
  CatalogResult,
  Confirmation,
  FoodClient,
  FoodService,
  ParsedFood,
  RoutedLog,
} from './types.js';

// Food-logging service (US-2, §8.2): orchestration only — resolve → infer meal → write → confirm.
// All SQL lives in the lookup/write/catalog modules behind the tenancy choke-point (invariant #8).
// `now` is injectable so meal inference is deterministic under test.

export const createFoodService = (
  prisma: FoodClient,
  anthropic: Anthropic,
  userTz: string,
  now: () => Date = () => new Date(),
): FoodService => ({
  async logFood(chatId: bigint, text: string, routed: RoutedLog): Promise<Confirmation | null> {
    const user = await prisma.user.findUnique({ where: { chatId }, select: { id: true } });
    if (!user) {
      return null;
    }
    if (!routed.product) {
      return noProductReply(text);
    }

    const parsed: ParsedFood = {
      product: routed.product,
      qty: routed.quantity, // undefined → reconcileQty defaults to one serving of the resolved basis
      unit: routed.unit ?? '',
    };
    const resolved = await resolveFood(prisma, anthropic, user.id, parsed);
    const meal = inferMeal(now(), userTz);
    const row = await writeFoodLog(prisma, user.id, resolved, routed.date, meal);

    return buildConfirmation(text, row);
  },

  async saveToCatalog(chatId: bigint, foodLogId: number): Promise<CatalogResult> {
    const user = await prisma.user.findUnique({ where: { chatId }, select: { id: true } });
    if (!user) {
      return { saved: false, entryName: null };
    }

    return saveLoggedFoodToCatalog(prisma, user.id, foodLogId);
  },
});
