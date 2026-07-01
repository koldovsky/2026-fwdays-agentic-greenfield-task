import { nullableNumber } from '../util/num.js';
import { buildAnswer } from './answer.js';
import { sumForDate } from './aggregate.js';
import { parseAsk } from './parseAsk.js';
import type { QueryAnswer, QueryClient, QueryService, RoutedQuery, Targets } from './types.js';

// Nutrition-query service (US-4): orchestration only — resolve user + targets from chat_id (tenancy)
// → parse the asked nutrient(s) → aggregate the day's SUM → render the answer. No inline SQL outside
// aggregate.ts; no LLM call on this path (invariant #5).

export const createQueryService = (client: QueryClient): QueryService => ({
  async answerQuery(
    chatId: bigint,
    text: string,
    routed: RoutedQuery,
  ): Promise<QueryAnswer | null> {
    const user = await client.user.findUnique({
      where: { chatId },
      select: {
        id: true,
        targetKcal: true,
        targetProteinG: true,
        targetFatG: true,
        targetCarbsG: true,
      },
    });
    if (!user) {
      return null;
    }

    const targets: Targets = {
      kcal: user.targetKcal,
      proteinG: nullableNumber(user.targetProteinG),
      fatG: nullableNumber(user.targetFatG),
      carbsG: nullableNumber(user.targetCarbsG),
    };

    const asked = parseAsk(text);
    const totals = await sumForDate(client, user.id, routed.date);

    return buildAnswer(text, totals, targets, asked);
  },
});
