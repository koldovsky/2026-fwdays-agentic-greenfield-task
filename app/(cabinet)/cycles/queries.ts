// @trace FR-CYCLE-05 FR-PROGRESS-01 FR-PROGRESS-02 FR-PROGRESS-03
import "server-only";

import { db } from "@/lib/db";
import { deriveStatus, daysRemaining } from "@/lib/cycles/status";
import { snapshotSchema } from "@/lib/cycles/snapshot";
import { computeProgress } from "@/lib/cycles/progress";
import { interviewTranscriptSchema } from "@/lib/ai/interview/transcript";
import { summaryShapeSchema, type SummaryShape } from "@/lib/ai/summary/schema";

/**
 * Flatten Answer rows into the `Record<questionId, number | string>` shape the
 * progress/validity helpers expect: scale → its anchor value, open → its text.
 * A capped-out interview row with a null scale value is omitted (so it does not
 * count as answered); an empty open string maps to "" (which fails the trim
 * check). Shared by the list and detail queries (FR-PROGRESS-01).
 */
function toAnswersRecord(
  rows: ReadonlyArray<{ questionId: string; scaleValue: number | null; text: string | null }>,
): Record<string, number | string> {
  const record: Record<string, number | string> = {};
  for (const row of rows) {
    if (row.scaleValue !== null) record[row.questionId] = row.scaleValue;
    else if (row.text !== null) record[row.questionId] = row.text;
  }
  return record;
}

/**
 * List all cycles, enriched with derived status, days remaining, and
 * answered/total progress (FR-CYCLE-05, FR-PROGRESS-01). "Answered" is the
 * count of REQUIRED questions holding a valid answer — computed from the actual
 * answer rows, NOT a raw Answer row count (which would miscount optional and
 * capped-out insufficient rows). A fetch failure throws and is caught by the
 * cabinet error.tsx boundary — never a raw 500. Snapshot parse failures degrade
 * gracefully (null snapshot, logged server-side).
 */
