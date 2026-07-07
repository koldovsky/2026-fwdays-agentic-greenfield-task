## 1. Requirements & catalogue

- [x] 1.1 Edit `docs/requirements.md`: add a new section "Browser" with `FR-BROWSER-01` (launch URL), `FR-BROWSER-02` (URL validation), `FR-BROWSER-03` (control disabled while not Connected). Match the wording style of the existing FRs.
- [x] 1.2 Edit `docs/capabilities.md`: add row `C10 tv-browser-launch` (one-liner, "Covers" = FR-BROWSER-01/02/03, "Depends on" = C5 + C9, "Phase" = 5); add a short "Phase 5 — Post-MVP" section header + one-paragraph blurb; update the "Requirement gaps" paragraph about app-launching to point at C10.

## 2. Back-end

- [x] 2.1 Create `back-end/src/tv/browser.ts` — export `launchBrowserParams(url: string): Record<string, unknown>` returning `{ event: 'ed.apps.launch', to: 'host', data: { appId: 'org.tizen.browser', action_type: 'NATIVE_LAUNCH', metaTag: url } }` (typed via a local `LaunchBrowserParams` interface + `satisfies`, same pattern as `keyControlParams` in `back-end/src/tv/keys.ts`). Do NOT hardcode the URL; take it as a parameter.
- [x] 2.2 Create `back-end/src/routes/browser.ts` — `POST /devices/:udn/browser` with Fastify JSON schema `{ type: 'object', required: ['url'], additionalProperties: false, properties: { url: { type: 'string', minLength: 1, maxLength: 2048 } } }`. Handler: WHATWG parse (`new URL(url)`); reject non-`http:`/`https:` with `HttpError.validation(...)` → `400 validation`. Fetch session via `discovery.sessions.get(udn) ?? .ensure(udn)`; if state !== `Connected` throw `new HttpError(409, 'SessionNotConnected', ...)`. Enqueue `transport.call('ms.channel.emit', launchBrowserParams(url))`. Reply `204`.
- [x] 2.3 Wire `registerBrowserRoute(app)` in `back-end/src/app.ts` under the existing `/api` prefix block, right after `registerInputRoutes(...)`.
- [x] 2.4 Confirm the URL is logged at `info` on entry (existing route-level Fastify logging is enough; verify nothing extra needs adding) and that `logger.ts`'s existing `token=` query-fragment stripping applies to logged URLs.

## 3. Back-end — verification

- [x] 3.1 Unit test `back-end/src/tv/browser.test.ts`: `launchBrowserParams('https://www.google.com')` returns exactly the expected object literal; changing the URL only changes the nested `data.metaTag`.
- [x] 3.2 Integration test `back-end/src/routes/browser.test.ts` (or extend an existing routes test file): `POST /api/devices/:udn/browser { url: 'https://www.google.com' }` while `Connected` → `204`, the stub transport recorded exactly one `ms.channel.emit` frame carrying `metaTag: 'https://www.google.com'`.
- [x] 3.3 Integration test: empty body → `400 validation` (no frame). `{ url: '' }` → `400 validation`. `{ url: 'javascript:alert(1)' }` → `400 validation`. `{ url: 'not a url' }` → `400 validation`. `{ url: 'a'.repeat(3000) }` → `400 validation`. No frames sent in any of these.
- [x] 3.4 Integration test: `POST /browser` while session is `Disconnected` → `409 SessionNotConnected` (no frame).
- [x] 3.5 `npm run back:build` and `npm run back:test` pass.

## 4. Front-end data

- [x] 4.1 Create `front-end/src/data/useBrowserLaunch.ts` — hook returning `{ launch(url: string): Promise<void>, isPending: boolean, error: DomainError | null }`. `launch` POSTs to `/api/devices/${udn}/browser`; success clears error + resolves; failure maps the response into the shared error-surfacing toast (C9) and rejects. Note: implemented as `{ launch, isPending }` — the toast pattern already renders the error, so the extra `error` field would duplicate state; deviation flagged for reviewer.

## 5. Front-end UI

