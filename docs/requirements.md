# Requirements — Plant Growth & Watering Tracker

> Canonical numbered requirements. IDs are assigned ONCE and never renumbered.
> Every row is tagged `MVP` or `Future`. Scope is deliberately SMALL: single
> local user, no auth, no integrations. See `docs/product-brief.md` for the
> business narrative.

## Functional Requirements (FR)

### Plants

| ID | Phase | Area | Description |
|----|-------|------|-------------|
| FR-PLANT-01 | MVP | Plants | The Owner can add a plant with a required name. |
| FR-PLANT-02 | MVP | Plants | The Owner can set a plant's species; species defaults to money tree / *Crassula ovata* and is editable as free text. |
| FR-PLANT-03 | MVP | Plants | The Owner can optionally set a plant's acquired date. |
| FR-PLANT-04 | MVP | Plants | The Owner can view a list of all plants. |
| FR-PLANT-05 | MVP | Plants | The Owner can open a single plant's detail view. |
| FR-PLANT-06 | MVP | Plants | The Owner can edit a plant's name, species, and acquired date. |
| FR-PLANT-07 | MVP | Plants | The Owner can delete a plant; deletion also removes its measurements and watering events, with a confirmation step. |
| FR-PLANT-08 | MVP | Plants | The plant list shows a helpful empty state when no plants exist. |
| FR-PLANT-09 | Future | Plants | The Owner can attach a photo/image to a plant. |
| FR-PLANT-10 | Future | Plants | The Owner can search or filter the plant list. |

### Measurements / Growth

| ID | Phase | Area | Description |
|----|-------|------|-------------|
| FR-GROWTH-01 | MVP | Measurements | The Owner can log a growth measurement for a plant: a height value in centimetres on a given date (date defaults to today). |
| FR-GROWTH-02 | MVP | Measurements | The Owner can view the list of a plant's measurements ordered by date. |
| FR-GROWTH-03 | MVP | Measurements | The Owner can edit a measurement's value and date. |
| FR-GROWTH-04 | MVP | Measurements | The Owner can delete a measurement, with a confirmation step. |
| FR-GROWTH-05 | MVP | Measurements | Height input rejects non-numeric/negative values and accepts decimals (including trailing zeros and decimal commas). |
| FR-GROWTH-06 | Future | Measurements | The Owner can track additional growth metrics (e.g. leaf count, width, trunk diameter). |

### Watering

| ID | Phase | Area | Description |
|----|-------|------|-------------|
| FR-WATER-01 | MVP | Watering | The Owner can log a watering event for a plant on a given date (date defaults to today). |
| FR-WATER-02 | MVP | Watering | The Owner can add an optional free-text note to a watering event. |
| FR-WATER-03 | MVP | Watering | The Owner can view the list of a plant's watering events ordered by date. |
| FR-WATER-04 | MVP | Watering | The Owner can edit a watering event's date and note. |
| FR-WATER-05 | MVP | Watering | The Owner can delete a watering event, with a confirmation step. |
| FR-WATER-06 | Future | Watering | The Owner can record an optional water amount (e.g. ml) on a watering event. |
| FR-WATER-07 | Future | Watering | The app reminds/notifies the Owner when a plant is due for watering. |

### Charts / Visualization

| ID | Phase | Area | Description |
|----|-------|------|-------------|
| FR-CHART-01 | MVP | Charts | The plant detail view shows a watering chart: watering events over time for that plant (the headline asked-for feature). |
| FR-CHART-02 | MVP | Charts | The plant detail view shows a growth chart: height measurements over time for that plant. |
| FR-CHART-03 | MVP | Charts | Each chart shows a clear empty state when the plant has no data yet. |
| FR-CHART-04 | MVP | Charts | Charts update to reflect newly added, edited, or deleted events/measurements. |
| FR-CHART-05 | Future | Charts | The Owner can change chart granularity / date range (e.g. weekly vs monthly buckets). |
| FR-CHART-06 | Future | Charts | The Owner can see derived insights (average watering interval, growth rate). |

### App Shell / Navigation

| ID | Phase | Area | Description |
|----|-------|------|-------------|
| FR-SHELL-01 | MVP | App shell | The app has a single shell with navigation between the plant list and a plant's detail view. |
| FR-SHELL-02 | MVP | App shell | The Owner can toggle between light and dark themes; the choice persists across reloads. |
| FR-SHELL-03 | MVP | App shell | Invalid input is surfaced inline next to the field, not via raw errors or silent failure. |
| FR-SHELL-04 | Future | App shell | The Owner can export/import their data (e.g. JSON/CSV backup). |
| FR-SHELL-05 | Future | App shell | The app supports multiple users with authenticated accounts. |

## Non-Functional Requirements (NFR)

