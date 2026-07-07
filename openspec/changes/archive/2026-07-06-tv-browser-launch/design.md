## Context

First post-MVP capability. Rides on the transport + session queue established by `tv-connection-lifecycle` (C5) and the DS + toast pattern established by `error-surfacing` (C9). The wire shape is **new** — every prior C6/C7/C8 command uses `ms.remote.control`, whereas this change uses `ms.channel.emit` with an `ed.apps.launch` payload. This envelope is documented in the Samsung Tizen developer material and confirmed via community reverse-engineering of the Smart View WS channel; the archived `smart-view-ws-transport` design.md D1 already covers the "`JSON.stringify({method, params})` fire-and-forget" transport primitive, so no transport code changes.

Because Samsung Smart View WebSocket is fire-and-forget (no per-frame response id — see the archived `smart-view-ws-transport` D1), a successful `POST /browser` reply means "the frame left the back-end" and not "the TV opened the browser." That is the same guarantee C6/C7/C8 give and is acceptable for this feature: the observable feedback loop is the TV screen itself. If the TV rejects the envelope shape, it emits `ms.error` on the socket, which the transport already logs (jsonrpc.ts `parseSmartViewEvent` branch).

Two front-end constraints apply. First, `frontend-design-check` blocks inlined styles: every visible element must come from Orbit DS primitives. Second, the DS already ships an `Input` primitive (`docs/orbit-tv-remote-design-system/components/forms/Input.jsx`) — a neumorphic-inset text field originally added for the manual-add-by-IP dialog. This change **consumes** `Input` + `Button` as-is; no `@ds/components/**` additions are required. This deviates from the C7/C8 pattern where each capability extended the DS (`RotaryKnob`, `ListRow`) because the primitives it needs are already there.

There is one destructive front-end change beyond the additive C6–C8 pattern: `RemoteScreen.tsx:126-129` renders four `AppShortcut` tiles (`Live TV / Movies / Games / Apps`). Per `docs/orbit-tv-remote-design-system/readme.md:45`, these are placeholder art — no click handler, no wire behaviour. This change removes them and reuses the same layout slot for the inline URL row; see D5.

The AGENTS.md session-log rule applies: this change ships an entry to `docs/current-state.md`.

## Goals / Non-Goals

**Goals:**
- One tap on the "Open" button in `RemoteScreen` opens the typed URL in the TV's Tizen browser.
- URL validation happens at the API boundary (`http:`/`https:` scheme + WHATWG-parseable) — invalid URLs never reach the wire.
- Reuse existing session queue, error mapping, and toast pattern verbatim; no new modules under `tv/session*`, `errors*`, or the WS broker.
- Reuse the DS `Input` + `Button` primitives as-is; **no** new DS primitive, **no** modal.
- Replace the placeholder `AppShortcut` row (`Live TV / Movies / Games / Apps`) in place — reuse the layout slot so the surrounding neomorphic rhythm of the remote is preserved.