- [x] 5.1 Edit `front-end/src/screens/RemoteScreen.tsx`: delete the four `<AppShortcut ... />` lines (currently at `126-129` — `Live TV / Movies / Games / Apps`) and remove the now-unused `AppShortcut` import at the top of the file (`import { AppShortcut } from '@ds/components/controls/AppShortcut.jsx';`). Delete the surrounding two-line comment about `AppShortcut` still lacking a `disabled` prop (it becomes stale).
- [x] 5.2 In the same slot (inside the existing `aria-disabled={!isConnected}` flex wrapper), render the inline URL row: DS `Input` (imported from `@ds/components/forms/Input.jsx`) with a `useState<string>` for the URL value and placeholder `https://example.com`, followed by a DS `Button` (imported from `@ds/components/core/Button.jsx`) labeled `Open`. Both take `disabled={!isConnected}`; the `Button` additionally disables when the trimmed URL is empty or `isPending`. Adjust the wrapper's `gap` from `18` to `12` so the two-element row reads correctly at the same vertical footprint. Note: DS `Input` did not previously accept a `disabled` prop; extended it (`.jsx` + `.d.ts`) to match the DS `Slider`'s pattern (C7 precedent). Not a new primitive — modification only. `git status docs/orbit-tv-remote-design-system/components/` still shows no new files.
- [x] 5.3 Wire the row to the new hook (§4.1): on `Button` click, call `useBrowserLaunch(udn).launch(url)`. On resolved success clear the input; on rejection the C9 toast fires from inside the hook and the input value is preserved for retry. No new DS primitive — do not add `TextField`.

## 6. Front-end — verification

- [x] 6.1 Component test at `RemoteScreen.test.tsx`: after render, the labels "Live TV", "Movies", "Games", and "Apps" are absent from the DOM (the four shortcuts are gone).
- [x] 6.2 Component test at `RemoteScreen.test.tsx`: the URL `Input` and "Open" `Button` render in the position previously held by the `AppShortcut` row (inside the same `aria-disabled` wrapper).
- [x] 6.3 Component test: "Open" `Button` is `disabled` while the input is empty; `disabled` while `state='Connecting'`; `disabled` while `isPending=true`. Enabled only when `state='Connected'`, the input is non-empty, and no launch is in flight.
- [x] 6.4 Component test: with `state='Connected'` and a URL of `https://www.google.com` typed into the input, tapping "Open" calls the injected `launch('https://www.google.com')` exactly once and clears the input on resolve.
- [x] 6.5 Grep checks (a) `grep -nE "AppShortcut" front-end/src/screens/RemoteScreen.tsx` returns empty (both usages and import gone). (b) `grep -rE '#([0-9a-fA-F]{3,8})' front-end/src/screens/RemoteScreen.tsx front-end/src/data/useBrowserLaunch.ts` returns empty (no hard-coded palette). (c) `git status docs/orbit-tv-remote-design-system/components/` shows no new files (no DS primitive added).
- [x] 6.6 `npm run front:build` and `npm run front:test` pass.

## 7. Manual verification & handoff

- [ ] 7.1 With a real Samsung TV: pair the TV, open the app, type `https://www.google.com` into the new URL input on the remote screen, tap "Open" — confirm Google opens in the TV's Tizen browser. Note the exact firmware / TV model in `docs/current-state.md`. **DEFERRED to a human session** — no TV on the LAN this session; agent cannot honestly self-verify per AGENTS.md.
- [ ] 7.2 If 7.1 fails: check the back-end log for an `ms.error` event from the TV. The design.md D2 envelope may need iteration on this model — capture the failing envelope in `docs/current-state.md` and open a follow-up. **DEFERRED (blocked by 7.1).**
- [ ] 7.3 Verify dark mode: the DS `Input` and `Button` primitives already follow tokens; confirm the inset focus ring on the URL field reads correctly under `[data-theme="dark"]`. **DEFERRED to a human session** — visual regression check needs a browser and eyes.
- [x] 7.4 Prepend a new dated entry to `docs/current-state.md` covering: FR additions to `docs/requirements.md`, C10 addition to `docs/capabilities.md`, new back-end module + route, deletion of the `AppShortcut` row on `RemoteScreen`, new SPA URL row + hook (consuming existing DS `Input` + `Button` — no new DS primitive), TV-side verification results (or noted deferral).