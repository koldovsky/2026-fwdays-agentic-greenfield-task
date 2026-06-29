"use server";
// @trace FR-REPORT-01 FR-REPORT-02 FR-REPORT-03 NFR-COST-01 NFR-SEC-01

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { uk } from "@/lib/i18n/uk";
import { getCurrentHrUser } from "@/app/(cabinet)/current-user";
import { snapshotSchema } from "@/lib/cycles/snapshot";
import { summarise } from "@/lib/ai/summary/summarise";
import { MAX_ANSWER_CHARS_IN_PROMPT } from "@/lib/ai/summary/prompts";
import { validateSummaryGrounding } from "@/lib/ai/summary/schema";
import { recordUsage } from "@/lib/ai/record-usage";

const t = uk.cycles.report;

const inputSchema = z.object({ cycleId: z.string().min(1).max(60) });

type DraftResult = { ok: true } | { ok: false; error: string };

/**
 * In-process single-flight guard (FR-REPORT-01): prevents a second model call
 * for a cycle whose draft is already running in THIS server instance. Combined
 * with the unique `Summary.cycleId` constraint, at most one summary is ever
 * persisted even across instances (the loser's insert hits P2002). The
 * cross-instance "no second model call" guarantee is noted in the QA backlog.
 */
const inFlight = new Set<string>();

/**
 * Draft the AI summary for a `done` cycle, once, on explicit HR action
 * (FR-REPORT-01..03). HR-auth required; refused for non-`done` cycles and for a
 * cycle that already has a stored summary (read-only, no re-draft). The
 * summariser sees only this cycle's answers + questions + a first name
 * (BC-PRIVACY-04); the result is shape-validated and grounding-checked (quotes
 * attributed by snapshot questionId and verbatim) before persisting — malformed
 * or ungrounded output is rejected with no summary stored. Never throws.
 */
export async function draftSummary(input: unknown): Promise<DraftResult> {
  const hrUser = await getCurrentHrUser();
  if (hrUser === null) return { ok: false, error: t.draftFailed };

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.draftFailed };
  const { cycleId } = parsed.data;

  const cycle = await db.cycle.findUnique({
    where: { id: cycleId },
    select: {
      status: true,
      templateSnapshot: true,
      subject: { select: { fullName: true } },
      summary: { select: { id: true } },
      response: {
        select: { answers: { select: { questionId: true, scaleValue: true, text: true } } },
      },
    },
  });

  if (cycle === null) return { ok: false, error: t.draftFailed };
  if (cycle.status !== "done") return { ok: false, error: t.draftOnlyDone };
  if (cycle.summary !== null) return { ok: false, error: t.alreadyDrafted };

  const snapshotResult = snapshotSchema.safeParse(cycle.templateSnapshot);
  if (!snapshotResult.success) return { ok: false, error: t.draftFailed };
  const snapshot = snapshotResult.data;

  if (inFlight.has(cycleId)) return { ok: false, error: t.draftInFlight };
  inFlight.add(cycleId);
  try {
    // Build the prompt answers (scale rendered for context) and the grounding
    // answers (open text only — the verbatim source quotes must match).
    const rows = cycle.response?.answers ?? [];
    const promptAnswers: Record<string, string> = {};
    const groundingAnswers: Record<string, string> = {};
    for (const row of rows) {
      const question = snapshot.questions.find((q) => q.id === row.questionId);
      if (question === undefined) continue;
      if (question.type === "scale" && row.scaleValue !== null) {
        const label = question.anchors.find((a) => a.value === row.scaleValue)?.label ?? "";
        promptAnswers[row.questionId] = label.length > 0 ? `${row.scaleValue} — ${label}` : String(row.scaleValue);
      } else if (question.type === "open" && row.text !== null && row.text.trim().length > 0) {
        // Ground against the SAME text the model is shown (the prompt truncates
        // to this cap), so a quote can only be validated against text the model
        // actually received — never text beyond the truncation point.
        const text =
          row.text.length <= MAX_ANSWER_CHARS_IN_PROMPT
            ? row.text
            : row.text.slice(0, MAX_ANSWER_CHARS_IN_PROMPT);
        promptAnswers[row.questionId] = text;
        groundingAnswers[row.questionId] = text;
      }
    }

    const firstWord = cycle.subject.fullName.split(" ")[0];
    const subjectFirstName = firstWord !== undefined && firstWord.length > 0 ? firstWord : null;

    const result = await summarise({ questions: snapshot.questions, answersById: promptAnswers, subjectFirstName });
    if (result === null) return { ok: false, error: t.draftFailed };

    const validIds = new Set(snapshot.questions.map((q) => q.id));
    const grounding = validateSummaryGrounding(result.summary, validIds, groundingAnswers);
    if (!grounding.ok) {
      console.warn(`[report] grounding rejected for cycle ${cycleId}: ${grounding.reason}`);
      return { ok: false, error: t.draftFailed };
    }

    try {
      await db.summary.create({
        data: { cycleId, model: result.model, content: result.summary },
      });
    } catch (error) {
      // Lost the persist race — another draft already stored a summary.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return { ok: false, error: t.alreadyDrafted };
      }
      throw error;
    }

    try {
      await recordUsage({
        cycleId,
        purpose: "summary",
        model: result.model,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
      });
    } catch (usageError) {
      console.error("[report] failed to record summary usage", usageError);
    }

    return { ok: true };
  } catch (error) {
    console.error("[report] draftSummary failed", error);
    return { ok: false, error: t.draftFailed };
  } finally {
    inFlight.delete(cycleId);
  }
}