**Non-Goals:**
- Launching apps other than the Tizen browser. `appId` is hardcoded to `org.tizen.browser`; a follow-up capability can generalise once this envelope is verified against real hardware.
- A modal or IconButton launcher affordance — earlier draft; superseded by the inline row per user requirement.
- Adding a new DS text-input primitive — earlier draft; superseded because the DS already ships `Input`.
- Preserving the deleted `AppShortcut` art anywhere else (e.g. hidden behind a flag). It was placeholder art per the DS readme; nothing else consumes it and the DS export stays for other consumers.
- Reading current browser URL / capturing browser state (Smart View doesn't expose it).
- Closing / killing the browser app.
- Bookmarks, URL history, or a URL suggestions list in the SPA.
- Any handling of TVs where the Tizen browser is missing or removed by the vendor — the TV silently ignores `ed.apps.launch` for unknown appIds; there is no error surface. Documented as a Risk.

## Decisions

### D1 — HTTP surface: single POST, UDN-scoped

`POST /api/devices/:udn/browser { url: string }` → `204`. Same shape family as `POST /input` (C8) and `POST /volume/delta` (C7) — UDN in the path, JSON body, 204 on success. Alternatives considered:

- `GET /browser?url=...` — rejected: not idempotent (side-effect on TV), and URLs in query strings are logged more aggressively (some proxies), whereas bodies are only logged at `debug` in `logger.ts`.
- Multiple appId endpoints (`/browser`, `/youtube`, `/netflix`) — rejected: premature. Verify Tizen browser first; genericise later.
- A `POST /apps { appId, data }` open-ended endpoint — rejected: no validation surface. Constrained per-appId route lets Fastify's JSON schema enforce `url` on this route and different constraints on future ones.

### D2 — On-wire envelope shape

`ms.channel.emit` is emitted through `transport.call('ms.channel.emit', params)` where params carry the whole nested `{ event, to, data }` structure. Because `JsonRpcTransport.call(method, params)` (jsonrpc.ts:161) already sends `JSON.stringify({ method, params })` verbatim, this works without any transport change. The exact frame sent (per the user-supplied envelope confirmed working on TV):

```json
{
  "method": "ms.channel.emit",
  "params": {
    "event": "ed.apps.launch",
    "to": "host",
    "data": {
      "appId": "org.tizen.browser",
      "action_type": "NATIVE_LAUNCH",
      "metaTag": "<validated url>"
    }
  }
}
```

`to: "host"` is Samsung's convention for "the TV itself" (as opposed to broadcasting to other Smart View peers). `NATIVE_LAUNCH` opens the app rather than deep-linking. `metaTag` carries the URL — this is the field the Tizen browser reads for its initial navigation target.

The wire helper lives in a new `back-end/src/tv/browser.ts`, exporting `launchBrowserParams(url: string): Record<string, unknown>`. Same shape and naming as `keyControlParams` (C6) and `volumeControlParams` (C7) so the wire vocabulary stays canonical and unit-testable.

### D3 — URL validation

Two layers:

1. **Fastify JSON schema** on the route body: `{ type: 'object', required: ['url'], additionalProperties: false, properties: { url: { type: 'string', minLength: 1, maxLength: 2048 } } }`. Rejects missing/empty/oversized → `400 validation` via the existing `errorHandler` `error.validation` branch. `maxLength: 2048` is a conservative cap so we don't spool megabytes into a Smart View frame the TV would drop anyway.
2. **Runtime WHATWG `URL` parse** inside the route handler: `new URL(body.url)` in a try/catch; on catch or on `parsed.protocol !== 'http:' && parsed.protocol !== 'https:'` → throw `HttpError.validation(...)` mapping to the same `400 validation` envelope shape. Only after both layers pass does the frame enter `session.enqueue`.

Alternatives considered:

- Schema-only validation with `format: 'uri'`. Rejected: Ajv's `uri` format is lax (accepts `javascript:` schemes, weird encodings). WHATWG is stricter and matches what the TV will actually try to open.
- Allow-list of specific hostnames. Rejected: over-constrained; users legitimately want to cast personal LAN URLs and services with rotating hosts. `http:`/`https:` scheme constraint is the right blast-radius control.
- Block private IPs / `localhost`. Rejected: the TV lives on the LAN; `192.168.*` URLs are one of the main use cases (a local dashboard hosted on the same Pi). Blocking them would defeat the feature.

### D4 — Session precondition & error mapping

The route follows the same shape as `POST /input` (C8) and `POST /key` (C6): fetch the session via `discovery.sessions.get(udn) ?? .ensure(udn)`; if state !== `Connected` → throw `new HttpError(409, 'SessionNotConnected', ...)`. Any error thrown inside the `session.enqueue` callback is already caught + mapped by the existing `mapWsError` / domain error union machinery — nothing new here.

The route registration lives in a new `back-end/src/routes/browser.ts` and is registered inside the `/api` prefix in `back-end/src/app.ts`, next to `registerInputRoutes(...)`.

### D5 — Front-end: inline URL row, no modal, no new DS primitive

**Layout.** `RemoteScreen.tsx:122-130` currently holds a flex row wrapper (`aria-disabled={!isConnected}`) containing four `AppShortcut` tiles. Delete the four tiles and reuse the wrapper. Inside it, render two DS primitives:

1. `Input` (from `@ds/components/forms/Input.jsx`) — flex-grow, placeholder `https://example.com`, controlled by local `useState<string>('')`. `disabled` bound to `!isConnected`.
2. `Button` (from `@ds/components/core/Button.jsx`) — label "Open", variant primary. `disabled={!isConnected || url.trim().length === 0 || isPending}`. `onClick` calls `useBrowserLaunch().launch(url)`; on resolved `204` clear the input; on rejection the shared C9 toast fires and the input value is preserved.

The `Input` sits directly next to the `Button` — user requirement: "an Open button at the end of the input." Keep the wrapper flex row; adjust `gap` to match the DPad row's rhythm (`gap: 12` is close to the removed `AppShortcut` row's `gap: 18` reduced for the smaller vertical footprint). No border color, no hard-coded palette (`Input` and `Button` both use `var(--nm-*)` tokens internally).

**Also drop the `AppShortcut` import.** The `AppShortcut` component itself stays in the DS (other consumers may use it in the future); only `RemoteScreen.tsx`'s import and four usages go away. If the import lingers as dead code, `tsc` will not error but the DS's own oxlint rule (`_adherence.oxlintrc.json`) may flag it — remove it in the same edit.

