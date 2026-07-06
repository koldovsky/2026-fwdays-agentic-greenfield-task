// apps/dashboard — POST /api/agui/ingest (dashboard tasks.md §5.3,
// design.md Decision 1: "Bot -> Next ingest -> SSE"). The bot's
// `HttpAguiPublisher` (packages/bot/src/http-agui-publisher.ts) POSTs every
// AG-UI event here as JSON; this route publishes it onto `agui-hub.ts`'s
// in-memory fan-out for every connected dashboard tab's SSE stream (§5.4) to
// forward.
//
// TYPED THROWING STUB — red state for Stage C of this slice. The signature
// below is the contract pinned by `route.test.ts`; the body (parse -> publish
// -> 200, or 400 on malformed JSON, NEVER a raw 500) is implemented once
// that suite is confirmed red.

export async function POST(request: Request): Promise<Response> {
  throw new Error("apps/dashboard/app/api/agui/ingest/route.ts: POST not implemented");
}
