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
