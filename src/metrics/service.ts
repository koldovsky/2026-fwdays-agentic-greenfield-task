import { resolveUserId } from '../db/resolveUser.js';
import { noopOutbox } from '../notion/outbox.js';
import type { NotionOutbox } from '../notion/types.js';
import { toDbDate } from '../util/date.js';
import { buildConfirmation, noMetricsReply } from './confirm.js';
import { parseMetrics } from './parse.js';
import { computeDeltas, priorHistory } from './trend.js';
import { upsertMetrics } from './write.js';
import type { MetricConfirmation, MetricsClient, MetricsService, RoutedMetric } from './types.js';

// Body-metrics service (US-7): orchestration only — parse → (nudge if empty) → fetch prior history
// once → upsert → compute deltas off the SAME history → confirm. No inline SQL; never logs raw body
// values (invariant #9 — body data is sensitive). Deterministic: no LLM call on this path (#5). The
// mirror enqueue is best-effort and post-write (US-10): it never throws (noopOutbox when mirror off).

export const createMetricsService = (
  client: MetricsClient,
  outbox: NotionOutbox = noopOutbox,
): MetricsService => ({
  async logMetric(
    chatId: bigint,
    text: string,
    routed: RoutedMetric,
  ): Promise<MetricConfirmation | null> {
    const userId = await resolveUserId(client, chatId);
    if (userId === null) {
      return null;
    }

    const parsed = parseMetrics(text);
    if (Object.keys(parsed).length === 0) {
      return noMetricsReply(text);
    }

    const history = await priorHistory(client, userId, toDbDate(routed.date));
    const row = await upsertMetrics(client, userId, routed.date, parsed);
    await outbox.enqueue({ sourceTable: 'body_metrics', sourceId: row.id, userId });
    const deltas = computeDeltas(parsed, history);

    return buildConfirmation(text, deltas);
  },
});
