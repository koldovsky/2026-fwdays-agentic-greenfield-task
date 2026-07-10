# Edda — self-hosted library e-reader (PWA)

**Edda** is an offline-first web PWA for reading books from self-hosted library servers (Komga,
Calibre, OPDS). Pluggable connectors and formats; EPUB now, PDF/CBZ later.

## What works now

**Visual fidelity, accessibility, and offline e2e acceptance** are implemented (change `add-visual-polish-e2e`):

- **v1 acceptance harness** — four Playwright projects cover the full acceptance surface: visual
  regression against the `doc/web`/`doc/mobile` maket PNGs (two-tier: Tier-1 structural downscale +
  Tier-2 committed golden snapshots at `maxDiffPixelRatio: 0.01`), axe-core accessibility (0
  serious/critical on all screens), keyboard operability, WCAG 2.1 AA contrast across all four
  reading themes, and responsive layout at 390/768/1300 px (19/19 visual, 12/12 a11y, 18/18
  responsive; 1 `test.fixme` for the RTL comic reader, CBZ not implemented).
- **Responsive phone layout** — new `BottomNav.vue` provides a tab bar (Home/Library/Search/Settings)
  at phone widths (`md:hidden`); the `NavSidebar` flips to `hidden md:flex`. `OfflineBanner.vue`
  shows a styled offline indicator (`role="status"`) in the app shell.
- **Visual polish** — global `:where(...):focus-visible` ring (WCAG AA non-text contrast);
  `prefers-reduced-motion` reset; three chrome color tokens darkened to meet WCAG AA
  (`--color-muted`, `--color-warning`, `--color-status`); `BaseButton` active/pressed feedback.
- **Offline e2e against live Komga** — `pnpm test:komga` exercises the full offline journey:
  add source → browse → download to OPFS → open → go offline → paginate from OPFS → change reading
  theme → reconnect (position retained, no uncaught errors). The Komga connector's `/manifest`
  406 bug (wrong Accept header) was fixed so the download path works. The throwaway Komga
  container now allowlists the reader-frame origin `:5174` in `KOMGA_CORS_ALLOWED_ORIGINS`.
- **Known limitation** — Komga EPUB mid-book progress cannot round-trip through the server
  (Komga rejects every non-`completed:true` write for a non-Divina EPUB with HTTP 400). The
  furthest-wins outbox policy is unit-tested; the server round-trip is a connector-komga follow-up.
  See `openspec/specs/visual-fidelity/spec.md` Backlog.

**Extensions and install-on-demand formats** are implemented (change `add-extensions-and-capability-install`):

- **Extensions screen** (screen 06, `doc/web/06-extensions-desktop.png`): navigate to
  `edda.local / settings / extensions` to see every installed and available plugin. The INSTALLED section
  lists the three bundled plugins with identity (`connector.opds · v1.4.0`), capability chips ("OPDS 1/2",
  "Always-on fallback"), and "BUNDLED" tags. The AVAILABLE section lists four catalog entries. A monospace
  "Host API v1.2" pill reflects the running `HOST_API_VERSION`. Bundled-plugin toggles are non-interactive
  — the registry enforces `PluginNotDisableableError` at the code level, ensuring `format.epub`,
  `connector.komga`, and `connector.opds` can never be stranded.
- **Capability-missing install prompt** (screen 07, `doc/web/07-capability-missing-desktop.png`): opening
  a PDF book whose `format.pdf` plugin is not yet installed triggers the `CapabilityMissing` event from
  `CapabilityDispatcher`. The modal shows the title "Install PDF support?", the plugin card
  `format.pdf · v1.0.3 · 1.2 MB`, capability chips ("Fixed layout", "Search", "Text selection"), the
  assurances "No network access" and "Runs sandboxed", a primary "Install & open" button, and a secondary
  "Not now — download the file instead". The dispatcher is stateless and emits no UI; a Vue subscriber
  renders the modal (the Observer seam, `DESIGN-CONNECTORS.md` §8.1).
- **Install on demand — PDF format** (`format.pdf`): clicking "Install & open" calls `registry.install()`
  which dynamic-imports the first-party `format.pdf` chunk and persists the enabled id to `localStorage`
  — no code is fetched from a remote source (ADR-010). After install the dispatcher re-resolves the same
  PDF to `ready` and the book opens. Subsequent PDFs open without a prompt. PDF pages render to an
  in-app `<canvas>` with `isEvalSupported: false` + `enableScripting: false` (defense-in-depth;
  intentionally asymmetric to EPUB's origin isolation — PDF rasterizes pixels, not book-authored scripts;
  see `DESIGN-CONNECTORS.md` §11.3). Book bytes are range-read via a pdfjs `PDFDataRangeTransport` wired to
  `PublicationSource.read`, bypassing the Service Worker (ADR-005).
