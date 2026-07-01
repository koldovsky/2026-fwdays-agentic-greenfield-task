import { toDbDate } from '../util/date.js';
import { buildConfirmation, noMetricsReply } from './confirm.js';
import { parseMetrics } from './parse.js';
import { computeDeltas, priorHistory } from './trend.js';
import { upsertMetrics } from './write.js';
import type { MetricConfirmation, MetricsClient, MetricsService, RoutedMetric } from './types.js';

// Body-metrics service (US-7): orchestration only — parse → (nudge if empty) → fetch prior history
// once → upsert → compute deltas off the SAME history → confirm. No inline SQL; never logs raw body
// values (invariant #9 — body data is sensitive). Deterministic: no LLM call on this path (#5).

export const createMetricsService = (client: MetricsClient): MetricsService => ({
  async logMetric(
    chatId: bigint,
    text: string,
    routed: RoutedMetric,
  ): Promise<MetricConfirmation | null> {
    const user = await client.user.findUnique({ where: { chatId }, select: { id: true } });
    if (!user) {
      return null;
    }

    const parsed = parseMetrics(text);
    if (Object.keys(parsed).length === 0) {
      return noMetricsReply(text);
    }

    const history = await priorHistory(client, user.id, toDbDate(routed.date));
    await upsertMetrics(client, user.id, routed.date, parsed);
    const deltas = computeDeltas(parsed, history);

    return buildConfirmation(text, deltas);
  },
});
