// apps/dashboard/app/api/questions — GET /api/questions (kb-learning
// tasks.md E.2, design.md Decision 2's closing note / Decision 4,
// `@trace FR-KB-02`).
//
// TYPED THROWING STUB — RED phase; `route.test.ts` pins the real contract.
//
// CONTRACT: returns the open-inbox list (`@kamerton/db`'s
// `findOpenInboxQuestions`) as a plain JSON ARRAY, newest-first
// (`created_at DESC`, the query's own ordering, per FR-KB-02); `[]` (never a
// thrown error / non-200 response) when there are no open questions.
// Mirrors `apps/dashboard/lib/dashboard-db.ts`'s `resolveDbPath()` +
// `openDatabase(...)` + `try/finally { db.close() }` idiom every other
// route in this app already uses (`app/api/leads/[id]/route.ts`,
// `app/api/decisions/[requestId]/route.ts`).

import { openDatabase, findOpenInboxQuestions } from "@kamerton/db";
import { resolveDbPath } from "../../../lib/dashboard-db.ts";

export const runtime = "nodejs";

export async function GET(_request: Request): Promise<Response> {
  const db = openDatabase(resolveDbPath());
  try {
    const questions = findOpenInboxQuestions(db);
    return Response.json(questions, { status: 200 });
  } finally {
    db.close();
  }
}