- **OPDS connector** (`connector.opds`): the always-available bundled fallback for any OPDS 1/2 feed
  that no specialised connector claims. Browses navigation and acquisition feeds via the shared
  `_opds-core` utilities, carrying each entry's media type from its acquisition `<link type=...>` so the
  dispatcher can sniff it. Declares progress capability honestly per server: `progressSync: true` only
  when the connected server advertises OPDS v2 progression; otherwise progress stays local-only.
  Credentialed downloads are origin-gated: a server-supplied acquisition `href` is refused before any
  `Authorization` header is sent if its origin falls outside the connector's configured base origin (the
  same fail-closed gate as the ch9 Komga fix, now applied to the OPDS fallback on both the `content()`
  and `downloadDescriptor()` / streaming paths).
- **Kavita, Calibre, CBZ** are catalog stubs in this change: clicking Install on any of them surfaces
  "Coming soon" via `PluginNotAvailableYetError` with no registry state change.

**Offline reading and progress sync** are implemented (change `add-offline-and-sync`):

- **Download for offline:** tap Download on the book-detail screen to stream the book's bytes into OPFS
  (Origin Private File System) via a dedicated Web Worker using `FileSystemSyncAccessHandle`. The book is
  never buffered whole in memory — bytes arrive chunk-by-chunk and are flushed to the Worker as they land.
  The download registry (Dexie 4, `edda` database) records the entry as offline-available only once the
  full stream completes; an interrupted download leaves no completed registry row and cleans the partial
  OPFS file so it is never served as a full book.
- **Read fully offline:** once downloaded, a book opens from OPFS via `File.slice` range-reads — no
  `fetch`, no network. The EPUB renderer reads only the slices it actually needs (central directory + on-
  demand entries), so a 14 MB novel is never fully buffered. Book-byte range reads **bypass the Service
  Worker** entirely (ADR-005): the SW denylist installed by `app-shell` skips `206` routes, so Workbox
  never intercepts or caches them.
- **Progress sync to Komga (furthest-wins):** every position emitted by the EPUB navigator is enqueued
  into a durable Dexie outbox keyed per `(sourceId, bookId, mediaType)`. For a given key, only the
  furthest-progressed `Locator` is kept — the outbox collapses, not accumulates. When the connection
  returns (the `online` event or a visibility/focus regain), the engine drains the outbox in a
  single-flight pass: it reads the server's current position via `KomgaProgressStrategy.getProgress`,
  applies **furthest-progression-wins** on `locations.totalProgression`, and writes back only when the
  local position is strictly further — never regressing the server. A partial drain leaves failed entries
  queued for retry; only a fully clean drain updates the `lastSyncedAt` timestamp that drives the "Synced
  Xm ago" pill in the library header.
- **Komga read-progress mapping:** `KomgaProgressStrategy` maps Komga's native `{page, completed}` model
  to and from a platform-neutral `Locator`. `setProgress` attempts a page-based PATCH first; for
  non-Divina EPUBs that reject `{page}` with **400**, it retries with `{completed}`-only — confirmed
  against the live Docker Komga. The strategy reaches the server only through the `HostBridge` HTTP
  client, never `fetch` directly, so the same code runs on the future native client.
- **Credential-isolation origin gate:** the streaming download path re-enforces the same declared-network
  origin allowlist the HostBridge uses. The book URL comes from the server's manifest (untrusted), while
  `Authorization` headers carry the user's credentials. Before any `fetch`, the resolved URL's origin is
  checked against `connector.downloadDescriptor(ref).allowedOrigins`; a cross-origin URL is rejected
  outright. `redirect: 'error'` adds a second layer so a 3xx redirect cannot silently carry credentials
  past the gate.
- **Downloads badge and offline count:** the `downloadsStore` tracks the registry reactively; the sidebar
  Downloads badge and the library's "N downloaded for offline" count update automatically as books are
  added or removed. The Downloads list shows only `state: 'complete'` entries.

The **Book detail screen** is implemented (change `add-book-detail`) — click any Library card to open it:

