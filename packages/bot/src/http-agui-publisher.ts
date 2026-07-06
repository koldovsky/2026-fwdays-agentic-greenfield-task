// @kamerton/bot — the production `AguiPublisher` (dashboard tasks.md §4.4,
// design.md Decision 1: "Bot -> Next ingest -> SSE"). POSTs each AG-UI event
// as JSON to the Next dashboard's `/api/agui/ingest` route. Small, real code
// (no fake to write — this is the production adapter itself, mirroring
// `GrammyTelegramTransport`/`GoogleCalendarPort`'s own "wiring, not unit
// tested" convention: it needs a live HTTP listener, which `index.ts`'s own
// header already documents as out of this module's test scope).
//
// Node >= 20 ships a global `fetch` (no dependency needed) — verified via
// `node -e "console.log(typeof fetch)"` against this repo's Node version.
//
// A POST failure (network error, non-2xx, a listener that never started)
// must NEVER throw into `handleUpdate()` — the dashboard is a one-way,
// best-effort side channel (design.md Decision 1); the bot keeps serving
// leads even with no dashboard listening (NFR-REL-01's spirit extended to
// this new seam). Failures are logged at most, never rethrown.

import { noopAguiPublisher, type AguiEvent, type AguiPublisher } from "./agui-publisher.ts";

/**
 * A real `AguiPublisher` that POSTs each event as JSON to `ingestUrl`. Every
 * `publish()` call swallows its own failure (network error or non-2xx
 * response) after logging it — never rejects, so `pipeline.ts`'s own
 * `safePublish` wrapper is a second, redundant safety net rather than the
 * only one.
 */
export class HttpAguiPublisher implements AguiPublisher {
  // Explicit field + assignment rather than a TypeScript constructor
  // parameter-property (`constructor(private readonly ingestUrl: string)`):
  // Node's default strip-only TypeScript execution rejects parameter-
  // properties (ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX), so the parameter-property
  // form would crash the real bot entrypoint (`node packages/bot/src/
  // index.ts`) at import time even though Vitest (which transforms TS)
  // tolerates it. Same runtime-only class as this repo's explicit-`.ts`-
  // import-extension rule — found by the §8.11 dashboard smoke.
  private readonly ingestUrl: string;

  constructor(ingestUrl: string) {
    this.ingestUrl = ingestUrl;
  }

  async publish(event: AguiEvent): Promise<void> {
    try {
      const response = await fetch(this.ingestUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(event),
        // Review-gate FIX 1 [CRITICAL]: a dashboard listener that accepts
        // the connection but never responds (slow-but-running, not down)
        // must not stall this call — and by extension a lead's whole turn —
        // indefinitely. `AbortSignal.timeout(2000)` rejects the fetch
        // promise after 2s; the `catch` below already swallows any
        // rejection, so a timeout degrades exactly like a network error.
        signal: AbortSignal.timeout(2000),
      });
      if (!response.ok) {
        console.error(
          `Kamerton: AG-UI ingest POST to ${this.ingestUrl} returned ${response.status} for event "${event.type}"`,
        );
      }
    } catch (error) {
      console.error(`Kamerton: AG-UI ingest POST to ${this.ingestUrl} failed for event "${event.type}"`, error);
    }
  }
}

/**
 * Resolves the production `AguiPublisher` from the environment
 * (dashboard tasks.md §4.4): `AGUI_INGEST_URL` set -> a real `HttpAguiPublisher`
 * posting to it; unset -> `noopAguiPublisher` (absent env = no dashboard =
 * no-op, never a crash, per `agui-publisher.ts`'s own header).
 */
export function resolveAguiPublisher(env: NodeJS.ProcessEnv = process.env): AguiPublisher {
  const ingestUrl = env.AGUI_INGEST_URL;
  if (ingestUrl === undefined || ingestUrl === "") {
    return noopAguiPublisher;
  }
  return new HttpAguiPublisher(ingestUrl);
}
