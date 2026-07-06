## ADDED Requirements

### Requirement: Launch a URL in the TV's Tizen browser

The back-end SHALL expose `POST /api/devices/:udn/browser` with request body `{ url: string }`. On success, the back-end SHALL enqueue a single Samsung Smart View WebSocket frame `ms.channel.emit` with params `{ event: "ed.apps.launch", to: "host", data: { appId: "org.tizen.browser", action_type: "NATIVE_LAUNCH", metaTag: <url> } }` through the per-TV session queue owned by `tv-connection-lifecycle`, and reply `204 No Content`. Covers `FR-BROWSER-01`.

#### Scenario: Launch google.com succeeds

- **WHEN** a client `POST`s `{ "url": "https://www.google.com" }` to `/api/devices/:udn/browser` and the session is `Connected`
- **THEN** the response is `204` and the TV received exactly one Smart View text frame whose JSON body is `{ method: "ms.channel.emit", params: { event: "ed.apps.launch", to: "host", data: { appId: "org.tizen.browser", action_type: "NATIVE_LAUNCH", metaTag: "https://www.google.com" } } }`

#### Scenario: Commands remain serialized per TV

- **WHEN** two `POST /browser` calls target the same UDN in rapid succession
- **THEN** the frames leave the back-end in call order (per-TV serialization from `tv-connection-lifecycle` D1) — no interleaving, no batching

### Requirement: URL validation

The back-end SHALL reject requests whose `url` is missing, empty, not parseable by WHATWG `URL`, or does not have an `http:` / `https:` scheme, with `400 validation` — the same error envelope shape C6/C7/C8 use for schema violations. No Smart View frame SHALL be sent on rejection. Covers `FR-BROWSER-02`.

#### Scenario: Missing url rejected

- **WHEN** a client `POST`s `{}`
- **THEN** the response is `400` with envelope `code: "validation"` and no Smart View frame is sent

#### Scenario: Non-http scheme rejected

- **WHEN** a client `POST`s `{ "url": "javascript:alert(1)" }` or any URL whose scheme is not `http:` / `https:`
- **THEN** the response is `400` with envelope `code: "validation"` and no Smart View frame is sent

#### Scenario: Malformed URL rejected

- **WHEN** a client `POST`s `{ "url": "not a url" }` or any string WHATWG `URL` refuses to parse
- **THEN** the response is `400` with envelope `code: "validation"` and no Smart View frame is sent

### Requirement: Session must be Connected

The back-end SHALL reject a `POST /browser` when the target session's state is not `Connected` with `409 SessionNotConnected` — same error code shape as C6/C7/C8. Covers `FR-BROWSER-03` (back-end enforcement half; the front-end enforcement half is a separate requirement).

#### Scenario: Not-Connected session rejects the launch

- **WHEN** a client `POST`s to `/browser` while the session is `Disconnected`, `Connecting`, `Reconnecting`, or `Offline`
- **THEN** the response is `409` with envelope `code: "SessionNotConnected"` and no Smart View frame is sent

### Requirement: AppShortcut row replaced by an inline URL launcher

`RemoteScreen` SHALL remove the four `AppShortcut` entries (`live_tv` / `movie` / `sports_esports` / `apps` at `front-end/src/screens/RemoteScreen.tsx:126-129`). In the same slot — inside the existing `aria-disabled={!isConnected}` wrapper — the SPA SHALL render a single horizontal row composed of two Orbit DS primitives: (1) an `Input` (URL, flex-grow, placeholder `https://example.com`), and (2) a primary `Button` labeled "Open" attached at the end of the input. Both primitives SHALL be imported from `@ds/components/**` — no ad-hoc CSS, no hard-coded palette or shadow strings, no new DS primitive. Because the DS already ships `Input` (`docs/orbit-tv-remote-design-system/components/forms/Input.jsx`) and `Button` (`@ds/components/core/Button.jsx`), no `@ds/components/**` additions SHALL be introduced by this change.

Tapping "Open" SHALL POST the current input value to `/api/devices/:udn/browser`. On `204` the input SHALL be cleared. On any error the shared C9 toast SHALL render and the input value SHALL be preserved so the user can retry.

#### Scenario: Old AppShortcut row is gone

- **WHEN** the change lands and `grep -nE "AppShortcut" front-end/src/screens/RemoteScreen.tsx` runs
- **THEN** the result is empty (both the four usages and any leftover import are removed)

#### Scenario: Inline row wires the existing DS primitives

- **WHEN** the change lands and `grep -nE "from '@ds/components/(forms/Input|core/Button)" front-end/src/screens/RemoteScreen.tsx` runs
- **THEN** both imports appear (the row is composed of the two existing DS primitives)

#### Scenario: No new DS primitive is added

- **WHEN** the change lands and `git status docs/orbit-tv-remote-design-system/components/` is inspected
- **THEN** no new component file is created under that directory by this change

#### Scenario: No hard-coded palette in the browser feature

- **WHEN** `grep -rE '#([0-9a-fA-F]{3,8})' front-end/src/screens/RemoteScreen.tsx front-end/src/data/useBrowserLaunch.ts` runs after the change lands
- **THEN** the result is empty

### Requirement: URL launcher disabled while not Connected

The inline URL row (`Input` + "Open" `Button`) SHALL be visually and interactively disabled whenever the session state is not `Connected`. Disablement SHALL be delivered via the same `aria-disabled` wrapper the removed AppShortcut row already used — the `Input` and `Button` SHALL both receive the DS `disabled` prop so no tap can fire a POST while the session is not `Connected`. Covers `FR-BROWSER-03` (front-end enforcement half).

#### Scenario: Row disabled while Disconnected

- **WHEN** the session for the currently selected TV is `Disconnected`, `Connecting`, `Reconnecting`, or `Offline`
- **THEN** the `Input` and the "Open" `Button` both render in the DS `disabled` state and tapping "Open" fires no `POST /browser` request

#### Scenario: Row re-enables on Connected

- **WHEN** the session transitions to `Connected`
- **THEN** the `Input` becomes editable and tapping "Open" (with a URL present) fires exactly one `POST /browser`

### Requirement: Error surfacing rides on the shared toast pattern

Failures returned by `POST /browser` (validation `400`, `SessionNotConnected` `409`, and any mapped domain error from the transport) SHALL be presented in the SPA through the shared toast/banner pattern owned by `error-surfacing` (C9). The front-end SHALL NOT display raw error codes or wire-level messages; only the mapped domain error union `TvNotReachable | TvNotSupported | TvFailed | TvInvalidOp | TvUnknown` and the validation / SessionNotConnected copy owned by C9.

#### Scenario: 409 renders through the shared toast

- **WHEN** the back-end returns `409 SessionNotConnected` for a launch attempt (racing a disconnect)
- **THEN** the SPA renders one C9-owned toast with the SessionNotConnected copy and no raw `-32xxx` or Smart View wire text