export async function listCycles() {
  const cycles = await db.cycle.findMany({
    include: {
      subject: {
        select: { id: true, fullName: true, archived: true },
      },
      response: {
        select: {
          answers: { select: { questionId: true, scaleValue: true, text: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();

  return cycles.map((cycle) => {
    const snapshotResult = snapshotSchema.safeParse(cycle.templateSnapshot);
    if (!snapshotResult.success) {
      console.warn(
        `[cycles/queries] Cycle ${cycle.id} has an invalid templateSnapshot:`,
        snapshotResult.error.message,
      );
    }
    const snapshot = snapshotResult.success ? snapshotResult.data : null;

    // completedAt is not stored separately; use stored status "done" as the
    // proxy, and re-derive expired vs collecting from the deadline + now.
    const completedAt = cycle.status === "done" ? cycle.updatedAt : null;
    const status = deriveStatus(
      { completedAt, deadline: cycle.deadline },
      now,
    );
    const days = daysRemaining(cycle.deadline, now);
    const answersRecord = toAnswersRecord(cycle.response?.answers ?? []);
    const { answered, total } = snapshot
      ? computeProgress(snapshot, answersRecord)
      : { answered: 0, total: 0 };

    return {
      id: cycle.id,
      token: cycle.token,
      status,
      daysRemaining: days,
      deadline: cycle.deadline,
      createdAt: cycle.createdAt,
      subject: cycle.subject,
      snapshot,
      answered,
      total,
    };
  });
}

export type CycleListRow = Awaited<ReturnType<typeof listCycles>>[number];

/**
 * Load a single cycle by id for the detail page (FR-CYCLE-05). Returns null
 * when not found — callers render a calm not-found, never a 500.
 */
export async function getCycleById(id: string) {
  const cycle = await db.cycle.findUnique({
    where: { id },
    include: {
      subject: { select: { fullName: true } },
      template: { select: { name: true } },
    },
  });

  if (cycle === null) return null;

  const snapshotResult = snapshotSchema.safeParse(cycle.templateSnapshot);
  if (!snapshotResult.success) {
    console.warn(
      `[cycles/queries] Cycle ${cycle.id} has an invalid templateSnapshot:`,
      snapshotResult.error.message,
    );
  }
  const snapshot = snapshotResult.success ? snapshotResult.data : null;

  return {
    id: cycle.id,
    token: cycle.token,
    status: cycle.status,
    deadline: cycle.deadline,
    createdAt: cycle.createdAt,
    updatedAt: cycle.updatedAt,
    subject: cycle.subject,
    template: cycle.template,
    snapshot,
  };
}

export type CycleDetail = NonNullable<Awaited<ReturnType<typeof getCycleById>>>;

/** A single question's recorded answer for the HR results view. */
export type ResultAnswer = {
  scaleValue: number | null;
  text: string | null;
  insufficient: boolean;
  hasDialog: boolean;
};

/**
 * Load a cycle's full results for the HR detail screen (FR-PROGRESS-01..03):
 * the ordered snapshot questions, each question's recorded answer by type,
 * answered/total progress, and which questions have a raw AI dialog available
 * on demand. Returns null when the cycle is missing or its snapshot is corrupt
 * (calm not-found, never a 500). Server-only; HR-auth is enforced upstream.
 */
export async function getCycleResults(id: string) {
  const cycle = await db.cycle.findUnique({
    where: { id },
    select: {
      id: true,
      token: true,
      status: true,
      deadline: true,
      updatedAt: true,
      mode: true,
      templateSnapshot: true,
      subject: { select: { fullName: true } },
      response: {
        select: {
          answers: {
            select: { questionId: true, scaleValue: true, text: true, insufficient: true },
          },
        },
      },
      dialog: { select: { messages: true } },
    },
  });

  if (cycle === null) return null;

  const snapshotResult = snapshotSchema.safeParse(cycle.templateSnapshot);
  if (!snapshotResult.success) {
    console.warn(`[cycles/queries] Cycle ${id} has an invalid templateSnapshot`);
    return null;
  }
  const snapshot = snapshotResult.data;

  // Question ids that appear in the stored interview transcript — only these
  // offer a raw-dialog view, and only in interview mode (FR-PROGRESS-03).
  const dialogQuestionIds = new Set<string>();
  if (cycle.mode === "interview") {
    const transcript = interviewTranscriptSchema.safeParse(cycle.dialog?.messages ?? []);
    if (transcript.success) {
      for (const message of transcript.data) {
        if (message.questionId !== undefined) dialogQuestionIds.add(message.questionId);
      }
    }
  }

  const rows = cycle.response?.answers ?? [];
  const answers: Record<string, ResultAnswer> = {};
  for (const row of rows) {
    answers[row.questionId] = {
      scaleValue: row.scaleValue,
      text: row.text,
      insufficient: row.insufficient,
      hasDialog: dialogQuestionIds.has(row.questionId),
    };
  }

  const now = new Date();
  const completedAt = cycle.status === "done" ? cycle.updatedAt : null;

  return {
    id: cycle.id,
    token: cycle.token,
    subjectFullName: cycle.subject.fullName,
    methodology: snapshot.methodology,
    questions: snapshot.questions,
    deadline: cycle.deadline,
    daysRemaining: daysRemaining(cycle.deadline, now),
    status: deriveStatus({ completedAt, deadline: cycle.deadline }, now),
    mode: cycle.mode,
    progress: computeProgress(snapshot, toAnswersRecord(rows)),
    answers,
  };
}

export type CycleResults = NonNullable<Awaited<ReturnType<typeof getCycleResults>>>;

/**
 * Light progress-only read for the polling endpoint (FR-PROGRESS-01). Returns
 * null for a missing or corrupt-snapshot cycle so the endpoint can answer a
 * calm not-found.
 */
export async function getCycleProgress(id: string) {
  const cycle = await db.cycle.findUnique({
    where: { id },
    select: {
      templateSnapshot: true,
      response: {
        select: { answers: { select: { questionId: true, scaleValue: true, text: true } } },
      },
    },
  });

  if (cycle === null) return null;

  const snapshotResult = snapshotSchema.safeParse(cycle.templateSnapshot);
  if (!snapshotResult.success) return null;

  return computeProgress(snapshotResult.data, toAnswersRecord(cycle.response?.answers ?? []));
}

/**
 * The raw interview dialog for ONE question, on demand (FR-PROGRESS-03).
 * Returns the messages tagged with that question id, or null when the cycle is
 * missing, was not an interview, or has no dialog for that question (a
 * form-answered question never yields a dialog). HR-auth enforced upstream.
 */
export async function getQuestionDialog(
  cycleId: string,
  questionId: string,
): Promise<Array<{ role: "assistant" | "user"; content: string }> | null> {
  const cycle = await db.cycle.findUnique({
    where: { id: cycleId },
    select: { mode: true, dialog: { select: { messages: true } } },
  });

  if (cycle === null || cycle.mode !== "interview") return null;

  const transcript = interviewTranscriptSchema.safeParse(cycle.dialog?.messages ?? []);
  if (!transcript.success) return null;

  const messages = transcript.data
    .filter((m) => m.questionId === questionId)
    .map((m) => ({ role: m.role, content: m.content }));

  return messages.length > 0 ? messages : null;
}

/**
 * Load a cycle's stored AI summary for read-only rendering (FR-REPORT-03/04).
 * Returns null when none is drafted, or when the stored content fails the
 * structured-summary schema (defensive: a corrupt blob renders as "no summary"
 * rather than a 500). HR-auth enforced upstream.
 */
export async function getSummary(cycleId: string): Promise<SummaryShape | null> {
  const summary = await db.summary.findUnique({
    where: { cycleId },
    select: { content: true },
  });
  if (summary === null) return null;

  const parsed = summaryShapeSchema.safeParse(summary.content);
  if (!parsed.success) {
    console.warn(`[cycles/queries] Cycle ${cycleId} has a malformed stored summary`);
    return null;
  }
  return parsed.data;
}