Each NFR is tagged `local-verifiable` (testable in CI/locally) or
`deploy-gated` (needs a live URL; marked pending live measurement at the
release gate, not skipped).

### Usability

| ID | Phase | Verifiability | Description |
|----|-------|---------------|-------------|
| NFR-USA-01 | MVP | local-verifiable | Core flows (add plant, log watering, log measurement) are reachable in <= 2 clicks from the relevant view. |
| NFR-USA-02 | MVP | local-verifiable | All forms show clear validation messages and confirm destructive actions (delete). |
| NFR-USA-03 | MVP | local-verifiable | Dates are entered and displayed in the Owner's local calendar date (timezone Europe/Kiev); no time-of-day is required. |

### Accessibility

| ID | Phase | Verifiability | Description |
|----|-------|---------------|-------------|
| NFR-A11Y-01 | MVP | local-verifiable | UI passes automated accessibility checks (axe) in BOTH light and dark themes, including a vision pass on the settled screen. |
| NFR-A11Y-02 | MVP | local-verifiable | Text and interactive elements meet WCAG 2.1 AA contrast in both themes. |
| NFR-A11Y-03 | MVP | local-verifiable | Charts are not the only way to read the data: the underlying values are also available as a list/table (FR-GROWTH-02, FR-WATER-03). |
| NFR-A11Y-04 | MVP | local-verifiable | All interactive controls are keyboard operable and have accessible labels. |

### Performance

| ID | Phase | Verifiability | Description |
|----|-------|---------------|-------------|
| NFR-PERF-01 | MVP | local-verifiable | Adding/editing a plant, measurement, or watering completes (UI reflects the change) within 300 ms locally for a realistic dataset (<= 20 plants, <= 500 events total). |
| NFR-PERF-02 | MVP | local-verifiable | Charts render within 500 ms for a single plant with <= 365 data points. |
| NFR-PERF-03 | Future | deploy-gated | Deployed app p95 TTFB <= 800 ms and Lighthouse performance score >= 90 on the plant list and detail pages. |

### Data persistence / durability

