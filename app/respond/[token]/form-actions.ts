"use server";
// @trace FR-FORM-03 FR-FORM-04 TC-VALID-01 NFR-SEC-01

import { z } from "zod";
import { db } from "@/lib/db";
import { uk } from "@/lib/i18n/uk";
import { tokenBoundarySchema } from "./schemas";
import { answerInputSchema, isValidAnchorValue } from "@/lib/schemas/answer";
import { snapshotSchema } from "@/lib/cycles/snapshot";
import { isResponseComplete } from "@/lib/cycles/status";

const t = uk.respondent;

const saveAnswerInputSchema = z.object({
  token: tokenBoundarySchema,
  answer: answerInputSchema,
});

type SaveAnswerResult =
  | { ok: true; done: boolean }
  | { ok: false; error: string };

/**
 * Autosave one answer for the respondent's form-mode session (FR-FORM-03,
 * FR-FORM-04). Design authority: openspec/changes/add-form/design.md,
 * "Prisma upsert pattern for Answer" and "How Cycle.status transitions to
 * done". Never throws — every failure path returns `{ ok: false, error }`;
 * a thrown DB error is caught and surfaced as a generic message, never a
 * raw 500.
 */
export async function saveAnswer(input: unknown): Promise<SaveAnswerResult> {
  const parseResult = saveAnswerInputSchema.safeParse(input);
  if (!parseResult.success) {
    return { ok: false, error: t.formSaveFailed };
  }

  const { token, answer } = parseResult.data;

  try {
    const cycle = await db.cycle.findUnique({
      where: { token },
      select: { id: true, status: true, mode: true, templateSnapshot: true },
    });

    if (cycle === null) {
      return { ok: false, error: t.notFound };
    }

    if (cycle.status !== "collecting") {
      return { ok: false, error: t.modeChoiceClosed };
    }

    // Mode guard: saveAnswer is scoped to form-mode only. An interview-mode
    // respondent who calls this action directly would corrupt answer data
    // that the AI conversation has not yet elicited.
    if (cycle.mode !== "form") {
      return { ok: false, error: t.formSaveFailed };
    }

    const snapshotResult = snapshotSchema.safeParse(cycle.templateSnapshot);
    if (!snapshotResult.success) {
      return { ok: false, error: t.formSaveFailed };
    }

    const snapshot = snapshotResult.data;

    // Cross-cycle-write defense: the question is looked up in THIS cycle's
    // OWN snapshot, never trusted from the client beyond its id string.
    const question = snapshot.questions.find((candidate) => candidate.id === answer.questionId);
    if (question === undefined) {
      return { ok: false, error: t.formSaveFailed };
    }

    // Type-mismatch defense: the client's discriminant must match the
    // snapshot question's own type, not merely be a well-formed payload.
    if (question.type !== answer.type) {
      return { ok: false, error: t.formSaveFailed };
    }

    // Server-side required guard: an open answer of empty/whitespace is
    // rejected before any DB write, even if the client bypassed the UI gate.
    if (answer.type === "open" && answer.text.trim().length === 0) {
      return { ok: false, error: t.formRequiredMissing };
    }

    if (answer.type === "scale" && question.type === "scale") {
      if (!isValidAnchorValue(answer.value, question.anchors)) {
        return { ok: false, error: t.formSaveFailed };
      }
    }

    // Lazy Response creation — sequential awaits, not a $transaction: the
    // Response upsert is idempotent on the unique cycleId, so a transaction
    // is a defensive nicety, not a correctness requirement (design.md). Both
    // writes must succeed before the completion re-check below proceeds.
    const response = await db.response.upsert({
      where: { cycleId: cycle.id },
      create: { cycleId: cycle.id },
      update: {},
      select: { id: true },
    });

    await db.answer.upsert({
      where: {
        responseId_questionId: { responseId: response.id, questionId: answer.questionId },
      },
      create: {
        responseId: response.id,
        questionId: answer.questionId,
        ...(answer.type === "scale"
          ? { scaleValue: answer.value }
          : { text: answer.text }),
      },
      update:
        answer.type === "scale"
          ? { scaleValue: answer.value, text: null }
          : { text: answer.text, scaleValue: null },
    });

    // Completion re-check (design.md "How Cycle.status transitions to
    // done"): re-read the FULL saved answer set for this response, since
    // this action only received ONE question's answer in its input.
    const answerRows = await db.answer.findMany({
      where: { responseId: response.id },
      select: { questionId: true, scaleValue: true, text: true },
    });

    const fullAnswersRecord: Record<string, number | string> = {};
    for (const row of answerRows) {
      if (row.scaleValue !== null) {
        fullAnswersRecord[row.questionId] = row.scaleValue;
      } else if (row.text !== null) {
        fullAnswersRecord[row.questionId] = row.text;
      }
    }

    const complete = isResponseComplete(snapshot, fullAnswersRecord);

    if (complete) {
      // updateMany with status condition mirrors the first-write-wins pattern
      // in chooseMode (actions.ts): if a concurrent expiry job has already
      // transitioned this cycle away from "collecting", the update is a
      // no-op rather than silently overwriting the later status.
      await db.cycle.updateMany({
        where: { id: cycle.id, status: "collecting" },
        data: { status: "done" },
      });
    }

    return { ok: true, done: complete };
  } catch {
    return { ok: false, error: t.formSaveFailed };
  }
}