- **Screen 02** (`doc/web/02-book-detail-desktop.png`): route `/book/:sourceId/:bookId?mediaType=`
  reachable from any Library card. Two-column layout — cover + action stack on the left, identity /
  metadata / cards / chapters on the right — with a monospace breadcrumb header ("← Back / home server /
  fiction / austen").
- **Book identity from the connector:** title (serif display face), author, and a row of metadata pills
  (publication year, language, page count, genres) sourced from `Connector.getBook(ref)`, which now
  returns `BookMeta` and is **required** on every `Connector` (a connector without rich catalog metadata
  returns a minimal `{ title, authors: [] }` rather than leaving the method absent). Works against both
  the fixture catalog (full `BookMeta` for Pride and Prejudice) and live Komga (`GET /api/v1/books/{id}`).
  Cover degrades to the colour block when Komga's thumbnail endpoint needs auth — a change-9 enrichment.
- **"YOUR PROGRESS" card:** large `38%`, `about 1h 12m left`, a progress bar, and `Last read 2h ago on
  Phone` — all derived from the `Locator` stored for the current `(sourceId, bookId, mediaType)`. No
  locator → not-started / 0% state. `Locator` gained `lastReadAt`/`lastReadDevice` (ISO strings, not
  `Date`s) and `LocatorLocations.minutesLeft` for this card.
- **"SYNCED PER FORMAT" card:** makes the per-`(sourceId, bookId, mediaType)` progress-keying invariant
  user-visible — "Your EPUB position (Phone) and the PDF (Desktop) keep separate places — progress is
  keyed per format."
- **"Continue/Start reading" button** navigates to the placeholder reader route
  `/reader/:sourceId/:bookId/:mediaType` (lit up by `add-reader-navigation`, change 7). Offline and
  bookmark affordances are present as stubs.
- **CHAPTERS section:** shows chapter count from `BookMeta.chapterCount` (`61 chapters`) and renders a
  graceful placeholder for TOC rows (real rows arrive with `add-format-epub`, change 6; no broken state).

The **Add-a-source flow** is implemented (change `add-source-flow`) — the app now talks to a real server:

- **Add a source** (sidebar → "Add source", screen `doc/web/05`): paste a server URL → a platform-neutral
  **server prober** (`src/core/dispatch/server-prober.ts`) races each connector's lightweight `probe()`
  through the HostBridge and ranks by confidence/specificity → a "Detected" card shows the matched
  connector (e.g. Komga) and its capability chips (OPDS v2 · Progress sync · Search · Page streaming ·
  Thumbnails, derived from `ConnectorCapabilities`, not hard-coded) → sign in → **Connect**, and the
  Library re-renders the live source (browse against the real server). A generic OPDS connector is the
  always-available fallback; unreachable/unsupported URLs are reported distinctly.
- **Credentials never leave the device and never enter syncable metadata:** the `SourceRecord`
  (`edda.sources`) holds only a `credentialRef`; the secret lives in a separate `edda.creds.<sourceId>`
  record. `sourceId` is minted once (`crypto.randomUUID()`) and reused as the `(sourceId, bookId,
  mediaType)` progress scope. The modal discloses "Credentials stored on this device only".
- Try it against the local throwaway Komga: `pnpm komga:up` / `pnpm komga:provision`, then add
  `http://localhost:25600` as the reader account (`test/komga/`). The plugin registry is now wired into
  the app (`src/app/app-registry.ts`); with no source connected it falls back to the fixture catalog.

The **plugin infrastructure and Komga connector** are implemented (change `add-connector-komga`):

- **HostBridge** — the single, platform-neutral surface plugins touch. Exposes exactly `http`,
  `storage`, and `logger`; `src/core/contracts` carries zero web-only types (no DOM, no `fetch`)
  so the future Kotlin client satisfies the same interfaces. The web implementation
  (`PermissionEnforcingHttpClient` over `fetch`, `InMemoryKeyValueStore` namespaced with
  `KEY_SEPARATOR='\x1f'`, `createConsoleLogger`) lives in `src/platform/web/`.
- **PluginRegistry** (`src/core/registry/`) — lazy dynamic-`import()` loaders, a persisted
  enabled-id set (rehydrated on startup without loading chunks), three-state resolution
  (`ready | installable | unsupported`), and a host-API semver gate. "Install" = first-party
  bundled chunk, no remote code (ADR-010).
- **Komga REST connector** (`src/plugins/connectors/komga/`) — a second `Connector` implementation
  alongside the fixture. Authenticates via HTTP Basic as a least-privilege reader, browses
  libraries/series/books with paging, searches, streams thumbnails and page images (PSE), and
  downloads book files with range-read support. Composes `_opds-core` utilities (no inheritance).
  See `test/komga/` for the local throwaway server and `pnpm komga:up` / `pnpm komga:provision`.

The **EPUB format handler** is implemented (change `add-format-epub`):

- **Client-side EPUB parsing:** The `format-epub` plugin parses EPUB documents entirely client-side
  using the vendored foliate-js engine (lazy-loaded on first open, not bundled with the app shell).
  Produces a Readium-aligned `Publication` with metadata (title, author, language), reading order
  (spine in document order), and table of contents derived from the EPUB navigation document or NCX.
  No network I/O during parsing — all bytes come from OPFS range-reads (for cached files) or streams.
- **CFI ↔ Locator adapter:** EPUB's Canonical Fragment Identifier (CFI) system is bridged to the
  platform-neutral `core/model` `Locator` for progress tracking. Round-trips are stable: CFI→Locator→CFI
  yields the original, and emitted Locators are plain serializable objects (no web-framework types).
- **Navigator over a mounted element:** The handler exposes `goTo(locator)`, `currentLocation()`,
  `applyPreferences()` for reading preferences (theme, font, size, columns, RTL), event subscription
  (`loaded`, `locatorChanged`, `error`), and `destroy()`. The Navigator is a plain imperative object
  (no Vue reactivity); consumers `markRaw()` it before storing in state per ADR-001. This is a headless
  renderer layer — reader UI and progress sync are changes 7 and 9.
- **Vendored foliate-js submodule:** foliate-js ships no npm package, so it is pinned as a git
  submodule at `vendor/foliate-js` (commit `78914aef…`) and reached via dynamic `import()` through a
  Vite alias. After cloning, **ensure `git submodule update --init`** populates `vendor/foliate-js`
  before running `pnpm test` or `pnpm build`. (Automation: `pnpm install` handles this via a postinstall
  hook.) See `src/plugins/formats/epub/README.md` for the submodule update procedure.

The **Library Browse screen** is implemented (change `add-library-browse`):

- Library renders a live catalog from an in-memory fixture connector: 3 "Keep reading" cards
  (Pride and Prejudice / Saltmoon / Dorian Gray, with correct progress readouts and format chips)
  and 6 "Recently added" covers (Frankenstein, Moby-Dick, Dracula, The Tin Forest, Great Expectations,
  Jane Eyre).
- Local search filtering by title, author, and series label — no network round-trip.
- "Synced Nm ago" sync-status pill; catalog counts line ("342 titles · 3 sources · 14 downloaded for
  offline").
- Grid / list segmented toggle for the "Recently added" section.
- Core domain model: platform-neutral `Locator`, `Publication`, `BookRef`, `LibraryBrowseEntry`,
  `ProgressSnapshot`; `formatLabel` / `progressReadout`; versioned JSON serialization with round-trip
  conformance tests asserting no DOM/Date/function types cross the boundary.
- Fixture connector implements the `Connector` contract (`browse()`, `progressStrategy()`); progress
  keyed per `(sourceId, bookId, mediaType)` via `LocalProgressStrategy`.
- `LibraryView.vue` guard: no connector → styled empty state; connector present → `LibraryBrowse.vue`.
- Pinia store (`libraryStore`) holds connector in `shallowRef` (the `markRaw` equivalent per ADR-001)
  so Vue reactivity never walks the connector's internal catalog or Map.

The **app shell and design system** are implemented (change `add-app-shell`):

- Persistent sidebar with wordmark, primary nav (Home / Library / Search / Downloads), Sources
  region, and Extensions/Settings footer — matching the maket's parchment visual language.
- Routing skeleton: `/library`, `/reader/:sourceId/:bookId/:mediaType` (full-bleed, no sidebar),
  `/settings/*`, and placeholder views for screens not yet implemented.
- Parchment design tokens (`#F0EEE9` canvas, forest/olive primary, warm near-black ink, token-only
  chrome colors) plus reusable primitives: `BaseButton`, `BaseChip`, `BaseCard`, `ProgressBar`,
  `SegmentedControl`, `BaseToggle`, `BaseStepper`, `StatusDot`, `EmptyState`, `LoadingSpinner`.
- Installable PWA with custom service worker that precaches the app shell and bypasses the SW for
  book-byte range requests (ADR-005).

## Getting started

```
pnpm install    # install dependencies
pnpm dev        # start dev server at http://localhost:5173
pnpm test       # run Vitest unit tests
pnpm build      # production build (outputs to dist/)
```

In development, `pnpm dev` starts the app on `:5173`. The EPUB reader frame is a separate build entry
served on `:5174` (run `pnpm dev:frame` in a second terminal, or let the default auto-configuration do it).
Playwright e2e tests: `pnpm exec playwright test`.

## Visual fidelity & acceptance gates

The v1 acceptance harness runs four Playwright projects, each independently invocable:

| Command | What it checks |
|---|---|
| `pnpm test:visual` | Two-tier maket fidelity (Tier-1 structural downscale vs `doc/web`/`doc/mobile` PNGs; Tier-2 committed golden snapshots, `maxDiffPixelRatio: 0.01`) across all 7 maket screens |
| `pnpm test:a11y` | axe-core — 0 serious/critical violations on every screen; keyboard operability (Tab/Enter/Space, ArrowRight reader paging); modal focus-trap + Escape; WCAG 2.1 AA contrast on chrome + 4 reading themes |
| `pnpm test:responsive` | No overlap/clipping/horizontal overflow at 390/768/1300 px; phone layouts vs `doc/mobile` baselines; `BottomNav.vue` visible, sidebar hidden on phone |
| `pnpm test:komga` | End-to-end offline happy path against a live Docker Komga (skipped when Komga is not provisioned; see below) |
| `pnpm e2e` | All four Playwright projects (visual + a11y + responsive + komga-e2e) in one pass |

### Komga e2e gate

The Komga-gated offline e2e requires a provisioned throwaway Komga:

```
pnpm komga:up          # start the Docker Komga container
pnpm komga:provision   # seed test-epubs/ and create the reader account (blocking; idempotent)
pnpm test:komga        # run the offline happy path against http://localhost:25600
```

The test authenticates as the least-privilege reader `reader@edda.test` / `edda-reader-pw` and
exercises the full offline journey: add source → browse → download book to OPFS → open → go offline
→ paginate from OPFS → change reading theme → reconnect (position retained, no uncaught errors).
Each run records a demo video (`video: 'on'`) in the Playwright output directory.

**Reader-frame CORS:** the Komga container must allowlist the reader-frame origin (`:5174`) in
`KOMGA_CORS_ALLOWED_ORIGINS` so that online page streaming works from the cross-origin reader frame
(ADR-013). The default in `test/komga/docker-compose.yml` covers `:5173,:5174,:4173` out of the
box; override via `test/komga/.env` if you run on different ports.

**Documented limitation — Komga EPUB mid-book progress round-trip:** Komga's read-progress PATCH
API rejects every non-`completed:true` write for a non-Divina EPUB with HTTP 400, so a mid-book
EPUB position cannot round-trip through the server and does not appear on the book detail after
leaving the reader session. The furthest-progression-wins policy is unit-tested in core/sync;
closing the server round-trip is a connector-komga / offline-and-sync follow-up (see
`openspec/specs/visual-fidelity/spec.md`, Backlog).

### Committed golden snapshots

Tier-2 goldens live under `e2e/<project>/snapshots/<spec>/` (Chromium-only). To regenerate them
after an intentional UI change:

```
pnpm test:visual:update
```

A clean re-run must match without `--update-snapshots`; a mismatch fails the build.

### Offline happy path demo video

The komga-e2e project writes a `.webm` video of the offline journey to the Playwright output
directory on every run. The committed demo from Gate-1 is at
`loop/artifacts/add-visual-polish-e2e/attempt-1/gate1/playwright/offline-happy-path.webm`.

## Reader origin

The EPUB renderer runs on a **separate browser origin** from the app (ADR-013). This is the primary
credential-isolation boundary: foliate and all book spine documents live on the reader origin, so a
malicious EPUB script cannot reach the app origin's `localStorage` (`edda.creds.*`).

### Environment variable

```
VITE_READER_ORIGIN=<url>
```

| Environment | Default / how to set |
|---|---|
| **Development** | Auto-set to `http://localhost:5174` when unset. Start the frame with `pnpm dev:frame`. |
| **E2e / CI** | Same: `:5174` auto-configured; Playwright starts both servers. |
| **Production** | Set `VITE_READER_ORIGIN` at build time to the reader origin you serve. Two options: a **sibling port** (e.g. `https://edda.example.com:5174`) or a **subdomain** (e.g. `https://reader.edda.example.com`). Both work; a subdomain is easier for TLS/SAN. |

### Fail-closed behaviour

The reader origin check is fail-closed — misconfiguration degrades to an error, never to
same-origin rendering:

- If `VITE_READER_ORIGIN` is **unset** at build time in production, the reader surfaces an error and
  renders nothing.
- If `VITE_READER_ORIGIN` **equals the app origin**, the navigator proxy throws at open time and renders
  nothing.

There is no same-origin fallback; the app will never render EPUB content on the credential-bearing origin.

### Production provisioning

Serve `dist-frame/` (the output of `pnpm build:frame`) from the reader origin. The frame is a static
bundle with no server-side logic. Example nginx snippet for a subdomain:

```nginx
server {
  listen 443 ssl;
  server_name reader.edda.example.com;
  root /srv/edda/dist-frame;
  location / { try_files $uri /index.html; }
}
```

Build the frame and the app together:
```
pnpm build           # builds both dist/ (app) and dist-frame/ (reader frame)
pnpm build:frame     # reader frame only
```

---

# Agentic Engineering: Greenfield — домашнє завдання

Курс **fwdays Academy · Agentic Engineering: Greenfield**.

Це завдання — **не про розмір продукту, а про процес**: показати, що ти вмієш будувати з нуля, керуючи AI-агентами **інженерно** (контекст, цикли, верифікація, maker ≠ checker), а не «вайбкодити».

> Стек — **будь-який**. Цей репозиторій навмисно майже порожній: він не привʼязаний до жодної технології. Ти приносиш свій проєкт і свій підхід.

## Що зробити

1. **Побудуй невеликий власний проєкт** — будь-який, який тобі цікавий.
   - Стек вільний: Next.js, Python, Go, Rust, мобільний застосунок, CLI, бот — на твій вибір.
   - Масштаб скромний. Краще маленький проєкт, проведений через повний інженерний цикл, ніж великий «наче працює».
2. **Застосуй практики Agentic Engineering** з курсу — стільки, скільки доречно для твого проєкту:
   - контекст-інженерія (правила / `AGENTS.md`, статичний vs динамічний контекст);
   - цикли (loop engineering) замість ручного покрокового промптингу;
   - верифікація: тести / evals / перевірки замість «здається, працює»;
   - maker ≠ checker (окремий агент або прохід на рев'ю);
   - специфікації наперед (SDD), якщо доречно.
   - **Project Factory — за бажанням, не обовʼязково** (хочеш повну фабрику — запусти `/project-factory:init` у себе).
3. **Запиши відео-демо на 1–2 хвилини**: коротко покажи продукт і розкажи, **як саме ти будував(ла) його агентно**.

## Як здати

1. Зроби **fork** цього репозиторію (разом із ним приїдуть конфіг CodeRabbit і шаблон PR).
2. Увімкни **CodeRabbit** на своєму форку (безкоштовно для публічних репо) — він рев'юитиме твій PR як ментор, українською.
3. Поклади свій проєкт у форк на окрему гілку (будь-яким стеком). Якщо зручніше тримати код в окремому репозиторії — додай на нього посилання в описі PR.
4. Відкрий **Pull Request** і заповни шаблон:
   - **Імʼя** (справжнє);
   - **посилання на відео-демо** (1–2 хв);
   - **опис застосованих практик Agentic Engineering** — що саме ти робив(ла) агентно, які інструменти / MCP використав(ла), що вирішував(ла) ти, а що агент.
5. Прочитай фідбек CodeRabbit, поітеруй за потреби — і **надішли посилання на свій PR** як здачу.

## Як оцінюється

Дивимось на **докази процесу**, а не на стек:

- ✅ вказане справжнє імʼя;
- ✅ є відео-демо (1–2 хв);
- ✅ є **змістовний опис** застосованих агентних практик;
- ✅ результат доведено до кінця (а не «згенерував і кинув»).

**Бонус** — видимі артефакти інженерії: правила / `AGENTS.md`, специфікації, тести / evals, сліди верифікації, окреме рев'ю, записи демо.

---

Питання — у каналі курсу. Успіхів, і нехай цикли працюють на тебе 🟢