| ID | Phase | Verifiability | Description |
|----|-------|---------------|-------------|
| NFR-DATA-01 | MVP | local-verifiable | Data (plants, measurements, watering events) persists across page reloads and app restarts. |
| NFR-DATA-02 | MVP | local-verifiable | No data is lost on normal edit/delete flows; deletes are explicit and confirmed (no silent cascade beyond the deleted plant's own children per FR-PLANT-07). |

### Compatibility (browsers / devices) & responsive

| ID | Phase | Verifiability | Description |
|----|-------|---------------|-------------|
| NFR-COMPAT-01 | MVP | local-verifiable | UI is responsive and usable from 360 px (mobile) up to desktop widths. |
| NFR-COMPAT-02 | MVP | local-verifiable | Works on current versions of evergreen browsers (latest Chrome, Firefox, Safari, Edge). |
| NFR-COMPAT-03 | Future | deploy-gated | Verified uptime / availability target on the deployed instance. |

### Security

| ID | Phase | Verifiability | Description |
|----|-------|---------------|-------------|
| NFR-SEC-01 | MVP | local-verifiable | App requires no authentication in MVP (single local user); no credentials, sessions, or password policy are introduced (see TC-04, Open question Q6). |
| NFR-SEC-02 | Future | local-verifiable | If multi-user (FR-SHELL-05) is built, define password policy, session timeout, and any link-expiry rules then. |

### Localization

| ID | Phase | Verifiability | Description |
|----|-------|---------------|-------------|
| NFR-LOC-01 | MVP | local-verifiable | UI copy is **Ukrainian** (the Owner's language, per Checkpoint 1); the data model stores no locale-specific assumptions that would block adding other languages. Code identifiers, requirement/spec docs, and trace ids stay English. |
| NFR-LOC-02 | Future | local-verifiable | The app offers an English (or other) UI translation alongside Ukrainian. |

## Constraints

### Technical (TC)

| ID | Phase | Description |
|----|-------|-------------|
| TC-01 | MVP | Delivered as a web application running in the browser. |
| TC-02 | MVP | Stack is a JS/TS web app. Final choice is deferred to the Phase 0 scaffold ADR; Project Factory default is Next.js (App Router) + a datastore. Requirements must not depend on a specific framework. |
| TC-03 | MVP | Persistent storage is required (NFR-DATA-01). A datastore (e.g. SQLite/Postgres + an ORM) or an equivalently durable local store satisfies this; the exact store is an ADR decision. |
| TC-04 | MVP | No multi-tenant data isolation, no auth provider, no email, no third-party integrations in MVP. |
| TC-05 | MVP | Charting is done with a web charting approach (library or lightweight custom); choice is an implementation detail, not a requirement. |
| TC-06 | MVP | Out of scope for MVP: image/photo upload & storage (FR-PLANT-09), data import/export (FR-SHELL-04), notifications (FR-WATER-07), imperial units. |

### Business (BC)

| ID | Phase | Description |
|----|-------|-------------|
| BC-01 | MVP | This is a learning / crash-course demo project; scope is intentionally SHORT — favour the smallest end-to-end slice over completeness. |
| BC-02 | MVP | Single user; no accounts, billing, or sharing. |
| BC-03 | MVP | Scope changes go through the Project Factory phasing/change-control process; new behavior is appended as new FR IDs, never by renumbering. |
| BC-04 | MVP | The Owner communicates in Ukrainian; product/requirements docs are kept in English for tooling conventions (NFR-LOC-01/02 cover UI language). |

## Assumptions & Notes

- **A1.** Growth is tracked as a single numeric metric — **height in cm** — because it is the simplest objective measure for a money tree and the customer said only "ріст". Other metrics are Future (FR-GROWTH-06). Confirm via Q2.
- **A2.** **Multiple plants** are supported in MVP (the customer wrote "рослин" — plural, "plants"), but for a single Owner. Confirm via Q4.
- **A3.** The **growth chart** is treated as MVP even though only the watering chart was named explicitly, because "трекати ріст" (track growth) is meaningless without a way to see it. Confirm via Q2.
- **A4.** Units are **metric (cm)** because the Owner's locale is Europe/Kiev. Imperial is Future. Confirm via Q1.
- **A5.** Dates use the Owner's **local calendar date (Europe/Kiev)**; events are date-only (no time-of-day). Confirm via Q8.
- **A6.** Watering chart granularity is assumed to plot **individual events on a daily timeline**; bucketed granularity is Future (FR-CHART-05). Confirm via Q7.
- **A7.** "коротку" (short) is read as a hard scope constraint: photos, auth, reminders, export, presets, and insights are all Future.
- **A8.** Persistence is assumed **server/local datastore that survives restarts** (NFR-DATA-01), not ephemeral in-memory or browser-tab-only state. Confirm via Q5.

## Open questions (batched)

Answer "go with defaults" to accept every recommended default below.

| # | Question | Recommended default |
|---|----------|---------------------|
| Q1 | Units for growth — cm or inches? | **cm** (metric; Owner is in Kyiv). |
| Q2 | What growth metric(s) to track, and is a growth chart in MVP? | **Single metric: height in cm; growth chart IS in MVP** (otherwise growth data is write-only). |
| Q3 | Are photos/images in MVP? | **No — Future** (keeps the app short; avoids storage/upload work). |
| Q4 | One plant only, or multiple plants? | **Multiple plants, single Owner** (matches "рослин", plural). |
| Q5 | Where does data live / must it survive restart? | **Durable datastore that survives restarts** (real persistence, not in-memory). |
| Q6 | Is authentication needed? | **No auth in MVP** — single local user (NFR-SEC-01). |
| Q7 | Watering chart granularity — per-event, daily, or weekly? | **Per-event points on a daily timeline**; bucketing is Future. |
| Q8 | Date range / timezone handling? | **Date-only events in local calendar date, timezone Europe/Kiev**; no time-of-day. |
| Q9 | Light AND dark theme required, or one? | **Both, user-toggleable, choice persisted** (NFR-A11Y-01, FR-SHELL-02). |
| Q10 | Optional water amount on a watering event in MVP? | **No — Future** (FR-WATER-06); keep watering to date + note. |
| Q11 | UI language — English or Ukrainian? | **English UI in MVP**, model translation-ready; Ukrainian is Future (NFR-LOC-02). |
| Q12 | Should deleting a plant cascade its data, and require confirmation? | **Yes — cascade the plant's own measurements/waterings, with a confirm step** (FR-PLANT-07). |

## Checkpoint 1 sign-off (2026-06-29)

The Owner signed off the MVP scope. Decisions:

- **Scope:** all recommended defaults accepted (Q1–Q10, Q12) — including the
  growth chart in MVP (A3) and multiple plants in MVP (A2).
- **Q11 OVERRIDE — UI language is Ukrainian** (not the English default). See the
  amended NFR-LOC-01/02 above. Requirement/spec docs and trace ids stay English.
- **Run target:** local single-user; **no cloud deploy in MVP** (NFR-PERF-03 /
  NFR-COMPAT-03 stay Future).
- **Stack (ADR-0001):** Next.js (App Router, TypeScript) · **SQLite + Drizzle ORM**
  (durable local file store, satisfies TC-03/NFR-DATA-01) · **Recharts** (TC-05) ·
  Vitest · Playwright · OpenSpec. No Better Auth, no Resend (TC-04). This is a
  swap from the Postgres/Better-Auth/Resend default, recorded as ADR-0001.
