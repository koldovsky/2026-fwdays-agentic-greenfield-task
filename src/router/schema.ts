import { z } from 'zod';

// The six FR-1 intents (requirements §8.0). English literals regardless of message language (#6).
export const ALL_INTENTS = [
  'log',
  'query',
  'metric',
  'review_trigger',
  'correction',
  'answer',
] as const;

export type Intent = (typeof ALL_INTENTS)[number];

/**
 * Build the structured-output schema. `answer` is only a valid intent when an open question is
 * pending (requirements §8.0); when none is, it is removed from the enum so the constrained output
 * cannot return it — the model falls back to another intent (the ephemeral mechanic lands in
 * `clarify`). `date` is a TOKEN the model proposes (today/yesterday/explicit); the concrete calendar
 * date is resolved in code (src/router/date.ts), never by the model.
 */
export type RouterSchema = z.ZodObject<{
  intent: z.ZodEnum<[Intent, ...Intent[]]>;
  date: z.ZodString;
  product: z.ZodOptional<z.ZodString>;
  quantity: z.ZodOptional<z.ZodNumber>;
  unit: z.ZodOptional<z.ZodString>;
}>;

export const makeRouterSchema = (allowAnswer: boolean): RouterSchema => {
  const values = (
    allowAnswer ? ALL_INTENTS : ALL_INTENTS.filter((intent) => intent !== 'answer')
  ) as [Intent, ...Intent[]];

  return z.object({
    intent: z.enum(values),
    date: z.string().describe("one of 'today', 'yesterday', or an explicit YYYY-MM-DD date"),
    product: z.string().optional(),
    quantity: z.number().optional(),
    unit: z.string().optional(),
  });
};

export type RouterOutput = z.infer<RouterSchema>;
