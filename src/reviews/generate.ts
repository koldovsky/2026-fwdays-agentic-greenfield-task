import type Anthropic from '@anthropic-ai/sdk';
import { parseStructured } from '../llm/structured.js';
import { dailyProseSchema, rollupProseSchema } from './schema.js';
import type { ReviewPeriod, ReviewProse } from './types.js';

// The single LLM call per review (invariant #5, no agent loop): the pre-serialized numbers +
// language instruction ride in `promptText`; the cached coach persona rides in the shared system
// prefix (never re-added here). The model returns ONLY prose slots — the numbers are already rendered
// in code, so a stray number in the prose cannot corrupt any total (invariant #2).

export const generateReviewProse = async (
  anthropic: Anthropic,
  period: ReviewPeriod,
  promptText: string,
): Promise<ReviewProse> => {
  if (period === 'daily') {
    const { data } = await parseStructured(anthropic, dailyProseSchema, promptText, {
      label: 'review-daily',
    });
    return { drivers: data.drivers, verdict: data.verdict };
  }

  const { data } = await parseStructured(anthropic, rollupProseSchema, promptText, {
    label: 'review-rollup',
  });
  return { whatWorked: data.whatWorked, draggedBack: data.draggedBack, focus: data.focus };
};
