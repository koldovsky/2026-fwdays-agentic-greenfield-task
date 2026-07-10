## ADDED Requirements

### Requirement: Book content renders on a separate origin

The app SHALL render untrusted book content (EPUB HTML/JS) inside a cross-origin `<iframe>` whose document
is served from an origin distinct from the app origin, so that book content runs under a different security
origin than the one holding the user's connector credentials (`edda.creds.*` in the app origin's
`localStorage`). The app SHALL NOT render book content on the app origin.

The separate origin SHALL be a genuinely different origin (a different host, subdomain, or port) — NOT an
`allow-scripts` opaque-sandbox frame on the app origin, because foliate's nested spine iframes require
same-origin `contentDocument` access that an opaque parent origin denies.

#### Scenario: The book-content frame is cross-origin to the app
- **WHEN** the reader opens a book
- **THEN** the foliate engine and the book's spine documents run inside an `<iframe>` served from the
  configured reader origin, which is not equal to the app's origin

#### Scenario: A script in the book cannot read app credentials
- **WHEN** an EPUB whose spine document contains a `<script>` that attempts to reach the app (e.g.
  `window.parent.localStorage.getItem('edda.creds.<id>')` or a cross-origin `fetch` of the app) is opened
- **THEN** the browser's same-origin policy denies the access, the app's `localStorage` is unchanged, and
  no credential value leaves the app origin

#### Scenario: Foliate still paginates inside the isolated frame
- **WHEN** the reader renders a real EPUB on the separate origin
- **THEN** the engine's spine documents are same-origin to the reader frame and paginate normally (the
  spread renders and chevron/keyboard paging advances pages)

### Requirement: App-to-frame postMessage bridge

The app SHALL drive the in-frame renderer solely through a `postMessage` bridge established over a
`MessageChannel` handed to the frame at load. The app SHALL post the initial handshake to the frame with an
explicit `targetOrigin` equal to the configured reader origin (never `*`), transferring one `MessagePort`.
After the handshake the app SHALL receive frame events ONLY over that capability `MessagePort` and SHALL
NOT install a window `message` listener — book content is same-origin to the reader origin, so a window
channel would be a spoof seam a book script could post forged events through. The bridge
SHALL carry these commands app→frame: `open`, `goTo`, `next`, `prev`, `seek`, `applyPreferences`,
`destroy`; and these events frame→app: `ready`, `locatorChanged`, `pageCount`, `error`. Bridge payloads
SHALL carry only serializable neutral data (`Locator`, `Publication` metadata, `ReadingPreferences`, book
bytes) — never DOM nodes or live renderer handles.

#### Scenario: Commands drive the renderer
- **WHEN** the app calls `next()` / `goTo(locator)` / `seek(fraction)` / `applyPreferences(prefs)` on the
  navigator proxy
- **THEN** the corresponding command is posted across the bridge and the in-frame foliate engine performs it

#### Scenario: Events propagate back
- **WHEN** the in-frame engine relocates (page turn or navigation)
- **THEN** the frame posts a `locatorChanged` event carrying a serializable `Locator`, and the app updates
  the current locator and forwards it to the sync engine

#### Scenario: Window messages are ignored — only the capability port delivers events
- **WHEN** a window `message` event reaches the app from any origin, including the reader origin (a book
  script is same-origin to the reader origin and could forge one)
- **THEN** the app does not act on it; frame events are delivered only over the capability `MessagePort`

### Requirement: Book bytes transfer without in-frame network

The app SHALL fetch book bytes via the connector (`content()`) on the app origin and SHALL transfer them
into the reader frame as a Transferable `ArrayBuffer` over the bridge. The reader frame SHALL perform no
network I/O of its own and SHALL build the publication from the transferred bytes in-frame. Book bytes
SHALL NOT traverse the Service Worker (ADR-005); credentials SHALL NOT cross the bridge.

#### Scenario: Bytes arrive by transfer, not by fetch
- **WHEN** a book is opened
- **THEN** the app posts the book `ArrayBuffer` to the frame as a Transferable, and the frame builds the
  foliate book from those bytes without issuing any network request

#### Scenario: No credential crosses the bridge
- **WHEN** the app opens a book that required authentication to fetch
- **THEN** only the book bytes and neutral metadata cross the bridge; no `edda.creds.*` value is included
  in any posted message

### Requirement: Navigator proxy contract and lifecycle

The app-side navigator SHALL be a proxy that implements the neutral `Navigator` interface (`goTo`,
`currentLocation`, `next`, `prev`, `seek`, `applyPreferences`, `on`, `destroy`) by forwarding over the
bridge, and SHALL be safe to `markRaw()` (ADR-001) — Vue reactivity SHALL never wrap the iframe, the
`MessagePort`s, or the in-frame engine. On teardown the proxy SHALL destroy the frame, close the
`MessagePort`s, revoke any created object URLs, and drop subscriptions — exactly once.

#### Scenario: Proxy satisfies the Navigator interface
- **WHEN** the reader uses the navigator returned for an EPUB
- **THEN** it exposes the same `Navigator` methods the reader chrome already calls, and `currentLocation()`
  reflects the latest `locatorChanged`

#### Scenario: Teardown isolates and releases
- **WHEN** the reader unmounts or the route changes
- **THEN** the proxy posts `destroy`, removes the iframe, closes its ports, revokes object URLs, and
  unsubscribes, and a second teardown is a no-op

### Requirement: Reader origin is configured and fails closed

The reader origin SHALL be configurable independently of the app and SHALL be provided automatically in
development and e2e (a second port). It SHALL differ from the app origin. If the reader origin is not
configured, equals the app origin, or the frame cannot be established, the reader SHALL fail closed with a
clear error and SHALL NOT fall back to rendering book content on the app origin.

#### Scenario: A missing reader origin does not degrade to same-origin rendering
- **WHEN** the reader origin is unconfigured or the frame fails to load
- **THEN** the reader surfaces an error state and renders no book content on the app origin

#### Scenario: A same-origin reader origin fails closed
- **WHEN** the configured reader origin equals the app origin
- **THEN** the reader throws and renders no book content on the app origin (the isolation cannot be
  collapsed onto the credential-bearing origin)
