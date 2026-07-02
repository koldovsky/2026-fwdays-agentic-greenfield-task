import type Anthropic from '@anthropic-ai/sdk';
import { parseStructured } from '../llm/structured.js';
import { makeRouterSchema, type RouterOutput } from './schema.js';
import { resolveDate } from './date.js';

// Same shape as RouterOutput, but `date` now holds the RESOLVED calendar date (user TZ), not the token.
export type RoutedMessage = RouterOutput;

export interface ClassifyOptions {
  userTz: string;
  now?: Date;
  /** Only when true is `answer` a selectable intent (an open question is pending — §8.0). */
  hasPendingQuestion?: boolean;
}

/**
 * Classify one inbound message (FR-1, §8.0): a single Sonnet call (no chat history beyond the
 * current message — invariant #1) → intent + fields, with the date resolved in code against the
 * user's timezone. The `answer` intent is excluded from the schema unless a question is pending.
 */
export const classifyMessage = async (
  client: Anthropic,
  text: string,
  opts: ClassifyOptions,
): Promise<RoutedMessage> => {
  const schema = makeRouterSchema(opts.hasPendingQuestion ?? false);
  const { data } = await parseStructured(client, schema, text, { label: 'router-intent' });
  const date = resolveDate(data.date, opts.userTz, opts.now ?? new Date());

  return { ...data, date };
};
