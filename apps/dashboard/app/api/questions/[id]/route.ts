// apps/dashboard/app/api/questions/[id] — POST /api/questions/:id
// (kb-learning tasks.md E.3, design.md Decision 5's five-step ordering,
// `@trace FR-KB-03`, `@trace NFR-REL-01`). The "One-action admin answer":
// this route is the ONLY runtime write path onto `knowledge/school.md`
// (review-gate finding I.1(b); FR-GUARD-06's structural guarantee that the
// agent never writes it).
//
// TYPED THROWING STUB — RED phase; `route.test.ts` pins the real
// five-step contract.
//
// RESPONSE SHAPE (this RED pass PINS the choice tasks.md E.3 flags as
// open, deliberately DIVERGING from the sibling decisions-route's "every
// reachable outcome is HTTP 200" convention, in favor of design.md
// Decision 5 step 1's OWN literal wording — "Invalid → inline `400`-shaped
// JSON error"):
//   - a non-integer/non-positive `[id]`, a malformed JSON body, or a
//     missing/non-string `answer` field -> `400 { error: string }` (a
//     wire-format problem, mirrors `leads/[id]/route.ts`'s own `[id]`-guard
//     convention).
//   - `validateAnswerText` rejects (`EMPTY` / `TOO_LONG`) -> `400
//     { status: "invalid", code: "EMPTY" | "TOO_LONG", message: string,
//     maxLength?: number }` — design.md Decision 5 step 1's own wording,
//     verbatim.
//   - the question is missing or no longer `status === 'open'` (stale
//     submit, design.md Decision 5 step 2) -> `200 { status: "stale",
//     message: string }` — mirrors `decisions/[requestId]/route.ts`'s own
//     stale-submit convention (never a 404, never a second write).
//   - the KB append throws (missing/unwritable directory, design.md
//     Decision 5 step 4) -> `502 { error: string }` naming the failure —
//     mirrors `leads/[id]/route.ts`'s own calendar-failure 502 convention
//     for an external-I/O failure; the question stays `open` (step 5 never
//     runs, "SHALL not diverge" by construction).
//   - happy path -> `200 { status: "applied", question: QuestionRow }`.
//
// FIVE-STEP ORDERING (design.md Decision 5, to be implemented VERBATIM by
// the GREEN pass — every abort path returns BEFORE the next step, so no
// partial commit is ever possible):
//   1. `validateAnswerText(answer)` (`@kamerton/lib/src/kb/validate-answer.ts`).
//   2. Re-load the question (`findQuestionById`, `@kamerton/db`) and check
//      `status === 'open'`.
//   3. `serializeKbEntry({ question: row.text, answer })`
//      (`@kamerton/lib/src/kb/serialize-entry.ts`).
//   4. `appendKbEntry(resolveKbPath(), entry)` (`../../../../lib/kb-write.ts`)
//      — a thrown error here aborts BEFORE step 5.
//   5. `markQuestionAnswered(db, id, answer)` (`@kamerton/db`) —
//      `delivery_status` left at `'pending'` so the bot's drain loop (task
//      D) picks it up.
//
// `resolveKbPath(env)` mirrors `apps/dashboard/lib/dashboard-db.ts`'s own
// `resolveDbPath(env)` idiom: a `KAMERTON_KB_PATH` env var (this RED pass's
// OWN pinned name — the GREEN implementer and `route.test.ts` both rely on
// it), falling back to the repo-root `knowledge/school.md`. Exported so
// `route.test.ts` can assert its default-fallback behavior directly if
// needed, without having to set the env var for every case.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase, findQuestionById, markQuestionAnswered } from "@kamerton/db";
import { validateAnswerText } from "@kamerton/lib/src/kb/validate-answer.ts";
import { serializeKbEntry } from "@kamerton/lib/src/kb/serialize-entry.ts";
import { resolveDbPath } from "../../../../lib/dashboard-db.ts";
import { appendKbEntry } from "../../../../lib/kb-write.ts";

export const runtime = "nodejs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
  "..",
  "..",
);

export function resolveKbPath(env: NodeJS.ProcessEnv = process.env): string {
  return env.KAMERTON_KB_PATH ?? path.join(repoRoot, "knowledge", "school.md");
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: rawId } = await context.params;
  const id = Number(rawId);

  // Wire-format problem: a non-integer/non-positive `[id]` -> 400, mirrors
  // `leads/[id]/route.ts`'s own `[id]`-guard convention.
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "Некоректний ідентифікатор питання." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Некоректний формат запиту." }, { status: 400 });
  }

  const answer = (body as { answer?: unknown } | null)?.answer;
  if (typeof answer !== "string") {
    return Response.json({ error: "Відповідь має бути текстом." }, { status: 400 });
  }

  // Step 1: validate the answer text.
  const validation = validateAnswerText(answer);
  if (!validation.ok) {
    return Response.json(
      {
        status: "invalid",
        code: validation.code,
        message:
          validation.code === "EMPTY"
            ? "Введіть відповідь."
            : `Відповідь занадто довга — максимум ${validation.maxLength} символів.`,
        ...(validation.code === "TOO_LONG" ? { maxLength: validation.maxLength } : {}),
      },
      { status: 400 },
    );
  }

  const db = openDatabase(resolveDbPath());
  try {
    // Step 2: re-load the question, require status === 'open'.
    const row = findQuestionById(db, id);
    if (row === undefined || row.status !== "open") {
      return Response.json(
        { status: "stale", message: "Це питання вже опрацьоване або більше не існує." },
        { status: 200 },
      );
    }

    // Step 3: serialize the entry.
    const entry = serializeKbEntry({ question: row.text, answer });

    // Step 4: append to knowledge/school.md — a thrown error aborts BEFORE
    // step 5 (design.md Decision 5: "SHALL not diverge" by construction).
    try {
      appendKbEntry(resolveKbPath(), entry);
    } catch {
      return Response.json(
        { error: "Не вдалося записати відповідь у базу знань. Спробуйте ще раз." },
        { status: 502 },
      );
    }

    // Step 5: mark the row answered, delivery_status stays 'pending'.
    markQuestionAnswered(db, id, answer);
    const after = findQuestionById(db, id);

    return Response.json({ status: "applied", question: after }, { status: 200 });
  } finally {
    db.close();
  }
}
