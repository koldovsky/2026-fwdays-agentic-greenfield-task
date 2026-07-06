// apps/dashboard — GET /api/agui/stream (dashboard tasks.md §5.4,
// design.md Decision 1). On connect, sends a `STATE_SNAPSHOT` rebuilt from
// SQLite (`dashboard-db.ts`'s `readDashboardSnapshot`, §5.5) as the FIRST
// SSE frame, then forwards every `agui-hub.ts`-published event verbatim,
// in order, for as long as the client stays connected — unsubscribing from
// the hub the moment the client disconnects (no leak, §5.1's
// `subscriberCount` is how tests observe this).
//
// TYPED THROWING STUB — red state for Stage C of this slice. The signature
// below is the contract pinned by `route.test.ts`; the body (open the SQLite
// file, build the snapshot, open an SSE `ReadableStream`, subscribe to the
// hub, unsubscribe on `request.signal`'s abort) is implemented once that
// suite is confirmed red.
//
// Streaming shape verified via `ctx7`'s `/vercel/next.js` v16.2.9 docs
// before writing this file: a Route Handler returns a plain Web `Response`
// wrapping a `ReadableStream` with `content-type: text/event-stream` —
// no Next-specific streaming API, the same Web Streams API `hold.test.ts`'s
// sibling suites never needed either.

export async function GET(request: Request): Promise<Response> {
  throw new Error("apps/dashboard/app/api/agui/stream/route.ts: GET not implemented");
}
