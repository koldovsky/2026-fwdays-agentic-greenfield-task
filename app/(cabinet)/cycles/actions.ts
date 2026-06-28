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
import type { z } from "zod";

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

    // 4. Transaction: build snapshot + mint token + create cycle
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

    const cycleId = await db.$transaction(async (tx) => {
      const MAX_RETRIES = 5;
      let lastError: unknown;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
        const token = generateCycleToken();
        try {
          const cycle = await tx.cycle.create({
            data: {
              token,
              status: "collecting",
              deadline: new Date(input.deadline),
              subjectId: input.subjectId,
              templateId: input.templateId,
              templateSnapshot: snapshot,
            },
          });
          return cycle.id;
        } catch (err) {
          if (isPrismaP2002(err)) {
            lastError = err;
            // Retry with a fresh token
          } else {
            throw err;
          }
        }
      }

      // All 5 retries exhausted
      throw lastError;
    });

    revalidatePath("/cycles");
    return { ok: true, id: cycleId };
  } catch {
    return { ok: false, fieldErrors: {}, error: uk.cycles.createFailed };
  }
}
