"use server";
// @trace FR-RESP-02

import { z } from "zod";
import { db } from "@/lib/db";
import { uk } from "@/lib/i18n/uk";
import { tokenBoundarySchema } from "./schemas";

const t = uk.respondent;

const chooseModeInputSchema = z.object({
  token: tokenBoundarySchema,
  mode: z.enum(["form", "interview"]),
});

type ChooseModeResult =
  | { ok: true; mode: "form" | "interview" }
  | { ok: false; error: string };

/**
 * Persist the respondent's mode choice for a cycle, race-safely
 * (FR-RESP-02). First-write-wins via a conditional `updateMany` guarded by
 * `WHERE mode IS NULL` (design Decision 1) — the loser of a concurrent race
 * re-reads and reports the winner's mode rather than its own, never an
 * error. Never throws; every failure path returns `{ ok: false, error }`.
 */
export async function chooseMode(input: unknown): Promise<ChooseModeResult> {
  const parseResult = chooseModeInputSchema.safeParse(input);
  if (!parseResult.success) {
    return { ok: false, error: t.modeChoiceFailed };
  }

  const { token, mode } = parseResult.data;

  const cycle = await db.cycle.findUnique({
    where: { token },
    select: { id: true, status: true },
  });

  if (cycle === null) {
    return { ok: false, error: t.notFound };
  }

  if (cycle.status !== "collecting") {
    return { ok: false, error: t.modeChoiceClosed };
  }

  const result = await db.cycle.updateMany({
    where: { id: cycle.id, mode: null, status: "collecting" },
    data: { mode },
  });

  if (result.count === 1) {
    return { ok: true, mode };
  }

  // Lost the race — re-read to discover which mode actually won.
  const winner = await db.cycle.findUnique({
    where: { id: cycle.id },
    select: { mode: true },
  });

  if (winner === null || winner.mode === null) {
    return { ok: false, error: t.modeChoiceFailed };
  }

  return { ok: true, mode: winner.mode };
}

const fallbackInputSchema = z.object({ token: tokenBoundarySchema });

type FallbackResult = { ok: true } | { ok: false; error: string };

/**
 * Switch a collecting interview-mode cycle to form mode when the AI interviewer
 * is unavailable (FR-AI-07). A deliberate later transition, distinct from the
 * first-write-wins `chooseMode`: it only ever moves `interview` → `form`, never
 * the reverse, and only while collecting. Already-recorded interview answers
 * live in the shared Answer model, so the form resumes from them seamlessly.
 * Never throws; every failure path returns `{ ok: false, error }`.
 */
export async function fallbackToForm(input: unknown): Promise<FallbackResult> {
  const parseResult = fallbackInputSchema.safeParse(input);
  if (!parseResult.success) return { ok: false, error: t.modeChoiceFailed };

  try {
    const result = await db.cycle.updateMany({
      where: { token: parseResult.data.token, status: "collecting", mode: "interview" },
      data: { mode: "form" },
    });
    if (result.count === 1) return { ok: true };
    // Either the cycle is gone, no longer collecting, or already in form mode.
    // A cycle already in form mode is the desired end state, so treat a found
    // form-mode cycle as success; otherwise decline calmly.
    const cycle = await db.cycle.findUnique({
      where: { token: parseResult.data.token },
      select: { status: true, mode: true },
    });
    if (cycle !== null && cycle.status === "collecting" && cycle.mode === "form") {
      return { ok: true };
    }
    return { ok: false, error: t.modeChoiceFailed };
  } catch {
    return { ok: false, error: t.modeChoiceFailed };
  }
}
