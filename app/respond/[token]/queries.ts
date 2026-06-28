// @trace FR-LINK-01 FR-LINK-02 FR-LINK-03
import "server-only";

import { db } from "@/lib/db";
import { snapshotSchema } from "@/lib/cycles/snapshot";
import { daysRemaining } from "@/lib/cycles/status";
import type { CycleStatus } from "@/lib/cycles/status";
import type { TemplateSnapshot } from "@/lib/cycles/snapshot";
import type { RespondMode } from "@prisma/client";

/**
 * The public-facing view of a cycle for the respondent landing page.
 * Privacy invariant (BC-PRIVACY-02): no id, subjectId, token, subject
 * fullName, email, phone, or telegramHandle — only the first word of
 * the subject's name is surfaced.
 */
export type RespondentCycle = {
  methodology: string;
  questions: TemplateSnapshot["questions"];
  deadline: Date;
  daysRemaining: number;
  status: CycleStatus;
  subjectFirstName: string;
  mode: RespondMode | null;
  savedAnswers: Record<string, number | string>;
};

/**
 * Load the cycle identified by `token` and return a privacy-safe, enriched
 * RespondentCycle. Returns null when:
 *   - the token is not found in the DB, OR
 *   - the stored templateSnapshot does not pass snapshotSchema validation
 *     (defensive: broken snapshot is treated as not found, never a 500).
 *
 * The status is read directly from the DB row (persisted enum value) and is
 * NOT re-derived from the deadline — see design Decision 1 (FR-LINK-03).
 */
export async function getRespondentCycleByToken(
  token: string,
): Promise<RespondentCycle | null> {
  const cycle = await db.cycle.findUnique({
    where: { token },
    select: {
      status: true,
      deadline: true,
      templateSnapshot: true,
      mode: true,
      subject: { select: { fullName: true } },
      response: {
        select: {
          answers: {
            select: { questionId: true, scaleValue: true, text: true },
          },
        },
      },
    },
  });

  if (cycle === null) return null;

  const snapshotResult = snapshotSchema.safeParse(cycle.templateSnapshot);
  if (!snapshotResult.success) {
    console.warn(
      "[respond/queries] Cycle with given token has an invalid templateSnapshot:",
      snapshotResult.error.message,
    );
    return null;
  }

  const snapshot = snapshotResult.data;
  const now = new Date();

  // cycle.status is typed by Prisma as CycleStatus (the enum), whose members
  // are "collecting" | "done" | "expired" — identical to lib/cycles/status.ts
  // CycleStatus. The assignment is direct; no cast is needed.
  const status: CycleStatus = cycle.status;

  // Extract only the first word — never the full name (BC-PRIVACY-02).
  const firstWord = cycle.subject.fullName.split(" ")[0];
  const subjectFirstName = firstWord !== undefined && firstWord.length > 0
    ? firstWord
    : cycle.subject.fullName;

  // savedAnswers (add-form, FR-FORM-03/04, Decision 3): flatten the nested
  // Response/Answer rows into a Record keyed by questionId, the same shape
  // isResponseComplete/firstUnansweredRequiredQuestion both expect. No
  // Response row yet, or a Response row with zero Answer rows, both map to
  // an empty object.
  const answerRows = cycle.response?.answers ?? [];
  const savedAnswers: Record<string, number | string> = {};
  for (const row of answerRows) {
    if (row.scaleValue !== null) {
      savedAnswers[row.questionId] = row.scaleValue;
    } else if (row.text !== null) {
      savedAnswers[row.questionId] = row.text;
    }
  }

  return {
    methodology: snapshot.methodology,
    questions: snapshot.questions,
    deadline: cycle.deadline,
    daysRemaining: daysRemaining(cycle.deadline, now),
    status,
    subjectFirstName,
    mode: cycle.mode,
    savedAnswers,
  };
}