**New files:**

- `front-end/src/data/useBrowserLaunch.ts` — hook exposing `{ launch(url: string): Promise<void>, isPending: boolean, error: DomainError | null }`. POSTs to `/api/devices/${udn}/browser`. On success resolves; on error maps the response into the shared error-surfacing toast (C9) and rejects. UDN is a hook argument (`useBrowserLaunch(udn)`), read from the same UDN context `RemoteScreen` already uses for the other command hooks.

**Copy.** Placeholder "https://example.com" (English, sentence case). Button label "Open" (1 word — same terseness as the DPad-row `IconButton`s). Failure toast reuses the shared error-surfacing copy from C9 — no new copy strings.

**Rejected alternatives (explicit, since the change history includes them):**

- Modal + `IconButton` launcher — earlier draft. Superseded because it adds a tap and does not match the "inline input with Open at the end" layout the user asked for.
- Adding a new DS `TextField` primitive — earlier draft. Superseded because the DS already ships `Input` with the exact neomorphic-inset treatment we need. Consuming it removes ~30 min of DS work and keeps the primitive surface stable.

### D6 — Logging & redaction

The route logs `{ correlationId, udn, url, host }` at `info` on entry and `{ correlationId, udn, ok }` at `info` on exit. The URL is user-provided data — we don't redact it wholesale, but the existing `logger.ts` formatter already strips `token=` query fragments and top-level `token` keys, which covers the pairing-token exfil risk if a user pastes a URL containing one. The Smart View AccessToken (`MYTV_TOKEN_<UDN>`) is never in the URL body, so no additional handling is needed.

### D7 — Requirements & catalogue edit

This change edits `docs/requirements.md` (adds three FRs) and `docs/capabilities.md` (adds C10 row + Phase 5 blurb) in the same commit as the code. Alternative: land the docs first in a separate change. Rejected: the FRs are load-bearing on this change's acceptance and would be dead references otherwise. Landing together keeps traceability atomic.

## Risks / Trade-offs

- **[TV silently ignores unknown appId or malformed envelope]** → No error is surfaced. Mitigated by manual verification against a real TV before archiving (added as a task); if the envelope is wrong, the user sees no browser open and files a follow-up. `ms.error` events fired by the TV are already logged by `jsonrpc.ts:104` so a broken envelope isn't invisible on the server side.
- **[Fire-and-forget semantics: 204 doesn't mean the browser opened]** → Same trade-off as C6/C7/C8, matches user expectations for a remote control. Toast on network failure only; success = the frame was drained.
- **[URL injection via `metaTag`]** → The URL string ends up as a JSON string field inside a WebSocket text frame, JSON-escaped by `JSON.stringify`. No shell interpolation, no HTTP header injection. WHATWG URL parsing rejects malformed strings before they reach the frame. Residual risk is a URL that opens something the TV owner didn't intend on a shared LAN — same risk as anyone on the LAN opening `/api/devices/:udn/browser` directly. Accepted per BC-04 (no auth in MVP), documented in the change as a known LAN-trust assumption.
- **[Tizen browser presence varies by model / firmware]** → Some newer Tizen builds have removed the built-in browser or renamed the appId. If `org.tizen.browser` is missing the TV silently ignores the frame. Deferred: if this happens on a target TV we probe with an alternative `appId` in a follow-up.
- **[URL length]** → Capped at 2048 bytes at the schema level. Long URLs beyond this bounce with `400 validation`. Reasonable ceiling; matches historical browser limits.
- **[Adds an entirely new envelope family (`ms.channel.emit`) to the transport]** → Only observable in review as a new call site for `transport.call` with a non-`ms.remote.control` method. Documented here + in the spec so future readers know both envelope families are legitimate.

## Migration Plan

None (additive). Rollback = revert the change; the new endpoint disappears, the DS `TextField` primitive stays as-is (harmless if unused) or is reverted along with the change.

## Open Questions

- **Does the Tizen browser accept `metaTag` for URL, or does it need `payload` / `linkUrl`?** The user-supplied envelope worked once during a hand test. Confirming with a second physical TV before archive is on `tasks.md`.
- **Do we need to disable the button while a launch is in flight (avoid duplicate frames)?** Cheap to add; leaning yes but confirming during implementation.
- **Should `POST /browser` broadcast a `browser` event over the WebSocket like `/input` does?** Two SPA clients sharing the same TV would then see each other's launches. Deferred — no request for this yet, and unlike inputs where knowing what was pressed matters for UX, browser URL is best inferred from the TV screen. Adding the event later is a strict additive change to the broker.