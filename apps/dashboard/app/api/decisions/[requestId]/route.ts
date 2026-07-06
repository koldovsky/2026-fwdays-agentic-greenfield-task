// apps/dashboard — POST /api/decisions/:requestId (dashboard tasks.md §5.7,
// design.md Decision 4). The `DecisionBar`'s three buttons (Confirm /
// Propose another time / Decline, section 6 — not this pass) all post here.
// `booking-hitl` (S4) will replace this stub with the real transition
// handler; THIS slice's job is only to make sure the button is never
// silently dead or a raw 404/500 before S4 ships — clicking it must surface
// a deterministic Ukrainian "not yet connected" message inline.
//
// PINNED RESPONSE SHAPE (this slice's own decision, tasks.md §5.7: "decide
// the exact shape and pin it"):
//   HTTP 200 (a benign, successful-request status — the REQUEST was handled
//   correctly; it is the ACTION that isn't wired yet, so 4xx/5xx would be
//   misleading)
//   body: { "status": "not_connected", "message": "Ще не підключено — ..." }
// `status: "not_connected"` is the machine-checkable discriminant the
// client's `DecisionBar` (tasks.md §6.6) renders inline off of; `message` is
// the Ukrainian, kind, non-alarming copy a teacher actually reads
// (BC-BRAND-01/BC-LANG-01).
//
// TYPED THROWING STUB — red state for Stage C of this slice. The signature
// below is the contract pinned by `route.test.ts`; the body (returning the
// pinned shape above, unconditionally, for ANY action/requestId — this
// route never actually inspects them, S4 replaces the whole handler) is
// implemented once that suite is confirmed red.

export async function POST(
  request: Request,
  context: { params: Promise<{ requestId: string }> },
): Promise<Response> {
  throw new Error("apps/dashboard/app/api/decisions/[requestId]/route.ts: POST not implemented");
}
