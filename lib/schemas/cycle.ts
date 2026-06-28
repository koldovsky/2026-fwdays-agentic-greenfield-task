// @trace FR-CYCLE-01
import { z } from "zod";

/**
 * Cycle creation input schema — factory pattern so `todayISO` is injected for
 * deterministic, wall-clock-independent validation in tests (TC-PURE-01).
 *
 * Rules:
 *   templateId / subjectId — non-empty, max 128 chars
 *   deadline — strict ISO YYYY-MM-DD; strictly after today; at most 365 days ahead
 *
 * Framework-free: no next/*, no react, no DOM.
 */

const ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** True when the string is a real calendar date (e.g. rejects 2026-02-30). */
function isRealDate(value: string): boolean {
  const d = new Date(value);
  return !isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

/** Parse an ISO date string into ms-since-epoch for comparison (midnight UTC). */
function isoToMs(iso: string): number {
  return new Date(iso).getTime();
}

/**
 * Factory that returns a Zod schema with deadline rules anchored to `todayISO`.
 * Call once per server-action invocation with the real UTC date; call with a
 * fixed date in tests.
 */
export function makeCreateCycleInputSchema(todayISO: string) {
  const todayMs = isoToMs(todayISO);
  const maxMs = todayMs + 365 * 86_400_000;

  return z.object({
    templateId: z.string().min(1).max(128),
    subjectId: z.string().min(1).max(128),
    deadline: z
      .string()
      .regex(ISO_REGEX, "Формат дати: РРРР-ММ-ДД")
      .refine(isRealDate, { message: "Формат дати: РРРР-ММ-ДД" })
      .refine((v) => isoToMs(v) > todayMs, {
        message: "Дедлайн має бути в майбутньому",
      })
      .refine((v) => isoToMs(v) <= maxMs, {
        message: "Дедлайн не може бути більше ніж 365 днів",
      }),
  });
}

/**
 * Exported type via a static-shape dummy instantiation so callers get the
 * inferred type without needing to call the factory at type-level.
 */
export type CreateCycleInput = z.infer<ReturnType<typeof makeCreateCycleInputSchema>>;
