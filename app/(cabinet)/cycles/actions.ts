"use server";
// @trace FR-CYCLE-01 FR-CYCLE-02 FR-CYCLE-03

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { makeCreateCycleInputSchema } from "@/lib/schemas/cycle";
import { buildTemplateSnapshot } from "@/lib/cycles/snapshot";
import { generateCycleToken } from "@/lib/cycles/link-token";
import { getCurrentHrUser } from "@/app/(cabinet)/current-user";
import { uk } from "@/lib/i18n/uk";
import { z } from "zod";

/**
 * Create-cycle action result — typed, never a raw throw (TC-VALID-01).
 * Field errors are keyed by form field name for inline rendering.
 */
export type CreateCycleResult =
  | { ok: true; id: string }
  | { ok: false; fieldErrors: Record<string, string[]>; error?: string };

/** Map a ZodError to `{ fieldName: [messages] }`. */
function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "_");
    if (out[field] === undefined) {
      out[field] = [];
    }
    out[field].push(issue.message);
  }
  return out;
}

/** True when the throw is a Prisma unique-constraint violation. */
function isPrismaP2002(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

/**
 * Create a new assessment cycle (FR-CYCLE-01, FR-CYCLE-02, FR-CYCLE-03).
 * 1. Assert HR session (defense-in-depth).
 * 2. Validate form data with Zod.
 * 3. Verify template + subject exist and subject is not archived.
 * 4. In a DB transaction: build + validate the template snapshot; mint a unique
 *    token (retry on P2002 token collision up to 5 times); create the cycle.
 * Returns { ok: true, id } or { ok: false, fieldErrors, error? } — never throws.
 */
export async function createCycle(formData: FormData): Promise<CreateCycleResult> {
  // 1. Auth guard
  const hrUser = await getCurrentHrUser();
  if (hrUser === null) {
    return { ok: false, fieldErrors: {}, error: uk.auth.genericError };
  }

  // 2. Parse + validate input
  const raw = {
    templateId: String(formData.get("templateId") ?? ""),
    subjectId: String(formData.get("subjectId") ?? ""),
    deadline: String(formData.get("deadline") ?? ""),
  };

  const todayISO = new Date().toISOString().slice(0, 10);
  const parsed = makeCreateCycleInputSchema(todayISO).safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const input = parsed.data;

  try {
    // 3. Load template + subject
    const [template, subject] = await Promise.all([
      db.template.findUnique({
        where: { id: input.templateId },
        include: { questions: true },
      }),
      db.employee.findUnique({
        where: { id: input.subjectId },
        select: { id: true, archived: true },
      }),
    ]);

    if (template === null) {
      return {
        ok: false,
        fieldErrors: { templateId: [uk.cycles.templateNotFound] },
      };
    }

    if (subject === null) {
      return {
        ok: false,
        fieldErrors: { subjectId: [uk.cycles.subjectNotFound] },
      };
    }

    if (subject.archived) {
      return {
        ok: false,
        fieldErrors: { subjectId: [uk.cycles.subjectArchived] },
      };
    }

    // 4. Build snapshot (pure, outside DB) + mint unique token with retry.
    // The retry loop must be OUTSIDE the transaction: on PostgreSQL a constraint
    // violation transitions the connection into ABORT state, so a subsequent
    // create inside the same transaction callback would always fail. Each attempt
    // is an independent db.cycle.create (single-row creates are atomic by default).
    const snapshot = buildTemplateSnapshot({
      name: template.name,
      methodology: template.methodology,
      questions: template.questions.map((q) => ({
        id: q.id,
        order: q.order,
        text: q.text,
        type: q.type,
        required: q.required,
        anchors: q.anchors,
      })),
    });

    const MAX_RETRIES = 5;
    let lastError: unknown;
    let cycleId: string | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES && cycleId === null; attempt += 1) {
      const token = generateCycleToken();
      try {
        const cycle = await db.cycle.create({
          data: {
            token,
            status: "collecting",
            deadline: new Date(input.deadline),
            subjectId: input.subjectId,
            templateId: input.templateId,
            templateSnapshot: snapshot,
          },
          select: { id: true },
        });
        cycleId = cycle.id;
      } catch (err) {
        if (isPrismaP2002(err)) {
          lastError = err;
          // Retry with a fresh token on the rare collision
        } else {
          throw err;
        }
      }
    }

    if (cycleId === null) throw lastError;

    revalidatePath("/cycles");
    return { ok: true, id: cycleId };
  } catch {
    return { ok: false, fieldErrors: {}, error: uk.cycles.createFailed };
  }
}

/** True when the throw is Prisma's "record to delete does not exist". */
function isPrismaP2025(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025"
  );
}

const deleteCycleInputSchema = z.object({ cycleId: z.string().min(1).max(60) });

export type DeleteCycleResult = { ok: true } | { ok: false; error: string };

/**
 * Delete a cycle in any status, HR-only (FR-CYCLE-06). The dependent rows
 * (response + answers, dialog, summary, usage) are removed by the schema's
 * onDelete: Cascade, so no orphans remain, and only the targeted cycle id is
 * affected. Never throws: a missing/already-deleted cycle resolves calmly as
 * success (it is gone, which is the desired end state); any other failure
 * returns a typed error. The caller confirms before invoking and redirects to
 * the cycles list on success.
 */
export async function deleteCycle(input: unknown): Promise<DeleteCycleResult> {
  const hrUser = await getCurrentHrUser();
  if (hrUser === null) return { ok: false, error: uk.cycles.deleteFailed };

  const parsed = deleteCycleInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: uk.cycles.deleteFailed };

  try {
    await db.cycle.delete({ where: { id: parsed.data.cycleId } });
    revalidatePath("/cycles");
    return { ok: true };
  } catch (error) {
    // Already gone is the desired end state — treat as success (idempotent).
    if (isPrismaP2025(error)) {
      revalidatePath("/cycles");
      return { ok: true };
    }
    console.error("[cycles] deleteCycle failed", error);
    return { ok: false, error: uk.cycles.deleteFailed };
  }
}
