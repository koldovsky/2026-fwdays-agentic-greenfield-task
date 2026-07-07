## Why

Beyond the MVP capability catalogue (`docs/capabilities.md` C1–C9). `docs/product-brief.md` explicitly lists "Launch supported applications (future)" as a future workflow, and `docs/capabilities.md` → "Requirement gaps" reinforces "App launching is listed as 'future' in the brief; keep it out of scope of these capabilities." This change knowingly opens that door by shipping the smallest useful slice of app-launching — opening a URL in the TV's built-in Tizen browser — as a first post-MVP capability slotted after C9. Motivation: the MVP now covers keys, volume, and input switching; casting a URL to the TV browser is the single most-asked follow-up workflow (personal watch-later links, dashboards, image slideshows on the TV) and the wire shape (`ms.channel.emit` → `ed.apps.launch`) is small enough to verify against a real TV in one pass.

Because no `FR-BROWSER-*` IDs exist yet, this change also **adds three FRs to `docs/requirements.md`** and one row to `docs/capabilities.md` as part of its Impact — per the capabilities.md rule that missing requirements must gain a traceable ID before the change referencing them lands.

## What Changes

- **Requirements** (`docs/requirements.md`): add
  - `FR-BROWSER-01` — the user shall be able to launch a URL in the TV's Tizen web browser from the SPA.
  - `FR-BROWSER-02` — the back-end shall validate the URL (scheme + parse) before forwarding to the TV.
  - `FR-BROWSER-03` — the browser-launch control shall be disabled while the session is not `Connected`.
- **Capabilities** (`docs/capabilities.md`): add row `C10 tv-browser-launch`, Phase 5 (post-MVP), depends on `C5 tv-connection-lifecycle`.
- **Back-end HTTP surface** (single new route, mounted under `/api`):
  - `POST /api/devices/:udn/browser` with body `{ url: string }` → session must be `Connected`. Server validates URL (`http:` / `https:` scheme, parseable), then enqueues one Smart View frame via the existing per-TV session queue and replies `204 No Content`. Non-Connected → `409 SessionNotConnected` (same shape as C6/C7/C8).
- **Smart View wire envelope** (via the existing `JsonRpcTransport.call`): `ms.channel.emit` with params `{ event: 'ed.apps.launch', to: 'host', data: { appId: 'org.tizen.browser', action_type: 'NATIVE_LAUNCH', metaTag: <url> } }`. This is a **new envelope shape** for the transport (all prior C6/C7/C8 traffic uses `ms.remote.control`); no transport changes are needed because `call(method, params)` already forwards any method verbatim.
- **Domain module**: new `back-end/src/tv/browser.ts` with `launchBrowserParams(url)` (mirrors the `keyControlParams` / `volumeControlParams` naming from earlier capabilities) so the wire shape stays canonical and testable.
- **Front-end**: **remove** the existing `AppShortcut` row (`Live TV / Movies / Games / Apps` at `front-end/src/screens/RemoteScreen.tsx:126-129` — placeholder art per the DS `readme.md`, no wire behaviour). Replace it with an inline URL row: DS `Input` (URL, flex-grow) + DS `Button` labeled "Open" attached at the end of the input, sharing the same `aria-disabled` wrapper the AppShortcut row already used for `!isConnected`. Tapping "Open" fires `POST /api/devices/:udn/browser` and clears the field on success. Error surfacing rides on C9's toast/banner pattern.
- **Design system**: **no new primitives.** The DS already ships `Input` (`docs/orbit-tv-remote-design-system/components/forms/Input.jsx`, neumorphic-inset text field intended for exactly this shape) and `Button`. No `@ds/components/**` additions required — this change is pure consumption of existing DS primitives.

## Capabilities

### New Capabilities

- `tv-browser-launch`: launch a URL in the TV's Tizen web browser from the SPA, via one HTTP endpoint on the back-end and a modal in the SPA. First post-MVP capability; establishes the pattern for future `ed.apps.launch`-based capabilities (YouTube, Netflix, etc.).

### Modified Capabilities

<!-- None. Consumes tv-connection-lifecycle's session queue. Independent of remote-control-keys / volume-control / input-management. -->

## Impact

- **Requirements added**: `FR-BROWSER-01`, `FR-BROWSER-02`, `FR-BROWSER-03` (this change edits `docs/requirements.md`).
- **Catalogue added**: `C10 tv-browser-launch`, Phase 5 (this change edits `docs/capabilities.md` — adds the row and a short Phase 5 blurb).
- **Requirements covered**: `FR-BROWSER-01`, `FR-BROWSER-02`, `FR-BROWSER-03`. Cross-cutting NFRs (NFR-04 no cloud, NFR-05 no auth, NFR-01 memory budget) inherited.
- **Depends on**: `tv-connection-lifecycle` (session queue + Connected state); `error-surfacing` (toast/banner pattern). Change refuses to start until both are archived (they are, as of the current archive).
- **Code**:
  - Back-end: adds `back-end/src/tv/browser.ts`, `back-end/src/routes/browser.ts`; wires the route in `back-end/src/app.ts` under `/api`. No transport or session-manager changes.
  - Front-end: adds `front-end/src/data/useBrowserLaunch.ts`; edits `front-end/src/screens/RemoteScreen.tsx` — deletes the four `AppShortcut` lines, drops the now-unused `AppShortcut` import, and inserts the inline URL `Input` + "Open" `Button` row in the same slot with the same `aria-disabled` wrapper.
  - DS: **no changes.** Consumes the existing `Input` and `Button` primitives from `@ds/components/forms/Input.jsx` and `@ds/components/core/Button.jsx`.
- **Non-goals** (quoted from `docs/product-brief.md` → "Future scope" and this change's Non-Goals):
  - **Launching arbitrary apps other than the Tizen browser** — YouTube / Netflix / etc. would use the same envelope shape but a different `appId`. Deferred to a follow-up capability once this envelope is verified on real hardware.
  - **Reading current browser URL** or capturing the browser's state — not exposed on Smart View.
  - **Closing / killing the browser app** — no Smart View method for it in the envelope catalogue we use.
  - **Bookmarks / URL history in the SPA** — nice-to-have; out of MVP-plus scope. Follow-up if there's demand.
  - Explicitly still deferred (from product brief): user authentication, cloud connectivity, mobile applications, macros / automation, scheduling, HDMI-CEC, voice assistants, plugin system.
- **House rules** (re-affirmed): no cloud (BC-05), no auth (BC-04), `AccessToken` never leaves the back-end, URLs get logged but any `token=` query fragment is redacted by the existing `logger.ts` formatter, front-end talks to the back-end only (never to the TV), the same UDN-as-identity rule.