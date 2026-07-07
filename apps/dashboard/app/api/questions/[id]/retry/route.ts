// apps/dashboard/app/api/questions/[id]/retry — POST
// /api/questions/:id/retry (kb-learning tasks.md E.4, design.md Decision 2's
// named fork from the S4 auto-retry precedent, `@trace FR-KB-04`). The ONLY
// way a `delivery_status='failed'` row re-enters the bot's drain queue.
//
// TYPED THROWING STUB — RED phase; `route.test.ts` pins the real contract.
//
// RESPONSE SHAPE (mirrors this slice's sibling `[id]/route.ts` choice, and
// `decisions/[requestId]/route.ts`'s own stale-submit convention):
//   - a non-integer/non-positive `[id]` -> `400 { error: string }` (a
//     wire-format problem).
//   - `@kamerton/db`'s `retryQuestionDelivery` (guarded `WHERE
//     status='answered' AND delivery_status='failed'`) reports 0 rows
//     changed — covers BOTH a `'pending'`/`'delivered'` row (a stale click)
//     AND a `status='open'` question (never eligible for retry at all) —
//     -> `200 { status: "stale", message: string }`, an untouched no-op.
//   - `retryQuestionDelivery` reports 1 row changed -> `200 { status:
//     "applied", question: QuestionRow }` (the row's `delivery_status` is
//     now `'pending'`; the next drain tick, task D, attempts the send).

import { openDatabase, findQuestionById, retryQuestionDelivery } from "@kamerton/db";
import { resolveDbPath } from "../../../../../lib/dashboard-db.ts";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: rawId } = await context.params;
  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "Некоректний ідентифікатор питання." }, { status: 400 });
  }

  const db = openDatabase(resolveDbPath());
  try {
    const changes = retryQuestionDelivery(db, id);
    if (changes === 0) {
      return Response.json(
        { status: "stale", message: "Це питання вже надіслано, доставлено або ще не отримало відповіді." },
        { status: 200 },
      );
    }

    const question = findQuestionById(db, id);
    return Response.json({ status: "applied", question }, { status: 200 });
  } finally {
    db.close();
  }
}
