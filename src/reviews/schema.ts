import { z } from 'zod';

// Prose-ONLY structured-output schemas (invariant #2): NO numeric fields, so a review's numbers can
// never come from the model — they are rendered in code and the prose is spliced into separate slots.
// Daily gets drivers + verdict; weekly/monthly get whatWorked + draggedBack + focus (design D2).

export const dailyProseSchema = z.object({
  drivers: z
    .string()
    .describe(
      'the concrete culprit when a macro is notably off (e.g. cooking oil, fatty dairy), else "—"',
    ),
  verdict: z
    .string()
    .describe(
      '1–2 honest lines: on track / what to fix tomorrow. Never cheerleading; flag extreme deficits as a problem',
    ),
});

export const rollupProseSchema = z.object({
  whatWorked: z.string().describe('1–2 lines on what worked this period'),
  draggedBack: z.string().describe('1–2 lines on recurring drivers that dragged progress back'),
  focus: z.string().describe('1–2 concrete adjustments to focus on next period'),
});

export type DailyProse = z.infer<typeof dailyProseSchema>;
export type RollupProse = z.infer<typeof rollupProseSchema>;
